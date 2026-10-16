const nodemailer = require("nodemailer");

// Gmail via SMTP (local dev). Needs a Gmail App Password, not your normal password.
async function sendWithGmail(to, subject, html) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
}

// Brevo via HTTP API (production). Render's free tier blocks SMTP ports.
async function sendWithBrevo(to, subject, html) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: process.env.EMAIL_FROM },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Brevo error ${res.status}: ${await res.text()}`);
  }
}

async function sendEmail(to, subject, html) {
  const provider = process.env.EMAIL_PROVIDER || "gmail";

  if (provider === "gmail") return sendWithGmail(to, subject, html);
  if (provider === "brevo") return sendWithBrevo(to, subject, html);

  throw new Error(`Unknown EMAIL_PROVIDER: ${provider}`);
}

module.exports = sendEmail;
