/* ================= INTERACTION =================

/*i use AI in sum of the code */

/* =======
   BORDERS
   ======= */

/* BORDER GEO */

function appendFeatureBorderPositions(feature, positions, radius, steps) {
    const polygons = getFeaturePolygons(feature);

    function addSegment(pointA, pointB) {
        if (!pointA || !pointB) return;
        let lon1 = Number(pointA[0]), lat1 = Number(pointA[1]);
        let lon2 = Number(pointB[0]), lat2 = Number(pointB[1]);

        if (!Number.isFinite(lon1) || !Number.isFinite(lat1) || !Number.isFinite(lon2) || !Number.isFinite(lat2)) return;

        const deltaLon = lon2 - lon1;
        if (deltaLon > 180) lon2 -= 360;
        if (deltaLon < -180) lon2 += 360;

        let previous = latLngToVector3(lat1, lon1, radius);

        for (let step = 1; step <= steps; step++) {
            const t = step / steps;
            const lat = THREE.MathUtils.lerp(lat1, lat2, t);
            const lon = THREE.MathUtils.lerp(lon1, lon2, t);
            const current = latLngToVector3(lat, lon, radius);

            positions.push(previous.x, previous.y, previous.z, current.x, current.y, current.z);
            previous = current;
        }
    }

    for (const polygon of polygons) {
        if (!polygon) continue;
        for (const ring of polygon) {
            if (!ring || ring.length < 2) continue;
            for (let i = 0; i < ring.length - 1; i++) {
                addSegment(ring[i], ring[i + 1]);
            }
            const first = ring[0], last = ring[ring.length - 1];
            if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
                addSegment(last, first);
            }
        }
    }
}

function buildCombinedBorderGeometry(features, radius, steps) {
    const positions = [];
    for (const feature of features) {
        appendFeatureBorderPositions(feature, positions, radius, steps);
    }
    if (!positions.length) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeBoundingSphere();
    return geometry;
}

/* BORDER MATERIAL */
function makeBorderMaterial(opacity) {
    return new THREE.LineBasicMaterial({
        color: 0xffffff, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true
    });
}

/* SELECTED COUNTRY HIGHLIGHT */
function clearSelectedHighlight() {
    if (!selectedHighlightGroup) return;
    globeGroup.remove(selectedHighlightGroup);

    selectedHighlightGroup.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
            else object.material.dispose();
        }
    });

    selectedHighlightGroup = null;
    selectedPulseMaterial = null;
}

function buildSelectedHighlight(entity) {
    clearSelectedHighlight();
    if (!entity || !entity.position) return;

    selectedHighlightGroup = new THREE.Group();
    selectedHighlightGroup.name = "SelectedCountryHighlight";
    globeGroup.add(selectedHighlightGroup);

    const lineGeometry = buildCombinedBorderGeometry(entity.features, GLOBE_RADIUS_UNITS + 0.026, 3);
    if (lineGeometry) {
        const glow = new THREE.LineSegments(lineGeometry.clone(), makeBorderMaterial(0.34));
        const core = new THREE.LineSegments(lineGeometry, makeBorderMaterial(1.0));
        glow.renderOrder = 30;
        core.renderOrder = 31;
        selectedHighlightGroup.add(glow);
        selectedHighlightGroup.add(core);
    }

    const pulseGeometry = new THREE.BufferGeometry();
    pulseGeometry.setAttribute("position", new THREE.Float32BufferAttribute([entity.position.x, entity.position.y, entity.position.z], 3));

    selectedPulseMaterial = new THREE.PointsMaterial({
        color: 0xffffff, size: 0.02, map: dotTexture, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true
    });

    applyScreenCullingAndClamping(selectedPulseMaterial);

    const pulse = new THREE.Points(pulseGeometry, selectedPulseMaterial);
    pulse.renderOrder = 32;
    selectedHighlightGroup.add(pulse);
}

/* ALL BORDERS - LOW RESOLUTION */

function buildAllBorders() {
    if (allBordersGroup) return;

    allBordersGroup = new THREE.Group();
    allBordersGroup.name = "LowResolutionAllBorders";

    const geometry = buildCombinedBorderGeometry(LOW_RES_FEATURES, GLOBE_RADIUS_UNITS + 0.022, 1);
    if (!geometry) return;

    const glow = new THREE.LineSegments(geometry.clone(), makeBorderMaterial(0.18));
    const core = new THREE.LineSegments(geometry, makeBorderMaterial(0.55));
    glow.renderOrder = 20;
    core.renderOrder = 21;

    allBordersGroup.add(glow);
    allBordersGroup.add(core);
    globeGroup.add(allBordersGroup);
}

/* ORDER TOGGLE */

function toggleAllCountryBorders() {
    showAllBorders = !showAllBorders;
    if (toggleBordersButton) toggleBordersButton.classList.toggle("active", showAllBorders);

    if (showAllBorders) {
        if (selectedCountry) clearCountrySelection();
        buildAllBorders();
        if (allBordersGroup) allBordersGroup.visible = true;
    } else if (allBordersGroup) {
        allBordersGroup.visible = false;
    }
}


/* ==================
   SELECTION + CAMERA
   ================== */

/* CAMERA */

function getCameraBounds(entity) {
    if (entity.iso3 === "FRA") {
        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;

        for (const feature of entity.features) {
            const bounds = getFeatureBounds(feature);
            if (!bounds) continue;

            const centerLat = (bounds.minLat + bounds.maxLat) * 0.5;
            const centerLng = (bounds.minLng + bounds.maxLng) * 0.5;

            if (centerLat >= 40 && centerLat <= 53 && centerLng >= -8 && centerLng <= 13) {
                minLat = Math.min(minLat, bounds.minLat);
                maxLat = Math.max(maxLat, bounds.maxLat);
                minLng = Math.min(minLng, bounds.minLng);
                maxLng = Math.max(maxLng, bounds.maxLng);
            }
        }
        if (minLat !== Infinity) return { minLat, maxLat, minLng, maxLng };
    }
    return entity.bounds || null;
}

function flyToCountry(entity) {
    const worldPosition = getCountryWorldPosition(entity);
    if (!worldPosition) return;

    let targetDistance = 2.55;
    const bounds = getCameraBounds(entity);

    if (bounds) {
        const latSpan = Math.abs(bounds.maxLat - bounds.minLat) * Math.PI / 180;
        const midLat = ((bounds.minLat + bounds.maxLat) * 0.5) * Math.PI / 180;
        const lonSpan = minimalLongitudeSpan(bounds.minLng, bounds.maxLng) * Math.PI / 180;

        const angularWidth = Math.abs(Math.cos(midLat)) * lonSpan;
        const angularHeight = latSpan;
        const angularSpan = Math.max(angularWidth, angularHeight);

        const surfaceSize = GLOBE_RADIUS_UNITS * angularSpan;
        const verticalFOV = THREE.MathUtils.degToRad(camera.fov);
        const horizontalFOV = 2 * Math.atan(Math.tan(verticalFOV / 2) * camera.aspect);
        const minimumFOV = Math.min(verticalFOV, horizontalFOV);

        const requiredDistance = ((surfaceSize / 2) / Math.tan(minimumFOV / 2)) * 1.18;
        targetDistance = GLOBE_RADIUS_UNITS + requiredDistance;
    }

    if (entity.iso3 === "FRA") targetDistance = Math.min(targetDistance, 2.38);
    targetDistance = Math.max(MIN_CAMERA_DIST + 0.08, Math.min(targetDistance, 3.8));

    const targetDirection = worldPosition.clone().normalize();
    targetCameraPosition = targetDirection.multiplyScalar(targetDistance);
    flightStartPosition = camera.position.clone();
    flightStartTime = performance.now();
    isFlying = true;
}

/* CAMERA FLIGHT */

function handleCameraFlight(now) {
    if (!isFlying || !targetCameraPosition || !flightStartPosition) return;

    const t = Math.max(0, Math.min(1, (now - flightStartTime) / FLIGHT_DURATION));
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(flightStartPosition, targetCameraPosition, eased);
    controls.update();

    if (t >= 1) {
        camera.position.copy(targetCameraPosition);
        isFlying = false;
        targetCameraPosition = null;
        flightStartPosition = null;
    }
}

/* COUNTRY SELECTION */

function selectCountry(entity, fly = true) {
    if (!entity) return;

    if (showAllBorders) {
        showAllBorders = false;
        if (allBordersGroup) allBordersGroup.visible = false;
        if (toggleBordersButton) toggleBordersButton.classList.remove("active");
    }

    selectedCountry = entity;

    if (searchInput) searchInput.value = entity.name;
    if (searchResults) searchResults.classList.remove("active");
    if (searchWrapper) searchWrapper.classList.remove("active");

    if (countryInfoName) countryInfoName.textContent = entity.name;
    if (countryInfoCode) countryInfoCode.textContent = entity.iso2 || "";
    if (countryInfo) countryInfo.classList.add("visible");

    ALL_MAP_ENTITIES.forEach(current => {
        if (current.element) current.element.classList.toggle("selected", current === entity);
    });

    buildSelectedHighlight(entity);
    if (fly) flyToCountry(entity);
    if (window.CountryPanel) window.CountryPanel.open(entity);
}

/* CLEAR SELECTION */

function clearCountrySelection() {
    selectedCountry = null;
    if (window.CountryPanel) window.CountryPanel.close();
    if (searchInput) searchInput.value = "";
    if (countryInfo) countryInfo.classList.remove("visible");

    ALL_MAP_ENTITIES.forEach(entity => {
        if (entity.element) {
            entity.element.classList.remove("selected");
            hideCountryLabel(entity);
        }
    });

    clearSelectedHighlight();
}

function clearCountrySelectionAndResetZoom() {
    clearCountrySelection();
    const direction = camera.position.clone().sub(controls.target).normalize();
    targetCameraPosition = direction.multiplyScalar(DESELECT_CAMERA_DIST);
    flightStartPosition = camera.position.clone();
    flightStartTime = performance.now();
    isFlying = true;
}


/* BACKGROUND CLICK CONTROLS */

let pointerDownX = 0;
let pointerDownY = 0;

canvas.addEventListener("pointerdown", event => {
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
});

canvas.addEventListener("pointerup", event => {
    if (event.button === 2) {
        event.preventDefault();
        if (selectedCountry || showAllBorders) {
            if (showAllBorders) {
                showAllBorders = false;
                if (allBordersGroup) allBordersGroup.visible = false;
                if (toggleBordersButton) toggleBordersButton.classList.remove("active");
            }
            clearCountrySelectionAndResetZoom();
        }
        return;
    }

    if (event.button !== 0) return;

    if (Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY) > 6) {
        return;
    }

    if (selectedCountry || showAllBorders) {
        if (showAllBorders) {
            showAllBorders = false;
            if (allBordersGroup) allBordersGroup.visible = false;
            if (toggleBordersButton) toggleBordersButton.classList.remove("active");
        }
        clearCountrySelectionAndResetZoom();
    }
});


/* ======
   SEARCH
   ====== */

/* SEARCH */

let searchHighlightedIndex = -1;

function entityMatchesSearch(entity, query) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return false;

    const name = normalizeText(entity.name);
    const iso2 = normalizeText(entity.iso2 || "");
    const iso3 = normalizeText(entity.iso3 || "");

    return name.includes(normalizedQuery) || iso2 === normalizedQuery || iso3 === normalizedQuery;
}

function setSearchHighlight(index) {
    if (!searchResults) return;
    const items = searchResults.querySelectorAll(".search-item");
    items.forEach((item, i) => item.classList.toggle("highlighted", i === index));
    searchHighlightedIndex = index;
}

function renderSearchResults(query) {
    if (!searchResults) return;
    searchResults.innerHTML = "";
    searchHighlightedIndex = -1;

    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
        searchResults.classList.remove("active");
        return;
    }

    const matches = ALL_MAP_ENTITIES
        .filter(entity => entityMatchesSearch(entity, query))
        .sort((a, b) => {
            const aName = normalizeText(a.name), bName = normalizeText(b.name);
            const aISO2 = normalizeText(a.iso2 || ""), bISO2 = normalizeText(b.iso2 || "");

            const aExactISO2 = aISO2 === normalizedQuery, bExactISO2 = bISO2 === normalizedQuery;
            if (aExactISO2 !== bExactISO2) return aExactISO2 ? -1 : 1;

            const aExactName = aName === normalizedQuery, bExactName = bName === normalizedQuery;
            if (aExactName !== bExactName) return aExactName ? -1 : 1;

            const aStarts = aName.startsWith(normalizedQuery), bStarts = bName.startsWith(normalizedQuery);
            if (aStarts !== bStarts) return aStarts ? -1 : 1;

            return aName.localeCompare(bName);
        })
        .slice(0, 10);

    if (!matches.length) {
        const noResults = document.createElement("div");
        noResults.className = "search-no-results";
        noResults.textContent = "No match found";
        searchResults.appendChild(noResults);
        searchResults.classList.add("active");
        return;
    }

    matches.forEach((entity, index) => {
        const item = document.createElement("div");
        item.className = "search-item";
        item.innerHTML = `<span class="search-item-name">${escapeHTML(entity.name)}</span><span class="search-item-code">${escapeHTML(entity.iso2 || "")}</span>`;

        item.addEventListener("mouseenter", () => setSearchHighlight(index));
        item.addEventListener("click", event => {
            event.stopPropagation();
            selectCountry(entity, true);
        });

        searchResults.appendChild(item);
    });

    searchResults.classList.add("active");
}

/* SEARCH INPUT */

if (searchInput) {
    searchInput.addEventListener("input", event => {
        const query = event.target.value.trim();
        if (!query) {
            if (searchWrapper) searchWrapper.classList.remove("active");
            if (searchResults) {
                searchResults.classList.remove("active");
                searchResults.innerHTML = "";
            }
            searchHighlightedIndex = -1;
            return;
        }
        if (searchWrapper) searchWrapper.classList.add("active");
        renderSearchResults(query);
    });

    searchInput.addEventListener("keydown", event => {
        if (!searchResults) return;
        const items = searchResults.querySelectorAll(".search-item");

        if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!items.length) return;
            const next = (searchHighlightedIndex + 1) % items.length;
            setSearchHighlight(next);
            items[next].scrollIntoView({ block: "nearest" });
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            if (!items.length) return;
            let next = searchHighlightedIndex - 1;
            if (next < 0) next = items.length - 1;
            setSearchHighlight(next);
            items[next].scrollIntoView({ block: "nearest" });
        }

        if (event.key === "Enter") {
            event.preventDefault();
            const index = searchHighlightedIndex < 0 ? 0 : searchHighlightedIndex;
            if (items[index]) items[index].click();
        }

        if (event.key === "Escape") {
            searchResults.classList.remove("active");
            if (searchWrapper) searchWrapper.classList.remove("active");
            searchInput.blur();
        }
    });
}

/* SEARCH BUTTON */

if (searchButton) {
    searchButton.addEventListener("click", () => {
        if (searchInput) searchInput.focus();
        if (searchInput && searchInput.value.trim()) {
            if (searchWrapper) searchWrapper.classList.add("active");
            renderSearchResults(searchInput.value);
        } else {
            if (searchWrapper) searchWrapper.classList.remove("active");
            if (searchResults) searchResults.classList.remove("active");
        }
    });
}

document.addEventListener("pointerdown", event => {
    if (searchWrapper && searchResults && !searchWrapper.contains(event.target)) {
        searchResults.classList.remove("active");
    }
}, true);

/* SEARCH CLEAR */

(function () {
    const clearInput = document.getElementById("country-search-input");
    const clearBtn = document.getElementById("search-clear-btn");
    const clearWrapper = document.getElementById("search-wrapper");
    if (!clearInput || !clearBtn || !clearWrapper) return;

    const syncClear = () => clearWrapper.classList.toggle("has-text", clearInput.value.length > 0);

    clearInput.addEventListener("input", syncClear);
    clearInput.addEventListener("focus", syncClear);
    clearWrapper.addEventListener("pointerenter", syncClear);

    clearBtn.addEventListener("mousedown", e => e.preventDefault());
    clearBtn.addEventListener("click", () => {
        clearInput.value = "";
        clearInput.dispatchEvent(new Event("input", { bubbles: true }));
        syncClear();
        clearInput.focus();
    });
})();
