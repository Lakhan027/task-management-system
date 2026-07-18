import { connectPostgreSQL, disconnectPostgreSQL } from './db.postgresql.js';
import { connectMongoDB, disconnectMongoDB } from './db.mongodb.js';
import { connectRedis, disconnectRedis } from './redis.js';
/**
 * Connect to both PostgreSQL and MongoDB
 */
export const connectDB = async () => {
    const errors = [];
    try {
        await connectPostgreSQL();
        console.log('✅ PostgreSQL connected');
    }
    catch (error) {
        errors.push(`PostgreSQL: ${error.message}`);
    }
    try {
        await connectMongoDB();
        console.log('✅ MongoDB connected');
    }
    catch (error) {
        errors.push(`MongoDB: ${error.message}`);
    }
    try {
        await connectRedis();
        console.log('✅ Redis connected');
    }
    catch (error) {
        console.warn('⚠️ Redis not available');
    }
    if (errors.length > 0) {
        console.error('❌ Some databases failed to connect:', errors);
        // In production, you might want to exit if PostgreSQL fails
        if (errors.some(e => e.includes('PostgreSQL'))) {
            throw new Error('PostgreSQL connection failed');
        }
    }
    else {
        console.log('✅ All databases connected successfully');
    }
};
/**
 * Disconnect from both databases
 */
export const disconnectDB = async () => {
    try {
        await disconnectPostgreSQL();
        await disconnectMongoDB();
        await disconnectRedis();
        console.log('✅ All databases disconnected successfully');
    }
    catch (error) {
        console.error('❌ Error disconnecting databases:', error);
    }
};
