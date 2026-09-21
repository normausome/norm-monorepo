import type { Seniority } from "../shared/types"

const ROLE = String.raw`(?:engineer|developer|programmer|sde|swe|mts)`
const level = (numerals: string) => new RegExp(String.raw`\b${ROLE}\b\s*[-,]?\s*\(?(?:${numerals})\)?(?=\W|$)`, "i")

/**
 * First match wins, so position is precedence. Management words beat every IC
 * level ("Senior Engineering Manager" is a manager). Among IC levels the higher
 * word wins ("Senior Staff Engineer" is staff, "Senior Principal" is principal).
 * Numeric and roman levels apply only when no level word is present.
 */
const RULES: [RegExp, Seniority][] = [
  [/\b(manager|mgr|director|head|supervisor|vp|vice president|president|chief|cto|ceo|coo)\b/i, "manager"],
  [/\b(principal|distinguished|fellow)\b/i, "principal"],
  [/\bstaff\b/i, "staff"],
  [/\b(senior|sr|lead)\b/i, "senior"],
  [/\bassociate\b/i, "associate"],
  [/\b(junior|jr|entry[- ]level|new grad(uate)?|graduate|intern(ship)?|apprentice|early career)\b/i, "entry"],
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
