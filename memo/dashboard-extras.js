"use strict";

const dailyLines = [
  "今天可以慢一点，把心力留给真正重要的事。",
  "有些答案要等散完一次步，才听得见。",
  "先给自己倒杯水，再决定下一步。",
  "没有从清单上划掉的那件事，可以留给明天的你。",
  "允许今天只写一行，它也算是你认真过的一天。",
  "生活里那些没做成的事，未必都要补回来。",
  "先把一个小时过好，整天可以稍后再说。",
  "不妨把难题写在纸上，让心里空出一把椅子。",
  "愿你今天留一点空白，给意外的快乐。",
  "遇到走不通的路，也可以先坐下来看看天。",
  "有时候，安安静静吃完一顿饭就是今天的小成就。",
  "记下一件让你微笑的小事，够了。",
];
const cityStorageKey = "shiri.weather-city.v1";
const weatherStorageKey = "shiri.weather-reading.v1";
const defaultCity = { name: "上海", latitude: 31.2304, longitude: 121.4737 };
const weatherRefreshInterval = 30 * 60 * 1000;
let city = readPreference(cityStorageKey);
if (!validWeatherCity(city)) city = defaultCity;
let weatherRequest;
let weatherRequestedAt = 0;
let citySearchRequest;
let displayedQuoteDay = "";
let quoteRequestedAt = 0;
let quoteReady = false;

function readPreference(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function savePreference(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Weather remains available when storage is disabled.
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function refreshDailyQuote() {
  const todayInChina = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  if (displayedQuoteDay !== todayInChina) {
    displayedQuoteDay = todayInChina;
    quoteReady = false;
    quoteRequestedAt = 0;
    const dayIndex = Date.parse(todayInChina) / 86400000;
    $("daily-quote").textContent = dailyLines[dayIndex % dailyLines.length];
  }
  if (location.protocol === "file:" || quoteReady || Date.now() - quoteRequestedAt < 10 * 60000) return;
  quoteRequestedAt = Date.now();
  try {
    const { date, quote } = await requestJson("./daily-quote.json", {
      cache: "no-cache", signal: AbortSignal.timeout(10000),
    });
    if (date === todayInChina && displayedQuoteDay === date && typeof quote === "string" && quote.trim() && quote.length <= 100) {
      $("daily-quote").textContent = quote.trim();
      quoteReady = true;
    }
  } catch {
    // Keep the local daily line visible if the generated quote is unavailable.
  }
}

function validWeatherCity(place) {
  return typeof place?.name === "string" && place.name.length > 0 &&
    Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90 &&
    Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180;
}

function weatherDescription(code, isDay) {
  if (code === 0) return isDay ? ["sun", "晴"] : ["moon", "晴"];
  if (code === 1 || code === 2) return isDay ? ["partly", "晴间多云"] : ["cloud", "晴间多云"];
  if (code === 3) return ["cloud", "阴"];
  if (code === 45 || code === 48) return ["fog", "雾"];
  if (code >= 95) return ["thunder", "雷雨"];
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ["snow", "下雪"];
  if (code >= 51 && code <= 82) return ["rain", "有雨"];
  return ["cloud", "天气状况未知"];
}

function displayWeather(reading, stale = false) {
  const [icon, description] = weatherDescription(reading.code, reading.isDay);
  applyIcon($("weather-icon"), icon);
  $("weather-temperature").textContent = `${Math.round(reading.temperature)} °C`;
  $("weather-temperature").hidden = false;
  $("weather-caption").textContent = [city.name, description, stale ? "上次更新" : ""].filter(Boolean).join(" · ");
}

async function refreshWeather(force = false) {
  if (!force && Date.now() - weatherRequestedAt < weatherRefreshInterval) return;
  weatherRequest?.abort();
  const controller = new AbortController();
  weatherRequest = controller;
  weatherRequestedAt = Date.now();
  const place = city;
  const coordinateKey = `${place.latitude},${place.longitude}`;
  const cached = readPreference(weatherStorageKey);
  const hasCached = cached?.coordinateKey === coordinateKey && Number.isFinite(cached.temperature) &&
    Date.now() - cached.fetchedAt < 6 * 3600000;
  if (hasCached) {
    displayWeather(cached, Date.now() - cached.fetchedAt >= weatherRefreshInterval);
    if (Date.now() - cached.fetchedAt < weatherRefreshInterval) return;
  } else {
    applyIcon($("weather-icon"), "cloud");
    $("weather-temperature").hidden = true;
    $("weather-caption").textContent = `${place.name} · 正在获取天气…`;
  }
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: place.latitude, longitude: place.longitude, current: "temperature_2m,weather_code,is_day",
  });
  try {
    const { current } = await requestJson(url, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
    });
    if (controller.signal.aborted) return;
    if (!Number.isFinite(current?.temperature_2m) || !Number.isInteger(current.weather_code)) {
      throw new Error("Incomplete weather response");
    }
    const reading = { coordinateKey, fetchedAt: Date.now(), temperature: current.temperature_2m, code: current.weather_code, isDay: current.is_day === 1 };
    savePreference(weatherStorageKey, reading);
    displayWeather(reading);
  } catch {
    if (controller.signal.aborted) return;
    if (hasCached) displayWeather(cached, true);
    else $("weather-caption").textContent = `${place.name} · 天气暂不可用`;
    // Retry next time the page becomes active after a short delay.
    weatherRequestedAt = Date.now() - weatherRefreshInterval + 60000;
  }
}

function weatherSearchStatus(message) {
  $("weather-search-status").textContent = message;
  $("weather-search-status").hidden = !message;
}

async function searchWeatherCities(event) {
  event.preventDefault();
  const query = $("weather-city-query").value.trim();
  citySearchRequest?.abort();
  $("weather-city-results").replaceChildren();
  if (query.length < 2) {
    weatherSearchStatus("请输入城市名称。");
    return;
  }
  const controller = new AbortController();
  citySearchRequest = controller;
  weatherSearchStatus("正在搜索城市…");
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({ name: query, language: "zh", count: "7" });
  try {
    const result = await requestJson(url, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
    });
    if (controller.signal.aborted) return;
    const places = (result.results ?? []).filter(validWeatherCity);
    weatherSearchStatus(places.length ? "" : "没有找到城市。可以试试拼音或英文名。");
    for (const place of places) {
      const choice = element("button", "weather-choice", place.name);
      choice.type = "button";
      const region = [...new Set([place.admin1, place.country])].filter((part) => part && part !== place.name);
      if (region.length) choice.append(element("small", "", region.join(" · ")));
      choice.addEventListener("click", () => {
        city = { name: place.name, latitude: place.latitude, longitude: place.longitude };
        savePreference(cityStorageKey, city);
        $("weather-dialog").close();
        refreshWeather(true);
      });
      const row = element("li");
      row.append(choice);
      $("weather-city-results").append(row);
    }
  } catch {
    if (!controller.signal.aborted) weatherSearchStatus("暂时无法搜索城市，请稍后重试。");
  }
}

$("change-weather-city").addEventListener("click", () => {
  $("weather-search").reset();
  $("weather-city-results").replaceChildren();
  weatherSearchStatus("");
  $("weather-dialog").showModal();
});
$("weather-close").addEventListener("click", () => $("weather-dialog").close());
$("weather-dialog").addEventListener("close", () => citySearchRequest?.abort());
$("weather-search").addEventListener("submit", searchWeatherCities);

function refreshDashboardExtras() {
  if (document.hidden) return;
  refreshDailyQuote();
  refreshWeather();
}

refreshDailyQuote();
refreshWeather();
window.setInterval(refreshDashboardExtras, 60000);
document.addEventListener("visibilitychange", refreshDashboardExtras);
