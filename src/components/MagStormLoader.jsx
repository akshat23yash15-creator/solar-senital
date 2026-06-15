import { useEffect, useState } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Loader, Shield } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────────────
   STATIC DATA
───────────────────────────────────────────────────────────────────── */
const STARS = Array.from({ length: 110 }, (_, i) => ({
  x: ((i * 73 + 17) * 1.37) % 100,
  y: ((i * 47 + 31) * 1.19) % 100,
  r: i % 5 === 0 ? 1.5 : i % 3 === 0 ? 1.0 : 0.7,
  opacity: 0.06 + (i % 7) * 0.04,
  pulse: i % 7 === 0,
  dur: 2.4 + (i % 5) * 0.65,
}))

const PROGRESS_LABELS = [
  { at:  0, text: 'INITIALIZING SPACE WEATHER COMMAND CENTER' },
  { at: 18, text: 'CONNECTING TO NOAA REAL-TIME FEED' },
  { at: 36, text: 'SCANNING GRID INFRASTRUCTURE' },
  { at: 55, text: 'ANALYZING GEOMAGNETIC RISK' },
  { at: 72, text: 'COMPUTING IMPACT FORECAST' },
  { at: 88, text: 'FINALIZING OPERATIONS CENTER' },
]

const STATUS_ITEMS = [
  { id: 'noaa',      label: 'NOAA CONNECTED',    sub: 'REAL-TIME FEED',         spin: false, delay: 0.5,  color: '#35f28c' },
  { id: 'nasa',      label: 'NASA CONNECTED',     sub: 'GOES-19 SATELLITE',      spin: false, delay: 0.9,  color: '#35f28c' },
  { id: 'telemetry', label: 'TELEMETRY ACTIVE',   sub: '4 MB/S · 22ms LATENCY', spin: false, delay: 1.3,  color: '#35f28c' },
  { id: 'forecast',  label: 'COMPUTING FORECAST', sub: 'SOLAR-BERT v3.1 · 94%', spin: true,  delay: 1.7,  color: '#ffbf1f' },
]

const FEED_LINES = [
  { text: '> HANDSHAKE GOES-19 SAT',     color: '#00e5ff',              delay: 0.4  },
  { text: '  200 OK · RTT 18ms',         color: 'rgba(0,229,255,0.5)', delay: 0.65 },
  { text: '> AUTH NOAA SWPC ENDPOINT',   color: '#00e5ff',              delay: 1.0  },
  { text: '  TLS 1.3 TOKEN VERIFIED',    color: 'rgba(0,229,255,0.5)', delay: 1.2  },
  { text: '> KP INDEX STREAM ACTIVE',    color: '#00e5ff',              delay: 1.6  },
  { text: '  KP = 4.2  [ELEVATED]',      color: '#ffbf1f',              delay: 1.85 },
  { text: '> DELHI NCR GRID SCAN',       color: '#00e5ff',              delay: 2.2  },
  { text: '  RISK = 62/100 [ELEVATED]',  color: '#ffbf1f',              delay: 2.4  },
  { text: '> NE GRID SECTOR SCAN',       color: '#00e5ff',              delay: 2.75 },
  { text: '  RISK = 48/100 [NOMINAL]',   color: '#35f28c',              delay: 2.95 },
  { text: '> ML FORECAST INIT',          color: '#00e5ff',              delay: 3.3  },
  { text: '  ACCURACY: 94.2%',           color: '#35f28c',              delay: 3.65 },
]

/* ─────────────────────────────────────────────────────────────────────
   ACCURATE INDIA SVG PATH
   viewBox: "0 0 500 540"
   Projection:  x = (lon − 67) × 15.5
                y = (36 − lat) × 18.0
   ~82 control points, clockwise from J&K NW corner.
   Includes: Saurashtra peninsula, full southern tip,
   correct NE chicken-neck, Arunachal Pradesh eastern border.
───────────────────────────────────────────────────────────────────── */
const INDIA_PATH = [
  // J&K / Pakistan LOC going south
  'M 113,27',   // 74.3°E 35.5°N — J&K NW
  'L 105,45',   // 73.5°E 34.5°N
  'L 108,63',   // 74.0°E 33.5°N
  'L 108,81',   // 74.0°E 32.5°N
  'L 117,99',   // 74.6°E 31.5°N — Wagah/Punjab
  'L 93,126',   // 73.0°E 30.0°N — Rajasthan N
  'L 78,144',   // 72.0°E 29.0°N
  'L 62,180',   // 71.0°E 27.0°N
  'L 55,207',   // 70.5°E 25.5°N
  // Gujarat & Rann of Kutch
  'L 39,225',   // 69.5°E 24.5°N
  'L 20,238',   // 68.3°E 23.8°N — Rann NW
  'L 16,249',   // 68.0°E 23.2°N — Koteshwar (westernmost)
  'L 22,260',   // 68.8°E 22.5°N — Rann S
  // ── Saurashtra peninsula (sticks distinctively west)
  'L 47,270',   // 70.0°E 22.2°N — Saurashtra NW coast
  'L 48,289',   // 70.1°E 20.9°N — Veraval / S tip of Saurashtra
  'L 57,293',   // 70.7°E 20.6°N — Saurashtra SE tip
  'L 65,284',   // 71.2°E 21.5°N — Bhavnagar coast
  'L 74,273',   // 71.8°E 22.1°N — Gulf of Cambay N
  'L 79,263',   // 72.1°E 22.8°N
  // Gujarat / Maharashtra coast
  'L 90,277',   // 72.8°E 21.5°N — Surat
  'L 90,296',   // 72.8°E 20.4°N — Daman
  'L 91,324',   // 72.9°E 18.9°N — Mumbai
  'L 97,349',   // 73.3°E 17.5°N — Ratnagiri
  'L 102,367',  // 73.6°E 16.5°N — Vengurla
  // Goa
  'L 109,385',  // 74.0°E 15.5°N — Goa N
  'L 110,398',  // 74.1°E 14.8°N — Goa S
  // Karnataka / Kerala
  'L 111,412',  // 74.2°E 14.0°N — Karwar
  'L 119,438',  // 74.7°E 12.5°N — Mangalore
  'L 135,456',  // 75.7°E 11.5°N — Kozhikode
  'L 137,465',  // 75.9°E 11.0°N
  'L 144,484',  // 76.3°E 10.0°N — Kochi
  'L 152,499',  // 76.9°E  8.7°N — Alleppey
  'L 153,511',  // 76.9°E  8.1°N — Thiruvananthapuram
  // ── KANYAKUMARI — southernmost point ▼
  'L 163,519',  // 77.5°E  8.1°N — KANYAKUMARI
  // Tamil Nadu east coast ↑
  'L 172,507',  // 78.1°E  8.8°N — Tuticorin
  'L 192,497',  // 79.4°E  9.3°N — Rameshwaram
  'L 199,478',  // 79.8°E 10.3°N — Point Calimere
  'L 200,462',  // 79.9°E 11.0°N — Nagapattinam
  'L 202,453',  // 80.0°E 11.7°N
  'L 204,439',  // 80.2°E 12.5°N — Cuddalore
  'L 204,426',  // 80.3°E 13.1°N — Chennai
  // Andhra Pradesh coast ↑
  'L 203,400',  // 80.1°E 14.5°N — Nellore
  'L 206,382',  // 80.3°E 15.5°N — Ongole
  'L 206,364',  // 80.3°E 16.5°N — Machilipatnam
  'L 233,357',  // 82.0°E 16.9°N — Kakinada
  'L 252,342',  // 83.3°E 17.7°N — Visakhapatnam
  // Odisha coast ↑
  'L 274,328',  // 84.7°E 18.5°N
  'L 279,310',  // 85.1°E 19.5°N — Gopalpur
  'L 298,305',  // 86.3°E 20.0°N — Chilika
  'L 303,298',  // 86.6°E 20.3°N — Paradip
  // West Bengal coast ↑
  'L 310,276',  // 87.0°E 21.5°N — Balasore
  'L 318,267',  // 87.5°E 22.0°N — Digha
  'L 327,261',  // 88.2°E 22.3°N — Kolkata
  'L 333,267',  // 88.5°E 22.0°N — Haldia
  // ── Going NORTH along Bangladesh W border → Siliguri ──
  'L 333,249',  // 88.5°E 23.0°N
  'L 326,231',  // 88.0°E 23.8°N
  'L 326,200',  // 88.0°E 25.6°N
  'L 333,182',  // 88.5°E 26.7°N — SILIGURI (chicken neck)
  // ── Northeast: east along Bhutan/China border ──
  'L 341,174',  // 89.0°E 27.1°N — Bhutan W
  'L 365,165',  // 90.5°E 27.6°N — Bhutan E/Tawang
  'L 387,157',  // 92.0°E 28.0°N — Arunachal W
  'L 418,143',  // 94.0°E 29.0°N — Arunachal N
  'L 449,151',  // 96.0°E 28.5°N — Arunachal NE
  'L 465,160',  // 97.0°E 28.0°N — Arunachal E / Myanmar border ►
  // Myanmar border going south ↓
  'L 449,186',  // 96.0°E 26.5°N — Nagaland E
  'L 432,204',  // 95.0°E 25.5°N — Manipur N
  'L 418,231',  // 94.0°E 24.0°N — Manipur E
  'L 403,258',  // 93.0°E 22.5°N — Mizoram E
  'L 403,267',  // 93.0°E 22.0°N — Mizoram S
  // Tripura (going west) ←
  'L 395,244',  // 92.5°E 23.5°N — Mizoram/Tripura
  'L 380,258',  // 91.5°E 22.5°N — Tripura E
  'L 372,249',  // 91.0°E 23.0°N — Tripura N
  // ── North through Meghalaya → back to Siliguri ──
  'L 372,231',  // 91.0°E 23.8°N
  'L 372,213',  // 91.0°E 25.0°N — Meghalaya/Bangladesh N
  'L 356,200',  // 90.0°E 25.7°N
  'L 341,186',  // 89.0°E 26.5°N
  'L 333,182',  // 88.5°E 26.7°N — SILIGURI (return)
  // ── Nepal border going west ──
  'L 326,169',  // 88.0°E 27.5°N — Nepal E/Darjeeling
  'L 318,173',  // 87.5°E 27.3°N
  'L 302,169',  // 86.3°E 27.6°N
  'L 284,160',  // 85.1°E 28.3°N
  'L 257,155',  // 83.3°E 28.6°N
  'L 209,143',  // 80.3°E 29.3°N — Nepal W
  // Uttarakhand → Himachal → J&K northern border ↖
  'L 202,129',  // 79.8°E 30.0°N
  'L 186,115',  // 78.8°E 30.8°N
  'L 171,97',   // 77.8°E 31.8°N
  'L 155,81',   // 76.8°E 32.8°N — HP/J&K
  'L 132,72',   // 75.5°E 33.5°N
  'L 120,54',   // 74.7°E 34.5°N
  'L 108,45',   // 74.0°E 35.0°N
  'L 113,27 Z', // close
].join(' ')

/* ── Monitored nodes — positions computed from same projection ── */
//  x = (lon − 67) × 15.5,   y = (36 − lat) × 18.0
const NODES = [
  {
    id: 'delhi',
    label: 'DELHI NCR',
    sub: 'PRIMARY SECTOR',
    coord: '28.7°N  77.2°E',
    x: Math.round((77.2 - 67) * 15.5),  // 158
    y: Math.round((36 - 28.7) * 18.0),  // 131
    color: '#00e5ff',
    r: 5,
    staticRings: [13, 22, 35],
    pulseMax: 80,
    pulseDur: '3.2s',
  },
  {
    id: 'ne',
    label: 'NE GRID',
    sub: 'SECONDARY SECTOR',
    coord: '26.1°N  91.7°E',
    x: Math.round((91.7 - 67) * 15.5),  // 383
    y: Math.round((36 - 26.1) * 18.0),  // 178
    color: '#00ff88',
    r: 4,
    staticRings: [9, 16],
    pulseMax: 50,
    pulseDur: '2.6s',
  },
]

/* ── Satellite telemetry lines ── */
const SAT_LINES = [
  { x1: 70,  y1: 0, x2: NODES[0].x, y2: NODES[0].y, color: '#00e5ff', delay: 0.3 },
  { x1: 240, y1: 0, x2: NODES[0].x, y2: NODES[0].y, color: '#00e5ff', delay: 0.7 },
  { x1: 420, y1: 0, x2: NODES[1].x, y2: NODES[1].y, color: '#00ff88', delay: 1.1 },
]

/* ── Graticule (lat/lon grid) ── */
//  lon lines at 70, 75, 80, 85, 90, 95°E
const LON_GRID = [70, 75, 80, 85, 90, 95].map(lon => ({
  x: (lon - 67) * 15.5, label: `${lon}°E`,
}))
//  lat lines at 10, 15, 20, 25, 30, 35°N
const LAT_GRID = [10, 15, 20, 25, 30, 35].map(lat => ({
  y: (36 - lat) * 18.0, label: `${lat}°N`,
}))

/* ── Reference city dots (very subtle) ── */
const CITIES = [
  { n: 'MUM', x: Math.round((72.9-67)*15.5), y: Math.round((36-18.9)*18) }, // 91,308
  { n: 'HYD', x: Math.round((78.5-67)*15.5), y: Math.round((36-17.4)*18) }, // 178,334
  { n: 'CHN', x: Math.round((80.3-67)*15.5), y: Math.round((36-13.1)*18) }, // 206,412
  { n: 'KOL', x: Math.round((88.4-67)*15.5), y: Math.round((36-22.6)*18) }, // 332,241
]

/* ── Major internal reference lines (state boundary hints) ── */
// Rajasthan/UP border ~29°N horizontal (very subtle)
// Karnataka/AP divide ~17°N
const REF_LINES = [
  { x1: 78, y1: 144, x2: 209, y2: 143, opacity: 0.06 },
  { x1: 97, y1: 349, x2: 250, y2: 342, opacity: 0.06 },
]

/* ─────────────────────────────────────────────────────────────────────
   INDIA MAP COMPONENT
───────────────────────────────────────────────────────────────────── */
function IndiaMap() {
  return (
    <svg
      viewBox="0 0 500 540"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        {/* Vertical scan sweep */}
        <linearGradient id="vsweep" x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#00e5ff" stopOpacity="0" />
          <stop offset="42%"  stopColor="#00e5ff" stopOpacity="0.10" />
          <stop offset="50%"  stopColor="#00e5ff" stopOpacity="0.80" />
          <stop offset="58%"  stopColor="#00e5ff" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
        </linearGradient>

        {/* Scan trail (clipped to India) */}
        <linearGradient id="trail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#00e5ff" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
        </linearGradient>

        {/* India interior fill */}
        <radialGradient id="india-bg" cx="35%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#0055cc" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#001133" stopOpacity="0.04" />
        </radialGradient>

        {/* Node glow */}
        <filter id="ng" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>

        {/* Border subtle glow */}
        <filter id="bg" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="0.6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>

        {/* Clip scan to India */}
        <clipPath id="india-clip">
          <path d={INDIA_PATH}/>
        </clipPath>
      </defs>

      {/* ── Graticule grid ── */}
      {LON_GRID.map(g => (
        <line key={g.label} x1={g.x} y1={0} x2={g.x} y2={540}
          stroke="rgba(0,229,255,0.04)" strokeWidth="0.5" strokeDasharray="2,10"/>
      ))}
      {LAT_GRID.map(g => (
        <line key={g.label} x1={0} y1={g.y} x2={500} y2={g.y}
          stroke="rgba(0,229,255,0.04)" strokeWidth="0.5" strokeDasharray="2,10"/>
      ))}

      {/* ── State boundary reference lines ── */}
      {REF_LINES.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={`rgba(0,229,255,${l.opacity})`}
          strokeWidth="0.4" strokeDasharray="3,8"/>
      ))}

      {/* ── India interior fill ── */}
      <path d={INDIA_PATH} fill="url(#india-bg)"/>

      {/* ── Scan trail clipped to India ── */}
      <rect x="0" y="0" width="500" height="45" fill="url(#trail)" clipPath="url(#india-clip)">
        <animate attributeName="y" from="-45" to="555" dur="3.6s" repeatCount="indefinite" calcMode="linear"/>
      </rect>

      {/* ── Satellite telemetry lines ── */}
      {SAT_LINES.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={l.color} strokeWidth="0.5" strokeDasharray="4,8" opacity="0">
          <animate attributeName="opacity" values="0;0.30;0.30;0"
            dur="5s" begin={`${l.delay}s`} repeatCount="indefinite"/>
        </line>
      ))}

      {/* ── Static radar rings (Delhi only) ── */}
      {NODES[0].staticRings.map((r, i) => (
        <circle key={i} cx={NODES[0].x} cy={NODES[0].y} r={r}
          fill="none" stroke="#00e5ff" strokeWidth="0.35"
          strokeDasharray="3,9" opacity={0.12 - i * 0.03}/>
      ))}

      {/* ── India border — thin professional stroke ── */}
      <path d={INDIA_PATH} fill="none" stroke="#00e5ff"
        strokeWidth="0.85" filter="url(#bg)" opacity="0.80"/>
      {/* Crisp hairline repeat */}
      <path d={INDIA_PATH} fill="none" stroke="#ffffff"
        strokeWidth="0.25" opacity="0.15"/>

      {/* ── Vertical scan sweep line ── */}
      <rect x="0" y="0" width="500" height="16" fill="url(#vsweep)" opacity="0.90">
        <animate attributeName="y" from="-16" to="556" dur="3.6s" repeatCount="indefinite" calcMode="linear"/>
      </rect>

      {/* ── Reference city dots ── */}
      {CITIES.map(c => (
        <g key={c.n}>
          <circle cx={c.x} cy={c.y} r="1.2" fill="rgba(0,229,255,0.3)"/>
          <text x={c.x+3} y={c.y+1} fontSize="3.5"
            fill="rgba(0,229,255,0.25)" fontFamily="monospace">{c.n}</text>
        </g>
      ))}

      {/* ── Expanding pulse rings ── */}
      {NODES.map((n, ni) => (
        [0, n.pulseDur === '3.2s' ? 1.6 : 1.3].map((begin, pi) => (
          <circle key={`ep${ni}-${pi}`} cx={n.x} cy={n.y}
            r={n.r} fill="none" stroke={n.color} strokeWidth="0.7">
            <animate attributeName="r"
              from={n.r} to={n.pulseMax}
              dur={n.pulseDur} begin={`${begin}s`} repeatCount="indefinite"/>
            <animate attributeName="opacity"
              from="0.55" to="0"
              dur={n.pulseDur} begin={`${begin}s`} repeatCount="indefinite"/>
          </circle>
        ))
      ))}

      {/* ── Node markers ── */}
      {NODES.map((n, ni) => (
        <g key={n.id} filter="url(#ng)">
          {/* Pulsing outer ring */}
          <circle cx={n.x} cy={n.y} r={n.r + 0.5}
            fill="none" stroke={n.color} strokeWidth="0.8">
            <animate attributeName="r"
              values={`${n.r};${n.r * 2.8};${n.r}`}
              dur={`${1.8 + ni * 0.5}s`} repeatCount="indefinite"/>
            <animate attributeName="opacity"
              values="0.80;0;0.80"
              dur={`${1.8 + ni * 0.5}s`} repeatCount="indefinite"/>
          </circle>

          {/* Core dot */}
          <circle cx={n.x} cy={n.y} r={n.r * 0.55} fill={n.color} opacity="0.95">
            <animate attributeName="r"
              values={`${n.r*0.45};${n.r*0.65};${n.r*0.45}`}
              dur={`${1.8 + ni * 0.5}s`} repeatCount="indefinite"/>
          </circle>

          {/* Crosshair arms */}
          <line x1={n.x-13} y1={n.y} x2={n.x-7}  y2={n.y} stroke={n.color} strokeWidth="0.6" opacity="0.65"/>
          <line x1={n.x+7}  y1={n.y} x2={n.x+13} y2={n.y} stroke={n.color} strokeWidth="0.6" opacity="0.65"/>
          <line x1={n.x} y1={n.y-13} x2={n.x} y2={n.y-7}  stroke={n.color} strokeWidth="0.6" opacity="0.65"/>
          <line x1={n.x} y1={n.y+7}  x2={n.x} y2={n.y+13} stroke={n.color} strokeWidth="0.6" opacity="0.65"/>

          {/* Target-lock corner brackets */}
          <path d={`M${n.x-11},${n.y-7} L${n.x-11},${n.y-11} L${n.x-7},${n.y-11}`}
            fill="none" stroke={n.color} strokeWidth="0.6" opacity="0.58"/>
          <path d={`M${n.x+7},${n.y-11} L${n.x+11},${n.y-11} L${n.x+11},${n.y-7}`}
            fill="none" stroke={n.color} strokeWidth="0.6" opacity="0.58"/>
          <path d={`M${n.x-11},${n.y+7} L${n.x-11},${n.y+11} L${n.x-7},${n.y+11}`}
            fill="none" stroke={n.color} strokeWidth="0.6" opacity="0.58"/>
          <path d={`M${n.x+7},${n.y+11} L${n.x+11},${n.y+11} L${n.x+11},${n.y+7}`}
            fill="none" stroke={n.color} strokeWidth="0.6" opacity="0.58"/>

          {/* Label pill */}
          <rect x={n.x+15} y={n.y-5.5} width={ni===0?52:44} height="10" rx="1.2"
            fill="rgba(0,4,16,0.82)"/>
          <rect x={n.x+15} y={n.y-5.5} width="2" height="10" fill={n.color} opacity="0.75"/>
          <text x={n.x+19} y={n.y+1.5} fontSize="5.5"
            fill={n.color} fontFamily="monospace" letterSpacing="0.4" fontWeight="600">
            {n.label}
          </text>
          <text x={n.x+15} y={n.y+9} fontSize="3.8"
            fill={`${n.color}66`} fontFamily="monospace">
            {n.coord}
          </text>
          {/* KP value above marker */}
          <text x={n.x-5} y={n.y-16} fontSize="4"
            fill={`${n.color}55`} fontFamily="monospace" textAnchor="middle">
            {ni === 0 ? 'KP 4.2' : 'KP 3.8'}
          </text>
        </g>
      ))}

      {/* ── Geographic coordinate edge labels ── */}
      {LON_GRID.map(g => (
        <text key={g.label} x={g.x} y={534} fontSize="4.2"
          fill="rgba(0,229,255,0.28)" fontFamily="monospace" textAnchor="middle">
          {g.label}
        </text>
      ))}
      {LAT_GRID.map(g => (
        <text key={g.label} x="3" y={g.y + 1.5} fontSize="4.2"
          fill="rgba(0,229,255,0.28)" fontFamily="monospace">
          {g.label}
        </text>
      ))}

      {/* Axis tick marks */}
      {LON_GRID.map(g => (
        <line key={`t${g.label}`} x1={g.x} y1={528} x2={g.x} y2={532}
          stroke="rgba(0,229,255,0.25)" strokeWidth="0.5"/>
      ))}
      {LAT_GRID.map(g => (
        <line key={`t${g.label}`} x1={0} y1={g.y} x2={4} y2={g.y}
          stroke="rgba(0,229,255,0.25)" strokeWidth="0.5"/>
      ))}
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────
   MAIN LOADER EXPORT
───────────────────────────────────────────────────────────────────── */
export default function MagStormLoader({ visible, mode = 'live' }) {
  const [progress,  setProgress]  = useState(0)
  const [progLabel, setProgLabel] = useState(PROGRESS_LABELS[0].text)

  useEffect(() => {
    if (!visible) { setProgress(0); setProgLabel(PROGRESS_LABELS[0].text); return }
    const TOTAL = 3600, TICK = 50
    const INC   = 99 / (TOTAL / TICK)
    let cur = 0
    const id = setInterval(() => {
      cur = Math.min(99, cur + INC)
      setProgress(cur)
      const m = [...PROGRESS_LABELS].reverse().find(l => cur >= l.at)
      if (m) setProgLabel(m.text)
      if (cur >= 99) clearInterval(id)
    }, TICK)
    return () => clearInterval(id)
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <Motion.div
          key="ms-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02, filter: 'blur(5px)' }}
          transition={{ duration: 0.45 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'radial-gradient(ellipse 150% 110% at 50% 15%, #061424 0%, #020a1c 52%, #030d22 100%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            overflow: 'hidden', height: '100vh', width: '100vw',
          }}
        >
          <style>{`
            @keyframes ms-star  { 0%,100%{opacity:.06} 50%{opacity:.48}  }
            @keyframes ms-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.38;transform:scale(1.5)} }
            @keyframes ms-spin  { to{transform:rotate(360deg)} }
            @keyframes ms-slide { 0%{transform:translateX(-130%)} 100%{transform:translateX(330%)} }
            @keyframes ms-blink { 0%,100%{opacity:.35} 50%{opacity:1}  }
            @keyframes ms-brack { 0%,100%{opacity:.25} 50%{opacity:.68} }
          `}</style>

          {/* Scanlines */}
          <div style={{
            position:'absolute',inset:0,pointerEvents:'none',zIndex:0,
            backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.055) 2px,rgba(0,0,0,0.055) 4px)',
          }}/>

          {/* Ambient glows */}
          <div style={{ position:'absolute',width:900,height:650,borderRadius:'50%',
            top:'-22%',left:'50%',transform:'translateX(-50%)',
            background:'radial-gradient(ellipse,rgba(0,55,190,0.12) 0%,transparent 70%)',
            pointerEvents:'none' }}/>
          <div style={{ position:'absolute',width:550,height:450,borderRadius:'50%',
            bottom:'-8%',right:'-4%',
            background:'radial-gradient(ellipse,rgba(0,229,255,0.05) 0%,transparent 70%)',
            pointerEvents:'none' }}/>

          {/* Stars */}
          <div style={{ position:'absolute',inset:0,pointerEvents:'none',zIndex:1 }}>
            {STARS.map((s,i) => (
              <div key={i} style={{
                position:'absolute',left:`${s.x}%`,top:`${s.y}%`,
                width:s.r*2,height:s.r*2,borderRadius:'50%',
                background:'#fff',opacity:s.opacity,
                animation:s.pulse?`ms-star ${s.dur}s ease-in-out infinite`:'none',
              }}/>
            ))}
          </div>

          {/* Screen corner brackets */}
          {[
            { top:14,left:14,   borderTop:'1px solid rgba(0,229,255,0.48)',borderLeft:'1px solid rgba(0,229,255,0.48)' },
            { top:14,right:14,  borderTop:'1px solid rgba(0,229,255,0.48)',borderRight:'1px solid rgba(0,229,255,0.48)' },
            { bottom:14,left:14,  borderBottom:'1px solid rgba(0,229,255,0.48)',borderLeft:'1px solid rgba(0,229,255,0.48)' },
            { bottom:14,right:14, borderBottom:'1px solid rgba(0,229,255,0.48)',borderRight:'1px solid rgba(0,229,255,0.48)' },
          ].map((s,i) => (
            <div key={i} style={{
              position:'absolute',width:28,height:28,zIndex:10,
              animation:`ms-brack ${3+i*0.3}s ease-in-out infinite`, ...s,
            }}/>
          ))}

          {/* ─── MAIN CONTENT ─── */}
          <div style={{
            position:'relative',zIndex:2,
            width:'100%',maxWidth:'97vw',
            padding:'10px 20px',
            display:'flex',flexDirection:'column',gap:8,
          }}>

            {/* ── TOP HEADER ── */}
            <Motion.div
              initial={{ opacity:0, y:-14 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.55, ease:'easeOut' }}
            >
              {/* System status row */}
              <div style={{
                display:'flex',justifyContent:'space-between',alignItems:'center',
                paddingBottom:6,marginBottom:8,
                borderBottom:'1px solid rgba(0,229,255,0.1)',
              }}>
                <div style={{ display:'flex',gap:14,alignItems:'center' }}>
                  <span style={{ fontSize:7.5,color:'rgba(0,229,255,0.42)',letterSpacing:'1.5px' }}>SYS: ONLINE</span>
                  <span style={{ fontSize:7.5,color:'#35f28c',letterSpacing:'1.2px',animation:'ms-blink 2s ease-in-out infinite',display:'inline-flex',alignItems:'center',gap:4 }}>
                    <span style={{width:5,height:5,borderRadius:'50%',background:'#35f28c',display:'inline-block',boxShadow:'0 0 4px #35f28c'}}/>
                    TELEMETRY ACTIVE
                  </span>
                  <span style={{ fontSize:7.5,color:'rgba(0,229,255,0.35)',letterSpacing:'1.2px' }}>DEFCON 4</span>
                </div>
                <div style={{ display:'flex',gap:14 }}>
                  <span style={{ fontSize:7.5,color:'rgba(255,191,31,0.65)',letterSpacing:'1px' }}>THREAT: ELEVATED</span>
                  <span style={{ fontSize:7.5,color:'rgba(0,229,255,0.38)',letterSpacing:'1px' }}>
                    {new Date().toUTCString().slice(0,16).toUpperCase()} UTC
                  </span>
                </div>
              </div>

              {/* Title row */}
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:14 }}>
                <div style={{
                  width:38,height:38,borderRadius:'50%',flexShrink:0,
                  border:'1px solid rgba(0,229,255,0.38)',background:'rgba(0,229,255,0.06)',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,
                  boxShadow:'0 0 16px rgba(0,229,255,0.18),inset 0 0 16px rgba(0,229,255,0.05)',
                  animation:'ms-pulse 3.5s ease-in-out infinite',
                }}>
                  <Shield size={18} color="rgba(0,229,255,0.75)" strokeWidth={1.5} />
                </div>
                <div style={{ textAlign:'center' }}>
                  <h1 style={{
                    margin:0,fontSize:'clamp(22px,3.6vw,46px)',
                    fontWeight:900,letterSpacing:'0.26em',
                    background:'linear-gradient(180deg,#fff 0%,#7dd8ff 32%,#00e5ff 62%,#005eaa 100%)',
                    WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
                    filter:'drop-shadow(0 0 24px rgba(0,229,255,0.40))',lineHeight:1.04,
                  }}>MAGSTORM SHIELD</h1>
                  <p style={{
                    margin:'4px 0 0',fontSize:9,letterSpacing:'3px',
                    color:'rgba(0,229,255,0.58)',textTransform:'uppercase',
                  }}>
                    Space Weather Intelligence Platform · India Command Center
                  </p>
                </div>
                <div style={{
                  padding:'4px 12px',borderRadius:4,flexShrink:0,
                  border:'1px solid rgba(255,191,31,0.3)',background:'rgba(255,191,31,0.07)',
                  fontSize:7.5,color:'#ffbf1f',letterSpacing:'2px',
                  animation:'ms-blink 2.8s ease-in-out infinite',
                }}>
                  {mode.toUpperCase()} MODE
                </div>
              </div>
            </Motion.div>

            {/* ── TWO-COLUMN GRID ── */}
            <div style={{
              display:'grid',gridTemplateColumns:'1fr 295px',gap:10,minHeight:0,
            }}>

              {/* LEFT — India Geospatial Map */}
              <Motion.div
                initial={{ opacity:0, scale:0.97 }}
                animate={{ opacity:1, scale:1 }}
                transition={{ delay:0.2, duration:0.65, ease:'easeOut' }}
                style={{
                  position:'relative',
                  border:'1px solid rgba(0,229,255,0.17)',borderRadius:8,
                  background:'rgba(0,4,16,0.96)',overflow:'hidden',
                  boxShadow:'0 0 40px rgba(0,229,255,0.06),inset 0 0 80px rgba(0,18,58,0.55)',
                  display:'flex',flexDirection:'column',minHeight:0,
                }}
              >
                {/* Top glow edge */}
                <div style={{
                  position:'absolute',top:0,left:0,right:0,height:1,
                  background:'linear-gradient(90deg,transparent,rgba(0,229,255,0.7) 50%,transparent)',
                }}/>

                {/* Map header */}
                <div style={{
                  display:'flex',justifyContent:'space-between',alignItems:'center',
                  padding:'6px 12px',borderBottom:'1px solid rgba(0,229,255,0.08)',
                  background:'rgba(0,4,16,0.7)',flexShrink:0,
                }}>
                  <span style={{ fontSize:7.5,color:'rgba(0,229,255,0.55)',letterSpacing:'2px' }}>
                    INDIA GEOSPATIAL INTELLIGENCE · ACTIVE
                  </span>
                  <span style={{ fontSize:7.5,color:'#35f28c',letterSpacing:'1.5px',animation:'ms-blink 2.2s ease-in-out infinite',display:'inline-flex',alignItems:'center',gap:4 }}>
                    <span style={{width:5,height:5,borderRadius:'50%',background:'#35f28c',display:'inline-block',boxShadow:'0 0 4px #35f28c'}}/>
                    RADAR SWEEP · 3.6s
                  </span>
                  <span style={{ fontSize:7.5,color:'rgba(0,229,255,0.42)',letterSpacing:'1.5px' }}>
                    2 SECTORS
                  </span>
                </div>

                {/* Inner corner brackets */}
                {[
                  { top:24,left:7,  borderTop:'1px solid rgba(0,229,255,0.38)',borderLeft:'1px solid rgba(0,229,255,0.38)' },
                  { top:24,right:7, borderTop:'1px solid rgba(0,229,255,0.38)',borderRight:'1px solid rgba(0,229,255,0.38)' },
                  { bottom:24,left:7,  borderBottom:'1px solid rgba(0,229,255,0.38)',borderLeft:'1px solid rgba(0,229,255,0.38)' },
                  { bottom:24,right:7, borderBottom:'1px solid rgba(0,229,255,0.38)',borderRight:'1px solid rgba(0,229,255,0.38)' },
                ].map((s,i) => (
                  <div key={i} style={{ position:'absolute',width:11,height:11,zIndex:4,opacity:0.55,...s }}/>
                ))}

                {/* SVG Map */}
                <div style={{ flex:1,padding:'5px 8px 5px',minHeight:0,overflow:'hidden' }}>
                  <IndiaMap/>
                </div>

                {/* Map footer */}
                <div style={{
                  display:'flex',justifyContent:'space-between',alignItems:'center',
                  padding:'5px 12px',borderTop:'1px solid rgba(0,229,255,0.08)',
                  background:'rgba(0,4,16,0.7)',flexShrink:0,
                }}>
                  <span style={{ fontSize:7,color:'rgba(0,229,255,0.38)',letterSpacing:'1px' }}>
                    CYLINDRICAL · WGS-84 · PROJ:EQ-RECT
                  </span>
                  <span style={{ fontSize:7,color:'rgba(0,229,255,0.38)',letterSpacing:'1px' }}>
                    67°E – 97°E · 8°N – 36°N
                  </span>
                  <span style={{ fontSize:7,color:'#35f28c',letterSpacing:'1px' }}>LIVE</span>
                </div>
              </Motion.div>

              {/* RIGHT — Telemetry Panel */}
              <Motion.div
                initial={{ opacity:0, x:18 }}
                animate={{ opacity:1, x:0 }}
                transition={{ delay:0.32,duration:0.6,ease:'easeOut' }}
                style={{
                  display:'flex',flexDirection:'column',gap:7,
                  border:'1px solid rgba(0,229,255,0.14)',borderRadius:8,
                  background:'rgba(0,4,16,0.78)',padding:'9px 10px',
                  backdropFilter:'blur(12px)',
                  boxShadow:'inset 0 0 40px rgba(0,18,58,0.45)',
                  overflow:'hidden',minHeight:0,
                }}
              >
                {/* Panel title */}
                <div style={{
                  display:'flex',justifyContent:'space-between',alignItems:'center',
                  paddingBottom:6,borderBottom:'1px solid rgba(0,229,255,0.1)',
                }}>
                  <span style={{ fontSize:7.5,color:'rgba(0,229,255,0.52)',letterSpacing:'2px' }}>SYSTEMS STATUS</span>
                  <span style={{ fontSize:7.5,color:'#35f28c',letterSpacing:'1px',animation:'ms-blink 1.9s ease-in-out infinite',display:'inline-flex',alignItems:'center',gap:4 }}>
                    <span style={{width:5,height:5,borderRadius:'50%',background:'#35f28c',display:'inline-block',boxShadow:'0 0 4px #35f28c'}}/>
                    ONLINE
                  </span>
                </div>

                {/* Status cards */}
                <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
                  {STATUS_ITEMS.map(item => (
                    <Motion.div
                      key={item.id}
                      initial={{ opacity:0,x:14 }}
                      animate={{ opacity:1,x:0 }}
                      transition={{ delay:item.delay,type:'spring',stiffness:200,damping:22 }}
                      style={{
                        display:'flex',alignItems:'center',gap:8,
                        background:`${item.color}08`,
                        border:`1px solid ${item.color}28`,
                        borderLeft:`2.5px solid ${item.color}`,
                        borderRadius:5,padding:'6px 9px',
                      }}
                    >
                      <div style={{
                        width:17,height:17,borderRadius:'50%',
                        background:`${item.color}16`,border:`1px solid ${item.color}50`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        flexShrink:0,
                        animation:item.spin?'ms-spin 1.6s linear infinite':'none',
                      }}>
                        {item.spin
                          ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                          : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        }
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:8.5,color:item.color,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize:7.5,color:`${item.color}80`,marginTop:1,letterSpacing:'0.7px',textTransform:'uppercase' }}>
                          {item.sub}
                        </div>
                      </div>
                      <div style={{
                        width:5,height:5,borderRadius:'50%',
                        background:item.color,boxShadow:`0 0 5px ${item.color}`,flexShrink:0,
                        animation:item.spin?'ms-pulse 1.4s ease-in-out infinite':'none',
                      }}/>
                    </Motion.div>
                  ))}
                </div>

                {/* Terminal feed */}
                <div style={{
                  flex:1,background:'rgba(0,0,0,0.55)',
                  border:'1px solid rgba(0,229,255,0.11)',borderRadius:5,
                  overflow:'hidden',position:'relative',minHeight:0,maxHeight:155,
                }}>
                  <div style={{
                    display:'flex',alignItems:'center',gap:5,padding:'5px 9px',
                    borderBottom:'1px solid rgba(0,229,255,0.09)',background:'rgba(0,0,0,0.4)',
                  }}>
                    {['#ff5f57','#febc2e','#28c840'].map(c => (
                      <span key={c} style={{ width:6,height:6,borderRadius:'50%',background:c,display:'inline-block' }}/>
                    ))}
                    <span style={{ fontSize:7,color:'rgba(0,229,255,0.4)',letterSpacing:'1.2px',marginLeft:4 }}>
                      TELEMETRY STREAM
                    </span>
                    <span style={{ marginLeft:'auto',fontSize:7,color:'#35f28c',animation:'ms-blink 1.6s ease-in-out infinite',display:'inline-flex',alignItems:'center',gap:3 }}>
                      <span style={{width:4,height:4,borderRadius:'50%',background:'#35f28c',display:'inline-block'}}/>
                      REC
                    </span>
                  </div>
                  <div style={{
                    position:'absolute',inset:0,pointerEvents:'none',
                    backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.05) 3px,rgba(0,0,0,0.05) 4px)',
                  }}/>
                  <div style={{ padding:'7px 9px',display:'flex',flexDirection:'column',gap:2.5,position:'relative' }}>
                    {FEED_LINES.map((line,i) => (
                      <Motion.div key={i}
                        initial={{ opacity:0 }} animate={{ opacity:1 }}
                        transition={{ delay:line.delay }}
                        style={{ fontSize:8,color:line.color,letterSpacing:'0.4px',lineHeight:1.5,whiteSpace:'nowrap' }}
                      >{line.text}</Motion.div>
                    ))}
                    <div style={{ fontSize:9,color:'#00e5ff',animation:'ms-blink 0.8s ease-in-out infinite',marginTop:2 }}>▌</div>
                  </div>
                </div>

                {/* Scan rows */}
                <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
                  {[
                    { text:'SCANNING GRID INFRASTRUCTURE', color:'#35f28c',done:true, delay:0.5 },
                    { text:'ANALYZING GEOMAGNETIC RISK',   color:'#35f28c',done:true, delay:1.1 },
                    { text:'COMPUTING IMPACT FORECAST',    color:'#ffbf1f',done:false,delay:1.7 },
                  ].map(row => (
                    <Motion.div key={row.text}
                      initial={{ opacity:0,x:-10 }} animate={{ opacity:1,x:0 }}
                      transition={{ delay:row.delay,duration:0.45 }}
                      style={{ display:'flex',alignItems:'center',gap:7 }}
                    >
                      <span style={{
                        width:5,height:5,borderRadius:'50%',flexShrink:0,
                        background:row.color,boxShadow:`0 0 5px ${row.color}`,display:'inline-block',
                        animation:row.done?'none':'ms-pulse 1.4s ease-in-out infinite',
                      }}/>
                      <span style={{ fontSize:7.5,color:row.color,letterSpacing:'1.4px',textTransform:'uppercase' }}>
                        {row.text}
                        {!row.done && <span style={{ animation:'ms-blink 0.8s ease-in-out infinite',marginLeft:3 }}>▌</span>}
                      </span>
                    </Motion.div>
                  ))}
                </div>

                {/* Progress bar */}
                <Motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:5 }}>
                    <span style={{
                      fontSize:7.5,color:'rgba(0,229,255,0.6)',letterSpacing:'0.8px',
                      textTransform:'uppercase',flex:1,marginRight:6,
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                    }}>{progLabel}</span>
                    <span style={{
                      fontSize:14,fontWeight:800,color:'#00e5ff',flexShrink:0,
                      textShadow:'0 0 12px rgba(0,229,255,0.9),0 0 24px rgba(0,229,255,0.4)',
                    }}>{Math.round(progress)}%</span>
                  </div>
                  <div style={{
                    height:4,borderRadius:2,background:'rgba(0,229,255,0.07)',
                    border:'1px solid rgba(0,229,255,0.18)',overflow:'hidden',position:'relative',
                  }}>
                    <div style={{
                      height:'100%',borderRadius:2,
                      background:'linear-gradient(90deg,#00337a,#0077cc,#00aaee,#00e5ff)',
                      boxShadow:'0 0 10px rgba(0,229,255,0.9),0 0 20px rgba(0,229,255,0.4)',
                      width:`${progress}%`,transition:'width 70ms linear',
                      position:'relative',overflow:'hidden',
                    }}>
                      <div style={{
                        position:'absolute',inset:0,
                        background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.55) 50%,transparent)',
                        animation:'ms-slide 1.4s linear infinite',
                      }}/>
                    </div>
                  </div>
                  <div style={{ display:'flex',justifyContent:'space-between',marginTop:3 }}>
                    {[0,25,50,75,100].map(v => (
                      <span key={v} style={{
                        fontSize:6.5,letterSpacing:'0.3px',
                        color:progress>=v?'rgba(0,229,255,0.5)':'rgba(0,229,255,0.18)',
                      }}>{v}%</span>
                    ))}
                  </div>
                </Motion.div>
              </Motion.div>
            </div>

            {/* ── BOTTOM STATUS BAR ── */}
            <Motion.div
              initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}
              transition={{ delay:0.55,duration:0.45 }}
              style={{
                display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'5px 12px',border:'1px solid rgba(0,229,255,0.1)',
                borderRadius:5,background:'rgba(0,4,16,0.65)',backdropFilter:'blur(8px)',
              }}
            >
              <div style={{ display:'flex',gap:16 }}>
                {[
                  { label:'NOAA',      status:'CONNECTED',  color:'#35f28c' },
                  { label:'NASA',      status:'CONNECTED',  color:'#35f28c' },
                  { label:'TELEMETRY', status:'ACTIVE',     color:'#35f28c' },
                  { label:'FORECAST',  status:'COMPUTING',  color:'#ffbf1f' },
                ].map(item => (
                  <div key={item.label} style={{ display:'flex',alignItems:'center',gap:5 }}>
                    <span style={{
                      width:4.5,height:4.5,borderRadius:'50%',background:item.color,
                      boxShadow:`0 0 4px ${item.color}`,display:'inline-block',
                      animation:item.color==='#ffbf1f'?'ms-pulse 1.4s ease-in-out infinite':'none',
                    }}/>
                    <span style={{ fontSize:7.5,color:'rgba(255,255,255,0.38)',letterSpacing:'0.8px' }}>{item.label}:</span>
                    <span style={{ fontSize:7.5,color:item.color,letterSpacing:'0.8px',fontWeight:700 }}>{item.status}</span>
                  </div>
                ))}
              </div>
              <div style={{
                fontSize:7.5,color:'rgba(0,229,255,0.32)',
                letterSpacing:'1.5px',textTransform:'uppercase',
                animation:'ms-blink 2.5s ease-in-out infinite',
              }}>
                MAGSTORM SHIELD v4.1 · INDIA OPERATIONS CENTER
              </div>
            </Motion.div>

          </div>
        </Motion.div>
      )}
    </AnimatePresence>
  )
}
