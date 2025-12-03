const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
// const {
//   validateCreateOrder,
//   validateUpdateOrder,
//   validateUpdateStatus,
// } = require("../middlewares/validation.middleware");

// Create new order
router.post("/", orderController.createOrder);

// Get all orders
router.get("/", orderController.getAllOrders);

// Get order statistics
router.get("/stats", orderController.getOrderStats);

// Get order by ID
router.get("/:id", orderController.getOrderById);

// Update order
router.put("/:id", orderController.updateOrder);

// Update order status
router.patch("/:id/status", orderController.updateOrderStatus);

// Delete order
router.delete("/:id", orderController.deleteOrder);

module.exports = router;
