/**
 * Initial Migration for Order Service
 * Creates core tables: orders, order_items, order_status_history
 */

exports.up = (pgm) => {
  // Orders table
  pgm.createTable('orders', {
    id: 'id',
    order_number: { type: 'varchar(100)', notNull: true, unique: true },
    customer_id: { type: 'varchar(255)' }, // Asgardeo sub or email
    shipping_address: { type: 'text', notNull: true },
    total_amount: { type: 'decimal(12,2)', notNull: true, default: 0 },
    payment_method: { type: 'varchar(50)' },
    payment_status: { type: 'varchar(50)', default: 'pending' },
    status: { type: 'varchar(50)', default: 'pending' },
    notes: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createIndex('orders', 'customer_id');
  pgm.createIndex('orders', 'status');
  pgm.createIndex('orders', 'created_at');

  // Order items table
  pgm.createTable('order_items', {
    id: 'id',
    order_id: {
      type: 'integer',
      notNull: true,
      references: 'orders',
      onDelete: 'CASCADE',
    },
    product_id: { type: 'integer', notNull: true },
    sku: { type: 'varchar(100)', notNull: true },
    product_name: { type: 'varchar(255)', notNull: true },
    quantity: { type: 'integer', notNull: true },
    unit_price: { type: 'decimal(10,2)', notNull: true },
    total_price: { type: 'decimal(12,2)', notNull: true },
  });

  pgm.createIndex('order_items', 'order_id');
  pgm.createIndex('order_items', 'product_id');

  // Order status history table (audit trail)
  pgm.createTable('order_status_history', {
    id: 'id',
    order_id: {
      type: 'integer',
      notNull: true,
      references: 'orders',
      onDelete: 'CASCADE',
    },
    old_status: { type: 'varchar(50)' },
    new_status: { type: 'varchar(50)', notNull: true },
    changed_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    changed_by: { type: 'varchar(255)' }, // Asgardeo sub or email
    notes: { type: 'text' },
  });

  pgm.createIndex('order_status_history', 'order_id');
  pgm.createIndex('order_status_history', 'changed_at');

  // Update timestamp trigger function
  pgm.createFunction(
    'update_updated_at_column',
    [],
    { returns: 'trigger', language: 'plpgsql', replace: true },
    `
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    `
  );

  // Add trigger for updated_at
  pgm.createTrigger('orders', 'update_orders_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW',
  });

  // Comments
  pgm.sql("COMMENT ON TABLE order_status_history IS 'Tracks all status changes for orders'");
};

exports.down = (pgm) => {
  pgm.dropTrigger('orders', 'update_orders_updated_at', { ifExists: true });
  pgm.dropFunction('update_updated_at_column', [], { ifExists: true });
  pgm.dropTable('order_status_history', { ifExists: true });
  pgm.dropTable('order_items', { ifExists: true });
  pgm.dropTable('orders', { ifExists: true });
};
