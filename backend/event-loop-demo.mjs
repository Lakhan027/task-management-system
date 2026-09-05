// ═══════════════════════════════════════════════════════════════
// 🎓 EVENT LOOP DEMO
//    chalao:  node event-loop-demo.mjs
//
//    Har hisse se pehle SOCHO ki output kya order me aayega.
//    Phir chala ke dekho. Jahan andaza galat nikle — wahi seekh hai.
// ═══════════════════════════════════════════════════════════════

const line = (t) => console.log('\n────── ' + t + ' ──────');

// ───────────────────────────────────────────────────────────────
// HISSA 1 — kaun pehle chalta hai?
// ───────────────────────────────────────────────────────────────
line('HISSA 1: kaun pehle chalta hai?');

console.log('A  sync code');

setTimeout(() => console.log('E  setTimeout  (macrotask — sabse aakhir)'), 0);

Promise.resolve().then(() => console.log('D  promise    (microtask)'));

process.nextTick(() => console.log('C  nextTick   (sabse tez queue)'));

console.log('B  sync code (ye bhi turant)');

// Asli output (.mjs file me):  A → B → D → C → E
//
// Sync code (A, B) HAMESHA pehle — ye pakka hai.
// setTimeout (E) hamesha sabse aakhir — ye bhi pakka.
//
// ⚠️ Lekin C aur D ka order file ke type par depend karta hai:
//    .cjs file me →  C (nextTick) pehle, phir D (promise)   ← kitaabon wala jawab
//    .mjs file me →  D (promise) pehle, phir C (nextTick)   ← humara case
//
// Kyun? ESM me poora module khud ek promise ke andar chalta hai,
// isliye promise wali queue pehle hi khali ho jaati hai.
//
// SEEKH: kitaab kuch bhi kahe — apne terminal me chala ke dekho.


// ───────────────────────────────────────────────────────────────
// HISSA 2 — await = ruko nahi, doosra kaam karo
// ───────────────────────────────────────────────────────────────
setTimeout(() => {
  line('HISSA 2: await (non-blocking)');

  // ye ek "database call" hai — 300ms lagta hai
  const fakeDbCall = (ms) => new Promise((r) => setTimeout(r, ms));

  async function request(naam, ms) {
    console.log(`${naam}  → DB ko bola, ab main free hoon`);
    await fakeDbCall(ms);
    console.log(`${naam}  ← DB ka jawab aa gaya (${ms}ms)`);
  }

  request('Request A (300ms)', 300);
  request('Request B (100ms)', 100);
  console.log('main       → dono bhej diye, main abhi bhi free hoon');

  // Sahi jawab:
  //   A → DB ko bola
  //   B → DB ko bola
  //   main → dono bhej diye
  //   B ← jawab (100ms)     ← B pehle khatam! baad me shuru hua tha
  //   A ← jawab (300ms)
  //
  // EK thread. Dono saath chal rahe hain. Ye Node ka poora jaadu hai.
}, 100);


// ───────────────────────────────────────────────────────────────
// HISSA 3 — blocking = sabko rok diya
// ───────────────────────────────────────────────────────────────
setTimeout(() => {
  line('HISSA 3: blocking (khatarnak)');

  // ye "await" nahi hai — ye thread ko pakad ke baith jaata hai
  function blockingKaam(naam, ms) {
    console.log(`${naam}  → shuru`);
    const end = Date.now() + ms;
    while (Date.now() < end) {
      /* kuch nahi kar raha, bas thread rok ke baitha hai */
    }
    console.log(`${naam}  ← khatam (${ms}ms)`);
  }

  blockingKaam('Request C (300ms)', 300);
  blockingKaam('Request D (100ms)', 100);
  console.log('main       → ab jaake bola');

  // Sahi jawab: bilkul seedha, koi mix nahi
  //   C → shuru
  //   C ← khatam
  //   D → shuru
  //   D ← khatam
  //   main → ab jaake bola
  //
  // D ko 300ms bekaar wait karna pada — sirf isliye ki C thread pakde baitha tha.
  // Asli server me: 1 slow request = BAAKI SAB requests atki hui.
}, 800);
