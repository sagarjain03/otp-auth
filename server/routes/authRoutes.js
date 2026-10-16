const express = require("express");
const {
  sendOtp,
  verifyOtp,
  getMe,
  updateProfile,
  logout,
} = require("../controllers/authController");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/logout", logout);

router.get("/me", requireAuth, getMe);
router.patch("/profile", requireAuth, updateProfile);

module.exports = router;
