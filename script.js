// === 啟動畫面 ===
window.addEventListener('load', () => {
    const splash = document.getElementById('splash');
    setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 800);
    }, 1700);
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
    street: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
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

let currentYear = '2024';
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
    { zone: '0',  maxR: 0.01,   color: '#9bb8ff', bortle: 1, desc: '天空完全黑暗的觀測點'   },
    { zone: '1a', maxR: 0.06,   color: '#7fc4ff', bortle: 2, desc: '典型的真正黑暗的觀測點' },
    { zone: '1b', maxR: 0.11,   color: '#a0d4ff', bortle: 2, desc: '典型的真正黑暗的觀測點' },
    { zone: '2a', maxR: 0.19,   color: '#3366cc', bortle: 3, desc: '鄉村的星空'             },
    { zone: '2b', maxR: 0.33,   color: '#4488ff', bortle: 3, desc: '鄉村的星空'             },
    { zone: '3a', maxR: 0.58,   color: '#00aa44', bortle: 3, desc: '鄉村的星空'             },
    { zone: '3b', maxR: 1.00,   color: '#00dd55', bortle: 4, desc: '鄉村／郊區的過渡帶'     },
    { zone: '4a', maxR: 1.73,   color: '#bbbb00', bortle: 4, desc: '鄉村／郊區的過渡帶'     },
    { zone: '4b', maxR: 3.00,   color: '#eeee00', bortle: 5, desc: '郊區的星空'             },
    { zone: '5a', maxR: 5.20,   color: '#ee8800', bortle: 5, desc: '郊區的星空'             },
    { zone: '5b', maxR: 9.00,   color: '#ffaa44', bortle: 6, desc: '明亮的郊區星空'         },
    { zone: '6a', maxR: 15.59,  color: '#ff4444', bortle: 6, desc: '明亮的郊區星空'         },
    { zone: '6b', maxR: 27.00,  color: '#ff8888', bortle: 7, desc: '郊區／城市的過渡帶'     },
    { zone: '7a', maxR: 46.77,  color: '#bbbbbb', bortle: 8, desc: '城市的星空'             },
    { zone: '7b', maxR: Infinity, color: '#eeeeee', bortle: 9, desc: '市中心的星空'          },
];

const BORTLE_TIPS = {
    1: '銀河可在地面投下陰影，黃道光清晰，極限星等達 7.6–8.0。',
    2: '銀河細節豐富，大氣光沿地平線隱約可見，極限星等 7.1–7.5。',
    3: '銀河結構清晰可辨，地平線有輕微光害跡象，極限星等 6.6–7.0。',
    4: '多方向可見光害，銀河精細結構模糊，極限星等 6.1–6.5。',
    5: '黃道光幾乎消失，銀河僅天頂方向可辨，極限星等 5.6–6.0。',
    6: '銀河僅天頂隱約可見，城市光害明顯，極限星等 5.1–5.5。',
    7: '銀河輪廓模糊，天空呈灰白色，極限星等約 4.5–5.0。',
    8: '天空呈橙灰色，大多數星座難以辨認，極限星等約 4.0。',
    9: '天空呈白橙色，僅剩最亮的少數星可見，極限星等低於 4.0。',
};

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

    const url = `https://djlorenz.github.io/astronomy/binary_tiles/2024/binary_tile_${tilex}_${tiley}.dat.gz`;
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
document.getElementById('loc-close').addEventListener('click', () => {
    locPanel.classList.remove('open');
    if (clickMarker) {
        const el = clickMarker.getElement();
        if (el) {
            el.style.transition = 'opacity 0.2s ease';
            el.style.opacity = '0';
            setTimeout(() => {
                if (clickMarker) { map.removeLayer(clickMarker); clickMarker = null; }
            }, 200);
        } else {
            map.removeLayer(clickMarker);
            clickMarker = null;
        }
    }
});

let clickMarker = null;

map.on('click', async function (e) {
    if (currentSiteIndex !== -1) return;
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
    locBody.innerHTML = `<div class="loc-loading">載入中...</div>`;
    renderStargazeInfo(lat, lng);

    const [data, place] = await Promise.all([
        getDjlorenzData(lat, lng),
        reverseGeocode(lat, lng)
    ]);

    if (place) locPlace.textContent = place;

    if (!data) {
        locBody.innerHTML = `<div class="loc-loading">此位置超出資料範圍<br>(65°S ~ 75°N)</div>`;
        return;
    }

    const z = ratioToZone(data.ratio);
    renderLocPanel(data, z, lat, lng);
});

// === 面板收折 ===
if (window.innerWidth <= 600) {
    document.getElementById('control-panel').classList.add('hidden');
}
document.getElementById('panel-toggle').addEventListener('click', function () {
    document.getElementById('control-panel').classList.toggle('hidden');
});

// === 暗空聖地資料（IDA 認證）===
const DARK_SITES = [
    { name: '合歡山暗空公園', ename: 'Hehuanshan Dark Sky Park',
      country: '台灣・南投縣', year: 2019,
      lat: 24.13, lng: 121.29, zoom: 10,
      desc: '台灣首座 IDA 國際暗天公園，海拔 3,422 公尺，全年皆可觀測銀河，是東亞最佳高山觀星地之一。',
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Hehuanshan%2C_Taiwan_%28Unsplash_aIiEOoEA5ps%29.jpg/500px-Hehuanshan%2C_Taiwan_%28Unsplash_aIiEOoEA5ps%29.jpg' },
    { name: '西表石垣國立公園', ename: 'Iriomote-Ishigaki National Park',
      country: '日本・沖繩縣', year: 2018,
      lat: 24.34, lng: 124.16, zoom: 9,
      desc: '日本首座 IDA 認證暗天公園，遠離都市的珊瑚礁島嶼，星空幾乎零光害，琉球群島的自然暗夜寶庫。',
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Milky_Way_-_Lake_Yunoko_-_Nikko%2C_Tochigi_-_Japan_-_28_Sept._2013.jpg/500px-Milky_Way_-_Lake_Yunoko_-_Nikko%2C_Tochigi_-_Japan_-_28_Sept._2013.jpg' },
    { name: '神津島', ename: 'Kozushima Island',
      country: '日本・東京都', year: 2020,
      lat: 34.21, lng: 139.14, zoom: 10,
      desc: '距東京約 180 公里的離島，2020 年獲 IDA 認證為暗天社區，是日本推動光害防治的先驅島嶼。',
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/The_Milky_Way_Galaxy_20200812_30615_by_Pcs34560.jpg/500px-The_Milky_Way_Galaxy_20200812_30615_by_Pcs34560.jpg' },
    { name: '死亡谷國家公園', ename: 'Death Valley National Park',
      country: '美國・加利福尼亞州', year: 2013,
      lat: 36.5, lng: -116.9, zoom: 8,
      desc: '北美最乾燥的國家公園，極低濕度帶來卓越大氣透明度，是銀河攝影的頂級聖地，2013 年獲 IDA 認證。',
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Deathvalleysky_nps_big.jpg/500px-Deathvalleysky_nps_big.jpg' },
    { name: '大峽谷國家公園', ename: 'Grand Canyon National Park',
      country: '美國・亞利桑那州', year: 2019,
      lat: 36.1, lng: -112.1, zoom: 8,
      desc: '2019 年 IDA 認證，壯闊峽谷在銀河下更顯震撼，每年舉辦「星空音樂節」，是最具代表性的暗天景點。',
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Milky_Way_over_North_Rim%2C_Grand_Canyon.jpg/500px-Milky_Way_over_North_Rim%2C_Grand_Canyon.jpg' },
    { name: '英陽螢火蟲暗天公園', ename: 'Yeongyang Firefly Dark Sky Park',
      country: '韓國・慶尚北道', year: 2015,
      lat: 36.67, lng: 129.11, zoom: 10,
      desc: '韓國首座 IDA 認證暗天公園，以豐富的螢火蟲生態著稱，夏夜銀河與螢光交相輝映，是東亞獨特的觀星體驗。',
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Night_Sky_In_Andong_Korea_%28203229719%29.jpeg/500px-Night_Sky_In_Andong_Korea_%28203229719%29.jpeg' },
    { name: '沃倫邦格國家公園', ename: 'Warrumbungle National Park',
      country: '澳大利亞・新南威爾斯州', year: 2016,
      lat: -31.3, lng: 148.97, zoom: 8,
      desc: '南半球首座 IDA 認證暗天公園（2016 年），澳大利亞最古老的火山地貌搭配璀璨南十字星，景觀壯麗。',
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Night_at_Dows_Camp.jpg/500px-Night_at_Dows_Camp.jpg' },
    { name: '凱里國際暗天保護區', ename: 'Kerry International Dark Sky Reserve',
      country: '愛爾蘭・凱里郡', year: 2014,
      lat: 51.97, lng: -9.74, zoom: 9,
      desc: '歐洲最大的 IDA 金級認證暗天保護區，愛爾蘭西南海岸的壯麗夜空，可觀測極光及銀河核心。',
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/CF_Ross_Castle_at_Night.jpg/500px-CF_Ross_Castle_at_Night.jpg' },
    { name: 'NamibRand 自然保護區', ename: 'NamibRand Nature Reserve',
      country: '納米比亞', year: 2012,
      lat: -25.0, lng: 16.0, zoom: 7,
      desc: '非洲首座 IDA 認證暗天保護區，納米比沙漠的極乾燥氣候與人煙稀少，帶來全球最純淨的星空之一。',
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Kanaan-Lodge_1901-0042.jpg/500px-Kanaan-Lodge_1901-0042.jpg' },
];

// 動態生成暗空聖地列表
const darksiteList = document.getElementById('darksite-list');
function renderDarksiteList() {
    darksiteList.innerHTML = '';
    DARK_SITES.forEach((site, i) => {
        const el = document.createElement('div');
        el.className = 'darksite-item';
        el.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="flex-shrink:0;margin-top:2px;filter:drop-shadow(0 0 3px rgba(255,255,255,0.75))">
                <path d="M7 0L8.77 5.23L14 7L8.77 8.77L7 14L5.23 8.77L0 7L5.23 5.23Z" fill="#ffffff"/>
            </svg>
            <div><div class="darksite-name">${site.name}</div><div class="darksite-loc">${site.country}</div></div>`;
        el.addEventListener('click', () => flyTo(i));
        darksiteList.appendChild(el);
    });
}
renderDarksiteList();

// === 暗空聖地：地圖標記 & 浮動面板 ===
let siteMarker = null;
let currentSiteIndex = -1;
let lastSiteIndex = -1;

// 回傳離 currentLng 最近的等效經度（處理多副本地圖）
function nearestLng(targetLng, currentLng) {
    const diff = ((targetLng - currentLng) % 360 + 540) % 360 - 180;
    return currentLng + diff;
}

function positionPanel() {
    if (!siteMarker) return;
    const panel      = document.getElementById('site-panel');
    const pt         = map.latLngToContainerPoint(siteMarker.getLatLng());
    const mapSz      = map.getSize();
    const pw         = panel.offsetWidth  || 360;
    const ph         = panel.offsetHeight || 340;
    const iconHalfW  = 75;
    const gap        = 12;

    let left = pt.x - iconHalfW - pw - gap;
    if (left < 8) left = pt.x + iconHalfW + gap;
    left = Math.max(8, Math.min(left, mapSz.x - pw - 8));

    let top = pt.y - 22 - ph / 2;
    top = Math.max(56, Math.min(top, mapSz.y - ph - 8));

    panel.style.left   = left + 'px';
    panel.style.top    = top  + 'px';
    panel.style.bottom = 'auto';
    panel.style.right  = 'auto';
}

function flyTo(index) {
    if (currentSiteIndex === index) { closeSitePanel(); return; }
    locPanel.classList.remove('open');
    if (clickMarker) { map.removeLayer(clickMarker); clickMarker = null; }
    currentSiteIndex = index;
    const site = DARK_SITES[index];
    const panel = document.getElementById('site-panel');
    const wasOpen = panel.classList.contains('open');

    const adjLng = nearestLng(site.lng, map.getCenter().lng);

    panel.classList.remove('open');
    if (siteMarker) { map.removeLayer(siteMarker); siteMarker = null; }

    const reopen = index === lastSiteIndex &&
                   map.getZoom() === site.zoom &&
                   map.getBounds().contains(L.latLng(site.lat, adjLng));

    if (reopen) {
        siteMarker = L.marker([site.lat, adjLng], {
            icon: L.divIcon({
                className: 'site-marker-icon',
                html: `<div class="site-marker-pin"></div><div class="site-marker-label">${site.name}</div>`,
                iconSize: [140, 44], iconAnchor: [70, 44]
            }), interactive: false
        }).addTo(map);
        const img = document.getElementById('site-panel-img');
        img.src = ''; img.onerror = null; img.style.display = '';
        img.parentElement.classList.remove('img-fallback');
        img.onerror = function () { this.style.display = 'none'; this.parentElement.classList.add('img-fallback'); };
        img.src = site.img;
        fillSitePanel(site);
        setTimeout(() => { positionPanel(); panel.classList.add('open'); }, 30);
        return;
    }

    map.flyTo([site.lat, adjLng], site.zoom, { duration: 1.8 });

    const fadeDone = wasOpen ? 260 : 0;
    setTimeout(() => {
        if (currentSiteIndex !== index) return;

        siteMarker = L.marker([site.lat, adjLng], {
            icon: L.divIcon({
                className: 'site-marker-icon',
                html: `<div class="site-marker-pin"></div><div class="site-marker-label">${site.name}</div>`,
                iconSize: [140, 44],
                iconAnchor: [70, 44]
            }),
            interactive: false
        }).addTo(map);

        const img = document.getElementById('site-panel-img');
        img.src = '';
        img.onerror = null;
        img.style.display = '';
        img.parentElement.classList.remove('img-fallback');
        img.onerror = function () {
            this.style.display = 'none';
            this.parentElement.classList.add('img-fallback');
        };
        img.src = site.img;
        fillSitePanel(site);
    }, fadeDone);

    map.once('moveend', () => {
        if (currentSiteIndex !== index) return;
        positionPanel();
        panel.classList.add('open');
    });
}

function closeSitePanel() {
    lastSiteIndex = currentSiteIndex;
    currentSiteIndex = -1;
    document.getElementById('site-panel').classList.remove('open');
    if (siteMarker) { map.removeLayer(siteMarker); siteMarker = null; }
}

// ============================================================
// 功能 11：今晚觀星時間
// ============================================================
function calcSunTimes(lat, lng) {
    const today = new Date();
    const jd = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12) / 86400000 + 2440587.5;
    const n   = jd - 2451545.0;

    const L   = ((280.460 + 0.9856474 * n) % 360 + 360) % 360;
    const g   = (((357.528 + 0.9856003 * n) % 360 + 360) % 360) * Math.PI / 180;
    const lam = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI / 180;

    const eps    = 23.4397 * Math.PI / 180;
    const sinDec = Math.sin(eps) * Math.sin(lam);
    const cosDec = Math.sqrt(1 - sinDec * sinDec);
    const RA     = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
    const EoT    = (L * Math.PI / 180 - RA) / (2 * Math.PI) * 24;
    const noonUTC = 12 - lng / 15 - EoT;

    const phi = lat * Math.PI / 180;
    const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);
    const utcBase = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const fmt = h => new Date(utcBase + h * 3600000)
        .toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });

    function HA(alt) {
        const c = (Math.sin(alt * Math.PI / 180) - sinPhi * sinDec) / (cosPhi * cosDec);
        if (c > 1) return null;
        if (c < -1) return false;
        return Math.acos(c) * 12 / Math.PI;
    }

    const Hs = HA(-0.833);
    if (Hs === null)  return { type: 'polar-night' };
    if (Hs === false) return { type: 'midnight-sun' };

    const Hc = HA(-6), Hn = HA(-12), Ha = HA(-18);
    return {
        type:     'normal',
        sunset:   fmt(noonUTC + Hs),
        civilEnd: (Hc && Hc !== false) ? fmt(noonUTC + Hc) : null,
        nautEnd:  (Hn && Hn !== false) ? fmt(noonUTC + Hn) : null,
        astroEnd: (Ha && Ha !== false) ? fmt(noonUTC + Ha) : null,
    };
}

let lastStargazeLat = 24.99, lastStargazeLng = 121.31;

function renderStargazeInfo(lat, lng) {
    lastStargazeLat = lat; lastStargazeLng = lng;
    document.getElementById('stargazeLoc').textContent = `${lat.toFixed(1)}°, ${lng.toFixed(1)}°`;
    const el  = document.getElementById('stargazeInfo');
    const sun = calcSunTimes(lat, lng);

    if (sun.type === 'polar-night') { el.className = 'stargaze-loading'; el.innerHTML = '極夜 — 全天可觀星！'; return; }
    if (sun.type === 'midnight-sun') { el.className = 'stargaze-loading'; el.innerHTML = '極晝 — 今夜無天文黑夜'; return; }

    el.className = 'stargaze-info';
    const best = sun.astroEnd || sun.nautEnd || sun.civilEnd;
    el.innerHTML = `
        <div class="stargaze-row"><span class="stargaze-key">日落</span><span class="stargaze-val">${sun.sunset}</span></div>
        ${sun.civilEnd ? `<div class="stargaze-row"><span class="stargaze-key">民用暮光終</span><span class="stargaze-val">${sun.civilEnd}</span></div>` : ''}
        ${sun.nautEnd  ? `<div class="stargaze-row"><span class="stargaze-key">航海暮光終</span><span class="stargaze-val">${sun.nautEnd}</span></div>` : ''}
        <div class="stargaze-row" style="border-bottom:none">
            <span class="stargaze-key">天文黑夜始</span>
            <span class="stargaze-val" style="color:#fff">${sun.astroEnd ?? '不發生'}</span>
        </div>
        ${best ? `<div class="stargaze-best">⭐ 建議從 <strong>${best}</strong> 開始觀星</div>` : ''}
    `;
}

// 頁面載入：預設桃園
renderStargazeInfo(24.99, 121.31);

// ============================================================
// 功能 17：年份光害對比動畫
// ============================================================
// Panel 即時跟著 marker 移動
map.on('move', function () {
    if (!siteMarker || currentSiteIndex === -1) return;
    if (document.getElementById('site-panel').classList.contains('open')) positionPanel();
});

// 拖動結束後，marker 已離開視窗則自動取消選擇
map.on('moveend', function () {
    if (!siteMarker || currentSiteIndex === -1) return;
    if (!map.getBounds().contains(siteMarker.getLatLng())) closeSitePanel();
});

function renderLocPanel(data, z, lat, lng) {
    const tip = BORTLE_TIPS[z.bortle] || '';
    locBody.innerHTML = `
        <div class="loc-class-num" style="color:${z.color}">Class ${z.bortle}</div>
        <div class="loc-class-label" style="color:${z.color}">${z.desc}</div>
        <div class="loc-class-tip">${tip}</div>
        <hr class="loc-divider">
        <div class="loc-row"><span class="loc-key">天空品質 SQM</span><span class="loc-val">${data.sqm.toFixed(2)} <small>mag/arcsec²</small></span></div>
        <div class="loc-row"><span class="loc-key">光害指數</span><span class="loc-val">${roundRatio(data.ratio)}</span></div>
        <div class="loc-row"><span class="loc-key">資料年份</span><span class="loc-val">${currentYear}</span></div>
        <div class="loc-row"><span class="loc-key">座標</span><span class="loc-val">${lat.toFixed(4)}, ${lng.toFixed(4)}</span></div>
    `;
}

function fillSitePanel(site) {
    document.getElementById('site-panel-year').textContent    = `IDA 認證 ${site.year}`;
    document.getElementById('site-panel-name').textContent    = site.name;
    document.getElementById('site-panel-ename').textContent   = site.ename;
    document.getElementById('site-panel-country').textContent = site.country;
    document.getElementById('site-panel-desc').textContent    = site.desc;

    const bortleEl = document.getElementById('site-panel-bortle');
    bortleEl.innerHTML = '<div class="site-bortle-loading">載入光害資料…</div>';

    const snapIndex = currentSiteIndex;
    getDjlorenzData(site.lat, site.lng).then(data => {
        if (currentSiteIndex !== snapIndex) return; // 已切換到別的聖地
        if (!data) { bortleEl.innerHTML = ''; return; }
        const z = ratioToZone(data.ratio);
        bortleEl.innerHTML = `
            <hr class="site-bortle-divider">
            <div class="site-bortle-row">
                <span class="site-bortle-dot" style="background:${z.color}"></span>
                <span class="site-bortle-class" style="color:${z.color}">Bortle ${z.bortle}</span>
                <span class="site-bortle-desc">${z.desc}</span>
            </div>
            <div class="site-bortle-sqm">SQM ${data.sqm.toFixed(2)} mag/arcsec²</div>
        `;
    });
}

document.querySelectorAll('#yearBtns .layer-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('#yearBtns .layer-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentYear = this.dataset.year;
        const visible = map.hasLayer(lpOverlay);
        map.removeLayer(lpOverlay);
        lpOverlay = createLpLayer(currentYear, currentOpacity);
        if (visible) lpOverlay.addTo(map);
    });
});
