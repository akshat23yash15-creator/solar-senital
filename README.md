# SolarSentinel — Real-Time Space Weather Intelligence (Demo)

SolarSentinel is a production-style **multi-page React dashboard** for monitoring **space weather**, **satellite risk**, and **grid impact** using **hardcoded demo telemetry** (no external APIs).

It focuses on:
- A futuristic **UI/UX (glassmorphism + neon)** using plain CSS (no Tailwind)
- **3D visualization**: procedural Three.js Earth + orbiting/clickable satellites + orbit paths
- **Analytics & charts**: Chart.js (line/bar/pie)
- **Geospatial risk view**: Leaflet map with heat-style overlays
- **Smooth motion**: Framer Motion page transitions

> Data is intentionally static/dummy for hackathon/demo use.

---

## Tech Stack

- **Vite + React** (functional components + hooks)
- **Routing**: `react-router-dom`
- **Animations**: `framer-motion`
- **3D globe**: `three`
- **Charts**: `chart.js` + `react-chartjs-2`
- **Map**: `leaflet` + `react-leaflet`
- **Styling**: plain CSS (`src/styles/*.css`)

---

## Features (What the app does)

### Home (3D Earth Command View)
- Procedural **3D Earth** (no texture image assets)
- Subtle atmospheric glow + starfield background
- **Orbiting satellites** (colored by risk)
- **Orbit paths** (one orbit ring per satellite)
- **Click a satellite** to open a details panel (hardcoded metadata)
- Drag to rotate, scroll to zoom

### Dashboard
- High-level situation overview
- Quick alerts + recommended actions

### Satellite Risk
- Sortable table of satellites and risk
- Bar chart for risk distribution

### Grid Risk
- Leaflet global map
- Heat-style risk overlay using circles (no external heatmap plugin)

### Analytics
- Multiple charts (line/bar/pie) using Chart.js

---

## Project Structure

```text
public/
  favicon.svg
  icons.svg
src/
  main.jsx                 # App bootstrapping
  App.jsx                  # Router + layout shell
  App.js                   # Non-JSX re-export wrapper for App.jsx
  components/
    EarthScene.jsx         # Three.js globe + satellites + orbit paths
    SatelliteDetails.jsx   # Clicked satellite details panel
    Charts.jsx             # Chart.js wrappers + styling
    GridRiskMap.jsx        # Leaflet map + heat-style circles
    Sidebar.jsx            # Left navigation
    Topbar.jsx             # Status pills
    RiskBadge.jsx          # Risk pill component
    PageTransition.jsx     # Framer Motion route transitions
  pages/
    HomePage.jsx
    DashboardPage.jsx
    SatelliteRiskPage.jsx
    GridRiskPage.jsx
    AnalyticsPage.jsx
  styles/
    theme.css              # tokens (colors, glass, shadows)
    layout.css             # app shell layout
    home.css               # home-specific
    charts.css             # chart wrappers
    map.css                # map wrappers
  utils/
    dummyData.js           # all demo telemetry data
    risk.js                # risk helpers (CSS + Three color mapping)
    motion.js              # motion presets
```

---

## Setup & Run

### Prerequisites
- Node.js 18+ recommended

### Install
```bash
npm install
```

### Development
```bash
npm run dev
```
Then open: `http://localhost:5173/`

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

---

## Workflow / How the app works

### 1) App bootstrap
- `src/main.jsx` mounts React and the router.

### 2) Routing + layout
- `src/App.jsx` defines routes:
  - `/` Home
  - `/dashboard`
  - `/satellites`
  - `/grid`
  - `/analytics`
- Pages are lazy-loaded and wrapped with Framer Motion transitions.

### 3) Data flow (dummy-only)
- `src/utils/dummyData.js` is the single source of truth for demo data.
- Pages/components import it directly (no network layer).

### 4) Risk display conventions
- `src/utils/risk.js` provides:
  - `riskLevelFromScore(score)` → `low | medium | high`
  - `riskColor(level)` → CSS variable for UI
  - `riskColorThree(level)` → **hex color** for Three.js materials

### 5) 3D Earth workflow
- `src/components/EarthScene.jsx`:
  - Builds Three.js scene/camera/renderer
  - Creates a procedural CanvasTexture for Earth color
  - Adds atmosphere shader + stars
  - Spawns satellite meshes and updates their positions each frame
  - Creates orbit rings (one per satellite)
  - Handles pointer drag + wheel zoom + click picking (raycaster)
  - Cleans up all geometries/materials on unmount

### 6) Charts workflow
- `src/components/Charts.jsx` registers Chart.js elements once.
- Each page passes series from `dummyData.js`.

### 7) Map workflow
- `src/components/GridRiskMap.jsx`:
  - Renders a Leaflet map
  - Adds Circle overlays with opacity to mimic a heatmap

---

## Notes / Constraints

- **No external APIs**: the dashboard uses demo telemetry only.
- **No Tailwind**: all styling is plain CSS.
- **No image textures for Earth**: Earth is procedural to keep assets out of the repo.

---

## Troubleshooting

### "Globe looks like a ring"
- Atmosphere glow may be too intense. Adjust `intensity` in `EarthScene.jsx` shader uniforms.

### Three.js color warnings
- Ensure Three materials use `riskColorThree()` (hex), not CSS variables.

---

## License

MIT (or replace with your preferred license).
s template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
