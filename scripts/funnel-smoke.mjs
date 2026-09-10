/* Does the funnel actually report itself?
 *
 * Analytics that silently fire nothing look exactly like analytics that work,
 * which is how this codebase ended up shipping a full event vocabulary with no
 * call sites. So: stub the pixel, walk the real UI, and assert the events.
 *
 * Runs the solo path end to end through preview mode, so the routine really is
 * generated and ViewRoutine really is reached.
 *
 *   npm i --no-save playwright-core
 *   ROZU_PREVIEW_KEY=... APP_URL=http://127.0.0.1:3141 node scripts/funnel-smoke.mjs
 */
import { chromium } from 'playwright-core';

const APP = process.env.APP_URL ?? 'http://127.0.0.1:3141';
const KEY = process.env.ROZU_PREVIEW_KEY;
if (!KEY) throw new Error('ROZU_PREVIEW_KEY must match the running server');

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

/* Consent pre-granted, and the pixel replaced with a recorder. Injected before
   any app code runs, so even the very first event has somewhere to land — the
   buffer in lib/analytics is exercised either way. */
await page.addInitScript(() => {
  try { window.localStorage.setItem('rozu_consent', 'granted'); } catch {}
  window.__ev = [];
  window.ttq = { track: (n, p) => window.__ev.push([n, p]), page() {}, load() {} };
  window.lintrk = () => {};
});

await page.goto(`${APP}/?preview=${encodeURIComponent(KEY)}`, { waitUntil: 'networkidle' });

await page.locator('.wcard').first().click();
await page.locator('#cta').click();
await page.waitForTimeout(350);

const next = async () => { await page.locator('#nextBtn').click(); await page.waitForTimeout(250); };
await page.locator('.qopt').first().click(); await next();
await page.locator('.qopt').nth(1).click();  await next();
await page.locator('.qg').nth(2).click();    await next();
await page.locator('.qopt').nth(2).click();  await next();
await page.locator('.qopt').nth(0).click();
await page.locator('.qopt').nth(5).click();  await next();
await page.locator('.qsec').nth(0).locator('xpath=following-sibling::div[1]').locator('.qopt').nth(2).click();
await page.locator('.qsec').nth(1).locator('xpath=following-sibling::div[1]').locator('.qopt').nth(2).click();
await page.locator('.qsec').nth(2).locator('xpath=following-sibling::div[1]').locator('.qopt').nth(1).click();
await next();
await page.locator('.qopt').nth(1).click();  await next();

await page.waitForSelector('#result.active', { timeout: 8000 });
await page.waitForTimeout(1900);

await page.locator('.pc-btn').click();
// Preview mode generates for real: allow for the model call or the fallback.
await page.waitForTimeout(9000);

const fired = await page.evaluate(() => window.__ev);
await browser.close();

const names = fired.map((e) => e[0]);
const want = ['ViewContent', 'ClickButton', 'StartQuiz', 'CompleteQuiz', 'ViewPreview', 'ViewRoutine'];
const missing = want.filter((n) => !names.includes(n));
/* Preview orders take no money. If either of these appears, a review session is
   being reported to the ad platform as revenue. */
const forbidden = names.filter((n) => n === 'InitiateCheckout' || n === 'CompletePayment');

for (const [n, p] of fired) console.log(`  ${n}`, p ? JSON.stringify(p) : '');
console.log('\nconsole errors :', errors.length ? errors : 'none');
console.log('missing        :', missing.length ? missing : 'none');
console.log('wrongly fired  :', forbidden.length ? forbidden : 'none');

const ok = !missing.length && !forbidden.length && !errors.length;
console.log('\n' + (ok ? 'FUNNEL: PASS' : 'FUNNEL: FAIL'));
process.exit(ok ? 0 : 1);
