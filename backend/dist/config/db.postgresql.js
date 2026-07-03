import prisma from './prisma.js';
export const connectPostgreSQL = async () => {
    try {
        await prisma.$connect();
        console.log('✅ PostgreSQL (Prisma) connected successfully');
    }
    catch (error) {
        console.error('❌ PostgreSQL connection error:', error.message);
        throw error;
    }
};
export const disconnectPostgreSQL = async () => {
    try {
        await prisma.$disconnect();
        console.log('📴 PostgreSQL (Prisma) connection closed');
    }
    catch (error) {
        console.error('❌ PostgreSQL disconnection error:', error.message);
    }
};
