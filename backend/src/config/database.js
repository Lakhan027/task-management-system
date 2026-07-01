// src/config/database.js
import prisma from './prisma.js';

/**
 * Connect to database with retry logic
 */
export const connectDB = async (retries = 3, delay = 2000) => {
  let attempt = 0;

  while (attempt < retries) {
    try {
      console.log(`\n📊 Connecting to database (attempt ${attempt + 1}/${retries})...`);

      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not defined in .env file');
      }

      await prisma.$connect();

      // Test query
      const result = await prisma.$queryRaw`SELECT NOW() as time`;

      console.log('✅ Database connected successfully!');
      console.log(`⏰ Server Time: ${result[0].time}`);
      console.log('────────────────────────────────────────────\n');

      return true;
    } catch (error) {
      attempt++;
      console.error(`❌ Connection attempt ${attempt} failed:`, error.message);

      if (attempt < retries) {
        console.log(`⏳ Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.log('\n❌ All connection attempts failed!');
        console.error('\n💡 Troubleshooting Tips:');
        console.error('  1️⃣ Check if database is running');
        console.error('  2️⃣ Verify DATABASE_URL in .env file');
        console.error('  3️⃣ Run: npx prisma generate');
        console.error('  4️⃣ Run: npx prisma db push');
        console.error('────────────────────────────────────────────\n');
        throw error;
      }
    }
  }
};

/**
 * Disconnect from database
 */
export const disconnectDB = async () => {
  try {
    await prisma.$disconnect();
    console.log('📴 Database disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting:', error.message);
  }
};

/**
 * Check database health
 */
export const healthCheck = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

export default { connectDB, disconnectDB, healthCheck };