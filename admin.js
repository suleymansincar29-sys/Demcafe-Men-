/* DEM CAFE – yönetim paneli */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ARTS = [
    ['hot-coffee', 'Sıcak kahve'], ['iced-coffee', 'Soğuk kahve'], ['turkish-coffee', 'Türk kahvesi'], ['tea', 'Çay'],
    ['lemonade', 'Limonata'], ['milkshake', 'Milkshake'], ['frozen', 'Frozen'], ['smoothie', 'Smoothie'],
    ['dessert', 'Tatlı'], ['cake', 'Pasta'], ['snack', 'Atıştırmalık'], ['breakfast', 'Kahvaltı'],
  ];
  const ICON = {
    star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.8M6.6 6.6C3.8 8.3 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
    box: '<svg viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>',
    boxOff: '<svg viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="M8 10l8 6M16 10l-8 6"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    plus: '<svg viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M12 5v14M5 12h14"/></svg>',
  };

  let D = null; // panel verisi
  let tab = 'products';
  const ui = { q: '', cat: 'all' };

  // ---------------------------------------------------------- API
  async function api(method, url, body, raw) {
    const opt = { method, headers: { 'X-Dem-Admin': '1' }, credentials: 'same-origin' };
    if (raw) { opt.body = raw; opt.headers['Content-Type'] = raw.type || 'application/octet-stream'; }
    else if (body !== undefined) { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
    const r = await fetch(url, opt);
    let j = {};
    try { j = await r.json(); } catch { /* boş yanıt */ }
    if (r.status === 401 && !url.endsWith('/login')) { showLogin(); throw new Error('Oturum süresi doldu, tekrar giriş yapın'); }
    if (!r.ok) throw new Error(j.error || `Hata (${r.status})`);
    return j;
  }
  async function load() { D = await api('GET', '/api/admin/data'); }
  async function act(fn, okMsg) {
    try { await fn(); await load(); render(); if (okMsg) toast(okMsg); return true; }
    catch (e) { toast(e.message, true); return false; }
  }

  // ---------------------------------------------------------- Yardımcılar
  let toastT;
  function toast(msg, bad = false) {
    const el = $('#toast');
    el.textContent = msg;
    el.className = `toast show${bad ? ' bad' : ''}`;
    clearTimeout(toastT);
    toastT = setTimeout(() => { el.className = 'toast'; }, bad ? 4000 : 2200);
  }
  const tl = (k) => (k / 100).toLocaleString('tr-TR', { minimumFractionDigits: k % 100 ? 2 : 0, maximumFractionDigits: 2 });
  const catName = (id) => (D.categories.find((c) => c.id === id) || {}).name_tr || '—';
  const artOf = (catId) => `/art/${(D.categories.find((c) => c.id === catId) || {}).art || 'hot-coffee'}.svg`;
  const imgSrc = (p) => (p.image ? `/uploads/${p.image}` : artOf(p.category_id));
  const norm = (s) => String(s || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
  const sw = (name, label, checked) => `<label class="switch"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}><span class="tr"></span>${label}</label>`;
  const formData = (form) => {
    const o = {};
    $$('input, select, textarea', form).forEach((el) => {
      if (!el.name) return;
      o[el.name] = el.type === 'checkbox' ? el.checked : el.type === 'radio' ? (el.checked ? el.value : o[el.name]) : el.value;
    });
    return o;
  };
  function moveId(list, id, dir) {
    const ids = list.map((x) => x.id);
    const i = ids.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return null;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    return ids;
  }
  const ordBtns = (id, i, n, kind) => `<div class="ord"><button class="icon-btn" data-move="${kind}" data-id="${id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Yukarı taşı">▲</button><button class="icon-btn" data-move="${kind}" data-id="${id}" data-dir="1" ${i === n - 1 ? 'disabled' : ''} aria-label="Aşağı taşı">▼</button></div>`;

  // ---------------------------------------------------------- Modal
  const modal = $('#modal');
  let modalResolve = null;
  function openModal(title, body, foot, small = false) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = body;
    $('#modal-foot').innerHTML = foot;
    $('.modal', modal).classList.toggle('sm', small);
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => { const f = $('#modal-body input:not([type=checkbox]):not([type=file]):not([type=radio]), #modal-body select'); if (f && matchMedia('(hover: hover)').matches) f.focus(); }, 50);
  }
  function closeModal(val) {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (modalResolve) { const r = modalResolve; modalResolve = null; r(val); }
  }
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(false); });
  function confirmBox(title, text, okLabel = 'Sil', danger = true) {
    openModal(title, `<p>${text}</p>`, `<button class="btn" data-close>Vazgeç</button><button class="btn ${danger ? 'danger fill' : 'primary'}" id="cf-ok">${okLabel}</button>`, true);
    $('#cf-ok').onclick = () => closeModal(true);
    return new Promise((res) => { modalResolve = res; });
  }

  // ---------------------------------------------------------- Görsel yükleme (istemcide küçültme)
  async function prepareImage(file) {
    if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) throw new Error('Lütfen bir görsel dosyası seçin');
    let bmp;
    try { bmp = await createImageBitmap(file); }
    catch { throw new Error('Bu görsel açılamadı. JPG, PNG veya WEBP deneyin.'); }
    const max = 1400;
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    const toBlob = (type, q) => new Promise((r) => cv.toBlob(r, type, q));
    let blob = await toBlob('image/webp', 0.85);
    if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg', 0.86);
    if (!blob) throw new Error('Görsel işlenemedi');
    return blob;
  }

  // ---------------------------------------------------------- Görünümler
  const TITLES = { products: 'Ürünler', categories: 'Kategoriler', announcements: 'Duyuru & Kampanyalar', qr: 'QR Kodlar', settings: 'Ayarlar' };
  function render() {
    $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    $('#view-title').textContent = TITLES[tab];
    const actions = $('#view-actions');
    actions.innerHTML = '';
    if (tab === 'products') actions.innerHTML = `<button class="btn accent" id="add-product">${ICON.plus} Yeni ürün</button>`;
    if (tab === 'categories') actions.innerHTML = `<button class="btn accent" id="add-cat">${ICON.plus} Yeni kategori</button>`;
    if (tab === 'announcements') actions.innerHTML = `<button class="btn accent" id="add-ann">${ICON.plus} Yeni duyuru</button>`;
    if (tab === 'qr') actions.innerHTML = '<button class="btn primary" id="print-qr">Yazdır</button>';
    if (tab === 'settings') actions.innerHTML = '<a class="btn sm mobile-only" href="/" target="_blank" rel="noopener">Menü ↗</a><button class="btn sm mobile-only" id="logout-m">Çıkış</button>';
    ({ products: viewProducts, categories: viewCategories, announcements: viewAnnouncements, qr: viewQr, settings: viewSettings })[tab]();
  }

  // ---- Ürünler
  function viewProducts() {
    const keepFocus = document.activeElement && document.activeElement.id === 'p-q';
    const cats = D.categories;
    let html = `<div class="toolbar"><input type="search" id="p-q" placeholder="Ürün ara…" value="${esc(ui.q)}">
      <select id="p-cat"><option value="all">Tüm kategoriler</option>${cats.map((c) => `<option value="${c.id}" ${String(ui.cat) === String(c.id) ? 'selected' : ''}>${esc(c.name_tr)} (${c.product_count})</option>`).join('')}</select></div>`;
    const nq = norm(ui.q);
    let shown = 0;
    for (const c of cats) {
      if (ui.cat !== 'all' && String(ui.cat) !== String(c.id)) continue;
      const all = D.products.filter((p) => p.category_id === c.id);
      const items = nq ? all.filter((p) => norm(`${p.name_tr} ${p.name_en}`).includes(nq)) : all;
      if (nq && !items.length) continue;
      shown += items.length;
      html += `<div class="group-h">${esc(c.name_tr)} <span class="cnt">${all.length} ürün</span>${c.is_active ? '' : '<span class="off-tag">Kategori gizli</span>'}</div>`;
      if (!items.length) { html += '<div class="list"><div class="empty-box">Bu kategoride ürün yok.</div></div>'; continue; }
      html += `<div class="list">${items.map((p, i) => `
        <div class="item${p.is_active ? '' : ' dim'}">
          ${nq ? '' : ordBtns(p.id, i, items.length, 'product')}
          <img class="thumb" src="${esc(imgSrc(p))}" alt="" loading="lazy">
          <div class="it-main"><div class="it-name">${esc(p.name_tr)}</div>
            <div class="tags">${p.is_popular ? '<span class="tag pop">★ Popüler</span>' : ''}${p.is_new ? '<span class="tag">Yeni</span>' : ''}${p.in_stock ? '' : '<span class="tag out">Stokta yok</span>'}${p.is_active ? '' : '<span class="tag off">Satışa kapalı</span>'}</div></div>
          <div class="item-act">
            <label class="price-wrap">₺<input class="price-in" inputmode="decimal" data-price="${p.id}" value="${tl(p.price_kurus)}" aria-label="${esc(p.name_tr)} fiyatı"></label>
            <div class="quick">
              <button class="icon-btn ${p.is_popular ? 'on star-on' : ''}" data-tog="is_popular" data-id="${p.id}" title="Popüler" aria-label="Popüler" aria-pressed="${!!p.is_popular}">${ICON.star}</button>
              <button class="icon-btn ${p.in_stock ? '' : 'bad'}" data-tog="in_stock" data-id="${p.id}" title="${p.in_stock ? 'Stokta – stokta yok yap' : 'Stokta yok – stoğa al'}" aria-label="Stok durumu">${p.in_stock ? ICON.box : ICON.boxOff}</button>
              <button class="icon-btn ${p.is_active ? '' : 'bad'}" data-tog="is_active" data-id="${p.id}" title="${p.is_active ? 'Satışta – geçici kapat' : 'Kapalı – satışa aç'}" aria-label="Satış durumu">${p.is_active ? ICON.eye : ICON.eyeOff}</button>
              <button class="icon-btn" data-edit-product="${p.id}" title="Düzenle" aria-label="Düzenle">${ICON.edit}</button>
            </div>
          </div>
        </div>`).join('')}</div>`;
    }
    if (nq && !shown) html += '<div class="empty-box">Sonuç bulunamadı.</div>';
    if (!cats.length) html += '<div class="empty-box">Önce bir kategori ekleyin.</div>';
    $('#view').innerHTML = html;
    if (keepFocus) { const i = $('#p-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }

  function productForm(p) {
    const isNew = !p;
    p = p || { category_id: ui.cat !== 'all' ? Number(ui.cat) : (D.categories[0] || {}).id, name_tr: '', name_en: '', desc_tr: '', desc_en: '',
      ingredients_tr: '', ingredients_en: '', price_kurus: null, calories: null, image: null, is_popular: 0, is_new: 1, is_active: 1, in_stock: 1 };
    let image = p.image;
    const body = `<form id="pf" novalidate>
      <div class="uploader" id="upl"><img id="upl-img" src="${esc(image ? `/uploads/${image}` : artOf(p.category_id))}" alt="">
        <div class="u-act"><b>Ürün fotoğrafı</b><span class="muted" style="font-size:12.5px">JPG, PNG, WEBP · otomatik küçültülür</span>
        <div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="btn sm" id="upl-btn">Fotoğraf seç</button><button type="button" class="btn sm danger" id="upl-rm" ${image ? '' : 'hidden'}>Kaldır</button></div>
        <input type="file" id="upl-file" accept="image/*"></div></div>
      <label class="field"><span>Kategori <span class="req">*</span></span><select name="category_id">${D.categories.map((c) => `<option value="${c.id}" ${c.id === p.category_id ? 'selected' : ''}>${esc(c.name_tr)}</option>`).join('')}</select></label>
      <div class="row2 stack"><label class="field"><span>Ürün adı (TR) <span class="req">*</span></span><input name="name_tr" value="${esc(p.name_tr)}" maxlength="120" required></label>
      <label class="field"><span>Ürün adı (EN)</span><input name="name_en" value="${esc(p.name_en)}" maxlength="120"></label></div>
      <div class="row2"><label class="field"><span>Fiyat (₺) <span class="req">*</span></span><input name="price" inputmode="decimal" value="${p.price_kurus == null ? '' : tl(p.price_kurus)}" placeholder="örn. 175" required></label>
      <label class="field"><span>Kalori (kcal)</span><input name="calories" inputmode="numeric" value="${p.calories ?? ''}" placeholder="isteğe bağlı"></label></div>
      <div class="row2 stack"><label class="field"><span>Kısa açıklama (TR)</span><textarea name="desc_tr" maxlength="600" rows="2">${esc(p.desc_tr)}</textarea></label>
      <label class="field"><span>Kısa açıklama (EN)</span><textarea name="desc_en" maxlength="600" rows="2">${esc(p.desc_en)}</textarea></label></div>
      <div class="row2 stack"><label class="field"><span>İçindekiler (TR)</span><textarea name="ingredients_tr" maxlength="600" rows="2" placeholder="Virgülle ayırın">${esc(p.ingredients_tr)}</textarea></label>
      <label class="field"><span>İçindekiler (EN)</span><textarea name="ingredients_en" maxlength="600" rows="2" placeholder="Comma separated">${esc(p.ingredients_en)}</textarea></label></div>
      <div class="toggles">${sw('is_active', 'Satışta', p.is_active)}${sw('in_stock', 'Stokta var', p.in_stock)}${sw('is_popular', 'Popüler', p.is_popular)}${sw('is_new', 'Yeni etiketi', p.is_new)}</div>
    </form>`;
    const foot = `${isNew ? '' : `<button class="btn danger" id="pf-del">${ICON.trash} Sil</button>`}<span class="spacer"></span><button class="btn" data-close>Vazgeç</button><button class="btn primary" id="pf-save">${isNew ? 'Ürünü ekle' : 'Kaydet'}</button>`;
    openModal(isNew ? 'Yeni ürün' : 'Ürünü düzenle', body, foot);

    const form = $('#pf');
    const setImg = (name) => {
      image = name;
      $('#upl-img').src = name ? `/uploads/${name}` : artOf(Number(form.category_id.value));
      $('#upl-rm').hidden = !name;
    };
    form.category_id.addEventListener('change', () => { if (!image) setImg(null); });
    $('#upl-btn').onclick = () => $('#upl-file').click();
    $('#upl-rm').onclick = () => setImg(null);
    $('#upl-file').onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const box = $('#upl');
      box.classList.add('busy');
      try {
        const blob = await prepareImage(f);
        const r = await api('POST', '/api/admin/upload', undefined, blob);
        setImg(r.image);
        toast('Fotoğraf yüklendi');
      } catch (err) { toast(err.message, true); } finally { box.classList.remove('busy'); e.target.value = ''; }
    };
    $('#pf-save').onclick = async () => {
      const d = formData(form);
      if (!d.name_tr.trim()) return toast('Ürün adı (TR) zorunlu', true);
      if (!String(d.price).trim()) return toast('Fiyat girin', true);
      d.image = image;
      const btn = $('#pf-save');
      btn.disabled = true;
      const ok = await act(() => (isNew ? api('POST', '/api/admin/products', d) : api('PUT', `/api/admin/products/${p.id}`, d)), isNew ? 'Ürün eklendi' : 'Değişiklikler kaydedildi');
      btn.disabled = false;
      if (ok) closeModal(true);
    };
    if (!isNew) {
      $('#pf-del').onclick = async () => {
        if (await confirmBox('Ürünü sil', `<b>${esc(p.name_tr)}</b> kalıcı olarak silinecek. Emin misiniz?`)) {
          await act(() => api('DELETE', `/api/admin/products/${p.id}`), 'Ürün silindi');
        }
      };
    }
  }

  // ---- Kategoriler
  function viewCategories() {
    const cats = D.categories;
    $('#view').innerHTML = cats.length ? `<div class="list">${cats.map((c, i) => `
      <div class="item${c.is_active ? '' : ' dim'}">
        ${ordBtns(c.id, i, cats.length, 'category')}
        <img class="thumb" src="/art/${esc(c.art)}.svg" alt="">
        <div class="it-main"><div class="it-name">${esc(c.name_tr)}</div><div class="it-sub">${esc(c.name_en || '—')} · ${c.product_count} ürün</div>
          ${c.is_active ? '' : '<div class="tags"><span class="tag off">Menüde gizli</span></div>'}</div>
        <div class="item-act"><span></span><div class="quick">
          <button class="icon-btn ${c.is_active ? '' : 'bad'}" data-cat-tog="${c.id}" title="${c.is_active ? 'Menüde görünür – gizle' : 'Gizli – göster'}" aria-label="Görünürlük">${c.is_active ? ICON.eye : ICON.eyeOff}</button>
          <button class="icon-btn" data-edit-cat="${c.id}" title="Düzenle" aria-label="Düzenle">${ICON.edit}</button>
          <button class="icon-btn" data-del-cat="${c.id}" title="Sil" aria-label="Sil">${ICON.trash}</button></div></div>
      </div>`).join('')}</div><p class="muted" style="margin-top:12px">Sıralamayı ▲▼ ile değiştirin; menüdeki kategori sırası anında güncellenir.</p>`
      : '<div class="empty-box">Henüz kategori yok.</div>';
  }
  function catForm(c) {
    const isNew = !c;
    c = c || { name_tr: '', name_en: '', art: 'hot-coffee', is_active: 1 };
    openModal(isNew ? 'Yeni kategori' : 'Kategoriyi düzenle', `<form id="cf" novalidate>
      <div class="row2 stack"><label class="field"><span>Kategori adı (TR) <span class="req">*</span></span><input name="name_tr" value="${esc(c.name_tr)}" maxlength="60"></label>
      <label class="field"><span>Kategori adı (EN)</span><input name="name_en" value="${esc(c.name_en)}" maxlength="60"></label></div>
      <div class="field"><span>Varsayılan görsel</span><small style="margin:0 0 8px">Fotoğrafı olmayan ürünlerde bu illüstrasyon gösterilir.</small>
        <div class="art-pick">${ARTS.map(([k, n]) => `<label title="${n}"><input type="radio" name="art" value="${k}" ${c.art === k ? 'checked' : ''}><img src="/art/${k}.svg" alt="${n}"></label>`).join('')}</div></div>
      <div class="toggles" style="grid-template-columns:1fr">${sw('is_active', 'Menüde göster', c.is_active)}</div></form>`,
    `<span class="spacer"></span><button class="btn" data-close>Vazgeç</button><button class="btn primary" id="cf-save">${isNew ? 'Ekle' : 'Kaydet'}</button>`);
    $('#cf-save').onclick = async () => {
      const d = formData($('#cf'));
      if (!d.name_tr.trim()) return toast('Kategori adı zorunlu', true);
      const ok = await act(() => (isNew ? api('POST', '/api/admin/categories', d) : api('PUT', `/api/admin/categories/${c.id}`, d)), isNew ? 'Kategori eklendi' : 'Kategori güncellendi');
      if (ok) closeModal(true);
    };
  }
  async function deleteCat(c) {
    if (!c.product_count) {
      if (await confirmBox('Kategoriyi sil', `<b>${esc(c.name_tr)}</b> kategorisi silinecek.`)) await act(() => api('DELETE', `/api/admin/categories/${c.id}`), 'Kategori silindi');
      return;
    }
    const others = D.categories.filter((x) => x.id !== c.id);
    openModal('Kategoriyi sil', `<p><b>${esc(c.name_tr)}</b> kategorisinde <b>${c.product_count} ürün</b> var. Ürünlere ne olsun?</p>
      <form id="dc">${others.length ? `<label class="field"><span><input type="radio" name="mode" value="move" checked> Ürünleri şu kategoriye taşı:</span>
        <select name="target">${others.map((o) => `<option value="${o.id}">${esc(o.name_tr)}</option>`).join('')}</select></label>` : ''}
      <label class="field"><span><input type="radio" name="mode" value="force" ${others.length ? '' : 'checked'}> Ürünleri de kalıcı olarak sil</span></label></form>`,
    '<span class="spacer"></span><button class="btn" data-close>Vazgeç</button><button class="btn danger fill" id="dc-ok">Kategoriyi sil</button>', true);
    $('#dc-ok').onclick = async () => {
      const d = formData($('#dc'));
      const q = d.mode === 'move' ? `move_to=${d.target}` : 'force=1';
      const ok = await act(() => api('DELETE', `/api/admin/categories/${c.id}?${q}`), d.mode === 'move' ? 'Ürünler taşındı, kategori silindi' : 'Kategori ve ürünleri silindi');
      if (ok) closeModal(true);
    };
  }

  // ---- Duyurular
  function annStatus(a) {
    const today = new Date().toLocaleDateString('sv-SE');
    if (!a.is_active) return '<span class="tag off">Pasif</span>';
    if (a.starts_at && a.starts_at > today) return `<span class="tag">${a.starts_at} başlar</span>`;
    if (a.ends_at && a.ends_at < today) return '<span class="tag out">Süresi doldu</span>';
    return '<span class="tag pop">Yayında</span>';
  }
  function viewAnnouncements() {
    const list = D.announcements;
    $('#view').innerHTML = `<p class="muted" style="margin-top:0">Duyuru ve kampanyalar menünün en üstünde kayan kartlar olarak görünür. Tarih aralığı verirseniz otomatik açılıp kapanır.</p>` + (list.length ? `<div class="list">${list.map((a, i) => `
      <div class="item${a.is_active ? '' : ' dim'}">
        ${ordBtns(a.id, i, list.length, 'announcement')}
        <div class="it-main"><div class="it-name">${esc(a.title_tr)}</div><div class="it-sub">${esc(a.body_tr || '')}</div>
          <div class="tags">${a.kind === 'campaign' ? '<span class="tag camp">Kampanya</span>' : '<span class="tag">Duyuru</span>'}${annStatus(a)}${a.ends_at ? `<span class="tag">Bitiş: ${esc(a.ends_at)}</span>` : ''}</div></div>
        <div class="item-act"><span></span><div class="quick">
          <button class="icon-btn ${a.is_active ? '' : 'bad'}" data-ann-tog="${a.id}" title="${a.is_active ? 'Yayında – durdur' : 'Pasif – yayınla'}" aria-label="Yayın durumu">${a.is_active ? ICON.eye : ICON.eyeOff}</button>
          <button class="icon-btn" data-edit-ann="${a.id}" aria-label="Düzenle">${ICON.edit}</button>
          <button class="icon-btn" data-del-ann="${a.id}" aria-label="Sil">${ICON.trash}</button></div></div>
      </div>`).join('')}</div>` : '<div class="empty-box">Henüz duyuru yok.</div>');
  }
  function annForm(a) {
    const isNew = !a;
    a = a || { kind: 'campaign', title_tr: '', title_en: '', body_tr: '', body_en: '', starts_at: '', ends_at: '', is_active: 1 };
    openModal(isNew ? 'Yeni duyuru / kampanya' : 'Duyuruyu düzenle', `<form id="af" novalidate>
      <label class="field"><span>Tür</span><select name="kind"><option value="campaign" ${a.kind === 'campaign' ? 'selected' : ''}>Kampanya (karamel kart)</option><option value="info" ${a.kind === 'info' ? 'selected' : ''}>Duyuru (koyu kart)</option></select></label>
      <div class="row2 stack"><label class="field"><span>Başlık (TR) <span class="req">*</span></span><input name="title_tr" value="${esc(a.title_tr)}" maxlength="120"></label>
      <label class="field"><span>Başlık (EN)</span><input name="title_en" value="${esc(a.title_en)}" maxlength="120"></label></div>
      <div class="row2 stack"><label class="field"><span>Metin (TR)</span><textarea name="body_tr" maxlength="400" rows="2">${esc(a.body_tr)}</textarea></label>
      <label class="field"><span>Metin (EN)</span><textarea name="body_en" maxlength="400" rows="2">${esc(a.body_en)}</textarea></label></div>
      <div class="row2"><label class="field"><span>Başlangıç</span><input type="date" name="starts_at" value="${esc(a.starts_at || '')}"></label>
      <label class="field"><span>Bitiş</span><input type="date" name="ends_at" value="${esc(a.ends_at || '')}"></label></div>
      <div class="toggles" style="grid-template-columns:1fr">${sw('is_active', 'Yayında', a.is_active)}</div></form>`,
    `<span class="spacer"></span><button class="btn" data-close>Vazgeç</button><button class="btn primary" id="af-save">${isNew ? 'Ekle' : 'Kaydet'}</button>`);
    $('#af-save').onclick = async () => {
      const d = formData($('#af'));
      if (!d.title_tr.trim()) return toast('Başlık zorunlu', true);
      if (d.starts_at && d.ends_at && d.ends_at < d.starts_at) return toast('Bitiş tarihi başlangıçtan önce olamaz', true);
      const ok = await act(() => (isNew ? api('POST', '/api/admin/announcements', d) : api('PUT', `/api/admin/announcements/${a.id}`, d)), 'Kaydedildi');
      if (ok) closeModal(true);
    };
  }

  // ---- QR
  function viewQr() {
    const base = D.base_url_effective;
    const n = Number(D.settings.table_count || 0);
    const tables = Array.from({ length: n }, (_, i) => i + 1);
    const nocache = Date.now();
    $('#view').innerHTML = `
      <div class="panel no-print"><h3>Genel menü QR kodu</h3>
        <div class="qr-main"><img src="/qr/menu.svg?t=${nocache}" alt="Menü QR kodu">
          <div style="flex:1;min-width:220px"><p class="muted" style="margin-top:0">Bu kod menünün ana adresine gider:</p>
          <div class="url-box">${esc(base)}/</div>
          ${D.settings.base_url ? '' : `<p class="muted" style="font-size:12.5px">Not: Kalıcı alan adınızı <b>Ayarlar › Site adresi</b> alanına yazın. QR kodlar her zaman o adrese yönlenir.</p>`}
          <a class="btn sm" href="/qr/menu.svg?download=1">SVG indir</a></div></div></div>
      <div class="panel no-print"><h3>Masa QR kodları</h3>
        <p class="muted" style="margin-top:0">Her masa için kalıcı bağlantı: <span class="url-box" style="display:inline-block;padding:2px 6px">${esc(base)}/masa/1</span> — müşteri menüde masa numarasını görür ve WhatsApp mesajına eklenir.</p>
        <form id="tf" class="toolbar" style="align-items:flex-end"><label class="field" style="margin:0;flex:0 1 180px"><span>Masa sayısı</span><input name="table_count" type="number" min="0" max="200" value="${n}"></label>
          <button class="btn primary" type="submit">Güncelle</button></form>
        ${n ? `<div class="qr-grid">${tables.map((t) => `<div class="qr-card"><img src="/qr/masa-${t}.svg?t=${nocache}" alt="Masa ${t} QR" loading="lazy"><b>Masa ${t}</b>
          <div class="acts"><a class="btn sm" href="/qr/masa-${t}.svg?download=1">İndir</a><a class="btn sm ghost" href="/masa/${t}" target="_blank" rel="noopener">Aç</a></div></div>`).join('')}</div>` : '<div class="empty-box">Masa sayısı girin.</div>'}
      </div>
      <div class="print-only"><div class="print-sheet">${['', ...tables].map((t) => `<div class="tent"><div class="tn">${esc(D.settings.cafe_name)}</div><div class="ts">${esc(D.settings.slogan_tr)}</div>
        <img src="/qr/${t ? `masa-${t}` : 'menu'}.svg?t=${nocache}" alt=""><div class="tt">${t ? `Masa ${t}` : 'Menü'}</div><div class="th">Menü için kameranızla okutun</div></div>`).join('')}</div></div>`;
  }

  // ---- Ayarlar
  function viewSettings() {
    const s = D.settings;
    const f = (k, label, ph = '', hint = '', type = 'text') => `<label class="field"><span>${label}</span><input type="${type}" name="${k}" value="${esc(s[k] || '')}" placeholder="${esc(ph)}">${hint ? `<small>${hint}</small>` : ''}</label>`;
    $('#view').innerHTML = `
      <form class="panel" id="sf"><h3>İşletme bilgileri</h3>
        <div class="row2 stack">${f('cafe_name', 'İşletme adı')}${f('hours', 'Çalışma saatleri', '08:00 – 23:00')}</div>
        <div class="row2 stack">${f('slogan_tr', 'Slogan (TR)')}${f('slogan_en', 'Slogan (EN)')}</div>
        <div class="row2 stack">${f('whatsapp', 'WhatsApp numarası', '905XXXXXXXXX', 'Ülke koduyla, boşluksuz (örn. 905321234567). Boş bırakırsanız buton gizlenir.', 'tel')}${f('phone', 'Telefon', '0212 000 00 00', '', 'tel')}</div>
        <div class="row2 stack">${f('instagram', 'Instagram kullanıcı adı', 'demcafe')}${f('address', 'Adres')}</div>
        ${f('base_url', 'Site adresi (QR kodlar için)', 'https://menu.demcafe.com', 'QR kodlar bu adrese yönlenir. Alan adınız kesinleşince girin ve sonra QR’ları yazdırın.', 'url')}
        <label class="field"><span>Arama motoru açıklaması (SEO)</span><textarea name="seo_description" maxlength="300" rows="2">${esc(s.seo_description || '')}</textarea></label>
        <button class="btn primary" type="submit">Kaydet</button></form>
      <form class="panel" id="pwf" autocomplete="off"><h3>Parola değiştir</h3>
        <div class="row2 stack"><label class="field"><span>Mevcut parola</span><input type="password" name="current" autocomplete="current-password"></label>
        <label class="field"><span>Yeni parola</span><input type="password" name="next" autocomplete="new-password" minlength="8"><small>En az 8 karakter. Diğer cihazlardaki oturumlar kapatılır.</small></label></div>
        <button class="btn" type="submit">Parolayı güncelle</button></form>`;
  }

  // ---------------------------------------------------------- Olay yönetimi
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('button, a');
    if (!b) return;
    if (b.closest('#tabs')) { tab = b.dataset.tab; render(); scrollTo(0, 0); return; }
    if (b.id === 'logout' || b.id === 'logout-m') { try { await api('POST', '/api/admin/logout', {}); } catch { /* yoksay */ } showLogin(); return; }
    if (b.id === 'add-product') { if (!D.categories.length) return toast('Önce bir kategori ekleyin', true); return productForm(null); }
    if (b.id === 'add-cat') return catForm(null);
    if (b.id === 'add-ann') return annForm(null);
    if (b.id === 'print-qr') return window.print();
    const id = Number(b.dataset.id || b.dataset.editProduct || b.dataset.editCat || b.dataset.delCat || b.dataset.catTog || b.dataset.editAnn || b.dataset.delAnn || b.dataset.annTog || 0);
    if (b.dataset.editProduct) return productForm(D.products.find((p) => p.id === id));
    if (b.dataset.tog) {
      const p = D.products.find((x) => x.id === id);
      const k = b.dataset.tog;
      const msgs = { is_popular: ['Popülerden çıkarıldı', 'Popüler olarak işaretlendi'], in_stock: ['Stokta yok olarak işaretlendi', 'Tekrar stokta'], is_active: ['Satışa geçici olarak kapatıldı', 'Satışa açıldı'] };
      const v = p[k] ? 0 : 1;
      return act(() => api('PATCH', `/api/admin/products/${id}`, { [k]: v }), msgs[k][v]);
    }
    if (b.dataset.move) {
      const dir = Number(b.dataset.dir);
      if (b.dataset.move === 'product') {
        const p = D.products.find((x) => x.id === id);
        const ids = moveId(D.products.filter((x) => x.category_id === p.category_id), id, dir);
        if (ids) return act(() => api('POST', '/api/admin/products/reorder', { ids }));
      } else if (b.dataset.move === 'category') {
        const ids = moveId(D.categories, id, dir);
        if (ids) return act(() => api('POST', '/api/admin/categories/reorder', { ids }));
      } else {
        const ids = moveId(D.announcements, id, dir);
        if (ids) return act(() => api('POST', '/api/admin/announcements/reorder', { ids }));
      }
      return;
    }
    if (b.dataset.editCat) return catForm(D.categories.find((c) => c.id === id));
    if (b.dataset.delCat) return deleteCat(D.categories.find((c) => c.id === id));
    if (b.dataset.catTog) {
      const c = D.categories.find((x) => x.id === id);
      return act(() => api('PUT', `/api/admin/categories/${id}`, { is_active: c.is_active ? 0 : 1 }), c.is_active ? 'Kategori menüde gizlendi' : 'Kategori menüde gösteriliyor');
    }
    if (b.dataset.editAnn) return annForm(D.announcements.find((a) => a.id === id));
    if (b.dataset.annTog) {
      const a = D.announcements.find((x) => x.id === id);
      return act(() => api('PUT', `/api/admin/announcements/${id}`, { ...a, is_active: a.is_active ? 0 : 1 }), a.is_active ? 'Yayından kaldırıldı' : 'Yayınlandı');
    }
    if (b.dataset.delAnn) {
      const a = D.announcements.find((x) => x.id === id);
      if (await confirmBox('Duyuruyu sil', `<b>${esc(a.title_tr)}</b> silinecek.`)) await act(() => api('DELETE', `/api/admin/announcements/${id}`), 'Duyuru silindi');
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'p-q') { ui.q = e.target.value; viewProducts(); }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'p-cat') { ui.cat = e.target.value; viewProducts(); }
    if (e.target.dataset.price) savePrice(e.target);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.price) { e.preventDefault(); e.target.blur(); }
  });
  async function savePrice(input) {
    const id = Number(input.dataset.price);
    const p = D.products.find((x) => x.id === id);
    if (!input.value.trim()) { input.value = tl(p.price_kurus); return; }
    await act(() => api('PATCH', `/api/admin/products/${id}`, { price: input.value }), `${p.name_tr}: fiyat güncellendi`);
  }

  document.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.id === 'login-form') {
      const d = formData(f);
      const btn = $('button[type=submit]', f);
      btn.disabled = true;
      $('#login-err').textContent = '';
      try { await api('POST', '/api/admin/login', d); f.reset(); await start(); }
      catch (err) { $('#login-err').textContent = err.message; }
      finally { btn.disabled = false; }
    } else if (f.id === 'sf') {
      await act(() => api('PUT', '/api/admin/settings', formData(f)), 'Ayarlar kaydedildi');
    } else if (f.id === 'tf') {
      await act(() => api('PUT', '/api/admin/settings', formData(f)), 'Masa sayısı güncellendi');
    } else if (f.id === 'pwf') {
      const d = formData(f);
      if ((d.next || '').length < 8) return toast('Yeni parola en az 8 karakter olmalı', true);
      try { await api('POST', '/api/admin/password', d); f.reset(); toast('Parola güncellendi'); } catch (err) { toast(err.message, true); }
    }
  });

  // ---------------------------------------------------------- Başlat
  function showLogin() {
    $('#app').hidden = true;
    $('#login').hidden = false;
    closeModal(false);
  }
  async function start() {
    try {
      await load();
      $('#login').hidden = true;
      $('#app').hidden = false;
      render();
    } catch { showLogin(); }
  }
  start();
})();
