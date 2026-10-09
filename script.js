/* =========================================
   BASE & VARIABLES
   ========================================= */
@property --bg-1   { syntax: '<color>'; inherits: true; initial-value: #020617; }
@property --bg-2   { syntax: '<color>'; inherits: true; initial-value: #0f172a; }
@property --bg-3   { syntax: '<color>'; inherits: true; initial-value: #1e1b4b; }
@property --bg-4   { syntax: '<color>'; inherits: true; initial-value: #000000; }
@property --blob-a { syntax: '<color>'; inherits: true; initial-value: #3b82f6; }
@property --blob-b { syntax: '<color>'; inherits: true; initial-value: #6366f1; }
@property --blob-c { syntax: '<color>'; inherits: true; initial-value: #8b5cf6; }

:root {
  --glass-bg: rgba(255, 255, 255, 0.03);
  --text-main: #ffffff;
  --text-soft: #cbd5e1;
  --text-muted: #94a3b8;
  --accent: #60a5fa;
  --danger: #f87171;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --gutter: 40px;
  --side-col: 350px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Inter', sans-serif;
}

body {
  min-height: 100vh;
  color: var(--text-main);
  overflow-x: hidden;
  background-color: var(--bg-4);
  transition:
    --bg-1 1.2s ease, --bg-2 1.2s ease, --bg-3 1.2s ease, --bg-4 1.2s ease,
    --blob-a 1.2s ease, --blob-b 1.2s ease, --blob-c 1.2s ease;
}

button {
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
}

button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* =========================================
   WEATHER-REACTIVE BACKGROUND MOODS
   ========================================= */
body[data-mood="night"] {
  --bg-1: #020617; --bg-2: #0f172a; --bg-3: #1e1b4b; --bg-4: #000000;
  --blob-a: #3b82f6; --blob-b: #6366f1; --blob-c: #8b5cf6;
}
body[data-mood="clear"] {
  --bg-1: #082f49; --bg-2: #0c4a6e; --bg-3: #1e3a8a; --bg-4: #020617;
  --blob-a: #0ea5e9; --blob-b: #3b82f6; --blob-c: #f59e0b;
}
body[data-mood="cloud"] {
  --bg-1: #0f172a; --bg-2: #1e293b; --bg-3: #334155; --bg-4: #020617;
  --blob-a: #64748b; --blob-b: #475569; --blob-c: #94a3b8;
}
body[data-mood="rain"] {
  --bg-1: #020617; --bg-2: #0b1d33; --bg-3: #172554; --bg-4: #000000;
  --blob-a: #1d4ed8; --blob-b: #0e7490; --blob-c: #334155;
}
body[data-mood="snow"] {
  --bg-1: #111827; --bg-2: #1e293b; --bg-3: #334155; --bg-4: #0b1120;
  --blob-a: #e2e8f0; --blob-b: #93c5fd; --blob-c: #c7d2fe;
}
body[data-mood="storm"] {
  --bg-1: #0a0a12; --bg-2: #1e1b2e; --bg-3: #2e1065; --bg-4: #000000;
  --blob-a: #a855f7; --blob-b: #4338ca; --blob-c: #facc15;
}
body[data-mood="fog"] {
  --bg-1: #111827; --bg-2: #1f2937; --bg-3: #374151; --bg-4: #030712;
  --blob-a: #9ca3af; --blob-b: #6b7280; --blob-c: #d1d5db;
}

/* =========================================
   LIVE LIQUID BACKGROUND
   ========================================= */
.bg-animation {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -2;
  background: linear-gradient(-45deg, var(--bg-1), var(--bg-2), var(--bg-3), var(--bg-4));
  background-size: 400% 400%;
  animation: gradientBG 15s ease infinite;
}

@keyframes gradientBG {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.blob {
  position: fixed;
  border-radius: 50%;
  filter: blur(90px);
  z-index: -1;
  opacity: 0.5;
  animation: float 12s infinite alternate cubic-bezier(0.45, 0.05, 0.55, 0.95);
}
.blob-1 { top: 5%; left: 5%; width: 400px; height: 400px; background: var(--blob-a); }
.blob-2 { bottom: 5%; right: 10%; width: 500px; height: 500px; background: var(--blob-b); animation-delay: -4s; }
.blob-3 { top: 40%; left: 40%; width: 300px; height: 300px; background: var(--blob-c); animation-delay: -8s; }

@keyframes float {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(50px, 50px) scale(1.1); }
}

/* =========================================
   GLASS UTILITY (with inner highlight)
   ========================================= */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: none;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  border-radius: 28px;
}

/* =========================================
   NAVBAR
   ========================================= */
.navbar {
  position: absolute;
  top: 30px;
  left: var(--gutter);
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brand {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -1px;
  background: linear-gradient(to right, #ffffff, var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.tagline {
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* =========================================
   SEARCH BAR
   ========================================= */
.search-wrapper {
  position: absolute;
  top: 30px;
  left: calc(100% - 360px);
  width: 320px;
  height: 48px;
  z-index: 100;
  transition: all 0.6s var(--ease);
}

.search-wrapper.active {
  top: 30vh;
  left: 50%;
  transform: translateX(-50%);
  width: min(600px, calc(100vw - 80px));
  height: 64px;
}

.search-box {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 32px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  transition: all 0.3s var(--ease);
}

.search-wrapper.active .search-box {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 40px rgba(96, 165, 250, 0.2), 0 20px 40px rgba(0, 0, 0, 0.4);
}

.search-box svg {
  width: 20px;
  height: 20px;
  color: var(--text-muted);
  flex-shrink: 0;
  transition: color 0.3s var(--ease), width 0.3s var(--ease), height 0.3s var(--ease);
}
.search-wrapper.active .search-box svg {
  color: #fff;
  width: 24px;
  height: 24px;
}

.search-box input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 1rem;
  margin-left: 12px;
}
.search-wrapper.active .search-box input { font-size: 1.25rem; }
.search-box input::placeholder { color: var(--text-muted); }

.dropdown {
  position: absolute;
  top: calc(100% + 12px);
  left: 0;
  width: 100%;
  max-height: 360px;
  overflow-y: auto;
  border-radius: 20px;
  padding: 8px 0;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: opacity 0.4s var(--ease), transform 0.4s var(--ease), visibility 0.4s;
}

.search-wrapper.active .dropdown.has-data {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  transition-delay: 0.1s;
}

.dropdown-item {
  padding: 14px 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}
.dropdown-item:hover,
.dropdown-item.is-active { background: rgba(255, 255, 255, 0.1); }

.dropdown-city { font-weight: 500; font-size: 1.05rem; }
.dropdown-country {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-align: right;
}

.dropdown-empty {
  padding: 14px 22px;
  font-size: 0.95rem;
  color: var(--text-muted);
}

.focus-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 90;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.6s ease;
}
.focus-overlay.active { opacity: 1; pointer-events: auto; }

/* =========================================
   DASHBOARD LAYOUT
   ========================================= */
.dashboard {
  padding: 120px var(--gutter) 40px;
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr var(--side-col);
  gap: 30px;
  align-items: stretch;
  transition: all 0.6s var(--ease);
  opacity: 1;
  transform: translateY(0) scale(1);
}

.dashboard.updating {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
  filter: blur(8px);
}

.dashboard.blur-bg { filter: blur(4px) brightness(0.6); }

.toolbar {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  min-height: 40px;
}

.status {
  font-size: 0.9rem;
  color: var(--text-muted);
}
.status.is-error { color: var(--danger); }

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.pill-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.2s var(--ease), transform 0.2s var(--ease);
}
.pill-btn:hover { background: rgba(255, 255, 255, 0.18); transform: translateY(-1px); }
.pill-btn:active { transform: scale(0.97); }
.pill-btn svg { width: 16px; height: 16px; color: var(--accent); transition: transform 0.4s var(--ease); }
.pill-btn.icon-only { width: 38px; padding: 0; justify-content: center; }
.pill-btn.icon-only:hover svg { transform: rotate(90deg); }

.unit-toggle {
  display: flex;
  height: 38px;
  padding: 4px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
}
.unit-btn {
  padding: 0 14px;
  border-radius: 16px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted);
  transition: background 0.2s ease, color 0.2s ease;
}
.unit-btn:hover { color: #fff; }
.unit-btn.active { background: #fff; color: #020617; }

.col-left,
.col-right {
  display: flex;
  flex-direction: column;
  gap: 30px;
  min-width: 0;
}

/* Shared eyebrow label + section titles */
.eyebrow {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 8px;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 22px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.section-title svg { width: 20px; height: 20px; color: var(--accent); }

/* =========================================
   CURRENT WEATHER CARD
   ========================================= */
.current-card {
  flex: 1;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 320px;
  position: relative;
  overflow: hidden;
}

.current-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.weather-icon-wrap { display: flex; }

.weather-icon-large {
  width: 80px;
  height: 80px;
  color: #fff;
  filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.35));
}

.card-city {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  border-radius: 20px;
  max-width: 60%;
}
.card-city > svg { width: 16px; height: 16px; color: var(--accent); flex-shrink: 0; }

.city-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}
.city-text span {
  font-size: 1rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.city-text small {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.current-body {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.temp-main {
  font-size: 5rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -3px;
  font-variant-numeric: tabular-nums;
}

.condition-text {
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-top: 10px;
}

.summary {
  margin-top: 14px;
  font-size: 0.95rem;
  color: var(--text-soft);
}

.hilo {
  margin-top: 6px;
  font-size: 0.9rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

/* =========================================
   METRICS
   ========================================= */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.metric-card {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  transition: transform 0.3s var(--ease), background 0.3s var(--ease);
}
.metric-card:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.06);
}

.metric-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.metric-icon {
  width: 22px;
  height: 22px;
  color: var(--accent);
}

.wind-arrow {
  display: inline-flex;
  transition: transform 0.6s var(--ease);
}
.wind-arrow svg {
  width: 18px;
  height: 18px;
  color: var(--text-soft);
}

.metric-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.metric-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.metric-value > span {
  font-size: 1.5rem;
  font-weight: 700;
}
.metric-value small {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
}

.bar {
  height: 6px;
  margin-top: 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--accent), #38bdf8);
  transition: width 0.8s var(--ease);
}

/* =========================================
   7-DAY FORECAST
   ========================================= */
.forecast-card {
  flex: 1;
  padding: 30px;
  display: flex;
  flex-direction: column;
}

.forecast-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;
}

.forecast-item {
  display: grid;
  grid-template-columns: 52px 22px 56px 1fr 84px;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  transition: background 0.2s var(--ease);
  animation: rowIn 0.5s var(--ease) both;
  animation-delay: calc(var(--i, 0) * 60ms);
}
.forecast-item:hover { background: rgba(255, 255, 255, 0.06); }
.forecast-item.is-today { background: rgba(96, 165, 250, 0.14); }

.f-day {
  font-weight: 500;
}

.f-icon {
  display: flex;
}
.f-icon svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.f-precip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.f-precip svg { width: 12px; height: 12px; }

.f-range {
  position: relative;
  height: 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
}
.f-range span {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--accent), #fbbf24);
}

.f-temps {
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.f-temps small {
  color: var(--text-muted);
  font-weight: 400;
  margin-left: 4px;
}

.empty-msg {
  color: var(--text-muted);
  font-size: 0.95rem;
  padding: 12px 0;
}

/* =========================================
   HOURLY STRIP
   ========================================= */
.hourly-card {
  grid-column: 1 / -1;
  padding: 30px;
}

.hourly-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px 2px 12px;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.hour-item {
  flex: 0 0 84px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 8px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  scroll-snap-align: start;
  transition: background 0.2s var(--ease);
  animation: rowIn 0.5s var(--ease) both;
  animation-delay: calc(var(--i, 0) * 40ms);
}
.hour-item:hover { background: rgba(255, 255, 255, 0.09); }
.hour-item.is-now { background: rgba(96, 165, 250, 0.18); }

.h-time {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
}
.h-icon {
  width: 26px;
  height: 26px;
  color: #fff;
}
.h-temp {
  font-size: 1.1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.h-precip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.h-precip svg { width: 12px; height: 12px; }

/* =========================================
   SKELETON LOADERS
   ========================================= */
@keyframes shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.is-loading .sk-target {
  display: inline-block;
  min-width: 120px;
  color: transparent !important;
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.14) 37%, rgba(255, 255, 255, 0.04) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}
.is-loading .condition-text.sk-target { min-width: 180px; }

.sk {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.12) 37%, rgba(255, 255, 255, 0.04) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}
.forecast-item.sk { height: 46px; animation-delay: 0s; }
.hour-item.sk { height: 124px; animation-delay: 0s; }

/* =========================================
   ENTRANCE ANIMATION
   ========================================= */
@keyframes rowIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

/* =========================================
   FOOTER
   ========================================= */
.site-footer {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--gutter) 28px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-muted);
}
.site-footer a {
  color: var(--accent);
  text-decoration: none;
}
.site-footer a:hover { text-decoration: underline; }

/* =========================================
   RESPONSIVE: TABLET & BELOW (≤1180px for metrics, ≤1024px for layout)
   ========================================= */
@media (max-width: 1180px) {
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 1024px) {
  .dashboard { grid-template-columns: 1fr; }
  .current-card,
  .forecast-card { flex: none; }
}

/* =========================================
   RESPONSIVE: MOBILE (≤768px)
   ========================================= */
@media (max-width: 768px) {
  :root { --gutter: 16px; }

  .navbar {
    top: 20px;
    left: var(--gutter);
  }
  .brand { font-size: 1.35rem; }

  .search-wrapper {
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 2 * var(--gutter));
    height: 52px;
  }
  .search-wrapper.active {
    top: 14vh;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 24px);
    height: 60px;
  }

  .dashboard {
    padding: 150px var(--gutter) 32px;
    gap: 20px;
  }
  .col-left,
  .col-right { gap: 20px; }

  .toolbar { gap: 12px; }
  .toolbar-actions {
    width: 100%;
    margin-left: 0;
    justify-content: space-between;
  }
  .pill-btn { padding: 0 14px; }

  .current-card { padding: 28px; min-height: 260px; }
  .weather-icon-large { width: 64px; height: 64px; }
  .temp-main { font-size: 4.5rem; }
  .condition-text { font-size: 1.1rem; }

  .metrics-grid { gap: 12px; }
  .metric-card { padding: 16px; gap: 8px; }
  .metric-icon { width: 20px; height: 20px; }
  .metric-value > span { font-size: 1.15rem; }

  .forecast-card { padding: 22px; }
  .section-title { margin-bottom: 16px; }
  .forecast-item {
    grid-template-columns: 38px 18px 44px 1fr 72px;
    gap: 8px;
    padding: 10px 6px;
  }

  .hourly-card { padding: 22px; }
  .hour-item { flex-basis: 72px; }

  .blob-2 { width: 300px; height: 300px; }
  .blob-3 { width: 220px; height: 220px; }
}

@media (max-width: 380px) {
  .brand { font-size: 1.2rem; }
  .temp-main { font-size: 3.8rem; }
  .metric-label { font-size: 0.65rem; }
  .metric-value > span { font-size: 1rem; }
  .forecast-item { grid-template-columns: 34px 16px 40px 1fr 64px; }
}

/* Respect users who prefer less motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
