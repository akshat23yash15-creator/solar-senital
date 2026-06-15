/**
 * AIPredictionPanel.jsx
 * Reusable prediction UI: health badge, live scan button, upload, results.
 * Reads and calls useSolarPrediction() context.
 */

import { useRef, useState, useCallback } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, Zap, Upload, Sun, Search, Radio, MapPin
} from 'lucide-react'
import { useSolarPrediction } from '../context/SolarPredictionContext'
import '../styles/solarPrediction.css'

// ── Health Badge ─────────────────────────────────────────────────────────────

function HealthBadge() {
  const { health, healthLoading, checkHealth } = useSolarPrediction()

  let cls = 'checking'
  let label = 'Check Status'
  if (healthLoading) { cls = 'checking'; label = 'Checking...' }
  else if (health?.status === 'healthy') { cls = 'healthy'; label = `AI Backend · ${health.scope || 'Online'}` }
  else if (health?.status === 'offline') { cls = 'offline'; label = 'Backend Offline' }

  return (
    <button
      className={`ai-health-badge ${cls}`}
      onClick={checkHealth}
      disabled={healthLoading}
      title="Click to ping backend health"
      style={{ cursor: healthLoading ? 'default' : 'pointer', border: 'none' }}
    >
      <span className="ai-health-dot" />
      {label}
    </button>
  )
}

// ── Risk Level Badge ──────────────────────────────────────────────────────────

function RiskLevelBadge({ level }) {
  const normalized = String(level ?? 'LOW').toUpperCase()
  const cls = normalized === 'HIGH' ? 'HIGH' : normalized === 'MEDIUM' ? 'MED' : 'LOW'
  return (
    <span className={`ai-risk-badge ${cls}`}>
      <span className="ai-risk-dot" />
      {normalized}
    </span>
  )
}

// ── Confidence Bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ score }) {
  const pct = score != null ? Math.min(100, Math.max(0, score)) : 0
  return (
    <div className="ai-confidence-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ color: 'var(--muted)' }}>Confidence</span>
        <span style={{ fontFamily: 'var(--mono)', color: 'var(--neonC)' }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="ai-confidence-track">
        <div className="ai-confidence-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Prediction Results ────────────────────────────────────────────────────────

function PredictionResults({ prediction, source }) {
  if (!prediction) return null

  const hasAnomaly = prediction.anomaly &&
    !(prediction.anomaly.xPercent === 0 && prediction.anomaly.yPercent === 0)

  return (
    <Motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 20 }}
      className="ai-prediction-panel"
    >
      {/* Source + Risk header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <RiskLevelBadge level={prediction.riskLevel} />
        {source && (
          <span className="ai-source-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            {source === 'live'
              ? <><Radio size={10} strokeWidth={2} /> NASA SOHO Live</>
              : <><Upload size={10} strokeWidth={2} /> Uploaded Image</>
            }
          </span>
        )}
      </div>

      {/* Main metric grid */}
      <div className="ai-result-grid">
        <div className="ai-result-card" style={{ '--card-accent': 'rgba(34,211,238,0.45)' }}>
          <span className="ai-result-label">Flare Class</span>
          <span className="ai-result-value" style={{
            color: prediction.riskLevel === 'HIGH'
              ? 'var(--risk-high)'
              : prediction.riskLevel === 'MEDIUM'
              ? 'var(--risk-med)'
              : 'var(--risk-low)'
          }}>
            {prediction.flareClass}
          </span>
        </div>

        <div className="ai-result-card" style={{ '--card-accent': 'rgba(124,58,237,0.45)' }}>
          <span className="ai-result-label">Predicted log flux</span>
          <span className="ai-result-value ai-flux-mono">
            {prediction.predictedLogFlux != null ? prediction.predictedLogFlux.toFixed(2) : '--'}
          </span>
          <span className="ai-result-sub">W/m2 (log10)</span>
        </div>

        <div className="ai-result-card" style={{ '--card-accent': 'rgba(59,130,246,0.45)' }}>
          <span className="ai-result-label">Real Space Flux</span>
          <span className="ai-result-value ai-flux-mono" style={{ fontSize: 13 }}>
            {prediction.realSpaceFlux != null
              ? prediction.realSpaceFlux.toExponential(2)
              : '--'}
          </span>
          <span className="ai-result-sub">W/m2</span>
        </div>

        <div className="ai-result-card" style={{ '--card-accent': 'rgba(34,211,238,0.35)' }}>
          <span className="ai-result-label">Region</span>
          <span className="ai-result-value" style={{ fontSize: 14 }}>
            {prediction.anomaly?.regionName ?? 'Stable Matrix'}
          </span>
        </div>
      </div>

      {/* Confidence */}
      <ConfidenceBar score={prediction.confidenceScore} />

      {/* Anomaly localization (only if non-zero) */}
      {hasAnomaly && (
        <Motion.div
          className="ai-anomaly-block"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="ai-anomaly-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={12} strokeWidth={2.5} />
            Anomaly Detected — Solar Surface
          </div>
          <div className="ai-anomaly-region">{prediction.anomaly.regionName} · {prediction.anomaly.quadrant}</div>
          <div className="ai-anomaly-coords">
            <span>X: <strong>{prediction.anomaly.xPercent}%</strong></span>
            <span>Y: <strong>{prediction.anomaly.yPercent}%</strong></span>
          </div>
          <div className="ai-sun-hint">
            <span className="ai-sun-hint-dot" />
            <MapPin size={10} strokeWidth={2} style={{ flexShrink: 0 }} />
            Hotspot mapped on 3D Sun surface
          </div>
        </Motion.div>
      )}
    </Motion.div>
  )
}

// ── Upload Zone ───────────────────────────────────────────────────────────────

function UploadZone({ onFile, disabled }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState('')

  const handleFile = useCallback((file) => {
    if (!file) return
    setFileName(file.name)
    onFile(file)
  }, [onFile])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div
      className={`ai-upload-zone ${isDragging ? 'drag-over' : ''}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
      aria-label="Upload solar image"
      onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
    >
      <span className="ai-upload-icon">
        <Sun size={26} strokeWidth={1.5} color="var(--neonA)" />
      </span>
      {fileName
        ? <span className="ai-upload-file-name">{fileName}</span>
        : <span className="ai-upload-hint">Drop a solar image or click to browse</span>
      }
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
        disabled={disabled}
      />
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export default function AIPredictionPanel({ compact = false }) {
  const {
    prediction,
    predicting,
    predictionError,
    predictionSource,
    runLivePrediction,
    runManualPrediction,
    clearPrediction,
  } = useSolarPrediction()

  const [pendingFile, setPendingFile] = useState(null)
  const [showUpload, setShowUpload] = useState(false)

  const handleUploadPredict = useCallback(async () => {
    if (!pendingFile) return
    await runManualPrediction(pendingFile)
  }, [pendingFile, runManualPrediction])

  return (
    <div className="ai-prediction-panel">
      {/* Header row */}
      <div className="ai-dashboard-header">
        <div className="ai-dashboard-title">
          <Sun size={16} strokeWidth={1.75} color="var(--neonC)" />
          AI Solar Prediction
        </div>
        <HealthBadge />
      </div>

      {/* Action buttons */}
      <div className="ai-predict-actions">
        <button
          className="btn-ai-live"
          onClick={runLivePrediction}
          disabled={predicting}
          title="Fetch latest NASA SOHO image and run AI prediction"
        >
          {predicting && predictionSource !== 'manual'
            ? <><span className="ai-scan-spinner" /> Scanning<span className="ai-scan-dots" /></>
            : <><Zap size={14} strokeWidth={2} /> Predict Live</>
          }
        </button>

        <button
          className="btn-ai-upload"
          onClick={() => setShowUpload(v => !v)}
          disabled={predicting}
          title="Upload a solar image for prediction"
        >
          <Upload size={14} strokeWidth={2} /> Upload Image
        </button>

        {prediction && (
          <button
            className="btn"
            onClick={clearPrediction}
            disabled={predicting}
            style={{ fontSize: 12, padding: '8px 12px' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Upload zone (toggle) */}
      <AnimatePresence>
        {showUpload && (
          <Motion.div
            key="upload"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
              <UploadZone onFile={setPendingFile} disabled={predicting} />
              {pendingFile && (
                <button
                  className="btn-ai-live"
                  onClick={handleUploadPredict}
                  disabled={predicting}
                  style={{ alignSelf: 'flex-start' }}
                >
                  {predicting && predictionSource === 'manual'
                    ? <><span className="ai-scan-spinner" /> Analyzing<span className="ai-scan-dots" /></>
                    : <><Search size={14} strokeWidth={2} /> Run Prediction</>
                  }
                </button>
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Scanning state */}
      {predicting && (
        <div className="ai-scanning">
          <span className="ai-scan-spinner" />
          <span>
            {predictionSource === 'manual'
              ? 'Analyzing uploaded image...'
              : 'Fetching NASA SOHO image & running AI scan...'}
          </span>
        </div>
      )}

      {/* Error state */}
      {predictionError && !predicting && (
        <div className="ai-error" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <AlertTriangle size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} />
          {predictionError}
        </div>
      )}

      {/* Results */}
      <AnimatePresence mode="wait">
        {prediction && !predicting && (
          <PredictionResults
            key="result"
            prediction={prediction}
            source={predictionSource}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
