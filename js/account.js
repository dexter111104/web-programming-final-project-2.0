/**
 * account.js
 * 前端：登入／註冊、我的收藏、觀星筆記（串接後端 /api，session cookie 驗證）
 */

import { map }                         from './map.js';
import { getActiveSite, flyTo, nearestLng } from './darkSites.js';
import { getActiveLoc, queryLocation } from './locPanel.js';

// ── API 小幫手：自動帶 cookie、解析 JSON、拋出後端錯誤訊息 ──────
async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`/api${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body:    body ? JSON.stringify(body) : undefined,
        credentials: 'same-origin',
    });
    let data = null;
    try { data = await res.json(); } catch { /* 無內容 */ }
    if (!res.ok) throw new Error((data && data.error) || `錯誤 ${res.status}`);
    return data;
}

let currentUser = null;
let authMode    = 'login'; // 'login' | 'register'

// ════════════════ 建立 UI 骨架 ════════════════

// 帳號按鈕（右上，☰ 左側）
const accountBtn = document.createElement('button');
accountBtn.id = 'account-btn';
accountBtn.className = 'account-btn';
document.body.appendChild(accountBtn);

// 登入／註冊視窗
const authModal = document.createElement('div');
authModal.id = 'auth-modal';
authModal.className = 'modal-overlay hidden';
authModal.innerHTML = `
    <div class="modal-box">
        <button class="modal-close" data-action="close-auth" aria-label="關閉">✕</button>
        <h2 class="modal-title" id="auth-title">登入</h2>
        <form id="auth-form" class="auth-form" autocomplete="on">
            <input id="auth-username" class="auth-input" type="text"
                   placeholder="使用者名稱" autocomplete="username" maxlength="20">
            <input id="auth-password" class="auth-input" type="password"
                   placeholder="密碼（至少 6 字元）" autocomplete="current-password">
            <div id="auth-error" class="auth-error"></div>
            <button type="submit" class="auth-submit" id="auth-submit">登入</button>
        </form>
        <div class="auth-switch">
            <span id="auth-switch-text">還沒有帳號？</span>
            <a href="#" id="auth-switch-link" data-action="switch-mode">註冊</a>
        </div>
    </div>`;
document.body.appendChild(authModal);

// 我的收藏面板
const favPanel = document.createElement('div');
favPanel.id = 'fav-panel';
favPanel.className = 'fav-panel hidden';
favPanel.innerHTML = `
    <div class="fav-panel-header">
        <span class="fav-panel-title">⭐ 我的收藏</span>
        <span class="fav-user">
            <span id="fav-username"></span>
            <button class="fav-logout" data-action="logout">登出</button>
        </span>
        <button class="fav-panel-close" data-action="close-fav" aria-label="關閉">✕</button>
    </div>
    <div id="fav-list" class="fav-list"></div>`;
document.body.appendChild(favPanel);

// 「加入收藏」按鈕 —— 暗空聖地面板（底部）
const favBtnSite = document.createElement('button');
favBtnSite.className = 'fav-add-btn';
favBtnSite.dataset.action = 'add-fav-site';
favBtnSite.textContent = '☆ 加入收藏';
document.querySelector('.site-panel-body')?.appendChild(favBtnSite);

// 「加入收藏」按鈕 —— 位置面板（標題列，關閉鈕左側）
const favBtnLoc = document.createElement('button');
favBtnLoc.className = 'fav-add-btn-loc';
favBtnLoc.dataset.action = 'add-fav-loc';
favBtnLoc.title = '加入收藏';
favBtnLoc.textContent = '☆';
const locHeader = document.querySelector('#loc-panel .loc-header');
locHeader?.insertBefore(favBtnLoc, document.getElementById('loc-close'));

// ════════════════ 工具函式 ════════════════

/** 跳脫 HTML，避免使用者輸入破壞版面或注入 */
function esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Date → datetime-local 輸入值（YYYY-MM-DDTHH:MM，當地時間） */
function toLocalInput(d = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 顯示中央 toast 提示 */
function toast(msg) {
    document.querySelectorAll('.app-toast').forEach(el => el.remove());
    const el = document.createElement('div');
    el.className = 'geo-toast app-toast';
    el.innerHTML = `<span>${esc(msg)}</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 350); }, 2600);
}

// ════════════════ 驗證 UI ════════════════

function refreshAuthUI() {
    if (currentUser) {
        accountBtn.textContent = `⭐ ${currentUser.username}`;
        accountBtn.classList.add('logged-in');
        document.getElementById('fav-username').textContent = currentUser.username;
    } else {
        accountBtn.textContent = '登入 / 註冊';
        accountBtn.classList.remove('logged-in');
        closeFav();
    }
}

function openAuth() {
    setAuthMode('login');
    document.getElementById('auth-error').textContent = '';
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-password').value = '';
    authModal.classList.remove('hidden');
    document.getElementById('auth-username').focus();
}
function closeAuth() { authModal.classList.add('hidden'); }

function setAuthMode(mode) {
    authMode = mode;
    const isLogin = mode === 'login';
    document.getElementById('auth-title').textContent       = isLogin ? '登入' : '註冊';
    document.getElementById('auth-submit').textContent      = isLogin ? '登入' : '建立帳號';
    document.getElementById('auth-switch-text').textContent = isLogin ? '還沒有帳號？' : '已經有帳號？';
    document.getElementById('auth-switch-link').textContent = isLogin ? '註冊' : '登入';
    document.getElementById('auth-password').autocomplete    = isLogin ? 'current-password' : 'new-password';
    document.getElementById('auth-error').textContent = '';
}

async function submitAuth(e) {
    e.preventDefault();
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    const errEl    = document.getElementById('auth-error');
    const submitBtn = document.getElementById('auth-submit');
    errEl.textContent = '';
    submitBtn.disabled = true;
    try {
        const path = authMode === 'login' ? '/auth/login' : '/auth/register';
        const { user } = await api(path, { method: 'POST', body: { username, password } });
        currentUser = user;
        refreshAuthUI();
        closeAuth();
        toast(authMode === 'login' ? `歡迎回來，${user.username}` : `帳號建立成功，歡迎 ${user.username}`);
        openFav();
    } catch (err) {
        errEl.textContent = err.message;
    } finally {
        submitBtn.disabled = false;
    }
}

async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* 忽略 */ }
    currentUser = null;
    refreshAuthUI();
    toast('已登出');
}

// ════════════════ 我的收藏 ════════════════

function openFav()  { favPanel.classList.remove('hidden'); renderFavorites(); }
function closeFav() { favPanel.classList.add('hidden'); }

async function renderFavorites() {
    const listEl = document.getElementById('fav-list');
    listEl.innerHTML = `<div class="fav-empty">載入中…</div>`;
    try {
        const { favorites } = await api('/favorites');
        if (!favorites.length) {
            listEl.innerHTML = `<div class="fav-empty">尚無收藏。<br>點地圖或暗空聖地，按「加入收藏」開始吧！</div>`;
            return;
        }
        listEl.innerHTML = favorites.map(f => `
            <div class="fav-item" data-fav-id="${f.id}">
                <div class="fav-item-head">
                    <div class="fav-item-main" data-action="toggle-notes" data-fav-id="${f.id}">
                        <div class="fav-item-name">${esc(f.name)}</div>
                        <div class="fav-item-meta">${f.lat.toFixed(2)}°, ${f.lng.toFixed(2)}° · 筆記 ${f.note_count}</div>
                    </div>
                    <div class="fav-item-actions">
                        <button data-action="fly"      data-fav-id="${f.id}" title="在地圖上顯示">📍</button>
                        <button data-action="rename"   data-fav-id="${f.id}" title="改名">✎</button>
                        <button data-action="del-fav"  data-fav-id="${f.id}" title="刪除收藏">🗑</button>
                    </div>
                </div>
                <div class="fav-notes hidden" data-notes-for="${f.id}"></div>
            </div>`).join('');
    } catch (err) {
        listEl.innerHTML = `<div class="fav-empty">載入失敗：${esc(err.message)}</div>`;
    }
}

/** 展開／收合某收藏的筆記區（首次展開時載入） */
async function toggleNotes(favId) {
    const box = favPanel.querySelector(`.fav-notes[data-notes-for="${favId}"]`);
    if (!box) return;
    if (!box.classList.contains('hidden')) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    await renderNotes(favId, box);
}

async function renderNotes(favId, box) {
    box.innerHTML = `<div class="note-loading">載入筆記…</div>`;
    try {
        const { notes } = await api(`/favorites/${favId}/notes`);
        box.innerHTML = `
            <form class="note-form" data-fav-id="${favId}">
                <textarea class="note-input" placeholder="寫下這次的觀星筆記…" rows="2"></textarea>
                <div class="note-form-row">
                    <input type="datetime-local" class="note-date" value="${toLocalInput()}">
                    <button type="submit" class="note-add">+ 新增筆記</button>
                </div>
            </form>
            <div class="note-list">
                ${notes.length ? notes.map(noteCardHTML).join('')
                               : `<div class="note-empty">還沒有筆記</div>`}
            </div>`;
    } catch (err) {
        box.innerHTML = `<div class="note-empty">載入失敗：${esc(err.message)}</div>`;
    }
}

function noteCardHTML(n) {
    const when = n.observed_at ? esc(n.observed_at.replace('T', ' ')) : '未填觀測時間';
    return `
        <div class="note-card" data-note-id="${n.id}">
            <div class="note-body">${esc(n.body)}</div>
            <div class="note-foot">
                <span class="note-when">🕒 ${when}</span>
                <span class="note-actions">
                    <button data-action="edit-note" data-note-id="${n.id}">編輯</button>
                    <button data-action="del-note"  data-note-id="${n.id}">刪除</button>
                </span>
            </div>
        </div>`;
}

/** 將某筆記卡片切換為行內編輯表單 */
function startEditNote(noteId) {
    const card = favPanel.querySelector(`.note-card[data-note-id="${noteId}"]`);
    if (!card) return;
    const body = card.querySelector('.note-body').textContent;
    const whenRaw = card.querySelector('.note-when').textContent.replace('🕒 ', '').trim();
    const dtVal = whenRaw === '未填觀測時間' ? '' : whenRaw.replace(' ', 'T').slice(0, 16);
    card.innerHTML = `
        <form class="note-edit-form" data-note-id="${noteId}">
            <textarea class="note-input" rows="2">${esc(body)}</textarea>
            <div class="note-form-row">
                <input type="datetime-local" class="note-date" value="${esc(dtVal)}">
                <span>
                    <button type="submit" class="note-add">儲存</button>
                    <button type="button" class="note-cancel" data-action="cancel-edit" data-note-id="${noteId}">取消</button>
                </span>
            </div>
        </form>`;
}

// ── 收藏／筆記操作 ────────────────────────────────────────────

async function addFavorite(place) {
    if (!place) { toast('請先選擇一個地點'); return; }
    if (!currentUser) { toast('請先登入才能收藏'); openAuth(); return; }
    try {
        await api('/favorites', { method: 'POST', body: place });
        toast(`已收藏「${place.name}」`);
        if (!favPanel.classList.contains('hidden')) renderFavorites();
    } catch (err) {
        toast(`收藏失敗：${err.message}`);
    }
}

async function flyToFavorite(fav) {
    closeFav();
    if (Number.isInteger(fav.site_index)) {
        flyTo(fav.site_index); // 走暗空聖地的完整面板邏輯
        return;
    }
    const lng = nearestLng(fav.lng, map.getCenter().lng);
    map.flyTo([fav.lat, lng], 10, { duration: 1.5 });
    map.once('moveend', () => queryLocation(fav.lat, lng));
}

async function getFavById(id) {
    const { favorites } = await api('/favorites');
    return favorites.find(f => f.id === id) || null;
}

// ════════════════ 事件繫結 ════════════════

accountBtn.addEventListener('click', () => {
    if (currentUser) {
        favPanel.classList.contains('hidden') ? openFav() : closeFav();
    } else {
        openAuth();
    }
});

document.getElementById('auth-form').addEventListener('submit', submitAuth);

// 視窗 + 面板的委派點擊處理
document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const action = t.dataset.action;
    const favId  = t.dataset.favId  ? Number(t.dataset.favId)  : null;
    const noteId = t.dataset.noteId ? Number(t.dataset.noteId) : null;

    switch (action) {
        case 'close-auth':  closeAuth(); break;
        case 'switch-mode': e.preventDefault(); setAuthMode(authMode === 'login' ? 'register' : 'login'); break;
        case 'close-fav':   closeFav(); break;
        case 'logout':      logout(); break;
        case 'add-fav-site': addFavorite(getActiveSite()); break;
        case 'add-fav-loc':  addFavorite(getActiveLoc()); break;
        case 'toggle-notes': toggleNotes(favId); break;
        case 'fly':          getFavById(favId).then(f => f && flyToFavorite(f)); break;
        case 'rename':       renameFavorite(favId); break;
        case 'del-fav':      deleteFavorite(favId); break;
        case 'edit-note':    startEditNote(noteId); break;
        case 'cancel-edit':  reRenderNoteList(noteId); break;
        case 'del-note':     deleteNote(noteId); break;
    }
});

// 點視窗背景關閉登入框
authModal.addEventListener('click', (e) => { if (e.target === authModal) closeAuth(); });

// 新增 / 編輯筆記表單送出（委派 submit）
document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (form.classList.contains('note-form')) {
        e.preventDefault();
        const favId = Number(form.dataset.favId);
        const body  = form.querySelector('.note-input').value.trim();
        const observedAt = form.querySelector('.note-date').value || null;
        if (!body) { toast('筆記內容不可空白'); return; }
        try {
            await api(`/favorites/${favId}/notes`, { method: 'POST', body: { body, observedAt } });
            const box = favPanel.querySelector(`.fav-notes[data-notes-for="${favId}"]`);
            await renderNotes(favId, box);
            bumpNoteCount(favId, +1);
        } catch (err) { toast(`新增失敗：${err.message}`); }
    } else if (form.classList.contains('note-edit-form')) {
        e.preventDefault();
        const noteId = Number(form.dataset.noteId);
        const body   = form.querySelector('.note-input').value.trim();
        const observedAt = form.querySelector('.note-date').value || null;
        if (!body) { toast('筆記內容不可空白'); return; }
        try {
            await api(`/notes/${noteId}`, { method: 'PATCH', body: { body, observedAt } });
            reRenderNoteList(noteId);
        } catch (err) { toast(`儲存失敗：${err.message}`); }
    }
});

async function renameFavorite(favId) {
    const fav = await getFavById(favId);
    if (!fav) return;
    const name = prompt('收藏名稱：', fav.name);
    if (name == null || !name.trim()) return;
    try {
        await api(`/favorites/${favId}`, { method: 'PATCH', body: { name: name.trim() } });
        renderFavorites();
    } catch (err) { toast(`改名失敗：${err.message}`); }
}

async function deleteFavorite(favId) {
    if (!confirm('確定要刪除這個收藏？其筆記也會一併刪除。')) return;
    try {
        await api(`/favorites/${favId}`, { method: 'DELETE' });
        renderFavorites();
    } catch (err) { toast(`刪除失敗：${err.message}`); }
}

async function deleteNote(noteId) {
    if (!confirm('確定要刪除這則筆記？')) return;
    const card  = favPanel.querySelector(`.note-card[data-note-id="${noteId}"]`);
    const favId = Number(card?.closest('.fav-notes')?.dataset.notesFor);
    try {
        await api(`/notes/${noteId}`, { method: 'DELETE' });
        if (Number.isInteger(favId)) {
            const box = favPanel.querySelector(`.fav-notes[data-notes-for="${favId}"]`);
            await renderNotes(favId, box);
            bumpNoteCount(favId, -1);
        }
    } catch (err) { toast(`刪除失敗：${err.message}`); }
}

/** 取消編輯或編輯完成後，重新載入該筆記所屬收藏的筆記清單 */
function reRenderNoteList(noteId) {
    const box = favPanel.querySelector(`.note-card[data-note-id="${noteId}"]`)?.closest('.fav-notes')
             || favPanel.querySelector(`.note-edit-form[data-note-id="${noteId}"]`)?.closest('.fav-notes');
    if (!box) return;
    const favId = Number(box.dataset.notesFor);
    renderNotes(favId, box);
}

/** 即時更新收藏列上的「筆記 N」計數 */
function bumpNoteCount(favId, delta) {
    const meta = favPanel.querySelector(`.fav-item[data-fav-id="${favId}"] .fav-item-meta`);
    if (!meta) return;
    meta.textContent = meta.textContent.replace(/筆記 \d+/, m =>
        `筆記 ${Math.max(0, parseInt(m.match(/\d+/)[0], 10) + delta)}`);
}

// ════════════════ 啟動：還原登入狀態 ════════════════
(async () => {
    try {
        const { user } = await api('/auth/me');
        currentUser = user;
    } catch { /* 未登入 */ }
    refreshAuthUI();
})();
