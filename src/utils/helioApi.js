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
    level,
    status: String(pickFirst(raw, ['status'], level === 'medium' ? 'Normal' : level)),
    latitude: toNumber(pickFirst(raw, ['latitude', 'lat']), null),
    longitude: toNumber(pickFirst(raw, ['longitude', 'lon', 'lng']), null),
    altitudeKm: toNumber(pickFirst(raw, ['altitudeKm', 'altitude_km', 'altitude', 'alt']), null),
    inclinationDeg: toNumber(pickFirst(raw, ['inclinationDeg', 'inclination_deg', 'inclination']), null),
    velocityKms: toNumber(pickFirst(raw, ['velocityKms', 'velocity_kms', 'velocity']), null),
    country: pickFirst(raw, ['country', 'operator_country', 'owner_country'], null),
    operator: pickFirst(raw, ['operator', 'owner', 'agency'], null),
    lastUpdated: pickFirst(raw, ['lastUpdated', 'last_updated', 'timestamp', 'updatedAt'], null),
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
