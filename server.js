'use strict';
/*
 * DEM CAFE – Akıllı QR Menü Sistemi
 * Bağımlılıksız Node.js (>= 22.5) sunucusu: HTTP + SQLite (node:sqlite) + dosya depolama.
 */
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { open } = require('./lib/db');
const { qrSvg } = require('./lib/qr');

// ---------------------------------------------------------------- Yapılandırma
const CFG = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  dataDir: path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data')),
  cookieSecure: process.env.COOKIE_SECURE || 'auto', // 'auto' | 'true' | 'false'
  sessionDays: 7,
  maxUploadBytes: 8 * 1024 * 1024,
};
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(CFG.dataDir, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = open(CFG.dataDir);

// ---------------------------------------------------------------- Parola / oturum
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}
function verifyPassword(pw, stored) {
  const [alg, s, k] = String(stored).split('$');
  if (alg !== 'scrypt' || !s || !k) return false;
  const key = crypto.scryptSync(pw, Buffer.from(s, 'base64'), 64, { N: 16384, r: 8, p: 1 });
  const ref = Buffer.from(k, 'base64');
  return ref.length === key.length && crypto.timingSafeEqual(ref, key);
}
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// CLI: node server.js set-password <kullanıcı> <parola>
if (process.argv[2] === 'set-password') {
  const [, , , user, pw] = process.argv;
  if (!user || !pw || pw.length < 8) {
    console.error('Kullanım: node server.js set-password <kullanici> <parola(min 8)>');
    process.exit(1);
  }
  const h = hashPassword(pw);
  const ex = db.prepare('SELECT id FROM admins WHERE username = ?').get(user);
  if (ex) db.prepare('UPDATE admins SET pass_hash = ? WHERE id = ?').run(h, ex.id);
  else db.prepare('INSERT INTO admins(username, pass_hash) VALUES (?, ?)').run(user, h);
  db.prepare('DELETE FROM sessions').run();
  console.log(`✔ "${user}" için parola ayarlandı.`);
  process.exit(0);
}

// İlk yönetici hesabı
if (db.prepare('SELECT COUNT(*) AS n FROM admins').get().n === 0) {
  const user = process.env.ADMIN_USER || 'admin';
  const pw = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  db.prepare('INSERT INTO admins(username, pass_hash) VALUES (?, ?)').run(user, hashPassword(pw));
  console.log('\n══════════════════════════════════════════════');
  console.log(' DEM CAFE yönetici hesabı oluşturuldu');
  console.log(`   Kullanıcı adı : ${user}`);
  console.log(`   Parola        : ${process.env.ADMIN_PASSWORD ? '(ADMIN_PASSWORD değişkeninden)' : pw}`);
  console.log(' Giriş yaptıktan sonra Ayarlar > Parola bölümünden değiştirin.');
  console.log('══════════════════════════════════════════════\n');
}

// ---------------------------------------------------------------- Menü sürümü + canlı yayın (SSE)
const BOOT = Date.now().toString(36);
let version = 1;
const sseClients = new Set();
function bump() {
  version++;
  cachedMenu = null;
  const msg = `event: menu\ndata: ${version}\n\n`;
  for (const res of sseClients) { try { res.write(msg); } catch { /* yoksay */ } }
}
setInterval(() => {
  for (const res of sseClients) { try { res.write(': ping\n\n'); } catch { /* yoksay */ } }
}, 25000).unref();
setInterval(() => db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now()), 3600e3).unref();

// ---------------------------------------------------------------- Yardımcılar
const getSettings = () => Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map((r) => [r.key, r.value]));
const todayLocal = () => new Date().toLocaleDateString('sv-SE', { timeZone: process.env.TZ || 'Europe/Istanbul' });

function baseUrl(req, settings) {
  if (settings.base_url) return settings.base_url.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || '').split(',')[0] || (req.socket.encrypted ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${CFG.port}`;
  return `${proto}://${host}`;
}

const str = (v, max = 500) => (v == null ? '' : String(v)).trim().slice(0, max);
const bool = (v) => (v === true || v === 1 || v === '1' || v === 'true' || v === 'on' ? 1 : 0);
const intOrNull = (v) => {
  if (v === '' || v == null) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
function parsePrice(v) {
  const s = String(v ?? '').replace(/[₺\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 1e6) return null;
  return Math.round(n * 100);
}
const dateOrNull = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null);
function slugify(s) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  return String(s).toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, (ch) => map[ch] || ch)
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'kategori';
}
const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

// ---------------------------------------------------------------- Menü verisi
let cachedMenu = null;
function buildMenu() {
  const today = todayLocal();
  if (cachedMenu && cachedMenu.today === today) return cachedMenu;
  const s = getSettings();
  const cats = db.prepare('SELECT id, slug, name_tr, name_en, art FROM categories WHERE is_active = 1 ORDER BY sort_order, id').all();
  const catIds = new Set(cats.map((c) => c.id));
  const prods = db.prepare(`SELECT p.* FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = 1 AND c.is_active = 1 ORDER BY c.sort_order, c.id, p.sort_order, p.id`).all();
  const anns = db.prepare(`SELECT id, kind, title_tr, title_en, body_tr, body_en FROM announcements
    WHERE is_active = 1 AND (starts_at IS NULL OR starts_at <= ?) AND (ends_at IS NULL OR ends_at >= ?)
    ORDER BY sort_order, id`).all(today, today);
  const data = {
    v: `${BOOT}-${version}-${today}`,
    settings: {
      cafe_name: s.cafe_name, slogan_tr: s.slogan_tr, slogan_en: s.slogan_en, whatsapp: s.whatsapp,
      phone: s.phone, address: s.address, instagram: s.instagram, hours: s.hours, currency: s.currency || '₺',
    },
    categories: cats.map((c) => ({ id: c.id, slug: c.slug, name: { tr: c.name_tr, en: c.name_en || c.name_tr }, art: c.art })),
    products: prods.filter((p) => catIds.has(p.category_id)).map((p) => ({
      id: p.id, c: p.category_id,
      name: { tr: p.name_tr, en: p.name_en || p.name_tr },
      desc: { tr: p.desc_tr, en: p.desc_en || p.desc_tr },
      ing: { tr: p.ingredients_tr, en: p.ingredients_en || p.ingredients_tr },
      price: p.price_kurus, kcal: p.calories, img: p.image ? `/uploads/${p.image}` : null,
      pop: !!p.is_popular, new: !!p.is_new, stock: !!p.in_stock,
    })),
    ann: anns.map((a) => ({ id: a.id, kind: a.kind, title: { tr: a.title_tr, en: a.title_en || a.title_tr }, body: { tr: a.body_tr, en: a.body_en || a.body_tr } })),
  };
  const json = JSON.stringify(data);
  cachedMenu = { today, data, json, etag: `"${data.v}"` };
  return cachedMenu;
}

const fmtPrice = (k) => (k / 100).toLocaleString('tr-TR', { minimumFractionDigits: k % 100 ? 2 : 0, maximumFractionDigits: 2 });

// ---------------------------------------------------------------- Statik dosyalar
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};
const COMPRESSIBLE = /^(text\/|application\/(json|javascript|xml|manifest)|image\/svg)/;
const staticCache = new Map();
const ASSET_V = crypto.createHash('md5').update(
  ['app.js', 'app.css', 'admin.js', 'admin.css'].map((f) => { try { return fs.readFileSync(path.join(PUBLIC_DIR, f)); } catch { return ''; } }).join('|'),
).digest('hex').slice(0, 8);

const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'", "img-src 'self' data: blob:", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com", "script-src 'self'", "connect-src 'self'",
    "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'",
  ].join('; '),
};

function send(req, res, status, body, headers = {}) {
  const type = headers['Content-Type'] || 'text/plain; charset=utf-8';
  let buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  const h = { ...SEC_HEADERS, ...headers, 'Content-Type': type };
  if (buf.length > 1024 && COMPRESSIBLE.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    buf = headers.__gz || zlib.gzipSync(buf, { level: 6 });
    h['Content-Encoding'] = 'gzip';
    h.Vary = 'Accept-Encoding';
  }
  delete h.__gz;
  h['Content-Length'] = buf.length;
  res.writeHead(status, h);
  res.end(req.method === 'HEAD' ? undefined : buf);
}
const sendJson = (req, res, status, obj, extra = {}) =>
  send(req, res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });

async function serveFile(req, res, root, rel, cacheControl) {
  const full = path.normalize(path.join(root, rel));
  if (!full.startsWith(root + path.sep)) throw new HttpError(404, 'Bulunamadı');
  let entry = staticCache.get(full);
  try {
    const st = await fsp.stat(full);
    if (!st.isFile()) throw new Error();
    if (!entry || entry.mtime !== st.mtimeMs) {
      const buf = await fsp.readFile(full);
      const type = MIME[path.extname(full).toLowerCase()] || 'application/octet-stream';
      entry = { buf, type, mtime: st.mtimeMs, etag: `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`,
        gz: COMPRESSIBLE.test(type) && buf.length > 1024 ? zlib.gzipSync(buf, { level: 9 }) : null };
      if (root === PUBLIC_DIR) staticCache.set(full, entry);
    }
  } catch { throw new HttpError(404, 'Bulunamadı'); }
  if (req.headers['if-none-match'] === entry.etag) { res.writeHead(304, { ETag: entry.etag }); return res.end(); }
  send(req, res, 200, entry.buf, { 'Content-Type': entry.type, 'Cache-Control': cacheControl, ETag: entry.etag, __gz: entry.gz });
}

// ---------------------------------------------------------------- Müşteri sayfası (SEO)
function renderIndex(req, res) {
  const tpl = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  const menu = buildMenu();
  const s = getSettings();
  const base = baseUrl(req, s);
  const d = menu.data;
  const title = `${s.cafe_name} – Dijital Menü | ${s.slogan_tr}`;
  const desc = s.seo_description || `${s.cafe_name} QR menü`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'CafeOrCoffeeShop', name: s.cafe_name, slogan: s.slogan_tr, url: base + '/',
    servesCuisine: ['Kahve', 'Tatlı', 'Kahvaltı'], priceRange: '₺₺',
    ...(s.address ? { address: s.address } : {}), ...(s.phone ? { telephone: s.phone } : {}),
    hasMenu: {
      '@type': 'Menu', name: `${s.cafe_name} Menü`, inLanguage: 'tr',
      hasMenuSection: d.categories.map((c) => ({
        '@type': 'MenuSection', name: c.name.tr,
        hasMenuItem: d.products.filter((p) => p.c === c.id).map((p) => ({
          '@type': 'MenuItem', name: p.name.tr, description: p.desc.tr,
          offers: { '@type': 'Offer', price: (p.price / 100).toFixed(2), priceCurrency: 'TRY' },
        })),
      })),
    },
  };
  const noscript = d.categories.map((c) => `<section><h2>${escHtml(c.name.tr)}</h2><ul>${
    d.products.filter((p) => p.c === c.id).map((p) => `<li><strong>${escHtml(p.name.tr)}</strong> – ${escHtml(p.desc.tr)} <b>₺${fmtPrice(p.price)}</b></li>`).join('')
  }</ul></section>`).join('');
  const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
  const html = tpl
    .replaceAll('{{TITLE}}', escHtml(title))
    .replaceAll('{{DESC}}', escHtml(desc))
    .replaceAll('{{CANON}}', escHtml(base + '/'))
    .replaceAll('{{V}}', ASSET_V)
    .replace('{{JSONLD}}', safeJson(ld))
    .replace('{{DATA}}', menu.json.replace(/</g, '\\u003c'))
    .replace('{{NOSCRIPT}}', noscript);
  send(req, res, 200, html, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
}

// ---------------------------------------------------------------- İstek gövdesi
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Dosya/istek çok büyük')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req) {
  const buf = await readBody(req, 256 * 1024);
  if (!buf.length) return {};
  try { return JSON.parse(buf.toString('utf8')); } catch { throw new HttpError(400, 'Geçersiz JSON'); }
}

// ---------------------------------------------------------------- Kimlik doğrulama
function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function isSecure(req) {
  if (CFG.cookieSecure === 'true') return true;
  if (CFG.cookieSecure === 'false') return false;
  return req.socket.encrypted || (req.headers['x-forwarded-proto'] || '').startsWith('https');
}
function currentAdmin(req) {
  const tok = parseCookies(req).dem_sid;
  if (!tok) return null;
  const row = db.prepare(`SELECT a.id, a.username, s.expires_at FROM sessions s JOIN admins a ON a.id = s.admin_id
    WHERE s.token_hash = ?`).get(sha256(tok));
  if (!row || row.expires_at < Date.now()) return null;
  return { id: row.id, username: row.username, tokenHash: sha256(tok) };
}
const loginAttempts = new Map();
function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';
}
function checkRate(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip) || { n: 0, t: now };
  if (now - rec.t > 15 * 60e3) { rec.n = 0; rec.t = now; }
  loginAttempts.set(ip, rec);
  if (rec.n >= 8) throw new HttpError(429, 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.');
  return rec;
}

// ---------------------------------------------------------------- Görsel depolama
function detectImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}
function removeImageIfUnused(name) {
  if (!name) return;
  const used = db.prepare('SELECT COUNT(*) AS n FROM products WHERE image = ?').get(name).n;
  if (!used && /^[a-f0-9]{24}\.(jpg|png|webp)$/.test(name)) fs.rm(path.join(UPLOAD_DIR, name), { force: true }, () => {});
}

// ---------------------------------------------------------------- Yönetici API
const PRODUCT_FIELDS = 'id, category_id, name_tr, name_en, desc_tr, desc_en, ingredients_tr, ingredients_en, price_kurus, calories, image, is_popular, is_new, is_active, in_stock, sort_order, created_at, updated_at';

function productInput(b, existing = {}) {
  const has = (k) => Object.prototype.hasOwnProperty.call(b, k);
  const out = { ...existing };
  if (has('category_id')) {
    const c = db.prepare('SELECT id FROM categories WHERE id = ?').get(Number(b.category_id));
    if (!c) throw new HttpError(400, 'Kategori bulunamadı');
    out.category_id = c.id;
  }
  for (const k of ['name_tr', 'name_en']) if (has(k)) out[k] = str(b[k], 120);
  for (const k of ['desc_tr', 'desc_en']) if (has(k)) out[k] = str(b[k], 600);
  for (const k of ['ingredients_tr', 'ingredients_en']) if (has(k)) out[k] = str(b[k], 600);
  if (has('price')) {
    const p = parsePrice(b.price);
    if (p == null) throw new HttpError(400, 'Geçerli bir fiyat girin');
    out.price_kurus = p;
  }
  if (has('calories')) out.calories = intOrNull(b.calories);
  if (has('image')) {
    const img = b.image ? String(b.image) : null;
    if (img && !/^[a-f0-9]{24}\.(jpg|png|webp)$/.test(img)) throw new HttpError(400, 'Geçersiz görsel');
    out.image = img;
  }
  for (const k of ['is_popular', 'is_new', 'is_active', 'in_stock']) if (has(k)) out[k] = bool(b[k]);
  if (!out.name_tr) throw new HttpError(400, 'Ürün adı (TR) zorunlu');
  if (!out.category_id) throw new HttpError(400, 'Kategori seçin');
  return out;
}

function reorder(table, ids, where = '') {
  if (!Array.isArray(ids) || ids.some((x) => !Number.isInteger(Number(x)))) throw new HttpError(400, 'Geçersiz sıralama');
  const st = db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ? ${where}`);
  db.exec('BEGIN');
  try { ids.forEach((id, i) => st.run(i + 1, Number(id))); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
}

const SETTINGS_KEYS = ['cafe_name', 'slogan_tr', 'slogan_en', 'whatsapp', 'phone', 'address', 'instagram', 'hours', 'table_count', 'base_url', 'seo_description'];

const routes = [];
const route = (method, pattern, handler, opts = {}) => routes.push({ method, pattern, handler, ...opts });

// --- Kimlik
route('POST', /^\/api\/admin\/login$/, async (req, res) => {
  const ip = clientIp(req);
  const rec = checkRate(ip);
  const b = await readJson(req);
  const a = db.prepare('SELECT * FROM admins WHERE username = ?').get(str(b.username, 60));
  if (!a || !verifyPassword(String(b.password || ''), a.pass_hash)) {
    rec.n++;
    throw new HttpError(401, 'Kullanıcı adı veya parola hatalı');
  }
  loginAttempts.delete(ip);
  const tok = crypto.randomBytes(32).toString('base64url');
  const exp = Date.now() + CFG.sessionDays * 864e5;
  db.prepare('INSERT INTO sessions(token_hash, admin_id, expires_at) VALUES (?, ?, ?)').run(sha256(tok), a.id, exp);
  const cookie = `dem_sid=${tok}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${CFG.sessionDays * 86400}${isSecure(req) ? '; Secure' : ''}`;
  sendJson(req, res, 200, { ok: true, username: a.username }, { 'Set-Cookie': cookie });
}, { public: true });

route('POST', /^\/api\/admin\/logout$/, async (req, res, m, admin) => {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(admin.tokenHash);
  sendJson(req, res, 200, { ok: true }, { 'Set-Cookie': 'dem_sid=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' });
});

route('GET', /^\/api\/admin\/me$/, async (req, res, m, admin) => sendJson(req, res, 200, { username: admin.username }));

route('POST', /^\/api\/admin\/password$/, async (req, res, m, admin) => {
  const b = await readJson(req);
  const a = db.prepare('SELECT * FROM admins WHERE id = ?').get(admin.id);
  if (!verifyPassword(String(b.current || ''), a.pass_hash)) throw new HttpError(400, 'Mevcut parola hatalı');
  const next = String(b.next || '');
  if (next.length < 8) throw new HttpError(400, 'Yeni parola en az 8 karakter olmalı');
  db.prepare('UPDATE admins SET pass_hash = ? WHERE id = ?').run(hashPassword(next), a.id);
  db.prepare('DELETE FROM sessions WHERE admin_id = ? AND token_hash != ?').run(a.id, admin.tokenHash);
  sendJson(req, res, 200, { ok: true });
});

// --- Panel verisi (tek istekte)
route('GET', /^\/api\/admin\/data$/, async (req, res) => {
  const cats = db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
    FROM categories c ORDER BY sort_order, id`).all();
  const prods = db.prepare(`SELECT ${PRODUCT_FIELDS} FROM products ORDER BY category_id, sort_order, id`).all();
  const anns = db.prepare('SELECT * FROM announcements ORDER BY sort_order, id').all();
  const s = getSettings();
  sendJson(req, res, 200, { categories: cats, products: prods, announcements: anns, settings: s, base_url_effective: baseUrl(req, s) });
});

// --- Kategoriler
route('POST', /^\/api\/admin\/categories$/, async (req, res) => {
  const b = await readJson(req);
  const name_tr = str(b.name_tr, 60);
  if (!name_tr) throw new HttpError(400, 'Kategori adı zorunlu');
  let slug = slugify(name_tr), i = 2;
  while (db.prepare('SELECT 1 FROM categories WHERE slug = ?').get(slug)) slug = `${slugify(name_tr)}-${i++}`;
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM categories').get().m;
  const r = db.prepare('INSERT INTO categories(slug, name_tr, name_en, art, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)')
    .run(slug, name_tr, str(b.name_en, 60), str(b.art, 30) || 'hot-coffee', max + 1, b.is_active === undefined ? 1 : bool(b.is_active));
  bump();
  sendJson(req, res, 201, db.prepare('SELECT * FROM categories WHERE id = ?').get(r.lastInsertRowid));
});

route('PUT', /^\/api\/admin\/categories\/(\d+)$/, async (req, res, m) => {
  const id = Number(m[1]);
  const c = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!c) throw new HttpError(404, 'Kategori bulunamadı');
  const b = await readJson(req);
  const has = (k) => Object.prototype.hasOwnProperty.call(b, k);
  const name_tr = has('name_tr') ? str(b.name_tr, 60) : c.name_tr;
  if (!name_tr) throw new HttpError(400, 'Kategori adı zorunlu');
  db.prepare('UPDATE categories SET name_tr = ?, name_en = ?, art = ?, is_active = ? WHERE id = ?').run(
    name_tr, has('name_en') ? str(b.name_en, 60) : c.name_en, has('art') ? (str(b.art, 30) || c.art) : c.art,
    has('is_active') ? bool(b.is_active) : c.is_active, id);
  bump();
  sendJson(req, res, 200, db.prepare('SELECT * FROM categories WHERE id = ?').get(id));
});

route('DELETE', /^\/api\/admin\/categories\/(\d+)$/, async (req, res, m, admin, url) => {
  const id = Number(m[1]);
  const c = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!c) throw new HttpError(404, 'Kategori bulunamadı');
  const n = db.prepare('SELECT COUNT(*) AS n FROM products WHERE category_id = ?').get(id).n;
  const moveTo = Number(url.searchParams.get('move_to') || 0);
  const force = url.searchParams.get('force') === '1';
  if (n > 0 && !moveTo && !force) throw new HttpError(409, `Bu kategoride ${n} ürün var. Ürünleri taşıyın veya birlikte silin.`);
  db.exec('BEGIN');
  try {
    if (n > 0 && moveTo) {
      if (moveTo === id || !db.prepare('SELECT 1 FROM categories WHERE id = ?').get(moveTo)) throw new HttpError(400, 'Hedef kategori geçersiz');
      const max = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM products WHERE category_id = ?').get(moveTo).m;
      db.prepare('UPDATE products SET category_id = ?, sort_order = sort_order + ? WHERE category_id = ?').run(moveTo, max, id);
    }
    const imgs = db.prepare('SELECT image FROM products WHERE category_id = ? AND image IS NOT NULL').all(id).map((r) => r.image);
    db.prepare('DELETE FROM products WHERE category_id = ?').run(id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    db.exec('COMMIT');
    imgs.forEach(removeImageIfUnused);
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  bump();
  sendJson(req, res, 200, { ok: true });
});

route('POST', /^\/api\/admin\/categories\/reorder$/, async (req, res) => {
  reorder('categories', (await readJson(req)).ids);
  bump();
  sendJson(req, res, 200, { ok: true });
});

// --- Ürünler
route('POST', /^\/api\/admin\/products$/, async (req, res) => {
  const b = await readJson(req);
  const p = productInput(b, { name_en: '', desc_tr: '', desc_en: '', ingredients_tr: '', ingredients_en: '', price_kurus: 0,
    calories: null, image: null, is_popular: 0, is_new: 1, is_active: 1, in_stock: 1 });
  if (!Object.prototype.hasOwnProperty.call(b, 'price')) throw new HttpError(400, 'Fiyat zorunlu');
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM products WHERE category_id = ?').get(p.category_id).m;
  const r = db.prepare(`INSERT INTO products (category_id, name_tr, name_en, desc_tr, desc_en, ingredients_tr, ingredients_en,
    price_kurus, calories, image, is_popular, is_new, is_active, in_stock, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(p.category_id, p.name_tr, p.name_en, p.desc_tr, p.desc_en,
    p.ingredients_tr, p.ingredients_en, p.price_kurus, p.calories, p.image, p.is_popular, p.is_new, p.is_active, p.in_stock, max + 1);
  bump();
  sendJson(req, res, 201, db.prepare(`SELECT ${PRODUCT_FIELDS} FROM products WHERE id = ?`).get(r.lastInsertRowid));
});

async function updateProduct(req, res, m) {
  const id = Number(m[1]);
  const cur = db.prepare(`SELECT ${PRODUCT_FIELDS} FROM products WHERE id = ?`).get(id);
  if (!cur) throw new HttpError(404, 'Ürün bulunamadı');
  const p = productInput(await readJson(req), cur);
  let sort = cur.sort_order;
  if (p.category_id !== cur.category_id) {
    sort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM products WHERE category_id = ?').get(p.category_id).m + 1;
  }
  db.prepare(`UPDATE products SET category_id = ?, name_tr = ?, name_en = ?, desc_tr = ?, desc_en = ?, ingredients_tr = ?,
    ingredients_en = ?, price_kurus = ?, calories = ?, image = ?, is_popular = ?, is_new = ?, is_active = ?, in_stock = ?,
    sort_order = ?, updated_at = datetime('now') WHERE id = ?`).run(p.category_id, p.name_tr, p.name_en, p.desc_tr, p.desc_en,
    p.ingredients_tr, p.ingredients_en, p.price_kurus, p.calories, p.image, p.is_popular, p.is_new, p.is_active, p.in_stock, sort, id);
  if (cur.image && cur.image !== p.image) removeImageIfUnused(cur.image);
  bump();
  sendJson(req, res, 200, db.prepare(`SELECT ${PRODUCT_FIELDS} FROM products WHERE id = ?`).get(id));
}
route('PUT', /^\/api\/admin\/products\/(\d+)$/, updateProduct);
route('PATCH', /^\/api\/admin\/products\/(\d+)$/, updateProduct);

route('DELETE', /^\/api\/admin\/products\/(\d+)$/, async (req, res, m) => {
  const cur = db.prepare('SELECT image FROM products WHERE id = ?').get(Number(m[1]));
  if (!cur) throw new HttpError(404, 'Ürün bulunamadı');
  db.prepare('DELETE FROM products WHERE id = ?').run(Number(m[1]));
  removeImageIfUnused(cur.image);
  bump();
  sendJson(req, res, 200, { ok: true });
});

route('POST', /^\/api\/admin\/products\/reorder$/, async (req, res) => {
  reorder('products', (await readJson(req)).ids);
  bump();
  sendJson(req, res, 200, { ok: true });
});

// --- Görsel yükleme (ham gövde: image/jpeg | image/png | image/webp)
route('POST', /^\/api\/admin\/upload$/, async (req, res) => {
  const buf = await readBody(req, CFG.maxUploadBytes);
  const ext = detectImage(buf);
  if (!ext) throw new HttpError(415, 'Yalnızca JPG, PNG veya WEBP yükleyebilirsiniz');
  const name = `${crypto.randomBytes(12).toString('hex')}.${ext}`;
  await fsp.writeFile(path.join(UPLOAD_DIR, name), buf);
  sendJson(req, res, 201, { image: name, url: `/uploads/${name}` });
});

// --- Duyurular / kampanyalar
function annInput(b) {
  const title_tr = str(b.title_tr, 120);
  if (!title_tr) throw new HttpError(400, 'Başlık (TR) zorunlu');
  return [b.kind === 'campaign' ? 'campaign' : 'info', title_tr, str(b.title_en, 120), str(b.body_tr, 400), str(b.body_en, 400),
    dateOrNull(b.starts_at), dateOrNull(b.ends_at), b.is_active === undefined ? 1 : bool(b.is_active)];
}
route('POST', /^\/api\/admin\/announcements$/, async (req, res) => {
  const v = annInput(await readJson(req));
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM announcements').get().m;
  const r = db.prepare(`INSERT INTO announcements(kind, title_tr, title_en, body_tr, body_en, starts_at, ends_at, is_active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(...v, max + 1);
  bump();
  sendJson(req, res, 201, db.prepare('SELECT * FROM announcements WHERE id = ?').get(r.lastInsertRowid));
});
route('PUT', /^\/api\/admin\/announcements\/(\d+)$/, async (req, res, m) => {
  const id = Number(m[1]);
  if (!db.prepare('SELECT 1 FROM announcements WHERE id = ?').get(id)) throw new HttpError(404, 'Duyuru bulunamadı');
  const v = annInput(await readJson(req));
  db.prepare(`UPDATE announcements SET kind = ?, title_tr = ?, title_en = ?, body_tr = ?, body_en = ?, starts_at = ?, ends_at = ?, is_active = ?
    WHERE id = ?`).run(...v, id);
  bump();
  sendJson(req, res, 200, db.prepare('SELECT * FROM announcements WHERE id = ?').get(id));
});
route('DELETE', /^\/api\/admin\/announcements\/(\d+)$/, async (req, res, m) => {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(Number(m[1]));
  bump();
  sendJson(req, res, 200, { ok: true });
});
route('POST', /^\/api\/admin\/announcements\/reorder$/, async (req, res) => {
  reorder('announcements', (await readJson(req)).ids);
  bump();
  sendJson(req, res, 200, { ok: true });
});

// --- Ayarlar
route('PUT', /^\/api\/admin\/settings$/, async (req, res) => {
  const b = await readJson(req);
  const st = db.prepare('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  for (const k of SETTINGS_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) continue;
    let v = str(b[k], k === 'seo_description' ? 300 : 160);
    if (k === 'whatsapp') v = v.replace(/\D/g, '');
    if (k === 'table_count') v = String(Math.min(200, Math.max(0, parseInt(v, 10) || 0)));
    if (k === 'base_url' && v && !/^https?:\/\/[^\s/]+/.test(v)) throw new HttpError(400, 'Site adresi http:// veya https:// ile başlamalı');
    if (k === 'instagram') v = v.replace(/^@/, '');
    if (k === 'cafe_name' && !v) throw new HttpError(400, 'İşletme adı boş olamaz');
    st.run(k, v);
  }
  bump();
  sendJson(req, res, 200, getSettings());
});

// ---------------------------------------------------------------- Genel rotalar
route('GET', /^\/api\/menu$/, async (req, res) => {
  const m = buildMenu();
  if (req.headers['if-none-match'] === m.etag) { res.writeHead(304, { ETag: m.etag }); return res.end(); }
  send(req, res, 200, m.json, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache', ETag: m.etag });
}, { public: true });

route('GET', /^\/api\/events$/, async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write(`retry: 5000\nevent: menu\ndata: ${version}\n\n`);
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
}, { public: true });

route('GET', /^\/qr\/(menu|masa-(\d{1,3}))\.svg$/, async (req, res, m, admin, url) => {
  const s = getSettings();
  const target = m[2] ? `${baseUrl(req, s)}/masa/${Number(m[2])}` : `${baseUrl(req, s)}/`;
  const headers = { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' };
  if (url.searchParams.get('download')) headers['Content-Disposition'] = `attachment; filename="demcafe-${m[2] ? 'masa-' + Number(m[2]) : 'menu'}-qr.svg"`;
  send(req, res, 200, qrSvg(target), headers);
}, { public: true });

route('GET', /^\/robots\.txt$/, async (req, res) => {
  send(req, res, 200, `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${baseUrl(req, getSettings())}/sitemap.xml\n`, { 'Cache-Control': 'public, max-age=3600' });
}, { public: true });
route('GET', /^\/sitemap\.xml$/, async (req, res) => {
  const b = baseUrl(req, getSettings());
  send(req, res, 200, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escHtml(b)}/</loc><changefreq>daily</changefreq></url></urlset>`,
    { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
}, { public: true });
route('GET', /^\/healthz$/, async (req, res) => sendJson(req, res, 200, { ok: true }), { public: true });

// Müşteri sayfası: / ve /masa/:no (kalıcı masa bağlantıları)
route('GET', /^\/(masa\/\d{1,3}\/?)?$/, async (req, res) => renderIndex(req, res), { public: true });

route('GET', /^\/admin\/?$/, async (req, res) => {
  const tpl = fs.readFileSync(path.join(PUBLIC_DIR, 'admin.html'), 'utf8').replaceAll('{{V}}', ASSET_V);
  send(req, res, 200, tpl, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
}, { public: true });

route('GET', /^\/uploads\/([a-f0-9]{24}\.(?:jpg|png|webp))$/, async (req, res, m) =>
  serveFile(req, res, UPLOAD_DIR, m[1], 'public, max-age=31536000, immutable'), { public: true });

// ---------------------------------------------------------------- Sunucu
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const method = req.method === 'HEAD' ? 'GET' : req.method;
  try {
    for (const r of routes) {
      if (r.method !== method) continue;
      const m = url.pathname.match(r.pattern);
      if (!m) continue;
      let admin = null;
      if (!r.public) {
        admin = currentAdmin(req);
        if (!admin) throw new HttpError(401, 'Oturum gerekli');
      }
      if (url.pathname.startsWith('/api/admin/') && method !== 'GET' && req.headers['x-dem-admin'] !== '1') {
        throw new HttpError(403, 'Geçersiz istek kaynağı');
      }
      return await r.handler(req, res, m, admin, url);
    }
    if (method === 'GET' && !url.pathname.startsWith('/api/')) {
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      if (rel.endsWith('.html')) throw new HttpError(404, 'Bulunamadı');
      const longCache = url.searchParams.has('v') || rel.startsWith('art/') || rel.startsWith('fonts/');
      return await serveFile(req, res, PUBLIC_DIR, rel, longCache ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
    }
    throw new HttpError(404, 'Bulunamadı');
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    if (res.headersSent) return res.end();
    if (url.pathname.startsWith('/api/')) return sendJson(req, res, status, { error: status === 500 ? 'Sunucu hatası' : e.message });
    send(req, res, status, status === 404 ? 'Sayfa bulunamadı' : 'Hata', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
});
server.headersTimeout = 20000;
server.requestTimeout = 60000;

if (require.main === module) {
  server.listen(CFG.port, CFG.host, () => console.log(`☕ DEM CAFE menü: http://localhost:${CFG.port}  |  Panel: http://localhost:${CFG.port}/admin`));
}
module.exports = server;
