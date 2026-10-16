// Checks required env variables at startup. If anything is wrong the server
// stops right away with a clear list, instead of failing later on some request.

const PROVIDER_KEYS = {
  gmail: ["EMAIL_USER", "EMAIL_PASS"],
  brevo: ["BREVO_API_KEY", "EMAIL_FROM"],
};

function validateEnv() {
  const env = process.env;
  const problems = [];

  if (!env.MONGO_URI) problems.push("MONGO_URI is missing");

  if (!env.JWT_SECRET) {
    problems.push("JWT_SECRET is missing");
  } else if (env.JWT_SECRET.length < 32) {
    problems.push("JWT_SECRET must be at least 32 characters");
  }

  const provider = env.EMAIL_PROVIDER;
  if (!PROVIDER_KEYS[provider]) {
    problems.push(`EMAIL_PROVIDER must be "gmail" or "brevo" (got "${provider ?? ""}")`);
  } else {
    for (const key of PROVIDER_KEYS[provider]) {
      if (!env[key]) problems.push(`${key} is missing (needed for EMAIL_PROVIDER=${provider})`);
    }
  }

  if (env.TRUST_PROXY && !/^\d+$/.test(env.TRUST_PROXY)) {
    problems.push("TRUST_PROXY must be a whole number (how many proxies sit in front of Express)");
  }

  if (problems.length > 0) {
    console.error("Invalid environment config in server/.env:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
}

module.exports = validateEnv;
