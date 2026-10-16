const { rateLimit } = require("express-rate-limit");
const { normalizeEmail, isValidEmail } = require("../utils/email");

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

// Same JSON shape as every other error, so the frontend shows it as-is.
function limitMessage(text) {
  return { message: text };
}

// Per IP: every request counts (also invalid ones), so one machine can't spam.
const sendOtpIpLimit = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: limitMessage("Too many requests from this network. Try again in 15 minutes"),
});

const verifyOtpIpLimit = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: limitMessage("Too many verification attempts. Try again in 15 minutes"),
});

// Per email: max 5 OTP emails per address per hour, no matter which IP asks.
// Protects a victim's inbox even if an attacker rotates (or fakes) IPs.
const sendOtpEmailLimit = rateLimit({
  windowMs: ONE_HOUR,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `email:${normalizeEmail(req.body?.email)}`,
  // invalid emails get a 400 from the controller; nothing to count per email
  skip: (req) => !isValidEmail(normalizeEmail(req.body?.email)),
  // only count OTPs that were actually sent (not cooldown/locked rejections)
  skipFailedRequests: true,
  message: limitMessage("Too many codes requested for this email. Try again in an hour"),
});

module.exports = { sendOtpIpLimit, sendOtpEmailLimit, verifyOtpIpLimit };
