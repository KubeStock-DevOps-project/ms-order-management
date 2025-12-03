const client = require("prom-client");

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: "order_service_",
  timeout: 5000,
});

const httpRequestDuration = new client.Histogram({
  name: "order_service_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

const httpRequestTotal = new client.Counter({
  name: "order_service_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

const httpRequestsInProgress = new client.Gauge({
  name: "order_service_http_requests_in_progress",
  help: "Number of HTTP requests currently in progress",
  labelNames: ["method", "route"],
});

const dbQueryDuration = new client.Histogram({
  name: "order_service_db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation", "table"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5],
});

const dbConnectionsActive = new client.Gauge({
  name: "order_service_db_connections_active",
  help: "Number of active database connections",
});

const dbConnectionsIdle = new client.Gauge({
  name: "order_service_db_connections_idle",
  help: "Number of idle database connections",
});

const ordersTotal = new client.Counter({
  name: "order_service_orders_total",
  help: "Total number of orders created",
  labelNames: ["status"],
});

const orderValue = new client.Histogram({
  name: "order_service_order_value_dollars",
  help: "Order value in dollars",
  buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
});

const orderStatusChanges = new client.Counter({
  name: "order_service_status_changes_total",
  help: "Total number of order status changes",
  labelNames: ["from_status", "to_status"],
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestsInProgress);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbConnectionsActive);
register.registerMetric(dbConnectionsIdle);
register.registerMetric(ordersTotal);
register.registerMetric(orderValue);
register.registerMetric(orderStatusChanges);

const metricsMiddleware = (req, res, next) => {
  if (req.path === "/metrics") {
    return next();
  }

  const start = Date.now();
  const route = req.route ? req.route.path : req.path;

  httpRequestsInProgress.inc({ method: req.method, route });

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;

    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );

    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });

    httpRequestsInProgress.dec({ method: req.method, route });
  });

  next();
};

const updateDbMetrics = (pool) => {
  if (
    pool &&
    typeof pool.totalCount === "number" &&
    typeof pool.idleCount === "number"
  ) {
    dbConnectionsActive.set(pool.totalCount - pool.idleCount);
    dbConnectionsIdle.set(pool.idleCount);
  }
};

const trackDbQuery = (operation, table, durationMs) => {
  dbQueryDuration.observe({ operation, table }, durationMs / 1000);
};

const incrementOrders = (status) => {
  ordersTotal.inc({ status });
};

const recordOrderValue = (value) => {
  orderValue.observe(value);
};

const incrementStatusChanges = (fromStatus, toStatus) => {
  orderStatusChanges.inc({ from_status: fromStatus, to_status: toStatus });
};

const getMetrics = async () => {
  return await register.metrics();
};

const getContentType = () => {
  return register.contentType;
};

module.exports = {
  metricsMiddleware,
  updateDbMetrics,
  trackDbQuery,
  incrementOrders,
  recordOrderValue,
  incrementStatusChanges,
  getMetrics,
  getContentType,
};
