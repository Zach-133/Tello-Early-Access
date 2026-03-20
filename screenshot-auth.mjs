import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

function getNextFilename(label) {
  const files = fs.readdirSync(screenshotDir);
  const nums = files.map(f => f.match(/^screenshot-(\d+)/)).filter(Boolean).map(m => parseInt(m[1], 10));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return label ? `screenshot-${next}-${label}.png` : `screenshot-${next}.png`;
}

const targetUrl = process.argv[2] || 'http://localhost:8080/form';
const label     = process.argv[3] || '';
const EMAIL     = 'zach.wzw@gmail.com';
const PASSWORD  = 'tello123';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });

  // Sign in
  await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle0' });
  await page.type('input[type="email"]', EMAIL);
  await page.type('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect to /form
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
  await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000)); // let dashboard data load

  const filename = getNextFilename(label);
  await page.screenshot({ path: path.join(screenshotDir, filename), fullPage: true });
  await browser.close();
  console.log(`Screenshot saved: temporary screenshots/${filename}`);
})();
