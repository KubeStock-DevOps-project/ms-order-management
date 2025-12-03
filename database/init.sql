-- =============================================================================
-- KubeStock - Order Service
-- Database Initialization Script
-- =============================================================================
-- This script runs on first container startup to initialize the database.
-- Schema is managed by node-pg-migrate (runs on app startup).
-- =============================================================================

-- Ensure we're connected to the right database
\c order_db;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE order_db TO postgres;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'Order database initialized successfully';
  RAISE NOTICE 'Schema will be applied via node-pg-migrate on service startup';
END $$;
