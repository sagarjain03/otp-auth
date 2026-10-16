// TEMPORARY: only mounted when DEBUG_IP=true. Used once after deploy to measure the
// proxy chain (Vercel -> Render -> Express) and pick the right TRUST_PROXY value.
// Remove this file and the DEBUG_IP block in index.js once TRUST_PROXY is set.
const express = require("express");

const router = express.Router();

router.get("/ip", (req, res) => {
  const forwardedFor = req.headers["x-forwarded-for"] || "";
  // the addresses as Express sees them: X-Forwarded-For entries, then the direct socket
  const chain = [
    ...forwardedFor.split(",").map((ip) => ip.trim()).filter(Boolean),
    req.socket.remoteAddress,
  ];

  // TRUST_PROXY=n makes req.ip the address n steps from the right of this chain
  const ipIfTrustProxyIs = {};
  for (let n = 0; n <= 3; n++) {
    ipIfTrustProxyIs[n] = chain[Math.max(chain.length - 1 - n, 0)];
  }

  res.json({
    currentTrustProxy: req.app.get("trust proxy"),
    reqIp: req.ip,
    socketIp: req.socket.remoteAddress,
    xForwardedFor: forwardedFor || null,
    chain,
    ipIfTrustProxyIs,
  });
});

module.exports = router;
