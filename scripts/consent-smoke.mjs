/* Does the consent banner get in the way? It is fixed to the bottom of the
   viewport, which is exactly where the "who" cards and the start button live. */
import { chromium } from 'playwright-core';
const APP = process.env.APP_URL, OUT = process.env.OUT;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const errs = [];
/* A fresh context per scenario. The consent choice is remembered on purpose, so
   reusing one context means the banner is gone for every check after the first
   — which is the app behaving correctly and the test being wrong. */
const fresh = async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(String(e)));
  return p;
};
let page = await fresh();

await page.goto(APP, { waitUntil: 'networkidle' });

// Can a visitor complete the first two actions WITHOUT dismissing the banner?
let blocked = null;
try {
  await page.locator('.wcard').first().click({ timeout: 4000 });
  await page.locator('#cta').click({ timeout: 4000 });
  await page.waitForSelector('#quiz.active', { timeout: 4000 });
} catch (e) {
  blocked = String(e).split('\n')[0];
}
console.log('start the quiz with the banner still open:', blocked ? 'BLOCKED — ' + blocked : 'works');

// And the footer links, which sit at the very bottom.
page = await fresh();
await page.goto(APP, { waitUntil: 'networkidle' });
await page.locator('.consent-btn.d').click();
await page.waitForTimeout(300);
const links = await page.locator('.foot a').allInnerTexts();
console.log('footer links:', links.join(' · '));
await page.locator('.foot a').first().click();
await page.waitForURL('**/impressum', { timeout: 6000 });
console.log('footer link navigates:', page.url().endsWith('/impressum'));

page = await fresh();
await page.goto(APP, { waitUntil: 'networkidle' });
await page.locator('.consent-btn.d').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/landing-foot.png`, fullPage: true });
console.log('page errors:', errs.length ? errs : 'none');
await browser.close();
