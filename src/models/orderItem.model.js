const db = require("../config/database");
const logger = require("../config/logger");

class OrderItem {
  static async create(itemData) {
    const { order_id, product_id, sku, product_name, quantity, unit_price } =
      itemData;

    const query = `
      INSERT INTO order_items (order_id, product_id, sku, product_name, quantity, unit_price)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      order_id,
      product_id,
      sku,
      product_name,
      quantity,
      unit_price,
    ];

    try {
      const result = await db.query(query, values);
      logger.info(`Order item created for order ${order_id}`);
      return result.rows[0];
    } catch (error) {
      logger.error("Error creating order item:", error);
      throw error;
    }
  }

  static async createBatch(items) {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const createdItems = [];
      for (const item of items) {
        const query = `
          INSERT INTO order_items (order_id, product_id, sku, product_name, quantity, unit_price)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        const values = [
          item.order_id,
          item.product_id,
          item.sku,
          item.product_name,
          item.quantity,
          item.unit_price,
        ];
        const result = await client.query(query, values);
        createdItems.push(result.rows[0]);
      }

      await client.query("COMMIT");
      logger.info(`Created ${createdItems.length} order items`);
      return createdItems;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error creating batch order items:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByOrderId(orderId) {
    const query = `
      SELECT * FROM order_items
      WHERE order_id = $1
      ORDER BY id
    `;

    try {
      const result = await db.query(query, [orderId]);
      return result.rows;
    } catch (error) {
      logger.error(`Error fetching order items for order ${orderId}:`, error);
      throw error;
    }
  }

  static async delete(id) {
    const query = "DELETE FROM order_items WHERE id = $1 RETURNING *";

    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info(`Order item ${id} deleted`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error deleting order item ${id}:`, error);
      throw error;
    }
  }
}

module.exports = OrderItem;
