import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useTelemetry } from '../context/TelemetryContext'

function alertColor(level) {
  if (!level) return '#35f28c'
  const v = String(level).toUpperCase()
  if (v === 'RED' || v === 'CRITICAL') return '#ff3b3b'
  if (v === 'ORANGE') return '#ff7b22'
  if (v === 'YELLOW' || v === 'WARNING') return '#ffbf1f'
  return '#35f28c'
}

function circleRadius(value) {
  const v = parseFloat(value) || 0.1
  return Math.max(12, Math.min(42, v * 60))
}

export default function GridRiskMap({ triggers: propTriggers }) {
  const { gridTriggers: ctxTriggers } = useTelemetry()
  const triggers = propTriggers || ctxTriggers || []

  const firstValid = triggers.find((p) => p && p.lat != null && p.lng != null)
  const center = firstValid ? [firstValid.lat, firstValid.lng] : [22.5, 79.0]

  return (
    <div className="mapWrap glass neon-border">
      <MapContainer center={center} zoom={4} scrollWheelZoom style={{ borderRadius: 22, height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {triggers.map((p, idx) => {
          if (!p || p.lat == null || p.lng == null) return null
          const col = alertColor(p.alert_level)
          const radius = circleRadius(p.value)

          return (
            <CircleMarker
              key={`${p.region || 'grid'}-${idx}`}
              center={[p.lat, p.lng]}
              radius={radius}
              pathOptions={{
                color: col,
                weight: 2,
                fillColor: col,
                fillOpacity: 0.65,
              }}
            >
              <Popup>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 4 }}>
                  {p.region || 'Regional Grid Sector'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div>
                    Alert Level: <strong style={{ color: col }}>{p.alert_level || 'OK'}</strong>
                  </div>
                  <div>
                    Risk Value: <strong>{p.value != null ? p.value : '—'}</strong>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, marginTop: 4, color: 'rgba(255,255,255,0.5)' }}>
                    {Number(p.lat).toFixed(4)}° N, {Number(p.lng).toFixed(4)}° E
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
