export type Ats = "greenhouse" | "ashby" | "lever"

export type Board = {
  ats: Ats
  slug: string
  company: string
}

/** `source` column value and the id prefix for a board. Matches SWE Radar. */
export const ATS_ID_PREFIX: Record<Ats, string> = { greenhouse: "gh", ashby: "ashby", lever: "lever" }

export const sourceOf = (b: Board) => `${b.ats}:${b.slug}`

const gh = (slug: string, company: string): Board => ({ ats: "greenhouse", slug, company })
const ashby = (slug: string, company: string): Board => ({ ats: "ashby", slug, company })
const lever = (slug: string, company: string): Board => ({ ats: "lever", slug, company })

/** Curated public boards. Add a row here to scrape a new company. */
export const BOARDS: Board[] = [
  gh("affirm", "Affirm"),
  gh("airbnb", "Airbnb"),
  gh("gitlab", "GitLab"),
  gh("anthropic", "Anthropic"),
  gh("elastic", "Elastic"),
  gh("okta", "Okta"),
  gh("stripe", "Stripe"),
  gh("reddit", "Reddit"),
  gh("coinbase", "Coinbase"),
  gh("scaleai", "Scale AI"),
  gh("mongodb", "MongoDB"),
  gh("robinhood", "Robinhood"),
  gh("cloudflare", "Cloudflare"),
  gh("samsara", "Samsara"),
  gh("datadog", "Datadog"),
  gh("brex", "Brex"),
  gh("pinterest", "Pinterest"),
  gh("twilio", "Twilio"),
  gh("block", "Block"),
  gh("discord", "Discord"),
  gh("figma", "Figma"),
  gh("chime", "Chime"),
  gh("dropbox", "Dropbox"),
  gh("andurilindustries", "Anduril Industries"),
  gh("databricks", "Databricks"),
  gh("praxent", "Praxent"),
  gh("sezzle", "Sezzle"),
  gh("nortal", "Nortal"),
  gh("able", "Able"),
  gh("engine", "Engine"),
  gh("caylent", "Caylent"),
  gh("orium", "Orium"),
  gh("lumimeds", "Lumi Meds"),
  gh("remotecom", "Remote"),
  gh("remote", "Remote"),
  gh("duolingo", "Duolingo"),
  gh("doordashusa", "DoorDash"),
  gh("lyft", "Lyft"),
  gh("instacart", "Instacart"),
  ashby("openai", "OpenAI"),
  ashby("ramp", "Ramp"),
  ashby("notion", "Notion"),
  ashby("reacher", "Reacher"),
  ashby("linear", "Linear"),
  ashby("cursor", "Cursor"),
  ashby("buffer", "Buffer"),
  ashby("ashby", "Ashby"),
  lever("tryjeeves", "Jeeves"),
  lever("jobgether", "Jobgether"),
  lever("spotify", "Spotify"),
]
