import { connectPostgreSQL, disconnectPostgreSQL } from './db.postgresql.js';
import { connectMongoDB, disconnectMongoDB } from './db.mongodb.js';
import { connectRedis, disconnectRedis } from './redis.js'; 

/**
 * Connect to both PostgreSQL and MongoDB
 */
export const connectDB = async (): Promise<void> => {
  try {
    // Connect PostgreSQL
    await connectPostgreSQL();
    
    // Connect MongoDB
    await connectMongoDB();

    // Connect Redis (optional)
    await connectRedis();
    
    console.log('✅ All databases connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

/**
 * Disconnect from both databases
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    await disconnectPostgreSQL();
    await disconnectMongoDB();
    await disconnectRedis();
    console.log('✅ All databases disconnected successfully');
  } catch (error) {
    console.error('❌ Error disconnecting databases:', error);
  }
};