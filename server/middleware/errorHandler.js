// Unknown /api route -> clean JSON 404 instead of Express's HTML page.
function notFound(req, res) {
  res.status(404).json({ message: "Not found" });
}

// Central error handler: Express 5 sends every thrown error / rejected promise here.
// Full details are logged on the server; the client only gets a safe message.
// Express needs all 4 arguments to treat this as an error handler, even if `next` is unused.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  // errors from express.json() (the body parser)
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body must be valid JSON" });
  }

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
    return res.status(500).json({ message: "Something went wrong, please try again" });
  }

  // other 4xx errors that are marked safe to show (err.expose)
  res.status(status).json({ message: err.expose ? err.message : "Bad request" });
}

module.exports = { notFound, errorHandler };
