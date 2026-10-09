document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // DOM
  const searchInput = $("searchInput");
  const searchWrapper = $("searchWrapper");
  const searchResults = $("searchResults");
  const focusOverlay = $("focusOverlay");
  const dashboard = $("dashboard");
  const globalLoader = $("globalLoader");
  const statusText = $("statusText");
  const locateBtn = $("locateBtn");
  const refreshBtn = $("refreshBtn");
  const unitButtons = document.querySelectorAll(".unit-btn");

  // Config & state
  const CLOSE_MS = 400; // matches dropdown fade-out
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let unit = "metric";
  try {
    unit = localStorage.getItem("yw-unit") === "imperial" ? "imperial" : "metric";
  } catch (_) { /* storage blocked, fall back to default */ }

  let current = null;      // { name, lat, lon, data }
  let weatherToken = 0;    // guards against out-of-order responses
  let searchToken = 0;     // guards against stale search results
  let searchTimer = null;
  let closeTimer = null;
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

  function setStatus(message, isError = false) {
    statusText.textContent = message;
    statusText.classList.toggle("is-error", isError);
  }

  function getWeatherDetails(code) {
    switch (code) {
      case 0: return { label: "Clear Sky", icon: "sun" };
      case 1:
      case 2:
      case 3: return { label: "Partly Cloudy", icon: "cloud" };
      case 45:
      case 48: return { label: "Foggy", icon: "align-center" };
      case 51:
      case 53:
      case 55:
      case 56:
      case 57: return { label: "Drizzle", icon: "cloud-drizzle" };
      case 61:
      case 63:
      case 65:
      case 66:
      case 67:
      case 80:
      case 81:
      case 82: return { label: "Rain Showers", icon: "cloud-rain" };
      case 71:
      case 73:
      case 75:
      case 77:
      case 85:
      case 86: return { label: "Snow", icon: "cloud-snow" };
      case 95:
      case 96:
      case 99: return { label: "Thunderstorm", icon: "cloud-lightning" };
      default: return { label: "Cloudy", icon: "cloud" };
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
    searchToken++; // discard any in-flight search results

    searchWrapper.classList.remove("active");
    focusOverlay.classList.remove("active");
    dashboard.classList.remove("blur-bg");
    searchWrapper.setAttribute("aria-expanded", "false");

    // Hide dropdown immediately so the fade-out plays
    searchResults.classList.remove("has-data");
    activeIndex = -1;

    // Blur so the next click on the input re-fires focus and reopens search
    searchInput.blur();

    // Clear content only after the fade-out, and only if search wasn't reopened
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
    // "/" focuses search from anywhere on the page
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
      const res = await fetch(url);
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

    searchTimer = setTimeout(() => searchCities(query), 300); // debounce
  });

  // Keyboard navigation inside results
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
  // WEATHER DATA
  // =========================================
  async function loadWeather({ lat, lon, name }) {
    const token = ++weatherToken;

    dashboard.classList.add("updating");
    setStatus("Updating...");

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;

    try {
      // Fetch and fade-out delay run together so the swap happens after the fade
      const [res] = await Promise.all([fetch(url), delay(400)]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (token !== weatherToken) return; // a newer request has taken over

      current = { name, lat, lon, data };
      render();
      setStatus(`Updated ${timeNow()}`);
    } catch (err) {
      console.error("Atmosphere fetch failed.", err);
      if (token === weatherToken) setStatus("Couldn't load weather. Hit refresh to retry.", true);
    } finally {
      if (token === weatherToken) {
        dashboard.classList.remove("updating");
        globalLoader.classList.add("hidden");
      }
    }
  }

  function render() {
    if (!current) return;

    const { name, data } = current;
    const imperial = unit === "imperial";
    const toTemp = (c) => Math.round(imperial ? (c * 9) / 5 + 32 : c);
    const toWind = (kmh) => Math.round(imperial ? kmh / 1.609 : kmh);
    const windUnit = imperial ? "mph" : "km/h";

    const cur = data.current;
    const info = getWeatherDetails(cur.weather_code);

    // Header city name is a stable element, so it always updates
    setText("headerCityName", name);
    setText("mainTemp", `${toTemp(cur.temperature_2m)}°`);
    setText("conditionDesc", info.label);
    setText("feelsLike", `${toTemp(cur.apparent_temperature)}°`);
    setText("humidity", `${Math.round(cur.relative_humidity_2m)}%`);
    setText("windSpeed", `${toWind(cur.wind_speed_10m)} ${windUnit}`);

    // Swap only the icon inside its own wrapper
    $("mainIconWrap").innerHTML = `<i data-feather="${info.icon}" class="weather-icon-large"></i>`;

    // 7-day forecast
    const list = $("forecastList");
    list.innerHTML = "";

    data.daily.time.forEach((dateStr, idx) => {
      const dayLabel = idx === 0
        ? "Today"
        : new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
      const d = getWeatherDetails(data.daily.weather_code[idx]);
      const max = toTemp(data.daily.temperature_2m_max[idx]);
      const min = toTemp(data.daily.temperature_2m_min[idx]);

      const row = document.createElement("div");
      row.className = `forecast-item${idx === 0 ? " is-today" : ""}`;
      row.innerHTML = `
        <span class="f-day">${dayLabel}</span>
        <div class="f-cond">
          <i data-feather="${d.icon}"></i>
          <span>${d.label}</span>
        </div>
        <div class="f-temps">${max}° <span>/ ${min}°</span></div>
      `;
      list.appendChild(row);
    });

    refreshIcons();
  }

  // =========================================
  // TOOLBAR CONTROLS
  // =========================================
  function setUnit(next) {
    unit = next;
    unitButtons.forEach((btn) => {
      const on = btn.dataset.unit === next;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    try {
      localStorage.setItem("yw-unit", next);
    } catch (_) { /* storage blocked, preference just won't persist */ }
    render(); // re-render without refetching
  }

  unitButtons.forEach((btn) => {
    btn.addEventListener("click", () => setUnit(btn.dataset.unit));
  });

  refreshBtn.addEventListener("click", () => {
    if (current) loadWeather(current);
  });

  locateBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setStatus("Location isn't supported on this device.", true);
      return;
    }
    setStatus("Finding you...");
    navigator.geolocation.getCurrentPosition(
      (pos) => loadWeather({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        name: "My Location"
      }),
      () => setStatus("Location access denied.", true),
      { timeout: 8000 }
    );
  });

  // =========================================
  // INIT
  // =========================================
  refreshIcons();
  setUnit(unit);
  loadWeather({ lat: 31.5204, lon: 74.3587, name: "Lahore" });
});
