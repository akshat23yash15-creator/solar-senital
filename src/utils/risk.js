export function riskLevelFromScore(score) {
  if (score >= 70) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

export function riskColor(level) {
  switch (level) {
    case 'high':
      return 'var(--risk-high)'
    case 'medium':
      return 'var(--risk-med)'
    default:
      return 'var(--risk-low)'
  }
}

// Three.js cannot parse CSS variables via THREE.Color(). Use hex/rgb strings instead.
export function riskColorThree(level) {
  switch (level) {
    case 'high':
      return '#ff4d6d'
    case 'medium':
      return '#ffd166'
    default:
      return '#22c55e'
  }
}

export function formatRiskLabel(level) {
  if (!level) return ''
  return level[0].toUpperCase() + level.slice(1)
}
