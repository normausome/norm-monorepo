import { connectDb, ensureSchema, persistRun } from "./db"
import { scrapeRide66 } from "./scrapers/ride66"
import { fetchTransurbanFeed, splitTransurbanFeed } from "./scrapers/transurban"
import { scrapeVai66 } from "./scrapers/vai66"
import type { ScrapeResult } from "./types"

const dryRun = process.argv.includes("--dry-run")

async function scrapeAll(): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = []

  try {
    const feed = await fetchTransurbanFeed()
    results.push(...splitTransurbanFeed(feed))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    for (const corridor of ["495", "395", "95"] as const) {
      results.push({
        corridor,
        operator: "Transurban (expresslanes.com)",
        sourceUrl: "https://expresslanes.com/maps-api/infra-price-confirmed-all",
        payload: {},
        summary: { scrapedAt: new Date().toISOString() },
        error: message,
      })
    }
  }

  for (const scrape of [scrapeVai66, scrapeRide66] as const) {
    try {
      results.push(await scrape())
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const corridor = scrape === scrapeVai66 ? "66-inside" : "66-outside"
      results.push({
        corridor,
        operator: corridor === "66-inside" ? "VDOT (vai66tolls.com)" : "66 Express Mobility Partners (ride66express.com)",
        sourceUrl:
          corridor === "66-inside"
            ? "https://vai66tolls.com/"
            : "https://ride66express.com/pricing/plan-your-trip/",
        payload: {},
        summary: { scrapedAt: new Date().toISOString() },
        error: message,
      })
    }
  }

  return results
}

async function main() {
  const startedAt = new Date()
  console.log(`[dmv-tolls-scraper] starting at ${startedAt.toISOString()}${dryRun ? " (dry-run)" : ""}`)

  const results = await scrapeAll()
  for (const r of results) {
    const status = r.error ? "FAIL" : "OK"
    const detail = r.error ?? JSON.stringify(r.summary)
    console.log(`  ${status} ${r.corridor}: ${detail}`)
  }

  const ok = results.filter((r) => !r.error).length
  if (ok === 0) {
    console.error("[dmv-tolls-scraper] all corridors failed")
    process.exitCode = 1
    return
  }

  if (dryRun) {
    console.log(`[dmv-tolls-scraper] dry-run complete (${ok}/${results.length} ok)`)
    return
  }

  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("[dmv-tolls-scraper] DATABASE_URL is required (or pass --dry-run)")
    process.exitCode = 1
    return
  }

  const { sql, close } = connectDb(url)
  try {
    await ensureSchema(sql)
    const summary = await persistRun(sql, startedAt, results)
    console.log(`[dmv-tolls-scraper] persisted run ${summary.status} (${ok}/${results.length} ok)`)
    if (summary.status === "failed") process.exitCode = 1
  } finally {
    await close()
  }
}

main().catch((err) => {
  console.error("[dmv-tolls-scraper] fatal:", err)
  process.exit(1)
})
