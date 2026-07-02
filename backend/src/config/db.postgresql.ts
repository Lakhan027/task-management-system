import mongoose from 'mongoose';
import prisma from './prisma.js';
import { connectMongoDB } from './db.mongodb.js';

export const connectDB = async (): Promise<void> => {
  // Connect to MongoDB
  await connectMongoDB();
  
  // Connect to PostgreSQL via Prisma
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL (Prisma) connected successfully');
  } catch (error: any) {
    console.error('❌ PostgreSQL connection error:', error.message);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('📴 MongoDB connection closed');
  } catch (error: any) {
    console.error('❌ MongoDB disconnection error:', error.message);
  }

  try {
    await prisma.$disconnect();
    console.log('📴 PostgreSQL (Prisma) connection closed');
  } catch (error: any) {
    console.error('❌ PostgreSQL disconnection error:', error.message);
  }
};
