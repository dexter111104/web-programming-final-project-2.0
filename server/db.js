/**
 * db.js
 * 使用 Node 內建 node:sqlite（無原生編譯需求）初始化資料庫與資料表
 */

import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir   = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, 'app.db'));

// 外鍵約束預設關閉，需手動開啟
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
    /* 使用者 */
    CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT    NOT NULL UNIQUE,
        password_hash TEXT    NOT NULL,
        created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    /* 登入 session（自製 token，存於 cookie） */
    CREATE TABLE IF NOT EXISTS sessions (
        token      TEXT    PRIMARY KEY,
        user_id    INTEGER NOT NULL,
        created_at TEXT    NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    /* 收藏地點（暗空聖地或任意座標） */
    CREATE TABLE IF NOT EXISTS favorites (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL,
        name        TEXT    NOT NULL,
        lat         REAL    NOT NULL,
        lng         REAL    NOT NULL,
        site_index  INTEGER,                                   -- 對應 darksites.json 索引（任意座標為 NULL）
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

    /* 觀星筆記（隸屬於某個收藏地點） */
    CREATE TABLE IF NOT EXISTS notes (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        favorite_id INTEGER NOT NULL,
        body        TEXT    NOT NULL DEFAULT '',
        observed_at TEXT,                                      -- 觀測日期時間（ISO 字串，可空）
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (favorite_id) REFERENCES favorites(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_notes_favorite ON notes(favorite_id);
`);

export default db;
