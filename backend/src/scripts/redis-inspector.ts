// Run: npx tsx src/scripts/redis-inspector.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { connectRedis, disconnectRedis, redisHelpers } from '../config/redis.js';

async function inspectRedis(label?: string) {
  if (label) console.log(`\n${'='.repeat(60)}\n📌 ${label}\n${'='.repeat(60)}`);

  await connectRedis();

  const allKeys = await redisHelpers.keys('*');

  if (allKeys.length === 0) {
    console.log('🔴 Redis is empty — no keys found.\n');
    await disconnectRedis();
    return;
  }

  console.log(`📊 Total keys: ${allKeys.length}\n`);

  for (const key of allKeys.sort()) {
    const type = await redisHelpers.getType(key);
    const ttl = await redisHelpers.getTTL(key);
    const value = await redisHelpers.get(key);

    const category = key.startsWith('rate_limit') ? '🚦 RATE LIMIT' :
                     key.startsWith('user:') && key.endsWith(':profile') ? '👤 USER PROFILE (cached)' :
                     key.startsWith('blacklist') ? '⛔ BLACKLISTED TOKEN' :
                     key.startsWith('tasks:') ? '📋 TASK CACHE' :
                     key.startsWith('project:') ? '📁 PROJECT CACHE' :
                     key.startsWith('session') ? '🔐 SESSION' :
                     '❓ OTHER';

    console.log(`  ${category}`);
    console.log(`    Key:   ${key}`);
    console.log(`    Type:  ${type}`);
    console.log(`    TTL:   ${ttl === -1 ? 'no expiry' : `${ttl}s remaining`}`);
    console.log(`    Value: ${JSON.stringify(value, null, 2).substring(0, 200)}`);
    console.log('');
  }

  await disconnectRedis();
}

// Run
const label = process.argv[2] || 'Redis State';
inspectRedis(label);
