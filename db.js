// 数据库层：使用 Node 内置 node:sqlite（零原生依赖，部署无需编译）
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'family-meal.db'));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',   -- admin / user
  avatar        TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS dishes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'other',  -- breakfast / lunch / dinner / other
  image            TEXT,
  description      TEXT NOT NULL DEFAULT '',
  main_ingredients TEXT NOT NULL DEFAULT '[]',  -- JSON 数组：主食材
  side_ingredients TEXT NOT NULL DEFAULT '[]',  -- JSON 数组：配菜
  seasonings       TEXT NOT NULL DEFAULT '[]',  -- JSON 数组：配料/调料
  steps            TEXT NOT NULL DEFAULT '[]',  -- JSON 数组：做法步骤
  status           INTEGER NOT NULL DEFAULT 1,  -- 1 上架 / 0 下架
  created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS orders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_date TEXT NOT NULL,                 -- YYYY-MM-DD
  meal       TEXT NOT NULL,                 -- breakfast / lunch / dinner
  dish_ids   TEXT NOT NULL DEFAULT '[]',    -- JSON 数组
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  dish_id    INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT NOT NULL DEFAULT '',
  photo      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE (dish_id, user_id)   -- 每人对每个菜保留一条评分，可更新
);
`);

// ---------- 工具函数 ----------
function parseJsonArray(str, fallback = []) {
  try {
    const v = JSON.parse(str || '[]');
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function rows(stmt, ...params) {
  return stmt.all(...params);
}
function get(stmt, ...params) {
  return stmt.get(...params);
}
function run(stmt, ...params) {
  return stmt.run(...params);
}

module.exports = { db, parseJsonArray, rows, get, run };
