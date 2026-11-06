/* ================= GLOBE =================

/* use AI in sum of the code */

/* ==============
   LOADING SCREEN
   ============== */

let currentDisplayPercent = 0;
let targetPercent = 45; 
let progressInterval = null;
let forceCompleteTimer = null;

function startProgressAnimation() {
    if (progressInterval) return;
    
    forceCompleteTimer = setTimeout(() => {
        if (currentDisplayPercent < 100) {
            targetPercent = 100;
        }
    }, 6000);

    progressInterval = setInterval(() => {
        if (currentDisplayPercent < targetPercent) {
            const step = targetPercent > currentDisplayPercent + 15 ? 3 : 1;
            currentDisplayPercent = Math.min(targetPercent, currentDisplayPercent + step);
            
            const percentEl = document.getElementById("loading-percentage");
            if (percentEl) percentEl.textContent = `${currentDisplayPercent}%`;
        }

        if (currentDisplayPercent >= 100) {
            clearInterval(progressInterval);
            if (forceCompleteTimer) clearTimeout(forceCompleteTimer);
            
            const loaderScreen = document.getElementById("loading-screen");
            if (loaderScreen && !loaderScreen.classList.contains("fade-out")) {
                updateLoadingStatus("All systems ready. Launching...", 100);
                setTimeout(() => {
                    loaderScreen.classList.add("fade-out");
                }, 300);
            }
        }
    }, 12);
}

function updateLoadingStatus(message, targetValue) {
    const textEl = document.getElementById("loading-text");
    if (textEl) textEl.textContent = message;
    
    if (typeof targetValue === 'number') {
        targetPercent = Math.max(targetPercent, targetValue);
    }
    startProgressAnimation();
}

function checkAndDismissLoader() {
   targetPercent = 100;
}

startProgressAnimation();


/* =======================
   SCENE, CAMERA, RENDERER
   ======================= */

/* BASIC SCENE & CAMERA */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.005, 100);
camera.position.set(0, 0, 7.5);

/* RENDERER */
const canvas = document.querySelector("#webgl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

/* GLOBE & INNER CORE */
const globeGroup = new THREE.Group();
scene.add(globeGroup);

const GLOBE_RADIUS_UNITS = 1.8;
const innerCoreGeo = new THREE.SphereGeometry(1.782, 48, 48);
const innerCoreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
globeGroup.add(innerCore);

const occlusionSphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS_UNITS, 32, 32);
const occlusionSphereMat = new THREE.MeshBasicMaterial({ visible: false });
const occlusionSphere = new THREE.Mesh(occlusionSphereGeo, occlusionSphereMat);
globeGroup.add(occlusionSphere);

/* UI REFERENCES */
const scaleStartEl = document.getElementById("scale-start");
const scaleMidEl = document.getElementById("scale-mid");
const scaleEndEl = document.getElementById("scale-end");
const altDisplayEl = document.getElementById("altitude-display");
const scaleFillEl = document.getElementById("scale-progress-fill");

const searchInput = document.getElementById("country-search-input");
const searchResults = document.getElementById("search-results");
const searchWrapper = document.getElementById("search-wrapper");
const searchButton = document.getElementById("search-btn");

const countryTagsContainer = document.getElementById("country-tags-container");
const countryInfo = document.getElementById("country-info");
const countryInfoName = document.getElementById("country-info-name");
const countryInfoCode = document.getElementById("country-info-code");

const toggleBordersButton = document.getElementById("toggle-borders-btn");

/* 005. CONSTANTS */
const EARTH_RADIUS_KM = 6371;
const KM_PER_UNIT = EARTH_RADIUS_KM / GLOBE_RADIUS_UNITS;
const MIN_ALTITUDE_KM = 500;
const MIN_CAMERA_DIST = GLOBE_RADIUS_UNITS + (MIN_ALTITUDE_KM / KM_PER_UNIT);
const DESELECT_ALTITUDE_KM = 10000;
const COUNTRY_LABEL_ALTITUDE_KM = 11000;
const DESELECT_CAMERA_DIST = Math.min(7.5, GLOBE_RADIUS_UNITS + (DESELECT_ALTITUDE_KM / KM_PER_UNIT));

const HIGH_RES_COUNTRY_URL = "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_10m_admin_0_countries_iso.geojson";
const LOW_RES_BORDER_URL = "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_map_units.geojson";


/* =======
   HELPERS
   ======= */

/* 006. GENERAL UTILS */
function normalizeText(str) {
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function escapeHTML(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function codeValue(value) {
    const code = String(value ?? "").trim().toUpperCase();
    return (!code || code === "-99" || code === "NULL" || code === "N/A") ? null : code;
}

/* LAT/LNG CONVERSION */
function latLngToVector3(lat, lng, radius) {
    const latRad = THREE.MathUtils.degToRad(lat);
    const lngRad = THREE.MathUtils.degToRad(lng);
    const cosLat = Math.cos(latRad);
    return new THREE.Vector3(radius * cosLat * Math.sin(lngRad), radius * Math.sin(latRad), radius * cosLat * Math.cos(lngRad));
}

function vector3ToLatLng(vector) {
    const normalized = vector.clone().normalize();
    return {
        lat: THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(normalized.y, -1, 1))),
        lng: THREE.MathUtils.radToDeg(Math.atan2(normalized.x, normalized.z))
    };
}

function minimalLongitudeSpan(minLng, maxLng) {
    const difference = Math.abs(maxLng - minLng);
    return difference > 180 ? 360 - difference : difference;
}

/* CIRCLE TEXTURE */
function createCircleTexture() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    const texture = new THREE.CanvasTexture(c);
    texture.needsUpdate = true;
    return texture;
}

const dotTexture = createCircleTexture();


/* =====
   GLOBE
   ===== */

/* POINT MATERIAL HELPERS */
function applyScreenCullingAndClamping(material) {
    material.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader.replace(
            "#include <project_vertex>",
            `
            #include <project_vertex>
            gl_PointSize = max(1.8, gl_PointSize);
            vec2 ndcPos = gl_Position.xy / gl_Position.w;
            if (abs(ndcPos.x) > 1.05 || abs(ndcPos.y) > 1.05) {
                gl_PointSize = 0.0;
            }
            `
        );
    };
    material.userData.baseOpacity = material.opacity;
    material.userData.originalColor = material.color.clone();
}

/* EARTH DOT GLOBE */

let globeLOD = null;
const globePointMaterials = [];
const earthImage = new Image();

earthImage.crossOrigin = "anonymous";
earthImage.src = "./globe/earth_specular_2048.jpg";

earthImage.onerror = () => {
    console.error("[Aurora Orbit] Failed to load ./txt/earth_specular_2048.jpg");
    updateLoadingStatus("Earth texture missing (check txt/earth_specular_2048.jpg)", 100);
};

earthImage.onload = () => {
    updateLoadingStatus("Processing Earth surface texture...", 70);
    const canvas2 = document.createElement("canvas");
    canvas2.width = earthImage.width;
    canvas2.height = earthImage.height;
    const ctx = canvas2.getContext("2d");
    ctx.drawImage(earthImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas2.width, canvas2.height).data;
    globeLOD = new THREE.LOD();

    const lodLevels = [
        { distance: 0.00, points: 1500000, landSize: 0.0016, oceanSize: 0.0008 },
        { distance: 1.83, points: 1100000, landSize: 0.0020, oceanSize: 0.0010 },
        { distance: 1.88, points: 800000,  landSize: 0.0026, oceanSize: 0.0013 },
        { distance: 1.95, points: 550000,  landSize: 0.0035, oceanSize: 0.0017 },
        { distance: 2.05, points: 380000,  landSize: 0.0046, oceanSize: 0.0023 },
        { distance: 2.18, points: 260000,  landSize: 0.0060, oceanSize: 0.0030 },
        { distance: 2.35, points: 180000,  landSize: 0.0078, oceanSize: 0.0039 },
        { distance: 2.58, points: 120000,  landSize: 0.0100, oceanSize: 0.0050 },
        { distance: 2.88, points: 80000,   landSize: 0.0130, oceanSize: 0.0065 },
        { distance: 3.25, points: 52000,   landSize: 0.0170, oceanSize: 0.0085 },
        { distance: 3.70, points: 34000,   landSize: 0.0220, oceanSize: 0.0110 },
        { distance: 4.25, points: 22000,   landSize: 0.0280, oceanSize: 0.0140 },
        { distance: 4.90, points: 14000,   landSize: 0.0360, oceanSize: 0.0180 },
        { distance: 6.30, points: 7000,    landSize: 0.0465, oceanSize: 0.0232 }
    ];

    function buildLevelGroup(config) {
        const group = new THREE.Group();
        const land = [];
        const ocean = [];
        const phi = Math.PI * (3 - Math.sqrt(5));

        for (let i = 0; i < config.points; i++) {
            const y = 1 - (i / (config.points - 1)) * 2;
            const ring = Math.sqrt(1 - y * y);
            const theta = phi * i;

            const x = Math.cos(theta) * ring;
            const z = Math.sin(theta) * ring;

            const px = x * GLOBE_RADIUS_UNITS;
            const py = y * GLOBE_RADIUS_UNITS;
            const pz = z * GLOBE_RADIUS_UNITS;

            const u = (Math.atan2(x, z) / (2 * Math.PI)) + 0.5;
            const v = 0.5 - Math.asin(THREE.MathUtils.clamp(y, -1, 1)) / Math.PI;

            const imgX = Math.min(earthImage.width - 1, Math.max(0, Math.floor(u * earthImage.width)));
            const imgY = Math.min(earthImage.height - 1, Math.max(0, Math.floor(v * earthImage.height)));
            const pixel = (imgY * earthImage.width + imgX) * 4;

            if (imgData[pixel] > 45) {
                ocean.push(px, py, pz);
            } else {
                land.push(px, py, pz);
            }
        }

        const landGeo = new THREE.BufferGeometry();
        landGeo.setAttribute("position", new THREE.Float32BufferAttribute(land, 3));
        const landMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: config.landSize,
            map: dotTexture,
            transparent: true,
            opacity: 1,
            depthWrite: false,
            depthTest: true
        });
        applyScreenCullingAndClamping(landMat);
        globePointMaterials.push(landMat);
        group.add(new THREE.Points(landGeo, landMat));

        const oceanGeo = new THREE.BufferGeometry();
        oceanGeo.setAttribute("position", new THREE.Float32BufferAttribute(ocean, 3));
        const oceanMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: config.oceanSize,
            map: dotTexture,
            transparent: true,
            opacity: 1.0,
            depthWrite: false,
            depthTest: true
        });
        applyScreenCullingAndClamping(oceanMat);
        globePointMaterials.push(oceanMat);
        group.add(new THREE.Points(oceanGeo, oceanMat));

        return group;
    }

    lodLevels.forEach(config => {
        globeLOD.addLevel(buildLevelGroup(config), config.distance);
    });

    globeGroup.add(globeLOD);
    updateLoadingStatus("Earth surface geometry compiled successfully");
    checkAndDismissLoader();
};

/* CLOUD */

const cloudGroup = new THREE.Group();
globeGroup.add(cloudGroup);

const cloudRadius = GLOBE_RADIUS_UNITS + 0.025;
const cloudGeometry = new THREE.SphereGeometry(cloudRadius, 64, 64);

let cloudMesh; 

const textureLoader = new THREE.TextureLoader();

updateLoadingStatus("Loading atmospheric cloud layer...");

textureLoader.load('./globe/earth_clouds_1024.png',
    (cloudTexture) => {
        const cloudMaterial = new THREE.MeshBasicMaterial({
            map: cloudTexture,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        cloudGroup.add(cloudMesh);
        
        updateLoadingStatus("Loading atmospheric cloud layer...", 88);
        checkAndDismissLoader();
    },
    undefined,
    (error) => {
        console.error("[Aurora Orbit] Failed to load cloud texture:", error);
    }
);

/* CONTROLS */

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.minDistance = MIN_CAMERA_DIST;
controls.maxDistance = 7.5;
controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;

canvas.addEventListener("contextmenu", event => event.preventDefault());

let userInteracting = false;
let isFlying = false;

let selectedCountry = null;
let selectedHighlightGroup = null;
let selectedPulseMaterial = null;

let allBordersGroup = null;
let showAllBorders = false;

let targetCameraPosition = null;
let flightStartPosition = null;
let flightStartTime = 0;
const FLIGHT_DURATION = 850;

controls.addEventListener("start", () => { userInteracting = true; });
controls.addEventListener("end", () => { userInteracting = false; });


/* ======================
   STARS + SHOOTING STARS
   ====================== */

/* STAR SYSTEM  */

const starSystemGroup = new THREE.Group();
scene.add(starSystemGroup);

const starLayersConfig = [
    { count: 2000, radiusMin: 25, radiusMax: 80, size: 0.12, opacity: 0.4 }, 
    { count: 1000, radiusMin: 15, radiusMax: 60, size: 0.15, opacity: 0.6 }, 
    { count: 600,  radiusMin: 8,  radiusMax: 30, size: 0.13, opacity: 0.9 }  
];

starLayersConfig.forEach(config => {
    const positions = [];

    for (let i = 0; i < config.count; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = THREE.MathUtils.lerp(config.radiusMin, config.radiusMax, Math.random());

        const sinPhi = Math.sin(phi);
        const x = r * sinPhi * Math.cos(theta);
        const y = r * sinPhi * Math.sin(theta);
        const z = r * Math.cos(phi);

        positions.push(x, y, z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: config.size,
        map: dotTexture,
        transparent: true,
        opacity: config.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const starPoints = new THREE.Points(geometry, material);
    starSystemGroup.add(starPoints);
});

/* SHOOTING STARS SETUP */

const shootingStarGeo = new THREE.BufferGeometry();
const trailLength = 10;
const sPositions = new Float32Array(trailLength * 3);
shootingStarGeo.setAttribute('position', new THREE.BufferAttribute(sPositions, 3));

const shootingStarMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    linewidth: 2
});

const shootingStarLine = new THREE.Line(shootingStarGeo, shootingStarMat);
scene.add(shootingStarLine);

let shootingStarState = {
    active: false,
    progress: 0,
    speed: 0.015,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3()
};

function triggerShootingStar() {
    if (shootingStarState.active || Math.random() > 0.01) return;

    const u = Math.random();
    const v = Math.random() * 0.5;
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 20;

    const sinPhi = Math.sin(phi);
    shootingStarState.startPos.set(
        r * sinPhi * Math.cos(theta),
        r * sinPhi * Math.sin(theta),
        r * Math.cos(phi)
    );

    shootingStarState.endPos.copy(shootingStarState.startPos);
    shootingStarState.endPos.x += (Math.random() - 0.5) * 10;
    shootingStarState.endPos.y -= 5 + Math.random() * 5;
    shootingStarState.endPos.z += (Math.random() - 0.5) * 10;

    shootingStarState.progress = 0;
    shootingStarState.active = true;
    shootingStarMat.opacity = 0.8;
}

function updateShootingStars() {
    if (!shootingStarState.active) {
        triggerShootingStar();
        return;
    }

    shootingStarState.progress += shootingStarState.speed;
    const t = shootingStarState.progress;

    if (t >= 1) {
        shootingStarState.active = false;
        shootingStarMat.opacity = 0;
        return;
    }

    const posAttr = shootingStarLine.geometry.attributes.position;
    for (let i = 0; i < trailLength; i++) {
        const subT = Math.max(0, t - (i * 0.015));
        const currentVec = new THREE.Vector3().lerpVectors(shootingStarState.startPos, shootingStarState.endPos, subT);
        posAttr.setXYZ(i, currentVec.x, currentVec.y, currentVec.z);
    }
    posAttr.needsUpdate = true;
    shootingStarMat.opacity = (1 - t) * 0.8;
}


/* =================
   PER-FRAME UPDATES 
   ================= */

/* SCALE BAR */

let lastDistanceCheck = 0;

function updateScaleBarUI(distance) {
    if (Math.abs(lastDistanceCheck - distance) < 0.002) return;
    lastDistanceCheck = distance;

    const zoomProgressPercent = Math.max(0, Math.min(100, ((controls.maxDistance - distance) / (controls.maxDistance - controls.minDistance)) * 100));
    if (scaleFillEl) scaleFillEl.style.width = `${zoomProgressPercent}%`;

    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const visibleHeightUnits = 2 * distance * Math.tan(fovRad / 2);
    const unitsPerPixel = visibleHeightUnits / window.innerHeight;
    const rawBarDistKm = 150 * unitsPerPixel * KM_PER_UNIT;
    const altitudeKm = Math.max(0, (distance - GLOBE_RADIUS_UNITS) * KM_PER_UNIT);

    let endStr = "", midStr = "";

    if (rawBarDistKm >= 1000) {
        const rounded = Math.round(rawBarDistKm / 100) * 100;
        endStr = `${rounded.toLocaleString()} km`;
        midStr = `${Math.round(rounded / 2).toLocaleString()}`;
    } else if (rawBarDistKm >= 10) {
        const rounded = Math.round(rawBarDistKm);
        endStr = `${rounded} km`;
        const mid = rounded / 2;
        midStr = Number.isInteger(mid) ? String(mid) : mid.toFixed(1);
    } else if (rawBarDistKm >= 1) {
        const rounded = parseFloat(rawBarDistKm.toFixed(1));
        endStr = `${rounded} km`;
        midStr = (rounded / 2).toFixed(1);
    } else {
        const meters = Math.round(rawBarDistKm * 1000);
        endStr = `${meters} m`;
        midStr = String(Math.round(meters / 2));
    }

    if (scaleStartEl) scaleStartEl.textContent = "0";
    if (scaleMidEl) scaleMidEl.textContent = midStr;
    if (scaleEndEl) scaleEndEl.textContent = endStr;

    if (altDisplayEl) {
        const altitudeText = altitudeKm >= 100 ? `${Math.round(altitudeKm)} km` : `${altitudeKm.toFixed(1)} km`;
        altDisplayEl.textContent = `Alt: ${altitudeText} | Cam: ${distance.toFixed(2)}`;
    }
}

/* AUTO ROTATION & ORBIT SPEED BASED ON ZOOM */

function updateOrbitSpeedByZoom(distance) {
    const factor = Math.max(0, Math.min(1, (distance - controls.minDistance) / (controls.maxDistance - controls.minDistance)));
    controls.rotateSpeed = THREE.MathUtils.lerp(0.2, 1.0, factor);
}

function updateGlobeRotation(distance) {
    if (userInteracting || isFlying || selectedCountry) return;
    const factor = Math.max(0, Math.min(1, (distance - controls.minDistance) / (controls.maxDistance - controls.minDistance)));
    const dynamicSpeed = 0.000005 + Math.pow(factor, 2) * (0.0015 - 0.000005);
    globeGroup.rotation.y += dynamicSpeed;
}

/* SELECTED PULSE */

function updateSelectedPulse(now) {
    if (!selectedPulseMaterial) return;

    const distance = camera.position.distanceTo(controls.target);
    const normalizedDistance = Math.max(0, Math.min(1, (distance - controls.minDistance) / (controls.maxDistance - controls.minDistance)));
    const baseSize = THREE.MathUtils.lerp(0.015, 0.045, normalizedDistance);
    const pulse = (Math.sin(now * 0.0035) + 1) / 2;

    selectedPulseMaterial.size = baseSize + (pulse * 0.01);
    selectedPulseMaterial.opacity = 0.5 + (pulse * 0.4);
}


/* ======================
   ANIMATION LOOP + START
   ====================== */

/* ANIMATION LOOP */
function animate(now) {
    requestAnimationFrame(animate);

    const cameraDistance = camera.position.distanceTo(controls.target);

    handleCameraFlight(now);
    updateGlobeRotation(cameraDistance);
    updateOrbitSpeedByZoom(cameraDistance);
    updateScaleBarUI(cameraDistance);
    updateSelectedPulse(now);
    updateCountryTags();

   if (typeof cloudMesh !== 'undefined' && cloudMesh.material) {
        const minFadeDist = GLOBE_RADIUS_UNITS + 0.3;
        const maxFadeDist = GLOBE_RADIUS_UNITS + 2.5;
        
        const cloudOpacityFactor = THREE.MathUtils.clamp(
            (cameraDistance - minFadeDist) / (maxFadeDist - minFadeDist), 
            0, 
            1
        );        
        cloudMesh.material.opacity = 0.5 * cloudOpacityFactor;
        cloudMesh.visible = cloudMesh.material.opacity > 0.01;
    }

    // Cloud rotation
    if (typeof cloudGroup !== 'undefined') {
        cloudGroup.rotation.y += 0.00015;
    }

    // Star rotation
    starSystemGroup.rotation.y += 0.0001;

    updateShootingStars();

    controls.update();
    renderer.render(scene, camera);
}

/* RESIZE HANDLER */
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

/* INITIALIZE */
document.addEventListener("DOMContentLoaded", () => {
    loadGlobalCountryData();
    animate(performance.now());
});
