# 🌊 YeeWeather | Liquid Glass Dashboard

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

A modern, minimalist, real-time weather application engineered with **Vanilla Web Technologies** and powered by the **Open-Meteo API**. **YeeWeather** features an ultra-fluid **Liquid Glassmorphism** design aesthetic, ambient dark gradients, smooth state transitions, and responsive micro-interactions.

---

## 📸 Preview & Highlights

- **Liquid Search Experience:** Search bar expands and centers smoothly with an ambient dark overlay upon user focus.
- **Dynamic Atmospheric Background:** CSS keyframe-animated multi-color ambient dark gradient with floating glass blur blobs.
- **Zero-Dependency Architecture:** Built strictly without external JavaScript frameworks or heavy node modules for maximum portability and fast load times.

---

## ✨ Features

### 🌡️ Real-Time Atmospheric Metrics
- Live temperature readouts with dynamic condition icons.
- Humidity percentage, wind speed, and feels-like temperature indicators.

### 🔍 Smart Autocomplete Geocoding
- Real-time global city search powered by the Open-Meteo Geocoding API.
- Built-in debouncing to reduce unnecessary API network calls during user input.

### 📅 7-Day Extended Outlook
- Multi-day weekly weather forecast.
- Highlights high/low temperature ranges with weather condition indicators.

### 🎨 High-End Glassmorphic Visuals
- Borderless frosted glass containers (`backdrop-filter: blur()`).
- Responsive single-page layout designed for desktop and mobile viewports.

---

## 🛠️ Tech Stack & Resources

| Domain | Technology |
| :--- | :--- |
| **Markup & Layout** | HTML5 (Semantic Structure) |
| **Styling & Effects** | CSS3 (Flexbox, CSS Grid, Keyframe Animations, Glassmorphism) |
| **Logic & Data** | ES6+ Modern JavaScript (`Fetch API`, `Async/Await`, Event Delegation) |
| **Icons** | [Feather Icons](https://feathericons.com/) |
| **Typography** | [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts) |
| **Data Provider** | [Open-Meteo Weather API](https://open-meteo.com/) |

---

## 📁 Project Structure

Because YeeWeather is engineered with a ultra-lightweight architecture, the repository remains completely clean:

```text
yeeweather/
├── index.html        # Main HTML file containing UI structure, CSS styling, and JS logic
├── README.md         # Documentation & repository overview
└── LICENSE           # MIT Open Source License
```

---

## 🚀 Quick Start & Local Setup

Since YeeWeather has zero build steps or package manager dependencies, setting it up locally takes seconds.

### Prerequisites
- Any modern web browser (Google Chrome, Mozilla Firefox, Safari, Microsoft Edge).

### Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/yeeweather.git
   ```
2. **Navigate to the project directory:**
   ```bash
   cd yeeweather
   ```
3. **Launch the application:**
   - Double-click `index.html` to open it in your browser, or run a local web server via VS Code (Live Server extension).

---

## 🌐 Deployment Instructions

### Deploying to Vercel (Recommended)

#### Option A: Via Vercel CLI
1. Install the Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```
2. Run the deployment command inside the project directory:
   ```bash
   vercel
   ```
3. Follow the quick terminal prompts to publish your live site.

#### Option B: Via Vercel Dashboard
1. Push your code to a GitHub repository.
2. Visit [Vercel.com](https://vercel.com) and log in.
3. Click **Add New...** > **Project** and import your `yeeweather` repository.
4. Keep the Framework Preset as **Other** and click **Deploy**.

---

## 📜 License

This project is open-source and available for personal use only.

---

<p align="center">
  Crafted with precision for modern, aesthetic web experiences.
</p>
