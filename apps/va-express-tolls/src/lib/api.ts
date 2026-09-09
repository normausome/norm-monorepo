import type { CorridorId } from "@/data/corridors"
import type { ApiError, CorridorSupport, Direction, EstimateResponse, PointsResponse } from "@/lib/api-types"

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { accept: "application/json" } })
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok || body === null) {
    const apiError = typeof body === "object" && body !== null && "error" in body ? (body as ApiError).error : null
    throw new Error(apiError ?? `Request failed (${res.status})`)
  }
  return body as T
}

export type CorridorSupportInfo = CorridorSupport & { name: string; calculatorUrl: string }

export const fetchCorridors = () => get<CorridorSupportInfo[]>("/api/corridors")

export const fetchPoints = (corridor: CorridorId, direction: Direction) =>
  get<PointsResponse>(`/api/${corridor}/points?direction=${direction}`)

export function fetchEstimate(
  corridor: CorridorId,
  params: { direction: Direction; entry: string; exit: string; at?: string },
) {
  const qs = new URLSearchParams(params.at ? params : { direction: params.direction, entry: params.entry, exit: params.exit })
  return get<EstimateResponse>(`/api/${corridor}/estimate?${qs}`)
}

export const formatUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso))
