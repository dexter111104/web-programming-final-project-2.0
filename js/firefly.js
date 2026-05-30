/**
 * firefly.js
 * 地圖小動物：一隻會反應光害的螢火蟲。
 *
 *  - 平常在目前視野內隨意飛行（緩動到隨機目標點，到達後再換點）。
 *  - 發光亮度反映牠腳下的波特爾等級：暗空聖地（Bortle 1–2）亮起脈動，
 *    城市（Bortle 8–9）幾乎熄滅。
 *  - 點擊牠 → 隨機飛往一個暗空聖地並開啟資訊面板（觀星嚮導）。
 */

import { map }              from './map.js';
import { getDjlorenzData,
         ratioToZone }      from './lpData.js';
import { flyToRandomSite,
         nearestLng }       from './darkSites.js';

// ── 參數 ──────────────────────────────────────────────────────
// 用「螢幕像素」空間做漫遊轉向，這樣不論縮放層級，視覺速度與轉彎感都一致。
const SPEED        = 0.42;   // 每幀前進的像素數（越小越慢、越悠閒）
const TURN_DRIFT   = 0.05;   // 每幀航向隨機漂移量（弧度），製造漫無目的感
const HEADING_EASE = 0.035;  // 實際航向追上目標航向的速度（越小轉得越柔）
const ROT_EASE     = 0.10;   // 身體外觀旋轉的平滑速度
const EDGE_MARGIN  = 64;     // 距離視窗邊緣多少像素內開始往中央轉回
const GLOW_EVERY   = 800;    // 光害查詢節流間隔（毫秒）

// ── 狀態 ──────────────────────────────────────────────────────
let marker      = null;      // Leaflet marker
let fxEl        = null;      // .firefly 容器（--rot 設在這裡，讓身體與尾部一起轉）
let glowEl      = null;      // 內層發光元素
let pos         = null;      // 目前座標 {lat, lng}
let px          = null;      // 目前螢幕像素位置 {x, y}（容器座標）
let heading     = 0;         // 目前航向（弧度，螢幕座標：x 右、y 下）
let targetHead  = 0;         // 目標航向（被隨機漂移與邊緣轉向牽引）
let bodyDeg     = 0;         // 身體外觀目前角度（度，平滑逼近航向）
let paused      = false;     // 滑鼠移入時暫停飛行，方便點擊
let lastGlowAt  = 0;         // 上次查詢光害的時間戳
let glow        = 0.6;       // 目前發光強度 0–1（會緩動逼近 glowTarget）
let glowTarget  = 0.6;       // 依波特爾等級得到的目標強度

// ── 工具 ──────────────────────────────────────────────────────
const normLng = lng => ((lng + 180) % 360 + 360) % 360 - 180;

/** 把角度差收斂到 (-π, π]，用來做最短路徑的角度緩動 */
function angleDelta(from, to) {
    let d = (to - from) % (Math.PI * 2);
    if (d >  Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
}

/** 在目前視窗內、稍微內縮的範圍隨機取一個像素點 */
function randomPointInView() {
    const s = map.getSize();
    return {
        x: EDGE_MARGIN + Math.random() * Math.max(1, s.x - 2 * EDGE_MARGIN),
        y: EDGE_MARGIN + Math.random() * Math.max(1, s.y - 2 * EDGE_MARGIN),
    };
}

/** 依波特爾等級（1 暗 → 9 亮城市）算出發光目標強度 */
function bortleToGlow(bortle) {
    // Bortle 1 → 1.0；Bortle 9 → 0.05
    return Math.max(0.05, Math.min(1, (9 - bortle) / 8));
}

/** 節流查詢腳下光害，更新 glowTarget */
async function refreshGlow(now) {
    if (now - lastGlowAt < GLOW_EVERY) return;
    lastGlowAt = now;
    const data = await getDjlorenzData(pos.lat, normLng(pos.lng));
    if (data && typeof data.ratio === 'number') {
        glowTarget = bortleToGlow(ratioToZone(data.ratio).bortle);
    } else {
        glowTarget = 0.5; // 超出資料範圍（如極區、外海）給中等亮度
    }
}

/** 每幀更新 */
function frame(ts) {
    if (!paused) {
        const s = map.getSize();
        const z = map.getZoom();

        // 多副本地圖（無限橫向捲動）：把經度重新歸位到「離目前視野中心最近的等效副本」，
        // 這樣捲到左右任一副本時，螢火蟲都會跟著出現在當前畫面，不會被留在別的副本裡找不到。
        pos = L.latLng(pos.lat, nearestLng(pos.lng, map.getCenter().lng));

        // 螢火蟲的「真身」是經緯度（pos）。每幀依目前地圖狀態運算，這樣縮放/
        // 平移時牠會釘在地圖上、跟著地圖跑，而不是釘在螢幕固定點。
        // 注意：邊緣偵測用 latLngToContainerPoint（會四捨五入到整數像素，當門檻判斷沒差），
        // 但「移動」必須用 project/unproject（不四捨五入），否則 0.42px 的小步會被
        // 每幀的取整抹掉、原地不動。
        const cp = map.latLngToContainerPoint(pos);   // 螢幕容器座標（供邊緣判斷）

        // 1) 漫無目的：目標航向做小幅隨機漂移
        targetHead += (Math.random() - 0.5) * 2 * TURN_DRIFT;

        // 2) 邊緣轉向：靠近（或飛出）視窗邊界時，把目標航向拉回畫面中央
        let steerX = 0, steerY = 0;
        if (cp.x < EDGE_MARGIN)          steerX =  1;
        else if (cp.x > s.x - EDGE_MARGIN) steerX = -1;
        if (cp.y < EDGE_MARGIN)          steerY =  1;
        else if (cp.y > s.y - EDGE_MARGIN) steerY = -1;
        if (steerX || steerY) {
            const want = Math.atan2(steerY, steerX);
            targetHead += angleDelta(targetHead, want) * 0.18;
        }

        // 3) 實際航向柔順地追上目標航向（自然的弧線轉彎）
        heading += angleDelta(heading, targetHead) * HEADING_EASE;

        // 4) 在投影像素空間前進（不取整，視覺速度不受縮放影響），再反投影回經緯度
        const vx = Math.cos(heading) * SPEED;
        const vy = Math.sin(heading) * SPEED;
        const lp = map.project(pos, z);               // 未取整的投影座標
        pos = map.unproject(lp.add([vx, vy]), z);
        marker.setLatLng(pos);

        // 5) 身體轉向：SVG 預設朝上(-y)，旋轉到行進方向（平滑收斂）
        const targetDeg = Math.atan2(vx, -vy) * 180 / Math.PI;
        bodyDeg += angleDelta(bodyDeg * Math.PI / 180, targetDeg * Math.PI / 180) * 180 / Math.PI * ROT_EASE;
        if (fxEl) fxEl.style.setProperty('--rot', bodyDeg.toFixed(1) + 'deg');

        refreshGlow(ts);
    }

    // 發光強度緩動 + 套用到 CSS
    glow += (glowTarget - glow) * 0.05;
    if (glowEl) glowEl.style.setProperty('--glow', glow.toFixed(3));

    requestAnimationFrame(frame);
}

/** 初始化螢火蟲 */
function initFirefly() {
    px         = randomPointInView();
    pos        = map.containerPointToLatLng(L.point(px.x, px.y));
    heading    = Math.random() * Math.PI * 2;
    targetHead = heading;
    bodyDeg    = Math.atan2(Math.cos(heading), -Math.sin(heading)) * 180 / Math.PI;

    marker = L.marker([pos.lat, pos.lng], {
        icon: L.divIcon({
            className: 'firefly-icon',
            html: `<div class="firefly">
                <svg class="firefly-body" viewBox="0 0 9 11" shape-rendering="crispEdges" aria-hidden="true">
                    <!-- 觸角 -->
                    <rect x="2" y="0" width="1" height="1" fill="#1c1a17"/>
                    <rect x="6" y="0" width="1" height="1" fill="#1c1a17"/>
                    <rect x="3" y="1" width="1" height="1" fill="#1c1a17"/>
                    <rect x="5" y="1" width="1" height="1" fill="#1c1a17"/>
                    <!-- 頭 -->
                    <rect x="4" y="1" width="1" height="1" fill="#1c1a17"/>
                    <rect x="3" y="2" width="3" height="1" fill="#1c1a17"/>
                    <!-- 前胸盾（橘色） -->
                    <rect x="3" y="3" width="3" height="1" fill="#f0a64e"/>
                    <rect x="2" y="4" width="5" height="1" fill="#f0a64e"/>
                    <rect x="4" y="3" width="1" height="1" fill="#c8431f"/>
                    <!-- 腳 -->
                    <rect x="1" y="4" width="1" height="1" fill="#1c1a17"/>
                    <rect x="1" y="5" width="1" height="1" fill="#1c1a17"/>
                    <rect x="1" y="6" width="1" height="1" fill="#1c1a17"/>
                    <rect x="7" y="4" width="1" height="1" fill="#1c1a17"/>
                    <rect x="7" y="5" width="1" height="1" fill="#1c1a17"/>
                    <rect x="7" y="6" width="1" height="1" fill="#1c1a17"/>
                    <!-- 翅鞘（深色，兩側會振翅；中央接縫較亮且固定） -->
                    <g class="firefly-wings">
                        <rect x="2" y="5" width="2" height="1" fill="#33312c"/>
                        <rect x="5" y="5" width="2" height="1" fill="#33312c"/>
                        <rect x="2" y="6" width="2" height="1" fill="#33312c"/>
                        <rect x="5" y="6" width="2" height="1" fill="#33312c"/>
                        <rect x="2" y="7" width="2" height="1" fill="#33312c"/>
                        <rect x="5" y="7" width="2" height="1" fill="#33312c"/>
                        <rect x="3" y="8" width="1" height="1" fill="#33312c"/>
                        <rect x="5" y="8" width="1" height="1" fill="#33312c"/>
                    </g>
                    <rect x="4" y="5" width="1" height="1" fill="#45423b"/>
                    <rect x="4" y="6" width="1" height="1" fill="#45423b"/>
                    <rect x="4" y="7" width="1" height="1" fill="#45423b"/>
                    <rect x="4" y="8" width="1" height="1" fill="#45423b"/>
                    <!-- 腹部底色（發光層會疊在這上面） -->
                    <rect x="3" y="9" width="3" height="1" fill="#7c8a3e"/>
                    <rect x="4" y="10" width="1" height="1" fill="#7c8a3e"/>
                </svg>
                <span class="firefly-tail"><span class="firefly-glow"></span></span>
            </div>`,
            iconSize:  [30, 30],
            iconAnchor:[15, 15],
        }),
        interactive: true,
        keyboard:    false,
        zIndexOffset: 1500,
    }).addTo(map);

    fxEl   = marker.getElement()?.querySelector('.firefly') ?? null;
    glowEl = marker.getElement()?.querySelector('.firefly-glow') ?? null;

    // 滑鼠移入暫停飛行，方便瞄準點擊；移出恢復
    const el = marker.getElement();
    if (el) {
        el.addEventListener('mouseenter', () => { paused = true;  el.classList.add('firefly-hover'); });
        el.addEventListener('mouseleave', () => { paused = false; el.classList.remove('firefly-hover'); });
    }

    // 點擊螢火蟲 → 隨機飛往一個暗空聖地
    marker.on('click', () => {
        paused = false;
        flyToRandomSite();
    });

    requestAnimationFrame(frame);
}

// 地圖容器就緒後再啟動
if (map) initFirefly();
