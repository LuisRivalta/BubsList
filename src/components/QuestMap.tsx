import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { Pin } from '../lib/map'

const BRASIL: L.LatLngTuple = [-14.2, -51.9]

// Leaflet with the OpenStreetMap tiles. Pins are drawn here; the card of the tapped pin is React (MapPage).
export default function QuestMap({ pins, onPick }: { pins: Pin[]; onPick: (pin: Pin) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const pick = useRef(onPick)
  pick.current = onPick

  useEffect(() => {
    const m = L.map(box.current!).setView(BRASIL, 4)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(m)
    map.current = m
    layer.current = L.layerGroup().addTo(m)
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    const group = layer.current
    if (!m || !group) return
    group.clearLayers()
    for (const pin of pins) {
      const n = pin.quests.length
      const icon = L.divIcon({ className: '', html: `<span class="map-pin ${pin.pending ? 'map-pin-pending' : 'map-pin-done'}">${n > 1 ? n : ''}</span>`, iconSize: [32, 32], iconAnchor: [16, 16] })
      L.marker([pin.lat, pin.lng], { icon, title: pin.quests.map((q) => q.title).join(', '), keyboard: true })
        .on('click', () => pick.current(pin))
        .addTo(group)
    }
    if (pins.length) m.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as L.LatLngTuple)), { padding: [48, 48], maxZoom: 13 })
    else m.setView(BRASIL, 4)
  }, [pins])

  return <div ref={box} data-lenis-prevent className="size-full" />
}
