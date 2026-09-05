// ═══════════════════════════════════════════════════════════════
// 🎓 REDIS HASH DEMO — "Vikas do devices se login karta hai" kahani
//    poori tarah asli Redis pe chalti hai, live.
//
//    chalao:  npx tsx redis-hash-demo.mjs
//
//    Ye sirf DEKHNE ke liye hai — koi asli app code nahi chhoota.
//    Ek scratch key "demo:session:vikas" use karta hai, jo end me
//    khud delete ho jaati hai.
// ═══════════════════════════════════════════════════════════════

import 'dotenv/config';
import { createClient } from 'redis';

const KEY = 'demo:session:vikas';

const showState = async (client, label) => {
  const state = await client.hGetAll(KEY);
  const count = Object.keys(state).length;
  console.log(`\n📦 ${label}`);
  if (count === 0) {
    console.log('   (locker khaali hai)');
  } else {
    for (const [field, value] of Object.entries(state)) {
      console.log(`   ${field}  →  ${value}`);
    }
  }
};

const pause = () => new Promise((r) => setTimeout(r, 600)); // thoda ruk ke dikhao

async function main() {
  console.log('🔌 Redis se jud raha hoon...');
  const client = createClient({ url: process.env.REDIS_URL, socket: { tls: true, rejectUnauthorized: false } });
  await client.connect();
  console.log('✅ connected\n');
  console.log('════════════════════════════════════════════════');
  console.log(' KAHANI: Vikas laptop aur phone dono se login karta hai');
  console.log('════════════════════════════════════════════════');

  await client.del(KEY); // saaf shuruat
  await showState(client, 'STEP 0 — shuru me locker');
  await pause();

  console.log('\n➡️  HSET demo:session:vikas token_LAPTOP "exp:12345"');
  await client.hSet(KEY, 'token_LAPTOP', 'exp:12345');
  await showState(client, 'STEP 1 — laptop se login ke baad');
  await pause();

  console.log('\n➡️  HSET demo:session:vikas token_PHONE "exp:67890"');
  await client.hSet(KEY, 'token_PHONE', 'exp:67890');
  await showState(client, 'STEP 2 — phone se BHI login ke baad (dono saath hain!)');
  await pause();

  console.log('\n➡️  HDEL demo:session:vikas token_LAPTOP   (sirf laptop se logout)');
  await client.hDel(KEY, 'token_LAPTOP');
  await showState(client, 'STEP 3 — sirf laptop logout, phone abhi bhi login hai');
  await pause();

  console.log('\n➡️  HGETALL demo:session:vikas   (logout-ALL — sab padho)');
  const all = await client.hGetAll(KEY);
  console.log(`   mila: ${JSON.stringify(all)}`);
  console.log('   (ab in sab tokens ko blacklist kiya jaayega, real app me)');
  await pause();

  console.log('\n➡️  DEL demo:session:vikas   (poora locker mita do)');
  await client.del(KEY);
  await showState(client, 'STEP 4 — logout-all ke baad, poora locker khaali');

  console.log('\n════════════════════════════════════════════════');
  console.log(' Yehi poora HSET → HGETALL → HDEL ka lifecycle tha.');
  console.log('════════════════════════════════════════════════\n');

  await client.quit();
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
