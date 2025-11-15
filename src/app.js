import cors from "cors";
import express from "express";
import OpenApiValidator from "express-openapi-validator";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { fileURLToPath } from "url";
import YAML from "yamljs";
import { internalRouter } from "./routes/internal.js";
import { ordersRouter } from "./routes/orders.js";
import { webhooksRouter } from "./routes/webhooks.js";

import "dotenv/config";
import { errorHandler } from "./middleware/error.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Health check endpoint
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Load OpenAPI spec
const specPath = path.resolve(__dirname, "../order-management-service.yaml");
const apiSpec = YAML.load(specPath);

// Swagger UI
app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(apiSpec));
app.get("/api/v1/api-docs.json", (_req, res) => res.json(apiSpec));

// OpenAPI request validation
app.use(
  OpenApiValidator.middleware({
    apiSpec: specPath,
    validateRequests: true,
    validateResponses: false,
  })
);

// Routes
app.use("/api/v1/orders", ordersRouter);
app.use("/api/v1/webhooks", webhooksRouter);
app.use("/api/v1/internal", internalRouter);

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

export { app };
