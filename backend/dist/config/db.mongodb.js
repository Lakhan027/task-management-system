// config/db.mongodb.ts
import mongoose from "mongoose";
import "dotenv/config";
const connectMongoDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        if (!mongoURI) {
            throw new Error("MONGODB_URI is not defined in environment variables");
        }
        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB connected successfully');
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });
        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected');
        });
    }
    catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        setTimeout(connectMongoDB, 5000);
    }
};
export { connectMongoDB };
