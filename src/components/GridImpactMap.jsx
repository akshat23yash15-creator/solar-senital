import React, { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import '../styles/map.css'

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

function MapController({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target && target.lat && target.lng) {
      map.flyTo([target.lat, target.lng], 6, { duration: 1.2 })
    }
  }, [target, map])
  return null
}

export default function GridImpactMap({ triggers = [], selectedTrigger = null, onSelect = () => {} }) {
  // Default center around northern/central points if available, else standard fallback
  const firstTrigger = triggers[0]
  const defaultCenter = firstTrigger?.lat && firstTrigger?.lng ? [firstTrigger.lat, firstTrigger.lng] : [22.5, 79.0]

  return (
    <div
      className="mapWrap glass"
      style={{
        height: 480,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
      }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={4}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController target={selectedTrigger} />

        {triggers.map((p, idx) => {
          if (!p || p.lat == null || p.lng == null) return null
          const col = alertColor(p.alert_level)
          const radius = circleRadius(p.value)
          const isSelected = selectedTrigger?.region === p.region

          return (
            <CircleMarker
              key={`${p.region || 'p'}-${idx}`}
              center={[p.lat, p.lng]}
              radius={isSelected ? radius + 4 : radius}
              eventHandlers={{
                click: () => onSelect(p),
              }}
              pathOptions={{
                color: isSelected ? '#ffffff' : col,
                weight: isSelected ? 3 : 1.5,
                fillColor: col,
                fillOpacity: isSelected ? 0.85 : 0.55,
              }}
            >
              <Popup>
                <div style={{ padding: '4px 2px' }}>
                  <div style={{ fontWeight: 750, fontSize: 13, color: '#fff', marginBottom: 4 }}>
                    {p.region || 'Unnamed Grid Region'}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div>
                      Alert Level: <strong style={{ color: col }}>{p.alert_level || 'UNKNOWN'}</strong>
                    </div>
                    <div>
                      Risk Value: <strong>{p.value != null ? p.value : '—'}</strong>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, marginTop: 4, color: 'rgba(255,255,255,0.5)' }}>
                      {Number(p.lat).toFixed(4)}° N, {Number(p.lng).toFixed(4)}° E
                    </div>
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
