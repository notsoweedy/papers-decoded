const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const SVGNS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs = {}, text) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  return el;
}
const COL = { q: '#0E7C66', k: '#6A45D9', v: '#D99A00', vInk: '#7A5600', ink: '#1C2320', ink2: '#4B544F', line: '#BCC3BC', grid: '#DDE1DB' };
const fmt = (x, d = 2) => {
  const r = +x.toFixed(d);
  return (Object.is(r, -0) ? 0 : r).toString().replace('-', '−');
};
const pct = p => `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const matmul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, x, k) => s + x * B[k][j], 0)));
const transpose = M => M[0].map((_, j) => M.map(r => r[j]));
function softmax(xs) {
  const m = Math.max(...xs);
  const e = xs.map(x => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / s);
}
function setPressed(buttons, active) { buttons.forEach(b => b.setAttribute('aria-pressed', String(b === active))); }

/* ---------- The toy model ---------- */
const WORDS = ['animal', 'street', 'it'];
const FEATS = ['living thing', 'place', 'can be tired', 'pronoun'];
const X = [
  [1, 0, 0.9, 0],
  [0, 1, 0, 0],
  [0.1, 0.1, 0, 1]
];
const W = {
  Q: { m: [[0.2, 0], [0, 0.2], [0.5, 0], [2, 0.5]], cols: ['looks for: living', 'looks for: place'], name: 'Q', what: 'one query per word' },
  K: { m: [[2, 0], [0, 2], [0.5, 0], [0, 0.3]], cols: ['offers: living', 'offers: place'], name: 'K', what: 'one key per word' },
  V: { m: [[1, 0], [0, 1], [0.5, 0], [0, 0]], cols: ['carries: living', 'carries: place'], name: 'V', what: 'one value per word' }
};
const DK = 2;
const Qm = matmul(X, W.Q.m), Km = matmul(X, W.K.m), Vm = matmul(X, W.V.m);
const scoresOf = Q => matmul(Q, transpose(Km));
const S = scoresOf(Qm);
const A = S.map(row => softmax(row.map(s => s / Math.sqrt(DK))));
const Zm = matmul(A, Vm);

/* ---------- Matrix tables ---------- */
function renderMatrix(el, M, { rows, cols, pickable = false, digits = 2, label = '' } = {}) {
  let h = `<table class="mat"${label ? ` aria-label="${label}"` : ''}>`;
  if (cols) h += '<thead><tr>' + (rows ? '<th></th>' : '') + cols.map(c => `<th scope="col">${c}</th>`).join('') + '</tr></thead>';
  h += '<tbody>' + M.map((r, i) => '<tr>' + (rows ? `<th scope="row">${rows[i]}</th>` : '') + r.map((v, j) => {
    const txt = fmt(v, digits);
    const inner = pickable
      ? `<button data-i="${i}" data-j="${j}" aria-label="${rows ? rows[i] : `row ${i + 1}`}, ${cols ? cols[j] : `column ${j + 1}`}: ${txt}">${txt}</button>`
      : `<span>${txt}</span>`;
    return `<td data-r="${i}" data-c="${j}">${inner}</td>`;
  }).join('') + '</tr>').join('') + '</tbody></table>';
  el.innerHTML = h;
}
function paint(el, fn) { $$('td', el).forEach(td => { td.className = fn(+td.dataset.r, +td.dataset.c) || ''; }); }

/* ---------- 1. Embeddings ---------- */
renderMatrix($('#x-table'), X, { rows: WORDS, cols: FEATS, label: 'Embedding matrix X' });

/* ---------- 2. Dot product (draggable) ---------- */
function headPts(x1, y1, x2, y2, s = 11) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = ang => `${(x2 - s * Math.cos(a - ang)).toFixed(1)},${(y2 - s * Math.sin(a - ang)).toFixed(1)}`;
  return `${x2.toFixed(1)},${y2.toFixed(1)} ${p(0.45)} ${p(-0.45)}`;
}
function makeArrow(parent, color, width = 3, dash = '') {
  const line = svg('line', { stroke: color, 'stroke-width': width, 'stroke-linecap': 'round' });
  if (dash) line.setAttribute('stroke-dasharray', dash);
  const head = svg('polygon', { fill: color });
  parent.append(line, head);
  return {
    set(x1, y1, x2, y2) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      const k = len > 12 ? (len - 8) / len : 1;
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x1 + (x2 - x1) * k); line.setAttribute('y2', y1 + (y2 - y1) * k);
      head.setAttribute('points', len > 2 ? headPts(x1, y1, x2, y2) : '');
    }
  };
}
const dp = { a: [2, 1], b: [1, 2] };
(function setupDot() {
  const el = $('#dot-plot'), MIN = -3, MAX = 3, SZ = 360;
  const px = v => (v - MIN) / (MAX - MIN) * SZ;
  const py = v => SZ - px(v);
  for (let g = MIN; g <= MAX; g++) {
    const axis = g === 0;
    el.append(svg('line', { x1: px(g), x2: px(g), y1: 0, y2: SZ, stroke: axis ? COL.ink2 : COL.grid, 'stroke-width': axis ? 1.5 : 1 }));
    el.append(svg('line', { y1: py(g), y2: py(g), x1: 0, x2: SZ, stroke: axis ? COL.ink2 : COL.grid, 'stroke-width': axis ? 1.5 : 1 }));
    if (g !== 0 && g !== MIN && g !== MAX) {
      el.append(svg('text', { x: px(g), y: py(0) + 15, 'text-anchor': 'middle' }, String(g).replace('-', '−')));
      el.append(svg('text', { x: px(0) - 6, y: py(g) + 4, 'text-anchor': 'end' }, String(g).replace('-', '−')));
    }
  }
  const shadow = svg('line', { stroke: COL.ink2, 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
  const shadowLen = svg('line', { stroke: COL.k, 'stroke-width': 7, 'stroke-linecap': 'round', opacity: 0.35 });
  el.append(shadowLen, shadow);
  const arrows = { a: makeArrow(el, COL.q, 3.5), b: makeArrow(el, COL.k, 3.5) };
  const labels = { a: svg('text', { class: 'lbl', fill: COL.q }, 'a'), b: svg('text', { class: 'lbl', fill: COL.k }, 'b') };
  el.append(labels.a, labels.b);
  const handles = {};
  for (const key of ['a', 'b']) {
    const h = svg('circle', { r: 11, fill: '#fff', stroke: key === 'a' ? COL.q : COL.k, 'stroke-width': 3, class: 'handle', tabindex: 0, role: 'slider', 'aria-label': `Tip of vector ${key}` });
    el.append(h);
    handles[key] = h;
    let dragging = false;
    const move = e => {
      const pt = el.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(el.getScreenCTM().inverse());
      const clamp = v => Math.max(MIN, Math.min(MAX, Math.round(v * 10) / 10));
      dp[key] = [clamp(MIN + p.x / SZ * (MAX - MIN)), clamp(MAX - p.y / SZ * (MAX - MIN))];
      draw();
    };
    h.addEventListener('pointerdown', e => { dragging = true; h.setPointerCapture(e.pointerId); e.preventDefault(); });
    h.addEventListener('pointermove', e => { if (dragging) move(e); });
    h.addEventListener('pointerup', () => { dragging = false; });
    h.addEventListener('pointercancel', () => { dragging = false; });
    h.addEventListener('keydown', e => {
      const st = e.shiftKey ? 0.5 : 0.1;
      const d = { ArrowRight: [st, 0], ArrowLeft: [-st, 0], ArrowUp: [0, st], ArrowDown: [0, -st] }[e.key];
      if (!d) return;
      e.preventDefault();
      const c = v => Math.max(MIN, Math.min(MAX, Math.round(v * 10) / 10));
      dp[key] = [c(dp[key][0] + d[0]), c(dp[key][1] + d[1])];
      draw();
    });
  }
  function draw() {
    const { a, b } = dp;
    for (const key of ['a', 'b']) {
      const v = dp[key];
      arrows[key].set(px(0), py(0), px(v[0]), py(v[1]));
      handles[key].setAttribute('cx', px(v[0])); handles[key].setAttribute('cy', py(v[1]));
      handles[key].setAttribute('aria-valuetext', `(${fmt(v[0], 1)}, ${fmt(v[1], 1)})`);
      labels[key].setAttribute('x', px(v[0]) + 14); labels[key].setAttribute('y', py(v[1]) - 12);
    }
    const aa = dot(a, a), ab = dot(a, b);
    if (aa > 0) {
      const t = ab / aa, p = [a[0] * t, a[1] * t];
      shadow.setAttribute('x1', px(b[0])); shadow.setAttribute('y1', py(b[1]));
      shadow.setAttribute('x2', px(p[0])); shadow.setAttribute('y2', py(p[1]));
      shadowLen.setAttribute('x1', px(0)); shadowLen.setAttribute('y1', py(0));
      shadowLen.setAttribute('x2', px(p[0])); shadowLen.setAttribute('y2', py(p[1]));
    }
    const la = Math.hypot(...a), lb = Math.hypot(...b);
    const cos = la && lb ? ab / (la * lb) : 0;
    const ang = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
    let verdict;
    if (!la || !lb) verdict = 'A zero vector scores 0 with everything.';
    else if (cos > 0.3) verdict = '<b>Pointing roughly the same way:</b> a positive score. In attention, a match.';
    else if (cos > -0.3) verdict = '<b>Close to a right angle:</b> a score near 0. Unrelated.';
    else verdict = '<b>Pointing opposite ways:</b> a negative score. After softmax, these get almost no attention.';
    $('#dot-read').innerHTML = `
      <p><span class="c-q"><b>a</b> = (${fmt(a[0], 1)}, ${fmt(a[1], 1)})</span>, <span class="c-k"><b>b</b> = (${fmt(b[0], 1)}, ${fmt(b[1], 1)})</span></p>
      <p>a · b = ${fmt(a[0], 1)}×${fmt(b[0], 1)} + ${fmt(a[1], 1)}×${fmt(b[1], 1)} =</p>
      <p class="big">${fmt(ab)}</p>
      <p>Same thing, geometrically: length of a (${fmt(la)}) × length of b (${fmt(lb)}) × cos(${ang.toFixed(0)}°) = ${fmt(la * lb * cos)}. The faint violet line is b's shadow on a.</p>
      <p>${verdict}</p>`;
  }
  draw();
})();

/* ---------- 3. Matrix multiplication ---------- */
const mm = { w: 'Q', i: 2, j: 0 };
function renderMM() {
  const w = W[mm.w], out = matmul(X, w.m);
  renderMatrix($('#mm-x'), X, { rows: WORDS, cols: FEATS, label: 'X' });
  renderMatrix($('#mm-w'), w.m, { rows: FEATS, cols: w.cols, label: `W ${w.name}` });
  renderMatrix($('#mm-out'), out, { rows: WORDS, cols: w.cols, pickable: true, label: `${w.name}, choose a cell` });
  $('#mm-wcap').innerHTML = `W<sup>${w.name}</sup> (4 × 2)`;
  $('#mm-outcap').innerHTML = `${w.name} (3 × 2): ${w.what}`;
  $$('#mm-out button').forEach(b => {
    const pick = () => { mm.i = +b.dataset.i; mm.j = +b.dataset.j; paintMM(); };
    b.addEventListener('mouseenter', pick); b.addEventListener('focus', pick); b.addEventListener('click', pick);
  });
  paintMM();
}
function paintMM() {
  const w = W[mm.w], { i, j } = mm;
  paint($('#mm-x'), r => (r === i ? 'hl' : ''));
  paint($('#mm-w'), (r, c) => (c === j ? 'hl2' : ''));
  paint($('#mm-out'), (r, c) => (r === i && c === j ? 'pick' : ''));
  const terms = X[i].map((x, k) => `${fmt(x)}×${fmt(w.m[k][j])}`);
  const res = X[i].reduce((s, x, k) => s + x * w.m[k][j], 0);
  $('#mm-sum').innerHTML = `Row <b class="c-q">"${WORDS[i]}"</b> of X · column <b class="c-k">"${w.cols[j]}"</b> of W<sup>${w.name}</sup>:<br>${terms.join(' + ')} = <b>${fmt(res)}</b>`;
}
$$('[data-w]').forEach(b => b.addEventListener('click', () => { mm.w = b.dataset.w; setPressed($$('[data-w]'), b); renderMM(); }));
renderMM();

/* ---------- Shared plot of arrows from the origin ---------- */
function drawVectors(el, items, { min = -0.4, max = 2.8, xlab = '', ylab = '' } = {}) {
  const Wd = 360, H = 330, L = 40, B = 34, T = 10, R = 12;
  const px = v => L + (v - min) / (max - min) * (Wd - L - R);
  const py = v => H - B - (v - min) / (max - min) * (H - B - T);
  el.innerHTML = '';
  const step = max - min > 2.5 ? 1 : 0.5;
  for (let g = Math.ceil(min / step) * step; g <= max + 1e-9; g += step) {
    const axis = Math.abs(g) < 1e-9;
    el.append(svg('line', { x1: px(g), x2: px(g), y1: py(min), y2: py(max), stroke: axis ? COL.ink2 : COL.grid, 'stroke-width': axis ? 1.5 : 1 }));
    el.append(svg('line', { y1: py(g), y2: py(g), x1: px(min), x2: px(max), stroke: axis ? COL.ink2 : COL.grid, 'stroke-width': axis ? 1.5 : 1 }));
    if (!axis) {
      el.append(svg('text', { x: px(g), y: H - B + 16, 'text-anchor': 'middle' }, fmt(g, 1)));
      el.append(svg('text', { x: L - 6, y: py(g) + 4, 'text-anchor': 'end' }, fmt(g, 1)));
    }
  }
  if (xlab) el.append(svg('text', { x: px(max), y: H - 4, 'text-anchor': 'end' }, xlab));
  if (ylab) el.append(svg('text', { x: L + 4, y: T + 12 }, ylab));
  for (const it of items) {
    makeArrow(el, it.color, it.width || 3, it.dash || '').set(px(0), py(0), px(it.v[0]), py(it.v[1]));
    if (it.label) {
      el.append(svg('text', {
        x: px(it.v[0]) + (it.dx ?? 8), y: py(it.v[1]) + (it.dy ?? -8), class: 'lbl', fill: it.textColor || it.color,
        'text-anchor': it.anchor || 'start', stroke: '#F8F9F6', 'stroke-width': 4, 'paint-order': 'stroke'
      }, it.label));
    }
  }
}
function hbars(el, labels, values, fillCls, digits = 2, pick = -1) {
  const max = Math.max(...values.map(Math.abs), 1e-9);
  el.innerHTML = labels.map((l, i) => `<div class="hbar${i === pick ? ' pick' : ''}"><span class="name">${l}</span><div class="track"><div class="fill ${fillCls}" style="width:${(Math.abs(values[i]) / max * 100).toFixed(1)}%"></div></div><span class="val">${typeof digits === 'function' ? digits(values[i]) : fmt(values[i], digits)}</span></div>`).join('');
}

/* ---------- Shared selection: which word is reading ---------- */
let sel = 2;
function renderSel() {
  $$('[data-sel]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.sel === sel)));
  renderQK(); renderSoftmax(); renderZ();
}
$$('[data-sel]').forEach(b => b.addEventListener('click', () => { sel = +b.dataset.sel; renderSel(); }));

/* ---------- 4. Queries meet keys ---------- */
function renderQK() {
  const shared = $('#shared').checked;
  const Q = shared ? Km : Qm;
  const Sx = scoresOf(Q);
  const keyPos = [{ dx: -6, dy: 22, anchor: 'end' }, { dx: 10, dy: 4 }, { dx: 8, dy: -8 }];
  const items = WORDS.map((w, i) => ({ v: Km[i], color: COL.k, label: `${w} (key)`, ...keyPos[i] }));
  items.push({ v: Q[sel], color: COL.q, width: 4.5, label: `query of "${WORDS[sel]}"`, dx: -4, dy: -12, anchor: 'end' });
  drawVectors($('#qk-plot'), items, { xlab: 'living →', ylab: '↑ place' });
  hbars($('#qk-bars'), WORDS.map(w => `"${w}"`), Sx[sel], 'k', 2, Sx[sel].indexOf(Math.max(...Sx[sel])));
  renderMatrix($('#qk-matrix'), Sx, { rows: WORDS, cols: WORDS, label: 'Score matrix Q K transposed' });
  paint($('#qk-matrix'), (r, c) => (r === sel ? 'hl' : shared && c === sel && r !== sel ? 'sym' : ''));
  const best = Sx[sel].indexOf(Math.max(...Sx[sel]));
  const v = $('#qk-verdict');
  if (shared) {
    v.className = 'verdict v';
    v.innerHTML = `<b>With one recipe, the table becomes a mirror image</b> (the mustard cells equal the teal ones): every relationship is two-way. "${WORDS[sel]}" now scores "${WORDS[best]}" highest.${sel === 2 ? ' "it" loses the animal: its query is now just its own key, and nothing in "it" itself says "living thing".' : ''}`;
  } else {
    v.className = 'verdict q';
    const one = sel === 2 ? ` And it's one-way: "it" → "animal" scores ${fmt(Sx[2][0])}, but "animal" → "it" only ${fmt(Sx[0][2])}.` : '';
    v.innerHTML = `Reading <b>"${WORDS[sel]}"</b>, the highest score is <b>"${WORDS[best]}"</b> (${fmt(Sx[sel][best])}).${sel === 2 ? ' The query of "it" points along "living", and the animal\'s key offers "living", so they line up.' : ''}${one}`;
  }
}
$('#shared').addEventListener('change', renderQK);

/* ---------- 5. Softmax, step by step ---------- */
function renderSoftmax() {
  const sc = S[sel], scaled = sc.map(s => s / Math.sqrt(DK)), ex = scaled.map(Math.exp);
  const tot = ex.reduce((a, b) => a + b, 0);
  const rows = WORDS.map((w, j) => `<tr><td><b>${w}</b></td><td class="num">${fmt(sc[j])}</td><td class="num">${fmt(scaled[j])}</td><td class="num">${fmt(ex[j])}</td><td class="num">${pct(ex[j] / tot)}</td></tr>`).join('');
  $('#sm-table').innerHTML = `<thead><tr><th scope="col">Key word</th><th scope="col">Score q·k</th><th scope="col">÷ √2</th><th scope="col">e<sup>x</sup></th><th scope="col">÷ total = weight</th></tr></thead>
    <tbody>${rows}<tr class="sum"><td colspan="3" style="text-align:right;color:var(--ink-2)">Total</td><td class="num">${fmt(tot)}</td><td class="num">100%</td></tr></tbody>`;
}

/* ---------- 5b. Why √dk: random vectors ---------- */
function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function gauss(rng) { let u = 0; while (!u) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); }
const randVec = (rng, n) => Array.from({ length: n }, () => gauss(rng));
const rnd = { dk: 64, scaled: false, seed: 7 };
const sdCache = {};
function typicalSize(dk, scaled) {
  const key = `${dk}-${scaled}`;
  if (sdCache[key]) return sdCache[key];
  const rng = mulberry32(12345);
  let s2 = 0;
  for (let i = 0; i < 2000; i++) {
    const s = dot(randVec(rng, dk), randVec(rng, dk)) / (scaled ? Math.sqrt(dk) : 1);
    s2 += s * s;
  }
  return (sdCache[key] = Math.sqrt(s2 / 2000));
}
function renderRandom() {
  const rng = mulberry32(rnd.seed);
  const q = randVec(rng, rnd.dk);
  const scores = Array.from({ length: 8 }, () => dot(q, randVec(rng, rnd.dk)) / (rnd.scaled ? Math.sqrt(rnd.dk) : 1));
  const w = softmax(scores);
  const top = w.indexOf(Math.max(...w));
  const line = $('#rnd-line');
  line.innerHTML = '';
  const R = Math.max(4, Math.ceil(Math.max(...scores.map(Math.abs)) * 1.15));
  const L = 30, Wd = 720 - 60, x = v => L + (v + R) / (2 * R) * Wd;
  line.append(svg('line', { x1: L, x2: L + Wd, y1: 44, y2: 44, stroke: COL.ink2, 'stroke-width': 1.5 }));
  for (const t of [-R, -R / 2, 0, R / 2, R]) {
    line.append(svg('line', { x1: x(t), x2: x(t), y1: 38, y2: 50, stroke: COL.ink2 }));
    line.append(svg('text', { x: x(t), y: 72, 'text-anchor': 'middle' }, fmt(t, 1)));
  }
  scores.forEach((s, i) => line.append(svg('circle', { cx: x(s), cy: 44, r: i === top ? 9 : 7, fill: i === top ? COL.k : '#fff', stroke: COL.k, 'stroke-width': 2.5 })));
  line.append(svg('text', { x: L, y: 18 }, 'scores'));
  hbars($('#rnd-bars'), w.map((_, i) => `key ${i + 1}`), w, 'k', p => pct(p), top);
  const sd = typicalSize(rnd.dk, rnd.scaled);
  $('#rnd-sd').textContent = fmt(sd, 1);
  $('#rnd-sqrt').textContent = fmt(Math.sqrt(rnd.dk), 1);
  $('#rnd-max').textContent = pct(w[top]);
  const v = $('#rnd-verdict');
  if (w[top] > 0.9) {
    v.className = 'verdict k';
    v.innerHTML = `<b>All-or-nothing.</b> Scores spread out to about ±${fmt(sd, 0)}, so one key takes ${pct(w[top])}. The rest get almost nothing, and almost nothing can be learned through them.${rnd.scaled ? '' : ' Turn on the scaling.'}`;
  } else if (rnd.scaled) {
    v.className = 'verdict q';
    v.innerHTML = `<b>A real blend.</b> Scores have a typical size of about ${fmt(sd, 1)}, so several keys get a meaningful share and every weight can still learn. Dividing by √${rnd.dk} keeps it that way for any d<sub>k</sub>.`;
  } else if (rnd.dk <= 2) {
    v.className = 'verdict q';
    v.innerHTML = `<b>A real blend.</b> With d<sub>k</sub> this small, the scores stay small anyway (typical size ${fmt(sd, 1)}). Try 512.`;
  } else {
    v.className = 'verdict k';
    v.innerHTML = `<b>A lucky draw.</b> Scores this spread out (typical size ${fmt(sd, 0)}) usually hand one key almost everything. Draw new vectors a few times, or turn on the scaling.`;
  }
}
$$('[data-dk]').forEach(b => b.addEventListener('click', () => { rnd.dk = +b.dataset.dk; setPressed($$('[data-dk]'), b); renderRandom(); }));
$('#rnd-scale').addEventListener('change', e => { rnd.scaled = e.target.checked; renderRandom(); });
$('#rnd-new').addEventListener('click', () => { rnd.seed = (rnd.seed * 48271 + 11) % 2147483647; renderRandom(); });
renderRandom();

/* ---------- 6. Weighted sum ---------- */
function renderZ() {
  const a = A[sel], z = Zm[sel];
  const vPos = [{ dx: -4, dy: 22, anchor: 'end' }, { dx: 10, dy: 4 }, { dx: 10, dy: -4 }];
  const items = WORDS.map((w, i) => ({ v: Vm[i], color: COL.v, textColor: COL.vInk, label: `${w} (value)`, ...vPos[i] }));
  items.push({ v: z, color: COL.ink, width: 5, label: `z for "${WORDS[sel]}"`, dx: 8, dy: -12 });
  drawVectors($('#z-plot'), items, { min: -0.2, max: 1.8, xlab: 'living →', ylab: '↑ place' });
  const terms = WORDS.map((w, j) => `${fmt(a[j])} × (${fmt(Vm[j][0])}, ${fmt(Vm[j][1])})`).join(' + ');
  const others = a.map((p, j) => [p, j]).filter(([, j]) => j !== sel).sort((x, y) => y[0] - x[0]);
  $('#z-read').innerHTML = `
    <p>z for <b>"${WORDS[sel]}"</b> = ${terms}</p>
    <p class="big">= (${fmt(z[0])}, ${fmt(z[1])})</p>
    <p>${sel === 2
      ? `"it" started with almost no "living" meaning: its value is (${fmt(Vm[2][0])}, ${fmt(Vm[2][1])}). After attention, z points strongly along "living". It has borrowed meaning from "animal" (${pct(a[0])} of its attention).`
      : `"${WORDS[sel]}" keeps ${pct(a[sel])} of itself and borrows most from "${WORDS[others[0][1]]}" (${pct(others[0][0])}).`}</p>`;
  renderMatrix($('#z-a'), A, { rows: WORDS, cols: WORDS, label: 'Attention weights A' });
  renderMatrix($('#z-v'), Vm, { rows: WORDS, cols: W.V.cols, label: 'Values V' });
  renderMatrix($('#z-z'), Zm, { rows: WORDS, cols: W.V.cols, label: 'Output Z' });
  paint($('#z-a'), r => (r === sel ? 'hl' : ''));
  paint($('#z-z'), r => (r === sel ? 'pick' : ''));
}
renderSel();

/* ---------- 8. Positional encoding clocks ---------- */
const PE_D = 8;
const OMEGA = Array.from({ length: PE_D / 2 }, (_, i) => 1 / Math.pow(10000, (2 * i) / PE_D));
const clockEls = OMEGA.map((w, i) => {
  const box = document.createElement('div');
  box.className = 'clock';
  const s = svg('svg', { viewBox: '0 0 120 120', role: 'img', 'aria-label': `Clock hand ${i + 1}` });
  s.append(svg('circle', { cx: 60, cy: 60, r: 52, fill: '#fff', stroke: COL.line, 'stroke-width': 2 }));
  for (let t = 0; t < 12; t++) {
    const a = t / 12 * 2 * Math.PI;
    s.append(svg('line', { x1: 60 + 46 * Math.sin(a), y1: 60 - 46 * Math.cos(a), x2: 60 + 52 * Math.sin(a), y2: 60 - 52 * Math.cos(a), stroke: COL.line, 'stroke-width': 2 }));
  }
  const ghost = svg('line', { x1: 60, y1: 60, stroke: COL.k, 'stroke-width': 3, 'stroke-dasharray': '4 4', 'stroke-linecap': 'round' });
  const hand = svg('line', { x1: 60, y1: 60, stroke: COL.q, 'stroke-width': 4, 'stroke-linecap': 'round' });
  s.append(ghost, hand, svg('circle', { cx: 60, cy: 60, r: 4, fill: COL.ink }));
  const p = document.createElement('p');
  box.append(s, p);
  $('#clocks').append(box);
  return { hand, ghost, p, s };
});
function renderPE() {
  const pos = +$('#pe-pos').value, k = +$('#pe-k').value;
  $('#pe-pos-val').textContent = `pos ${pos}`;
  $('#pe-k-val').textContent = `k = ${k}`;
  $('#pe-pos').setAttribute('aria-valuetext', `position ${pos}`);
  $('#pe-k').setAttribute('aria-valuetext', `offset ${k}`);
  const vals = [];
  OMEGA.forEach((w, i) => {
    const th = pos * w, th2 = (pos + k) * w;
    const c = clockEls[i];
    c.hand.setAttribute('x2', 60 + 44 * Math.sin(th)); c.hand.setAttribute('y2', 60 - 44 * Math.cos(th));
    c.ghost.setAttribute('x2', 60 + 44 * Math.sin(th2)); c.ghost.setAttribute('y2', 60 - 44 * Math.cos(th2));
    c.ghost.setAttribute('visibility', k ? 'visible' : 'hidden');
    c.p.innerHTML = `Hand ${i + 1}, speed ${fmt(w, 3)}<br><b>sin ${fmt(Math.sin(th))}, cos ${fmt(Math.cos(th))}</b>`;
    c.s.setAttribute('aria-label', `Hand ${i + 1}: sine ${fmt(Math.sin(th))}, cosine ${fmt(Math.cos(th))}`);
    vals.push([Math.sin(th), `PE[${2 * i}] sin`], [Math.cos(th), `PE[${2 * i + 1}] cos`]);
  });
  $('#pe-strip').innerHTML = vals.map(([v, l]) => `<div>${fmt(v)}<span>${l}</span></div>`).join('');
  const turns = pos / (2 * Math.PI);
  $('#pe-verdict').className = 'verdict q';
  $('#pe-verdict').innerHTML = k
    ? `<b>Moving ${k} word${k > 1 ? 's' : ''} later</b> turns the hands by ${OMEGA.map(w => fmt(k * w, 3)).join(', ')} radians: the same turn from any starting position. Try another position and watch the dashed hands keep the same angle to the solid ones.`
    : `<b>Position ${pos}.</b> The fast hand has gone round ${fmt(turns, 1)} times while the slowest has moved ${fmt(pos * OMEGA[3], 3)} radians. These 8 numbers get added to the word's embedding.`;
}
$('#pe-pos').addEventListener('input', renderPE);
$('#pe-k').addEventListener('input', renderPE);
renderPE();

/* ---------- 9. Layer norm ---------- */
const LN_BASE = [2, -1, 4, 0.5, 3, -2.5];
let lnVec = [...LN_BASE];
const mean = v => v.reduce((a, b) => a + b, 0) / v.length;
const spread = v => { const m = mean(v); return Math.sqrt(mean(v.map(x => (x - m) ** 2))); };
function niceMax(x) { const p = Math.pow(10, Math.floor(Math.log10(x))); for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= x) return m * p; return 10 * p; }
function barChart(el, v, R) {
  el.innerHTML = '';
  const L = 44, Wd = 320 - L - 8, mid = 85, h = 70, y = x => mid - x / R * h;
  for (const t of [R, 0, -R]) {
    el.append(svg('line', { x1: L, x2: L + Wd, y1: y(t), y2: y(t), stroke: t === 0 ? COL.ink2 : COL.grid, 'stroke-width': t === 0 ? 1.5 : 1 }));
    el.append(svg('text', { x: L - 6, y: y(t) + 4, 'text-anchor': 'end' }, fmt(t, 2)));
  }
  const bw = Wd / v.length;
  v.forEach((x, i) => {
    const top = Math.min(y(x), mid), ht = Math.max(1.5, Math.abs(y(x) - mid));
    el.append(svg('rect', { x: L + i * bw + 6, y: top, width: bw - 12, height: ht, rx: 2, fill: x >= 0 ? COL.q : COL.k }));
  });
}
function renderLN() {
  const m = mean(lnVec), s = spread(lnVec);
  const out = lnVec.map(x => (x - m) / s);
  barChart($('#ln-before'), lnVec, niceMax(Math.max(...lnVec.map(Math.abs))));
  barChart($('#ln-after'), out, 2.5);
  $('#ln-before-stats').textContent = `mean ${fmt(m)}, spread ${fmt(s)}`;
  $('#ln-after-stats').textContent = `mean ${fmt(mean(out))}, spread ${fmt(spread(out))}`;
  const same = lnVec.every((x, i) => Math.abs(x - LN_BASE[i]) < 1e-9);
  $('#ln-verdict').className = 'verdict q';
  $('#ln-verdict').innerHTML = same
    ? 'Try making the input bigger or shifting it up. The right-hand chart won\'t change.'
    : '<b>Same output as before.</b> However large or shifted the input gets, layer norm returns mean 0 and spread 1 with the same shape. The next layer always sees numbers in a familiar range.';
  $('#ln-x10').disabled = Math.max(...lnVec.map(Math.abs)) > 1e5;
}
$('#ln-x10').addEventListener('click', () => { lnVec = lnVec.map(x => x * 10); renderLN(); });
$('#ln-add').addEventListener('click', () => { lnVec = lnVec.map(x => x + 5); renderLN(); });
$('#ln-reset').addEventListener('click', () => { lnVec = [...LN_BASE]; renderLN(); });
renderLN();

/* ---------- 10. Gradient descent on the logits ---------- */
const VOCAB = ['a', 'am', 'i', 'thanks', 'student', '<eos>'];
const TARGET = 3, LR = 1;
const GD_START = [1.2, 0.4, 2.1, -0.6, 1.0, 0.1];
let gd = { logits: [...GD_START], prev: null, losses: [] };
const escH = s => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
function renderGD() {
  const p = softmax(gd.logits);
  const loss = -Math.log(p[TARGET]);
  if (!gd.losses.length) gd.losses.push(loss);
  const rows = VOCAB.map((w, i) => {
    const g = p[i] - (i === TARGET ? 1 : 0);
    const d = gd.prev ? gd.logits[i] - gd.prev[i] : 0;
    const delta = gd.prev ? ` <span style="color:${d >= 0 ? 'var(--good)' : 'var(--bad)'};font-weight:400">(${d >= 0 ? '+' : '−'}${fmt(Math.abs(d))})</span>` : '';
    return `<tr${i === TARGET ? ' style="background:var(--q-soft)"' : ''}><td><b>${escH(w)}</b></td><td class="num">${fmt(gd.logits[i])}${delta}</td><td class="num">${pct(p[i])}</td><td class="num">${i === TARGET ? 1 : 0}</td><td class="num">${fmt(g, 3)}</td></tr>`;
  }).join('');
  $('#gd-table').innerHTML = `<thead><tr><th scope="col">Word</th><th scope="col">Logit</th><th scope="col">Probability (softmax)</th><th scope="col">Target (one-hot)</th><th scope="col">Gradient = p − target</th></tr></thead><tbody>${rows}</tbody>`;
  $('#gd-p').textContent = pct(p[TARGET]);
  $('#gd-loss').textContent = fmt(loss);
  const n = gd.losses.length - 1;
  $('#gd-count').textContent = `Step ${n}`;
  $('#gd-trail').textContent = `Loss by step: ${gd.losses.map(l => fmt(l)).join(' → ')}`;
  $('#gd-step').disabled = n >= 25;
}
$('#gd-step').addEventListener('click', () => {
  const p = softmax(gd.logits);
  gd.prev = [...gd.logits];
  gd.logits = gd.logits.map((l, i) => l - LR * (p[i] - (i === TARGET ? 1 : 0)));
  gd.losses.push(-Math.log(softmax(gd.logits)[TARGET]));
  renderGD();
});
$('#gd-reset').addEventListener('click', () => { gd = { logits: [...GD_START], prev: null, losses: [] }; renderGD(); });
renderGD();

/* ---------- 11. GPU cost ---------- */
const NS = [128, 256, 512, 1024, 2048, 4096, 8192, 16384];
const D = 512, HEADS = 8;
function big(x) {
  if (x >= 1e12) return `${fmt(x / 1e12, 1)} trillion`;
  if (x >= 1e9) return `${fmt(x / 1e9, 1)} billion`;
  if (x >= 1e6) return `${fmt(x / 1e6, 1)} million`;
  return Math.round(x).toLocaleString();
}
function bytes(b) { return b >= 1e9 ? `${fmt(b / 1e9, 1)} GB` : b >= 1e6 ? `${fmt(b / 1e6, 1)} MB` : `${fmt(b / 1e3, 0)} KB`; }
function renderGPU() {
  const n = NS[+$('#n-len').value];
  $('#n-val').textContent = `${n.toLocaleString()} words`;
  $('#n-len').setAttribute('aria-valuetext', `${n} words`);
  const proj = 8 * n * D * D, att = 4 * n * n * D, mem = HEADS * n * n * 2;
  hbars($('#gpu-bars'), ['Weight multiplications (Q, K, V, Wᴼ)', 'Attention (QKᵀ and × V)'], [proj, att], 'q', x => big(x));
  $('#gpu-mem').textContent = bytes(mem);
  const v = $('#gpu-verdict');
  if (n < 2 * D) {
    v.className = 'verdict q';
    v.innerHTML = `<b>Short sentence: the weight multiplications dominate.</b> They're big, regular matrix multiplications, exactly what Tensor Cores are built for.`;
  } else if (n === 2 * D) {
    v.className = 'verdict';
    v.innerHTML = '<b>Balanced:</b> at n = 2 × d = 1,024 words, the two costs are equal.';
  } else {
    v.className = 'verdict k';
    v.innerHTML = `<b>Long sentence: attention's n² has taken over.</b> The score tables alone are ${bytes(mem)} per layer, and scaling, masking and softmax read and write all of it. That's memory-bound work, which FlashAttention fuses away.`;
  }
}
$('#n-len').addEventListener('input', renderGPU);
renderGPU();

/* ---------- Quiz ---------- */
const QUIZ = [
  { q: 'What does the dot product of two vectors tell you?', o: ['How long one vector is', 'How much they point the same way (scaled by their lengths)', 'How many numbers they have'], a: 1,
    why: 'Multiply number by number and add: big when they point the same way, about 0 at right angles, negative when opposite.' },
  { q: 'A (3 × 4) matrix times a (4 × 2) matrix gives a matrix of shape…', o: ['4 × 4', '3 × 2', '3 × 4'], a: 1,
    why: 'The inner numbers (4 and 4) must match and disappear; the outer ones (3 and 2) give the result.' },
  { q: 'Why does each word get separate query and key vectors?', o: ['To use more memory', 'So "looking for" can differ from "being", and attention can be one-way', 'Because softmax needs three inputs'], a: 1,
    why: 'With one recipe for both, the score table is symmetric. Separate W^Q and W^K let "it" seek "animal" without "animal" seeking "it".' },
  { q: 'Why are the scores divided by √dₖ?', o: ['Dot products grow with dₖ; big scores make softmax all-or-nothing and stall learning', 'To make the scores negative', 'To save computation'], a: 0,
    why: 'Adding dₖ random products gives a spread of about √dₖ. Dividing by √dₖ brings it back to about 1.' },
  { q: 'What does softmax guarantee about the attention weights?', o: ['The biggest score gets exactly 100%', 'They are all positive and add up to 100%', 'They are all equal'], a: 1,
    why: 'e^x makes everything positive and keeps the order; dividing by the total makes them add to 100%.' },
  { q: 'Why is the positional encoding made of sines and cosines at different speeds?', o: ['Each position gets a unique reading, and shifting by k positions is the same rotation everywhere', 'Because the GPU is faster at sine', 'To make the embedding bigger'], a: 0,
    why: 'Like clock hands: fast ones tell nearby positions apart, slow ones tell far ones apart, and moving k steps is a fixed turn.' },
  { q: 'For softmax with cross-entropy, the gradient on each logit is…', o: ['probability − target', 'target ÷ probability', 'always −1'], a: 0,
    why: 'Positive for wrong words (push them down) and negative for the right word (push it up). Gradient descent subtracts it.' },
  { q: 'Why does attention get expensive for long sentences?', o: ['The weight matrices grow', 'The score table is n × n, so it grows with the square of the length', 'Softmax needs more decimals'], a: 1,
    why: 'Double the sentence and the score table gets 4 times bigger. Most of the work on it is memory-bound.' }
];
const answers = new Array(QUIZ.length).fill(null);
QUIZ.forEach((item, i) => {
  const box = document.createElement('div');
  box.className = 'qz';
  box.innerHTML = `<p class="ask" id="q${i}">${item.q}</p><div class="opts" role="group" aria-labelledby="q${i}"></div><p class="why" hidden></p>`;
  const opts = box.querySelector('.opts');
  item.o.forEach((label, k) => {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = label;
    b.addEventListener('click', () => {
      answers[i] = k;
      $$('.btn', opts).forEach(x => x.classList.remove('right', 'wrong'));
      const ok = k === item.a;
      b.classList.add(ok ? 'right' : 'wrong');
      const why = box.querySelector('.why');
      why.hidden = false;
      why.innerHTML = ok ? `<b>Right.</b> ${item.why}` : '<b>Not quite.</b> Try another answer; the chapter above has the clue.';
      $('#score').textContent = `${answers.filter((x, n) => x === QUIZ[n].a).length} of ${QUIZ.length} right`;
    });
    opts.append(b);
  });
  $('#quiz').append(box);
});
$('#score').textContent = `0 of ${QUIZ.length} right`;

/* ---------- Glossary ---------- */
const GLOSSARY = [
  ['Vector', 'A list of numbers. Each word becomes one.'],
  ['Dimension', 'How many numbers a vector has: 512 for embeddings in the paper, 64 for each query, key and value.'],
  ['Matrix', 'A grid of numbers. Stack word vectors as rows and you get one.'],
  ['Shape', 'Rows × columns of a matrix, like 3 × 4.'],
  ['Dot product', 'Multiply two vectors number by number and add up. Measures how much they point the same way.'],
  ['Matrix multiplication', 'Every row of the first matrix dotted with every column of the second. (a × b) times (b × c) gives a × c.'],
  ['Weight matrix', 'A learned matrix that turns one vector into another, like W^Q turning an embedding into a query.'],
  ['Projection', 'Multiplying by a weight matrix to move a vector into a new space, such as the query space.'],
  ['Transpose (Kᵀ)', 'Flip a matrix so rows become columns. Q × Kᵀ lines every query up with every key.'],
  ['Score', 'Query · key: how well one word matches what another is looking for.'],
  ['Exponential (eˣ)', 'e (about 2.718) raised to x. Always positive, grows fast, and keeps the order of numbers.'],
  ['Softmax', 'eˣ for each score, divided by the total. Turns scores into positive weights that add up to 100%.'],
  ['Attention weights', 'The softmax outputs: how much of each value to blend in.'],
  ['dₖ', 'The number of numbers in a key (and query). 64 in the paper, 2 in this page\'s example.'],
  ['Standard deviation (spread)', 'The typical distance of numbers from their average. For a sum of d random products it grows like √d.'],
  ['Scaling by √dₖ', 'Dividing scores by the square root of dₖ to keep their typical size near 1.'],
  ['Weighted sum', 'Multiply each vector by its weight and add them up. Attention\'s output z is a weighted sum of values.'],
  ['Concatenate', 'Join vectors end to end. The 8 heads\' outputs are concatenated back to 512 numbers.'],
  ['Wᴼ', 'The output matrix that mixes the concatenated heads back into one vector per word.'],
  ['Sine and cosine', 'The x and y coordinates of a point going round a circle. Positional encoding uses them as clock hands.'],
  ['Frequency (ω)', 'How fast a positional clock hand turns per word: 1 ÷ 10000^(2i/d).'],
  ['Rotation', 'Turning a vector by an angle. Shifting position by k turns each positional hand by a fixed angle.'],
  ['Residual connection', 'Adding a sub-layer\'s input to its output: x + Sublayer(x).'],
  ['Mean', 'The average of a list of numbers.'],
  ['Layer normalization', 'Subtract the mean and divide by the spread, then apply learned γ (scale) and β (shift).'],
  ['ReLU', 'max(0, x): keeps positives and turns negatives into 0. The bend that lets networks learn non-straight rules.'],
  ['Bias', 'A learned number added after a matrix multiplication, like b₁ in the feed-forward network.'],
  ['Linear layer', 'A matrix multiplication (plus a bias). The final one turns a vector into one score per vocabulary word.'],
  ['Logits', 'The raw scores from the final linear layer, before softmax.'],
  ['One-hot', 'A vector with 1 for the right word and 0 for every other.'],
  ['Logarithm (log)', 'The inverse of eˣ. −log(p) is 0 when p = 1 and grows huge as p approaches 0.'],
  ['Cross-entropy loss', '−log(probability given to the right word). How wrong the model was.'],
  ['Gradient', 'How much the loss changes if you nudge a number. Tells you which way to move it.'],
  ['Gradient descent', 'Nudge every number a little against its gradient, then repeat.'],
  ['Learning rate', 'How big each nudge is. Too big overshoots; too small learns slowly.'],
  ['Chain rule', 'The calculus rule that passes gradients back through each step of a calculation.'],
  ['Backpropagation', 'Using the chain rule to get the gradient for every weight in the network.'],
  ['FLOP', 'One floating-point operation: a single add or multiply.']
];
const glossEl = $('#gloss');
GLOSSARY.forEach(([t, d]) => {
  const div = document.createElement('div');
  div.className = 'term';
  div.innerHTML = `<dt>${t}</dt><dd>${d}</dd>`;
  div.dataset.search = `${t} ${d}`.toLowerCase();
  glossEl.append(div);
});
$('#gfilter').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  let shown = 0;
  $$('.term', glossEl).forEach(el => { const hit = !q || el.dataset.search.includes(q); el.hidden = !hit; if (hit) shown++; });
  $('#gempty').hidden = shown > 0;
});
