// // ═══════════════════════════════════════════════════════════════
// // 🎓 TEST — tumhare khud likhe sessionService.ts ko chalata hai
// //    (yehi kahani jo demo me thi — laptop + phone — ab tumhare
// //    apne addSession/removeSession/getAllSessionTokens se)
// //
// //    chalao:  npx tsx session-service-test.mjs
// // ═══════════════════════════════════════════════════════════════

// import 'dotenv/config';
// import { connectRedis, disconnectRedis, getRedis } from './src/config/redis.js';
// import { addSession, removeSession, getAllSessionTokens } from './src/services/sessionService.js';

// const TEST_USER_ID = 999999; // fake user, real data se clash nahi hoga

// const show = async (label) => {
//   const client = getRedis();
//   const data = await client.hGetAll(`session:${TEST_USER_ID}`);
//   console.log(`\n📦 ${label}`);
//   console.log('  ', Object.keys(data).length === 0 ? '(khaali)' : data);
// };

// async function main() {
//   await connectRedis();
//   await getRedis().del(`session:${TEST_USER_ID}`); // saaf shuruat

//   await show('STEP 0 — shuru me');

//   console.log('\n➡️  addSession(999999, "token_LAPTOP", 604800)');
//   await addSession(TEST_USER_ID, 'token_LAPTOP', 604800);
//   await show('STEP 1 — laptop se login ke baad');

//   console.log('\n➡️  addSession(999999, "token_PHONE", 604800)');
//   await addSession(TEST_USER_ID, 'token_PHONE', 604800);
//   await show('STEP 2 — phone se BHI login ke baad');

//   console.log('\n➡️  removeSession(999999, "token_LAPTOP")');
//   await removeSession(TEST_USER_ID, 'token_LAPTOP');
//   await show('STEP 3 — sirf laptop logout, phone bachna chahiye');

//   console.log('\n➡️  getAllSessionTokens(999999)');
//   const tokens = await getAllSessionTokens(TEST_USER_ID);
//   console.log('   mila:', tokens);

//   await show('STEP 4 — logoutAll ke baad, locker khaali hona chahiye');

//   await disconnectRedis();
// }

// main().catch((err) => {
//   console.error('❌', err.message);
//   process.exit(1);
// });



import 'dotenv/config';
import { connectRedis, disconnectRedis, getRedis } from './src/config/redis.js';
import { addSession } from './src/services/sessionService.js';

async function testTTL() {
  await connectRedis();                          // 1. IMPORT + connect
  const client = getRedis();
  const key = 'session:999999';

  await client.del(key);                          // 2. CLEAN

  await addSession(999999, 'token_TEST', 604800);  // 3. CALL

  const ttl = await client.ttl(key);               // 4. CHECK

  // 5. COMPARE
  if (ttl > 0) {
    console.log('✅ PASS — TTL laga hai:', ttl);
  } else {
    console.log('❌ FAIL — TTL nahi laga, mila:', ttl);
  }

  await client.del(key);                           // cleanup
  await disconnectRedis();
}

testTTL();