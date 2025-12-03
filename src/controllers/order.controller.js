const Order = require("../models/order.model");
const OrderItem = require("../models/orderItem.model");
const OrderService = require("../services/order.service");
const logger = require("../config/logger");

class OrderController {
  // Create new order with items (with full business logic)
  async createOrder(req, res) {
    try {
      const {
        customer_id,
        shipping_address,
        payment_method,
        payment_status,
        notes,
        items,
      } = req.body;

      // Validate items array
      if (!items || items.length === 0) {
        logger.warn("Order creation attempted without items");
        return res.status(400).json({
          success: false,
          message: "Order must contain at least one item",
        });
      }

      // Use OrderService for business logic
      const result = await OrderService.createOrder({
        customer_id,
        shipping_address,
        payment_method,
        payment_status,
        notes,
        items,
      });

      logger.info(
        `Order ${result.order.id} created successfully with ${result.items.length} items`
      );

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: {
          ...result.order,
          items: result.items,
          totals: result.totals,
        },
      });
    } catch (error) {
      logger.error("Create order error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error creating order",
        error: error.message,
      });
    }
  }

  // Get all orders with filters
  async getAllOrders(req, res) {
    try {
      const { status, customer_id, limit } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (customer_id) filters.customer_id = parseInt(customer_id);
      if (limit) filters.limit = parseInt(limit);

      const orders = await Order.findAll(filters);

      logger.info(`Retrieved ${orders.length} orders with filters:`, filters);

      res.json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (error) {
      logger.error("Get all orders error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching orders",
        error: error.message,
      });
    }
  }

  // Get order by ID
  async getOrderById(req, res) {
    try {
      const { id } = req.params;

      const order = await Order.findById(id);

      if (!order) {
        logger.warn(`Order ${id} not found`);
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      logger.info(`Retrieved order ${id}`);

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      logger.error(`Get order ${req.params.id} error:`, error);
      res.status(500).json({
        success: false,
        message: "Error fetching order",
        error: error.message,
      });
    }
  }

  // Update order
  async updateOrder(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const order = await Order.update(id, updates);

      if (!order) {
        logger.warn(`Order ${id} not found for update`);
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      logger.info(`Order ${id} updated successfully`, updates);

      res.json({
        success: true,
        message: "Order updated successfully",
        data: order,
      });
    } catch (error) {
      logger.error(`Update order ${req.params.id} error:`, error);
      res.status(500).json({
        success: false,
        message: "Error updating order",
        error: error.message,
      });
    }
  }

  // Update order status (with business logic)
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Must match database CHECK constraint
      const validStatuses = [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];

      if (!validStatuses.includes(status)) {
        logger.warn(`Invalid status ${status} for order ${id}`);
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(
            ", "
          )}`,
        });
      }

      // Use OrderService for status update with business logic
      const order = await OrderService.updateOrderStatus(id, status);

      logger.info(`Order ${id} status updated to ${status}`);

      res.json({
        success: true,
        message: "Order status updated successfully",
        data: order,
      });
    } catch (error) {
      logger.error(`Update order ${req.params.id} status error:`, error);
      res.status(400).json({
        success: false,
        message: error.message || "Error updating order status",
        error: error.message,
      });
    }
  }

  // Delete order (cancel)
  async deleteOrder(req, res) {
    try {
      const { id } = req.params;

      const order = await Order.delete(id);

      if (!order) {
        logger.warn(`Order ${id} not found for deletion`);
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      logger.info(`Order ${id} deleted successfully`);

      res.json({
        success: true,
        message: "Order deleted successfully",
        data: order,
      });
    } catch (error) {
      logger.error(`Delete order ${req.params.id} error:`, error);
      res.status(500).json({
        success: false,
        message: "Error deleting order",
        error: error.message,
      });
    }
  }

  // Get order statistics
  async getOrderStats(req, res) {
    try {
      const { user_id } = req.query;

      const filters = {};
      if (user_id) filters.user_id = parseInt(user_id);

      const allOrders = await Order.findAll(filters);

      const stats = {
        total: allOrders.length,
        pending: allOrders.filter((o) => o.status === "pending").length,
        processing: allOrders.filter((o) => o.status === "processing").length,
        shipped: allOrders.filter((o) => o.status === "shipped").length,
        delivered: allOrders.filter((o) => o.status === "delivered").length,
        cancelled: allOrders.filter((o) => o.status === "cancelled").length,
        totalRevenue: allOrders
          .filter((o) => o.status === "delivered")
          .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0),
      };

      logger.info("Order stats retrieved", stats);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Get order stats error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching order statistics",
        error: error.message,
      });
    }
  }
}

module.exports = new OrderController();
