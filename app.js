/* DEM CAFE – müşteri menüsü */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* gizli mod */ } },
  };

  const T = {
    tr: {
      search: 'Menüde ara…', featured: 'Öne Çıkanlar', featuredSub: 'En sevilenler', fresh: 'Yeni Eklenenler', freshSub: 'Menüde yeni',
      popular: 'Popüler', new: 'Yeni', out: 'Tükendi', results: (n, q) => `<b>“${esc(q)}”</b> için ${n} sonuç`,
      none: 'Aradığınız ürünü bulamadık', noneSub: 'Farklı bir kelime deneyin.', ingredients: 'İçindekiler', outNote: 'Bu ürün şu anda tükendi.',
      table: (n) => `Masa ${n}`, wa: 'Bize yazın', waMsg: (t) => `Merhaba DEM CAFE${t ? ` (Masa ${t})` : ''}, `, hours: 'Çalışma saatleri',
      updated: 'Menü güncellendi', campaign: 'Kampanya', info: 'Duyuru', items: 'ürün', clear: 'Aramayı temizle', close: 'Kapat',
    },
    en: {
      search: 'Search the menu…', featured: 'Featured', featuredSub: 'Guest favourites', fresh: 'New Arrivals', freshSub: 'Just added',
      popular: 'Popular', new: 'New', out: 'Sold out', results: (n, q) => `${n} result${n === 1 ? '' : 's'} for <b>“${esc(q)}”</b>`,
      none: 'No matching items', noneSub: 'Try a different word.', ingredients: 'Ingredients', outNote: 'This item is currently sold out.',
      table: (n) => `Table ${n}`, wa: 'Message us', waMsg: (t) => `Hello DEM CAFE${t ? ` (Table ${t})` : ''}, `, hours: 'Opening hours',
      updated: 'Menu updated', campaign: 'Offer', info: 'News', items: 'items', clear: 'Clear search', close: 'Close',
    },
  };

  // ---------------------------------------------------------- Durum
  let data = JSON.parse($('#menu-data').textContent);
  const params = new URLSearchParams(location.search);
  const table = (location.pathname.match(/^\/masa\/(\d{1,3})/) || [])[1] || params.get('masa') || '';
  let lang = params.get('lang') || store.get('dem_lang') || 'tr';
  if (!T[lang]) lang = 'tr';
  let query = '';
  const t = () => T[lang];

  const catById = () => new Map(data.categories.map((c) => [c.id, c]));
  const imgOf = (p, cats = catById()) => p.img || `/art/${(cats.get(p.c) || {}).art || 'hot-coffee'}.svg`;
  const price = (k) => {
    const v = (k / 100).toLocaleString('tr-TR', { minimumFractionDigits: k % 100 ? 2 : 0, maximumFractionDigits: 2 });
    return `<span class="price"><small>${esc(data.settings.currency || '₺')}</small>${v}</span>`;
  };
  const norm = (s) => String(s || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  // ---------------------------------------------------------- Açılış ekranı
  const splash = $('#splash');
  let seen = false;
  try { seen = sessionStorage.getItem('dem_splash') === '1'; sessionStorage.setItem('dem_splash', '1'); } catch { /* yoksay */ }
  if (seen || matchMedia('(prefers-reduced-motion: reduce)').matches) splash.classList.add('gone');
  else setTimeout(() => { splash.classList.add('out'); setTimeout(() => splash.classList.add('gone'), 650); }, 1250);

  // ---------------------------------------------------------- Çizim
  const badges = (p) => {
    const b = [];
    if (!p.stock) b.push(`<span class="badge out">${t().out}</span>`);
    else {
      if (p.pop) b.push(`<span class="badge">★ ${t().popular}</span>`);
      if (p.new) b.push(`<span class="badge new">${t().new}</span>`);
    }
    return b.length ? `<div class="badges">${b.join('')}</div>` : '';
  };
  const highlight = (text) => {
    if (!query) return esc(text);
    const nq = norm(query);
    const nt = norm(text);
    const i = nt.indexOf(nq);
    // Basit eşleme: normalize edilmiş metin aynı uzunluktaysa vurgula
    if (i < 0 || nt.length !== String(text).length) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + nq.length)) + '</mark>' + esc(text.slice(i + nq.length));
  };
  const chev = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';

  function card(p, cats) {
    return `<button type="button" class="card${p.stock ? '' : ' is-out'}" data-id="${p.id}">
      <div class="ph"><img src="${esc(imgOf(p, cats))}" alt="${esc(p.name[lang])}" width="104" height="104" loading="lazy" decoding="async">${badges(p)}</div>
      <div class="bd"><div class="nm">${highlight(p.name[lang])}</div><div class="ds">${esc(p.desc[lang])}</div>
      <div class="ft">${price(p.price)}<span class="more">${chev}</span></div></div></button>`;
  }
  function feat(p, cats, sm) {
    return `<button type="button" class="feat${sm ? ' sm' : ''}${p.stock ? '' : ' is-out'}" data-id="${p.id}">
      <div class="ph"><img src="${esc(imgOf(p, cats))}" alt="${esc(p.name[lang])}" width="250" height="188" loading="lazy" decoding="async">${badges(p)}</div>
      <div class="bd"><div class="nm">${esc(p.name[lang])}</div><div class="pr">${price(p.price)}</div></div></button>`;
  }

  function renderStatic() {
    const s = data.settings;
    document.documentElement.lang = lang;
    $('#brand-name').textContent = s.cafe_name || 'DEM CAFE';
    $('#brand-slogan').textContent = (lang === 'en' ? s.slogan_en : s.slogan_tr) || s.slogan_tr || '';
    $('#splash-slogan').textContent = s.slogan_tr || '';
    $('#q').placeholder = t().search;
    $('#q').setAttribute('aria-label', t().search);
    $('#q-clear').setAttribute('aria-label', t().clear);
    $('.sheet-close').setAttribute('aria-label', t().close);
    document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    const chip = $('#table-chip');
    chip.hidden = !table;
    chip.textContent = table ? t().table(table) : '';
    const wa = $('#wa');
    if (s.whatsapp) {
      wa.hidden = false;
      wa.href = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(t().waMsg(table))}`;
      $('#wa-label').textContent = t().wa;
    } else wa.hidden = true;
    const foot = [];
    foot.push(`<div class="nm">${esc(s.cafe_name)}</div>`);
    if (s.hours) foot.push(`<p>${t().hours}: <b>${esc(s.hours)}</b></p>`);
    if (s.address) foot.push(`<p>${esc(s.address)}</p>`);
    const links = [];
    if (s.phone) links.push(`<a href="tel:${esc(s.phone.replace(/[^\d+]/g, ''))}">${esc(s.phone)}</a>`);
    if (s.instagram) links.push(`<a href="https://instagram.com/${esc(s.instagram)}" target="_blank" rel="noopener">@${esc(s.instagram)}</a>`);
    if (links.length) foot.push(`<p>${links.join(' · ')}</p>`);
    $('#foot').innerHTML = foot.join('');
  }

  function renderChips() {
    const counts = new Map();
    data.products.forEach((p) => counts.set(p.c, (counts.get(p.c) || 0) + 1));
    $('#chips').innerHTML = data.categories.filter((c) => counts.get(c.id))
      .map((c) => `<button type="button" class="chip" data-cat="${c.id}">${esc(c.name[lang])}</button>`).join('');
  }

  function renderMenu() {
    const cats = catById();
    const main = $('#main');
    if (query) return renderSearch(cats);
    $('#chips').classList.remove('hide');
    let html = '';
    if (data.ann.length) {
      html += `<section class="block" aria-label="${t().campaign}"><div class="rail">${data.ann.map((a) => `<article class="ann ${a.kind === 'campaign' ? '' : 'info'}">
        <span class="tag">${a.kind === 'campaign' ? t().campaign : t().info}</span><h3>${esc(a.title[lang])}</h3>${a.body[lang] ? `<p>${esc(a.body[lang])}</p>` : ''}</article>`).join('')}</div></section>`;
    }
    const pop = data.products.filter((p) => p.pop && p.stock);
    if (pop.length) {
      html += `<section class="block"><div class="block-h"><h2>${t().featured}</h2><span class="sub">${t().featuredSub}</span></div>
        <div class="rail">${pop.map((p) => feat(p, cats)).join('')}</div></section>`;
    }
    const fresh = data.products.filter((p) => p.new && p.stock);
    if (fresh.length) {
      html += `<section class="block"><div class="block-h"><h2>${t().fresh}</h2><span class="sub">${t().freshSub}</span></div>
        <div class="rail">${fresh.map((p) => feat(p, cats, true)).join('')}</div></section>`;
    }
    for (const c of data.categories) {
      const items = data.products.filter((p) => p.c === c.id);
      if (!items.length) continue;
      html += `<section class="sec" id="k-${esc(c.slug)}" data-cat="${c.id}"><div class="sec-h"><h2>${esc(c.name[lang])}</h2><span class="n">${items.length}</span></div>
        <div class="grid">${items.map((p) => card(p, cats)).join('')}</div></section>`;
    }
    main.innerHTML = html;
    observeSections();
  }

  function renderSearch(cats) {
    $('#chips').classList.add('hide');
    const nq = norm(query);
    const words = nq.split(' ').filter(Boolean);
    const scored = [];
    for (const p of data.products) {
      const cat = cats.get(p.c);
      const name = norm(`${p.name.tr} ${p.name.en}`);
      const hay = `${name} ${norm(`${p.desc.tr} ${p.desc.en} ${p.ing.tr} ${p.ing.en} ${cat ? cat.name.tr + ' ' + cat.name.en : ''}`)}`;
      if (!words.every((w) => hay.includes(w))) continue;
      const score = (name.startsWith(nq) ? 0 : name.includes(nq) ? 1 : 2);
      scored.push([score, p]);
    }
    scored.sort((a, b) => a[0] - b[0]);
    $('#main').innerHTML = scored.length
      ? `<div class="results-h">${t().results(scored.length, query)}</div><div class="grid">${scored.map(([, p]) => card(p, cats)).join('')}</div>`
      : `<div class="empty"><div class="ic">?</div><div><b>${t().none}</b></div><div>${t().noneSub}</div></div>`;
  }

  function renderAll() { renderStatic(); renderChips(); renderMenu(); }

  // ---------------------------------------------------------- Kategori takibi
  let io;
  let lockSpy = 0;
  function setActiveChip(id, scroll = true) {
    document.querySelectorAll('.chip').forEach((ch) => {
      const on = ch.dataset.cat === String(id);
      ch.classList.toggle('on', on);
      if (on && scroll) {
        const box = $('#chips');
        box.scrollTo({ left: ch.offsetLeft - box.clientWidth / 2 + ch.clientWidth / 2, behavior: 'smooth' });
      }
    });
  }
  function observeSections() {
    if (io) io.disconnect();
    if (!('IntersectionObserver' in window)) return;
    io = new IntersectionObserver((entries) => {
      if (Date.now() < lockSpy) return;
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActiveChip(vis.target.dataset.cat);
    }, { rootMargin: '-140px 0px -55% 0px' });
    document.querySelectorAll('.sec').forEach((s) => io.observe(s));
  }

  // ---------------------------------------------------------- Ürün detayı
  const sheet = $('#sheet');
  let lastFocus = null;
  let pushed = false;
  function openProduct(id, push = true) {
    const p = data.products.find((x) => x.id === Number(id));
    if (!p) return;
    const cats = catById();
    const cat = cats.get(p.c);
    const ings = (p.ing[lang] || '').split(/[,،]/).map((s) => s.trim()).filter(Boolean);
    $('#sheet-body').innerHTML = `
      <div class="sheet-img"><img src="${esc(imgOf(p, cats))}" alt="${esc(p.name[lang])}">${badges(p)}</div>
      <div class="sheet-bd">
        ${cat ? `<div class="sheet-cat">${esc(cat.name[lang])}</div>` : ''}
        <h2 id="sheet-title">${esc(p.name[lang])}</h2>
        ${p.desc[lang] ? `<p class="sheet-desc">${esc(p.desc[lang])}</p>` : ''}
        <div class="sheet-row">${price(p.price)}${p.kcal ? `<span class="kcal">${p.kcal} kcal</span>` : ''}</div>
        ${p.stock ? '' : `<div class="out-note">${t().outNote}</div>`}
        ${ings.length ? `<div class="sheet-sec"><h3>${t().ingredients}</h3><div class="ings">${ings.map((i) => `<span>${esc(i)}</span>`).join('')}</div></div>` : ''}
      </div>`;
    lastFocus = document.activeElement;
    sheet.hidden = false;
    sheet.classList.remove('closing');
    $('.sheet', sheet).classList.remove('closing');
    $('.sheet', sheet).scrollTop = 0;
    document.body.style.overflow = 'hidden';
    $('.sheet', sheet).focus({ preventScroll: true });
    if (push) { history.pushState({ product: p.id }, '', `#urun-${p.id}`); pushed = true; }
  }
  function closeSheet(fromPop = false) {
    if (sheet.hidden) return;
    if (!fromPop && pushed) { pushed = false; history.back(); return; }
    if (!fromPop && location.hash) history.replaceState(null, '', location.pathname + location.search);
    pushed = false;
    sheet.classList.add('closing');
    $('.sheet', sheet).classList.add('closing');
    setTimeout(() => { sheet.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus({ preventScroll: true }); }, 230);
  }
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.product) openProduct(e.state.product, false);
    else closeSheet(true);
  });
  sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  // Aşağı kaydırarak kapatma
  (() => {
    const el = $('.sheet', sheet);
    let y0 = null, dy = 0;
    el.addEventListener('touchstart', (e) => { y0 = el.scrollTop <= 0 ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0) el.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    el.addEventListener('touchend', () => {
      el.style.transform = '';
      if (y0 != null && dy > 110) closeSheet();
      y0 = null;
    });
  })();

  // ---------------------------------------------------------- Olaylar
  document.addEventListener('click', (e) => {
    const prod = e.target.closest('[data-id]');
    if (prod && !e.target.closest('#sheet')) return openProduct(prod.dataset.id);
    const chip = e.target.closest('.chip');
    if (chip) {
      const sec = document.querySelector(`.sec[data-cat="${chip.dataset.cat}"]`);
      if (sec) {
        lockSpy = Date.now() + 900;
        setActiveChip(chip.dataset.cat);
        sec.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      }
    }
    const lb = e.target.closest('.lang button');
    if (lb && lb.dataset.lang !== lang) {
      lang = lb.dataset.lang;
      store.set('dem_lang', lang);
      renderAll();
    }
  });

  const q = $('#q');
  let qTimer;
  q.addEventListener('input', () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      const wasSearching = !!query;
      query = q.value.trim();
      $('#q-clear').hidden = !query;
      renderMenu();
      if (query && !wasSearching) {
        const bar = $('#bar');
        const top = bar.getBoundingClientRect().top + scrollY;
        if (Math.abs(scrollY - top) > 4) scrollTo({ top, behavior: 'auto' });
      }
    }, 90);
  });
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') q.blur(); });
  $('#q-clear').addEventListener('click', () => { q.value = ''; q.dispatchEvent(new Event('input')); q.focus(); });

  // Yapışkan çubuk gölgesi + WhatsApp küçültme
  const bar = $('#bar');
  const wa = $('#wa');
  const onScroll = () => {
    const stuck = bar.getBoundingClientRect().top <= 0.5;
    bar.classList.toggle('stuck', stuck);
    wa.classList.toggle('mini', scrollY > 400);
  };
  addEventListener('scroll', onScroll, { passive: true });

  // ---------------------------------------------------------- Canlı güncelleme
  let etag = `"${data.v}"`;
  let fetching = false;
  async function refresh(announce) {
    if (fetching) return;
    fetching = true;
    try {
      const r = await fetch('/api/menu', { headers: { 'If-None-Match': etag }, cache: 'no-cache' });
      if (r.status === 200) {
        data = await r.json();
        etag = r.headers.get('ETag') || `"${data.v}"`;
        const y = scrollY;
        renderAll();
        scrollTo(0, y);
        if (announce) toast(t().updated);
        if (!sheet.hidden && history.state && history.state.product) {
          if (data.products.some((p) => p.id === history.state.product)) openProduct(history.state.product, false);
          else closeSheet();
        }
      }
    } catch { /* çevrimdışı */ } finally { fetching = false; }
  }
  let firstEvt = true;
  function connect() {
    if (!('EventSource' in window)) { setInterval(() => refresh(true), 30000); return; }
    const es = new EventSource('/api/events');
    es.addEventListener('menu', () => {
      if (firstEvt) { firstEvt = false; refresh(false); return; }
      refresh(true);
    });
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(false); });

  let toastT;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ---------------------------------------------------------- Başlat
  renderAll();
  onScroll();
  connect();
  const m = location.hash.match(/^#urun-(\d+)$/);
  if (m) { history.replaceState({ product: Number(m[1]) }, ''); openProduct(m[1], false); }
})();
