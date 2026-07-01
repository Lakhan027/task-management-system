import express from "express";
import prisma from "./config/prisma.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();


// Middleware
app.use(express.json());

console.log("📌 Process ID:", process.pid);
console.log("📌 Environment:", process.env.NODE_ENV || 'development');

// ═══════════════════════════════════════════════════════════
// DATABASE CONNECTION FUNCTION
// ═══════════════════════════════════════════════════════════

async function connectDB() {
    try {
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║       🔄 CONNECTING TO DATABASE           ║');
        console.log('╚════════════════════════════════════════════╝');
        
        // Check if DATABASE_URL exists
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL is not defined in .env file');
        }
        
        // Mask password for logging
        const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@');
        console.log(`📊 Using Database: ${maskedUrl}`);
        
        await prisma.$connect();
        
        const result = await prisma.$queryRaw`SELECT NOW() as time`;
        
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║       ✅ DATABASE CONNECTED               ║');
        console.log('╚════════════════════════════════════════════╝');
        console.log(`📊 Type: PostgreSQL`);
        console.log(`⏰ Server Time: ${result[0].time}`);
        console.log('────────────────────────────────────────────\n');
        
        return true;
        
    } catch (error) {
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║       ❌ DATABASE CONNECTION FAILED       ║');
        console.log('╚════════════════════════════════════════════╝');
        console.error(`📛 Error: ${error.message}`);
        console.error('\n💡 Troubleshooting Tips:');
        console.error('   1️⃣ Check if PostgreSQL is running');
        console.error('   2️⃣ Verify DATABASE_URL in .env file');
        console.error('   3️⃣ Run: npx prisma generate');
        console.error('   4️⃣ Run: npx prisma migrate dev');
        console.error('────────────────────────────────────────────\n');
        
        process.exit(1);
    }
}

// ═══════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════

// Home route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: "Task Management API is Running"
    });
});

// Login API
app.post('/login', (req, res) => {
    console.log('📝 Login Request:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required"
        });
    }

    res.status(200).json({
        success: true,
        message: "Login API is working",
        data: { email, password }
    });
});

// Register API
app.post('/register', (req, res) => {
    console.log('📝 Register Request:', req.body);
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Name, email and password are required"
        });
    }

    res.status(200).json({
        success: true,
        message: "Register API is working",
        data: { name, email, password }
    });
});

// Tasks API
app.get('/tasks', (req, res) => {
    res.status(200).json({
        success: true,
        message: "Task API is working",
        data: [
            { id: 1, title: "Learn HTTP" },
            { id: 2, title: "Learn REST API" }
        ]
    });
});

// ═══════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════

const PORT = process.env.PORT || 5000;

async function startServer() {
    await connectDB();
    
    app.listen(PORT, () => {
        console.log('╔════════════════════════════════════════════╗');
        console.log('║       🚀 SERVER STARTED SUCCESSFULLY      ║');
        console.log('╚════════════════════════════════════════════╝');
        console.log(`🌐 URL: http://localhost:${PORT}`);
        console.log(`📖 Health: http://localhost:${PORT}/`);
        console.log(`🔑 Login: POST http://localhost:${PORT}/login`);
        console.log(`📝 Register: POST http://localhost:${PORT}/register`);
        console.log(`📋 Tasks: GET http://localhost:${PORT}/tasks`);
        console.log('────────────────────────────────────────────\n');
    });
}

// Start the server
startServer();

// ═══════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════

// Handle Ctrl+C
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down...');
    await prisma.$disconnect();
    console.log('📴 Database disconnected');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
    console.error('💀 Uncaught Exception:', error);
    await prisma.$disconnect();
    process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', async (error) => {
    console.error('💀 Unhandled Rejection:', error);
    await prisma.$disconnect();
    process.exit(1);
});

// ✅ Export for testing purposes (optional)
export { app, prisma };