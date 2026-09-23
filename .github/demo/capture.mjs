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
const headed = process.platform === "darwin" && !process.env.CI
const browser = await chromium.launch({ headless: !headed })
const desktop = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: outDir, size: { width: 1280, height: 800 } },
})
const page = await desktop.newPage()
await page.goto(url, { waitUntil: "networkidle", timeout: 45000 })
await installCursor(page)
await page.screenshot({ path: path.join(outDir, "desktop.png") })
await clickThrough(page)
await page.waitForTimeout(1200)
await page.screenshot({ path: path.join(outDir, "after.png") })
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
await phone.screenshot({ path: path.join(outDir, "mobile.png") })
await mobile.close()
await browser.close()

async function installCursor(page) {
  await page.evaluate(() => {
    const cursor = document.createElement("div")
    cursor.id = "demo-cursor"
    cursor.style.cssText = [
      "position:fixed",
      "z-index:2147483647",
      "width:18px",
      "height:18px",
      "margin-left:-9px",
      "margin-top:-9px",
      "border-radius:50%",
      "background:#5c3317",
      "box-shadow:0 0 0 3px rgba(255,255,255,0.9)",
      "pointer-events:none",
      "left:80px",
      "top:80px",
      "transition:left 500ms ease, top 500ms ease",
    ].join(";")
    document.body.appendChild(cursor)
  })
}

async function glideClick(page, locator) {
  const target = locator.first()
  if ((await target.count()) === 0) return false
  if (await target.isDisabled()) return false
  await target.scrollIntoViewIfNeeded()
  const box = await target.boundingBox()
  if (!box) return false
  const x = Math.round(box.x + box.width / 2)
  const y = Math.round(box.y + box.height / 2)
  await page.evaluate(
    ({ x, y }) => {
      const cursor = document.getElementById("demo-cursor")
      if (!cursor) return
      cursor.style.left = `${x}px`
      cursor.style.top = `${y}px`
    },
    { x, y },
  )
  await page.waitForTimeout(650)
  await target.click({ timeout: 4000 }).catch(() => {})
  await page.waitForTimeout(700)
  return true
}

async function clickThrough(page) {
  const start = page.getByRole("button", { name: /start quiz/i })
  if ((await start.count()) > 0) {
    const personal = page.getByRole("button", { name: /personal life/i })
    const section = (await personal.count()) > 0 ? personal : page.locator("button").nth(1)
    await glideClick(page, section)
    await glideClick(page, start)
    await page.waitForTimeout(400)
  }
  const choice = page.locator("button").filter({ hasText: /^A\./ })
  if ((await choice.count()) > 0) {
    await glideClick(page, choice)
    await page.waitForTimeout(1600)
    await glideClick(page, page.getByRole("button", { name: /^next/i }))
    return
  }
  const buttons = page.locator("button")
  const count = Math.min(await buttons.count(), 3)
  for (let i = 0; i < count; i++) {
    await glideClick(page, buttons.nth(i))
  }
}
