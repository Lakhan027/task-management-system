import prisma from './prisma.js';

export const connectPostgreSQL = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL (Prisma) connected successfully');
  } catch (error: any) {
    console.error('❌ PostgreSQL connection error:', error.message);
    throw error;
  }
};

export const disconnectPostgreSQL = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('📴 PostgreSQL (Prisma) connection closed');
  } catch (error: any) {
    console.error('❌ PostgreSQL disconnection error:', error.message);
  }
};