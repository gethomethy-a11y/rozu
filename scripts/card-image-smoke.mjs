/* Runs the real solo and couple flows, then pulls the generated PNG out of the
   page as a data URL so the actual saved image can be inspected — clicking the
   button only proves it does not throw. */
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';

const APP = process.env.APP_URL;
const KEY = process.env.ROZU_PREVIEW_KEY;
const OUT = process.env.OUT;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));

async function quiz(pick) {
  await page.locator('.qopt').nth(pick[0]).click(); await page.locator('#nextBtn').click(); await page.waitForTimeout(180);
  await page.locator('.qopt').nth(pick[1]).click(); await page.locator('#nextBtn').click(); await page.waitForTimeout(180);
  await page.locator('.qg').nth(pick[2]).click();   await page.locator('#nextBtn').click(); await page.waitForTimeout(180);
  await page.locator('.qopt').nth(pick[3]).click(); await page.locator('#nextBtn').click(); await page.waitForTimeout(180);
  for (const c of pick[4]) await page.locator('.qopt').nth(c).click();
  await page.locator('#nextBtn').click(); await page.waitForTimeout(180);
  for (let i = 0; i < 3; i++) {
    await page.locator('.qsec').nth(i).locator('xpath=following-sibling::div[1]').locator('.qopt').nth(pick[5][i]).click();
  }
  await page.locator('#nextBtn').click(); await page.waitForTimeout(180);
  await page.locator('.qopt').nth(pick[6]).click(); await page.locator('#nextBtn').click(); await page.waitForTimeout(220);
}

async function grabPng(name) {
  await page.locator('.share-b.p').first().click();      // open the sheet
  await page.waitForSelector('#shareCard', { timeout: 8000 });
  await page.waitForTimeout(500);
  await page.locator('#shareCard').screenshot({ path: `${OUT}/dom-${name}.png` });
  const dataUrl = await page.evaluate(async () => {
    const mod = await import('/_next/static/chunks/app/page.js').catch(() => null);
    return window.__rozuTestPng ?? null;
  }).catch(() => null);
  return dataUrl;
}

/* ── Solo ── */
await page.goto(`${APP}/?preview=${encodeURIComponent(KEY)}`, { waitUntil: 'networkidle' });
await page.locator('.wcard').nth(0).click();
await page.locator('#cta').click();
await page.waitForTimeout(300);
await quiz([0, 0, 1, 2, [1, 3, 6], [2, 1, 1], 1]);
await page.waitForSelector('#result.active', { timeout: 10000 });
await page.waitForTimeout(1900);
await page.locator('.pc-btn').click();
await page.waitForSelector('.share', { timeout: 45000 });
await page.locator('.share-b.p').first().click();
await page.waitForSelector('#shareCard', { timeout: 8000 });
await page.waitForTimeout(400);
await page.locator('#shareCard').screenshot({ path: `${OUT}/dom-solo.png` });
console.log('SOLO CARD:\n' + (await page.locator('#shareCard').innerText()));

// Click Save image and intercept the download.
const dl = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
await page.locator('.scard-save').click();
const d = await dl;
if (d) { await d.saveAs(`${OUT}/png-solo.png`); console.log('saved solo png ->', await d.suggestedFilename()); }
else console.log('no download event for solo');

/* ── Couple ── */
await page.goto(`${APP}/?preview=${encodeURIComponent(KEY)}`, { waitUntil: 'networkidle' });
await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
await page.goto(`${APP}/?preview=${encodeURIComponent(KEY)}`, { waitUntil: 'networkidle' });
await page.locator('.wcard').nth(1).click();
await page.locator('#cta').click();
await page.waitForTimeout(300);
await quiz([0, 1, 2, 2, [1, 3], [2, 2, 1], 1]);
await page.locator('.pt-btn').click();
await page.waitForTimeout(400);
await quiz([1, 4, 4, 0, [1, 3], [2, 1, 1], 0]);
await page.waitForSelector('#result.active', { timeout: 10000 });
await page.waitForTimeout(1900);
await page.locator('.pc-btn').click();
await page.waitForSelector('.share', { timeout: 45000 });
await page.locator('.share-b.p').first().click();
await page.waitForSelector('#shareCard', { timeout: 8000 });
await page.waitForTimeout(400);
console.log('\nCOUPLE CARD:\n' + (await page.locator('#shareCard').innerText()));
const dl2 = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
await page.locator('.scard-save').click();
const d2 = await dl2;
if (d2) { await d2.saveAs(`${OUT}/png-couple.png`); console.log('saved couple png'); }
else console.log('no download event for couple');

console.log('page errors:', errs.length ? errs : 'none');
await browser.close();
