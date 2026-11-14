// weather layers: right panel + globe overlays
// temperature = monthly PNGs, wind = 3D flowing lines, precipitation = GPU shader
// wind and precipitation can be fake (made in code) or live (Open-Meteo)

(function () {
    "use strict";

    // ---------- settings (edit these) ----------

    // "fake" = made in code / PNG, "live" = real-time from Open-Meteo (falls back to fake if it fails)
    const MODE = {
        temperature: "fake",       // temperature always uses the PNGs
        wind: "live",
        precipitation: "live"
    };

    const TEMP_FOLDER = "weather/temp/";       // temp1.png ... temp12.png (the current month loads by itself)

    const OVERLAY_RADIUS = GLOBE_RADIUS_UNITS - 0.01;   // under the country dots, above the dark core
    const FADE_SPEED = 0.12;                            // fade in / out speed (bigger = faster)
    const SHOW_TAG = true;                              // the "Real time / Non real time" text

    // things on the globe that hide while a weather layer is on
    const HIDE_WHILE_ACTIVE = [() => cloudGroup];

    // wind look
    const WIND_PARTICLES = 10000;       // fewer = faster on phones
    const WIND_TRAIL = 16;             // line length (points per line)
    const WIND_SPEED_SCALE = 0.035;    // how fast the lines move

    // live data grid (one point every N degrees)
    const LIVE_STEP = 12;              // 12 = about 450 points (one request round). Smaller = many more API calls
    const LIVE_CACHE_HOURS = 3;        // live data is kept in the browser for this long
    const LIVE_CACHE_KEY = "aurora-orbit-weather-live";

    // color scale: top = highest value. Used by the legend and the shaders
    // (the temperature PNGs have their own colors, make them match if you want the legend to match)
    const LAYERS = {
        temperature: {
            opacity: 0.9,
            stops: [
                { v: -20, c: "#5b1f9c" },
                { v: -10, c: "#2a47d8" },
                { v: 0,   c: "#21b4e6" },
                { v: 10,  c: "#35d07f" },
                { v: 20,  c: "#f3e53b" },
                { v: 30,  c: "#f7902a" },
                { v: 55,  c: "#c2171f" }
            ]
        },
        wind: {                                   // km/h, keep 5 evenly spaced stops
            opacity: 1,
            stops: [
                { v: 0,  c: "#3f7bff" },
                { v: 20, c: "#52d6ff" },
                { v: 40, c: "#b9f5c8" },
                { v: 60, c: "#ffe27a" },
                { v: 80, c: "#ffffff" }
            ]
        },
        precipitation: {                          // keep 4 stops
            opacity: 1,
            stops: [
                { v: "Light",    c: "#2f80ff" },
                { v: "Moderate", c: "#9b3fd1" },
                { v: "Heavy",    c: "#ffcf3a" },
                { v: "Extreme",  c: "#ffffff" }
            ]
        }
    };

    const TAG_TEXT = { live: "Real time", fake: "Non real time", loading: "Loading", error: "Layer failed, see console (F12)" };

    // NON-COMMERCIAL ONLY while Open-Meteo is used (live weather + country panel).
    // If this project becomes commercial: pay for Open-Meteo or replace the source.

    // ---------- elements ----------

    const $ = id => document.getElementById(id);
    const root = document.documentElement;

    const panel = $("weather-panel");
    if (!panel || typeof globeGroup === "undefined") {
        console.warn("Weather: panel HTML or globe not found");
        return;
    }

    const missing = ["wl-legend", "wl-legend-bar", "wl-legend-labels", "wl-tag", "wl-tag-text"]
        .filter(id => !$(id));
    if (missing.length) {
        console.warn("Weather: missing HTML elements:", missing.join(", "), "(use the newest)");
        return;
    }

    const toggleBtn = $("wp-toggle");
    const tabBtn = $("wp-tab");
    const layerBtns = Array.from(panel.querySelectorAll(".wp-layer"));
    const legend = $("wl-legend");
    const legendBar = $("wl-legend-bar");
    const legendLabels = $("wl-legend-labels");
    const tag = $("wl-tag");
    const tagText = $("wl-tag-text");

    const SMALL_SCREEN = window.innerWidth <= 700;

    // ---------- colors ----------

    function isLight() { return root.classList.contains("light"); }

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function rampColor(value, stops) {
        if (value <= stops[0].v) return hexToRgb(stops[0].c);
        for (let i = 1; i < stops.length; i++) {
            if (value <= stops[i].v) {
                const a = stops[i - 1], b = stops[i];
                const t = (value - a.v) / (b.v - a.v);
                const ca = hexToRgb(a.c), cb = hexToRgb(b.c);
                return [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t];
            }
        }
        return hexToRgb(stops[stops.length - 1].c);
    }

    // the light theme inverts the whole page with a CSS filter,
    // so colors on the globe get the opposite color to look right again
    function lightRgb(rgb) {
        const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
        const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v);
        return [
            clamp(1 - (-0.574 * r + 1.430 * g + 0.144 * b)) * 255,
            clamp(1 - ( 0.426 * r + 0.430 * g + 0.144 * b)) * 255,
            clamp(1 - ( 0.426 * r + 1.430 * g - 0.856 * b)) * 255
        ];
    }

    function themed(rgb) { return isLight() ? lightRgb(rgb) : rgb; }

    // stop color as a THREE.Color (theme aware)
    function stopColor(stop) {
        const rgb = themed(hexToRgb(stop.c));
        return new THREE.Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    }

    function lightFix(source) {
        try {
            const c = document.createElement("canvas");
            c.width = source.width;
            c.height = source.height;
            const ctx = c.getContext("2d");
            ctx.drawImage(source, 0, 0);
            const img = ctx.getImageData(0, 0, c.width, c.height);
            const d = img.data;
            for (let i = 0; i < d.length; i += 4) {
                const out = lightRgb([d[i], d[i + 1], d[i + 2]]);
                d[i] = out[0];
                d[i + 1] = out[1];
                d[i + 2] = out[2];
            }
            ctx.putImageData(img, 0, 0);
            return c;
        } catch (error) {
            return source;
        }
    }

    const bell = (x, center, width) => Math.exp(-Math.pow((x - center) / width, 2));

    // ---------- wind grid ----------

    // grid: { nx, ny, latMin, dLat, u, v, p } (longitude goes -180 to 180 and wraps)
    function sampleGrid(g, lon, lat, out) {
        const dLon = 360 / g.nx;
        let fx = (lon + 180) / dLon;
        fx = ((fx % g.nx) + g.nx) % g.nx;
        let fy = (lat - g.latMin) / g.dLat;
        fy = fy < 0 ? 0 : fy > g.ny - 1 ? g.ny - 1 : fy;

        const x0 = Math.floor(fx), x1 = (x0 + 1) % g.nx;
        const y0 = Math.floor(fy), y1 = Math.min(g.ny - 1, y0 + 1);
        const tx = fx - x0, ty = fy - y0;

        const i00 = y0 * g.nx + x0, i10 = y0 * g.nx + x1, i01 = y1 * g.nx + x0, i11 = y1 * g.nx + x1;
        const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;

        out.u = g.u[i00] * w00 + g.u[i10] * w10 + g.u[i01] * w01 + g.u[i11] * w11;
        out.v = g.v[i00] * w00 + g.v[i10] * w10 + g.v[i01] * w01 + g.v[i11] * w11;
    }

    function seasonShift(month) { return 6 * Math.sin((month - 4) / 12 * 2 * Math.PI); }   // belts move north in summer

    // made-up wind: trade winds, westerlies, polar easterlies + some waves
    function buildFakeWindGrid(month) {
        const nx = 72, ny = 37;
        const u = new Float32Array(nx * ny), v = new Float32Array(nx * ny);
        const shift = seasonShift(month);

        for (let j = 0; j < ny; j++) {
            const lat = -90 + j * 5;
            const latR = lat * Math.PI / 180;
            const L = Math.abs(lat - shift);
            const zonal = -8 * bell(L, 15, 11) + 13 * bell(L, 47, 13) - 5 * bell(L, 80, 9);

            for (let i = 0; i < nx; i++) {
                const lonR = (-180 + i * 5) * Math.PI / 180;
                const wave = 0.5 * Math.sin(lonR * 3 + latR * 2) + 0.35 * Math.sin(lonR * 5 - latR * 3);
                const k = j * nx + i;
                u[k] = zonal * (1 + 0.25 * wave) + 2 * Math.sin(lonR * 2 + latR * 4);
                v[k] = 7 * bell(Math.abs(lat), 45, 22) * Math.sin(lonR * 3 + latR * 1.5 + 0.8)
                     - Math.sign(lat) * 2.2 * bell(Math.abs(lat), 15, 10);
            }
        }
        return { nx, ny, latMin: -90, dLat: 5, u, v };
    }

    // ---------- live data (Open-Meteo) ----------

    let livePromise = null;

    function liveGridFrom(data) {
        const nx = Math.round(360 / LIVE_STEP);
        const ny = Math.floor(168 / LIVE_STEP) + 1;
        return { nx, ny, latMin: -84, dLat: LIVE_STEP, u: Float32Array.from(data.u), v: Float32Array.from(data.v), p: Float32Array.from(data.p) };
    }

    function readLiveCache() {
        try {
            const saved = JSON.parse(localStorage.getItem(LIVE_CACHE_KEY) || "null");
            if (saved && saved.step === LIVE_STEP && Date.now() - saved.t < LIVE_CACHE_HOURS * 3600 * 1000) return saved;
        } catch (error) { /* ignore */ }
        return null;
    }

    // wind and rain share one request round, so it is only fetched once
    function getLiveGrid() {
        if (livePromise) return livePromise;

        livePromise = (async () => {
            const cached = readLiveCache();
            if (cached) return liveGridFrom(cached);

            const nx = Math.round(360 / LIVE_STEP);
            const ny = Math.floor(168 / LIVE_STEP) + 1;
            const pts = [];
            for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) pts.push([-84 + j * LIVE_STEP, -180 + i * LIVE_STEP]);

            const u = [], v = [], p = [];
            const CHUNK = 225;

            for (let s = 0; s < pts.length; s += CHUNK) {
                const part = pts.slice(s, s + CHUNK);
                const url = "https://api.open-meteo.com/v1/forecast"
                    + "?latitude=" + part.map(q => q[0]).join(",")
                    + "&longitude=" + part.map(q => q[1]).join(",")
                    + "&current=wind_speed_10m,wind_direction_10m,precipitation&wind_speed_unit=ms&timezone=GMT";

                const res = await fetch(url);
                if (!res.ok) throw new Error("Open-Meteo " + res.status);
                let json = await res.json();
                if (!Array.isArray(json)) json = [json];

                json.forEach(item => {
                    const c = item.current || {};
                    const speed = c.wind_speed_10m || 0;
                    const dir = (c.wind_direction_10m || 0) * Math.PI / 180;     // direction the wind comes FROM
                    u.push(-speed * Math.sin(dir));
                    v.push(-speed * Math.cos(dir));
                    p.push(c.precipitation || 0);
                });
            }

            if (u.length !== pts.length) throw new Error("Open-Meteo returned " + u.length + " points");

            try { localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify({ t: Date.now(), step: LIVE_STEP, u, v, p })); } catch (error) { /* ignore */ }
            return liveGridFrom({ u, v, p });
        })();

        livePromise.catch(() => { livePromise = null; });    // allow a retry later
        return livePromise;
    }

    // ---------- layer: temperature (PNG on a sphere) ----------

    function makeFallbackTemperature(month, stops) {
        const W = 1024, H = 512;
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const ctx = c.getContext("2d");
        const img = ctx.createImageData(W, H);
        const d = img.data;

        const dayOfYear = (month - 0.5) * 30.4;
        const sunLat = 23.44 * Math.sin(2 * Math.PI * (dayOfYear - 80) / 365);

        for (let y = 0; y < H; y++) {
            const lat = 90 - (y + 0.5) / H * 180;
            const latR = lat * Math.PI / 180;
            const effLat = lat - sunLat * 0.55;
            const base = 29 - 0.0065 * effLat * effLat;

            for (let x = 0; x < W; x++) {
                const lonR = ((x + 0.5) / W * 360 - 180) * Math.PI / 180;
                const rgb = rampColor(Math.max(-30, base + 3 * Math.sin(lonR * 2 + latR * 3)), stops);
                const i = (y * W + x) * 4;
                d[i] = rgb[0];
                d[i + 1] = rgb[1];
                d[i + 2] = rgb[2];
                d[i + 3] = 255;
            }
        }

        ctx.putImageData(img, 0, 0);
        return c;
    }

    function loadTemperatureCanvas() {
        return new Promise(resolve => {
            const month = new Date().getMonth() + 1;
            const img = new Image();

            img.onload = () => {
                const scale = Math.min(1, 4096 / img.naturalWidth);
                const c = document.createElement("canvas");
                c.width = Math.round(img.naturalWidth * scale);
                c.height = Math.round(img.naturalHeight * scale);
                c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
                resolve(c);
            };

            img.onerror = () => {
                console.warn("[Aurora Orbit] " + TEMP_FOLDER + "temp" + month + ".png not found, using the built-in sample map");
                resolve(makeFallbackTemperature(month, LAYERS.temperature.stops));
            };

            img.src = TEMP_FOLDER + "temp" + month + ".png";
        });
    }

    function createTemperature() {
        const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(OVERLAY_RADIUS, 96, 64), material);
        mesh.rotation.y = -Math.PI / 2;   // lines the map up with the country dots
        mesh.renderOrder = -1;
        mesh.visible = false;
        globeGroup.add(mesh);

        let canvas = null;

        function build() {
            if (!canvas) return;
            const texture = new THREE.CanvasTexture(isLight() ? lightFix(canvas) : canvas);
            texture.anisotropy = 4;
            if (material.map) material.map.dispose();
            material.map = texture;
            material.needsUpdate = true;
        }

        return {
            object: mesh,
            prepare() {
                return loadTemperatureCanvas().then(c => { canvas = c; build(); return { mode: "fake" }; });
            },
            setOpacity(o) { material.opacity = o; },
            rebuild: build,
            update: null
        };
    }

    // ---------- layer: wind (3D lines, sharp at any zoom) ----------

    function createWind() {
        const T = WIND_TRAIL;
        const N = Math.min(SMALL_SCREEN ? Math.round(WIND_PARTICLES * 0.6) : WIND_PARTICLES, Math.floor(65000 / T));
        const R = OVERLAY_RADIUS + 0.006;     // just above the other layers, under the dots
        const total = N * T;

        const pos = new Float32Array(total * 3);
        const alpha = new Float32Array(total);
        const speedAttr = new Float32Array(total);
        const index = new Uint16Array(N * (T - 1) * 2);

        let k = 0;
        for (let i = 0; i < N; i++) {
            for (let s = 0; s < T - 1; s++) {
                index[k++] = i * T + s;
                index[k++] = i * T + s + 1;
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speedAttr, 1).setUsage(THREE.DynamicDrawUsage));
        geometry.setIndex(new THREE.BufferAttribute(index, 1));

        const material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
                uOpacity: { value: 0 },
                uC0: { value: new THREE.Color() }, uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() },
                uC3: { value: new THREE.Color() }, uC4: { value: new THREE.Color() }
            },
            vertexShader: [
                "attribute float aAlpha;",
                "attribute float aSpeed;",
                "varying float vAlpha;",
                "varying float vSpeed;",
                "void main() {",
                "  vAlpha = aAlpha;",
                "  vSpeed = aSpeed;",
                "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
                "}"
            ].join("\n"),
            fragmentShader: [
                "uniform float uOpacity;",
                "uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uC4;",
                "varying float vAlpha;",
                "varying float vSpeed;",
                "void main() {",
                "  float t = clamp(vSpeed, 0.0, 1.0);",
                "  vec3 c = mix(uC0, uC1, smoothstep(0.0, 0.25, t));",
                "  c = mix(c, uC2, smoothstep(0.25, 0.5, t));",
                "  c = mix(c, uC3, smoothstep(0.5, 0.75, t));",
                "  c = mix(c, uC4, smoothstep(0.75, 1.0, t));",
                "  gl_FragColor = vec4(c, vAlpha * uOpacity * (0.6 + 0.4 * t));",
                "}"
            ].join("\n")
        });

        const lines = new THREE.LineSegments(geometry, material);
        lines.frustumCulled = false;
        lines.renderOrder = -1;
        lines.visible = false;
        globeGroup.add(lines);

        const lon = new Float32Array(N), lat = new Float32Array(N), age = new Float32Array(N), life = new Float32Array(N);
        const tail = [];
        for (let h = 0; h < T; h++) tail.push(Math.pow(1 - h / (T - 1), 1.1));

        const wind = { u: 0, v: 0 };
        const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
        let grid = null;
        let last = 0;

        function setColors() {
            const stops = LAYERS.wind.stops;
            for (let i = 0; i < 5; i++) material.uniforms["uC" + i].value.copy(stopColor(stops[i]));
        }

        function respawn(i) {
            lon[i] = Math.random() * 360 - 180;
            lat[i] = Math.asin(Math.random() * 2 - 1) * 180 / Math.PI * 0.9;
            age[i] = 0;
            life[i] = 50 + Math.random() * 90;

            const latR = lat[i] * Math.PI / 180, lonR = lon[i] * Math.PI / 180;
            const x = R * Math.cos(latR) * Math.sin(lonR), y = R * Math.sin(latR), z = R * Math.cos(latR) * Math.cos(lonR);
            for (let h = 0; h < T; h++) {
                const o = (i * T + h) * 3;
                pos[o] = x;
                pos[o + 1] = y;
                pos[o + 2] = z;
                alpha[i * T + h] = 0;
            }
        }

        function update(now) {
            if (!grid) return;
            const dt = Math.min(50, now - last) / 16.667;
            last = now;

            for (let i = 0; i < N; i++) {
                sampleGrid(grid, lon[i], lat[i], wind);
                const cosLat = Math.max(0.15, Math.cos(lat[i] * Math.PI / 180));

                lon[i] += wind.u / cosLat * WIND_SPEED_SCALE * dt;
                lat[i] += wind.v * WIND_SPEED_SCALE * dt;
                age[i] += dt;

                if (lon[i] > 180) lon[i] -= 360;
                else if (lon[i] < -180) lon[i] += 360;

                if (age[i] > life[i] || Math.abs(lat[i]) > 84) { respawn(i); continue; }

                const base = i * T;
                pos.copyWithin((base + 1) * 3, base * 3, (base + T - 1) * 3);

                const latR = lat[i] * Math.PI / 180, lonR = lon[i] * Math.PI / 180;
                pos[base * 3] = R * Math.cos(latR) * Math.sin(lonR);
                pos[base * 3 + 1] = R * Math.sin(latR);
                pos[base * 3 + 2] = R * Math.cos(latR) * Math.cos(lonR);

                const p = age[i] / life[i];
                const fade = smooth(0, 0.15, p) * (1 - smooth(0.8, 1, p));
                const sp = Math.sqrt(wind.u * wind.u + wind.v * wind.v) * 3.6 / 80;    // 0 to 1 = 0 to 80 km/h

                for (let h = 0; h < T; h++) {
                    alpha[base + h] = tail[h] * fade;
                    speedAttr[base + h] = sp;
                }
            }

            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.aAlpha.needsUpdate = true;
            geometry.attributes.aSpeed.needsUpdate = true;
        }

        setColors();

        return {
            object: lines,
            prepare(mode) {
                const month = new Date().getMonth() + 1;
                const request = mode === "live"
                    ? getLiveGrid().then(g => ({ grid: g, mode: "live" }), error => {
                        console.warn("[Aurora Orbit] Live wind failed, using fake wind:", error.message);
                        return { grid: buildFakeWindGrid(month), mode: "fake" };
                    })
                    : Promise.resolve({ grid: buildFakeWindGrid(month), mode: "fake" });

                return request.then(res => {
                    grid = res.grid;
                    last = performance.now();
                    for (let i = 0; i < N; i++) { respawn(i); age[i] = Math.random() * life[i]; }
                    return { mode: res.mode };
                });
            },
            setOpacity(o) { material.uniforms.uOpacity.value = o; },
            rebuild: setColors,
            update
        };
    }

    // ---------- layer: precipitation (shader, sharp at any zoom) ----------

    function makeRainTexture(g) {
        const W = g.nx + 1, H = g.ny;      // one extra column so longitude wraps around
        const data = new Uint8Array(W * H * 4);
        for (let j = 0; j < H; j++) {
            for (let i = 0; i < W; i++) {
                const mm = g.p[j * g.nx + (i % g.nx)];
                const o = (j * W + i) * 4;
                data[o] = Math.min(255, Math.round(mm / 6 * 255));
                data[o + 3] = 255;
            }
        }
        const texture = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        return texture;
    }

    function createRain() {
        const dummy = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
        dummy.needsUpdate = true;

        const material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
                uTime: { value: 0 }, uOpacity: { value: 0 }, uLive: { value: 0 }, uShift: { value: seasonShift(new Date().getMonth() + 1) },
                uGrid: { value: dummy }, uGridW: { value: 1 }, uGridH: { value: 1 }, uLatMin: { value: -84 }, uLatStep: { value: 12 }, uLonStep: { value: 12 },
                uC0: { value: new THREE.Color() }, uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() }, uC3: { value: new THREE.Color() }
            },
            vertexShader: [
                "varying vec3 vDir;",
                "void main() {",
                "  vDir = normalize(position);",
                "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
                "}"
            ].join("\n"),
            fragmentShader: [
                "uniform float uTime; uniform float uOpacity; uniform float uLive; uniform float uShift;",
                "uniform sampler2D uGrid; uniform float uGridW; uniform float uGridH;",
                "uniform float uLatMin; uniform float uLatStep; uniform float uLonStep;",
                "uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;",
                "varying vec3 vDir;",
                "",
                "float hash(vec3 p) {",
                "  p = fract(p * 0.3183099 + 0.1);",
                "  p *= 17.0;",
                "  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));",
                "}",
                "float noise(vec3 x) {",
                "  vec3 i = floor(x); vec3 f = fract(x);",
                "  f = f * f * (3.0 - 2.0 * f);",
                "  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),",
                "             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);",
                "}",
                "float fbm(vec3 p) {",
                "  float a = 0.5; float s = 0.0;",
                "  for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }",
                "  return s / 0.9375;",
                "}",
                "float bell(float x, float c, float w) { float t = (x - c) / w; return exp(-t * t); }",
                "",
                "void main() {",
                "  vec3 d = normalize(vDir);",
                "  float lat = degrees(asin(clamp(d.y, -1.0, 1.0)));",
                "  float lon = degrees(atan(d.x, d.z));",
                "",
                "  vec3 q = d * 5.0 + vec3(uTime * 0.04, uTime * 0.025, -uTime * 0.03);",
                "  float w = fbm(q * 0.6 + vec3(uTime * 0.02));",
                "  float n = fbm(q + w * 1.6);",
                "",
                "  float s;",
                "  if (uLive > 0.5) {",
                "    float u = ((lon + 180.0) / uLonStep + 0.5) / uGridW;",
                "    float v = clamp(((lat - uLatMin) / uLatStep + 0.5) / uGridH, 0.5 / uGridH, 1.0 - 0.5 / uGridH);",
                "    float mm = texture2D(uGrid, vec2(u, v)).r * 6.0;",
                "    float cover = clamp(mm / 2.5, 0.0, 1.0);",
                "    s = clamp(cover * (0.15 + 1.3 * clamp((n - 0.32) * 2.2, 0.0, 1.0)), 0.0, 1.0);",
                "  } else {",
                "    float L = lat - uShift;",
                "    float band = (0.95 * bell(L, 0.0, 7.0) + 0.75 * bell(abs(lat), 50.0, 10.0)) * (1.0 - 0.75 * bell(abs(L), 27.0, 7.0)) + 0.1;",
                "    s = clamp(0.85 * band * clamp((n - 0.4) * 2.6, 0.0, 1.0), 0.0, 1.0);",
                "  }",
                "",
                "  float a = smoothstep(0.04, 0.3, s) * 0.92;",
                "  vec3 c = mix(uC0, uC1, smoothstep(0.0, 0.35, s));",
                "  c = mix(c, uC2, smoothstep(0.35, 0.7, s));",
                "  c = mix(c, uC3, smoothstep(0.7, 1.0, s));",
                "  gl_FragColor = vec4(c, a * uOpacity);",
                "}"
            ].join("\n")
        });

        const mesh = new THREE.Mesh(new THREE.SphereGeometry(OVERLAY_RADIUS + 0.003, 128, 96), material);
        mesh.renderOrder = -1;
        mesh.visible = false;
        globeGroup.add(mesh);

        function setColors() {
            const stops = LAYERS.precipitation.stops;
            for (let i = 0; i < 4; i++) material.uniforms["uC" + i].value.copy(stopColor(stops[i]));
        }
        setColors();

        return {
            object: mesh,
            prepare(mode) {
                const request = mode === "live"
                    ? getLiveGrid().then(g => ({ grid: g }), error => {
                        console.warn("[Aurora Orbit] Live rain failed, using fake rain:", error.message);
                        return { grid: null };
                    })
                    : Promise.resolve({ grid: null });

                return request.then(res => {
                    const u = material.uniforms;
                    if (res.grid) {
                        if (u.uGrid.value !== dummy) u.uGrid.value.dispose();
                        u.uGrid.value = makeRainTexture(res.grid);
                        u.uGridW.value = res.grid.nx + 1;
                        u.uGridH.value = res.grid.ny;
                        u.uLatMin.value = res.grid.latMin;
                        u.uLatStep.value = res.grid.dLat;
                        u.uLonStep.value = 360 / res.grid.nx;
                        u.uLive.value = 1;
                    } else {
                        u.uLive.value = 0;
                    }
                    return { mode: res.grid ? "live" : "fake" };
                });
            },
            setOpacity(o) { material.uniforms.uOpacity.value = o; },
            rebuild: setColors,
            update(now) { material.uniforms.uTime.value = now * 0.001; }
        };
    }

    // a layer is built the first time it is picked, so one broken layer cannot stop the panel
    const factories = { temperature: createTemperature, wind: createWind, precipitation: createRain };
    const renderers = {};

    function getRenderer(id) {
        if (!renderers[id]) renderers[id] = factories[id]();
        return renderers[id];
    }

    // rebuild the colors when the theme changes
    new MutationObserver(() => {
        Object.keys(renderers).forEach(id => renderers[id].rebuild());
    }).observe(root, { attributes: true, attributeFilter: ["class"] });

    // ---------- hide / restore other effects (clouds) ----------

    let hidden = [];

    function hideObjects() {
        hidden = [];
        HIDE_WHILE_ACTIVE.forEach(get => {
            let obj = null;
            try { obj = get(); } catch (error) { /* not created */ }
            if (obj) hidden.push({ obj, was: obj.visible });
        });
    }

    function restoreObjects() {
        hidden.forEach(item => { item.obj.visible = item.was; });
        hidden = [];
    }

    // ---------- layer select ----------

    let activeId = null;       // layer the user picked
    let current = null;        // layer that is on the globe (ready)
    let selectToken = 0;
    let opacity = 0;
    let opacityTarget = 0;

    function renderLegend(layer) {
        const stops = layer.stops.slice().reverse();   // top = highest
        legendBar.style.background = "linear-gradient(to bottom, " + stops.map(s => s.c).join(",") + ")";
        legendLabels.innerHTML = stops.map(s => "<span>" + s.v + "</span>").join("");
    }

    function setTag(mode) {
        tagText.textContent = TAG_TEXT[mode];
        tag.classList.toggle("is-visible", SHOW_TAG || mode === "error");
    }

    function updateButtons() {
        layerBtns.forEach(btn => {
            const on = btn.dataset.layer === activeId;
            btn.classList.toggle("is-active", on);
            btn.setAttribute("aria-pressed", String(on));
        });
    }

    function deactivate() {
        activeId = null;
        selectToken++;
        opacityTarget = 0;
        restoreObjects();
        legend.classList.remove("is-visible");
        tag.classList.remove("is-visible");
        updateButtons();
    }

    function failLayer(id, error, token) {
        console.error("[Aurora Orbit] Layer '" + id + "' failed:", error);
        if (token !== selectToken) return;
        deactivate();
        setTag("error");
        setTimeout(() => { if (activeId === null) tag.classList.remove("is-visible"); }, 6000);
    }

    function selectLayer(id) {
        const layer = LAYERS[id];
        if (!layer || !factories[id]) return;

        if (activeId === id) { deactivate(); return; }

        if (activeId === null) hideObjects();

        if (current) { current.object.visible = false; current = null; }
        opacity = 0;
        opacityTarget = 0;

        activeId = id;
        const token = ++selectToken;

        updateButtons();
        renderLegend(layer);
        legend.classList.add("is-visible");

        if (MODE[id] === "live") setTag("loading");
        else tag.classList.remove("is-visible");

        let renderer;
        try {
            renderer = getRenderer(id);
        } catch (error) {
            failLayer(id, error, token);
            return;
        }

        renderer.prepare(MODE[id]).then(res => {
            if (token !== selectToken) return;
            current = renderer;
            current.maxOpacity = layer.opacity;
            opacityTarget = 1;
            setTag(res.mode);
            console.log("[Aurora Orbit] Weather: " + id + " ready (" + res.mode + ")");
        }).catch(error => failLayer(id, error, token));
    }

    layerBtns.forEach(btn => btn.addEventListener("click", () => selectLayer(btn.dataset.layer)));

    // ---------- panel open / close ----------

    function setPanelOpen(open) {
        panel.dataset.state = open ? "open" : "closed";
        if (toggleBtn) {
            toggleBtn.setAttribute("aria-expanded", String(open));
            toggleBtn.setAttribute("aria-label", open ? "Hide weather layers" : "Show weather layers");
        }
        if (tabBtn) tabBtn.tabIndex = open ? -1 : 0;
    }

    if (toggleBtn) toggleBtn.addEventListener("click", () => setPanelOpen(panel.dataset.state !== "open"));
    if (tabBtn) tabBtn.addEventListener("click", () => setPanelOpen(true));

    // ---------- update loop (fade, animation, keep clouds hidden) ----------

    function tick(now) {
        requestAnimationFrame(tick);

        if (activeId !== null) hidden.forEach(item => { item.obj.visible = false; });

        const diff = opacityTarget - opacity;
        if (Math.abs(diff) > 0.004) opacity += diff * FADE_SPEED;
        else opacity = opacityTarget;

        if (!current) return;

        const show = opacity > 0.004;
        current.object.visible = show;

        if (show) {
            current.setOpacity(opacity * current.maxOpacity);
            if (current.update) current.update(now);
        } else if (activeId === null) {
            current = null;
        }
    }

    updateButtons();
    setPanelOpen(false);
    requestAnimationFrame(tick);
    console.log("Weather panel ready");
})();