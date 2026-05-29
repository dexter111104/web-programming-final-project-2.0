/**
 * server.js
 * Express 入口：提供靜態網站 + /api（驗證、收藏、筆記）
 */

import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import authRouter, { attachUser } from './auth.js';
import favoritesRouter from './favorites.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir   = join(__dirname, '..');

const app  = express();
const PORT = process.env.PORT || 8150;

app.use(express.json());   // 解析 JSON 請求主體
app.use(attachUser);       // 每個請求先嘗試解析登入狀態 → req.user

// ── API 路由 ──────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api', favoritesRouter);

// ── 靜態網站（沿用原本的 citylights.html / js / style.css / data）──
app.use(express.static(rootDir));
app.get('/', (_req, res) => res.sendFile(join(rootDir, 'citylights.html')));

app.listen(PORT, () => {
    console.log(`光害地圖伺服器啟動：http://localhost:${PORT}`);
});
