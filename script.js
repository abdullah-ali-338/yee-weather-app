const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const tempDisplay = document.getElementById("tempDisplay");
const weatherIcon = document.getElementById("weatherIcon");
const conditionLabel = document.getElementById("conditionLabel");
const windDisplay = document.getElementById("windDisplay");
const cityDisplay = document.getElementById("cityDisplay");
const timeDisplay = document.getElementById("timeDisplay");
const dateDisplay = document.getElementById("dateDisplay");
const hourlyBar = document.getElementById("hourlyBar");
const forecastList = document.getElementById("forecastList");
const loading = document.getElementById("loading");
const weatherContent = document.getElementById("weatherContent");

let currentTimeZone; // undefined = browser time until the first fetch finishes
let searchTimer;
let searchToken = 0;
let lastResults = [];

function getWeatherDetails(code) {
  if (code === 0) return { label: "Clear Sky", icon: "☀️" };
  if (code === 1 || code === 2) return { label: "Partly Cloudy", icon: "⛅" };
  if (code === 3) return { label: "Cloudy", icon: "☁️" };
  if (code === 45 || code === 48) return { label: "Foggy", icon: "🌫️" };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: "Drizzle", icon: "🌦️" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: "Rainy", icon: "🌧️" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Snowy", icon: "❄️" };
  if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", icon: "🌩️" };
  return { label: "Clear", icon: "☀️" };
}

// +18 / 0 / -3
function fmtTemp(value) {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function updateClock() {
  const now = new Date();
  const tz = currentTimeZone ? { timeZone: currentTimeZone } : {};
  timeDisplay.innerText = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", ...tz });
  dateDisplay.innerText = now.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", ...tz });
}
setInterval(updateClock, 1000);
updateClock();

async function fetchWeather(lat, lon, cityName) {
  loading.textContent = "Fetching Weather Data...";
  loading.classList.remove("hidden");
  weatherContent.classList.add("hidden");

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current_weather=true&hourly=temperature_2m,weathercode` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // clock follows the searched city
    currentTimeZone = data.timezone;
    updateClock();

    // current temp card
    const current = data.current_weather;
    const details = getWeatherDetails(current.weathercode);
    const todayMax = fmtTemp(data.daily.temperature_2m_max[0]);
    const todayMin = fmtTemp(data.daily.temperature_2m_min[0]);

    tempDisplay.innerText = `${fmtTemp(current.temperature)}°C`;
    weatherIcon.innerText = details.icon;
    conditionLabel.innerText = `${details.label} ${todayMax}°/${todayMin}°`;
    windDisplay.innerText = `${current.windspeed} km/h`;
    cityDisplay.innerText = cityName;

    // top bar: next 6 hours starting at the current hour
    const nowHour = current.time.slice(0, 13); // "2026-10-09T17"
    let start = data.hourly.time.findIndex((t) => t.startsWith(nowHour));
    if (start < 0) start = 0;

    let hourlyHTML = "";
    for (let i = start; i < start + 6 && i < data.hourly.time.length; i++) {
      const hourDetails = getWeatherDetails(data.hourly.weathercode[i]);
      hourlyHTML += `
        <div class="hourly-item">
          <span>${data.hourly.time[i].slice(11, 16)}</span>
          <span>${hourDetails.icon}</span>
          <strong>${fmtTemp(data.hourly.temperature_2m[i])}°</strong>
        </div>
      `;
    }
    hourlyBar.innerHTML = hourlyHTML;

    // 7-day forecast
    forecastList.innerHTML = data.daily.time
      .map((dateStr, idx) => {
        const dateFormatted = new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const dayDetails = getWeatherDetails(data.daily.weathercode[idx]);
        const max = fmtTemp(data.daily.temperature_2m_max[idx]);
        const min = fmtTemp(data.daily.temperature_2m_min[idx]);

        return `
          <div class="forecast-row">
            <span class="forecast-day">
              <span class="forecast-icon">${dayDetails.icon}</span>
              <span>${dateFormatted}</span>
            </span>
            <span class="forecast-label">${dayDetails.label}</span>
            <strong class="forecast-temps">${max}° / ${min}°</strong>
          </div>
        `;
      })
      .join("");

    loading.classList.add("hidden");
    weatherContent.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    loading.textContent = "Couldn't load weather data. Check your connection and try again.";
    loading.classList.remove("hidden");
  }
}

/* ---------- Search ---------- */

function clearResults() {
  searchToken++; // drop any in-flight search
  lastResults = [];
  searchResults.innerHTML = "";
}

function selectCity(city) {
  fetchWeather(city.latitude, city.longitude, city.name);
  clearResults();
  searchInput.value = "";
  searchInput.blur();
}

function renderResults(results) {
  searchResults.innerHTML = "";
  lastResults = results;

  results.forEach((city) => {
    const item = document.createElement("div");
    item.className = "dropdown-item";

    const name = document.createElement("span");
    name.textContent = city.admin1 ? `${city.name}, ${city.admin1}` : city.name;

    const country = document.createElement("small");
    country.textContent = city.country || "";

    item.append(name, country);
    item.addEventListener("click", () => selectCity(city));
    searchResults.appendChild(item);
  });
}

async function searchCities(query) {
  const token = ++searchToken;

  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    );
    const data = await res.json();
    if (token !== searchToken) return; // a newer search replaced this one
    renderResults(data.results || []);
  } catch (err) {
    console.error(err);
  }
}

searchInput.addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  const query = e.target.value.trim();

  if (query.length < 3) {
    clearResults();
    return;
  }
  searchTimer = setTimeout(() => searchCities(query), 300);
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && lastResults.length) selectCity(lastResults[0]);
  if (e.key === "Escape") clearResults();
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-box")) clearResults();
});

fetchWeather(31.5204, 74.3587, "Lahore");
