/**
 * Unit Tests for Order Service
 * Tests business logic in isolation with mocked dependencies
 */

const OrderService = require('../../src/services/order.service');

// Mock dependencies
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

jest.mock('axios');

const db = require('../../src/config/database');
const axios = require('axios');

describe('OrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateOrderTotals', () => {
    it('should calculate correct totals for single item', () => {
      const items = [
        { product_id: 1, quantity: 2, unit_price: 10.00 }
      ];

      const totals = OrderService.calculateOrderTotals(items);

      expect(totals.subtotal).toBe(20.00);
      expect(totals.tax).toBe(2.00); // 10% tax
      expect(totals.shipping).toBe(10.00); // Under $100
      expect(totals.total).toBe(32.00);
      expect(totals.itemCount).toBeUndefined(); // Not in implementation
    });

    it('should calculate correct totals for multiple items', () => {
      const items = [
        { product_id: 1, quantity: 2, unit_price: 10.00 },
        { product_id: 2, quantity: 3, unit_price: 15.50 }
      ];

      const totals = OrderService.calculateOrderTotals(items);

      expect(totals.subtotal).toBe(66.50);
      expect(totals.tax).toBe(6.65); // 10% tax
      expect(totals.shipping).toBe(10.00); // Under $100
      expect(totals.total).toBe(83.15);
    });

    it('should return zero totals for empty items array', () => {
      const items = [];

      const totals = OrderService.calculateOrderTotals(items);

      expect(totals.subtotal).toBe(0);
      expect(totals.total).toBe(10); // Just shipping fee
    });

    it('should apply free shipping for orders over $100', () => {
      const items = [
        { product_id: 1, quantity: 5, unit_price: 25.00 } // $125 subtotal
      ];

      const totals = OrderService.calculateOrderTotals(items);

      expect(totals.subtotal).toBe(125.00);
      expect(totals.shipping).toBe(0); // Free shipping
      expect(totals.tax).toBe(12.50);
      expect(totals.total).toBe(137.50);
    });

    it('should handle decimal prices correctly', () => {
      const items = [
        { product_id: 1, quantity: 3, unit_price: 9.99 }
      ];

      const totals = OrderService.calculateOrderTotals(items);

      expect(totals.subtotal).toBeCloseTo(29.97, 2);
    });
  });

  describe('validateAndEnrichItems', () => {
    it('should enrich items with product data from product service', async () => {
      const mockProduct = {
        id: 1,
        sku: 'PROD-001',
        name: 'Test Product',
        unit_price: 25.00,
        is_active: true
      };

      axios.get.mockResolvedValue({ data: mockProduct });

      const items = [{ product_id: 1, quantity: 2 }];
      const enrichedItems = await OrderService.validateAndEnrichItems(items);

      expect(enrichedItems).toHaveLength(1);
      expect(enrichedItems[0].sku).toBe('PROD-001');
      expect(enrichedItems[0].product_name).toBe('Test Product');
      expect(enrichedItems[0].unit_price).toBe(25.00);
    });

    it('should throw error for inactive product', async () => {
      const mockProduct = {
        id: 1,
        sku: 'PROD-001',
        name: 'Inactive Product',
        is_active: false
      };

      axios.get.mockResolvedValue({ data: mockProduct });

      const items = [{ product_id: 1, quantity: 2 }];

      await expect(OrderService.validateAndEnrichItems(items))
        .rejects.toThrow('not available for sale');
    });

    it('should use provided item data over product defaults', async () => {
      const mockProduct = {
        id: 1,
        sku: 'PROD-001',
        name: 'Test Product',
        unit_price: 25.00,
        is_active: true
      };

      axios.get.mockResolvedValue({ data: mockProduct });

      const items = [{ 
        product_id: 1, 
        quantity: 2,
        sku: 'CUSTOM-SKU',
        product_name: 'Custom Name',
        unit_price: 30.00
      }];

      const enrichedItems = await OrderService.validateAndEnrichItems(items);

      expect(enrichedItems[0].sku).toBe('CUSTOM-SKU');
      expect(enrichedItems[0].product_name).toBe('Custom Name');
      expect(enrichedItems[0].unit_price).toBe(30.00);
    });
  });

  describe('checkStockAvailability', () => {
    it('should return allAvailable true when all items have stock', async () => {
      axios.post.mockResolvedValue({
        data: {
          allAvailable: true,
          items: [
            { product_id: 1, available: true, availableQuantity: 100 }
          ]
        }
      });

      const items = [{ product_id: 1, sku: 'SKU-001', quantity: 5 }];
      const result = await OrderService.checkStockAvailability(items);

      expect(result.allAvailable).toBe(true);
    });

    it('should return allAvailable false when stock is insufficient', async () => {
      axios.post.mockResolvedValue({
        data: {
          allAvailable: false,
          items: [
            { product_id: 1, available: false, availableQuantity: 2 }
          ],
          unavailableItems: [{ product_id: 1, requested: 5, available: 2 }]
        }
      });

      const items = [{ product_id: 1, sku: 'SKU-001', quantity: 5 }];
      const result = await OrderService.checkStockAvailability(items);

      expect(result.allAvailable).toBe(false);
      expect(result.unavailableItems).toBeDefined();
    });
  });
});
