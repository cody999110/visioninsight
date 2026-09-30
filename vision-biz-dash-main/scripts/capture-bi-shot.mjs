/**
 * Capture BI query board screenshot for README.
 * Run: node scripts/capture-bi-shot.mjs
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../../docs/screenshots");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1.5,
});

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 60000 });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem("vi-theme", "violet");
});
await page.reload({ waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1800);

// Drill from dashboard chart into revenue BI
await page.getByText("收入与毛利趋势").first().click();
await page.waitForURL("**/revenue-analysis**", { timeout: 15000 });
await page.waitForTimeout(800);

await page.getByRole("button", { name: /生成数据/ }).click();
await page.waitForTimeout(1200);

// dismiss toast if any
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

await page.screenshot({
  path: path.join(OUT, "02-bi-query.png"),
  fullPage: false,
});
console.log("wrote 02-bi-query.png");

await browser.close();
