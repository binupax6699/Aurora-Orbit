/* ================= COUNTRY PANEL (SMALL BAR + BIG MENU) ================= */

/*i use AI in sum of the code */

/*
    - Flags          flags
    - Weather/time   Meteo
    - Basics         REST Countries
    - GDP            World Bank $_$
    - Photos         Wikipedia + Wikimedia
*/

(function () {
    "use strict";

    const panel = document.getElementById("country-panel");
    if (!panel) return;

    const FLAG_BASE = "https://cdn.jsdelivr.net/gh/HatScripts/circle-flags/flags/";
    const WEATHER_ICON_PATH = "icons/weather/";
    const WEATHER_CACHE_MS = 10 * 60 * 1000;
    const SWAP_MS = 900;

    const WIKI_TITLE_OVERRIDES = {
        "Georgia": "Georgia (country)",
        "Gambia": "The Gambia",
        "Bahamas": "The Bahamas",
        "Ireland": "Republic of Ireland",
        "Micronesia": "Federated States of Micronesia",
        "Palestine": "State of Palestine",
        "Republic of the Congo": "Republic of the Congo",
        "Sao Tome and Principe": "São Tomé and Príncipe"
    };

    const WEATHER_CODES = {
        0:  ["Clear sky", "day-sunny", "night-clear"],
        1:  ["Mainly clear", "day-sunny", "night-clear"],
        2:  ["Partly cloudy", "day-cloudy", "night-alt-cloudy"],
        3:  ["Overcast", "cloudy", "cloudy"],
        45: ["Fog", "day-fog", "night-fog"],
        48: ["Rime fog", "day-fog", "night-fog"],
        51: ["Light drizzle", "day-sprinkle", "night-alt-sprinkle"],
        53: ["Drizzle", "day-sprinkle", "night-alt-sprinkle"],
        55: ["Heavy drizzle", "day-sprinkle", "night-alt-sprinkle"],
        56: ["Freezing drizzle", "day-sleet", "night-alt-sleet"],
        57: ["Freezing drizzle", "day-sleet", "night-alt-sleet"],
        61: ["Light rain", "day-rain", "night-alt-rain"],
        63: ["Rain", "day-rain", "night-alt-rain"],
        65: ["Heavy rain", "rain", "rain"],
        66: ["Freezing rain", "day-sleet", "night-alt-sleet"],
        67: ["Freezing rain", "day-sleet", "night-alt-sleet"],
        71: ["Light snow", "day-snow", "night-alt-snow"],
        73: ["Snow", "day-snow", "night-alt-snow"],
        75: ["Heavy snow", "snow", "snow"],
        77: ["Snow grains", "snowflake-cold", "snowflake-cold"],
        80: ["Light showers", "day-showers", "night-alt-showers"],
        81: ["Showers", "day-showers", "night-alt-showers"],
        82: ["Violent showers", "showers", "showers"],
        85: ["Snow showers", "day-snow", "night-alt-snow"],
        86: ["Heavy snow showers", "snow", "snow"],
        95: ["Thunderstorm", "day-thunderstorm", "night-alt-thunderstorm"],
        96: ["Thunderstorm, hail", "day-storm-showers", "night-alt-storm-showers"],
        99: ["Thunderstorm, heavy hail", "day-storm-showers", "night-alt-storm-showers"]
    };

    const CONTINENTS = {
        "Europe": "AL AD AT BY BE BA BG HR CY CZ DK EE FI FR DE GR HU IS IE IT XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA",
        "Asia": "AF AM AZ BH BD BT BN KH CN GE IN ID IR IQ IL JP JO KZ KW KG LA LB MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TW TJ TH TL TR TM AE UZ VN YE",
        "Africa": "DZ AO BJ BW BF BI CV CM CF TD KM CD CG CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW EH",
        "North America": "AG BS BB BZ CA CR CU DM DO SV GD GT HT HN JM MX NI PA KN LC VC TT US GL",
        "South America": "AR BO BR CL CO EC GY PY PE SR UY VE GF",
        "Oceania": "AU FJ KI MH FM NR NZ PW PG WS SB TO TV VU",
        "Antarctica": "AQ"
    };

    const CONTINENT_BY_ISO2 = {};
    Object.entries(CONTINENTS).forEach(([name, codes]) => codes.split(" ").forEach(code => { CONTINENT_BY_ISO2[code] = name; }));

    /* ELEMENT REFERENCES */
    const $ = id => document.getElementById(id);
    const ui = {
        miniFlag: $("cp-mini-flag"), miniCode: $("cp-mini-code"), miniTime: $("cp-mini-time"),
        miniIcon: $("cp-mini-wicon"), miniTemp: $("cp-mini-temp"),
        expandBtn: $("cp-expand-btn"), collapseBtn: $("cp-collapse-btn"),
        date: $("cp-date"), time: $("cp-time"), ampm: $("cp-ampm"),
        flag: $("cp-flag"), name: $("cp-name"), region: $("cp-region"),
        gdpTitle: $("cp-gdp-title"), chart: $("cp-chart"), gdpValue: $("cp-gdp-value"), gdpCapita: $("cp-gdp-capita"),
        area: $("cp-area"), pop: $("cp-pop"),
        photos: $("cp-photos"),
        wIcon: $("cp-wicon"), wTemp: $("cp-wtemp"), wCity: $("cp-wcity"), wText: $("cp-wtext"), wHigh: $("cp-whigh"), wLow: $("cp-wlow")
    };

    /* STATE */
    let state = "hidden";          // hidden | mini | big
    let lastMode = "mini";         // remembers what the user left open
    let current = null;            // selected entity
    let requestToken = 0;          // ignores answers from a previously selected country
    let swapTimer = null;
    const clock = { tz: null, timeFmt: null, dateFmt: null, timer: null, lastKey: "" };
    const cache = new Map();

    /* HELPERS */
    function memo(key, factory) {
        if (!cache.has(key)) {
            const promise = factory().catch(error => { cache.delete(key); throw error; });
            cache.set(key, promise);
        }
        return cache.get(key);
    }

    async function getJSON(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    function setText(node, text) {
        if (!node) return;
        node.textContent = text;
        node.classList.remove("skel");
    }

    function setSkeleton(node, width = 7) {
        if (!node) return;
        node.textContent = "\u00a0".repeat(width);
        node.classList.add("skel");
    }

    function fmtMoney(value) {
        if (value >= 1e12) return `${(value / 1e12).toFixed(value >= 1e13 ? 1 : 2)} Trillion`;
        if (value >= 1e9) return `${(value / 1e9).toFixed(1)} Billion`;
        if (value >= 1e6) return `${(value / 1e6).toFixed(1)} Million`;
        return Math.round(value).toLocaleString("en-US");
    }

    function fmtShort(value) {
        if (value >= 1e12) return `${+(value / 1e12).toFixed(1)}T`;
        if (value >= 1e9) return `${+(value / 1e9).toFixed(1)}B`;
        if (value >= 1e6) return `${+(value / 1e6).toFixed(1)}M`;
        return String(Math.round(value));
    }

    function fmtArea(km2) {
        if (km2 >= 1e6) return `${(km2 / 1e6).toFixed(2)} million km²`;
        return `${Math.round(km2).toLocaleString("en-US")} km²`;
    }

    function fmtPopulation(n) {
        if (n >= 1e9) return `${(n / 1e9).toFixed(3)} billion`;
        if (n >= 1e6) return `${(n / 1e6).toFixed(2)} million`;
        return Math.round(n).toLocaleString("en-US");
    }

    function niceCeil(value) {
        const power = Math.pow(10, Math.floor(Math.log10(value)));
        const n = value / power;
        const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
        return step * power;
    }

    function wikiTitle(entity) {
        return WIKI_TITLE_OVERRIDES[entity.name] || entity.name;
    }

    /* PANEL STATE (hidden / mini / big) */
    function setState(next) {
        if (next === state) return;

        if (state === "big" && next === "mini") {
            panel.classList.add("swap");
            clearTimeout(swapTimer);
            swapTimer = setTimeout(() => panel.classList.remove("swap"), SWAP_MS);
        }

        state = next;
        panel.dataset.state = next;
        if (next !== "hidden") lastMode = next;

        const isMini = next === "mini";
        const isBig = next === "big";
        if (ui.expandBtn) ui.expandBtn.tabIndex = isMini ? 0 : -1;
        if (ui.collapseBtn) ui.collapseBtn.tabIndex = isBig ? 0 : -1;
        panel.setAttribute("aria-hidden", String(next === "hidden"));
    }

    /* CLOCK (Time) */
    function setTimezone(tz) {
        clock.tz = null;
        clock.lastKey = "";
        if (tz) {
            try {
                clock.timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true });
                clock.dateFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "2-digit", day: "2-digit", year: "numeric" });
                clock.tz = tz;
            } catch (error) {
                console.warn("[Aurora Orbit] Unknown timezone:", tz);
            }
        }
        updateClock();
    }

    function updateClock() {
        if (!clock.tz) {
            setText(ui.miniTime, "--:--");
            setText(ui.time, "--:--");
            setText(ui.ampm, "");
            setText(ui.date, "--/--/----");
            return;
        }

        const now = new Date();
        const parts = clock.timeFmt.formatToParts(now);
        const pick = type => (parts.find(p => p.type === type) || {}).value || "";
        const hh = pick("hour");
        const mm = pick("minute");
        const ap = pick("dayPeriod").toUpperCase();
        const dateText = clock.dateFmt.format(now);

        const key = `${dateText}|${hh}:${mm}|${ap}`;
        if (key === clock.lastKey) return;
        clock.lastKey = key;

        setText(ui.miniTime, `${hh}:${mm}`);
        setText(ui.time, `${hh}:${mm}`);
        setText(ui.ampm, ap);
        setText(ui.date, dateText);
    }

    function startClock() {
        if (clock.timer) return;
        clock.timer = setInterval(updateClock, 1000);
    }

    function stopClock() {
        clearInterval(clock.timer);
        clock.timer = null;
    }

    /* DATA LOADERS */
    async function fetchWorldBankLatest(iso3, indicator) {
        const data = await getJSON(`https://api.worldbank.org/v2/country/${iso3}/indicator/${indicator}?format=json&mrnev=1`);
        const row = data && data[1] && data[1][0];
        return row && row.value != null ? row.value : null;
    }

    async function fetchBasics(entity) {
        try {
            const fields = "capital,capitalInfo,region,area,population,latlng";
            const data = await getJSON(`https://restcountries.com/v3.1/alpha/${entity.iso2}?fields=${fields}`);
            const c = Array.isArray(data) ? data[0] : data;
            const capitalLatLng = (c.capitalInfo && c.capitalInfo.latlng) || c.latlng || [];
            return {
                region: c.region || "",
                capital: (c.capital && c.capital[0]) || "",
                lat: capitalLatLng[0],
                lng: capitalLatLng[1],
                area: c.area,
                population: c.population
            };
        } catch (error) {
            console.warn("[Aurora Orbit] REST Countries failed, trying World Bank:", error.message);
        }

        const basics = {};
        try {
            const data = await getJSON(`https://api.worldbank.org/v2/country/${entity.iso3}?format=json`);
            const c = data && data[1] && data[1][0];
            if (c) {
                basics.region = c.region && c.region.value !== "Aggregates" ? c.region.value : "";
                basics.capital = c.capitalCity || "";
                basics.lat = parseFloat(c.latitude);
                basics.lng = parseFloat(c.longitude);
            }
        } catch (error) { /* ignore */ }

        try { basics.population = await fetchWorldBankLatest(entity.iso3, "SP.POP.TOTL"); } catch (error) { /* ignore */ }
        try { basics.area = await fetchWorldBankLatest(entity.iso3, "AG.SRF.TOTL.K2"); } catch (error) { /* ignore */ }
        return basics;
    }

    async function fetchWeather(lat, lng) {
        const key = `weather:${lat.toFixed(2)},${lng.toFixed(2)}`;
        const hit = cache.get(key);
        if (hit && Date.now() - hit.time < WEATHER_CACHE_MS) return hit.value;

        const url = "https://api.open-meteo.com/v1/forecast" +
            `?latitude=${lat}&longitude=${lng}` +
            "&current=temperature_2m,weather_code,is_day" +
            "&daily=temperature_2m_max,temperature_2m_min" +
            "&timezone=auto&forecast_days=1";
        const data = await getJSON(url);
        const value = {
            temp: data.current.temperature_2m,
            code: data.current.weather_code,
            isDay: data.current.is_day === 1,
            high: data.daily.temperature_2m_max[0],
            low: data.daily.temperature_2m_min[0],
            timezone: data.timezone
        };
        cache.set(key, { time: Date.now(), value });
        return value;
    }

    async function fetchWorldBankSeries(iso3, indicator) {
        const data = await getJSON(`https://api.worldbank.org/v2/country/${iso3}/indicator/${indicator}?format=json&per_page=80&date=2000:2026`);
        const rows = (data && data[1]) || [];
        return rows
            .filter(row => row.value != null)
            .map(row => ({ year: Number(row.date), value: Number(row.value) }))
            .sort((a, b) => a.year - b.year);
    }

    async function fetchGdp(entity) {
        const [gdp, capita] = await Promise.all([
            fetchWorldBankSeries(entity.iso3, "NY.GDP.MKTP.CD"),
            fetchWorldBankSeries(entity.iso3, "NY.GDP.PCAP.CD").catch(() => [])
        ]);
        const capitaByYear = new Map(capita.map(p => [p.year, p.value]));
        return { gdp, capitaByYear };
    }

    async function fetchPhotos(entity, capital) {
        const titles = [wikiTitle(entity), capital].filter(Boolean).join("|");
        const url = "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*" +
            `&generator=images&gimlimit=60&titles=${encodeURIComponent(titles)}` +
            "&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=640";
        const data = await getJSON(url);
        const pages = Object.values((data.query && data.query.pages) || {});
        const skip = /flag|map|coat|emblem|seal|locator|location|logo|icon|symbol|diagram|signature|stamp|banknote|coin|portrait|chart|graph/i;

        return pages
            .sort((a, b) => (a.index || 0) - (b.index || 0))
            .filter(page => {
                const info = page.imageinfo && page.imageinfo[0];
                return info && info.mime === "image/jpeg" && info.width >= 900 && info.thumburl && !skip.test(page.title);
            })
            .slice(0, 4)
            .map(page => ({ url: page.imageinfo[0].thumburl, title: page.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, "") }));
    }

    /* WEATHER */
    function weatherInfo(code, isDay) {
        const entry = WEATHER_CODES[code] || ["Unknown", "cloud", "cloud"];
        return { text: entry[0], icon: `${WEATHER_ICON_PATH}wi-${isDay ? entry[1] : entry[2]}.svg` };
    }

    function renderWeather(weather) {
        const info = weatherInfo(weather.code, weather.isDay);
        const temp = `${Math.round(weather.temp)}°C`;

        [ui.miniIcon, ui.wIcon].forEach(img => {
            if (!img) return;
            img.style.visibility = "visible";
            img.src = info.icon;
            img.alt = info.text;
        });
        setText(ui.miniTemp, temp);
        setText(ui.wTemp, temp);
        setText(ui.wText, info.text);
        setText(ui.wHigh, `H:${Math.round(weather.high)}`);
        setText(ui.wLow, `L:${Math.round(weather.low)}`);
    }

    function renderWeatherError() {
        [ui.miniIcon, ui.wIcon].forEach(img => { if (img) img.style.visibility = "hidden"; });
        setText(ui.miniTemp, "--°C");
        setText(ui.wTemp, "--°C");
        setText(ui.wText, "Weather unavailable");
        setText(ui.wHigh, "H:--");
        setText(ui.wLow, "L:--");
    }

    /* GDP CHART */
    function renderGdp(entity, result) {
        const series = result.gdp;
        ui.chart.innerHTML = "";

        if (series.length < 2) {
            ui.chart.innerHTML = '<div class="cp-empty">GDP data not available</div>';
            setText(ui.gdpValue, "—");
            setText(ui.gdpCapita, "");
            return;
        }

        const W = 190, H = 100, L = 26, R = 6, T = 12, B = 14;
        const y0 = series[0].year;
        const y1 = series[series.length - 1].year;
        const span = Math.max(1, y1 - y0);
        const maxValue = niceCeil(Math.max(...series.map(p => p.value)));
        const X = year => L + ((year - y0) / span) * (W - L - R);
        const Y = value => T + (1 - value / maxValue) * (H - T - B);

        const path = series.map((p, i) => `${i ? " L" : "M"}${X(p.year).toFixed(1)} ${Y(p.value).toFixed(1)}`).join("");
        const grid = [0, 0.5, 1].map(f => {
            const y = Y(maxValue * f).toFixed(1);
            return `<line class="cp-grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/>` +
                   `<text class="cp-axis" x="${L - 4}" y="${(+y + 2.5).toFixed(1)}" text-anchor="end">${f === 0 ? "0" : fmtShort(maxValue * f)}</text>`;
        }).join("");
        const midYear = Math.round((y0 + y1) / 2);
        const xLabels = [[y0, "start"], [midYear, "middle"], [y1, "end"]].map(([year, anchor]) =>
            `<text class="cp-axis" x="${X(year).toFixed(1)}" y="${H - 2}" text-anchor="${anchor}">${year}</text>`).join("");

        ui.chart.innerHTML =
            `<svg class="cp-chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="GDP of ${entity.name}">` +
            grid + xLabels +
            `<path class="cp-gdp-line" d="${path}"/>` +
            '<g class="cp-marker"><line class="cp-marker-line"/><circle class="cp-marker-dot" r="2.6"/>' +
            '<rect class="cp-marker-tag" width="28" height="11" rx="5.5" y="0"/><text class="cp-marker-text" text-anchor="middle" y="8"></text></g>' +
            `<rect class="cp-hit" x="${L}" y="0" width="${W - L - R}" height="${H}"/>` +
            "</svg>";

        const svg = ui.chart.querySelector("svg");
        const line = svg.querySelector(".cp-gdp-line");
        const marker = svg.querySelector(".cp-marker");
        const markerLine = svg.querySelector(".cp-marker-line");
        const markerDot = svg.querySelector(".cp-marker-dot");
        const markerTag = svg.querySelector(".cp-marker-tag");
        const markerText = svg.querySelector(".cp-marker-text");

        function showPoint(index) {
            const point = series[index];
            const x = X(point.year);
            const tagX = Math.max(L + 14, Math.min(W - 14, x));
            markerLine.setAttribute("x1", x); markerLine.setAttribute("x2", x);
            markerLine.setAttribute("y1", T); markerLine.setAttribute("y2", H - B);
            markerDot.setAttribute("cx", x); markerDot.setAttribute("cy", Y(point.value));
            markerTag.setAttribute("x", tagX - 14);
            markerText.setAttribute("x", tagX);
            markerText.textContent = point.year;

            setText(ui.gdpValue, fmtMoney(point.value));
            const capita = result.capitaByYear.get(point.year);
            setText(ui.gdpCapita, capita != null ? `Per capita: $${Math.round(capita).toLocaleString("en-US")}` : "Per capita: —");
        }

        const last = series.length - 1;
        showPoint(last);

        svg.querySelector(".cp-hit").addEventListener("pointermove", event => {
            const rect = svg.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * W;
            const year = y0 + ((x - L) / (W - L - R)) * span;
            let best = 0;
            series.forEach((p, i) => { if (Math.abs(p.year - year) < Math.abs(series[best].year - year)) best = i; });
            showPoint(best);
        });
        svg.querySelector(".cp-hit").addEventListener("pointerleave", () => showPoint(last));

        const length = line.getTotalLength();
        line.style.strokeDasharray = length;
        line.style.strokeDashoffset = length;
        marker.style.opacity = "0";
        requestAnimationFrame(() => requestAnimationFrame(() => {
            line.style.transition = "stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)";
            line.style.strokeDashoffset = "0";
            marker.style.transition = "opacity 0.5s ease 1s";
            marker.style.opacity = "1";
        }));
    }

    /* PHOTOS */
    function showPhotoSkeleton() {
        ui.photos.className = "cp-photos";
        ui.photos.innerHTML = '<div class="cp-photo"></div>'.repeat(4);
    }

    function renderPhotos(photos) {
        if (!photos.length) {
            ui.photos.className = "cp-photos is-empty";
            ui.photos.innerHTML = '<div class="cp-empty">No photos available</div>';
            return;
        }

        ui.photos.className = `cp-photos n-${photos.length}`;
        ui.photos.innerHTML = "";
        photos.forEach((photo, index) => {
            const tile = document.createElement("div");
            tile.className = "cp-photo";
            tile.style.setProperty("--delay", `${index * 0.12}s`);

            const img = document.createElement("img");
            img.alt = photo.title;
            img.title = photo.title;
            img.decoding = "async";
            img.addEventListener("load", () => img.classList.add("loaded"));
            img.addEventListener("error", () => tile.classList.add("failed"));
            img.src = photo.url;

            tile.appendChild(img);
            ui.photos.appendChild(tile);
        });
    }

    /* LOAD A COUNTRY */
    function resetContent(entity) {
        const code = (entity.iso2 || "").toUpperCase();
        const flagUrl = `${FLAG_BASE}${(entity.iso2 || "").toLowerCase()}.svg`;

        [ui.miniFlag, ui.flag].forEach(img => {
            img.style.visibility = "visible";
            img.src = flagUrl;
            img.alt = `${entity.name} flag`;
        });

        setText(ui.miniCode, code);
        setText(ui.name, entity.name);
        setText(ui.region, CONTINENT_BY_ISO2[code] || "");
        setSkeleton(ui.wCity, 6);
        setText(ui.gdpTitle, `GDP - ${entity.name}`);
        ui.chart.innerHTML = '<div class="cp-chart-skel"></div>';
        setSkeleton(ui.gdpValue, 9);
        setSkeleton(ui.gdpCapita, 12);
        setSkeleton(ui.area, 9);
        setSkeleton(ui.pop, 9);
        showPhotoSkeleton();

        [ui.miniIcon, ui.wIcon].forEach(img => { img.removeAttribute("src"); img.style.visibility = "hidden"; });
        setSkeleton(ui.miniTemp, 4);
        setSkeleton(ui.wTemp, 4);
        setSkeleton(ui.wText, 10);
        setSkeleton(ui.wHigh, 3);
        setSkeleton(ui.wLow, 3);

        setTimezone(null);
    }

    function loadCountry(entity, token) {
        const fresh = () => token === requestToken;
        const key = entity.iso2 || entity.iso3 || entity.name;

        // Basics -> weather + time
        const basicsPromise = memo(`basics:${key}`, () => fetchBasics(entity));

        basicsPromise.then(async basics => {
            if (!fresh()) return;
            setText(ui.wCity, basics.capital || entity.name);
            setText(ui.area, basics.area ? fmtArea(basics.area) : "—");
            setText(ui.pop, basics.population ? fmtPopulation(basics.population) : "—");

            const lat = Number.isFinite(basics.lat) ? basics.lat : entity.lat;
            const lng = Number.isFinite(basics.lng) ? basics.lng : entity.lng;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("No coordinates");

            const weather = await fetchWeather(lat, lng);
            if (!fresh()) return;
            renderWeather(weather);
            setTimezone(weather.timezone);
        }).catch(error => {
            console.warn("[Aurora Orbit] Basics/weather failed:", error.message);
            if (!fresh()) return;
            setText(ui.wCity, entity.name);
            if (ui.area.classList.contains("skel")) setText(ui.area, "—");
            if (ui.pop.classList.contains("skel")) setText(ui.pop, "—");
            renderWeatherError();
        });

        // GDP
        memo(`gdp:${key}`, () => fetchGdp(entity)).then(result => {
            if (fresh()) renderGdp(entity, result);
        }).catch(error => {
            console.warn("[Aurora Orbit] GDP failed:", error.message);
            if (!fresh()) return;
            ui.chart.innerHTML = '<div class="cp-empty">GDP data not available</div>';
            setText(ui.gdpValue, "—");
            setText(ui.gdpCapita, "");
        });

        // Photos
        basicsPromise.catch(() => ({})).then(basics =>
            memo(`photos:${key}`, () => fetchPhotos(entity, basics && basics.capital))
        ).then(photos => {
            if (fresh()) renderPhotos(photos);
        }).catch(error => {
            console.warn("[Aurora Orbit] Photos failed:", error.message);
            if (fresh()) renderPhotos([]);
        });
    }

    /* PUBLIC API */
    function open(entity) {
        if (!entity) return;
        if (current === entity && state !== "hidden") return;

        current = entity;
        const token = ++requestToken;
        resetContent(entity);
        startClock();
        setState(state === "hidden" ? lastMode : state);
        loadCountry(entity, token);
    }

    function close() {
        current = null;
        requestToken++;
        stopClock();
        setState("hidden");
    }

    window.CountryPanel = { open, close };

    /* EVENTS */
    if (ui.expandBtn) ui.expandBtn.addEventListener("click", () => setState("big"));
    if (ui.collapseBtn) ui.collapseBtn.addEventListener("click", () => setState("mini"));

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && state === "big") setState("mini");
    });

     [ui.miniFlag, ui.flag, ui.miniIcon, ui.wIcon].forEach(img => {
        if (img) img.addEventListener("error", () => { img.style.visibility = "hidden"; });
    });

    setState("hidden");
})();
