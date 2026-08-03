import { chromium } from 'playwright-core';
const APP = process.env.APP_URL;
const KEY = process.env.ROZU_PREVIEW_KEY;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

/* Reproduce the reported failure: a leftover sid from an earlier, abandoned
   checkout sitting in localStorage. It used to hold the busy lock for two
   minutes on load, so the Unlock button silently did nothing. */
await page.goto(APP, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('rozu_sid', '11111111-2222-4333-8444-555555555555'));
await page.goto(`${APP}/?preview=${encodeURIComponent(KEY)}`, { waitUntil: 'networkidle' });
await page.locator('.wcard').first().click();
await page.locator('#cta').click();
await page.waitForTimeout(350);
await page.locator('.qopt').first().click();  await page.locator('#nextBtn').click(); await page.waitForTimeout(220);
await page.locator('.qopt').nth(1).click();   await page.locator('#nextBtn').click(); await page.waitForTimeout(220);
await page.locator('.qg').nth(2).click();     await page.locator('#nextBtn').click(); await page.waitForTimeout(220);
await page.locator('.qopt').nth(2).click();   await page.locator('#nextBtn').click(); await page.waitForTimeout(220);
await page.locator('.qopt').nth(0).click();
await page.locator('.qopt').nth(5).click();   await page.locator('#nextBtn').click(); await page.waitForTimeout(220);
await page.locator('.qsec').nth(0).locator('xpath=following-sibling::div[1]').locator('.qopt').nth(2).click();
await page.locator('.qsec').nth(1).locator('xpath=following-sibling::div[1]').locator('.qopt').nth(2).click();
await page.locator('.qsec').nth(2).locator('xpath=following-sibling::div[1]').locator('.qopt').nth(1).click();
await page.locator('#nextBtn').click(); await page.waitForTimeout(220);
await page.locator('.qopt').nth(1).click();   await page.locator('#nextBtn').click(); await page.waitForTimeout(220);

await page.waitForSelector('#result.active', { timeout: 8000 });
await page.waitForTimeout(1800);
await page.screenshot({ path: process.env.OUT1, fullPage: true });

await page.locator('.pc-btn').click();
await page.waitForSelector('.rcard', { timeout: 45000 });
await page.waitForTimeout(600);
await page.screenshot({ path: process.env.OUT2, fullPage: true });

console.log('page errors:', errs.length ? errs : 'none');
console.log('result rendered:', await page.locator('.rcard').count(), 'cards');
await browser.close();
