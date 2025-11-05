const { v4: uuidv4 } = require("uuid");
const prisma = require("../prisma");
const { computeTotals } = require("../utils/totals");
const { toApiOrder } = require("../utils/mappers");

const ORDER_STATES = [
  "DRAFT",
  "PENDING",
  "RESERVED",
  "FULFILLING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
];
const TERMINAL = new Set(["CANCELLED", "COMPLETED"]);

function allowedTransition(from, to) {
  const map = {
    DRAFT: ["PENDING", "CANCELLED"],
    PENDING: ["RESERVED", "CANCELLED"],
    RESERVED: ["FULFILLING", "CANCELLED"],
    FULFILLING: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["COMPLETED"],
    COMPLETED: [],
    CANCELLED: [],
  };
  return (map[from] || []).includes(to);
}

async function getOrderById(orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, deleted: false },
  });
  if (!order) return null;
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    orderBy: { id: "asc" },
  });
  return toApiOrder(order, items);
}

async function listOrders(params) {
  const { page = 1, size = 25, sort, filters = {} } = params;
  const where = { deleted: false };
  if (filters.status) where.status = filters.status;
  if (filters.customer_id) where.customerId = filters.customer_id;
  if (filters.sales_channel) where.salesChannel = filters.sales_channel;
  if (filters.from_date || filters.to_date) {
    where.createdAt = {};
    if (filters.from_date) where.createdAt.gte = new Date(filters.from_date);
    if (filters.to_date) where.createdAt.lte = new Date(filters.to_date);
  }
  let orderBy = [{ createdAt: "desc" }];
  if (sort) {
    const [field, dir = "asc"] = String(sort).split(":");
    const safe = {
      created_at: "createdAt",
      updated_at: "updatedAt",
      status: "status",
      reference: "reference",
    };
    const f = safe[field] || "createdAt";
    orderBy = [{ [f]: dir.toLowerCase() === "desc" ? "desc" : "asc" }];
  }
  const total = await prisma.order.count({ where });
  const orders = await prisma.order.findMany({
    where,
    orderBy,
    skip: (page - 1) * size,
    take: size,
  });
  return {
    items: orders.map((o) => toApiOrder(o)),
    pagination: {
      page,
      size,
      total,
      next_page: page * size < total ? String(page + 1) : null,
    },
  };
}

async function createOrder(body, idemKey) {
  if (idemKey) {
    const existing = await prisma.idempotencyKey.findFirst({
      where: { key: idemKey },
      include: { order: true },
    });
    if (existing && existing.order) {
      const order = await getOrderById(existing.orderId);
      return { order, existed: true };
    }
  }

  const orderId = uuidv4();
  const reserve_on_place = body.reserve_on_place !== false;
  const reservationId = reserve_on_place ? uuidv4() : null;
  const items = (body.items || []).map((it) => ({
    id: uuidv4(),
    orderId,
    sku: it.sku,
    productId: it.product_id || null,
    quantity: it.quantity,
    unitPrice: it.unit_price,
    totalPrice: (Number(it.unit_price) || 0) * (Number(it.quantity) || 0),
    meta: it.meta || {},
  }));
  const totals = computeTotals(
    items.map((it) => ({ unit_price: it.unitPrice, quantity: it.quantity }))
  );

  await prisma.$transaction(async (tx) => {
    await tx.order.create({
      data: {
        id: orderId,
        reference: body.reference || null,
        status: reserve_on_place ? "RESERVED" : "PENDING",
        customerId: body.customer_id || null,
        salesChannel: body.sales_channel || null,
        totals,
        shippingAddress: body.shipping_address || null,
        billingInfo: body.billing_info || null,
        notes: body.notes || null,
        preferredWarehouseId: body.preferred_warehouse_id || null,
        reservationId,
        version: 1,
      },
    });
    if (items.length) {
      await tx.orderItem.createMany({ data: items });
    }
    await tx.auditEntry.create({
      data: {
        id: uuidv4(),
        orderId,
        actor: "system",
        action: "order.created",
        details: { reference: body.reference || null },
      },
    });
    if (reserve_on_place) {
      await tx.auditEntry.create({
        data: {
          id: uuidv4(),
          orderId,
          actor: "system",
          action: "order.reserved",
          details: { reservation_id: reservationId },
        },
      });
    }
    if (idemKey) {
      await tx.idempotencyKey.create({ data: { key: idemKey, orderId } });
    }
  });

  const order = await getOrderById(orderId);
  return { order, existed: false };
}

async function patchOrder(id, data, ifMatch) {
  const existing = await prisma.order.findFirst({
    where: { id, deleted: false },
    select: { version: true },
  });
  if (!existing) {
    const err = new Error("Order not found");
    err.status = 404;
    throw err;
  }
  if (ifMatch && String(existing.version) !== String(ifMatch)) {
    const err = new Error("Version conflict");
    err.status = 409;
    err.code = "VERSION_CONFLICT";
    throw err;
  }
  await prisma.order.update({
    where: { id },
    data: {
      shippingAddress:
        data.shipping_address !== undefined ? data.shipping_address : undefined,
      notes: data.notes !== undefined ? data.notes : undefined,
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  });
  await prisma.auditEntry.create({
    data: {
      id: uuidv4(),
      orderId: id,
      actor: "system",
      action: "order.patched",
      details: { fields: Object.keys(data || {}) },
    },
  });
  return getOrderById(id);
}

async function deleteOrder(id) {
  await prisma.order
    .update({ where: { id }, data: { deleted: true, updatedAt: new Date() } })
    .catch(() => null);
  await prisma.auditEntry
    .create({
      data: {
        id: uuidv4(),
        orderId: id,
        actor: "system",
        action: "order.deleted",
        details: {},
      },
    })
    .catch(() => null);
}

async function ensureModifiable(orderId, allowed, codeMsg) {
  const ord = await prisma.order.findFirst({
    where: { id: orderId, deleted: false },
    select: { status: true },
  });
  if (!ord) {
    const e = new Error("Order not found");
    e.status = 404;
    throw e;
  }
  if (!allowed.includes(ord.status)) {
    const e = new Error(codeMsg || "Invalid state");
    e.status = 422;
    throw e;
  }
}

async function addItems(orderId, newItems) {
  await ensureModifiable(
    orderId,
    ["DRAFT", "PENDING"],
    "Cannot add items in current order state"
  );
  const items = (newItems || []).map((it) => ({
    id: uuidv4(),
    orderId,
    sku: it.sku,
    productId: it.product_id || null,
    quantity: it.quantity,
    unitPrice: it.unit_price,
    totalPrice: (Number(it.unit_price) || 0) * (Number(it.quantity) || 0),
    meta: it.meta || {},
  }));
  await prisma.$transaction(async (tx) => {
    if (items.length) await tx.orderItem.createMany({ data: items });
    const all = await tx.orderItem.findMany({
      where: { orderId },
      select: { unitPrice: true, quantity: true },
    });
    const totals = computeTotals(
      all.map((r) => ({ unit_price: r.unitPrice, quantity: r.quantity }))
    );
    await tx.order.update({
      where: { id: orderId },
      data: { totals, version: { increment: 1 }, updatedAt: new Date() },
    });
    await tx.auditEntry.create({
      data: {
        id: uuidv4(),
        orderId,
        actor: "system",
        action: "order.items_added",
        details: { count: items.length },
      },
    });
  });
  return getOrderById(orderId);
}

async function updateItem(orderId, itemId, payload) {
  await ensureModifiable(
    orderId,
    ["DRAFT", "PENDING"],
    "Cannot modify item in current state"
  );
  const upd = await prisma.orderItem.updateMany({
    where: { id: itemId, orderId },
    data: {
      sku: payload.sku,
      productId: payload.product_id || null,
      quantity: payload.quantity,
      unitPrice: payload.unit_price,
      totalPrice:
        (Number(payload.unit_price) || 0) * (Number(payload.quantity) || 0),
      meta: payload.meta || {},
    },
  });
  if (upd.count === 0) {
    const e = new Error("Item not found");
    e.status = 404;
    throw e;
  }
  await prisma.$transaction(async (tx) => {
    const all = await tx.orderItem.findMany({
      where: { orderId },
      select: { unitPrice: true, quantity: true },
    });
    const totals = computeTotals(
      all.map((r) => ({ unit_price: r.unitPrice, quantity: r.quantity }))
    );
    await tx.order.update({
      where: { id: orderId },
      data: { totals, version: { increment: 1 }, updatedAt: new Date() },
    });
    await tx.auditEntry.create({
      data: {
        id: uuidv4(),
        orderId,
        actor: "system",
        action: "order.item_updated",
        details: { item_id: itemId },
      },
    });
  });
  return getOrderById(orderId);
}

async function removeItem(orderId, itemId) {
  await ensureModifiable(
    orderId,
    ["DRAFT", "PENDING"],
    "Cannot remove item in current state"
  );
  const del = await prisma.orderItem.deleteMany({
    where: { id: itemId, orderId },
  });
  if (del.count === 0) {
    const e = new Error("Item not found");
    e.status = 404;
    throw e;
  }
  await prisma.$transaction(async (tx) => {
    const all = await tx.orderItem.findMany({
      where: { orderId },
      select: { unitPrice: true, quantity: true },
    });
    const totals = computeTotals(
      all.map((r) => ({ unit_price: r.unitPrice, quantity: r.quantity }))
    );
    await tx.order.update({
      where: { id: orderId },
      data: { totals, version: { increment: 1 }, updatedAt: new Date() },
    });
    await tx.auditEntry.create({
      data: {
        id: uuidv4(),
        orderId,
        actor: "system",
        action: "order.item_removed",
        details: { item_id: itemId },
      },
    });
  });
  return getOrderById(orderId);
}

async function updateStatus(orderId, payload) {
  const current = await prisma.order.findFirst({
    where: { id: orderId, deleted: false },
    select: { status: true, reservationId: true },
  });
  if (!current) {
    const e = new Error("Order not found");
    e.status = 404;
    throw e;
  }
  const target = String(payload.status || "").toUpperCase();
  if (!ORDER_STATES.includes(target)) {
    const e = new Error("Unknown status");
    e.status = 422;
    e.code = "INVALID_STATUS";
    throw e;
  }
  if (!allowedTransition(current.status, target)) {
    const e = new Error(`Cannot transition ${current.status} -> ${target}`);
    e.status = 409;
    e.code = "INVALID_TRANSITION";
    throw e;
  }
  if (target === "FULFILLING" && !payload.warehouse_id) {
    const e = new Error("warehouse_id required for FULFILLING");
    e.status = 422;
    throw e;
  }
  if (target === "SHIPPED" && !payload.tracking_number) {
    const e = new Error("tracking_number required for SHIPPED");
    e.status = 422;
    throw e;
  }
  let reservationId = current.reservationId;
  if (target === "RESERVED" && !reservationId) reservationId = uuidv4();
  if (target === "CANCELLED") reservationId = null;
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: target,
      reservationId,
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  });
  await prisma.auditEntry.create({
    data: {
      id: uuidv4(),
      orderId,
      actor: "system",
      action: "order.status_updated",
      details: {
        status: target,
        reason: payload.reason,
        warehouse_id: payload.warehouse_id,
        tracking_number: payload.tracking_number,
      },
    },
  });
  return getOrderById(orderId);
}

async function cancelOrder(orderId, reason) {
  const current = await prisma.order.findFirst({
    where: { id: orderId, deleted: false },
    select: { status: true },
  });
  if (!current) {
    const e = new Error("Order not found");
    e.status = 404;
    throw e;
  }
  if (TERMINAL.has(current.status)) {
    const e = new Error("Order already terminal");
    e.status = 409;
    e.code = "INVALID_STATE";
    throw e;
  }
  const target = "CANCELLED";
  if (
    !allowedTransition(current.status, target) &&
    !["PENDING", "RESERVED", "DRAFT"].includes(current.status)
  ) {
    const e = new Error(`Cannot cancel from ${current.status}`);
    e.status = 409;
    e.code = "INVALID_TRANSITION";
    throw e;
  }
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      reservationId: null,
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  });
  await prisma.auditEntry.create({
    data: {
      id: uuidv4(),
      orderId,
      actor: "system",
      action: "order.cancelled",
      details: { reason },
    },
  });
  return getOrderById(orderId);
}

async function getAudit(orderId) {
  const exists = await prisma.order.findFirst({
    where: { id: orderId, deleted: false },
    select: { id: true },
  });
  if (!exists) {
    const e = new Error("Order not found");
    e.status = 404;
    throw e;
  }
  const entries = await prisma.auditEntry.findMany({
    where: { orderId },
    orderBy: { timestamp: "asc" },
  });
  return { entries };
}

module.exports = {
  getOrderById,
  listOrders,
  createOrder,
  patchOrder,
  deleteOrder,
  addItems,
  updateItem,
  removeItem,
  updateStatus,
  cancelOrder,
  getAudit,
};
