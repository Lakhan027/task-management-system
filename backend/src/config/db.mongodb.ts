import mongoose from 'mongoose';

let isConnected = false;

export const connectMongoDB = async (): Promise<void> => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env file');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      // ✅ Force TLS 1.2 and disable problematic SSL options
      tls: true,
      tlsAllowInvalidCertificates: process.env.NODE_ENV === 'development',
      tlsAllowInvalidHostnames: process.env.NODE_ENV === 'development',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log('✅ MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
      isConnected = false;
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    isConnected = false;
    setTimeout(connectMongoDB, 5000);
  }
};


// ✅ MUST HAVE THIS EXPORT
export const disconnectMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    isConnected = false;
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting MongoDB:', error);
  }
};
