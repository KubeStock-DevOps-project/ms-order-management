/**
 * Integration Tests for Order API
 * Tests the full HTTP request/response cycle with real database
 */

// Set test environment first
process.env.NODE_ENV = 'test';
process.env.PORT = '3999';

// Parse DATABASE_URL if provided (for CI)
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  process.env.DB_HOST = url.hostname;
  process.env.DB_PORT = url.port;
  process.env.DB_NAME = url.pathname.slice(1);
  process.env.DB_USER = url.username;
  process.env.DB_PASSWORD = url.password;
} else {
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.DB_PORT || '5432';
  process.env.DB_NAME = process.env.DB_NAME || 'order_db';
  process.env.DB_USER = process.env.DB_USER || 'postgres';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
}

const http = require('http');
const db = require('../../src/config/database');

// Simple HTTP request helper
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3999,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

describe('Order API Integration Tests', () => {
  let server;

  beforeAll(async () => {
    // Create the Express app and start server
    const express = require('express');
    const app = express();
    
    app.use(express.json());
    
    // Import routes directly for testing
    const orderRoutes = require('../../src/routes/order.routes');
    app.use('/api/orders', orderRoutes);
    
    // Error handler
    app.use((err, req, res, next) => {
      res.status(500).json({ success: false, message: err.message });
    });

    server = app.listen(3999);
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 500));
  }, 10000);

  afterAll(async () => {
    // Close server and database connections
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await db.pool.end();
  }, 10000);

  describe('GET /api/orders', () => {
    it('should return list of orders with success response', async () => {
      const response = await makeRequest({
        method: 'GET',
        path: '/api/orders'
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('count');
    });

    it('should accept status filter parameter', async () => {
      const response = await makeRequest({
        method: 'GET',
        path: '/api/orders?status=pending'
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return 404 for non-existent order', async () => {
      const response = await makeRequest({
        method: 'GET',
        path: '/api/orders/99999'
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Order not found');
    });
  });

  describe('GET /api/orders/stats', () => {
    it('should return order statistics with required fields', async () => {
      const response = await makeRequest({
        method: 'GET',
        path: '/api/orders/stats'
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('pending');
      expect(response.body.data).toHaveProperty('processing');
      expect(response.body.data).toHaveProperty('shipped');
      expect(response.body.data).toHaveProperty('delivered');
      expect(response.body.data).toHaveProperty('cancelled');
      expect(response.body.data).toHaveProperty('totalRevenue');
    });
  });
});
