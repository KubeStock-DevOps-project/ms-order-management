/**
 * Unit Tests for Order Model
 * Tests database operations with mocked database
 */

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  pool: { connect: jest.fn() }
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

const Order = require('../../src/models/order.model');
const db = require('../../src/config/database');

describe('Order Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create order with generated order number', async () => {
      const mockOrder = {
        id: 1,
        order_number: 'ORD-1234567890-ABC123',
        customer_id: 1,
        total_amount: 100.00,
        status: 'pending'
      };

      db.query.mockResolvedValue({ rows: [mockOrder] });

      const orderData = {
        customer_id: 1,
        shipping_address: '123 Test St',
        total_amount: 100.00,
        payment_method: 'credit_card'
      };

      const result = await Order.create(orderData);

      expect(result).toEqual(mockOrder);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO orders'),
        expect.any(Array)
      );
    });

    it('should throw error on database failure', async () => {
      db.query.mockRejectedValue(new Error('Connection failed'));

      const orderData = {
        customer_id: 1,
        total_amount: 100.00
      };

      await expect(Order.create(orderData)).rejects.toThrow('Connection failed');
    });
  });

  describe('findById', () => {
    it('should return order with items when found', async () => {
      const mockOrder = {
        id: 1,
        order_number: 'ORD-123',
        items: [{ id: 1, product_name: 'Test Product' }]
      };

      db.query.mockResolvedValue({ rows: [mockOrder] });

      const result = await Order.findById(1);

      expect(result).toEqual(mockOrder);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT o.*'),
        [1]
      );
    });

    it('should return undefined when order not found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await Order.findById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should return all orders without filters', async () => {
      const mockOrders = [
        { id: 1, order_number: 'ORD-001' },
        { id: 2, order_number: 'ORD-002' }
      ];

      db.query.mockResolvedValue({ rows: mockOrders });

      const result = await Order.findAll();

      expect(result).toHaveLength(2);
    });

    it('should apply status filter', async () => {
      const mockOrders = [{ id: 1, status: 'pending' }];
      db.query.mockResolvedValue({ rows: mockOrders });

      await Order.findAll({ status: 'pending' });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        expect.arrayContaining(['pending'])
      );
    });

    it('should apply customer_id filter', async () => {
      const mockOrders = [{ id: 1, customer_id: 5 }];
      db.query.mockResolvedValue({ rows: mockOrders });

      await Order.findAll({ customer_id: 5 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('customer_id = $1'),
        expect.arrayContaining([5])
      );
    });
  });

  describe('update', () => {
    it('should update allowed fields', async () => {
      const mockOrder = { id: 1, status: 'shipped' };
      db.query.mockResolvedValue({ rows: [mockOrder] });

      const result = await Order.update(1, { status: 'shipped' });

      expect(result.status).toBe('shipped');
    });

    it('should throw error when no valid fields provided', async () => {
      await expect(Order.update(1, { invalid_field: 'value' }))
        .rejects.toThrow('No valid fields to update');
    });

    it('should return null when order not found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await Order.update(999, { status: 'shipped' });

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update order status', async () => {
      const mockOrder = { id: 1, status: 'confirmed' };
      db.query.mockResolvedValue({ rows: [mockOrder] });

      const result = await Order.updateStatus(1, 'confirmed');

      expect(result.status).toBe('confirmed');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orders'),
        ['confirmed', 1]
      );
    });
  });
});
