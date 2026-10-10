# 🌤️ YeeWeather

![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-Personal_Use-blue?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-HTML5_%7C_CSS3_%7C_JS-orange?style=for-the-badge)

A sleek, responsive, real-time weather dashboard featuring an ultra-minimal liquid glassmorphic UI, dynamic ambient gradient backgrounds, smooth state transitions, and an interactive centered search experience. Powered by the Open-Meteo API with zero external dependencies or build steps.

🌐 **Live Demo:** [yee-weather.duckdns.org](https://yee-weather.duckdns.org)

---

## ✨ Features

* **Liquid Glassmorphism:** Custom frosted glass UI with soft backdrop blurs and floating ambient background blobs.
* **Fluid Search Overlay:** Modern top-right search bar that smoothly expands into a centered overlay on focus.
* **Real-Time Data Sync:** Live metrics for temperature, condition state, humidity, feels-like metrics, and wind speed.
* **Global Geocoding:** Instant city search powered by Open-Meteo Geocoding API with debounced autocomplete.
* **7-Day Forecast:** Minimalist daily high/low temperature outlook with weather condition icons.
* **Zero-Build Lightweight Setup:** Single-file vanilla web architecture requiring no server compilation or heavy frameworks.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3 (CSS Grid/Flexbox, Backdrop Filter Effects, Keyframe Animations), Vanilla JavaScript (ES6+ Fetch API, DOM Async Handler)
* **API Engine:** Open-Meteo Forecast & Geocoding APIs
* **Deployment & Networking:** Vercel Hosting with custom DuckDNS resolution

---

## 📁 Repository Structure

```text
YeeWeather/
└── index.html      # Consolidated single-file dashboard app
