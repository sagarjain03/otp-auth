const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Otp = require("../models/Otp");
const sendEmail = require("../utils/sendEmail");

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function sendOtp(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }

    const existing = await Otp.findOne({ email });
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
  } catch (err) {
    console.error("send-otp failed:", err.message);
    res.status(500).json({ message: "Could not send OTP, please try again" });
  }
}

module.exports = { sendOtp };
