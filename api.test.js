'use strict';
// Uçtan uca API testleri: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'demcafe-test-'));
process.env.ADMIN_PASSWORD = 'test-parola-123';
const server = require('../server');
let base, cookie = '';

const req = async (method, url, body, extra = {}) => {
  const headers = { 'X-Dem-Admin': '1', Cookie: cookie, ...extra };
  let payload;
  if (Buffer.isBuffer(body)) payload = body;
  else if (body !== undefined) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  const r = await fetch(base + url, { method, headers, body: payload });
  const sc = r.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  const ct = r.headers.get('content-type') || '';
  return { status: r.status, body: ct.includes('json') ? await r.json() : await r.text(), headers: r.headers };
};

before(() => new Promise((res) => server.listen(0, '127.0.0.1', () => { base = `http://127.0.0.1:${server.address().port}`; res(); })));
after(() => { server.close(); server.closeAllConnections?.(); });

test('herkese açık menü ve SEO', async () => {
  const m = await req('GET', '/api/menu');
  assert.equal(m.status, 200);
  assert.equal(m.body.categories.length, 12);
  assert.ok(m.body.products.length > 40);
  const html = await req('GET', '/masa/7');
  assert.match(html.body, /CafeOrCoffeeShop/);
  assert.match(html.body, /<title>DEM CAFE/);
  const qr = await req('GET', '/qr/masa-7.svg');
  assert.match(qr.body, /^<svg/);
});

test('yetkisiz erişim engellenir', async () => {
  assert.equal((await req('GET', '/api/admin/data')).status, 401);
  assert.equal((await req('POST', '/api/admin/login', { username: 'admin', password: 'yanlis' })).status, 401);
});

test('giriş + ürün yaşam döngüsü', async () => {
  const l = await req('POST', '/api/admin/login', { username: 'admin', password: 'test-parola-123' });
  assert.equal(l.status, 200);
  // CSRF başlığı olmadan değişiklik reddedilir
  const noHdr = await fetch(base + '/api/admin/products', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(noHdr.status, 403);

  const d = (await req('GET', '/api/admin/data')).body;
  const cat = d.categories[0];
  const p = await req('POST', '/api/admin/products', { category_id: cat.id, name_tr: 'Test Kahve', price: '199,90' });
  assert.equal(p.status, 201);
  assert.equal(p.body.price_kurus, 19990);

  const up = await req('PATCH', `/api/admin/products/${p.body.id}`, { price: '210', in_stock: 0, is_popular: 1 });
  assert.equal(up.body.price_kurus, 21000);
  assert.equal(up.body.in_stock, 0);

  let menu = (await req('GET', '/api/menu')).body;
  const mp = menu.products.find((x) => x.id === p.body.id);
  assert.equal(mp.price, 21000);
  assert.equal(mp.stock, false);

  await req('PATCH', `/api/admin/products/${p.body.id}`, { is_active: 0 });
  menu = (await req('GET', '/api/menu')).body;
  assert.ok(!menu.products.some((x) => x.id === p.body.id), 'satışa kapalı ürün menüde görünmemeli');

  const other = d.categories[1];
  const mv = await req('PUT', `/api/admin/products/${p.body.id}`, { category_id: other.id });
  assert.equal(mv.body.category_id, other.id);

  assert.equal((await req('DELETE', `/api/admin/products/${p.body.id}`)).status, 200);
});

test('görsel yükleme yalnızca resim kabul eder', async () => {
  const bad = await req('POST', '/api/admin/upload', Buffer.from('<?php echo 1; ?>'), { 'Content-Type': 'image/jpeg' });
  assert.equal(bad.status, 415);
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');
  const ok = await req('POST', '/api/admin/upload', png, { 'Content-Type': 'image/png' });
  assert.equal(ok.status, 201);
  assert.match(ok.body.image, /^[a-f0-9]{24}\.png$/);
});

test('kategori: ekle, sırala, ürünleri taşıyarak sil', async () => {
  const c = await req('POST', '/api/admin/categories', { name_tr: 'Özel İçecekler', name_en: 'Specials' });
  assert.equal(c.status, 201);
  assert.equal(c.body.slug, 'ozel-icecekler');
  const d = (await req('GET', '/api/admin/data')).body;
  const ids = d.categories.map((x) => x.id).reverse();
  await req('POST', '/api/admin/categories/reorder', { ids });
  const after1 = (await req('GET', '/api/admin/data')).body;
  assert.equal(after1.categories[0].id, ids[0]);
  const src = after1.categories.find((x) => x.product_count > 0);
  const tgt = after1.categories.find((x) => x.id !== src.id);
  assert.equal((await req('DELETE', `/api/admin/categories/${src.id}`)).status, 409);
  assert.equal((await req('DELETE', `/api/admin/categories/${src.id}?move_to=${tgt.id}`)).status, 200);
  const after2 = (await req('GET', '/api/admin/data')).body;
  assert.equal(after2.categories.find((x) => x.id === tgt.id).product_count, tgt.product_count + src.product_count);
});

test('duyuru tarih aralığı', async () => {
  const past = await req('POST', '/api/admin/announcements', { title_tr: 'Eski', starts_at: '2020-01-01', ends_at: '2020-01-02' });
  const live = await req('POST', '/api/admin/announcements', { title_tr: 'Canlı', kind: 'campaign' });
  const menu = (await req('GET', '/api/menu')).body;
  assert.ok(menu.ann.some((a) => a.id === live.body.id));
  assert.ok(!menu.ann.some((a) => a.id === past.body.id));
});

test('ayarlar ve parola', async () => {
  const s = await req('PUT', '/api/admin/settings', { whatsapp: '+90 532 000 00 00', base_url: 'https://menu.demcafe.com/' });
  assert.equal(s.body.whatsapp, '905320000000');
  const qr = await req('GET', '/robots.txt');
  assert.match(qr.body, /https:\/\/menu\.demcafe\.com\/sitemap\.xml/);
  assert.equal((await req('POST', '/api/admin/password', { current: 'yanlis', next: 'yeniparola1' })).status, 400);
  assert.equal((await req('POST', '/api/admin/password', { current: 'test-parola-123', next: 'yeniparola1' })).status, 200);
  await req('POST', '/api/admin/logout', {});
  assert.equal((await req('GET', '/api/admin/data')).status, 401);
});
