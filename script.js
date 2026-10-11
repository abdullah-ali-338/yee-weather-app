(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

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
  const stateMsg = $("stateMsg");
  const hourlyScroll = $("hourlyScroll");
  const hourlyList = $("hourlyList");
  const forecastList = $("forecastList");
  const backNowBtn = $("backNowBtn");
  const unitButtons = document.querySelectorAll(".unit-btn");
  const swapEls = document.querySelectorAll(".current-card, .metric-card, .hourly-card");

  const cityEl = $("headerCityName");
  const localTimeEl = $("localTime");
  const iconWrap = $("mainIconWrap");
  const mainTemp = $("mainTemp");
  const conditionDesc = $("conditionDesc");
  const feelsChip = $("feelsChip");
  const hiTemp = $("hiTemp");
  const loTemp = $("loTemp");
  const summaryEl = $("summary");
  const titleNow = $("titleNow");
  const titleConditions = $("titleConditions");
  const titleHourly = $("titleHourly");
  const footerUpdated = $("footerUpdated");

  const windSpeed = $("windSpeed");
  const windSub = $("windSub");
  const windBar = $("windBar");
  const humidityEl = $("humidity");
  const humiditySub = $("humiditySub");
  const humidityBar = $("humidityBar");
  const feelsLike = $("feelsLike");
  const feelsSub = $("feelsSub");
  const feelsBar = $("feelsBar");
  const pressureEl = $("pressure");
  const pressureSub = $("pressureSub");
  const pressureBar = $("pressureBar");
  const visibilityEl = $("visibility");
  const visibilitySub = $("visibilitySub");
  const visibilityBar = $("visibilityBar");
  const uvEl = $("uvIndex");
  const uvSub = $("uvSub");
  const uvBar = $("uvBar");

  const CLOSE_MS = 600;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let unit = "metric";
  try {
    unit = localStorage.getItem("yw-unit") === "imperial" ? "imperial" : "metric";
  } catch (_) {}

  let current = null;
  let selectedDay = 0;
  let lastRequest = null;
  let weatherToken = 0;
  let searchToken = 0;
  let weatherCtl = null;
  let searchCtl = null;
  let searchTimer = null;
  let closeTimer = null;
  let activeIndex = -1;
  let cityResults = [];

  const ic = (name, cls = "") =>
    `<svg class="ic${cls ? " " + cls : ""}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  const put = (el, value) => {
    if (el.textContent !== value) el.textContent = value;
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

  const markReady = () => {
    if (document.body.classList.contains("ready")) return;
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("ready")));
  };

  function stopSpinner(token) {
    const done = () => { if (token === weatherToken) refreshBtn.classList.remove("spinning"); };
    const svg = refreshBtn.querySelector("svg");
    if (!svg || reduceMotion) { done(); return; }
    svg.addEventListener("animationiteration", done, { once: true });
    setTimeout(done, 1100);
  }

  function setStatus(message, isError = false) {
    put(statusText, message);
    statusText.classList.toggle("is-error", isError);
  }

  function setGauge(el, pct) {
    const v = Math.round(clamp01(pct) * 100) / 100;
    if (el._p === v) return;
    el._p = v;
    el.style.transform = `scaleX(${v})`;
  }

  function animateNumber(el, to, suffix = "", animate = true) {
    const from = typeof el._val === "number" ? el._val : 0;
    el._val = to;
    cancelAnimationFrame(el._raf);

    if (reduceMotion || !animate || from === to) {
      put(el, `${to}${suffix}`);
      return;
    }

    const start = performance.now();
    const dur = 700;
    const step = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      put(el, `${Math.round(from + (to - from) * eased)}${suffix}`);
      if (t < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  const WX = new Map();
  const reg = (codes, label, icon) => codes.forEach((c) => WX.set(c, { label, icon }));
  reg([2], "Partly cloudy", "cloud");
  reg([3], "Overcast", "cloud");
  reg([45, 48], "Foggy", "align-center");
  reg([51, 53, 55, 56, 57], "Drizzle", "cloud-drizzle");
  reg([61, 63, 65, 66, 67, 80, 81, 82], "Rain", "cloud-rain");
  reg([71, 73, 75, 77, 85, 86], "Snow", "cloud-snow");
  reg([95, 96, 99], "Thunderstorm", "cloud-lightning");

  const CLOUDY = { label: "Cloudy", icon: "cloud" };

  function getWeatherDetails(code, isDay = 1) {
    if (code === 0) return { label: "Clear sky", icon: isDay ? "sun" : "moon" };
    if (code === 1) return { label: "Mainly clear", icon: isDay ? "sun" : "moon" };
    return WX.get(code) || CLOUDY;
  }

  const THEME_BY_CODE = new Map();
  [
    ["storm", [95, 96, 99]],
    ["snow", [71, 73, 75, 77, 85, 86]],
    ["rain", [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]],
    ["fog", [45, 48]]
  ].forEach(([theme, codes]) => codes.forEach((c) => THEME_BY_CODE.set(c, theme)));

  function themeFor(code, isDay) {
    const t = THEME_BY_CODE.get(code);
    if (t) return t;
    if (code <= 1) return isDay ? "clear-day" : "clear-night";
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

  function openSearch() {
    clearTimeout(closeTimer);
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    searchWrapper.classList.add("active");
    focusOverlay.classList.add("active");
    searchInput.setAttribute("aria-expanded", "true");
  }

  function closeSearch() {
    if (!isSearchOpen()) return;

    clearTimeout(searchTimer);
    searchToken++;
    if (searchCtl) searchCtl.abort();

    searchWrapper.classList.remove("active");
    focusOverlay.classList.remove("active");
    searchInput.setAttribute("aria-expanded", "false");

    searchResults.classList.remove("has-data");
    activeIndex = -1;
    searchInput.blur();

    closeTimer = setTimeout(() => {
      if (isSearchOpen()) return;
      searchResults.replaceChildren();
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
    if (
      e.key === "/" &&
      !e.metaKey && !e.ctrlKey && !e.altKey &&
      document.activeElement !== searchInput &&
      !e.target.matches("input, textarea")
    ) {
      e.preventDefault();
      searchInput.focus({ preventScroll: true });
    }
  });

  function setActiveItem(index) {
    const items = searchResults.querySelectorAll(".dropdown-item");
    items.forEach((el, i) => {
      el.classList.toggle("is-active", i === index);
      el.setAttribute("aria-selected", String(i === index));
    });
    activeIndex = index;
    if (index > -1) items[index].scrollIntoView({ block: "nearest" });
  }

  function renderSearchMessage(text, icon = "search") {
    searchResults.innerHTML = `<div class="dropdown-empty">${ic(icon)}<span></span></div>`;
    searchResults.querySelector("span").textContent = text;
    searchResults.classList.add("has-data");
  }

  function renderSearchResults(cities) {
    cityResults = cities;
    activeIndex = -1;

    const frag = document.createDocumentFragment();
    cities.forEach((city, i) => {
      const item = document.createElement("div");
      item.className = "dropdown-item";
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", "false");
      item.dataset.i = i;

      const name = document.createElement("span");
      name.className = "dropdown-city";
      name.textContent = city.name;

      const region = document.createElement("span");
      region.className = "dropdown-country";
      region.textContent = [city.admin1, city.country].filter(Boolean).join(", ");

      item.append(name, region);
      frag.appendChild(item);
    });

    searchResults.replaceChildren(frag);
    searchResults.classList.add("has-data");
  }

  searchResults.addEventListener("click", (e) => {
    const item = e.target.closest(".dropdown-item");
    if (item) selectCity(cityResults[+item.dataset.i]);
  });

  async function searchCities(query) {
    const token = ++searchToken;
    if (searchCtl) searchCtl.abort();
    searchCtl = new AbortController();

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
      const res = await fetch(url, { signal: searchCtl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (token !== searchToken) return;

      if (!data.results || data.results.length === 0) {
        renderSearchMessage(`No cities found for "${query}"`, "map-pin");
        return;
      }
      renderSearchResults(data.results);
    } catch (err) {
      if (err.name === "AbortError") return;
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
      if (searchCtl) searchCtl.abort();
      searchResults.classList.remove("has-data");
      searchResults.replaceChildren();
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
      items[activeIndex > -1 ? activeIndex : 0].click();
    }
  });

  function selectCity(city) {
    closeSearch();
    loadWeather({ lat: city.latitude, lon: city.longitude, name: city.name });
  }

  function renderSkeleton() {
    hourlyList.innerHTML = Array.from({ length: 10 }, () => `
      <div class="hour-item">
        <span class="skel" style="width:36px;height:12px;margin:2px 0"></span>
        <span class="skel" style="width:24px;height:24px;border-radius:50%"></span>
        <span class="skel" style="width:32px;height:16px;margin:3px 0"></span>
        <span class="skel" style="width:24px;height:10px;margin:2px 0"></span>
      </div>`).join("");

    forecastList.innerHTML = Array.from({ length: 7 }, () => `
      <div class="forecast-item">
        <span class="skel" style="height:30px;width:70%"></span>
        <span class="skel" style="width:62px;height:20px"></span>
        <span class="skel" style="height:14px;width:70px;justify-self:end"></span>
      </div>`).join("");
  }

  function showError(message) {
    dashboard.classList.add("has-error");
    stateCard.hidden = false;
    put(stateMsg, message);
  }

  function hideError() {
    dashboard.classList.remove("has-error");
    stateCard.hidden = true;
  }

  async function loadWeather(req) {
    const { lat, lon, name } = req;
    lastRequest = req;
    const token = ++weatherToken;
    if (weatherCtl) weatherCtl.abort();
    weatherCtl = new AbortController();

    const sameCity = !!current && current.lat === lat && current.lon === lon;

    hideError();
    refreshBtn.classList.add("spinning");
    put(cityEl, name);
    if (!sameCity) {
      dashboard.classList.add("is-loading");
      renderSkeleton();
    }
    setStatus("Updating…");

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m` +
      `&hourly=temperature_2m,weather_code,precipitation_probability,is_day,uv_index,visibility,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,wind_direction_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=auto&forecast_days=7`;

    try {
      const [res] = await Promise.all([
        fetch(url, { signal: weatherCtl.signal }),
        sameCity ? null : delay(300)
      ]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (token !== weatherToken) return;

      selectedDay = 0;
      current = { name, lat, lon, data };
      render({ animate: !sameCity });
      setStatus(`Updated ${timeNow()}`);
      put(footerUpdated, `Last updated ${timeNow()}`);
    } catch (err) {
      if (token !== weatherToken) return;
      console.error("Atmosphere fetch failed.", err);

      const offline = !navigator.onLine;
      const message = offline
        ? "You're offline. Check your connection and try again."
        : "The weather service didn't respond. Give it a moment and try again.";

      if (current) {
        render({ animate: false });
        setStatus(offline ? "You're offline." : "Couldn't refresh. Showing last data.", true);
      } else {
        setStatus("Couldn't load weather.", true);
        showError(message);
      }
    } finally {
      if (token === weatherToken) {
        dashboard.classList.remove("is-loading");
        stopSpinner(token);
        markReady();
      }
    }
  }

  function render({ animate = true, swap = false } = {}) {
    if (!current) return;

    const { name, data } = current;
    const imperial = unit === "imperial";
    const toTemp = (c) => Math.round(imperial ? (c * 9) / 5 + 32 : c);
    const toWind = (kmh) => Math.round(imperial ? kmh / 1.609 : kmh);
    const windUnit = imperial ? "mph" : "km/h";

    const live = data.current;
    const daily = data.daily;
    const hourly = data.hourly;
    const sel = Math.min(selectedDay, daily.time.length - 1);
    const isToday = sel === 0;

    const hourPrefix = live.time.slice(0, 13);
    let idx = hourly.time.findIndex((t) => t.startsWith(hourPrefix));
    if (idx < 0) idx = 0;

    const dayStart = Math.max(hourly.time.findIndex((t) => t.startsWith(daily.time[sel])), 0);

    let cur = live;
    if (!isToday) {
      let rep = dayStart;
      for (let k = dayStart; k < Math.min(dayStart + 24, hourly.time.length); k++) {
        if (hourly.temperature_2m[k] > hourly.temperature_2m[rep]) rep = k;
      }
      cur = {
        time: hourly.time[rep],
        temperature_2m: daily.temperature_2m_max[sel],
        apparent_temperature: hourly.apparent_temperature[rep],
        relative_humidity_2m: hourly.relative_humidity_2m[rep],
        weather_code: daily.weather_code[sel],
        is_day: 1,
        pressure_msl: hourly.pressure_msl[rep],
        wind_speed_10m: hourly.wind_speed_10m[rep],
        wind_direction_10m: hourly.wind_direction_10m[rep]
      };
      idx = rep;
    }

    const info = getWeatherDetails(cur.weather_code, cur.is_day);
    const theme = themeFor(cur.weather_code, cur.is_day);
    if (document.body.dataset.theme !== theme) document.body.dataset.theme = theme;

    put(cityEl, name);
    animateNumber(mainTemp, toTemp(cur.temperature_2m), "°", animate || swap);
    put(conditionDesc, info.label);
    put(feelsChip, `${toTemp(cur.apparent_temperature)}°`);
    put(hiTemp, `${toTemp(daily.temperature_2m_max[sel])}°`);
    put(loTemp, `${toTemp(daily.temperature_2m_min[sel])}°`);
    put(summaryEl, buildSummary(cur, theme));
    if (iconWrap._icon !== info.icon) {
      iconWrap._icon = info.icon;
      iconWrap.innerHTML = ic(info.icon, "weather-icon-large");
    }

    const selDate = new Date(`${daily.time[sel]}T00:00:00`);
    put(titleNow, isToday ? "Right now" : selDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }));
    put(titleConditions, isToday ? "Conditions" : `Conditions at ${fmtHour(hourly.time[idx])}`);
    put(titleHourly, isToday ? "Next 24 hours" : "Hourly");
    backNowBtn.hidden = isToday;
    if (isToday) updateLocalTime();
    else put(localTimeEl, "Forecast");

    put(windSpeed, `${toWind(cur.wind_speed_10m)} ${windUnit}`);
    setGauge(windBar, cur.wind_speed_10m / 50);
    windSub.innerHTML =
      `<span class="wind-arrow" style="transform: rotate(${cur.wind_direction_10m + 180}deg)">` +
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></span>` +
      `<span>From ${compass(cur.wind_direction_10m)}</span>`;

    const hum = Math.round(cur.relative_humidity_2m);
    put(humidityEl, `${hum}%`);
    setGauge(humidityBar, hum / 100);
    put(humiditySub, hum < 30 ? "Dry" : hum < 60 ? "Comfortable" : hum < 80 ? "Humid" : "Very humid");

    const diff = cur.apparent_temperature - cur.temperature_2m;
    put(feelsLike, `${toTemp(cur.apparent_temperature)}°`);
    setGauge(feelsBar, (cur.apparent_temperature + 10) / 55);
    put(feelsSub, diff >= 2 ? "Warmer than actual" : diff <= -2 ? "Cooler than actual" : "Same as actual");

    const p = cur.pressure_msl;
    put(pressureEl, imperial ? `${(p * 0.02953).toFixed(2)} inHg` : `${Math.round(p)} hPa`);
    setGauge(pressureBar, (p - 980) / 60);
    put(pressureSub, p < 1009 ? "Low" : p <= 1022 ? "Normal" : "High");

    const visM = hourly.visibility ? hourly.visibility[idx] : null;
    if (visM == null) {
      put(visibilityEl, "--");
      put(visibilitySub, "No data");
      setGauge(visibilityBar, 0);
    } else {
      const km = visM / 1000;
      const shown = imperial ? km / 1.609 : km;
      put(visibilityEl, `${shown >= 10 ? Math.round(shown) : shown.toFixed(1)} ${imperial ? "mi" : "km"}`);
      setGauge(visibilityBar, km / 10);
      put(visibilitySub, km >= 10 ? "Excellent" : km >= 5 ? "Good" : km >= 2 ? "Moderate" : "Poor");
    }

    const uv = hourly.uv_index ? hourly.uv_index[idx] : null;
    if (uv == null) {
      put(uvEl, "--");
      put(uvSub, "No data");
      setGauge(uvBar, 0);
    } else {
      put(uvEl, uv.toFixed(1));
      setGauge(uvBar, uv / 11);
      put(uvSub, uv < 3 ? "Low" : uv < 6 ? "Moderate" : uv < 8 ? "High" : uv < 11 ? "Very high" : "Extreme");
    }

    const base = isToday ? idx : dayStart;
    let hoursHtml = "";
    for (let i = 0; i < 24; i++) {
      const k = base + i;
      if (k >= hourly.time.length) break;

      const isNow = isToday && i === 0;
      const code = isNow ? cur.weather_code : hourly.weather_code[k];
      const day = isNow ? cur.is_day : hourly.is_day[k];
      const temp = isNow ? cur.temperature_2m : hourly.temperature_2m[k];
      const pop = hourly.precipitation_probability ? hourly.precipitation_probability[k] : 0;
      const d = getWeatherDetails(code, day);

      hoursHtml +=
        `<div class="hour-item${isNow ? " is-now" : ""}${animate && i < 9 ? " anim" : ""}" style="--i:${i}">` +
        `<span class="h-time">${isNow ? "Now" : fmtHour(hourly.time[k])}</span>` +
        ic(d.icon, "h-icon") +
        `<span class="h-temp">${toTemp(temp)}°</span>` +
        `<span class="h-pop">${Math.round(pop || 0)}%</span>` +
        `</div>`;
    }
    hourlyList.innerHTML = hoursHtml;
    hourlyScroll.scrollLeft = 0;

    let daysHtml = "";
    daily.time.forEach((dateStr, i) => {
      const dayLabel = i === 0
        ? "Today"
        : new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
      const d = getWeatherDetails(daily.weather_code[i], 1);
      const lo = daily.temperature_2m_min[i];
      const hi = daily.temperature_2m_max[i];
      const pop = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0;

      daysHtml +=
        `<button type="button" class="forecast-item${i === sel ? " is-selected" : ""}${animate ? " anim" : ""}" data-i="${i}" aria-pressed="${i === sel}" style="--i:${i}">` +
        `<div class="f-day"><span class="f-name">${dayLabel}</span><span class="f-label">${d.label}</span></div>` +
        `<div class="f-mid">${ic(d.icon, "f-icon")}<span class="f-pop">${Math.round(pop || 0)}%</span></div>` +
        `<span class="f-temps"><b>${toTemp(hi)}°</b> / ${toTemp(lo)}°</span>` +
        `</button>`;
    });
    forecastList.innerHTML = daysHtml;

    if (swap) {
      swapEls.forEach((el) => el.classList.remove("swap"));
      void dashboard.offsetWidth;
      swapEls.forEach((el) => el.classList.add("swap"));
    }
  }

  function selectDay(i) {
    if (!current) return;
    if (i !== selectedDay) {
      selectedDay = i;
      render({ animate: false, swap: true });
    }
    if (window.matchMedia("(max-width: 1024px)").matches) {
      document.querySelector(".block-now").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
  }

  forecastList.addEventListener("click", (e) => {
    const row = e.target.closest(".forecast-item[data-i]");
    if (row) selectDay(+row.dataset.i);
  });
  backNowBtn.addEventListener("click", () => selectDay(0));

  function updateLocalTime() {
    if (!current || selectedDay !== 0 || document.hidden) return;
    const tz = current.data.timezone;
    const now = new Date();
    try {
      const date = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: tz });
      const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
      put(localTimeEl, `${date} · ${time}`);
    } catch (_) {
      put(localTimeEl, timeNow());
    }
  }

  (function tickClock() {
    updateLocalTime();
    setTimeout(tickClock, 60000 - (Date.now() % 60000) + 50);
  })();
  document.addEventListener("visibilitychange", updateLocalTime);

  function applyUnitUI() {
    unitButtons.forEach((btn) => {
      const on = btn.dataset.unit === unit;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
  }

  function setUnit(next) {
    if (next === unit) return;
    unit = next;
    applyUnitUI();
    try {
      localStorage.setItem("yw-unit", next);
    } catch (_) {}
    render({ animate: false });
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
    setStatus("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (pos) => loadWeather({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        name: "My Location"
      }),
      () => setStatus("Location access denied.", true),
      { timeout: 8000, maximumAge: 300000 }
    );
  });

  $("hourPrev").addEventListener("click", () =>
    hourlyScroll.scrollBy({ left: -hourlyScroll.clientWidth * 0.8, behavior: "smooth" }));
  $("hourNext").addEventListener("click", () =>
    hourlyScroll.scrollBy({ left: hourlyScroll.clientWidth * 0.8, behavior: "smooth" }));

  let drag = null;
  const endDrag = () => {
    drag = null;
    hourlyScroll.classList.remove("dragging");
  };

  hourlyScroll.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag = { x: e.clientX, left: hourlyScroll.scrollLeft };
    hourlyScroll.setPointerCapture(e.pointerId);
    hourlyScroll.classList.add("dragging");
  });
  hourlyScroll.addEventListener("pointermove", (e) => {
    if (drag) hourlyScroll.scrollLeft = drag.left - (e.clientX - drag.x);
  }, { passive: true });
  hourlyScroll.addEventListener("pointerup", endDrag);
  hourlyScroll.addEventListener("pointercancel", endDrag);
  hourlyScroll.addEventListener("lostpointercapture", endDrag);

  applyUnitUI();
  loadWeather({ lat: 31.5204, lon: 74.3587, name: "Lahore" });
})();
