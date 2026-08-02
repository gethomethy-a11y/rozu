/* Browser smoke test of the payment gate.
 *
 * Needs playwright-core, which is deliberately NOT a project dependency —
 * install it ad hoc:  npm i --no-save playwright-core
 * Chromium is preinstalled; point CHROME at it if the path differs.
 *
 * Walks the real UI to the preview and clicks Unlock, in a real browser.
   Asserts: no console errors, no request to Anthropic before payment, and the
   Unlock button posts a correct order to /api/checkout. */
import { chromium } from 'playwright-core';

const APP = process.env.APP_URL ?? 'http://127.0.0.1:3100';
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const errors = [];
const requests = [];
// The stubbed /api/checkout deliberately answers 503; that log line is ours.
const expected = (t) => t.includes('503');
page.on('console', (m) => { if (m.type() === 'error' && !expected(m.text())) errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('request', (r) => requests.push(r.url()));

let checkoutBody = null;
await page.route('**/api/checkout', async (route) => {
  checkoutBody = route.request().postDataJSON();
  // Stop before the real navigation so the test stays on-page.
  await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"stub"}' });
});

await page.goto(APP + '/?utm_source=tiktok&ttclid=XYZ', { waitUntil: 'networkidle' });

// Landing -> pick "Just me" -> start
await page.locator('.wcard').first().click();
await page.locator('#cta').click();
await page.waitForTimeout(350);

// Q1 heritage, Q2 skin, Q3 tone, Q4, Q5 multi, Q6 lifestyle, Q7
await page.locator('.qopt').first().click();     await page.locator('#nextBtn').click(); await page.waitForTimeout(250);
await page.locator('.qopt').nth(1).click();      await page.locator('#nextBtn').click(); await page.waitForTimeout(250);
await page.locator('.qg').nth(2).click();        await page.locator('#nextBtn').click(); await page.waitForTimeout(250);
await page.locator('.qopt').nth(2).click();      await page.locator('#nextBtn').click(); await page.waitForTimeout(250);
await page.locator('.qopt').nth(0).click();
await page.locator('.qopt').nth(5).click();      await page.locator('#nextBtn').click(); await page.waitForTimeout(250);
await page.locator('.qsec').nth(0).locator('xpath=following-sibling::div[1]').locator('.qopt').nth(2).click();
await page.locator('.qsec').nth(1).locator('xpath=following-sibling::div[1]').locator('.qopt').nth(2).click();
await page.locator('.qsec').nth(2).locator('xpath=following-sibling::div[1]').locator('.qopt').nth(1).click();
await page.locator('#nextBtn').click(); await page.waitForTimeout(250);
await page.locator('.qopt').nth(1).click();      await page.locator('#nextBtn').click(); await page.waitForTimeout(250);

await page.waitForSelector('#result.active', { timeout: 8000 });
await page.waitForTimeout(1800);
const previewShown = await page.locator('.pc-btn').isVisible();
await page.screenshot({ path: process.env.OUT ?? 'smoke-preview.png', fullPage: true });

// The money button
const unlock = page.locator('.pc-btn');
const label = (await unlock.textContent())?.trim();
await unlock.click();
await page.waitForTimeout(1200);

const anthropic = requests.filter((u) => u.includes('anthropic.com'));
const generate = requests.filter((u) => u.includes('/api/generate'));

console.log('console errors      :', errors.length ? errors : 'none');
console.log('preview rendered    :', previewShown);
console.log('unlock button label :', JSON.stringify(label));
console.log('direct anthropic.com:', anthropic.length);
console.log('/api/generate calls :', generate.length);
console.log('checkout payload    :', JSON.stringify(checkoutBody, null, 2));

await browser.close();
const ok = errors.length === 0 && anthropic.length === 0 && generate.length === 0 && checkoutBody
  && checkoutBody.plan === 'solo' && checkoutBody.self?.heritage && checkoutBody.utm?.ttclid === 'XYZ';
console.log('\n' + (ok ? 'SMOKE: PASS' : 'SMOKE: FAIL'));
process.exit(ok ? 0 : 1);
