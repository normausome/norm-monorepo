import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { RouteTollsResponse, TripPoint } from "@/lib/api-types"

const COLORS = {
  route: "#7c6cf0",
  entry: "#2f9e6b",
  exit: "#d9534f",
  endpoint: "#4c3d99",
}

const hasPos = (p: TripPoint): p is TripPoint & { lat: number; lng: number } => typeof p.lat === "number" && typeof p.lng === "number"

/** The driven route with each matched Express Lanes entry (green) and exit (red) pinned on it. */
export function RouteMap({ result }: { result: RouteTollsResponse }) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!container.current || map.current) return
    const m = L.map(container.current, { scrollWheelZoom: false })
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
      map.current = null
      layer.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    const g = layer.current
    if (!m || !g) return
    g.clearLayers()

    const line = L.polyline(result.route.geometry, { color: COLORS.route, weight: 4, opacity: 0.85 }).addTo(g)
    for (const [i, p] of [result.from, result.to].entries()) {
      L.circleMarker([p.lat, p.lng], { radius: 7, color: "#fff", weight: 2, fillColor: COLORS.endpoint, fillOpacity: 1 })
        .bindTooltip(`${i === 0 ? "From" : "To"}: ${p.label}`, { direction: "top", opacity: 0.95 })
        .addTo(g)
    }
    for (const leg of result.legs) {
      for (const [kind, p] of [["Enter", leg.entry], ["Exit", leg.exit]] as const) {
        if (!hasPos(p)) continue
        L.circleMarker([p.lat, p.lng], {
          radius: 6,
          color: "#fff",
          weight: 2,
          fillColor: kind === "Enter" ? COLORS.entry : COLORS.exit,
          fillOpacity: 1,
        })
          .bindTooltip(`${kind} ${leg.corridorName}: ${p.label}`, { direction: "top", opacity: 0.95 })
          .addTo(g)
      }
    }
    m.fitBounds(line.getBounds(), { padding: [24, 24] })
  }, [result])

  return (
    <div className="space-y-1.5">
      <div ref={container} className="h-64 w-full overflow-hidden rounded-lg border bg-muted sm:h-80" aria-label="Map of the route and matched Express Lanes points" />
      <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 rounded" style={{ background: COLORS.route }} /> driving route
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full" style={{ background: COLORS.entry }} /> Express Lanes entry
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full" style={{ background: COLORS.exit }} /> exit
        </span>
      </p>
    </div>
  )
}
