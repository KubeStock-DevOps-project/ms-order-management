require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const logger = require("./config/logger");
const errorHandler = require("./middlewares/errorHandler.middleware");
const {
  metricsMiddleware,
  getMetrics,
  getContentType,
  updateDbMetrics,
} = require("./middlewares/metrics");
const pool = require("./config/database");
const { runMigrations } = require("./config/migrationRunner");
const orderRoutes = require("./routes/order.routes");

const app = express();
const PORT = process.env.PORT || 3005;

// Database configuration for migrations
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "order_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('rds.amazonaws.com') ? { rejectUnauthorized: false } : false,
};

setInterval(() => {
  updateDbMetrics(pool.pool);
}, 30000);

// Middleware
app.use(helmet());
app.use(express.json());
app.use(metricsMiddleware);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    query: req.query,
    body: req.body,
  });
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "order-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", getContentType());
    res.send(await getMetrics());
  } catch (error) {
    logger.error("Error generating metrics", error);
    res.status(500).send("Error generating metrics");
  }
});

// Routes - gateway strips /api/order prefix before forwarding
app.use("/", orderRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.url,
  });
});

// Error handler
app.use(errorHandler);

const HOST = process.env.HOST || '127.0.0.1';

// Start server after migrations
const startServer = async () => {
  try {
    await runMigrations(dbConfig, logger);
  } catch (error) {
    logger.error("Migration failed:", error);
    process.exit(1);
  }

  const server = app.listen(PORT, HOST, () => {
    logger.info(`Order Service running on http://${HOST}:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
    logger.info(`Metrics available at http://${HOST}:${PORT}/metrics`);
  });

  const gracefulShutdown = (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    server.close(() => {
      logger.info("HTTP server closed");
      pool.end(() => {
        logger.info("Database connections closed");
        process.exit(0);
      });
    });
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 30000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
};

startServer();

module.exports = app;
