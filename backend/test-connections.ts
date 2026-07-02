// scripts/testMongoDB.ts
import "dotenv/config";
import mongoose from "mongoose";

/**
 * Test MongoDB connection and display database statistics
 */
async function testMongoDB(): Promise<void> {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    console.log("🔍 Connecting to MongoDB...");
    
    await mongoose.connect(mongoURI);

    console.log("✅ Connected to MongoDB");

    // Test the connection by getting database stats
    const db = mongoose.connection.db;
    if (db) {
      const stats = await db.stats();
      console.log("\n📊 Database Statistics:");
      console.log(`   Database: ${stats.db}`);
      console.log(`   Collections: ${stats.collections}`);
      console.log(`   Documents: ${stats.objects}`);
      console.log(`   Avg Document Size: ${(stats.avgObjSize / 1024).toFixed(2)} KB`);
      console.log(`   Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Indexes: ${stats.indexes}`);
      console.log(`   Index Size: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    }

    // Close the connection
    await mongoose.connection.close();
    console.log("\n✅ Connection closed successfully");

  } catch (error: any) {
    console.error("❌ MongoDB connection failed:", error.message);
    
    // Additional error details for debugging
    if (error.message.includes("Authentication failed")) {
      console.error("💡 Check your username and password in MONGODB_URI");
    } else if (error.message.includes("ENOTFOUND") || error.message.includes("getaddrinfo")) {
      console.error("💡 Check your cluster address in MONGODB_URI");
    } else if (error.message.includes("timed out")) {
      console.error("💡 Check your network connection or IP whitelist");
    } else if (error.message.includes("MongoServerSelectionError")) {
      console.error("💡 Make sure your cluster is running and not paused");
    } else if (error.message.includes("bad auth")) {
      console.error("💡 Invalid credentials. Check your database username and password");
    }
    
    process.exit(1);
  }
}

// Run the test
testMongoDB();
