/* ================= MENU ================= */


/* ===============
   MENU CONTROLLER
   =============== */

(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    const nav = $("top-nav");
    const menuBtn = $("menu-btn");
    const dock = $("menu-actions");
    if (!nav || !menuBtn || !dock) return;

    /* CREDITS */
    const CREDITS = [
        ["Three.js & OrbitControls", "MIT License", "https://threejs.org"],
        ["Circle Flags By HatScripts", "MIT License", "https://github.com/HatScripts/circle-flags"],
        ["Weather Icons By ErikFlowers", "SIL OFL 1.1", "https://github.com/erikflowers/weather-icons"],
        ["Weather data", "Open-Meteo.com, CC BY 4.0", "https://open-meteo.com"],
        ["Economic data", "World Bank, CC BY 4.0", "https://data.worldbank.org"],
        ["Country data", "REST Countries", "https://restcountries.com"],
        ["Borders", "Natural Earth, public domain", "https://www.naturalearthdata.com"],
        ["Photos", "Wikimedia", "https://commons.wikimedia.org"],
    ];

    const popups = {
        social:   { btn: $("social-btn"),   overlay: $("social-modal-overlay") },
        settings: { btn: $("settings-btn"), overlay: $("settings-modal-overlay") },
        credits:  { btn: $("credits-btn"),  overlay: $("wl-credits-overlay") }
    };

    let dockOpen = false;

    /* popups*/
    function setPopup(name, open) {
        const popup = popups[name];
        if (!popup || !popup.btn || !popup.overlay) return;
        popup.overlay.classList.toggle("active", open);
        popup.btn.classList.toggle("is-open", open);
        popup.btn.setAttribute("aria-expanded", String(open));
        if (name === "credits") popup.overlay.setAttribute("aria-hidden", String(!open));
    }

    function isPopupOpen(name) {
        const popup = popups[name];
        return !!(popup && popup.overlay && popup.overlay.classList.contains("active"));
    }

    function closePopups(except) {
        Object.keys(popups).forEach(name => { if (name !== except) setPopup(name, false); });
    }

    Object.keys(popups).forEach(name => {
        const { btn } = popups[name];
        if (!btn) return;
        btn.addEventListener("click", event => {
            event.preventDefault();
            closePopups(name);
            setPopup(name, !isPopupOpen(name));
        });
    });

    /* dock*/
    function setDock(open) {
        dockOpen = open;
        nav.classList.toggle("menu-open", open);
        menuBtn.setAttribute("aria-expanded", String(open));
        menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        dock.setAttribute("aria-hidden", String(!open));
        if (!open) closePopups();
    }

    menuBtn.addEventListener("click", event => {
        event.preventDefault();
        setDock(!dockOpen);
    });

    /* dock buttons*/
    const githubLink = $("github-link");
    if (githubLink) githubLink.addEventListener("click", () => setDock(false));

    const bordersBtn = $("toggle-borders-btn");
    if (bordersBtn) {
        bordersBtn.addEventListener("click", () => {
            setDock(false);
            if (typeof toggleAllCountryBorders === "function") toggleAllCountryBorders();
        });
    }

    const fullscreenBtn = $("fullscreen-btn");
    if (fullscreenBtn) {
        const root = document.documentElement;
        const request = root.requestFullscreen || root.webkitRequestFullscreen;
        const exit = document.exitFullscreen || document.webkitExitFullscreen;

        if (!request) {
            fullscreenBtn.style.display = "none";
        } else {
            fullscreenBtn.addEventListener("click", () => {
                const active = document.fullscreenElement || document.webkitFullscreenElement;
                try {
                    const result = active ? exit.call(document) : request.call(root);
                    if (result && result.catch) result.catch(err => console.warn("[Aurora Orbit] Fullscreen:", err.message));
                } catch (err) {
                    console.warn("[Aurora Orbit] Fullscreen:", err.message);
                }
            });
        }
    }

    /* Credits */
    function escapeHtml(text) {
        return String(text).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    }

    let creditsOverlay = $("wl-credits-overlay");
    let creditsList = $("wl-credits-list");
    let creditsClose = $("wl-credits-close");

    if (!creditsOverlay) {
        creditsOverlay = document.createElement("div");
        creditsOverlay.id = "wl-credits-overlay";
        creditsOverlay.className = "modal-overlay";
        creditsOverlay.setAttribute("aria-hidden", "true");
        creditsOverlay.innerHTML = `
            <div class="modal-card">
                <div class="modal-header">
                    <h3>Credits</h3>
                    <button class="modal-close" id="wl-credits-close" type="button" aria-label="Close credits">&times;</button>
                </div>
                <div class="modal-body">
                    <ul id="wl-credits-list" class="credits-list"></ul>
                </div>
            </div>
        `;
        document.body.appendChild(creditsOverlay);
        creditsList = $("wl-credits-list");
        creditsClose = $("wl-credits-close");
    }

    if (creditsList) {
        creditsList.innerHTML = CREDITS.map(item => {
            const name = escapeHtml(item[0]);
            const note = escapeHtml(item[1]);
            const nameHtml = item[2]
                ? '<a href="' + escapeHtml(item[2]) + '" target="_blank" rel="noopener noreferrer">' + name + "</a>"
                : name;
            return '<li><span class="wl-c-name">' + nameHtml + '</span><span class="wl-c-note">' + note + "</span></li>";
        }).join("");
    }

    let creditsBtn = $("credits-btn");
    if (!creditsBtn && dock) {
        creditsBtn = document.createElement("button");
        creditsBtn.className = "menu-action";
        creditsBtn.id = "credits-btn";
        creditsBtn.type = "button";
        creditsBtn.setAttribute("aria-label", "Credits");
        creditsBtn.title = "Credits";
        creditsBtn.innerHTML =
            '<svg class="menu-icon default-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.6v.01"/></svg>' +
            '<svg class="menu-icon pressed-icon" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" stroke="currentColor"/><path d="M12 11v5.5" stroke="#000"/><path d="M12 7.6v.01" stroke="#000"/></svg>';

        const settingsWrap = dock.querySelector(".settings-btn-wrapper");
        dock.insertBefore(creditsBtn, settingsWrap || null);
        popups.credits.btn = creditsBtn;
    }

    if (creditsClose) {
        creditsClose.addEventListener("click", () => setPopup("credits", false));
    }
    if (creditsOverlay) {
        creditsOverlay.addEventListener("click", event => { if (event.target === creditsOverlay) setPopup("credits", false); });
    }

    /* tapping outside */
    document.addEventListener("pointerdown", event => {
        const target = event.target;

        if (!nav.contains(target)) {

            if (isPopupOpen("credits") && creditsOverlay && creditsOverlay.contains(target) && !creditsOverlay.querySelector(".modal-card").contains(target)) {
                setPopup("credits", false);
            }
            if (dockOpen) setDock(false);
            return;
        }

        Object.keys(popups).forEach(name => {
            const { btn, overlay } = popups[name];
            if (!isPopupOpen(name)) return;
            if ((btn && btn.contains(target)) || (overlay && overlay.contains(target))) return;
            setPopup(name, false);
        });
    }, true);

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        if (isPopupOpen("social") || isPopupOpen("settings") || isPopupOpen("credits")) closePopups();
        else if (dockOpen) setDock(false);
    });

    window.AuroraMenu = { setDock, closeAll: () => setDock(false) };
})();


/* ================= SETTINGS ================ */

(function () {
    "use strict";

    /* AMBIENT SOUND FILES*/

    const AMBIENT_FOLDER = "sounds/ambient/";
    const AMBIENT_FIRST = "ambient.mp3";
    const AMBIENT_EXTRA = [];
    const AMBIENT_AUTO_NUMBERED = true;
    const AMBIENT_AUTO_MAX = 10;

    /* SAVED SETTINGS */
    const STORAGE_KEY = "aurora-orbit-settings";
    const root = document.documentElement;

    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch (error) { /* private mode */ }

    const settings = {
        theme: saved.theme === "light" ? "light" : "dark",
        stars: saved.stars !== false,
        clouds: saved.clouds !== false
    };

    function saveSettings() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (error) { /* ignore */ }
    }

    /* ELEMENTS */
    const $ = id => document.getElementById(id);
    const themeButtons = Array.from(document.querySelectorAll(".theme-option"));
    const starsToggle = $("toggle-stars");
    const cloudsToggle = $("toggle-clouds");
    const volumeSlider = $("ambient-volume");
    const volumeValue = $("ambient-value");

    /* THEM */
    const DARK_BG = 0x000000;
    const LIGHT_BG = 0x161616;
    let themeTimer = null;

    function applyTheme(theme, animate) {
        const light = theme === "light";

        if (animate) {
            root.classList.add("theme-anim");
            void root.offsetWidth;
            clearTimeout(themeTimer);
            themeTimer = setTimeout(() => root.classList.remove("theme-anim"), 800);
        }

        root.classList.toggle("light", light);

        const bg = light ? LIGHT_BG : DARK_BG;
        if (typeof renderer !== "undefined") renderer.setClearColor(bg, 1);
        if (typeof innerCoreMat !== "undefined") innerCoreMat.color.setHex(bg);

        themeButtons.forEach(button => {
            const selected = button.dataset.theme === theme;
            button.setAttribute("aria-checked", String(selected));
            button.classList.toggle("is-selected", selected);
        });
    }

    themeButtons.forEach(button => {
        button.addEventListener("click", () => {
            if (settings.theme === button.dataset.theme) return;
            settings.theme = button.dataset.theme;
            applyTheme(settings.theme, true);
            saveSettings();
        });
    });

    /* STARS & CLOUDS */
    function setToggle(button, on) {
        if (!button) return;
        button.setAttribute("aria-checked", String(on));
        button.classList.toggle("on", on);
    }

    function applyStars(on) {
        if (typeof starSystemGroup !== "undefined") starSystemGroup.visible = on;
        if (typeof shootingStarLine !== "undefined") shootingStarLine.visible = on;
        setToggle(starsToggle, on);
    }

    function applyClouds(on) {
        if (typeof cloudGroup !== "undefined") cloudGroup.visible = on;
        setToggle(cloudsToggle, on);
    }

    if (starsToggle) {
        starsToggle.addEventListener("click", () => {
            settings.stars = !settings.stars;
            applyStars(settings.stars);
            saveSettings();
        });
    }

    if (cloudsToggle) {
        cloudsToggle.addEventListener("click", () => {
            settings.clouds = !settings.clouds;
            applyClouds(settings.clouds);
            saveSettings();
        });
    }

    /* AMBIENT SOUND (ngl sum sound good) */
    let audio = null;
    let playlist = [];
    let trackIndex = 0;
    let playlistPromise = null;
    let noSound = false;

    function probeTrack(src) {
        return new Promise(resolve => {
            const probe = new Audio();
            let finished = false;

            const finish = ok => {
                if (finished) return;
                finished = true;
                clearTimeout(timer);
                probe.removeAttribute("src");
                probe.load();
                resolve(ok);
            };

            const timer = setTimeout(() => finish(false), 5000);
            probe.preload = "metadata";
            probe.addEventListener("loadedmetadata", () => finish(true), { once: true });
            probe.addEventListener("error", () => finish(false), { once: true });
            probe.src = src;
        });
    }

    function loadPlaylist() {
        if (playlistPromise) return playlistPromise;

        const candidates = [AMBIENT_FIRST, ...AMBIENT_EXTRA];
        if (AMBIENT_AUTO_NUMBERED) {
            for (let i = 1; i <= AMBIENT_AUTO_MAX; i++) candidates.push(`ambient${i}.mp3`);
        }

        const unique = Array.from(new Set(candidates)).map(name => AMBIENT_FOLDER + name);

        playlistPromise = Promise.all(unique.map(probeTrack)).then(results => {
            playlist = unique.filter((src, index) => results[index]);
            if (!playlist.length) console.warn("[Aurora Orbit] No ambient sound found in", AMBIENT_FOLDER);
            return playlist;
        });

        return playlistPromise;
    }

    function playTrack(index) {
        if (!audio || !playlist.length) return;
        trackIndex = (index + playlist.length) % playlist.length;
        audio.src = playlist[trackIndex];
        audio.play().catch(error => console.warn("[Aurora Orbit] Sound blocked:", error.message));
    }

    function ensureAudio() {
        if (audio) return;
        audio = new Audio();
        audio.preload = "auto";
        audio.loop = playlist.length === 1;

        audio.addEventListener("ended", () => playTrack(trackIndex + 1));

        audio.addEventListener("error", () => {
            console.warn("[Aurora Orbit] Could not play:", audio.src);
            if (playlist.length > 1) playTrack(trackIndex + 1);
            else { noSound = true; if (volumeValue) volumeValue.textContent = "No file"; }
        });
    }

    let starting = false;

    async function startAmbient() {
        if (starting) return;
        starting = true;

        await loadPlaylist();
        starting = false;

        if (!playlist.length) {
            noSound = true;
            if (volumeValue && Number(volumeSlider.value) > 0) volumeValue.textContent = "No file";
            return;
        }

        if (Number(volumeSlider.value) === 0) return;
        ensureAudio();
        applyVolume();
        if (!audio.src) playTrack(0);
        else if (audio.paused) audio.play().catch(error => console.warn("[Aurora Orbit] Sound blocked:", error.message));
    }

    function applyVolume() {
        if (!audio) return;
        audio.volume = Math.pow(Number(volumeSlider.value) / 100, 2);
    }

    function updateVolume() {
        if (!volumeSlider) return;
        const percent = Number(volumeSlider.value);
        volumeSlider.style.setProperty("--fill", `${percent}%`);

        if (percent === 0) {
            if (volumeValue) volumeValue.textContent = "Off";
            if (audio) audio.pause();
            return;
        }

        if (volumeValue) volumeValue.textContent = noSound ? "No file" : `${percent}%`;

        applyVolume();
        if (audio && audio.src) {
            if (audio.paused) audio.play().catch(error => console.warn("[Aurora Orbit] Sound blocked:", error.message));
        } else {
            startAmbient();
        }
    }

    if (volumeSlider) {
        volumeSlider.value = 0;
        volumeSlider.addEventListener("input", updateVolume);
        updateVolume();
    }

    /* BUTTON SOUNDS */
    (function () {
    "use strict";

    const BUTTON_SOUND = "sounds/ui/buttons/clicksound.mp3";
    const COUNTRY_FOLDER = "sounds/ui/select_country/";
    const COUNTRY_PREFIX = "scountry";
    const COUNTRY_COUNT = 2;

    const $ = id => document.getElementById(id);

    let slider = $("buttons-volume");
    let valueText = $("buttons-value");

    if (!slider) {
        const ambient = $("ambient-volume");
        const ambientRow = ambient && ambient.closest(".settings-row");
        if (ambientRow) {
            const row = document.createElement("div");
            row.className = "settings-row settings-row-slider";
            row.innerHTML =
                '<span class="settings-label">Buttons</span>' +
                '<input class="ambient-slider" id="buttons-volume" type="range" min="0" max="100" step="1" value="50" aria-label="Button sounds volume">' +
                '<output class="settings-value" id="buttons-value" for="buttons-volume">50%</output>';
            ambientRow.insertAdjacentElement("afterend", row);
            slider = $("buttons-volume");
            valueText = $("buttons-value");
        }
    }

    if (!slider) {
        console.warn("[Aurora Orbit] Button sounds: could not find or create the Buttons slider");
        return;
    }

    function updateSlider() {
        const percent = Number(slider.value);
        slider.style.setProperty("--fill", percent + "%");
        if (valueText) valueText.textContent = percent === 0 ? "Off" : percent + "%";
    }
    slider.addEventListener("input", updateSlider);
    updateSlider();

    function playSound(src) {
        const volume = Math.pow(Number(slider.value) / 100, 2);
        if (volume === 0) return;
        const sound = new Audio(src);
        sound.volume = volume;
        sound.addEventListener("error", () => console.warn("[Aurora Orbit] Sound file not found:", src));
        sound.play().catch(error => console.warn("[Aurora Orbit] Sound blocked:", error.message));
    }

    let lastNumber = 0;
    function playCountrySound() {
        let number;
        do {
            number = Math.floor(Math.random() * COUNTRY_COUNT) + 1;
        } while (COUNTRY_COUNT > 1 && number === lastNumber);
        lastNumber = number;
        playSound(COUNTRY_FOLDER + COUNTRY_PREFIX + number + ".mp3");
    }

    document.addEventListener("click", event => {
        if (event.target.closest("button, a, [role='button'], [role='switch'], .theme-option")) {
            playSound(BUTTON_SOUND);
        }
    }, true);

    if (typeof selectCountry === "function" && !window.__countrySoundHooked) {
        window.__countrySoundHooked = true;
        const original = selectCountry;
        window.selectCountry = function (...args) {
            playCountrySound();
            return original.apply(this, args);
        };
    }

    console.log("[Aurora Orbit] Button sounds ready");
})();

    /* START */
    applyTheme(settings.theme, false);
    applyStars(settings.stars);
    applyClouds(settings.clouds);
})();
