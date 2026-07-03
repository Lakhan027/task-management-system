import app, { prisma } from './app.js';
import { connectDB, disconnectDB } from './config/database.js';
import { getPort, getEnv } from './utils/helpers.js';
const PORT = getPort();
const ENV = getEnv();
// START SERVER
const startServer = async () => {
    try {
        // Connect to both databases
        await connectDB();
        // ✅ MongoDB is already connected in app.ts
        // Start server
        const server = app.listen(PORT, () => {
            console.log("🚀 SERVER STARTED SUCCESSFULLY ");
            console.log(`🌐 URL: http://localhost:${PORT}`);
            console.log(`📖 Health: http://localhost:${PORT}/api`);
            console.log(`🔑 Auth: http://localhost:${PORT}/api/auth`);
            console.log(`👤 Users: http://localhost:${PORT}/api/users`);
            console.log(`📋 Tasks: http://localhost:${PORT}/api/tasks`);
            console.log(`🔧 Environment: ${ENV}`);
            console.log(`📊 Process ID: ${process.pid}`);
            console.log('────────────────────────────────────────────\n');
        });
        // ─────────────────────────────────────────────────────────────
        // GRACEFUL SHUTDOWN
        // ─────────────────────────────────────────────────────────────
        const shutdown = async () => {
            console.log('\n🛑 Received shutdown signal...');
            // Close server
            server.close(async () => {
                console.log('📴 HTTP server closed');
                // Disconnect both databases
                await disconnectDB();
                process.exit(0);
            });
            // Force close after timeout
            setTimeout(() => {
                console.warn('⚠️ Force closing after timeout');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        // Handle uncaught errors
        process.on('uncaughtException', async (error) => {
            console.error('💀 Uncaught Exception:', error);
            await disconnectDB();
            process.exit(1);
        });
        process.on('unhandledRejection', async (error) => {
            console.error('💀 Unhandled Rejection:', error);
            await disconnectDB();
            process.exit(1);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error.message);
        await disconnectDB();
        process.exit(1);
    }
};
// ─────────────────────────────────────────────────────────────
// START APPLICATION
// ─────────────────────────────────────────────────────────────
startServer();
// ─────────────────────────────────────────────────────────────
// EXPORTS (for testing)
// ─────────────────────────────────────────────────────────────
export { app, prisma };
