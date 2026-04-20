// Centralized hardcoded demo data for SolarSentinel (no external APIs)

export const liveStats = {
  solarWindSpeed: 612, // km/s
  kpIndex: 6.1,
  flareClass: 'M2.3',
  geomagneticStormEta: '02h 18m',
  activeAlerts: 3,
  lastUpdated: '2026-04-16 19:43 UTC',
}

export const alerts = [
  {
    id: 'AL-001',
    severity: 'high',
    title: 'CME Impact Window',
    message: 'Probable G3 storm window opening in ~2 hours. Elevated satellite drag expected.',
    time: '19:17 UTC',
  },
  {
    id: 'AL-002',
    severity: 'medium',
    title: 'HF Radio Fadeout',
    message: 'Potential polar HF blackout. Route comms via lower latitudes.',
    time: '18:52 UTC',
  },
  {
    id: 'AL-003',
    severity: 'low',
    title: 'Auroral Oval Expansion',
    message: 'Auroral activity likely visible at higher mid-latitudes.',
    time: '18:11 UTC',
  },
]

export const satellites = [
  { name: 'INSAT-3D', orbit: 'GEO', ageYears: 10, riskScore: 82, status: 'High' },
  { name: 'GSAT-30', orbit: 'GEO', ageYears: 5, riskScore: 58, status: 'Medium' },
  { name: 'Starlink-3145', orbit: 'LEO', ageYears: 2, riskScore: 41, status: 'Low' },
  { name: 'ISS', orbit: 'LEO', ageYears: 26, riskScore: 64, status: 'Medium' },
  { name: 'Starlink-9281', orbit: 'LEO', ageYears: 1, riskScore: 73, status: 'High' },
  { name: 'GSAT-29', orbit: 'GTO', ageYears: 6, riskScore: 49, status: 'Low' },
]

export const riskDistribution = {
  labels: ['Low', 'Medium', 'High'],
  values: [9, 6, 4],
}

export const solarWindSeries = {
  labels: ['-50m', '-40m', '-30m', '-20m', '-10m', 'Now'],
  values: [420, 448, 510, 560, 590, 612],
}

export const kpSeries = {
  labels: ['00', '03', '06', '09', '12', '15', '18'],
  values: [2.3, 2.9, 3.5, 4.2, 5.1, 5.7, 6.1],
}

// Dummy grid risk points (India-focused + global) used for a "heatmap-like" overlay.
// We render these as semi-transparent circles (no external heatmap plugin).
export const gridRiskPoints = [
  { lat: 28.6139, lng: 77.209, level: 'high', label: 'Delhi' },
  { lat: 19.076, lng: 72.8777, level: 'medium', label: 'Mumbai' },
  { lat: 13.0827, lng: 80.2707, level: 'high', label: 'Chennai' },
  { lat: 22.5726, lng: 88.3639, level: 'medium', label: 'Kolkata' },
  { lat: 23.2599, lng: 77.4126, level: 'low', label: 'Bhopal' },
  { lat: 37.7749, lng: -122.4194, level: 'low', label: 'San Francisco' },
  { lat: 52.52, lng: 13.405, level: 'medium', label: 'Berlin' },
  { lat: 60.1699, lng: 24.9384, level: 'high', label: 'Helsinki' },
]

export const suggestedActions = {
  high: [
    'Switch spacecraft to safe-mode power budget',
    'Delay sensitive maneuvers (drag uncertainty)',
    'Enable redundant attitude sensors',
    'Increase ground station pass priority',
  ],
  medium: [
    'Increase telemetry sampling for charging events',
    'Validate comm links and error correction',
    'Monitor GNSS degradation windows',
  ],
  low: ['Continue nominal operations', 'Keep alerting thresholds active'],
}
