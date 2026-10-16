const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  // unique: only one active OTP per email
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  otpHash: { type: String, required: true },
  // TTL index: MongoDB deletes the document once expiresAt has passed
  expiresAt: { type: Date, required: true, expires: 0 },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, required: true },
});

module.exports = mongoose.model("Otp", otpSchema);
