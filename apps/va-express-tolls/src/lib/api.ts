import type { CorridorId } from "@/data/corridors"
import type {
  ApiError,
  CachedEstimateResponse,
  CorridorSupport,
  Direction,
  GeocodeResponse,
  HistoryResponse,
  HistorySummaryResponse,
  Place,
  PointsResponse,
  RouteTollsResponse,
} from "@/lib/api-types"

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { headers: { accept: "application/json" }, signal })
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
  return get<CachedEstimateResponse>(`/api/${corridor}/estimate?${qs}`)
}

export const fetchGeocode = (q: string, signal?: AbortSignal) =>
  get<GeocodeResponse>(`/api/geocode?${new URLSearchParams({ q })}`, signal)

export const fetchRouteTolls = (from: Place, to: Place) =>
  get<RouteTollsResponse>(
    `/api/route-tolls?${new URLSearchParams({
      from: `${from.lat},${from.lng}`,
      to: `${to.lat},${to.lng}`,
      fromLabel: from.label,
      toLabel: to.label,
    })}`,
  )

export const fetchHistorySummary = () => get<HistorySummaryResponse>("/api/history/summary")

export const fetchHistory = (corridor: CorridorId, hours: number) =>
  get<HistoryResponse>(`/api/history/${encodeURIComponent(corridor)}?hours=${hours}`)

export const formatUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso))
