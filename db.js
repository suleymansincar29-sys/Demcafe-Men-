'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const seed = require('./seed');

function open(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'demcafe.db'));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name_tr TEXT NOT NULL,
      name_en TEXT NOT NULL DEFAULT '',
      art TEXT NOT NULL DEFAULT 'hot-coffee',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name_tr TEXT NOT NULL,
      name_en TEXT NOT NULL DEFAULT '',
      desc_tr TEXT NOT NULL DEFAULT '',
      desc_en TEXT NOT NULL DEFAULT '',
      ingredients_tr TEXT NOT NULL DEFAULT '',
      ingredients_en TEXT NOT NULL DEFAULT '',
      price_kurus INTEGER NOT NULL DEFAULT 0,
      calories INTEGER,
      image TEXT,
      is_popular INTEGER NOT NULL DEFAULT 0,
      is_new INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      in_stock INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id, sort_order);

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL DEFAULT 'info',
      title_tr TEXT NOT NULL,
      title_en TEXT NOT NULL DEFAULT '',
      body_tr TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '',
      starts_at TEXT,
      ends_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      pass_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
  `);

  const count = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  if (count === 0) seedAll(db);

  // Eksik ayar anahtarlarını tamamla (sürüm yükseltmelerinde)
  const insSet = db.prepare('INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(seed.settings)) insSet.run(k, v);

  return db;
}

function seedAll(db) {
  db.exec('BEGIN');
  try {
    const insCat = db.prepare('INSERT INTO categories(slug, name_tr, name_en, art, sort_order) VALUES (?, ?, ?, ?, ?)');
    const ids = {};
    seed.categories.forEach((c, i) => {
      ids[c.slug] = Number(insCat.run(c.slug, c.tr, c.en, c.art, i).lastInsertRowid);
    });
    const insP = db.prepare(`INSERT INTO products
      (category_id, name_tr, name_en, desc_tr, desc_en, ingredients_tr, ingredients_en, price_kurus, calories, is_popular, is_new, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const order = {};
    for (const p of seed.products) {
      order[p.cat] = (order[p.cat] || 0) + 1;
      insP.run(ids[p.cat], p.name_tr, p.name_en, p.desc_tr, p.desc_en, p.ing_tr, p.ing_en,
        Math.round(p.price * 100), p.kcal, p.popular, p.isNew, order[p.cat]);
    }
    const insA = db.prepare('INSERT INTO announcements(kind, title_tr, title_en, body_tr, body_en, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
    seed.announcements.forEach((a, i) => insA.run(a.kind, a.title_tr, a.title_en, a.body_tr, a.body_en, i));
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

module.exports = { open };
