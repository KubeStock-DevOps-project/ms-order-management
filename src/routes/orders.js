import express from "express";
import {
  addItems,
  cancelOrder,
  createOrder,
  deleteOrder,
  getAudit,
  getOrderById,
  listOrders,
  patchOrder,
  removeItem,
  updateItem,
  updateStatus,
} from "../services/orders.service.js";

const router = express.Router();

// POST / - create
router.post("/", async (req, res, next) => {
  try {
    const idemKey = req.header("Idempotency-Key");
    const { order, existed } = await createOrder(req.body || {}, idemKey);
    return res.status(existed ? 200 : 201).json(order);
  } catch (e) {
    next(e);
  }
});

// GET / - list
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const size = Math.max(
      1,
      Math.min(200, parseInt(req.query.size || "25", 10))
    );
    const sort = req.query.sort;
    const filters = {
      status: req.query.status,
      customer_id: req.query.customer_id,
      sales_channel: req.query.sales_channel,
      from_date: req.query.from_date,
      to_date: req.query.to_date,
    };
    const result = await listOrders({
      page,
      size,
      sort,
      filters,
    });
    return res.json(result);
  } catch (e) {
    next(e);
  }
});

// GET /{orderId}
router.get("/:orderId", async (req, res, next) => {
  try {
    const order = await getOrderById(req.params.orderId);
    if (!order)
      return res
        .status(404)
        .json({ code: "NOT_FOUND", message: "Order not found" });
    return res.json(order);
  } catch (e) {
    next(e);
  }
});

// PATCH /{orderId}
router.patch("/:orderId", async (req, res, next) => {
  try {
    const ifMatch = req.header("If-Match");
    const order = await patchOrder(req.params.orderId, req.body || {}, ifMatch);
    return res.json(order);
  } catch (e) {
    next(e);
  }
});

// DELETE /{orderId}
router.delete("/:orderId", async (req, res, next) => {
  try {
    await deleteOrder(req.params.orderId);
    return res.sendStatus(204);
  } catch (e) {
    next(e);
  }
});

// POST /{orderId}/items
router.post("/:orderId/items", async (req, res, next) => {
  try {
    const updated = await addItems(req.params.orderId, req.body.items || []);
    return res.json(updated);
  } catch (e) {
    next(e);
  }
});

// PUT /{orderId}/items/{itemId}
router.put("/:orderId/items/:itemId", async (req, res, next) => {
  try {
    const updated = await updateItem(
      req.params.orderId,
      req.params.itemId,
      req.body || {}
    );
    return res.json(updated);
  } catch (e) {
    next(e);
  }
});

// DELETE /{orderId}/items/{itemId}
router.delete("/:orderId/items/:itemId", async (req, res, next) => {
  try {
    const updated = await removeItem(req.params.orderId, req.params.itemId);
    return res.json(updated);
  } catch (e) {
    next(e);
  }
});

// POST /{orderId}/status
router.post("/:orderId/status", async (req, res, next) => {
  try {
    const order = await updateStatus(req.params.orderId, req.body || {});
    return res.json(order);
  } catch (e) {
    next(e);
  }
});

// POST /{orderId}/cancel
router.post("/:orderId/cancel", async (req, res, next) => {
  try {
    const order = await cancelOrder(
      req.params.orderId,
      req.body && req.body.reason
    );
    return res.json(order);
  } catch (e) {
    next(e);
  }
});

// GET /{orderId}/audit
router.get("/:orderId/audit", async (req, res, next) => {
  try {
    const result = await getAudit(req.params.orderId);
    return res.json(result);
  } catch (e) {
    next(e);
  }
});

export const ordersRouter = router;
