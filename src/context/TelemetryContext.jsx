import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { fetchLivePrediction, fetchInfrastructureImpact } from '../utils/solarPredictionApi'
import { fetchFullHelioRisk } from '../utils/helioApi'

const TelemetryContext = createContext(null)

export function TelemetryProvider({ children }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  // Real telemetry states from APIs
  const [flareData, setFlareData] = useState(null)
  const [infraData, setInfraData] = useState(null)
  const [satData, setSatData] = useState(null)

  const fetchAll = useCallback(async (signal) => {
    setLoading(true)
    setError('')

    const results = await Promise.allSettled([
      fetchLivePrediction(),
      fetchInfrastructureImpact('live', signal),
      fetchFullHelioRisk(signal),
    ])

    let errCount = 0
    let errMsgs = []

    if (results[0].status === 'fulfilled') {
      setFlareData(results[0].value)
    } else {
      errCount++
      errMsgs.push('Solar Flare AI offline')
    }

    if (results[1].status === 'fulfilled') {
      setInfraData(results[1].value)
    } else {
      errCount++
      errMsgs.push('Infrastructure API offline')
    }

    if (results[2].status === 'fulfilled') {
      setSatData(results[2].value)
    } else {
      errCount++
      errMsgs.push('Helio Risk API offline')
    }

    if (errCount === 3) {
      setError('All space weather telemetry endpoints offline.')
    } else if (errCount > 0) {
      setError(errMsgs.join(' · '))
    } else {
      setError('')
    }

    setLastUpdated(new Date().toISOString())
    setLoading(false)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchAll(controller.signal)
    // Optional refresh every 60s
    const timer = setInterval(() => {
      fetchAll(controller.signal)
    }, 60000)

    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [fetchAll])

  // Derived clean fields
  const solarWindSpeed = infraData?.live_telemetry?.speed ?? null
  const kpIndex = infraData?.live_telemetry?.kp_index ?? null
  const stormEta = infraData?.storm_metadata?.formatted_eta ?? null
  const stormClass = infraData?.storm_metadata?.storm_class ?? null
  const flareClass = flareData?.flare_class ?? null
  const riskLevel = flareData?.risk_level ?? null
  const gridTriggers = infraData?.grid_heatmap_triggers ?? []
  const aviationAlerts = infraData?.aviation_alerts ?? []
  const automatedActions = infraData?.automated_actions ?? []
  const curatedTop10 = satData?.curated_top_10 ?? []
  const allSatellites = satData?.all_satellites ?? []

  return (
    <TelemetryContext.Provider
      value={{
        loading,
        error,
        lastUpdated,
        solarWindSpeed,
        kpIndex,
        stormEta,
        stormClass,
        flareClass,
        riskLevel,
        gridTriggers,
        aviationAlerts,
        automatedActions,
        curatedTop10,
        allSatellites,
        flareData,
        infraData,
        satData,
        refresh: () => fetchAll(),
      }}
    >
      {children}
    </TelemetryContext.Provider>
  )
}

export function useTelemetry() {
  const ctx = useContext(TelemetryContext)
  if (!ctx) throw new Error('useTelemetry must be used inside <TelemetryProvider>')
  return ctx
}
