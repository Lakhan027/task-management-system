export const validateEnvironment = (): void => {
  const required = ['DATABASE_URL', 'MONGODB_URI', 'JWT_SECRET'];
  const missing: string[] = [];

  required.forEach((key) => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }

  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET!.length < 32) {
    console.warn('⚠️ JWT_SECRET should be at least 32 characters long');
  }

  // Validate DATABASE_URL format
  if (!process.env.DATABASE_URL!.startsWith('postgresql://')) {
    console.error('❌ DATABASE_URL must start with postgresql://');
    process.exit(1);
  }

  console.log('✅ Environment validated');
};