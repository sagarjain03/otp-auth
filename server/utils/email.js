const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The ONE place emails are normalized. String() also turns objects like
// { "$gt": "" } into "[object Object]", so they can't reach a Mongo query.
function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

// 254 = longest valid email address
function isValidEmail(email) {
  return email.length <= 254 && EMAIL_REGEX.test(email);
}

module.exports = { normalizeEmail, isValidEmail };
