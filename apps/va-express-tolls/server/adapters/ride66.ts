import { BadRequest, type CorridorAdapter } from "./types"

const NOT_AUTOMATED =
  "Not automated: ride66express.com serves its trip planner from a deliberately obfuscated bundle, which we treat as a do-not-automate signal. Use the official planner for a price."

/**
 * Placeholder adapter so the API surface is uniform across corridors.
 * See PLAN.md — automating this operator needs their OK first.
 */
export const ride66: CorridorAdapter = {
  support: { id: "66-outside", supported: false, reason: NOT_AUTOMATED, historical: false, directions: [] },
  async points() {
    throw new BadRequest(NOT_AUTOMATED)
  },
  async estimate() {
    throw new BadRequest(NOT_AUTOMATED)
  },
}
