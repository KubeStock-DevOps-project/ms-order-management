const logger = require("../config/logger");

const errorHandler = (err, req, res, next) => {
  logger.error("Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Database errors
  if (err.code === "23505") {
    statusCode = 409;
    message = "Resource already exists";
  } else if (err.code === "23503") {
    statusCode = 400;
    message = "Referenced resource does not exist";
  } else if (err.code === "22P02") {
    statusCode = 400;
    message = "Invalid input data format";
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

module.exports = errorHandler;
