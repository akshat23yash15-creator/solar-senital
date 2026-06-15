
import { createContext, useCallback, useContext, useState } from 'react'
import { fetchLivePrediction, fetchManualPrediction, fetchBackendHealth } from '../utils/solarPredictionApi'

const SolarPredictionContext = createContext(null)

export function SolarPredictionProvider({ children }) {
  // Backend health
  const [health, setHealth] = useState(null)      // null | { status, scope }
  const [healthLoading, setHealthLoading] = useState(false)

  // Prediction result
  const [prediction, setPrediction] = useState(null)
  const [predicting, setPredicting] = useState(false)
  const [predictionError, setPredictionError] = useState('')

  // Track which mode produced the current prediction
  const [predictionSource, setPredictionSource] = useState(null) // 'live' | 'manual'

  // ── Health ─────────────────────────────────────────────────────────────────
  const checkHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const result = await fetchBackendHealth()
      setHealth(result)
    } catch {
      setHealth({ status: 'offline', scope: '' })
    } finally {
      setHealthLoading(false)
    }
  }, [])

  // ── Live Prediction ────────────────────────────────────────────────────────
  const runLivePrediction = useCallback(async () => {
    setPredicting(true)
    setPredictionError('')
    try {
      const result = await fetchLivePrediction()
      setPrediction(result)
      setPredictionSource('live')
    } catch (err) {
      setPredictionError(err?.response?.data?.detail || err.message || 'Live prediction failed.')
    } finally {
      setPredicting(false)
    }
  }, [])

  // ── Manual Prediction ──────────────────────────────────────────────────────
  const runManualPrediction = useCallback(async (imageFile) => {
    if (!imageFile) return
    setPredicting(true)
    setPredictionError('')
    try {
      const result = await fetchManualPrediction(imageFile)
      setPrediction(result)
      setPredictionSource('manual')
    } catch (err) {
      setPredictionError(err?.response?.data?.detail || err.message || 'Image prediction failed.')
    } finally {
      setPredicting(false)
    }
  }, [])

  // ── Clear ──────────────────────────────────────────────────────────────────
  const clearPrediction = useCallback(() => {
    setPrediction(null)
    setPredictionError('')
    setPredictionSource(null)
  }, [])

  return (
    <SolarPredictionContext.Provider
      value={{
        // Health
        health,
        healthLoading,
        checkHealth,
        // Prediction
        prediction,
        predicting,
        predictionError,
        predictionSource,
        // Actions
        runLivePrediction,
        runManualPrediction,
        clearPrediction,
      }}
    >
      {children}
    </SolarPredictionContext.Provider>
  )
}

export function useSolarPrediction() {
  const ctx = useContext(SolarPredictionContext)
  if (!ctx) throw new Error('useSolarPrediction must be used inside <SolarPredictionProvider>')
  return ctx
}
