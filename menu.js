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

    const popups = {
        social:   { btn: $("social-btn"),   overlay: $("social-modal-overlay") },
        settings: { btn: $("settings-btn"), overlay: $("settings-modal-overlay") }
    };

    let dockOpen = false;

    /* popups*/
    function setPopup(name, open) {
        const popup = popups[name];
        if (!popup || !popup.btn || !popup.overlay) return;
        popup.overlay.classList.toggle("active", open);
        popup.btn.classList.toggle("is-open", open);
        popup.btn.setAttribute("aria-expanded", String(open));
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

    /* tapping outside*/

    document.addEventListener("pointerdown", event => {
        const target = event.target;

        if (!nav.contains(target)) {
            if (dockOpen) setDock(false);
            return;
        }

        // inside the menu: close a popup when the tap is outside that popup and its button
        Object.keys(popups).forEach(name => {
            const { btn, overlay } = popups[name];
            if (!isPopupOpen(name)) return;
            if ((btn && btn.contains(target)) || (overlay && overlay.contains(target))) return;
            setPopup(name, false);
        });
    }, true);

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        if (isPopupOpen("social") || isPopupOpen("settings")) closePopups();
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
    const AMBIENT_EXTRA = [
    ];
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

    /* START */
    applyTheme(settings.theme, false);
    applyStars(settings.stars);
    applyClouds(settings.clouds);
})();
