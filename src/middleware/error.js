// Centralized error handler to map to the Error schema
export const errorHandler = (err, req, res, _next) => {
  // Validation errors from express-openapi-validator
  if (err.status && err.errors) {
    return res.status(err.status).json({
      code: "VALIDATION_ERROR",
      message: err.message || "Invalid request payload",
      details: (err.errors || []).map((e) => ({
        field: e.path,
        error: e.message,
      })),
      request_id: req.headers["x-request-id"] || undefined,
    });
  }

  if (err.code === "ECONNREFUSED") {
    return res.status(503).json({
      code: "DB_UNAVAILABLE",
      message: "Database unavailable",
      request_id: req.headers["x-request-id"] || undefined,
    });
  }

  const status = err.status || 500;
  const code = err.code || (status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR");
  const message = err.message || "Unexpected error";

  return res.status(status).json({
    code,
    message,
    request_id: req.headers["x-request-id"] || undefined,
  });
};
