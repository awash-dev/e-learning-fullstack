import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const DATABASE_URL = "postgresql://neondb_owner:npg_pICQT7kF9Ocd@ep-patient-pine-adh0aigy-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

// Enhanced connection configuration for Neon
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 10000, // How long to wait for a connection
  maxUses: 7500, // Close a client after it has been used this many times (prevents memory leaks)
});

// Connection event handlers
pool.on('connect', () => {
  console.log('🔌 New client connected to PostgreSQL');
});

pool.on('error', (err, client) => {
  console.error('❌ Database pool error:', err);
});

pool.on('remove', () => {
  console.log('🔌 Client removed from pool');
});

// Enhanced connectDB function with better error handling
export const connectDB = async () => {
  let client;
  try {
    console.log('🔄 Attempting to connect to Neon PostgreSQL...');
    
    client = await pool.connect();
    
    // Test connection with a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Successfully connected to Neon PostgreSQL');
    console.log('📊 Database time:', result.rows[0].current_time);
    console.log('🗄️ PostgreSQL version:', result.rows[0].version.split(',')[0]);
    
    // Test schema access
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log(`📋 Found ${tables.rows.length} tables in database`);
    
    client.release();
    return pool;
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    console.error('   Detail:', error.detail);
    
    if (client) {
      client.release();
    }
    
    // Don't exit in development to allow for hot reloading
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log('🔄 Continuing in development mode...');
      return pool; // Return pool anyway for development
    }
  }
};

// Health check function
export const checkDatabaseHealth = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1 as health_check');
    client.release();
    return { healthy: true, message: 'Database is connected and responsive' };
  } catch (error) {
    return { 
      healthy: false, 
      message: `Database health check failed: ${error.message}` 
    };
  }
};

// Graceful shutdown function
export const closeDatabase = async () => {
  try {
    console.log('🔄 Closing database connections...');
    await pool.end();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
};

// Initialize Drizzle ORM
export const db = drizzle(pool, { 
  schema,
  logger: process.env.NODE_ENV === 'development' // Enable query logging in development
});

export { pool };