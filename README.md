# SolarSentinel — Real-Time Space Weather Intelligence

SolarSentinel is a high-performance, neon-cyberpunk **multi-page React command center** for monitoring **live solar events**, **orbital satellite risk**, and **terrestrial geomagnetic grid & aviation impact**, powered by live neural prediction and space weather APIs.

---

## Live Data Flow & API Architecture

SolarSentinel integrates live telemetry across three real-time cloud backend services:

### 1. Solar Flare AI Prediction Service
- **Live Flare Prediction**: `POST https://solar-sentinel-v3.onrender.com/api/v1/ai/predict-live`
  - Ingests real-time NASA SOHO solar flux irradiance.
  - Returns `flare_class`, `risk_level`, `confidence_score`, `predicted_log_flux`, `real_space_flux`, and `anomaly_localization` (`region_name`, `quadrant`, `x_coordinate_percent`, `y_coordinate_percent`).
- **Manual Image Flare Prediction**: `POST https://solar-sentinel-v3.onrender.com/api/v1/ai/flare-prediction`
  - Allows uploading optical coronal images to run neural network flare classification and anomaly localization.

### 2. Terrestrial Infrastructure & Aviation Service
- **Endpoint**: `GET https://solar-sentinel-v2.onrender.com/api/v1/infrastructure/impact?mode=live`
  - **Live Telemetry**: Real solar wind velocity (`live_telemetry.speed`) and planetary Kp index (`live_telemetry.kp_index`).
  - **Storm Metadata**: Geomagnetic storm class (`storm_class`), severity color (`severity_color`), and estimated time of arrival (`formatted_eta`).
  - **Grid Heatmap Triggers**: Regional electrical grid matrices with induced risk values (`grid_heatmap_triggers`: `region`, `alert_level`, `value`, `lat`, `lng`).
  - **Aviation Advisories**: High-latitude and polar flight route alerts with operational directives (`aviation_alerts`: `route_id`, `status`, `action`).
  - **Automated Actions**: Automated grid mitigation and reactive load balancing procedures (`automated_actions`).

### 3. HelioScar Satellite Risk Service
- **Endpoint**: `GET https://solar-sentinel-1.onrender.com/api/helio-risk`
  - **Constellation Telemetry**: Fleet of verified orbital assets with Norad tracking coordinates (`all_satellites` and `curated_top_10`).
  - **Fields**: Satellite name, orbit type (LEO/MEO/GEO), altitude (`alt`), real coordinates (`lat`, `lng`), radiation dosage risk score (`risk_score`), operational status (`status`), and shielding directives (`recommendation`).
  - **Metadata**: Global alert level and coronal X-ray flux levels.

---

## Key Modules & Pages

### 1. Solar Flare Impact Center (`/flare-impact`)
- Cross-domain command dashboard correlating all three live APIs.
- Displays core prediction metrics (`flare_class`, `risk_level`, `confidence_score`, `predicted_log_flux`, `real_space_flux`).
- Visualizes solar anomaly coordinates on a dedicated Solar Disk Coordinate Matrix with clear distinction that solar percentage coordinates are not Earth coordinates.
- Interactive OpenStreetMap (React Leaflet) for grid heatmap triggers, with click-to-fly synchronization between ranked cards and map pins (no API key required).
- Aviation corridor status monitoring and satellite risk directives.

### 2. HelioScar Satellite Risk (`/satellites`)
- Curated Top 10 vs. All Satellites (1,000 assets) live toggle.
- Filter by risk level (`ALL`, `HIGH`, `MEDIUM`, `LOW`).
- Live search by satellite name, orbit, or shielding recommendation.
- Dynamic Chart.js risk profile visualization.

### 3. Globe Risk View (`/globe-risk`)
- Interactive Three.js 3D Earth rendering verified satellites from `/api/helio-risk` using real latitude, longitude, and altitude.
- No generated or fake random satellites; only satellites with API coordinates are plotted.
- Illustrative orbital rings passing through satellite positions with clear labeling that telemetry does not include TLE orbital elements.
- Filter by `ALL`, `HIGH`, `MEDIUM`, and `LOW` risk tiers. Click-to-inspect satellite details.

### 4. Operations Dashboard (`/dashboard`)
- Real-time stat cards streaming solar wind speed, Kp index, flare class, and active corridor alert counts from live APIs.
- Integrated AI Prediction Panel with live scan button and image dropzone.
- Live satellite risk leaderboard and active aviation route table.

### 5. Grid Risk (`/grid-risk` & `/grid-heatmap`)
- Regional geomagnetic induction overlays mapped onto OpenStreetMap tiles.
- Geomagnetic storm ETA and suggested operational mitigation procedures.

### 6. Home Command View (`/`)
- Rotating Three.js Earth with real-time solar wind, Kp index, flare classification, and storm ETA streaming through `TelemetryContext`.

---

## Tech Stack

- **Framework**: React 19 + Vite 8
- **Routing**: `react-router-dom`
- **Animations**: `framer-motion`
- **3D Graphics**: `three` + `@react-three/fiber`
- **Charts**: `chart.js` + `react-chartjs-2`
- **Mapping**: `leaflet` + `react-leaflet` using OpenStreetMap tiles (no API keys required)
- **HTTP Client**: `axios`
- **Icons**: `lucide-react`
- **Styling**: Vanilla CSS tokens (`src/styles/*.css`)

---

## Setup & Run

### Prerequisites
- Node.js 18+ (tested on Node 20+)

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```
Open your browser at: `http://localhost:5173/`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```
