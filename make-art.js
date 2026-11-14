'use strict';
// Kategori varsayılan illüstrasyonlarını (public/art/*.svg) üretir: node scripts/make-art.js
const fs = require('node:fs');
const path = require('node:path');
const out = path.join(__dirname, '..', 'public', 'art');
fs.mkdirSync(out, { recursive: true });

const C = { esp: '#2B1A12', cof: '#5A3825', moc: '#7A4E33', car: '#C8823A', carL: '#E2B07A', cream: '#F3E9DC', beige: '#E6D5C0', off: '#FAF6F0', milk: '#FFF9F0' };

function wrap(id, a, b, body, extraDefs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
<defs>
<radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>
<linearGradient id="glass" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="#fff" stop-opacity=".12"/><stop offset=".8" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".4"/></linearGradient>
<linearGradient id="porc" x1="0" x2="1"><stop offset="0" stop-color="#E9DCCB"/><stop offset=".3" stop-color="${C.milk}"/><stop offset=".7" stop-color="#FFFDF8"/><stop offset="1" stop-color="#E4D3BE"/></linearGradient>
${extraDefs}
</defs>
<rect width="400" height="300" fill="url(#bg)"/>
<circle cx="70" cy="60" r="90" fill="#fff" opacity=".18"/>
<circle cx="350" cy="250" r="110" fill="${C.esp}" opacity=".05"/>
<ellipse cx="200" cy="256" rx="128" ry="14" fill="${C.esp}" opacity=".16"/>
${body}
</svg>`;
}
const steam = (x, y, s = 1) => `<g fill="none" stroke="#fff" stroke-linecap="round" stroke-width="${5 * s}" opacity=".75">
<path d="M${x - 18 * s} ${y} c-12 -16 12 -24 0 -42"/><path d="M${x + 2 * s} ${y - 6} c-12 -16 12 -24 0 -46"/><path d="M${x + 22 * s} ${y} c-12 -16 12 -24 0 -38"/></g>`;
const ice = (x, y, r = 0, s = 26) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="6" fill="#fff" opacity=".42" transform="rotate(${r} ${x + s / 2} ${y + s / 2})"/>`;
const straw = (x1, y1, x2, y2, col = C.car) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="11" stroke-linecap="round"/>
<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-dasharray="7 9" opacity=".7"/>`;

const art = {};

art['hot-coffee'] = wrap('hc', '#F7EBDD', '#E3CDB4', `
<ellipse cx="200" cy="236" rx="132" ry="24" fill="${C.beige}"/><ellipse cx="200" cy="232" rx="118" ry="18" fill="url(#porc)"/>
<path d="M268 160 c38 -6 40 46 -6 44" fill="none" stroke="#EADBC8" stroke-width="14" stroke-linecap="round"/>
<path d="M126 148 H274 C274 206 246 234 200 234 C154 234 126 206 126 148Z" fill="url(#porc)"/>
<ellipse cx="200" cy="148" rx="74" ry="16" fill="#EFE2D2"/><ellipse cx="200" cy="149" rx="64" ry="12" fill="${C.moc}"/>
<path d="M200 158 c-14 -8 -24 -14 -16 -20 c6 -4 13 0 16 4 c3 -4 10 -8 16 -4 c8 6 -2 12 -16 20Z" fill="${C.cream}" opacity=".95"/>
<path d="M140 168 C150 210 175 224 200 226" stroke="#fff" stroke-width="6" fill="none" opacity=".6" stroke-linecap="round"/>
${steam(200, 118)}`);

art['iced-coffee'] = wrap('ic', '#F2E6D8', '#D9BEA0', `
<linearGradient id="ic1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6E7D3"/><stop offset=".45" stop-color="#C9976A"/><stop offset="1" stop-color="${C.cof}"/></linearGradient>
<path d="M146 64 H254 L238 250 H162Z" fill="url(#ic1)" opacity=".98"/>
<path d="M150 64 H250 L250 104 C220 96 180 112 150 102Z" fill="#F7EEE2" opacity=".85"/>
${ice(170, 78, 12)}${ice(204, 92, -14, 30)}${ice(178, 120, 30, 24)}
${straw(232, 22, 206, 160)}
<path d="M146 64 H254 L238 250 H162Z" fill="url(#glass)" stroke="#fff" stroke-opacity=".8" stroke-width="3"/>
<path d="M160 80 L172 236" stroke="#fff" stroke-width="5" opacity=".55" stroke-linecap="round"/>`);

art['turkish-coffee'] = wrap('tc', '#F4E4D2', '#D6B392', `
<ellipse cx="200" cy="232" rx="120" ry="22" fill="${C.beige}"/><ellipse cx="200" cy="228" rx="106" ry="16" fill="url(#porc)"/>
<path d="M248 168 c28 -2 28 34 -4 32" fill="none" stroke="#EADBC8" stroke-width="10" stroke-linecap="round"/>
<path d="M150 150 H250 C250 198 232 226 200 226 C168 226 150 198 150 150Z" fill="url(#porc)"/>
<path d="M152 172 H248" stroke="${C.car}" stroke-width="7"/><g fill="${C.esp}">${[160, 176, 192, 208, 224, 240].map((x) => `<circle cx="${x}" cy="172" r="2"/>`).join('')}</g>
<ellipse cx="200" cy="150" rx="50" ry="11" fill="#EFE2D2"/><ellipse cx="200" cy="151" rx="44" ry="8" fill="#B88A5C"/>
<g fill="#D9B48A" opacity=".9"><circle cx="186" cy="150" r="3"/><circle cx="206" cy="148" r="2.5"/><circle cx="214" cy="153" r="2"/><circle cx="194" cy="154" r="2"/></g>
<g transform="translate(286 196) rotate(-8)"><rect x="0" y="0" width="30" height="26" rx="5" fill="#F2B8C6"/><rect x="0" y="0" width="30" height="8" rx="4" fill="#fff" opacity=".7"/></g>
<g transform="translate(300 214) rotate(10)"><rect x="0" y="0" width="28" height="24" rx="5" fill="#FBF3E8"/><rect x="0" y="0" width="28" height="7" rx="4" fill="#fff"/></g>
${steam(200, 122, .8)}`);

art.tea = wrap('te', '#F6E6D6', '#DDB79A', `
<linearGradient id="tea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D2501B"/><stop offset="1" stop-color="#6E1F0E"/></linearGradient>
<ellipse cx="200" cy="240" rx="90" ry="18" fill="${C.beige}"/><ellipse cx="200" cy="236" rx="78" ry="13" fill="url(#porc)"/>
<path d="M171 96 C169 134 187 152 187 172 C187 196 166 210 169 236 H231 C234 210 213 196 213 172 C213 152 231 134 229 96Z" fill="url(#tea)"/>
<path d="M168 82 C166 126 186 150 186 172 C186 196 165 210 168 238 H232 C235 210 214 196 214 172 C214 150 234 126 232 82Z" fill="url(#glass)" stroke="#fff" stroke-opacity=".85" stroke-width="3"/>
<ellipse cx="200" cy="96" rx="29" ry="5" fill="#E8743E" opacity=".9"/>
<path d="M176 104 C176 130 190 150 191 168" stroke="#fff" stroke-width="4" fill="none" opacity=".5" stroke-linecap="round"/>
<path d="M250 230 L296 206" stroke="#D8C3A6" stroke-width="5" stroke-linecap="round"/><ellipse cx="300" cy="204" rx="8" ry="5" fill="#D8C3A6" transform="rotate(-28 300 204)"/>
<g fill="#fff" opacity=".9"><rect x="118" y="214" width="16" height="16" rx="2"/><rect x="128" y="226" width="16" height="16" rx="2"/></g>
${steam(200, 72, .8)}`);

art.lemonade = wrap('le', '#F7F0D8', '#DCCB95', `
<linearGradient id="lem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4B8"/><stop offset="1" stop-color="#F2CF5B"/></linearGradient>
<path d="M140 84 H260 L246 246 H154Z" fill="url(#lem)"/>
${ice(162, 98, 10, 28)}${ice(204, 110, -18, 28)}${ice(176, 150, 24, 24)}
<g fill="#6E9B4E"><path d="M186 92 c-18 -26 6 -40 22 -30 c-4 16 -10 24 -22 30Z"/><path d="M196 94 c24 -18 40 2 30 16 c-14 -2 -22 -8 -30 -16Z" fill="#87B064"/></g>
${straw(150, 30, 186, 170, '#6E9B4E')}
<g transform="translate(252 96)"><circle r="36" fill="#F6D44E"/><circle r="30" fill="#FFF3A6"/>${[0, 45, 90, 135].map((a) => `<line x1="0" y1="-28" x2="0" y2="28" stroke="#F6D44E" stroke-width="3" transform="rotate(${a})"/>`).join('')}<circle r="5" fill="#F6D44E"/></g>
<path d="M140 84 H260 L246 246 H154Z" fill="url(#glass)" stroke="#fff" stroke-opacity=".85" stroke-width="3"/>`);

art.milkshake = wrap('ms', '#F7E6E0', '#DDB7AA', `
<linearGradient id="msk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A5638"/><stop offset="1" stop-color="#4A2A1A"/></linearGradient>
<path d="M150 110 H250 L238 250 H162Z" fill="url(#msk)"/>
<path d="M156 116 c10 20 -4 40 6 60" stroke="#C99772" stroke-width="5" fill="none" opacity=".8"/><path d="M236 118 c-8 24 6 34 -4 64" stroke="#C99772" stroke-width="5" fill="none" opacity=".8"/>
<g fill="${C.milk}"><circle cx="168" cy="104" r="22"/><circle cx="200" cy="96" r="28"/><circle cx="232" cy="104" r="22"/><circle cx="186" cy="78" r="20"/><circle cx="214" cy="78" r="20"/><circle cx="200" cy="58" r="18"/></g>
<path d="M176 92 c10 8 38 8 48 0" stroke="#7A4E33" stroke-width="4" fill="none" stroke-linecap="round"/>
<circle cx="204" cy="36" r="13" fill="#C2263A"/><path d="M206 24 c4 -12 12 -16 18 -18" stroke="#5E8C4A" stroke-width="3" fill="none"/>
<circle cx="200" cy="32" r="4" fill="#fff" opacity=".6"/>
${straw(244, 22, 222, 100)}
<path d="M150 110 H250 L238 250 H162Z" fill="url(#glass)" stroke="#fff" stroke-opacity=".8" stroke-width="3"/>`);

art.frozen = wrap('fr', '#FBE8D6', '#E8B98E', `
<linearGradient id="frz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC56B"/><stop offset="1" stop-color="#F08A2C"/></linearGradient>
<path d="M150 112 H250 L238 250 H162Z" fill="url(#frz)"/>
<g fill="#fff" opacity=".45">${Array.from({ length: 34 }, (_, i) => `<circle cx="${160 + ((i * 37) % 80)}" cy="${122 + ((i * 53) % 120)}" r="${1.5 + (i % 3)}"/>`).join('')}</g>
<path d="M146 112 C146 64 254 64 254 112Z" fill="#fff" opacity=".35" stroke="#fff" stroke-opacity=".9" stroke-width="3"/>
<path d="M150 106 C152 92 170 86 182 86 C176 94 176 102 180 108Z" fill="#FFD48E"/>
<rect x="140" y="108" width="120" height="10" rx="5" fill="#fff" opacity=".9"/>
${straw(214, 14, 206, 110, '#F08A2C')}
<path d="M150 112 H250 L238 250 H162Z" fill="url(#glass)" stroke="#fff" stroke-opacity=".8" stroke-width="3"/>`);

art.smoothie = wrap('sm', '#F3E2EA', '#CFA6B8', `
<linearGradient id="smo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C25C8A"/><stop offset="1" stop-color="#6E2A4A"/></linearGradient>
<rect x="148" y="90" width="104" height="160" rx="20" fill="url(#smo)"/>
<rect x="142" y="78" width="116" height="20" rx="6" fill="#fff" opacity=".55" stroke="#fff" stroke-width="2"/>
<g fill="#3F3A7A"><circle cx="176" cy="76" r="9"/><circle cx="192" cy="70" r="8"/><circle cx="168" cy="66" r="7"/></g>
<g fill="#fff" opacity=".35"><circle cx="174" cy="73" r="2.5"/><circle cx="190" cy="67" r="2"/></g>
<g transform="translate(222 66)"><circle r="18" fill="#FBEFC6"/><circle r="14" fill="#FFF7DC"/><g fill="#D9C38E">${[0, 60, 120, 180, 240, 300].map((a) => `<circle cx="${(7 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(7 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="1.6"/>`).join('')}</g></g>
${straw(240, 18, 214, 120, '#6E9B4E')}
<rect x="148" y="90" width="104" height="160" rx="20" fill="url(#glass)" stroke="#fff" stroke-opacity=".8" stroke-width="3"/>`);

art.dessert = wrap('de', '#F6EAD8', '#DFC198', `
<ellipse cx="200" cy="222" rx="150" ry="36" fill="${C.beige}"/><ellipse cx="200" cy="216" rx="136" ry="28" fill="url(#porc)"/>
${[[150, 196], [200, 186], [250, 196], [200, 214]].map(([x, y]) => `<g transform="translate(${x} ${y})">
<path d="M0 -30 L44 0 L0 30 L-44 0Z" fill="#C98A3A"/><path d="M0 -30 L44 0 L0 8 L-44 0Z" fill="#E2A955"/>
<path d="M-30 -2 L0 -22 L30 -2 L0 4Z" fill="#7FA23E"/><g fill="#A3C25A"><circle cx="-8" cy="-8" r="3"/><circle cx="8" cy="-6" r="2.5"/><circle cx="0" cy="-14" r="2"/></g>
<path d="M-44 0 L0 30 L44 0 L44 6 L0 36 L-44 6Z" fill="#9A6428"/></g>`).join('')}`);

art.cake = wrap('ca', '#F7E6E2', '#DDBDB2', `
<ellipse cx="200" cy="236" rx="140" ry="24" fill="${C.beige}"/><ellipse cx="200" cy="232" rx="126" ry="18" fill="url(#porc)"/>
<path d="M110 150 L290 112 L290 214 L110 230Z" fill="#E9C48A"/>
<path d="M110 168 L290 134 L290 146 L110 182Z" fill="${C.milk}"/><path d="M110 196 L290 166 L290 178 L110 210Z" fill="#C2263A" opacity=".85"/>
<path d="M110 150 L290 112 L290 122 L110 162Z" fill="${C.milk}"/>
<path d="M110 150 L210 92 L290 112Z" fill="#FFF3E6"/>
<path d="M110 150 L210 92 L290 112" fill="none" stroke="#fff" stroke-width="3"/>
<g transform="translate(206 84)"><path d="M0 -18 C20 -18 22 6 0 18 C-22 6 -20 -18 0 -18Z" fill="#D62839"/><g fill="#FFE08A">${[[-6, -6], [6, -4], [0, 6], [-8, 4], [8, 6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4"/>`).join('')}</g><path d="M-8 -18 L0 -24 L8 -18" stroke="#5E8C4A" stroke-width="5" fill="none" stroke-linecap="round"/></g>`);

art.snack = wrap('sn', '#F6EAD6', '#D8BC8E', `
<rect x="70" y="200" width="260" height="44" rx="10" fill="#A87747"/><rect x="70" y="200" width="260" height="10" rx="5" fill="#C4935E"/>
<g transform="translate(150 182) rotate(-6)"><path d="M-70 20 L0 -70 L70 20Z" fill="#D9A15A"/><path d="M-60 14 L0 -60 L60 14Z" fill="#F0C27A"/>
<g stroke="#B5762F" stroke-width="5" opacity=".7"><line x1="-30" y1="-8" x2="20" y2="-8"/><line x1="-42" y1="6" x2="40" y2="6"/></g>
<path d="M-56 18 q10 14 20 0 q10 14 20 0 q10 16 22 0 q10 12 20 0 q10 14 20 0" fill="#FFD25A"/></g>
<g transform="translate(254 178) rotate(8)"><path d="M-66 22 L0 -66 L66 22Z" fill="#D9A15A"/><path d="M-56 16 L0 -56 L56 16Z" fill="#F0C27A"/>
<g stroke="#B5762F" stroke-width="5" opacity=".7"><line x1="-26" y1="-6" x2="22" y2="-6"/><line x1="-38" y1="8" x2="36" y2="8"/></g>
<path d="M-52 20 q10 14 20 0 q10 14 20 0 q10 16 22 0 q10 12 20 0" fill="#FFD25A"/></g>`);

art.breakfast = wrap('br', '#F4EDDD', '#D4C29C', `
<ellipse cx="200" cy="200" rx="150" ry="64" fill="${C.beige}"/><ellipse cx="200" cy="194" rx="136" ry="54" fill="url(#porc)"/>
<path d="M150 170 c-30 -20 10 -46 40 -30 c30 -16 62 10 40 32 c16 22 -26 40 -50 26 c-26 14 -58 -6 -30 -28Z" fill="#fff"/>
<circle cx="190" cy="170" r="17" fill="#F5A623"/><circle cx="184" cy="164" r="5" fill="#fff" opacity=".6"/>
${[[262, 176], [282, 196], [258, 206]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="#E2453C"/><circle cx="${x}" cy="${y}" r="10" fill="#F27A6E"/>`).join('')}
${[[118, 196], [138, 214]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="#6E9B4E"/><circle cx="${x}" cy="${y}" r="9" fill="#D8EBA8"/>`).join('')}
<g fill="#2B2420">${[[220, 218], [236, 224], [204, 228]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="6"/>`).join('')}</g>
<rect x="150" y="204" width="34" height="24" rx="4" fill="#FFFBF0" stroke="#EADFC8"/>`);

for (const [k, v] of Object.entries(art)) fs.writeFileSync(path.join(out, `${k}.svg`), v.replace(/\n+/g, '\n'));

// Logo: ince belli çay bardağı + buhar, espresso zemin
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
<defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2B07A"/><stop offset="1" stop-color="#B86A28"/></linearGradient></defs>
<circle cx="60" cy="60" r="58" fill="#2B1A12"/><circle cx="60" cy="60" r="52" fill="none" stroke="#C8823A" stroke-opacity=".45" stroke-width="1.5"/>
<path d="M44.5 54 C45 66 53.5 70 53.5 76 C53.5 82 49 85 49.5 92 H70.5 C71 85 66.5 82 66.5 76 C66.5 70 75 66 75.5 54Z" fill="url(#t)"/>
<path d="M41 46 C41.5 64 53 70 53 76 C53 82 48 86 48.5 93 H71.5 C72 86 67 82 67 76 C67 70 78.5 64 79 46" fill="none" stroke="#F3E9DC" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>
<ellipse cx="60" cy="97" rx="22" ry="4" fill="none" stroke="#F3E9DC" stroke-width="2.6"/>
<path d="M60 39 c-7 -7 6 -11 0 -20 M51 39 c-4 -5 4 -8 0 -13 M69 39 c-4 -5 4 -8 0 -13" fill="none" stroke="#F3E9DC" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>
</svg>`;
fs.writeFileSync(path.join(__dirname, '..', 'public', 'logo.svg'), logo);
console.log('Görseller üretildi:', Object.keys(art).length);
