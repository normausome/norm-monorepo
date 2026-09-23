import { chromium } from "playwright"
import { mkdir, rename } from "node:fs/promises"
import path from "node:path"

const url = process.argv[2]
const outDir = process.argv[3]
if (!url || !outDir) {
  console.error("usage: capture.mjs <url> <outDir>")
  process.exit(1)
}

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch()
const desktop = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: outDir, size: { width: 1280, height: 800 } },
})
const page = await desktop.newPage()
await page.goto(url, { waitUntil: "networkidle", timeout: 45000 })
await page.screenshot({ path: path.join(outDir, "desktop.png"), fullPage: true })
await clickThrough(page)
await page.screenshot({ path: path.join(outDir, "after.png"), fullPage: true })
const video = page.video()
await desktop.close()
if (video) {
  await rename(await video.path(), path.join(outDir, "demo.webm"))
}

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})
const phone = await mobile.newPage()
await phone.goto(url, { waitUntil: "networkidle", timeout: 45000 })
await phone.screenshot({ path: path.join(outDir, "mobile.png"), fullPage: true })
await mobile.close()
await browser.close()

async function clickThrough(page) {
  const buttons = page.locator("button")
  if ((await buttons.count()) === 0) return
  await buttons.first().click({ timeout: 4000 }).catch(() => {})
  await page.waitForTimeout(500)
  const start = page.getByRole("button", { name: /start|play all|all/i })
  if ((await start.count()) > 0) {
    await start.first().click({ timeout: 4000 }).catch(() => {})
    await page.waitForTimeout(500)
  }
  const again = page.locator("button")
  if ((await again.count()) > 0) {
    await again.first().click({ timeout: 4000 }).catch(() => {})
    await page.waitForTimeout(700)
  }
}
