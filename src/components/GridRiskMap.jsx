import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { gridRiskPoints } from '../utils/dummyData'

const colorByLevel = {
  high: 'rgba(255,59,59,0.55)',
  medium: 'rgba(255,140,0,0.45)',
  low: 'rgba(53,242,140,0.35)',
}

const strokeByLevel = {
  high: 'rgba(255,59,59,0.95)',
  medium: 'rgba(255,191,31,0.9)',
  low: 'rgba(53,242,140,0.9)',
}

const radiusByLevel = {
  high: 180000,
  medium: 140000,
  low: 100000,
}

export default function GridRiskMap() {
  return (
    <div className="mapWrap glass neon-border">
      <MapContainer center={[22.5, 79.0]} zoom={4} scrollWheelZoom style={{ borderRadius: 22 }}>
        <TileLayer
          attribution=""
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {gridRiskPoints.map((p) => (
          <Circle
            key={`${p.lat}-${p.lng}-${p.label}`}
            center={[p.lat, p.lng]}
            radius={radiusByLevel[p.level]}
            pathOptions={{
              color: strokeByLevel[p.level],
              weight: 1,
              fillColor: colorByLevel[p.level],
              fillOpacity: 1,
            }}
          >
            <Popup>
              <div style={{ fontWeight: 650 }}>{p.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 12 }}>Intensity: {p.level}</div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  )
}
