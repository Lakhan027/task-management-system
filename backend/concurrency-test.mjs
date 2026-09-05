// ═══════════════════════════════════════════════════════════════
// 🎓 CONCURRENCY TEST
//
//   Ek saath N requests bhejta hai aur timing batata hai.
//   Isse pata chalta hai server SACH ME parallel chal raha hai
//   ya ek-ek karke (blocking).
//
//   chalao:
//     node concurrency-test.mjs <email> <password> [kitni]
//
//   example:
//     node concurrency-test.mjs test@test.com Pass@123 3
//
//   (password shell history me na aaye isliye env bhi chalega:
//     TEST_EMAIL=... TEST_PASSWORD=... node concurrency-test.mjs)
// ═══════════════════════════════════════════════════════════════

const BASE = process.env.API_URL || 'http://localhost:5000/api';

const email    = process.argv[2] || process.env.TEST_EMAIL;
const password = process.argv[3] || process.env.TEST_PASSWORD;
const COUNT    = Number(process.argv[4] || 3);

if (!email || !password) {
  console.error('\n❌ email aur password chahiye.\n');
  console.error('   node concurrency-test.mjs <email> <password> [kitni]\n');
  process.exit(1);
}

// ── 1. Login karke cookie lo ───────────────────────────────────
console.log(`\n🔑 login: ${email}`);

let res;
try {
  res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
} catch (err) {
  console.error(`\n❌ server se baat nahi ho payi (${BASE})`);
  console.error('   backend chal raha hai? → cd backend && npm run dev\n');
  process.exit(1);
}

if (!res.ok) {
  const body = await res.text();
  console.error(`\n❌ login fail (${res.status}): ${body.slice(0, 200)}\n`);
  process.exit(1);
}

const setCookie = res.headers.get('set-cookie');
if (!setCookie) {
  console.error('\n❌ login to ho gaya lekin cookie nahi mili\n');
  process.exit(1);
}
const cookie = setCookie.split(';')[0]; // "token=eyJ..."
console.log('✅ cookie mil gayi\n');

// ── 2. Ek saath N requests ─────────────────────────────────────
console.log(`🚀 ${COUNT} requests EK SAATH bhej raha hoon → GET /tasks\n`);

const t0 = Date.now();

const results = await Promise.all(
  Array.from({ length: COUNT }, (_, i) => {
    const start = Date.now();
    return fetch(`${BASE}/tasks`, { headers: { cookie } })
      .then((r) => ({ n: i + 1, status: r.status, ms: Date.now() - start }))
      .catch((e) => ({ n: i + 1, status: 'ERR', ms: Date.now() - start, e: e.message }));
  })
);

const total = Date.now() - t0;

// ── 3. Natija ──────────────────────────────────────────────────
console.log('  #   status   time');
console.log('  ─────────────────────');
for (const r of results) {
  console.log(`  ${r.n}   ${String(r.status).padEnd(7)}  ${r.ms}ms`);
}

const slowest = Math.max(...results.map((r) => r.ms));
console.log('  ─────────────────────');
console.log(`  TOTAL              ${total}ms`);
console.log(`  sabse slow ek      ${slowest}ms\n`);

// ── 4. Faisla ──────────────────────────────────────────────────
const ratio = total / slowest;

if (ratio < 1.4) {
  console.log('🟢 PARALLEL — total ≈ ek request jitna.');
  console.log('   Sab requests saath me chali. Yahi Node ka normal behaviour hai.\n');
} else {
  console.log('🔴 BLOCKING — total ≈ sab requests ka JOD.');
  console.log('   Ek-ek karke chali. Kahin CPU-heavy sync code hai jo');
  console.log('   event loop ko pakde baitha hai.\n');
}
