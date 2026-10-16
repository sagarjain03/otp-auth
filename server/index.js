require("dotenv").config();
require("./config/env")(); // stop now if required env variables are missing

const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const authRoutes = require("./routes/authRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

// How many proxies in front of Express we trust for the client IP (X-Forwarded-For).
// Default 0: locally the Next.js rewrite does NOT add X-Forwarded-For, it only passes on
// whatever the client sent, so trusting it would let anyone fake their IP.
app.set("trust proxy", Number(process.env.TRUST_PROXY || 0));

app.use(helmet()); // security headers (and hides "X-Powered-By: Express")
app.use(express.json({ limit: "10kb" })); // our bodies are tiny; reject big payloads
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);

// TEMPORARY (Phase 6): proxy chain debug route, see routes/debugRoutes.js
if (process.env.DEBUG_IP === "true") {
  app.use("/api/debug", require("./routes/debugRoutes"));
}

app.use(notFound);
app.use(errorHandler); // must be last

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
