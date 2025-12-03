/**
 * Unit Tests for Order Controller
 * Tests HTTP request/response handling
 */

// Mock dependencies before requiring controller
jest.mock('../../src/models/order.model');
jest.mock('../../src/models/orderItem.model');
jest.mock('../../src/services/order.service');
jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

const OrderController = require('../../src/controllers/order.controller');
const Order = require('../../src/models/order.model');
const OrderService = require('../../src/services/order.service');

describe('OrderController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      params: {},
      query: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('createOrder', () => {
    it('should return 400 if no items provided', async () => {
      mockReq.body = {
        customer_id: 1,
        shipping_address: '123 Test St',
        items: []
      };

      await OrderController.createOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Order must contain at least one item'
      });
    });

    it('should return 400 if items is undefined', async () => {
      mockReq.body = {
        customer_id: 1,
        shipping_address: '123 Test St'
      };

      await OrderController.createOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should create order successfully with valid data', async () => {
      const mockOrder = {
        id: 1,
        order_number: 'ORD-123',
        customer_id: 1,
        total_amount: 50.00
      };

      const mockItems = [
        { id: 1, product_id: 1, quantity: 2, unit_price: 25.00 }
      ];

      const mockTotals = { subtotal: 50.00, total: 50.00, itemCount: 1 };

      OrderService.createOrder.mockResolvedValue({
        order: mockOrder,
        items: mockItems,
        totals: mockTotals
      });

      mockReq.body = {
        customer_id: 1,
        shipping_address: '123 Test St',
        payment_method: 'credit_card',
        items: [{ product_id: 1, quantity: 2 }]
      };

      await OrderController.createOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Order created successfully',
        data: expect.objectContaining({
          id: 1,
          order_number: 'ORD-123'
        })
      });
    });

    it('should return 500 on service error', async () => {
      OrderService.createOrder.mockRejectedValue(new Error('Database error'));

      mockReq.body = {
        customer_id: 1,
        items: [{ product_id: 1, quantity: 2 }]
      };

      await OrderController.createOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Database error'
        })
      );
    });
  });

  describe('getOrderById', () => {
    it('should return order when found', async () => {
      const mockOrder = {
        id: 1,
        order_number: 'ORD-123',
        status: 'pending'
      };

      Order.findById.mockResolvedValue(mockOrder);
      mockReq.params.id = '1';

      await OrderController.getOrderById(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrder
      });
    });

    it('should return 404 when order not found', async () => {
      Order.findById.mockResolvedValue(null);
      mockReq.params.id = '999';

      await OrderController.getOrderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Order not found'
      });
    });
  });

  describe('updateOrderStatus', () => {
    it('should reject invalid status', async () => {
      mockReq.params.id = '1';
      mockReq.body.status = 'invalid_status';

      await OrderController.updateOrderStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Invalid status')
        })
      );
    });

    it('should accept valid status and update order', async () => {
      const mockOrder = { id: 1, status: 'confirmed' };
      OrderService.updateOrderStatus.mockResolvedValue(mockOrder);

      mockReq.params.id = '1';
      mockReq.body.status = 'confirmed';

      await OrderController.updateOrderStatus(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Order status updated successfully',
        data: mockOrder
      });
    });
  });
});
