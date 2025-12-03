/**
 * Migration Runner Utility
 * Runs node-pg-migrate migrations programmatically on service startup
 */
const { default: migrate } = require('node-pg-migrate');
const path = require('path');

/**
 * Run migrations automatically on startup
 * @param {Object} dbConfig - Database configuration
 * @param {Object} logger - Logger instance
 * @returns {Promise<void>}
 */
async function runMigrations(dbConfig, logger) {
  // Migrations folder is at service root level (../../migrations from src/config)
  const migrationsDir = path.join(__dirname, '../../migrations');
  
  logger.info('Running database migrations...');
  
  try {
    await migrate({
      databaseUrl: {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
      },
      migrationsTable: 'pgmigrations',
      dir: migrationsDir,
      direction: 'up',
      log: (msg) => logger.debug(`Migration: ${msg}`),
      logger: {
        info: (msg) => logger.info(msg),
        warn: (msg) => logger.warn(msg),
        error: (msg) => logger.error(msg),
      },
    });
    
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error.message);
    throw error;
  }
}

module.exports = { runMigrations };
