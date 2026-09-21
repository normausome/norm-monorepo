import type { Seniority } from "../shared/types"

/** English, Portuguese, Spanish, and French words for an engineering IC role. */
export const ROLE = String.raw`(?:engineer|eng|developer|programmer|sde|swe|mts|desenvolvedora?|desarrolladora?|d[ée]veloppeur|engenheir[oa]|ingenier[oa]|programadora?)`

const MGMT = String.raw`(?:manager|mgr|director|head|supervisor|[rsea]?vp|vice president|president|chief)`

/** Management word before the first role word, or right after one with at most `-,/|`. */
export const MANAGEMENT_TITLE = new RegExp(
  String.raw`^(?:(?!\b${ROLE}\b)[\s\S])*?\b${MGMT}\b|\b${ROLE}\b\s*[-,/|]?\s*\b${MGMT}\b`,
  "i",
)

/** Same positional rule for `manager` alone (title filter). */
export const MANAGER_IN_TITLE = new RegExp(
  String.raw`^(?:(?!\b${ROLE}\b)[\s\S])*?\bmanager\b|\b${ROLE}\b\s*[-,/|]?\s*\bmanager\b`,
  "i",
)

const level = (numerals: string) => new RegExp(String.raw`\b${ROLE}\b\s*[-,]?\s*\(?(?:${numerals})\)?(?![\w&])`, "i")

/**
 * First match wins, so position is precedence. Management words beat every IC
 * level ("Senior Engineering Manager" is a manager). Among IC levels the higher
 * word wins ("Senior Staff Engineer" is staff, "Senior Principal" is principal).
 * Numeric and roman levels apply only when no level word is present.
 */
const RULES: [RegExp, Seniority][] = [
  [MANAGEMENT_TITLE, "manager"],
  [/\b(principal|distinguished|fellow)\b/i, "principal"],
  [/\b(staff|especialista)\b/i, "staff"],
  [/\bsemi[- ]?(senior|sr)\b/i, "mid"],
  [/\b(senior|s[êée]nior|sr|snr|lead)\b/i, "senior"],
  [/\bassociate\b/i, "associate"],
  [
    /\b(junior|j[úu]nior|jr|entry[- ]level|new grad(uate)?|graduate|grad|intern(ship)?|apprentice|early[- ]career|trainee|estagi[áa]ri[oa]|stagiaire|pasante|becari[oa])\b/i,
    "entry",
  ],
  [/\b(mid[- ]?level|intermediate|pleno)\b/i, "mid"],
  [level("I|1"), "entry"],
  [level("II|III|2|3"), "mid"],
  [level("IV|V|VI|4|5|6"), "senior"],
]

const IC_ROLE = new RegExp(String.raw`\b${ROLE}\b`, "i")

/**
 * Level from the title alone. An IC title with no level word is `mid`. A title
 * with neither a level word nor a role word is `unknown`. "Member of Technical
 * Staff" is a level-less IC title, so it is read as `MTS` and never as staff.
 */
export function inferSeniority(title: string): Seniority {
  const t = title.replace(/\bmember of technical staff\b/gi, "MTS")
  return RULES.find(([re]) => re.test(t))?.[1] ?? (IC_ROLE.test(t) ? "mid" : "unknown")
}
