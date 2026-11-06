/* ================= COUNTRIES ================= */


/* ================
   COUNTRY REGISTRY
   ================ */

/* COUNTRY REGISTRY  197*/

const COUNTRY_TABLE = `
Afghanistan|AF|AFG
Albania|AL|ALB
Algeria|DZ|DZA
Andorra|AD|AND
Angola|AO|AGO
Antigua and Barbuda|AG|ATG
Argentina|AR|ARG
Armenia|AM|ARM
Australia|AU|AUS
Austria|AT|AUT
Azerbaijan|AZ|AZE
Bahamas|BS|BHS
Bahrain|BH|BHR
Bangladesh|BD|BGD
Barbados|BB|BRB
Belarus|BY|BLR
Belgium|BE|BEL
Belize|BZ|BLZ
Benin|BJ|BEN
Bhutan|BT|BTN
Bolivia|BO|BOL
Bosnia and Herzegovina|BA|BIH
Botswana|BW|BWA
Brazil|BR|BRA
Brunei|BN|BRN
Bulgaria|BG|BGR
Burkina Faso|BF|BFA
Burundi|BI|BDI
Cabo Verde|CV|CPV
Cambodia|KH|KHM
Cameroon|CM|CMR
Canada|CA|CAN
Central African Republic|CF|CAF
Chad|TD|TCD
Chile|CL|CHL
China|CN|CHN
Colombia|CO|COL
Comoros|KM|COM
Costa Rica|CR|CRI
Côte d'Ivoire|CI|CIV
Croatia|HR|HRV
Cuba|CU|CUB
Cyprus|CY|CYP
Czechia|CZ|CZE
Democratic Republic of the Congo|CD|COD
Denmark|DK|DNK
Djibouti|DJ|DJI
Dominica|DM|DMA
Dominican Republic|DO|DOM
Ecuador|EC|ECU
Egypt|EG|EGY
El Salvador|SV|SLV
Equatorial Guinea|GQ|GNQ
Eritrea|ER|ERI
Estonia|EE|EST
Eswatini|SZ|SWZ
Ethiopia|ET|ETH
Fiji|FJ|FJI
Finland|FI|FIN
France|FR|FRA
Gabon|GA|GAB
Gambia|GM|GMB
Georgia|GE|GEO
Germany|DE|DEU
Ghana|GH|GHA
Greece|GR|GRC
Grenada|GD|GRD
Guatemala|GT|GTM
Guinea|GN|GIN
Guinea-Bissau|GW|GNB
Guyana|GY|GUY
Haiti|HT|HTI
Honduras|HN|HND
Hungary|HU|HUN
Iceland|IS|ISL
India|IN|IND
Indonesia|ID|IDN
Iran|IR|IRN
Iraq|IQ|IRQ
Ireland|IE|IRL
Israel|IL|ISR
Italy|IT|ITA
Jamaica|JM|JAM
Japan|JP|JPN
Jordan|JO|JOR
Kazakhstan|KZ|KAZ
Kenya|KE|KEN
Kiribati|KI|KIR
Kosovo|XK|XKX
Kuwait|KW|KWT
Kyrgyzstan|KG|KGZ
Laos|LA|LAO
Latvia|LV|LVA
Lebanon|LB|LBN
Lesotho|LS|LSO
Liberia|LR|LBR
Libya|LY|LBY
Liechtenstein|LI|LIE
Lithuania|LT|LTU
Luxembourg|LU|LUX
Madagascar|MG|MDG
Malawi|MW|MWI
Malaysia|MY|MYS
Maldives|MV|MDV
Mali|ML|MLI
Malta|MT|MLT
Marshall Islands|MH|MHL
Mauritania|MR|MRT
Mauritius|MU|MUS
Mexico|MX|MEX
Micronesia|FM|FSM
Moldova|MD|MDA
Monaco|MC|MCO
Mongolia|MN|MNG
Montenegro|ME|MNE
Morocco|MA|MAR
Mozambique|MZ|MOZ
Myanmar|MM|MMR
Namibia|NA|NAM
Nauru|NR|NRU
Nepal|NP|NPL
Netherlands|NL|NLD
New Zealand|NZ|NZL
Nicaragua|NI|NIC
Niger|NE|NER
Nigeria|NG|NGA
North Korea|KP|PRK
North Macedonia|MK|MKD
Norway|NO|NOR
Oman|OM|OMN
Pakistan|PK|PAK
Palau|PW|PLW
Palestine|PS|PSE
Panama|PA|PAN
Papua New Guinea|PG|PNG
Paraguay|PY|PRY
Peru|PE|PER
Philippines|PH|PHL
Poland|PL|POL
Portugal|PT|PRT
Qatar|QA|QAT
Republic of the Congo|CG|COG
Romania|RO|ROU
Russia|RU|RUS
Rwanda|RW|RWA
Saint Kitts and Nevis|KN|KNA
Saint Lucia|LC|LCA
Saint Vincent and the Grenadines|VC|VCT
Samoa|WS|WSM
San Marino|SM|SMR
Sao Tome and Principe|ST|STP
Saudi Arabia|SA|SAU
Senegal|SN|SEN
Serbia|RS|SRB
Seychelles|SC|SYC
Sierra Leone|SL|SLE
Singapore|SG|SGP
Slovakia|SK|SVK
Slovenia|SI|SVN
Solomon Islands|SB|SLB
Somalia|SO|SOM
South Africa|ZA|ZAF
South Korea|KR|KOR
South Sudan|SS|SSD
Spain|ES|ESP
Sri Lanka|LK|LKA
Sudan|SD|SDN
Suriname|SR|SUR
Sweden|SE|SWE
Switzerland|CH|CHE
Syria|SY|SYR
Taiwan|TW|TWN
Tajikistan|TJ|TJK
Tanzania|TZ|TZA
Thailand|TH|THA
Timor-Leste|TL|TLS
Togo|TG|TGO
Tonga|TO|TON
Trinidad and Tobago|TT|TTO
Tunisia|TN|TUN
Turkey|TR|TUR
Turkmenistan|TM|TKM
Tuvalu|TV|TUV
Uganda|UG|UGA
Ukraine|UA|UKR
United Arab Emirates|AE|ARE
United Kingdom|GB|GBR
United States|US|USA
Uruguay|UY|URY
Uzbekistan|UZ|UZB
Vanuatu|VU|VUT
Vatican City|VA|VAT
Venezuela|VE|VEN
Vietnam|VN|VNM
Yemen|YE|YEM
Zambia|ZM|ZMB
Zimbabwe|ZW|ZWE
`.trim();

const AURORA_COUNTRIES = COUNTRY_TABLE
    .split(/\r?\n/)
    .map(line => {
        const [name, iso2, iso3] = line.split("|");
        return { name, iso2, iso3 };
    })
    .sort((a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name)))
    .map((country, index) => ({
        ...country,
        id: String(index + 1).padStart(3, "0"),
        type: "country",
        features: [],
        feature: null,
        lat: null,
        lng: null,
        position: null,
        bounds: null,
        element: null
    }));

/* ERRITORIES */

const TERRITORY_REGISTRY = [
    { name: "French Guiana", iso2: "GF", iso3: "GUF", type: "territory" },
    { name: "Greenland", iso2: "GL", iso3: "GRL", type: "territory" },
    { name: "Western Sahara", iso2: "EH", iso3: "ESH", type: "territory" },
    { name: "Antarctica", iso2: "AQ", iso3: "ATA", type: "territory" }
];

/* NAME ALIASES */

const NAME_ALIASES = new Map([
    ["russian federation", "russia"],
    ["republic of korea", "south korea"],
    ["korea republic of", "south korea"],
    ["democratic peoples republic of korea", "north korea"],
    ["korea democratic peoples republic of", "north korea"],
    ["czech republic", "czechia"],
    ["cape verde", "cabo verde"],
    ["swaziland", "eswatini"],
    ["burma", "myanmar"],
    ["lao peoples democratic republic", "laos"],
    ["lao pdr", "laos"],
    ["brunei darussalam", "brunei"],
    ["bolivia plurinational state of", "bolivia"],
    ["venezuela bolivarian republic of", "venezuela"],
    ["tanzania united republic of", "tanzania"],
    ["moldova republic of", "moldova"],
    ["iran islamic republic of", "iran"],
    ["syrian arab republic", "syria"],
    ["united states of america", "united states"],
    ["united kingdom of great britain and northern ireland", "united kingdom"],
    ["viet nam", "vietnam"],
    ["holy see", "vatican city"],
    ["state of palestine", "palestine"],
    ["turkiye", "turkey"],
    ["northern cyprus", "cyprus"],
    ["turkish republic of northern cyprus", "cyprus"],
    ["french guiana", "french guiana"]
]);

function canonicalCountryKey(name) {
    const normalized = normalizeText(name);
    return NAME_ALIASES.get(normalized) || normalized;
}

/* LABEL OVERRIDES */

const LABEL_OVERRIDES = {
    RUS: { lat: 61.0, lng: 100.0 },
    FRA: { lat: 46.5, lng: 2.2 }
};

/* MAP DATA STATE */

let HIGH_RES_FEATURES = [];
let LOW_RES_FEATURES = [];

const HIGH_BY_ISO3 = new Map();
const HIGH_BY_NAME = new Map();
const LOW_BY_ISO3 = new Map();
const LOW_BY_NAME = new Map();

let COUNTRY_DATA = [];
let TERRITORY_DATA = [];
let ALL_MAP_ENTITIES = [];

const COUNTRY_BY_NAME = new Map();
const COUNTRY_BY_ID = new Map();
const COUNTRY_BY_ISO3 = new Map();


/* ========
   GEO JSON
   ======== */


/* GEO JSON INDEX */

function getFeatureISO3(feature) {
    const props = feature?.properties || {};
    return codeValue(props.ISO_A3) || codeValue(props.ADM0_A3) || codeValue(props.GU_A3) || codeValue(props.SU_A3) || codeValue(props.BRK_A3) || null;
}

function getFeatureNames(feature) {
    const props = feature?.properties || {};
    return [props.ADMIN, props.NAME, props.NAME_LONG, props.NAME_EN, props.NAME_CIAWF, props.GEOUNIT, props.SUBUNIT, props.SOVEREIGNT, props.BRK_NAME, props.FORMAL_EN].filter(Boolean).map(normalizeText);
}

function indexFeature(feature, isoMap, nameMap) {
    const iso3 = getFeatureISO3(feature);
    if (iso3) {
        if (!isoMap.has(iso3)) isoMap.set(iso3, []);
        isoMap.get(iso3).push(feature);
    }
    const names = getFeatureNames(feature);
    for (const name of names) {
        if (!name) continue;
        if (!nameMap.has(name)) nameMap.set(name, []);
        nameMap.get(name).push(feature);
    }
}

/* GAY JSON POLY (GEO LOL)*/

function getFeaturePolygons(feature) {
    if (!feature || !feature.geometry) return [];
    const geometry = feature.geometry;
    if (geometry.type === "Polygon") return [geometry.coordinates];
    if (geometry.type === "MultiPolygon") return geometry.coordinates || [];
    return [];
}

function forEachRing(feature, callback) {
    const polygons = getFeaturePolygons(feature);
    for (const polygon of polygons) {
        if (!polygon) continue;
        for (const ring of polygon) {
            if (ring && ring.length >= 2) callback(ring);
        }
    }
}

/* FEATURE BOUNDS */

function getFeatureBounds(feature) {
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    forEachRing(feature, ring => {
        for (const point of ring) {
            const lng = Number(point[0]);
            const lat = Number(point[1]);
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;

            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
        }
    });

    return minLat === Infinity ? null : { minLat, maxLat, minLng, maxLng };
}

function getEntityBounds(entity) {
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    for (const feature of entity.features) {
        const bounds = getFeatureBounds(feature);
        if (!bounds) continue;

        minLat = Math.min(minLat, bounds.minLat);
        maxLat = Math.max(maxLat, bounds.maxLat);
        minLng = Math.min(minLng, bounds.minLng);
        maxLng = Math.max(maxLng, bounds.maxLng);
    }

    return minLat === Infinity ? null : { minLat, maxLat, minLng, maxLng };
}

/* GEOMETRIC CENTER */

function geometryCenter(feature) {
    const outerRings = [];
    for (const polygon of getFeaturePolygons(feature)) {
        if (polygon && polygon[0] && polygon[0].length) {
            outerRings.push(polygon[0]);
        }
    }

    if (!outerRings.length) return null;

    let largestRing = outerRings[0];
    let largestArea = -1;

    for (const ring of outerRings) {
        let area = 0;
        for (let i = 0; i < ring.length - 1; i++) {
            const a = ring[i];
            const b = ring[i + 1];
            area += Math.abs((a[0] * b[1]) - (b[0] * a[1]));
        }

        if (area > largestArea) {
            largestArea = area;
            largestRing = ring;
        }
    }

    const sum = new THREE.Vector3();
    for (const point of largestRing) {
        sum.add(latLngToVector3(point[1], point[0], 1));
    }

    return sum.lengthSq() < 1e-12 ? null : vector3ToLatLng(sum.normalize());
}

function getEntityCenter(entity) {
    const override = LABEL_OVERRIDES[entity.iso3];
    if (override) return { lat: override.lat, lng: override.lng };

    for (const feature of entity.features) {
        const p = feature.properties || {};
        const lng = Number(p.LABEL_X);
        const lat = Number(p.LABEL_Y);
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
            return { lat, lng };
        }
    }

    for (const feature of entity.features) {
        const center = geometryCenter(feature);
        if (center) return center;
    }

    return null;
}

/* FIND HIGH RES */
function findFeaturesForEntity(entity) {
    const result = [];
    result.push(...(HIGH_BY_ISO3.get(entity.iso3) || []));

    if (!result.length) {
        result.push(...(HIGH_BY_NAME.get(canonicalCountryKey(entity.name)) || []));
    }

    return Array.from(new Set(result));
}

/* ENTITY PREPARA */

function prepareEntity(entity) {
    entity.features = findFeaturesForEntity(entity);
    entity.feature = entity.features[0] || null;
    entity.bounds = getEntityBounds(entity);

    const center = getEntityCenter(entity);
    if (center) {
        entity.lat = center.lat;
        entity.lng = center.lng;
        entity.position = latLngToVector3(center.lat, center.lng, GLOBE_RADIUS_UNITS + 0.012);
    }

    return entity;
}


/* POINT IN POLY */

function unwrapLongitude(longitude, reference) {
    let value = longitude;
    while (value - reference > 180) value -= 360;
    while (value - reference < -180) value += 360;
    return value;
}

function pointInRing(lng, lat, ring) {
    if (!ring || ring.length < 3) return false;
    let inside = false;
    let previous = ring[ring.length - 1];
    let previousX = unwrapLongitude(Number(previous[0]), lng);
    let previousY = Number(previous[1]);

    for (const current of ring) {
        const currentX = unwrapLongitude(Number(current[0]), lng);
        const currentY = Number(current[1]);

        const intersects = ((currentY > lat) !== (previousY > lat)) &&
            (lng < ((previousX - currentX) * (lat - currentY) / (previousY - currentY)) + currentX);

        if (intersects) inside = !inside;
        previousX = currentX;
        previousY = currentY;
    }
    return inside;
}

function pointInFeature(lng, lat, feature) {
    const polygons = getFeaturePolygons(feature);
    for (const polygon of polygons) {
        if (!polygon || !polygon.length) continue;
        if (!pointInRing(lng, lat, polygon[0])) continue;

        let inHole = false;
        for (let i = 1; i < polygon.length; i++) {
            if (pointInRing(lng, lat, polygon[i])) {
                inHole = true;
                break;
            }
        }
        if (!inHole) return true;
    }
    return false;
}

function entityContainsPoint(entity, lng, lat) {
    if (!entity || !entity.features || !entity.features.length) return false;
    const bounds = entity.bounds;

    if (bounds) {
        if (lat < bounds.minLat - 0.5 || lat > bounds.maxLat + 0.5) return false;
        if (minimalLongitudeSpan(bounds.minLng, bounds.maxLng) < 180) {
            const normalMin = bounds.minLng;
            const normalMax = bounds.maxLng;
            if (normalMin <= normalMax && (lng < normalMin - 1 && lng > normalMax + 1)) {
                if (Math.abs(lng - normalMin) > 180 && Math.abs(lng - normalMax) > 180) return false;
            }
        }
    }

    for (const feature of entity.features) {
        if (pointInFeature(lng, lat, feature)) return true;
    }
    return false;
}

function getEntityAreaScore(entity) {
    if (!entity.bounds) return Infinity;
    const latSpan = Math.abs(entity.bounds.maxLat - entity.bounds.minLat);
    const lonSpan = minimalLongitudeSpan(entity.bounds.minLng, entity.bounds.maxLng);
    const midLat = ((entity.bounds.minLat + entity.bounds.maxLat) * 0.5) * Math.PI / 180;
    return latSpan * lonSpan * Math.max(0.01, Math.cos(midLat));
}

/* =====
   LABEL
   ===== */


/* COUNTRY LESABION (LABEL) */

function createCountryTag(entity) {
    if (!countryTagsContainer) return;

    const tag = document.createElement("div");
    tag.className = "country-tag";
    tag.innerHTML = `<span class="tag-dot"></span><span class="tag-name">${escapeHTML(entity.name)}</span>`;

    const nameElement = tag.querySelector(".tag-name");
    if (nameElement) {
        nameElement.addEventListener("click", event => {
            event.stopPropagation();
            selectCountry(entity, true);
        });
        nameElement.style.pointerEvents = "auto";
        nameElement.style.cursor = "pointer";
    }

    countryTagsContainer.appendChild(tag);
    entity.element = tag;
    tag.style.opacity = "0";
    tag.style.pointerEvents = "none";
}

/* WORLD POSITION */

function getCountryWorldPosition(entity) {
    if (!entity || !entity.position) return null;
    globeGroup.updateMatrixWorld(true);
    return entity.position.clone().applyMatrix4(globeGroup.matrixWorld);
}

/* CAMERA */

function isCountryFacingCamera(entity) {
    const worldPos = getCountryWorldPosition(entity);
    if (!worldPos) return false;

    const surfaceNormal = worldPos.clone().sub(globeGroup.position).normalize();
    const cameraDirection = worldPos.clone().sub(camera.position).normalize();

    return surfaceNormal.dot(cameraDirection) < -0.15;
}

/* LABELS */

const MAX_VISIBLE_COUNTRY_LABELS = 15;
const labelRaycaster = new THREE.Raycaster();
let visibleLabelCountries = new Set();
let lastSelectedLabelCountry = null;

function hideCountryLabel(entity) {
    if (!entity || !entity.element) return;
    entity.element.style.opacity = "0";
    entity.element.style.pointerEvents = "none";
    entity.element.classList.remove("selected");

    const nameElement = entity.element.querySelector(".tag-name");
    if (nameElement) nameElement.style.pointerEvents = "none";
}

function showCountryLabel(entity, selected = false) {
    if (!entity || !entity.element) return;
    entity.element.classList.toggle("selected", selected);
    entity.element.style.opacity = "1";
    entity.element.style.pointerEvents = "none";

    const nameElement = entity.element.querySelector(".tag-name");
    if (nameElement) {
        nameElement.style.pointerEvents = "auto";
        nameElement.style.cursor = "pointer";
    }
}

function positionCountryLabel(entity, rect) {
    if (!entity || !entity.position || !entity.element) return false;
    if (!isCountryFacingCamera(entity)) return false;

    const worldPos = getCountryWorldPosition(entity);
    const rayDir = worldPos.clone().sub(camera.position).normalize();
    const targetDist = camera.position.distanceTo(worldPos);

    labelRaycaster.set(camera.position, rayDir);
    const intersects = labelRaycaster.intersectObject(occlusionSphere);

    if (intersects.length > 0 && intersects[0].distance < targetDist - 0.01) {
        return false;
    }

    const projected = worldPos.clone().project(camera);
    if (projected.z > 1) return false;

    const x = (projected.x * 0.5 + 0.5) * rect.width;
    const y = (-projected.y * 0.5 + 0.5) * rect.height;

    if (x < -120 || x > rect.width + 120 || y < -120 || y > rect.height + 120) {
        return false;
    }

    entity.element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    return true;
}

function findNearestVisibleCountries() {
    const results = [];
    const cameraWorldDirection = camera.position.clone().sub(globeGroup.position).normalize();
    const inverseGlobeQuaternion = globeGroup.quaternion.clone().invert();
    const cameraLocalDirection = cameraWorldDirection.clone().applyQuaternion(inverseGlobeQuaternion).normalize();

    for (const entity of ALL_MAP_ENTITIES) {
        if (!entity.position) continue;
        const normal = entity.position.clone().normalize();
        const facing = normal.dot(cameraLocalDirection);

        if (facing <= 0.12) continue;
        results.push({ entity, facing });
    }

    results.sort((a, b) => b.facing - a.facing);
    return results.slice(0, MAX_VISIBLE_COUNTRY_LABELS).map(item => item.entity);
}

function updateCountryTags() {
    if (!ALL_MAP_ENTITIES.length) return;

    if (showAllBorders) {
        ALL_MAP_ENTITIES.forEach(hideCountryLabel);
        visibleLabelCountries.clear();
        lastSelectedLabelCountry = null;
        return;
    }

    const cameraDistance = camera.position.distanceTo(controls.target);
    const altitudeKm = Math.max(0, (cameraDistance - GLOBE_RADIUS_UNITS) * KM_PER_UNIT);
    const labelsEnabled = altitudeKm <= COUNTRY_LABEL_ALTITUDE_KM;

    globeGroup.updateMatrixWorld(true);
    const rect = renderer.domElement.getBoundingClientRect();
    const nearest = labelsEnabled ? findNearestVisibleCountries() : [];
    const nextSet = new Set(nearest);

    visibleLabelCountries.forEach(entity => {
        if (entity !== selectedCountry && !nextSet.has(entity)) {
            hideCountryLabel(entity);
        }
    });

    nearest.forEach(entity => {
        const selected = entity === selectedCountry;
        if (positionCountryLabel(entity, rect)) {
            showCountryLabel(entity, selected);
        } else if (!selected) {
            hideCountryLabel(entity);
        }
    });

    if (selectedCountry) {
        if (positionCountryLabel(selectedCountry, rect)) {
            showCountryLabel(selectedCountry, true);
        } else {
            hideCountryLabel(selectedCountry);
        }
        lastSelectedLabelCountry = selectedCountry;
    } else if (lastSelectedLabelCountry) {
        hideCountryLabel(lastSelectedLabelCountry);
        lastSelectedLabelCountry = null;
    }

    visibleLabelCountries = nextSet;
}


/* =========
   MAP DATA
   ========= */

/* LOAD COUNTRY */

async function loadGlobalCountryData() {
    try {
        updateLoadingStatus("Mapping 197 countries and territories...", 98);

        const [highResponse, lowResponse] = await Promise.all([
            fetch(HIGH_RES_COUNTRY_URL),
            fetch(LOW_RES_BORDER_URL)
        ]);

        if (!highResponse.ok) throw new Error(`10m map HTTP ${highResponse.status}`);
        if (!lowResponse.ok) throw new Error(`110m map HTTP ${lowResponse.status}`);

        updateLoadingStatus("Parsing GeoJSON country datasets...");
        const [highGeoJSON, lowGeoJSON] = await Promise.all([
            highResponse.json(),
            lowResponse.json()
        ]);

        HIGH_RES_FEATURES = highGeoJSON.features || [];
        LOW_RES_FEATURES = lowGeoJSON.features || [];

        HIGH_BY_ISO3.clear();
        HIGH_BY_NAME.clear();
        LOW_BY_ISO3.clear();
        LOW_BY_NAME.clear();

        HIGH_RES_FEATURES.forEach(feature => indexFeature(feature, HIGH_BY_ISO3, HIGH_BY_NAME));
        LOW_RES_FEATURES.forEach(feature => indexFeature(feature, LOW_BY_ISO3, LOW_BY_NAME));

        updateLoadingStatus("Mapping 197 countries and territories...");
        COUNTRY_DATA = AURORA_COUNTRIES.map(country => prepareEntity({ ...country }));
        TERRITORY_DATA = TERRITORY_REGISTRY.map(territory => prepareEntity({
            ...territory, id: null, features: [], feature: null, lat: null, lng: null, position: null, bounds: null, element: null
        }));

        ALL_MAP_ENTITIES = [...COUNTRY_DATA, ...TERRITORY_DATA];

        COUNTRY_BY_NAME.clear();
        COUNTRY_BY_ID.clear();
        COUNTRY_BY_ISO3.clear();

        COUNTRY_DATA.forEach(country => {
            COUNTRY_BY_NAME.set(canonicalCountryKey(country.name), country);
            COUNTRY_BY_ID.set(country.id, country);
            COUNTRY_BY_ISO3.set(country.iso3, country);
            createCountryTag(country);
        });

        TERRITORY_DATA.forEach(territory => createCountryTag(territory));

        const mappedCountries = COUNTRY_DATA.filter(country => country.features.length > 0 && country.position).length;

        
        updateLoadingStatus(`${mappedCountries} countries successfully mapped`);
        checkAndDismissLoader();

} catch (error) {
        console.error("[Aurora Orbit] GeoJSON error:", error);

        const textEl = document.getElementById("loading-text");
        if (textEl) {
            textEl.textContent = "Error loading map data (Check network)";
            textEl.style.color = "#f92a2add";
        }
    }
}
