import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { TripEntry, TripPoint } from "@/lib/api-types"

interface Props {
  entries: TripEntry[]
  entryId: string
  exitId: string
  onSelectEntry: (id: string) => void
  onSelectExit: (id: string) => void
}

const hasPos = <T extends TripPoint>(p: T): p is T & { lat: number; lng: number } =>
  typeof p.lat === "number" && typeof p.lng === "number"

const COLORS = {
  entry: "#7c6cf0",
  exit: "#2f9e6b",
  muted: "#a1a1aa",
  selected: "#4c3d99",
}

function dot(p: TripPoint & { lat: number; lng: number }, color: string, radius: number, emphasis = false) {
  return L.circleMarker([p.lat, p.lng], {
    radius,
    color: emphasis ? "#fff" : color,
    weight: emphasis ? 2.5 : 1.5,
    fillColor: color,
    fillOpacity: emphasis ? 1 : 0.85,
  })
}

/**
 * Shows where the selectable entries and exits are. Grey dots are the direction's
 * entries; pick one and its reachable exits appear in green. Markers are clickable
 * and stay in sync with the selects.
 */
export function TripMap({ entries, entryId, exitId, onSelectEntry, onSelectExit }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const handlers = useRef({ onSelectEntry, onSelectExit })
  useEffect(() => {
    handlers.current = { onSelectEntry, onSelectExit }
  }, [onSelectEntry, onSelectExit])

  useEffect(() => {
    if (!container.current || map.current) return
    const m = L.map(container.current, { scrollWheelZoom: false, attributionControl: true })
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

    const entry = entries.find((e) => e.id === entryId)
    const exit = entry?.exits.find((x) => x.id === exitId)
    const bounds: L.LatLngExpression[] = []

    for (const e of entries.filter(hasPos)) {
      const isSelected = e.id === entryId
      const marker = dot(e, isSelected ? COLORS.selected : entry ? COLORS.muted : COLORS.entry, isSelected ? 9 : 6, isSelected)
      marker.bindTooltip(`${isSelected ? "Entry: " : ""}${e.label}`, { direction: "top", permanent: isSelected, opacity: 0.95 })
      marker.on("click", () => handlers.current.onSelectEntry(e.id))
      marker.addTo(g)
      if (!entry || isSelected) bounds.push([e.lat, e.lng])
    }

    if (entry) {
      for (const x of entry.exits.filter(hasPos)) {
        const isSelected = x.id === exitId
        const marker = dot(x, COLORS.exit, isSelected ? 9 : 6, isSelected)
        marker.bindTooltip(`${isSelected ? "Exit: " : ""}${x.label}`, { direction: "top", permanent: isSelected, opacity: 0.95 })
        marker.on("click", () => handlers.current.onSelectExit(x.id))
        marker.addTo(g)
        if (!exit || isSelected) bounds.push([x.lat, x.lng])
      }
    }

    if (entry && exit && hasPos(entry) && hasPos(exit)) {
      L.polyline([[entry.lat, entry.lng], [exit.lat, exit.lng]], {
        color: COLORS.selected,
        weight: 2,
        dashArray: "4 6",
        opacity: 0.7,
      }).addTo(g)
    }

    if (bounds.length > 0) {
      m.fitBounds(L.latLngBounds(bounds), { paddingTopLeft: [90, 48], paddingBottomRight: [90, 28], maxZoom: 14, animate: true })
    }
  }, [entries, entryId, exitId])

  return (
    <div className="space-y-1.5">
      <div ref={container} className="h-64 w-full overflow-hidden rounded-lg border bg-muted sm:h-72" aria-label="Map of entries and exits" />
      <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full" style={{ background: COLORS.entry }} /> entries
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full" style={{ background: COLORS.exit }} /> exits from your entry
        </span>
        <span>Tap a dot to pick it. Straight line is not the route.</span>
      </p>
    </div>
  )
}
