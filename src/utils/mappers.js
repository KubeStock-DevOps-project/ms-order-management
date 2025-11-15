export const toNumber = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val;
  return Number(val);
};

export const toApiItem = (item) => {
  return {
    id: item.id,
    sku: item.sku,
    product_id: item.productId || null,
    quantity: item.quantity,
    unit_price: toNumber(item.unitPrice),
    total_price: toNumber(item.totalPrice),
    meta: item.meta || {},
  };
};

export const toApiOrder = (order, items) => {
  return {
    id: order.id,
    reference: order.reference || undefined,
    status: order.status,
    customer_id: order.customerId || undefined,
    sales_channel: order.salesChannel || undefined,
    items: Array.isArray(items) ? items.map(toApiItem) : undefined,
    totals: order.totals || {
      subtotal: 0,
      tax: 0,
      shipping: 0,
      discounts: 0,
      grand_total: 0,
    },
    shipping_address: order.shippingAddress || undefined,
    billing_info: order.billingInfo || undefined,
    notes: order.notes || undefined,
    preferred_warehouse_id: order.preferredWarehouseId || null,
    reservation_id: order.reservationId || null,
    version: order.version,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
};

export const toApiWebhook = (wh) => {
  return {
    id: wh.id,
    url: wh.url,
    events: wh.events || [],
    secret: wh.secret,
    created_at: wh.createdAt,
  };
};
