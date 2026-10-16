const express = require("express");
const {
  sendOtp,
  verifyOtp,
  getMe,
  updateProfile,
  logout,
} = require("../controllers/authController");
const requireAuth = require("../middleware/requireAuth");
const {
  sendOtpIpLimit,
  sendOtpEmailLimit,
  verifyOtpIpLimit,
} = require("../middleware/rateLimits");

const router = express.Router();

router.post("/send-otp", sendOtpIpLimit, sendOtpEmailLimit, sendOtp);
router.post("/verify-otp", verifyOtpIpLimit, verifyOtp);
router.post("/logout", logout);

router.get("/me", requireAuth, getMe);
router.patch("/profile", requireAuth, updateProfile);

module.exports = router;
