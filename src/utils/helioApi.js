import axios from 'axios'
import { riskLevelFromScore } from './risk'

const DEFAULT_API_BASE = 'https://solar-sentinel-1.onrender.com'
const API_BASE = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, '')

function buildUrl(path, params) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${API_BASE}${normalizedPath}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }
  return url.toString()
}

function toNumber(value, fallback = null) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function inferLevel(rawLevel, rawScore) {
  if (typeof rawLevel === 'string') {
    const level = rawLevel.trim().toLowerCase()
    if (level === 'normal') return 'medium'
    if (level === 'med') return 'medium'
    if (level === 'moderate') return 'medium'
    if (level === 'high' || level === 'medium' || level === 'low') return level
  }

  const score = toNumber(rawScore, null)
  if (score === null) return 'low'
  return riskLevelFromScore(score)
}

function pickFirst(obj, keys, fallback = null) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key]
  }
  return fallback
}

function extractList(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  const candidateKeys = [
    'curated_top_10',
    'top_10',
    'top10',
    'satellites',
    'data',
    'results',
    'items',
    'rows',
  ]
  for (const key of candidateKeys) {
    if (Array.isArray(payload[key])) return payload[key]
  }

  // Fallback: if any top-level field is an array, use the first one.
  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) return value
  }

  return []
}

export function normalizeSatellite(raw, index = 0) {
  const name = pickFirst(raw, ['name', 'satellite_name', 'satelliteName', 'norad_name'], `SAT-${index + 1}`)
  const riskScore = toNumber(
    pickFirst(raw, ['riskScore', 'risk_score', 'risk', 'score', 'riskIndex']),
    0
  )
  const level = inferLevel(
    pickFirst(raw, ['riskLevel', 'risk_level', 'level', 'status']),
    riskScore
  )

  return {
    id: String(pickFirst(raw, ['id', '_id', 'norad_id', 'noradId'], `${name}-${index}`)),
    name: String(name),
    orbit: String(pickFirst(raw, ['orbit', 'orbit_type', 'orbitType', 'class'], 'LEO')),
    ageYears: toNumber(pickFirst(raw, ['ageYears', 'age_years', 'age']), 0),
    riskScore,
    risk_score: riskScore,
    level,
    status: String(pickFirst(raw, ['status'], level === 'medium' ? 'Normal' : level)),
    recommendation: String(pickFirst(raw, ['recommendation', 'rec', 'action', 'shielding_recommendation'], 'Nominal operations')),
    latitude: toNumber(pickFirst(raw, ['latitude', 'lat']), null),
    longitude: toNumber(pickFirst(raw, ['longitude', 'lon', 'lng']), null),
    lat: toNumber(pickFirst(raw, ['latitude', 'lat']), null),
    lng: toNumber(pickFirst(raw, ['longitude', 'lon', 'lng']), null),
    altitudeKm: toNumber(pickFirst(raw, ['altitudeKm', 'altitude_km', 'altitude', 'alt']), null),
    alt: toNumber(pickFirst(raw, ['altitudeKm', 'altitude_km', 'altitude', 'alt']), null),
    inclinationDeg: toNumber(pickFirst(raw, ['inclinationDeg', 'inclination_deg', 'inclination']), null),
    velocityKms: toNumber(pickFirst(raw, ['velocityKms', 'velocity_kms', 'velocity']), null),
    country: pickFirst(raw, ['country', 'operator_country', 'owner_country'], null),
    operator: pickFirst(raw, ['operator', 'owner', 'agency'], null),
    lastUpdated: pickFirst(raw, ['lastUpdated', 'last_updated', 'timestamp', 'updatedAt'], null),
    last_updated: pickFirst(raw, ['last_updated', 'lastUpdated', 'timestamp'], null),
    raw,
  }
}

async function requestJson(path, params) {
  try {
    const response = await axios.get(buildUrl(path, params), {
      headers: { Accept: 'application/json' },
    })
    return response.data
  } catch (error) {
    const status = error?.response?.status
    const message = error?.response?.data || error?.message || 'Request failed'
    if (status) {
      throw new Error(`Request failed (${status}): ${message}`)
    }
    throw new Error(message)
  }
}

export async function fetchHelioRiskSatellites() {
  const payload = await requestJson('/api/helio-risk')
  return extractList(payload).map(normalizeSatellite)
}

export async function fetchFullHelioRisk() {
  const payload = await requestJson('/api/helio-risk')
  return {
    metadata: payload?.metadata || null,
    curated_top_10: (payload?.curated_top_10 || []).map(normalizeSatellite),
    all_satellites: (payload?.all_satellites || []).map(normalizeSatellite),
    raw: payload,
  }
}

export async function searchHelioSatellites(query) {
  const payload = await requestJson('/api/search', {
    name: query,
    query,
    q: query,
    search: query,
  })
  return extractList(payload).map(normalizeSatellite)
}

export function pickHelioModelSatellites(satellites) {
  const high = satellites.filter((s) => s.level === 'high').sort((a, b) => b.riskScore - a.riskScore)
  const medium = satellites.filter((s) => s.level === 'medium').sort((a, b) => b.riskScore - a.riskScore)
  const low = satellites.filter((s) => s.level === 'low').sort((a, b) => a.riskScore - b.riskScore)

  return [...high.slice(0, 3), ...medium.slice(0, 3), ...low.slice(0, 4)]
}

export function pickCuratedTop50Satellites(satellites) {
  if (!Array.isArray(satellites) || satellites.length === 0) return []

  const valid = satellites.filter((s) => {
    const lat = s.latitude ?? s.lat
    const lon = s.longitude ?? s.lng ?? s.lon
    return Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))
  })
  const pool = valid.length > 0 ? valid : satellites

  const high = pool
    .filter((s) => {
      const lvl = String(s.level || '').toLowerCase()
      const score = Number(s.riskScore ?? s.risk_score) || 0
      return lvl === 'high' || score >= 70
    })
    .sort((a, b) => (Number(b.riskScore ?? b.risk_score) || 0) - (Number(a.riskScore ?? a.risk_score) || 0))

  const medium = pool
    .filter((s) => {
      const lvl = String(s.level || '').toLowerCase()
      const score = Number(s.riskScore ?? s.risk_score) || 0
      return (lvl === 'medium' || lvl === 'normal' || lvl === 'med') || (score >= 40 && score < 70)
    })
    .sort((a, b) => (Number(b.riskScore ?? b.risk_score) || 0) - (Number(a.riskScore ?? a.risk_score) || 0))

  const low = pool
    .filter((s) => {
      const lvl = String(s.level || '').toLowerCase()
      const score = Number(s.riskScore ?? s.risk_score) || 0
      return lvl === 'low' || score < 40
    })
    .sort((a, b) => (Number(b.riskScore ?? b.risk_score) || 0) - (Number(a.riskScore ?? a.risk_score) || 0))

  // Balanced fixed distribution: 20 High, 15 Medium, 15 Low (total = 50 fixed curated satellites)
  const selectedHigh = high.slice(0, 20)
  const selectedMedium = medium.slice(0, 15)
  const selectedLow = low.slice(0, 15)

  const curated = [...selectedHigh, ...selectedMedium, ...selectedLow]

  // In case any tier has fewer available, backfill remaining to reach exactly 50
  if (curated.length < 50) {
    const existingIds = new Set(curated.map((s) => s.id || s.name))
    for (const s of pool) {
      if (curated.length >= 50) break
      const id = s.id || s.name
      if (!existingIds.has(id)) {
        existingIds.add(id)
        curated.push(s)
      }
    }
  }

  return curated.slice(0, 50)
}
