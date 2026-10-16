const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Otp = require("../models/Otp");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { normalizeEmail, isValidEmail } = require("../utils/email");
const { COOKIE_NAME, cookieOptions } = require("../utils/authCookie");

// Unexpected errors (DB down, email provider failing) are not caught here:
// Express 5 passes them to the central error handler in middleware/errorHandler.js.

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;
const OTP_REGEX = /^\d{6}$/;
// one message for "no OTP", "expired" and "wrong OTP" so attackers learn nothing
const INVALID_OTP_MESSAGE = "Invalid or expired OTP";

// a locked OTP blocks this email until it expires
function isLocked(record) {
  return record.attempts >= MAX_ATTEMPTS && record.expiresAt > new Date();
}

function lockedMessage(record) {
  const minutes = Math.ceil((record.expiresAt - Date.now()) / 60000);
  return `Too many wrong attempts. Try again after ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

async function sendOtp(req, res) {
  const email = normalizeEmail(req.body?.email);

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Please enter a valid email" });
  }

  const existing = await Otp.findOne({ email });
  if (existing && isLocked(existing)) {
    return res.status(429).json({ message: lockedMessage(existing) });
  }
  if (existing) {
    const elapsed = Date.now() - existing.lastSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return res
        .status(429)
        .json({ message: `Please wait ${waitSeconds}s before requesting a new OTP` });
    }
  }

  // randomInt is cryptographically secure (Math.random is not)
  const otp = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
  const otpHash = await bcrypt.hash(otp, 10);
  const now = new Date();

  // upsert replaces any old OTP, so only one is ever active per email
  await Otp.findOneAndUpdate(
    { email },
    {
      otpHash,
      expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
      attempts: 0,
      lastSentAt: now,
    },
    { upsert: true }
  );

  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] OTP for ${email}: ${otp}`);
  }

  try {
    await sendEmail(
      email,
      "Your login code",
      `<p>Your OTP is <b>${otp}</b>.</p><p>It expires in 5 minutes.</p>`
    );
  } catch (err) {
    // remove the OTP so the user isn't stuck in cooldown with no email
    await Otp.deleteOne({ email });
    throw err;
  }

  res.json({ message: "OTP sent to your email" });
}

async function verifyOtp(req, res) {
  const email = normalizeEmail(req.body?.email);
  const otp = String(req.body?.otp ?? "").trim();

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Please enter a valid email" });
  }
  if (!OTP_REGEX.test(otp)) {
    return res.status(400).json({ message: "OTP must be exactly 6 digits" });
  }

  const record = await Otp.findOne({ email });

  // TTL cleanup runs about once a minute, so also check expiry ourselves
  if (!record || record.expiresAt < new Date()) {
    return res.status(400).json({ message: INVALID_OTP_MESSAGE });
  }

  if (isLocked(record)) {
    return res.status(429).json({ message: lockedMessage(record) });
  }

  // Use up one attempt BEFORE comparing. The update is atomic and only
  // matches while attempts < 5, so parallel guesses can never get more than 5 tries.
  const attempt = await Otp.findOneAndUpdate(
    { _id: record._id, attempts: { $lt: MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" }
  );
  if (!attempt) {
    // another request just locked or used this OTP
    return res.status(400).json({ message: INVALID_OTP_MESSAGE });
  }

  const isMatch = await bcrypt.compare(otp, attempt.otpHash);

  if (!isMatch) {
    // the 5th wrong attempt locks the OTP (kept, not deleted) until it expires
    if (attempt.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ message: lockedMessage(attempt) });
    }
    return res.status(400).json({ message: INVALID_OTP_MESSAGE });
  }

  // delete first: if two requests race with the same OTP, only one gets the document
  const consumed = await Otp.findOneAndDelete({ _id: record._id });
  if (!consumed) {
    return res.status(400).json({ message: INVALID_OTP_MESSAGE });
  }

  let user = await User.findOne({ email });
  const isNewUser = !user;

  if (isNewUser) {
    user = await User.create({ email, lastLoginAt: new Date() });
  } else {
    user.lastLoginAt = new Date();
    await user.save();
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  res.cookie(COOKIE_NAME, token, cookieOptions());

  res.json({ user, isNewUser });
}

function getMe(req, res) {
  res.json({ user: req.user });
}

async function updateProfile(req, res) {
  const name = String(req.body?.name ?? "").trim();

  if (!name || name.length > 50) {
    return res.status(400).json({ message: "Name must be 1-50 characters" });
  }

  req.user.name = name;
  await req.user.save();

  res.json({ user: req.user });
}

function logout(req, res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.json({ message: "Logged out" });
}

module.exports = { sendOtp, verifyOtp, getMe, updateProfile, logout };
