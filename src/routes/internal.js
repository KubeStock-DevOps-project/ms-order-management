const express = require("express");

const router = express.Router();

// POST /internal/events/publish
router.post("/internal/events/publish", (req, res) => {
  // In a real implementation, forward to message bus (Kafka/RabbitMQ)
  // Here we just accept and no-op
  return res.status(202).json({ message: "ok" });
});

module.exports = router;
