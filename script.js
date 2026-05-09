// === 啟動畫面 ===
window.addEventListener('load', () => {
    const splash = document.getElementById('splash');
    setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 800);
    }, 900);
});

// === 地圖初始化 ===
const map = L.map('map', {
    center: [20, 10],
    zoom: 3,
    minZoom: 3,
    zoomControl: true,
    attributionControl: true,
    maxBounds: L.latLngBounds(L.latLng(-85.051, -Infinity), L.latLng(85.051, Infinity)),
    maxBoundsViscosity: 0.9,
    worldCopyJump: false,
    bounceAtZoomLimits: false
});

// === 底圖圖層 ===
const baseLayers = {
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© <a href="https://www.esri.com/">Esri</a>',
        maxZoom: 19,
        className: 'dim-layer'
    }),
    street: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        className: 'street-layer'
    })
};

// === LP 圖層工廠（djlorenz Light Pollution Atlas）===
function createLpLayer(year, opacity) {
    return L.tileLayer(
        `https://djlorenz.github.io/astronomy/image_tiles/tiles${year}/tile_{z}_{x}_{y}.png`,
        {
            attribution: '光害資料 © <a href="https://djlorenz.github.io/astronomy/lp/" target="_blank">Light Pollution Atlas</a> (Falchi et al.)',
            minZoom: 2,
            maxNativeZoom: 8,
            maxZoom: 19,
            tileSize: 1024,
            zoomOffset: -2,
            opacity: opacity,
            className: 'lp-overlay',
            errorTileUrl: `https://djlorenz.github.io/astronomy/image_tiles/tiles${year}/black.png`,
            updateWhenIdle: true,
            updateWhenZooming: false,
            keepBuffer: 2
        }
    );
}

const currentYear = '2024';
const currentOpacity = 0.7;
let lpOverlay = createLpLayer(currentYear, currentOpacity);

// === 衛星標注圖層（CartoDB 深色純標注）===
const satLabels = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
    { attribution: '', subdomains: 'abcd', maxZoom: 19, pane: 'shadowPane' }
);

// 載入預設圖層（街道）
baseLayers.street.addTo(map);
lpOverlay.addTo(map);

// === 底圖切換（只針對底圖按鈕，排除 #yearBtns）===
document.querySelectorAll('.layer-btns:not(#yearBtns) .layer-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.layer-btns:not(#yearBtns) .layer-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        Object.values(baseLayers).forEach(l => map.removeLayer(l));
        baseLayers[this.dataset.layer].addTo(map);
        if (this.dataset.layer === 'satellite') {
            satLabels.addTo(map);
        } else {
            map.removeLayer(satLabels);
        }
        if (map.hasLayer(lpOverlay)) lpOverlay.bringToFront();
    });
});

// === 光害圖層開關 ===
document.getElementById('lpToggle').addEventListener('change', function () {
    if (this.checked) {
        lpOverlay.addTo(map);
        lpOverlay.setOpacity(currentOpacity);
    } else {
        map.removeLayer(lpOverlay);
    }
});


// === LP Zone 對照表（djlorenz 色區 → 顏色 + 波特爾估算）===
const LP_ZONES = [
    { zone: '0',  maxR: 0.01,   color: '#9bb8ff', bortle: 1, desc: '天空完全黑暗的觀測點' },
    { zone: '1a', maxR: 0.06,   color: '#7fc4ff', bortle: 2, desc: '典型的真正黑暗的觀測點' },
    { zone: '1b', maxR: 0.11,   color: '#a0d4ff', bortle: 2, desc: '典型的真正黑暗的觀測點' },
    { zone: '2a', maxR: 0.19,   color: '#3366cc', bortle: 3, desc: '鄉村的星空' },
    { zone: '2b', maxR: 0.33,   color: '#4488ff', bortle: 3, desc: '鄉村的星空' },
    { zone: '3a', maxR: 0.58,   color: '#00aa44', bortle: 3, desc: '鄉村的星空' },
    { zone: '3b', maxR: 1.00,   color: '#00dd55', bortle: 4, desc: '鄉村／郊區的過渡帶' },
    { zone: '4a', maxR: 1.73,   color: '#bbbb00', bortle: 4, desc: '鄉村／郊區的過渡帶' },
    { zone: '4b', maxR: 3.00,   color: '#eeee00', bortle: 5, desc: '郊區的星空' },
    { zone: '5a', maxR: 5.20,   color: '#ee8800', bortle: 5, desc: '郊區的星空' },
    { zone: '5b', maxR: 9.00,   color: '#ffaa44', bortle: 6, desc: '明亮的郊區星空' },
    { zone: '6a', maxR: 15.59,  color: '#ff4444', bortle: 6, desc: '明亮的郊區星空' },
    { zone: '6b', maxR: 27.00,  color: '#ff8888', bortle: 7, desc: '郊區／城市的過渡帶' },
    { zone: '7a', maxR: 46.77,  color: '#bbbbbb', bortle: 8, desc: '城市的星空' },
    { zone: '7b', maxR: Infinity, color: '#eeeeee', bortle: 9, desc: '市中心的星空' },
];

function ratioToZone(r) {
    return LP_ZONES.find(z => r < z.maxR) || LP_ZONES[LP_ZONES.length - 1];
}

function roundRatio(r) {
    return r < 0.1 ? r.toFixed(3) : r < 3 ? r.toFixed(2) : r.toFixed(1);
}

// 讀取 djlorenz 二進位數據磚，回傳精確亮度比值
async function getDjlorenzData(lat, lng) {
    const lonFDL = ((lng + 180) % 360 + 360) % 360;
    const latFS  = lat + 65.0;
    if (latFS < 0 || latFS > 140) return null; // 超出範圍（65°S ~ 75°N）

    const tilex = Math.floor(lonFDL / 5.0) + 1;
    const tiley = Math.floor(latFS  / 5.0) + 1;
    if (tiley < 1 || tiley > 28) return null;

    const ix = Math.round(120 * (lonFDL - 5 * (tilex - 1) + 1 / 240));
    const iy = Math.round(120 * (latFS  - 5 * (tiley - 1) + 1 / 240));

    const url = `https://djlorenz.github.io/astronomy/binary_tiles/${currentYear}/binary_tile_${tilex}_${tiley}.dat.gz`;
    try {
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const data = new Int8Array(pako.ungzip(await resp.arrayBuffer()));

        const first = 128 * Number(data[0]) + Number(data[1]);
        let change = 0;
        for (let i = 1; i < iy; i++) change += Number(data[600 * i + 1]);
        for (let i = 1; i < ix; i++) change += Number(data[600 * (iy - 1) + 1 + i]);

        const ratio = (5 / 195) * (Math.exp(0.0195 * (first + change)) - 1);
        const sqm   = 22.0 - 5.0 * Math.log(1 + ratio) / Math.log(100);
        return { ratio, sqm };
    } catch { return null; }
}

async function reverseGeocode(lat, lng) {
    try {
        const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
            { headers: { 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8' } }
        );
        const d = await r.json();
        const a = d.address || {};
        return a.city || a.town || a.village || a.suburb || a.county || d.display_name?.split(',')[0] || null;
    } catch { return null; }
}

// === 左側位置面板 ===
const locPanel = document.getElementById('loc-panel');
const locPlace = document.getElementById('loc-place');
const locBody  = document.getElementById('loc-body');
document.getElementById('loc-close').addEventListener('click', () => locPanel.classList.remove('open'));

let clickMarker = null;

map.on('click', async function (e) {
    const { lat, lng } = e.latlng;

    // 更新點擊標記位置
    if (clickMarker) {
        clickMarker.setLatLng(e.latlng);
    } else {
        clickMarker = L.marker(e.latlng, {
            icon: L.divIcon({
                className: 'click-marker',
                html: '<div class="click-pin"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            }),
            interactive: false
        }).addTo(map);
    }

    locPanel.classList.add('open');
    locPlace.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    locBody.innerHTML = '<div class="loc-loading">載入中...</div>';

    const [data, place] = await Promise.all([
        getDjlorenzData(lat, lng),
        reverseGeocode(lat, lng)
    ]);

    if (place) locPlace.textContent = place;

    if (!data) {
        locBody.innerHTML = '<div class="loc-loading">此位置超出資料範圍<br>(65°S ~ 75°N)</div>';
        return;
    }

    const z = ratioToZone(data.ratio);
    locBody.innerHTML = `
        <div class="loc-class-num" style="color:${z.color}">Class ${z.bortle}</div>
        <div class="loc-class-label" style="color:${z.color}">${z.desc}</div>
        <hr class="loc-divider">
        <div class="loc-row"><span class="loc-key">天空品質 SQM</span><span class="loc-val">${data.sqm.toFixed(2)} <small>mag/arcsec²</small></span></div>
        <div class="loc-row"><span class="loc-key">光害指數</span><span class="loc-val">${roundRatio(data.ratio)}</span></div>
        <div class="loc-row"><span class="loc-key">資料年份</span><span class="loc-val">${currentYear}</span></div>
        <div class="loc-row"><span class="loc-key">座標</span><span class="loc-val">${lat.toFixed(4)}, ${lng.toFixed(4)}</span></div>
    `;
});

// === 面板收折 ===
if (window.innerWidth <= 600) {
    document.getElementById('control-panel').classList.add('hidden');
}
document.getElementById('panel-toggle').addEventListener('click', function () {
    document.getElementById('control-panel').classList.toggle('hidden');
});

// === 生態衝擊說明 ===
function showEcoDetail(type) {
    const box = document.getElementById('eco-detail-box');
    const content = {
        birds:   '【陸域生態】候鳥依賴星光導航，城市光害會使牠們迷失方向，每年造成數百萬隻鳥類撞擊建築物死亡。',
        insects: '【生態平衡】光害干擾昆蟲的授粉行為與繁殖週期，進而引發食物鏈連鎖反應，影響農業產量。',
        human:   '【健康福祉】過度人造藍光抑制褪黑激素分泌，干擾生理時鐘，增加失眠、肥胖及心理疾病風險。'
    };
    box.style.opacity = '0';
    setTimeout(() => {
        box.style.color = '#ccc';
        box.textContent = content[type];
        box.style.opacity = '1';
    }, 250);
}
