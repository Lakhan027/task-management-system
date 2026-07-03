import { connectPostgreSQL, disconnectPostgreSQL } from './db.postgresql.js';
import { connectMongoDB, disconnectMongoDB } from './db.mongodb.js';
/**
 * Connect to both PostgreSQL and MongoDB
 */
export const connectDB = async () => {
    try {
        // Connect PostgreSQL
        await connectPostgreSQL();
        // Connect MongoDB
        await connectMongoDB();
        console.log('✅ All databases connected successfully');
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
};
/**
 * Disconnect from both databases
 */
export const disconnectDB = async () => {
    try {
        await disconnectPostgreSQL();
        await disconnectMongoDB();
        console.log('✅ All databases disconnected successfully');
    }
    catch (error) {
        console.error('❌ Error disconnecting databases:', error);
    }
};
