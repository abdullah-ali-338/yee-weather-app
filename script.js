document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // =========================================
  // DOM
  // =========================================
  const searchInput = $("searchInput");
  const searchWrapper = $("searchWrapper");
  const searchResults = $("searchResults");
  const focusOverlay = $("focusOverlay");
  const dashboard = $("dashboard");
  const statusText = $("statusText");
  const locateBtn = $("locateBtn");
  const refreshBtn = $("refreshBtn");
  const retryBtn = $("retryBtn");
  const stateCard = $("stateCard");
  const hourlyScroll = $("hourlyScroll");
  const unitButtons = document.querySelectorAll(".unit-btn");

  // =========================================
  // STATE
  // =========================================
  const CLOSE_MS = 400;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let unit = "metric";
  try {
    unit = localStorage.getItem("yw-unit") === "imperial" ? "imperial" : "metric";
  } catch (_) { /* storage blocked */ }

  let current = null;       // { name, lat, lon, data }
  let lastRequest = null;   // last { lat, lon, name } so Retry/Refresh work
  let weatherToken = 0;     // guards against out-of-order weather responses
  let searchToken = 0;      // guards against stale search results
  let searchTimer = null;
  let closeTimer = null;
  let activeIndex = -1;

  // =========================================
  // HELPERS
  // =========================================
  const refreshIcons = () => {
    if (typeof feather !== "undefined") feather.replace();
  };

  const setText = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value;
  };

  const clamp01 = (n) => Math.max(0, Math.min(1, n));

  const timeNow = () =>
    new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const fmtHour = (iso) => {
    const h = parseInt(iso.slice(11, 13), 10);
    return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
  };

  const compass = (deg) =>
    ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];

  const isSearchOpen = () => searchWrapper.classList.contains("active");

  function setStatus(message, isError = false) {
    statusText.textContent = message;
    statusText.classList.toggle("is-error", isError);
  }

  function setGauge(id, pct) {
    const el = $(id);
    if (el) el.style.width = `${Math.round(clamp01(pct) * 100)}%`;
  }

  // Smooth number count-up/down
  function animateNumber(el, to, suffix = "") {
    const from = typeof el._val === "number" ? el._val : 0;
    el._val = to;
    cancelAnimationFrame(el._raf);

    if (reduceMotion || from === to) {
      el.textContent = `${to}${suffix}`;
      return;
    }

    const start = performance.now();
    const dur = 700;
    const step = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${Math.round(from + (to - from) * eased)}${suffix}`;
      if (t < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  // =========================================
  // WEATHER MAPPING
  // =========================================
  function getWeatherDetails(code, isDay = 1) {
    switch (code) {
      case 0: return { label: "Clear Sky", icon: isDay ? "sun" : "moon" };
      case 1: return { label: "Mainly Clear", icon: isDay ? "sun" : "moon" };
      case 2: return { label: "Partly Cloudy", icon: "cloud" };
      case 3: return { label: "Overcast", icon: "cloud" };
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
      case 82: return { label: "Rain", icon: "cloud-rain" };
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

  function themeFor(code, isDay) {
    if ([95, 96, 99].includes(code)) return "storm";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
    if ([45, 48].includes(code)) return "fog";
    if (code === 0 || code === 1) return isDay ? "clear-day" : "clear-night";
    return isDay ? "cloudy-day" : "cloudy-night";
  }

  function buildSummary(cur, theme) {
    const feel = cur.apparent_temperature;
    const tempWord =
      feel < 0 ? "Freezing" :
      feel < 10 ? "Cold" :
      feel < 18 ? "Cool" :
      feel < 25 ? "Mild" :
      feel < 31 ? "Warm" :
      feel < 37 ? "Hot" : "Scorching";

    const h = cur.relative_humidity_2m;
    const humid = h >= 75 ? " and humid" : h <= 30 ? " and dry" : "";

    const w = cur.wind_speed_10m;
    const wind =
      w < 6 ? "calm winds" :
      w < 20 ? "a light breeze" :
      w < 40 ? "a steady breeze" : "strong winds";

    const extra = {
      rain: " Bring an umbrella.",
      snow: " Dress warm for snow.",
      storm: " Stay indoors if you can.",
      fog: " Visibility may be low."
    }[theme] || "";

    return `${tempWord}${humid}, with ${wind}.${extra}`;
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
    searchToken++; // discard in-flight search results

    searchWrapper.classList.remove("active");
    focusOverlay.classList.remove("active");
    dashboard.classList.remove("blur-bg");
    searchWrapper.setAttribute("aria-expanded", "false");

    searchResults.classList.remove("has-data");
    activeIndex = -1;

    // Blur so clicking the input again re-fires focus and reopens search
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

  function renderSearchMessage(text, icon = "search") {
    searchResults.innerHTML = "";
    const msg = document.createElement("div");
    msg.className = "dropdown-empty";
    msg.innerHTML = `<i data-feather="${icon}"></i><span></span>`;
    msg.querySelector("span").textContent = text;
    searchResults.appendChild(msg);
    searchResults.classList.add("has-data");
    refreshIcons();
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
        renderSearchMessage(`No cities found for "${query}"`, "map-pin");
        return;
      }
      renderSearchResults(data.results);
    } catch (err) {
      console.error("City search failed.", err);
      if (token === searchToken) renderSearchMessage("Search failed. Check your connection.", "cloud-off");
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
    } else if (e.key === "Enter") {
      e.preventDefault();
      (items[activeIndex > -1 ? activeIndex : 0]).click();
    }
  });

  function selectCity(city) {
    closeSearch();
    loadWeather({ lat: city.latitude, lon: city.longitude, name: city.name });
  }

  // =========================================
  // SKELETONS & ERROR STATE
  // =========================================
  function renderSkeleton() {
    $("hourlyList").innerHTML = Array.from({ length: 10 }, () => `
      <div class="hour-item">
        <span class="skel" style="width:36px;height:12px"></span>
        <span class="skel" style="width:24px;height:24px;border-radius:50%"></span>
        <span class="skel" style="width:32px;height:16px"></span>
        <span class="skel" style="width:24px;height:10px"></span>
      </div>`).join("");

    $("forecastList").innerHTML = Array.from({ length: 7 }, () => `
      <div class="forecast-item">
        <span class="skel" style="height:30px"></span>
        <span class="skel" style="width:20px;height:20px;border-radius:50%"></span>
        <span></span>
        <span class="skel" style="height:12px"></span>
        <span class="skel" style="height:6px;border-radius:99px"></span>
        <span class="skel" style="height:12px"></span>
      </div>`).join("");
  }

  function showError(message) {
    dashboard.classList.add("has-error");
    stateCard.hidden = false;
    setText("stateMsg", message);
    refreshIcons();
  }

  function hideError() {
    dashboard.classList.remove("has-error");
    stateCard.hidden = true;
  }

  // =========================================
  // WEATHER DATA
  // =========================================
  async function loadWeather(req) {
    const { lat, lon, name } = req;
    lastRequest = req;
    const token = ++weatherToken;

    hideError();
    dashboard.classList.add("is-loading");
    refreshBtn.classList.add("spinning");
    setText("headerCityName", name);
    renderSkeleton();
    setStatus("Updating...");

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m` +
      `&hourly=temperature_2m,weather_code,precipitation_probability,is_day,uv_index,visibility` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=auto&forecast_days=7`;

    try {
      // Keep the skeleton up for a minimum beat so it never flickers
      const [res] = await Promise.all([fetch(url), delay(450)]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (token !== weatherToken) return; // a newer request took over

      current = { name, lat, lon, data };
      render({ animate: true });
      setStatus(`Updated ${timeNow()}`);
      setText("footerUpdated", `Last updated ${timeNow()}`);
    } catch (err) {
      console.error("Atmosphere fetch failed.", err);
      if (token !== weatherToken) return;

      const offline = !navigator.onLine;
      const message = offline
        ? "You're offline. Check your connection and try again."
        : "The weather service didn't respond. Give it a moment and try again.";

      if (current) {
        // Keep showing the last good data
        render({ animate: false });
        setStatus(offline ? "You're offline." : "Couldn't refresh. Showing last data.", true);
      } else {
        setStatus("Couldn't load weather.", true);
        showError(message);
      }
    } finally {
      if (token === weatherToken) {
        dashboard.classList.remove("is-loading");
        refreshBtn.classList.remove("spinning");
      }
    }
  }

  // =========================================
  // RENDER
  // =========================================
  function render({ animate = true } = {}) {
    if (!current) return;

    const { name, data } = current;
    const imperial = unit === "imperial";
    const toTemp = (c) => Math.round(imperial ? (c * 9) / 5 + 32 : c);
    const toWind = (kmh) => Math.round(imperial ? kmh / 1.609 : kmh);
    const windUnit = imperial ? "mph" : "km/h";
    const animClass = animate ? " anim" : "";

    const cur = data.current;
    const daily = data.daily;
    const hourly = data.hourly;

    // Index of the current hour in the hourly arrays
    const hourPrefix = cur.time.slice(0, 13);
    let idx = hourly.time.findIndex((t) => t.startsWith(hourPrefix));
    if (idx < 0) idx = 0;

    const info = getWeatherDetails(cur.weather_code, cur.is_day);
    const theme = themeFor(cur.weather_code, cur.is_day);
    document.body.dataset.theme = theme;
    document.title = `${name} ${toTemp(cur.temperature_2m)}° · YeeWeather`;

    // ----- Hero card -----
    setText("headerCityName", name);
    animateNumber($("mainTemp"), toTemp(cur.temperature_2m), "°");
    setText("conditionDesc", info.label);
    setText("feelsChip", `${toTemp(cur.apparent_temperature)}°`);
    setText("hiTemp", `${toTemp(daily.temperature_2m_max[0])}°`);
    setText("loTemp", `${toTemp(daily.temperature_2m_min[0])}°`);
    setText("summary", buildSummary(cur, theme));
    $("mainIconWrap").innerHTML = `<i data-feather="${info.icon}" class="weather-icon-large"></i>`;
    updateLocalTime();

    // ----- Metrics -----
    // Wind
    setText("windSpeed", `${toWind(cur.wind_speed_10m)} ${windUnit}`);
    setGauge("windBar", cur.wind_speed_10m / 50);
    $("windSub").innerHTML =
      `<span class="wind-arrow" style="transform: rotate(${cur.wind_direction_10m + 180}deg)">` +
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></span>` +
      `<span>From ${compass(cur.wind_direction_10m)}</span>`;

    // Humidity
    const hum = Math.round(cur.relative_humidity_2m);
    setText("humidity", `${hum}%`);
    setGauge("humidityBar", hum / 100);
    setText("humiditySub", hum < 30 ? "Dry" : hum < 60 ? "Comfortable" : hum < 80 ? "Humid" : "Very humid");

    // Feels like
    const diff = cur.apparent_temperature - cur.temperature_2m;
    setText("feelsLike", `${toTemp(cur.apparent_temperature)}°`);
    setGauge("feelsBar", (cur.apparent_temperature + 10) / 55);
    setText("feelsSub", diff >= 2 ? "Warmer than actual" : diff <= -2 ? "Cooler than actual" : "Same as actual");

    // Pressure
    const p = cur.pressure_msl;
    setText("pressure", imperial ? `${(p * 0.02953).toFixed(2)} inHg` : `${Math.round(p)} hPa`);
    setGauge("pressureBar", (p - 980) / 60);
    setText("pressureSub", p < 1009 ? "Low" : p <= 1022 ? "Normal" : "High");

    // Visibility
    const visM = hourly.visibility ? hourly.visibility[idx] : null;
    if (visM == null) {
      setText("visibility", "--");
      setText("visibilitySub", "No data");
      setGauge("visibilityBar", 0);
    } else {
      const km = visM / 1000;
      const shown = imperial ? km / 1.609 : km;
      setText("visibility", `${shown >= 10 ? Math.round(shown) : shown.toFixed(1)} ${imperial ? "mi" : "km"}`);
      setGauge("visibilityBar", km / 10);
      setText("visibilitySub", km >= 10 ? "Excellent" : km >= 5 ? "Good" : km >= 2 ? "Moderate" : "Poor");
    }

    // UV
    const uv = hourly.uv_index ? hourly.uv_index[idx] : null;
    if (uv == null) {
      setText("uvIndex", "--");
      setText("uvSub", "No data");
      setGauge("uvBar", 0);
    } else {
      setText("uvIndex", uv.toFixed(1));
      setGauge("uvBar", uv / 11);
      setText("uvSub", uv < 3 ? "Low" : uv < 6 ? "Moderate" : uv < 8 ? "High" : uv < 11 ? "Very high" : "Extreme");
    }

    // ----- Hourly strip (next 24 hours) -----
    const hourlyList = $("hourlyList");
    hourlyList.innerHTML = "";
    for (let i = 0; i < 24; i++) {
      const k = idx + i;
      if (k >= hourly.time.length) break;

      const isNow = i === 0;
      const code = isNow ? cur.weather_code : hourly.weather_code[k];
      const day = isNow ? cur.is_day : hourly.is_day[k];
      const temp = isNow ? cur.temperature_2m : hourly.temperature_2m[k];
      const pop = hourly.precipitation_probability ? hourly.precipitation_probability[k] : 0;
      const d = getWeatherDetails(code, day);

      const item = document.createElement("div");
      item.className = `hour-item${isNow ? " is-now" : ""}${animClass}`;
      item.style.setProperty("--i", Math.min(i, 12));
      item.innerHTML = `
        <span class="h-time">${isNow ? "Now" : fmtHour(hourly.time[k])}</span>
        <i data-feather="${d.icon}" class="h-icon"></i>
        <span class="h-temp">${toTemp(temp)}°</span>
        <span class="h-pop">${pop >= 10 ? `${pop}%` : ""}</span>
      `;
      hourlyList.appendChild(item);
    }
    hourlyScroll.scrollLeft = 0;

    // ----- 7-day forecast with range bars -----
    const wMin = Math.min(...daily.temperature_2m_min);
    const wMax = Math.max(...daily.temperature_2m_max);
    const span = wMax - wMin || 1;

    const list = $("forecastList");
    list.innerHTML = "";

    daily.time.forEach((dateStr, i) => {
      const dayLabel = i === 0
        ? "Today"
        : new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
      const d = getWeatherDetails(daily.weather_code[i], 1);
      const lo = daily.temperature_2m_min[i];
      const hi = daily.temperature_2m_max[i];
      const pop = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0;

      const left = ((lo - wMin) / span) * 100;
      const width = Math.max(((hi - lo) / span) * 100, 8);
      const dot = i === 0
        ? `<span class="range-dot" style="left:${clamp01((cur.temperature_2m - lo) / ((hi - lo) || 1)) * 100}%"></span>`
        : "";

      const row = document.createElement("div");
      row.className = `forecast-item${i === 0 ? " is-today" : ""}${animClass}`;
      row.style.setProperty("--i", i);
      row.innerHTML = `
        <div class="f-day">
          <span class="f-name">${dayLabel}</span>
          <span class="f-label">${d.label}</span>
        </div>
        <i data-feather="${d.icon}" class="f-icon"></i>
        <span class="f-pop">${pop >= 10 ? `${pop}%` : ""}</span>
        <span class="f-lo">${toTemp(lo)}°</span>
        <div class="range">
          <span class="range-fill" style="left:${left}%;width:${width}%">${dot}</span>
        </div>
        <span class="f-hi">${toTemp(hi)}°</span>
      `;
      list.appendChild(row);
    });

    refreshIcons();
  }

  // Live local time for the searched city
  function updateLocalTime() {
    if (!current) return;
    const tz = current.data.timezone;
    const now = new Date();
    try {
      const date = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: tz });
      const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
      setText("localTime", `${date} · ${time}`);
    } catch (_) {
      setText("localTime", timeNow());
    }
  }
  setInterval(updateLocalTime, 30000);

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
    } catch (_) { /* storage blocked */ }
    render({ animate: false }); // no refetch, no re-stagger
  }

  unitButtons.forEach((btn) => {
    btn.addEventListener("click", () => setUnit(btn.dataset.unit));
  });

  const retry = () => { if (lastRequest) loadWeather(lastRequest); };
  refreshBtn.addEventListener("click", retry);
  retryBtn.addEventListener("click", retry);

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
  // HOURLY STRIP: buttons + drag to scroll
  // =========================================
  $("hourPrev").addEventListener("click", () =>
    hourlyScroll.scrollBy({ left: -hourlyScroll.clientWidth * 0.8, behavior: "smooth" }));
  $("hourNext").addEventListener("click", () =>
    hourlyScroll.scrollBy({ left: hourlyScroll.clientWidth * 0.8, behavior: "smooth" }));

  let dragging = false;
  let dragStartX = 0;
  let dragStartLeft = 0;

  hourlyScroll.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return; // touch scrolls natively
    dragging = true;
    dragStartX = e.clientX;
    dragStartLeft = hourlyScroll.scrollLeft;
    hourlyScroll.classList.add("dragging");
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    hourlyScroll.scrollLeft = dragStartLeft - (e.clientX - dragStartX);
  });
  window.addEventListener("pointerup", () => {
    dragging = false;
    hourlyScroll.classList.remove("dragging");
  });

  // =========================================
  // INIT
  // =========================================
  refreshIcons();
  renderSkeleton();
  setUnit(unit);
  loadWeather({ lat: 31.5204, lon: 74.3587, name: "Lahore" });
});
