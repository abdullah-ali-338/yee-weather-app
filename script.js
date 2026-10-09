document.addEventListener("DOMContentLoaded", () => {
  // Initialize Icons safely
  if (typeof feather !== 'undefined') {
    feather.replace();
  }

  // DOM Elements Safely Selected
  const searchInput = document.getElementById("searchInput");
  const searchWrapper = document.getElementById("searchWrapper");
  const searchResults = document.getElementById("searchResults");
  const focusOverlay = document.getElementById("focusOverlay");
  const dashboard = document.getElementById("dashboard");
  const globalLoader = document.getElementById("globalLoader");

  // Helper to close search smoothly
  function closeSearch() {
    if (!searchWrapper || !focusOverlay || !dashboard || !searchResults || !searchInput) return;

    searchWrapper.classList.remove("active");
    focusOverlay.classList.remove("active");
    dashboard.classList.remove("blur-bg");

    // Wait for collapse animation before clearing content
    setTimeout(() => {
      searchResults.innerHTML = "";
      searchResults.classList.remove("has-data");
      searchInput.value = "";
    }, 400);
  }

  // =========================================
  // LIQUID SEARCH ANIMATION LOGIC
  // =========================================
  if (searchInput && searchWrapper && focusOverlay && dashboard) {
    searchInput.addEventListener("focus", () => {
      searchWrapper.classList.add("active");
      focusOverlay.classList.add("active");
      dashboard.classList.add("blur-bg");
    });

    // Close search when clicking outside
    focusOverlay.addEventListener("click", closeSearch);
  }

  // =========================================
  // WEATHER API LOGIC
  // =========================================
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
      case 55: return { label: "Drizzle", icon: "cloud-drizzle" };
      case 61:
      case 63:
      case 65: return { label: "Rain Showers", icon: "cloud-rain" };
      case 71:
      case 73:
      case 75: return { label: "Snow", icon: "cloud-snow" };
      case 95:
      case 96:
      case 99: return { label: "Thunderstorm", icon: "cloud-lightning" };
      default: return { label: "Clear", icon: "sun" };
    }
  }

  // Fetch Full Weather Data
  async function fetchWeather(lat, lon, cityName) {
    // 1. Trigger search close smoothly
    closeSearch();

    // 2. Trigger smooth fade out animation for dashboard
    if (dashboard) dashboard.classList.add("updating");

    // Initial load fallback (if no data exists yet)
    const tempElement = document.getElementById("mainTemp");
    if (tempElement && tempElement.textContent === "32°" && cityName === "Lahore") {
      if (globalLoader) globalLoader.classList.remove("hidden");
    }

    try {
      // Advanced endpoint fetching current extended metrics + daily forecast
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
      const res = await fetch(url);
      const data = await res.json();

      const current = data.current;
      const details = getWeatherDetails(current.weather_code);

      // Give the fade-out animation a tiny moment to finish before swapping data
      setTimeout(() => {
        // Update UI Safely using textContent
        const elCityName = document.getElementById("headerCityName");
        if (elCityName) elCityName.textContent = cityName;

        const elMainTemp = document.getElementById("mainTemp");
        if (elMainTemp) elMainTemp.textContent = `${Math.round(current.temperature_2m)}°`;

        const elCondition = document.getElementById("conditionDesc");
        if (elCondition) elCondition.textContent = details.label;

        const elWind = document.getElementById("windSpeed");
        if (elWind) elWind.textContent = `${current.wind_speed_10m} km/h`;

        const elHumidity = document.getElementById("humidity");
        if (elHumidity) elHumidity.textContent = `${current.relative_humidity_2m}%`;

        const elFeelsLike = document.getElementById("feelsLike");
        if (elFeelsLike) elFeelsLike.textContent = `${Math.round(current.apparent_temperature)}°`;

        // Update Main Icon safely
        const mainIcon = document.getElementById("mainIcon");
        if (mainIcon && mainIcon.parentNode) {
          mainIcon.parentNode.innerHTML = `<i data-feather="${details.icon}" class="weather-icon-large" id="mainIcon"></i>`;
        }

        // Populate 7-Day Forecast safely
        const forecastList = document.getElementById("forecastList");
        if (forecastList) {
          forecastList.innerHTML = "";

          data.daily.time.forEach((dateStr, idx) => {
            const dayName = idx === 0 ? "Today" : new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
            const dayDetails = getWeatherDetails(data.daily.weather_code[idx]);
            const max = Math.round(data.daily.temperature_2m_max[idx]);
            const min = Math.round(data.daily.temperature_2m_min[idx]);

            forecastList.innerHTML += `
              <div class="forecast-item">
                <span class="f-day">${dayName}</span>
                <div class="f-cond">
                  <i data-feather="${dayDetails.icon}" style="width: 18px; height: 18px;"></i>
                  <span>${dayDetails.label}</span>
                </div>
                <div class="f-temps">${max}° <span>/ ${min}°</span></div>
              </div>
            `;
          });
        }

        // Re-render new feather icons
        if (typeof feather !== 'undefined') feather.replace();

        // 3. Fade the dashboard back in
        if (dashboard) dashboard.classList.remove("updating");
        if (globalLoader) globalLoader.classList.add("hidden");
      }, 400); // 400ms delay matches the CSS transition time

    } catch (err) {
      console.error("Atmosphere fetch failed.", err);
      if (dashboard) dashboard.classList.remove("updating");
      if (globalLoader) globalLoader.classList.add("hidden");
    }
  }

  // Geocoding Autocomplete Search
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim();
      clearTimeout(searchTimeout);

      if (query.length < 3) {
        if (searchResults) {
          searchResults.classList.remove("has-data");
          searchResults.innerHTML = "";
        }
        return;
      }

      // Debounce API calls slightly
      searchTimeout = setTimeout(async () => {
        try {
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
          const data = await res.json();

          if (searchResults) {
            searchResults.innerHTML = "";

            if (data.results && data.results.length > 0) {
              data.results.forEach(city => {
                const item = document.createElement("div");
                item.className = "dropdown-item";
                item.innerHTML = `
                  <span class="dropdown-city">${city.name}</span>
                  <span class="dropdown-country">${city.country}</span>
                `;
                item.onclick = () => fetchWeather(city.latitude, city.longitude, city.name);
                searchResults.appendChild(item);
              });
              searchResults.classList.add("has-data");
            } else {
              searchResults.classList.remove("has-data");
            }
          }
        } catch (error) {
          console.error(error);
        }
      }, 300);
    });
  }

  // Initialize default location (Lahore)
  fetchWeather(31.5204, 74.3587, "Lahore");

});
