// Run: npx tsx src/scripts/redis-flush.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { connectRedis, disconnectRedis, redisHelpers } from '../config/redis.js';

async function flushAndShow() {
  await connectRedis();
  
  console.log('🗑️  Flushing all Redis data...');
  await redisHelpers.flushAll();
  
  const keys = await redisHelpers.keys('*');
  console.log(`Keys after flush: ${keys.length}\n`);
  
  await disconnectRedis();
}

flushAndShow();
