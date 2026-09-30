/**
 * Capture README showcase screenshots from the local demo dashboard.
 * Run from vision-biz-dash-main: node scripts/capture-readme-shots.mjs
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../../docs/screenshots");
fs.mkdirSync(OUT, { recursive: true });

const BASE = process.env.VI_URL || "http://127.0.0.1:8080/";

async function waitCharts(page) {
  await page.waitForTimeout(2500);
}

async function closeOverlays(page) {
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(200);
}

async function openWorkspaceMenu(page) {
  await closeOverlays(page);
  await page.getByRole("button", { name: "功能" }).click({ timeout: 15000 });
  await page.waitForTimeout(400);
}

async function setTheme(page, label) {
  await openWorkspaceMenu(page);
  await page.getByRole("menuitemradio", { name: new RegExp(label) }).click();
  await page.waitForTimeout(500);
  await closeOverlays(page);
}

async function applyPreset(page, name) {
  await openWorkspaceMenu(page);
  await page.getByRole("menuitem", { name: /布局与模块/ }).click();
  await page.waitForTimeout(500);
  const presetsTab = page.getByRole("tab", { name: "布局预设" });
  if (await presetsTab.count()) await presetsTab.click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).first().click();
  await page.waitForTimeout(900);
  await closeOverlays(page);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  await waitCharts(page);

  // 1) Classic violet dashboard
  await page.screenshot({
    path: path.join(OUT, "01-dashboard-violet.png"),
    fullPage: false,
  });
  console.log("wrote 01-dashboard-violet.png");

  // 2) Teal theme + 经营概览, with appearance menu open to show skins
  await setTheme(page, "青绿");
  await applyPreset(page, "经营概览");
  await waitCharts(page);
  await openWorkspaceMenu(page);
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT, "02-theme-skins.png"),
    fullPage: false,
  });
  console.log("wrote 02-theme-skins.png");
  await closeOverlays(page);

  // 3) Layout & modules dialog (module picker tab)
  await setTheme(page, "紫晶");
  await applyPreset(page, "经典");
  await openWorkspaceMenu(page);
  await page.getByRole("menuitem", { name: /布局与模块/ }).click();
  await page.waitForTimeout(600);
  const modulesTab = page.getByRole("tab", { name: "模块选择" });
  if (await modulesTab.count()) {
    await modulesTab.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({
    path: path.join(OUT, "03-layout-modules.png"),
    fullPage: false,
  });
  console.log("wrote 03-layout-modules.png");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
