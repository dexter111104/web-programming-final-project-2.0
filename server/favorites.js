/**
 * favorites.js
 * 收藏地點與觀星筆記的 CRUD API（全部需登入，且僅能存取本人資料）
 */

import { Router } from 'express';
import db from './db.js';
import { requireAuth } from './auth.js';

const router = Router();
router.use(requireAuth); // 此路由下所有端點皆需登入

// ── 預備語句：收藏 ────────────────────────────────────────────
const listFavs   = db.prepare('SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC');
const getFav     = db.prepare('SELECT * FROM favorites WHERE id = ? AND user_id = ?');
const insertFav  = db.prepare('INSERT INTO favorites (user_id, name, lat, lng, site_index) VALUES (?, ?, ?, ?, ?)');
const renameFav  = db.prepare('UPDATE favorites SET name = ? WHERE id = ? AND user_id = ?');
const deleteFav  = db.prepare('DELETE FROM favorites WHERE id = ? AND user_id = ?');

// ── 預備語句：筆記 ────────────────────────────────────────────
const listNotes  = db.prepare('SELECT * FROM notes WHERE favorite_id = ? ORDER BY COALESCE(observed_at, created_at) DESC');
const getNote    = db.prepare(`
    SELECT n.* FROM notes n
    JOIN favorites f ON f.id = n.favorite_id
    WHERE n.id = ? AND f.user_id = ?`);
const insertNote = db.prepare('INSERT INTO notes (favorite_id, body, observed_at) VALUES (?, ?, ?)');
const updateNote = db.prepare(`UPDATE notes SET body = ?, observed_at = ?, updated_at = datetime('now') WHERE id = ?`);
const deleteNote = db.prepare('DELETE FROM notes WHERE id = ?');

// ════════════════ 收藏地點 ════════════════

/** 列出本人所有收藏（含筆記數） */
router.get('/favorites', (req, res) => {
    const favs = listFavs.all(req.user.id);
    const countStmt = db.prepare('SELECT COUNT(*) AS c FROM notes WHERE favorite_id = ?');
    for (const f of favs) f.note_count = countStmt.get(f.id).c;
    res.json({ favorites: favs });
});

/** 新增收藏 */
router.post('/favorites', (req, res) => {
    const { name, lat, lng, siteIndex } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: '請提供地點名稱' });
    if (!isFinite(lat) || !isFinite(lng))         return res.status(400).json({ error: '座標無效' });

    const info = insertFav.run(
        req.user.id, name.trim(), Number(lat), Number(lng),
        Number.isInteger(siteIndex) ? siteIndex : null
    );
    res.status(201).json({ favorite: getFav.get(Number(info.lastInsertRowid), req.user.id) });
});

/** 重新命名收藏 */
router.patch('/favorites/:id', (req, res) => {
    const fav = getFav.get(Number(req.params.id), req.user.id);
    if (!fav) return res.status(404).json({ error: '找不到收藏' });

    const { name } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: '請提供地點名稱' });

    renameFav.run(name.trim(), fav.id, req.user.id);
    res.json({ favorite: getFav.get(fav.id, req.user.id) });
});

/** 刪除收藏（連同其筆記，由外鍵 CASCADE 處理） */
router.delete('/favorites/:id', (req, res) => {
    const fav = getFav.get(Number(req.params.id), req.user.id);
    if (!fav) return res.status(404).json({ error: '找不到收藏' });
    deleteFav.run(fav.id, req.user.id);
    res.json({ ok: true });
});

// ════════════════ 觀星筆記 ════════════════

/** 列出某收藏的所有筆記 */
router.get('/favorites/:id/notes', (req, res) => {
    const fav = getFav.get(Number(req.params.id), req.user.id);
    if (!fav) return res.status(404).json({ error: '找不到收藏' });
    res.json({ notes: listNotes.all(fav.id) });
});

/** 在某收藏底下新增筆記 */
router.post('/favorites/:id/notes', (req, res) => {
    const fav = getFav.get(Number(req.params.id), req.user.id);
    if (!fav) return res.status(404).json({ error: '找不到收藏' });

    const { body, observedAt } = req.body ?? {};
    if (typeof body !== 'string' || !body.trim()) return res.status(400).json({ error: '筆記內容不可空白' });

    const info = insertNote.run(fav.id, body.trim(), normalizeDate(observedAt));
    res.status(201).json({ note: getNote.get(Number(info.lastInsertRowid), req.user.id) });
});

/** 編輯筆記 */
router.patch('/notes/:id', (req, res) => {
    const note = getNote.get(Number(req.params.id), req.user.id);
    if (!note) return res.status(404).json({ error: '找不到筆記' });

    const body       = (req.body?.body ?? note.body);
    const observedAt = ('observedAt' in (req.body ?? {})) ? normalizeDate(req.body.observedAt) : note.observed_at;
    if (typeof body !== 'string' || !body.trim()) return res.status(400).json({ error: '筆記內容不可空白' });

    updateNote.run(body.trim(), observedAt, note.id);
    res.json({ note: getNote.get(note.id, req.user.id) });
});

/** 刪除筆記 */
router.delete('/notes/:id', (req, res) => {
    const note = getNote.get(Number(req.params.id), req.user.id);
    if (!note) return res.status(404).json({ error: '找不到筆記' });
    deleteNote.run(note.id);
    res.json({ ok: true });
});

// ── 工具函式 ──────────────────────────────────────────────────

/** 將前端傳入的日期時間轉為可儲存字串；空值回傳 null */
function normalizeDate(v) {
    if (v == null || v === '') return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : v; // 保留前端原字串（如 "2026-05-30T21:00"）
}

export default router;
