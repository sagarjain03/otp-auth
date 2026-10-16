const COOKIE_NAME = "token";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Shared by login (set) and logout (clear): the browser only clears a cookie
// when the options match the ones it was set with.
function cookieOptions() {
  return {
    httpOnly: true, // JavaScript in the browser can't read it (protects against XSS)
    sameSite: "lax", // not sent on cross-site POSTs (protects against CSRF)
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    maxAge: SEVEN_DAYS_MS, // same lifetime as the JWT
    path: "/",
  };
}

module.exports = { COOKIE_NAME, cookieOptions };
