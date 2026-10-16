const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { COOKIE_NAME } = require("../utils/authCookie");

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ message: "Not logged in" });
    }

    // throws if the token is fake, tampered with or expired
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // look the user up so a deleted user can't keep using an old token
    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ message: "Not logged in" });
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Not logged in" });
  }
}

module.exports = requireAuth;
