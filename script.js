// Screen par JS errors dikhao taake page "Loading" par atka na rahe
window.addEventListener("error", (e) => {
  const s = document.getElementById("statusText");
  if (s) {
    s.textContent = "JS error: " + e.message;
    s.classList.add("is-error");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // DOM
  const searchInput = $("searchInput");
  const searchWrapper = $("searchWrapper");
  const searchResults = $("searchResults");
  const focusOverlay = $("focusOverlay");
  const dashboard = $("dashboard");
  const statusText = $("statusText");
  const locateBtn = $("locateBtn");
  const refreshBtn = $("refreshBtn");
  const unitButtons = document.querySelectorAll(".unit-btn");

  // Config & state
  const CLOSE_MS = 400;
  const REQUEST_TIMEOUT_MS = 12000;
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let unit = "metric";
  try {
    unit = localStorage.getItem("yw-unit") === "imperial" ? "imperial" : "metric";
  } catch (_) {}

  let current = null;     // { name, lat, lon, data }
  let weatherToken = 0;
  let searchToken = 0;
  let searchTimer = null;
  let closeTimer = null;
  let clockTimer = null;
  let activeIndex = -1;

  // Helpers
  const refreshIcons = () => {
    if (typeof feather !== "undefined") feather.replace();
  };
  const setText = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value;
  };
  const timeNow = () =>
    new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const isSearchOpen = () => searchWrapper.classList.contains("active");

  // fetch with timeout, so requests never hang forever
  async function fetchWithTimeout(url, ms = REQUEST_TIMEOUT_MS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  function setStatus(message, isError = false) {
    statusText.textContent = message;
    statusText.classList.toggle("is-error", isError);
  }

  // Weather code -> label, icon, background mood
  function describe(code, isDay = 1) {
    const night = !isDay;
    if (code === 0) return { label: "Clear sky", icon: night ? "moon" : "sun", mood: night ? "night" : "clear" };
    if ([1, 2, 3].includes(code)) return { label: "Partly cloudy", icon: "cloud", mood: "cloud" };
    if ([45, 48].includes(code)) return { label: "Foggy", icon: "align-center", mood: "fog" };
    if ([51, 53, 55, 56, 57].includes(code)) return { label: "Drizzle", icon: "cloud-drizzle", mood: "rain" };
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: "Rain", icon: "cloud-rain", mood: "rain" };
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Snow", icon: "cloud-snow", mood: "snow" };
    if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", icon: "cloud-lightning", mood: "storm" };
    return { label: "Cloudy", icon: "cloud", mood: "cloud" };
  }

  function summarize(tempC, info, humidity, windKmh) {
    const word =
      tempC <= 0 ? "Freezing" :
      tempC < 10 ? "Cold" :
      tempC < 18 ? "Cool" :
      tempC < 26 ? "Mild" :
      tempC < 32 ? "Warm" : "Hot";
    let text = `${word}, ${info.label.toLowerCase()}`;
    if (humidity >= 70) text += ", humid";
    if (windKmh >= 25) text += ", breezy";
    return text + ".";
  }

  function countTo(el, to) {
    const from = parseFloat(el.dataset.value);
    el.dataset.value = to;
    if (Number.isNaN(from) || from === to) {
      el.textContent = `${to}°`;
      return;
    }
    const start = performance.now();
    const duration = 600;
    const frame = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${Math.round(from + (to - from) * eased)}°`;
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  function setLocalTime(data) {
    const el = $("localTime");
    if (!el) return;
    try {
      el.textContent = new Date().toLocaleString("en-US", {
        timeZone: data.timezone,
        weekday: "short",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch (_) {
      el.textContent = "";
    }
  }

  // =========================================
  // SEARCH OPEN / CLOSE
  // =========================================
  function openSearch() {
    clearTimeout(closeTimer);
    searchWrapper.classList.add("active");
    focusOverlay.classList.add("active");
    dashboard.classList.add("blur-bg");
    searchWrapper.setAttribute("aria-expanded", "true");
  }

  function closeSearch() {
    if (!isSearchOpen()) return;

    clearTimeout(searchTimer);
    searchToken++;

    searchWrapper.classList.remove("active");
    focusOverlay.classList.remove("active");
    dashboard.classList.remove("blur-bg");
    searchWrapper.setAttribute("aria-expanded", "false");

    searchResults.classList.remove("has-data");
    activeIndex = -1;
    searchInput.blur();

    closeTimer = setTimeout(() => {
      if (isSearchOpen()) return;
      searchResults.innerHTML = "";
      searchInput.value = "";
    }, CLOSE_MS);
  }

  searchInput.addEventListener("focus", openSearch);
  focusOverlay.addEventListener("click", closeSearch);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSearch();
      return;
    }
    if (e.key === "/" && document.activeElement !== searchInput && !e.target.matches("input, textarea")) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // =========================================
  // SEARCH RESULTS
  // =========================================
  function setActiveItem(index) {
    const items = searchResults.querySelectorAll(".dropdown-item");
    items.forEach((el, i) => el.classList.toggle("is-active", i === index));
    activeIndex = index;
  }

  function renderSearchMessage(text) {
    searchResults.innerHTML = "";
    const msg = document.createElement("div");
    msg.className = "dropdown-empty";
    msg.textContent = text;
    searchResults.appendChild(msg);
    searchResults.classList.add("has-data");
  }

  function renderSearchResults(cities) {
    searchResults.innerHTML = "";
    activeIndex = -1;

    cities.forEach((city) => {
      const item = document.createElement("div");
      item.className = "dropdown-item";
      item.setAttribute("role", "option");

      const name = document.createElement("span");
      name.className = "dropdown-city";
      name.textContent = city.name;

      const region = document.createElement("span");
      region.className = "dropdown-country";
      region.textContent = [city.admin1, city.country].filter(Boolean).join(", ");

      item.append(name, region);
      item.addEventListener("click", () => selectCity(city));
      searchResults.appendChild(item);
    });

    searchResults.classList.add("has-data");
  }

  async function searchCities(query) {
    const token = ++searchToken;
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (token !== searchToken) return;

      if (!data.results || data.results.length === 0) {
        renderSearchMessage("No cities found");
        return;
      }
      renderSearchResults(data.results);
    } catch (err) {
      console.error("City search failed.", err);
      if (token === searchToken) renderSearchMessage("Search failed. Try again.");
    }
  }

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    clearTimeout(searchTimer);
    activeIndex = -1;

    if (query.length < 3) {
      searchToken++;
      searchResults.classList.remove("has-data");
      searchResults.innerHTML = "";
      return;
    }
    searchTimer = setTimeout(() => searchCities(query), 300);
  });

  searchInput.addEventListener("keydown", (e) => {
    const items = searchResults.querySelectorAll(".dropdown-item");
    if (!items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveItem(activeIndex < items.length - 1 ? activeIndex + 1 : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveItem(activeIndex > 0 ? activeIndex - 1 : items.length - 1);
    } else if (e.key === "Enter" && activeIndex > -1) {
      e.preventDefault();
      items[activeIndex].click();
    }
  });

  function selectCity(city) {
    closeSearch();
    loadWeather({ lat: city.latitude, lon: city.longitude, name: city.name });
  }

  // =========================================
  // LOCATION
  // =========================================
  // Coordinates -> city name (free, no API key)
  async function reverseGeocode(lat, lon) {
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
      const res = await fetchWithTimeout(url, 5000);
      if (!res.ok) return null;
      const d = await res.json();
      return d.city || d.locality || d.principalSubdivision || null;
    } catch (_) {
      return null;
    }
  }

  function showWelcome(message = "Search a city to see the weather.") {
    dashboard.classList.remove("is-loading", "updating");
    setText("headerCityName", "No location");
    setText("localTime", "");
    setText("mainTemp", "--°");
    setText("conditionDesc", "Pick a city");
    setText("summary", message);
    setText("hilo", "");
    $("mainIconWrap").innerHTML = `<i data-feather="map-pin" class="weather-icon-large"></i>`;
    $("forecastList").innerHTML = `<p class="empty-msg">Search a city to load the forecast.</p>`;
    $("hourlyList").innerHTML = `<p class="empty-msg">Search a city to load hourly data.</p>`;
    refreshIcons();
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setStatus("Location isn't supported here. Search a city.", true);
      if (!current) showWelcome("Location isn't supported. Search a city.");
      return;
    }

    setStatus("Finding you...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const name = (await reverseGeocode(lat, lon)) || "My Location";
        loadWeather({ lat, lon, name });
      },
      (err) => {
        const msg = err.code === 1
          ? "Location access denied. Search a city instead."
          : "Couldn't get your location. Search a city instead.";
        setStatus(msg, true);
        if (!current) showWelcome(msg);
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }

  locateBtn.addEventListener("click", useMyLocation);

  // =========================================
  // WEATHER DATA
  // =========================================
  function showSkeleton() {
    $("forecastList").innerHTML = Array.from({ length: 7 }, () => `<div class="forecast-item sk"></div>`).join("");
    $("hourlyList").innerHTML = Array.from({ length: 8 }, () => `<div class="hour-item sk"></div>`).join("");
  }

  function showError() {
    $("mainIconWrap").innerHTML = `<i data-feather="cloud-off" class="weather-icon-large"></i>`;
    setText("conditionDesc", "Couldn't load weather");
    setText("summary", "Check your connection, then hit refresh.");
    $("forecastList").innerHTML = `<p class="empty-msg">No forecast available.</p>`;
    $("hourlyList").innerHTML = `<p class="empty-msg">No hourly data available.</p>`;
    refreshIcons();
  }

  async function loadWeather({ lat, lon, name }) {
    const token = ++weatherToken;

    dashboard.classList.add("updating");
    setStatus("Updating...");
    if (!current) showSkeleton();

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,is_day` +
      `&hourly=temperature_2m,weather_code,precipitation_probability,is_day` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=auto&forecast_days=7`;

    try {
      const [res] = await Promise.all([fetchWithTimeout(url), delay(400)]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (token !== weatherToken) return;

      current = { name, lat, lon, data };
      render();
      setStatus(`Updated ${timeNow()}`);
      setText("footerUpdated", `Updated ${timeNow()}`);
    } catch (err) {
      console.error("Weather fetch failed:", err);
      if (token === weatherToken) {
        if (!current) showError();
        setStatus("Couldn't load weather. Hit refresh to retry.", true);
      }
    } finally {
      if (token === weatherToken) {
        dashboard.classList.remove("updating", "is-loading");
      }
    }
  }

  // =========================================
  // RENDERING
  // =========================================
  function render() {
    if (!current) return;

    const { name, data } =
