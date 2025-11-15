const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const YAML = require("yamljs");
const swaggerUi = require("swagger-ui-express");
const OpenApiValidator = require("express-openapi-validator");

const ordersRouter = require("./routes/orders");
const webhooksRouter = require("./routes/webhooks");
const internalRouter = require("./routes/internal");
require("dotenv").config();
const { errorHandler } = require("./middleware/error");

const app = express();

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Load OpenAPI spec
const specPath = path.resolve(__dirname, "../order-management-service.yaml");
const apiSpec = YAML.load(specPath);

// Swagger UI
app.use("/docs", swaggerUi.serve, swaggerUi.setup(apiSpec));
app.get("/api-docs.json", (_req, res) => res.json(apiSpec));

// OpenAPI request validation
app.use(
  OpenApiValidator.middleware({
    apiSpec: specPath,
    validateRequests: true,
    validateResponses: false,
  })
);

// Routes
app.use("/", ordersRouter);
app.use("/", webhooksRouter);
app.use("/", internalRouter);

// 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({
    code: "NOT_FOUND",
    message: "Route not found",
    request_id: req.headers["x-request-id"],
  });
});

// Centralized error handler
app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `Order Management Service running on http://localhost:${port} (docs at /docs)`
  );
});

module.exports = app;
