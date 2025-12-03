const db = require("../config/database");
const logger = require("../config/logger");

class Order {
  static async create(orderData) {
    const {
      customer_id,
      shipping_address,
      total_amount,
      payment_method,
      payment_status = "pending",
      status = "pending",
      notes,
    } = orderData;

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    const query = `
      INSERT INTO orders (order_number, customer_id, shipping_address, total_amount, payment_method, payment_status, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      orderNumber,
      customer_id,
      shipping_address,
      total_amount,
      payment_method,
      payment_status,
      status,
      notes,
    ];

    try {
      const result = await db.query(query, values);
      logger.info(
        `Order created with ID: ${result.rows[0].id}, Order Number: ${orderNumber}`
      );
      return result.rows[0];
    } catch (error) {
      logger.error("Error creating order:", error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT o.*, 
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'product_id', oi.product_id,
                 'sku', oi.sku,
                 'product_name', oi.product_name,
                 'quantity', oi.quantity,
                 'unit_price', oi.unit_price,
                 'total_price', oi.total_price
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;

    const values = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND o.status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    if (filters.customer_id) {
      query += ` AND o.customer_id = $${paramCount}`;
      values.push(filters.customer_id);
      paramCount++;
    }

    query += ` GROUP BY o.id ORDER BY o.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    try {
      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error("Error fetching orders:", error);
      throw error;
    }
  }

  static async findById(id) {
    const query = `
      SELECT o.*, 
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'product_id', oi.product_id,
                 'product_name', oi.product_name,
                 'sku', oi.sku,
                 'quantity', oi.quantity,
                 'unit_price', oi.unit_price,
                 'total_price', oi.total_price
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error fetching order ${id}:`, error);
      throw error;
    }
  }

  static async update(id, updates) {
    const allowedFields = ["status", "shipping_address", "notes"];
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error("No valid fields to update");
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE orders 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info(`Order ${id} updated successfully`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating order ${id}:`, error);
      throw error;
    }
  }

  static async delete(id) {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      // Delete order items first
      await client.query("DELETE FROM order_items WHERE order_id = $1", [id]);

      // Delete order
      const result = await client.query(
        "DELETE FROM orders WHERE id = $1 RETURNING *",
        [id]
      );

      await client.query("COMMIT");

      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`Order ${id} deleted successfully`);
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`Error deleting order ${id}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await db.query(query, [status, id]);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info(`Order ${id} status updated to ${status}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating order ${id} status:`, error);
      throw error;
    }
  }
}

module.exports = Order;
