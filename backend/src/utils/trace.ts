// ─────────────────────────────────────────────────────────────
// 🎓 LEARNING TOOL — ye file sirf seekhne ke liye hai.
//    Band karna ho to .env me likho:  TRACE=off
//    Hatana ho to:  grep -rn "trace(" src/  aur saari lines uda do.
// ─────────────────────────────────────────────────────────────

const ON = process.env.TRACE !== 'off';

/** Ek stop print karo */
export const trace = (stop: string, message: string, extra?: unknown): void => {
  if (!ON) return;
  const label = `STOP ${stop}`.padEnd(9);
  if (extra !== undefined) {
    console.log(`  │ ${label} ${message}`, extra);
  } else {
    console.log(`  │ ${label} ${message}`);
  }
};

/** Request andar aayi — box ka upar wala hissa */
export const traceStart = (method: string, url: string): void => {
  if (!ON) return;
  console.log(`\n┌─────── ${method} ${url}`);
};

/** Response bahar gaya — box ka neeche wala hissa */
export const traceEnd = (status: number, ms: number): void => {
  if (!ON) return;
  console.log(`└─────── ${status} · ${ms}ms\n`);
};
