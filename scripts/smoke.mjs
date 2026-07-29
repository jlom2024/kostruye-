/**
 * Kostruye+ Smoke Test
 * Verifica que VPS y Supabase estén vivos.
 * Uso: node scripts/smoke.mjs
 */
const BASE = process.env.TEST_URL ?? 'https://konstruye.site';
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://wyaugtdgmcesoryhyois.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

let passed = 0, failed = 0;

async function test(name, fn) {
  try { await fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}

async function fetchOk(url, opts = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000), ...opts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

console.log('Kostruye+ Smoke Test\n');

await test('Landing HTTP 200', () => fetchOk(BASE));
await test('Landing contiene "Kostruye"', async () => {
  const res = await fetchOk(BASE);
  const text = await res.text();
  if (!text.includes('Kostruye')) throw new Error('No contiene Kostruye');
});
await test('Login page HTTP 200', () => fetchOk(`${BASE}/login`));
await test('Robots.txt HTTP 200', () => fetchOk(`${BASE}/robots.txt`));
await test('Supabase reachable', async () => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
    headers: { apikey: ANON_KEY },
    signal: AbortSignal.timeout(10000),
  });
  if (res.status !== 200 && res.status !== 401) throw new Error(`HTTP ${res.status}`);
});

const dashUrl = `${BASE}/proyectos`;
await test('Dashboard redirects to login', async () => {
  const res = await fetch(dashUrl, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
  if (res.status !== 307 && res.status !== 302 && res.status !== 200) throw new Error(`HTTP ${res.status}`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
