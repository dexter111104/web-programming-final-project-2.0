/**
 * auth.js
 * 註冊 / 登入 / 登出 / 取得目前使用者，以及 requireAuth 中介層
 * 驗證機制：bcryptjs 雜湊密碼 + 自製 session token（存 httpOnly cookie）
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import db from './db.js';

const router = Router();

const COOKIE_NAME = 'sid';
const COOKIE_OPTS = {
    httpOnly: true,                   // JS 讀不到，降低 XSS 竊取風險
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 天
};

// ── 預備語句 ──────────────────────────────────────────────────
const insertUser   = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
const findUserByName = db.prepare('SELECT * FROM users WHERE username = ?');
const findUserById   = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?');
const insertSession  = db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)');
const findSession    = db.prepare('SELECT user_id FROM sessions WHERE token = ?');
const deleteSession  = db.prepare('DELETE FROM sessions WHERE token = ?');

// ── 中介層：解析 cookie 中的 session，掛上 req.user ─────────────
export function attachUser(req, _res, next) {
    const token = parseCookie(req.headers.cookie)[COOKIE_NAME];
    if (token) {
        const row = findSession.get(token);
        if (row) req.user = findUserById.get(row.user_id);
    }
    next();
}

// ── 中介層：要求已登入 ────────────────────────────────────────
export function requireAuth(req, res, next) {
    if (!req.user) return res.status(401).json({ error: '請先登入' });
    next();
}

// ── 註冊 ──────────────────────────────────────────────────────
router.post('/register', (req, res) => {
    const { username, password } = req.body ?? {};
    const err = validateCredentials(username, password);
    if (err) return res.status(400).json({ error: err });

    if (findUserByName.get(username)) {
        return res.status(409).json({ error: '此使用者名稱已被註冊' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const info = insertUser.run(username, hash);
    startSession(res, Number(info.lastInsertRowid));
    res.status(201).json({ user: { id: Number(info.lastInsertRowid), username } });
});

// ── 登入 ──────────────────────────────────────────────────────
router.post('/login', (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
        return res.status(400).json({ error: '請輸入使用者名稱與密碼' });
    }

    const user = findUserByName.get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: '使用者名稱或密碼錯誤' });
    }

    startSession(res, user.id);
    res.json({ user: { id: user.id, username: user.username } });
});

// ── 登出 ──────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
    const token = parseCookie(req.headers.cookie)[COOKIE_NAME];
    if (token) deleteSession.run(token);
    res.clearCookie(COOKIE_NAME);
    res.json({ ok: true });
});

// ── 目前登入者 ────────────────────────────────────────────────
router.get('/me', (req, res) => {
    if (!req.user) return res.status(401).json({ error: '未登入' });
    res.json({ user: req.user });
});

// ── 工具函式 ──────────────────────────────────────────────────

/** 建立 session 並寫入 cookie */
function startSession(res, userId) {
    const token = randomBytes(32).toString('hex');
    insertSession.run(token, userId);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
}

/** 驗證註冊輸入；通過回傳 null，否則回傳錯誤訊息 */
function validateCredentials(username, password) {
    if (typeof username !== 'string' || typeof password !== 'string') return '格式錯誤';
    if (username.length < 3 || username.length > 20) return '使用者名稱需 3–20 個字元';
    if (!/^[\w一-龥]+$/.test(username))       return '使用者名稱只能含字母、數字、底線或中文';
    if (password.length < 6)                          return '密碼至少需 6 個字元';
    return null;
}

/** 解析 Cookie 標頭字串為物件 */
function parseCookie(header = '') {
    return Object.fromEntries(
        header.split(';').map(p => {
            const i = p.indexOf('=');
            if (i < 0) return ['', ''];
            return [p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1).trim())];
        }).filter(([k]) => k)
    );
}

export default router;
