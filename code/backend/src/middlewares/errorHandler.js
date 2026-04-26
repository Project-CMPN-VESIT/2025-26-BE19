const { logger } = require("../config/logger");

function notFound(req, res) {
  res.status(404).json({ error: "Route not found" });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  logger.error(
    {
      err: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    },
    "Unhandled error"
  );
  res.status(err.statusCode || 500).json({
    error: err.message || "Internal server error",
  });
}

module.exports = {
  notFound,
  errorHandler,
};
