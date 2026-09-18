import type { CorridorId, CorridorMeta } from "./types"

export const CORRIDORS: readonly CorridorMeta[] = [
  {
    id: "495",
    name: "495 Express Lanes",
    operator: "Transurban (expresslanes.com)",
    sourceUrl: "https://expresslanes.com/maps-api/infra-price-confirmed-all",
  },
  {
    id: "395",
    name: "395 Express Lanes",
    operator: "Transurban (expresslanes.com)",
    sourceUrl: "https://expresslanes.com/maps-api/infra-price-confirmed-all",
  },
  {
    id: "95",
    name: "95 Express Lanes",
    operator: "Transurban (expresslanes.com)",
    sourceUrl: "https://expresslanes.com/maps-api/infra-price-confirmed-all",
  },
  {
    id: "66-inside",
    name: "I-66 Inside the Beltway",
    operator: "VDOT (vai66tolls.com)",
    sourceUrl: "https://www.vai66tolls.com/Index",
  },
  {
    id: "66-outside",
    name: "I-66 Outside the Beltway",
    operator: "66 Express Mobility Partners (ride66express.com)",
    sourceUrl: "https://ride66express.com/pricing/plan-your-trip/",
  },
]

export function corridorMeta(id: CorridorId): CorridorMeta {
  const c = CORRIDORS.find((x) => x.id === id)
  if (!c) throw new Error(`Unknown corridor ${id}`)
  return c
}
