const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const SVGNS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs = {}, text) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  return el;
}
const pct = p => {
  if (p === 0) return '0%';
  if (p > 0.9995 && p < 1) return '>99.9%';
  if (p > 0 && p < 0.0005) return '<0.1%';
  return `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;
};
const COLORS = { q: '#0E7C66', k: '#6A45D9', v: '#D99A00', ink: '#1C2320' };
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a.toFixed(3)})`;
}
function setPressed(buttons, active) {
  buttons.forEach(b => b.setAttribute('aria-pressed', String(b === active)));
}

/* ---------- Attention data for the hero sentence ---------- */
const BASE = ['The', 'animal', "didn't", 'cross', 'the', 'street', 'because', 'it', 'was', 'too'];
const words = end => [...BASE, end];

// Raw affinities per head; normalized so each row sums to 1. Unlisted words get a small base.
function rawRow(head, i, end) {
  const t = end === 'tired';
  const H = [
    [{ 0: 1, 1: 3 }, { 0: 2, 1: 2, 3: 1 }, { 1: 2, 2: 1, 3: 2 }, { 1: 2, 3: 1, 5: 2 }, { 4: 1, 5: 3 }, { 3: 2, 4: 2, 5: 1 },
     { 3: 1.5, 6: 1, 8: 1.5 }, t ? { 0: 1.5, 1: 5, 5: 0.6, 7: 1 } : { 1: 0.6, 4: 1.5, 5: 5, 7: 1 },
     { 7: 3, 8: 1 }, { 9: 1, 10: 3 }, t ? { 1: 2.5, 7: 2, 10: 1 } : { 5: 2.5, 7: 2, 10: 1 }],
    [{ 0: 1, 1: 1 }, { 1: 1, 2: 1, 10: t ? 2 : 0.4 }, { 2: 1, 3: 3 }, { 2: 2, 3: 1, 6: 1 }, { 4: 1, 5: 1 }, { 3: 2, 5: 1, 10: t ? 0.3 : 2 },
     { 6: 1, 8: 1, 10: 2 }, { 7: 1, 8: 1.6, 9: 1.2, 10: 4.5 }, { 7: 1, 8: 1, 10: 3 }, { 9: 1, 10: 3 }, { 7: 1.5, 9: 2, 10: 1 }],
  ];
  if (head < 2) return H[head][i];
  const n = 11, r = {};
  if (head === 2) { r[i] = 1; if (i > 0) r[i - 1] = 4; }
  if (head === 3) { r[i] = 1; if (i < n - 1) r[i + 1] = 4; }
  if (head === 4) { r[i] = 6; }
  if (head === 5) { r[0] = 4; r[i] = (r[i] || 0) + 1; }
  if (head === 6) { for (let j = 0; j < n; j++) r[j] = 1; }
  if (head === 7) {
    const m = { 0: { 1: 2 }, 1: { 3: 4 }, 2: { 3: 3 }, 3: { 1: 2 }, 4: { 5: 2 }, 5: { 3: 4 }, 6: { 8: 2 }, 7: { 8: 4 }, 8: { 7: 3 }, 9: { 8: 2 }, 10: { 8: 3 } };
    Object.assign(r, m[i]); r[i] = (r[i] || 0) + 1;
  }
  return r;
}
function weights(head, i, end) {
  const raw = rawRow(head, i, end);
  const row = Array.from({ length: 11 }, (_, j) => (raw[j] || 0) + (head === 6 ? 0 : 0.15));
  const s = row.reduce((a, b) => a + b, 0);
  return row.map(x => x / s);
}

/* ---------- Hero: attention arcs ---------- */
const hero = { head: 0, end: 'tired', sel: 7 };
const arcsSvg = $('#arcs');
const BASELINE = 272;
let wordEls = [];
function buildSentence() {
  arcsSvg.innerHTML = '';
  arcsSvg.append(svg('g', { id: 'arc-layer' }));
  const ws = words(hero.end);
  let fs = 34;
  const gap = 18;
  wordEls = ws.map((w, i) => {
    const g = svg('g', { class: 'word', tabindex: 0, role: 'button', 'data-i': i });
    const t = svg('text', { y: BASELINE, 'font-size': fs, fill: COLORS.ink }, w);
    g.append(svg('rect', { class: 'hit' }), t, svg('line', { class: 'under' }));
    g.addEventListener('click', () => { hero.sel = i; renderHero(); });
    g.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hero.sel = i; renderHero(); }
      if (e.key === 'ArrowRight' && i < ws.length - 1) { hero.sel = i + 1; renderHero(); wordEls[i + 1].g.focus(); }
      if (e.key === 'ArrowLeft' && i > 0) { hero.sel = i - 1; renderHero(); wordEls[i - 1].g.focus(); }
    });
    arcsSvg.append(g);
    return { g, t, w };
  });
  const measure = () => wordEls.reduce((a, e) => a + e.t.getComputedTextLength(), 0) + gap * (ws.length - 1);
  let total = measure();
  if (total > 1010) {
    fs = fs * 1010 / total;
    wordEls.forEach(e => e.t.setAttribute('font-size', fs.toFixed(1)));
    total = measure();
  }
  let x = (1040 - total) / 2;
  wordEls.forEach(e => {
    const w = e.t.getComputedTextLength();
    e.t.setAttribute('x', x.toFixed(1));
    e.cx = x + w / 2;
    const [hit, , under] = e.g.children;
    hit.setAttribute('x', x - 6); hit.setAttribute('y', BASELINE - fs); hit.setAttribute('width', w + 12); hit.setAttribute('height', fs + 16);
    under.setAttribute('x1', x); under.setAttribute('x2', x + w); under.setAttribute('y1', BASELINE + 9); under.setAttribute('y2', BASELINE + 9);
    x += w + gap;
  });
  renderHero();
}
function renderHero() {
  const ws = words(hero.end);
  const w = weights(hero.head, hero.sel, hero.end);
  const layer = $('#arc-layer');
  layer.innerHTML = '';
  const y0 = BASELINE - 36;
  const others = w.map((v, j) => ({ v, j })).filter(o => o.j !== hero.sel);
  const max = Math.max(...others.map(o => o.v));
  const top = [...others].sort((a, b) => b.v - a.v).slice(0, 3).map(o => o.j);
  for (const { v, j } of others) {
    const x1 = wordEls[hero.sel].cx, x2 = wordEls[j].cx;
    const h = Math.min(440, 34 + Math.abs(x2 - x1) * 0.44);
    const mid = (x1 + x2) / 2;
    layer.append(svg('path', {
      d: `M${x1.toFixed(1)} ${y0} Q${mid.toFixed(1)} ${(y0 - h).toFixed(1)} ${x2.toFixed(1)} ${y0}`,
      fill: 'none', stroke: COLORS.k, 'stroke-width': (1 + 15 * v).toFixed(2), 'stroke-linecap': 'round',
      opacity: (0.18 + 0.82 * (v / max)).toFixed(2)
    }));
    if (top.includes(j) && v > 0.04) {
      layer.append(svg('text', { x: mid, y: y0 - h / 2 - 9, 'text-anchor': 'middle', 'font-size': 21, 'font-weight': 700, fill: COLORS.k, stroke: '#F8F9F6', 'stroke-width': 6, 'paint-order': 'stroke', style: 'font-family:var(--body)' }, pct(v)));
    }
  }
  wordEls.forEach((e, i) => {
    e.g.classList.toggle('is-q', i === hero.sel);
    e.g.setAttribute('aria-pressed', String(i === hero.sel));
    e.g.setAttribute('aria-label', `${e.w}${i === hero.sel ? ', selected' : `, ${pct(w[i])} attention`}`);
  });
  const ranked = others.sort((a, b) => b.v - a.v);
  const headName = hero.head === 0 ? '"Who is it?"' : '"What is it like?"';
  $('#reading').innerHTML = `Reading <b class="c-q">"${ws[hero.sel]}"</b> with the ${headName} head, it looks most at <b class="c-k">"${ws[ranked[0].j]}"</b> (${pct(ranked[0].v)}), then <b class="c-k">"${ws[ranked[1].j]}"</b> (${pct(ranked[1].v)}). It keeps ${pct(w[hero.sel])} on itself.`;
}
$$('[data-head]').forEach(b => b.addEventListener('click', () => {
  hero.head = +b.dataset.head; setPressed($$('[data-head]'), b); renderHero();
}));
$$('[data-end]').forEach(b => b.addEventListener('click', () => {
  hero.end = b.dataset.end; setPressed($$('[data-end]'), b); buildSentence();
}));
buildSentence();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildSentence);

/* ---------- 1. Architecture ---------- */
const ARCH = {
  'enc-in': ['Embedding + position', 'Each French word becomes a vector of 512 numbers, plus a second vector that marks its position. Only the bottom encoder does this. Higher encoders take the output of the one below.'],
  'enc-self': ['Self-attention (encoder)', 'Every input word looks at every other input word to understand itself better. This is the only place where words in the encoder share information.'],
  'enc-ffn': ['Feed-forward network', 'A small neural network applied to each word on its own: the same network and weights for every position. Because the words don\'t depend on each other here, they all run in parallel.'],
  'stack': ['Six layers', 'The encoder is six layers stacked on top of each other, and so is the decoder. Each layer has the same structure but learns its own weights. Six isn\'t special; it\'s just what the paper used.'],
  'dec-in': ['Decoder input', 'The English words written so far, turned into vectors and given positions the same way. At the very start this is just a start signal.'],
  'dec-self': ['Masked self-attention', 'The decoder looks at the English it has already written. Words it hasn\'t written yet are masked out, so it can\'t peek ahead at the answer.'],
  'enc-dec': ['Encoder-decoder attention', 'Queries come from the decoder; keys and values come from the top encoder. This is how each English word looks back at the French sentence.'],
  'dec-ffn': ['Feed-forward network', 'The same kind of per-word network as in the encoder, with its own weights.'],
  'out': ['Linear + softmax', 'Turns the top decoder\'s vector into a score for every word the model knows, then into probabilities. The most likely word is written next, here "student".']
};
const archParts = $$('#arch .part');
function showPart(p) {
  archParts.forEach(g => g.classList.toggle('on', g.dataset.part === p));
  const [t, d] = ARCH[p];
  $('#arch-explain').innerHTML = `<h3>${t}</h3><p>${d}</p>`;
}
archParts.forEach(g => {
  g.addEventListener('click', () => showPart(g.dataset.part));
  g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showPart(g.dataset.part); } });
});
function setBox(open) {
  $('#arch-box').style.display = open ? 'none' : '';
  $('#arch-inner').style.display = open ? '' : 'none';
  const b = $('#open-box');
  b.setAttribute('aria-pressed', String(open));
  b.textContent = open ? 'Close the box' : 'Open the box';
  if (open) {
    $('#arch-explain').innerHTML = '<p>Click any part. Encoder on the left, decoder on the right. The violet line carries the encoder\'s understanding of the French into every decoder layer.</p>';
  } else {
    archParts.forEach(g => g.classList.remove('on'));
    $('#arch-explain').innerHTML = '<p>The black box takes a French sentence and writes English. Open it to see the parts.</p>';
  }
}
$('#open-box').addEventListener('click', () => setBox($('#arch-box').style.display !== 'none'));
setBox(false);

/* ---------- 2. Embeddings and positions ---------- */
function hashVec(word, n = 16) {
  let h = 2166136261;
  for (const c of word) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Array.from({ length: n }, (_, i) => {
    h = Math.imul(h ^ (h >>> 13), 1274126177) + i;
    return ((h >>> 0) % 2000) / 1000 - 1;
  });
}
function posVec(pos, d) {
  return Array.from({ length: d }, (_, i) => {
    const k = Math.floor(i / 2);
    const angle = pos / Math.pow(10000, (2 * k) / d);
    return i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
  });
}
const grey = v => {
  const t = Math.max(0, Math.min(1, (v + 1.6) / 3.2));
  return `hsl(150 10% ${(94 - t * 78).toFixed(1)}%)`;
};
const SENTS = { a: ['dog', 'bites', 'man'], b: ['man', 'bites', 'dog'] };
function renderVectors() {
  const on = $('#add-pos').checked;
  for (const [id, ws] of Object.entries(SENTS)) {
    $(`#sent-${id}`).innerHTML = ws.map((w, p) => {
      const e = hashVec(w), pv = posVec(p + 1, 16);
      const vals = on ? e.map((x, i) => x + 0.8 * pv[i]) : e;
      return `<div class="vec-row"><b>${w}<span>${on ? `position ${p + 1}` : 'no position'}</span></b><div class="strip" aria-hidden="true">${vals.map(v => `<i style="background:${grey(v)}"></i>`).join('')}</div></div>`;
    }).join('');
  }
  const v = $('#pos-verdict');
  if (on) {
    v.className = 'verdict q';
    v.innerHTML = '<b>Now they differ.</b> "dog" at position 1 and "dog" at position 3 have different vectors, so the model can tell who bit whom.';
  } else {
    v.className = 'verdict v';
    v.innerHTML = '<b>Same three vectors, listed in a different order.</b> Self-attention compares every word with every other word regardless of order, so to it these two sentences look identical.';
  }
}
$('#add-pos').addEventListener('change', renderVectors);
renderVectors();

(function drawPE() {
  const pe = $('#pe'), D = 64, N = 20, L = 44, T = 8, cw = (720 - L - 4) / D, ch = 15.5;
  const half = D / 2;
  // Article's figure layout: sine values in the left half, cosine values in the right half.
  const peRow = pos => Array.from({ length: D }, (_, i) => {
    const k = i % half;
    const angle = pos / Math.pow(10000, k / half);
    return i < half ? Math.sin(angle) : Math.cos(angle);
  });
  for (let p = 0; p < N; p++) {
    const row = peRow(p + 1);
    pe.append(svg('text', { x: L - 8, y: T + p * ch + ch * 0.72, 'text-anchor': 'end' }, String(p + 1)));
    row.forEach((v, i) => {
      const t = (v + 1) / 2;
      pe.append(svg('rect', { x: (L + i * cw).toFixed(2), y: (T + p * ch).toFixed(2), width: (cw + 0.3).toFixed(2), height: (ch + 0.3).toFixed(2), fill: `hsl(150 10% ${(95 - t * 80).toFixed(1)}%)` }));
    });
  }
  const hl = svg('rect', { x: L - 1, y: 0, width: 720 - L - 2, height: ch, fill: 'none', stroke: COLORS.q, 'stroke-width': 3, visibility: 'hidden' });
  pe.append(hl);
  const pick = evt => {
    const pt = pe.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    const p = pt.matrixTransform(pe.getScreenCTM().inverse());
    const row = Math.floor((p.y - T) / ch);
    if (row < 0 || row >= N) return;
    hl.setAttribute('y', (T + row * ch).toFixed(2)); hl.setAttribute('visibility', 'visible');
    $('#pe-note').innerHTML = `<b>Position ${row + 1}.</b> In each half, the columns on the left change quickly from one position to the next (fast waves) and the columns on the right barely change (slow waves). Together they give every position its own fingerprint.`;
  };
  pe.addEventListener('pointermove', pick);
  pe.addEventListener('pointerdown', pick);
})();

/* ---------- 3. Self-attention stepper ---------- */
const SA = {
  words: ['Thinking', 'Machines'],
  scores: [[112, 96], [88, 104]],
  q: [[0.7, 0.4, 0.9], [0.3, 0.8, 0.5]],
  k: [[0.8, 0.5, 0.7], [0.4, 0.9, 0.3]],
  v: [[0.9, 0.3, 0.6], [0.2, 0.8, 0.4]]
};
const sa = { qi: 0, step: 1 };
const STEP_TEXT = [
  w => `<b>1. Make the query, key and value.</b> Multiply each word's embedding by W<sup>Q</sup>, W<sup>K</sup> and W<sup>V</sup>. Every word now has a <span class="c-q">query</span>, a <span class="c-k">key</span> and a <span class="c-v">value</span>. We're reading "${w}", so we use its query.`,
  w => `<b>2. Score each word.</b> Take the <dfn>dot product</dfn> of "${w}"'s query with each word's key: multiply them number by number and add it all up. A higher score means that key matches what the query is looking for.`,
  () => `<b>3. Scale down.</b> Divide each score by 8, the square root of 64 (the key length). Large scores would make the next step all-or-nothing; dividing keeps training stable.`,
  () => `<b>4. Softmax.</b> Turn the scores into weights that are all positive and add up to 100%. A word usually gives itself the most weight, but relevant words still get a share.`,
  () => `<b>5. Weigh the values.</b> Multiply each word's value by its weight. Words that matter stay strong; the rest fade almost to nothing.`,
  w => `<b>6. Add them up.</b> The sum, <b>z</b>, is the new vector for "${w}": its own meaning blended with clues from the words it attended to. z goes on to the feed-forward network.`
];
const mini = (vec, hex, scale = 1) => `<span class="mini" aria-hidden="true">${vec.map(x => `<i style="background:${rgba(hex, 0.12 + 0.88 * x * scale)}"></i>`).join('')}</span>`;
function saCompute() {
  const div = $('#no-scale').checked ? 1 : 8;
  const scaled = SA.scores[sa.qi].map(s => s / div);
  const m = Math.max(...scaled);
  const ex = scaled.map(s => Math.exp(s - m));
  const sum = ex.reduce((a, b) => a + b, 0);
  const p = ex.map(e => e / sum);
  const z = [0, 1, 2].map(i => p[0] * SA.v[0][i] + p[1] * SA.v[1][i]);
  return { div, scaled, p, z };
}
const stepsEl = $('#steps');
for (let s = 1; s <= 6; s++) {
  const b = document.createElement('button');
  b.textContent = s;
  b.setAttribute('aria-label', `Step ${s}`);
  b.addEventListener('click', () => { sa.step = s; renderSA(); });
  stepsEl.append(b);
}
function renderSA() {
  const { div, scaled, p, z } = saCompute();
  const w = SA.words[sa.qi], st = sa.step;
  $$('button', stepsEl).forEach((b, i) => {
    b.classList.toggle('done', i + 1 < st);
    if (i + 1 === st) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
  $('#step-text').innerHTML = STEP_TEXT[st - 1](w);
  const cls = n => (st >= n ? '' : 'hide');
  let html = `<thead><tr><th scope="col">Word</th><th scope="col">Key</th><th scope="col">Value</th><th scope="col" class="${cls(2)}">Score</th><th scope="col" class="${cls(3)}">÷${div}</th><th scope="col" class="${cls(4)}">Softmax</th><th scope="col" class="${cls(5)}">Value × weight</th></tr></thead><tbody>`;
  html += `<tr><td colspan="7" style="color:var(--ink-2)">Query of "${w}": ${mini(SA.q[sa.qi], COLORS.q)}</td></tr>`;
  SA.words.forEach((word, j) => {
    html += `<tr><td><b>${word}</b></td><td>${mini(SA.k[j], COLORS.k)}</td><td>${mini(SA.v[j], COLORS.v)}</td>` +
      `<td class="num ${cls(2)}">${SA.scores[sa.qi][j]}</td><td class="num ${cls(3)}">${+scaled[j].toFixed(2)}</td>` +
      `<td class="num ${cls(4)}">${pct(p[j])}</td><td class="${cls(5)}">${mini(SA.v[j], COLORS.v, p[j])} ×${p[j] < 0.01 ? p[j].toExponential(0) : p[j].toFixed(2)}</td></tr>`;
  });
  html += `<tr class="sum"><td colspan="6" class="${cls(6)}" style="text-align:right"><b>z for "${w}" (sum)</b></td><td class="${cls(6)}">${mini(z, COLORS.v)}</td></tr></tbody>`;
  $('#calc').innerHTML = html;
  $('#step-back').disabled = st === 1;
  $('#step-next').disabled = st === 6;
  const note = $('#scale-note');
  if ($('#no-scale').checked && st >= 3) {
    note.hidden = false;
    note.className = 'verdict k';
    note.innerHTML = `<b>Without the ÷8, softmax goes all-or-nothing.</b> "${SA.words[p[0] > p[1] ? 0 : 1]}" gets ${pct(Math.max(...p))} and the other word almost nothing. Tiny weights pass back tiny learning signals, which is why the paper scales the scores.`;
  } else {
    note.hidden = true;
  }
}
$('#step-back').addEventListener('click', () => { if (sa.step > 1) { sa.step--; renderSA(); } });
$('#step-next').addEventListener('click', () => { if (sa.step < 6) { sa.step++; renderSA(); } });
$('#no-scale').addEventListener('change', renderSA);
$$('[data-qword]').forEach(b => b.addEventListener('click', () => { sa.qi = +b.dataset.qword; setPressed($$('[data-qword]'), b); renderSA(); }));
renderSA();

/* ---------- 4. Multi-head attention ---------- */
const HEADS = [
  ['Who is it?', 'Links a word to what it refers to. Reading "it", this head looks at "animal".'],
  ['What is it like?', 'Links a word to words that describe it. Reading "it", this head looks at "tired".'],
  ['Previous word', 'Each word looks at the word just before it. Handy for short phrases like "too tired".'],
  ['Next word', 'Each word looks at the word just after it.'],
  ['Itself', 'Each word mostly keeps its own meaning and looks at little else.'],
  ['Start of sentence', 'Most attention goes to the first word. Heads often park attention there when they find nothing useful.'],
  ['Everything a little', 'Spreads attention evenly, collecting a summary of the whole sentence.'],
  ['Nouns to verbs', 'Links things to the action they take part in: "animal" and "street" look at "cross", "it" looks at "was".']
];
const HW = words('tired');
const MATS = HEADS.map((_, h) => HW.map((__, i) => weights(h, i, 'tired')));
const mh = { head: 0, r: 7, c: 1 };
const headsEl = $('#head-picker');
HEADS.forEach(([name], h) => {
  const b = document.createElement('button');
  b.className = 'head-btn';
  b.setAttribute('aria-pressed', String(h === 0));
  b.setAttribute('aria-label', `Head ${h + 1}: ${name}`);
  const s = svg('svg', { viewBox: '0 0 44 44', 'aria-hidden': 'true' });
  MATS[h].forEach((row, i) => row.forEach((v, j) => {
    s.append(svg('rect', { x: j * 4, y: i * 4, width: 4, height: 4, fill: rgba(COLORS.q, Math.min(1, 0.06 + v * 1.6)) }));
  }));
  b.append(s);
  b.insertAdjacentHTML('beforeend', `<span>${h + 1}. ${name}</span>`);
  b.addEventListener('click', () => { mh.head = h; setPressed($$('.head-btn'), b); renderHeat(); });
  headsEl.append(b);
});
const heat = $('#heat');
heat.setAttribute('tabindex', '0');
const HL = 92, HT = 92, CS = (520 - HL) / 11;
function renderHeat() {
  heat.innerHTML = '';
  const M = MATS[mh.head];
  HW.forEach((w, i) => {
    heat.append(svg('text', { x: HL - 8, y: HT + i * CS + CS * 0.62, 'text-anchor': 'end', 'font-weight': i === mh.r ? 700 : 400, fill: i === mh.r ? COLORS.q : '#4B544F' }, w));
    const cx = HL + i * CS + CS / 2;
    heat.append(svg('text', { x: cx, y: HT - 8, transform: `rotate(-50 ${cx} ${HT - 8})`, 'font-weight': i === mh.c ? 700 : 400, fill: i === mh.c ? COLORS.k : '#4B544F' }, w));
  });
  M.forEach((row, i) => row.forEach((v, j) => {
    const r = svg('rect', { class: 'cell', x: HL + j * CS + 1, y: HT + i * CS + 1, width: CS - 2, height: CS - 2, rx: 2, fill: rgba(COLORS.q, Math.min(1, 0.05 + v * 1.4)) });
    const choose = () => { mh.r = i; mh.c = j; renderHeat(); };
    r.addEventListener('pointerenter', choose);
    r.addEventListener('click', choose);
    heat.append(r);
  }));
  heat.append(svg('rect', { x: HL + mh.c * CS + 0.5, y: HT + mh.r * CS + 0.5, width: CS - 1, height: CS - 1, fill: 'none', stroke: COLORS.ink, 'stroke-width': 2.5, 'pointer-events': 'none' }));
  heat.setAttribute('aria-label', `Head ${mh.head + 1}. Use arrow keys to move. Selected: reading ${HW[mh.r]}, looking at ${HW[mh.c]}, ${pct(M[mh.r][mh.c])}.`);
  $('#head-name').textContent = `Head ${mh.head + 1}: ${HEADS[mh.head][0]}`;
  $('#head-desc').textContent = HEADS[mh.head][1];
  $('#cell-info').innerHTML = `Reading <b class="c-q">"${HW[mh.r]}"</b>, this head gives <b class="c-k">"${HW[mh.c]}"</b> <b>${pct(M[mh.r][mh.c])}</b> of its attention.`;
}
heat.addEventListener('keydown', e => {
  const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
  if (!d) return;
  e.preventDefault();
  mh.r = Math.max(0, Math.min(10, mh.r + d[0]));
  mh.c = Math.max(0, Math.min(10, mh.c + d[1]));
  renderHeat();
});
renderHeat();

(function drawConcat() {
  const c = $('#concat');
  for (let h = 0; h < 8; h++) {
    const x = 10 + h * 64;
    c.append(svg('rect', { x, y: 30, width: 58, height: 56, rx: 3, fill: rgba(COLORS.q, 0.15 + h * 0.06), stroke: COLORS.q, 'stroke-width': 1.5 }));
    c.append(svg('text', { x: x + 29, y: 64, 'text-anchor': 'middle', 'font-weight': 700 }, `Z${h + 1}`));
  }
  c.append(svg('text', { x: 266, y: 18, 'text-anchor': 'middle', fill: '#4B544F' }, 'concatenate: 8 × 64 = 512 numbers per word'));
  c.append(svg('text', { x: 560, y: 66, 'font-size': 22, 'font-weight': 700 }, '×'));
  c.append(svg('rect', { x: 588, y: 22, width: 92, height: 72, rx: 3, fill: '#fff', stroke: COLORS.ink, 'stroke-width': 2 }));
  c.append(svg('text', { x: 634, y: 64, 'text-anchor': 'middle', 'font-weight': 700 }, 'Wᴼ'));
  c.append(svg('text', { x: 700, y: 66, 'font-size': 22, 'font-weight': 700 }, '='));
  c.append(svg('rect', { x: 730, y: 30, width: 150, height: 56, rx: 3, fill: rgba(COLORS.q, 0.55), stroke: COLORS.q, 'stroke-width': 2 }));
  c.append(svg('text', { x: 805, y: 64, 'text-anchor': 'middle', 'font-weight': 700, fill: '#fff' }, 'Z'));
  c.append(svg('text', { x: 805, y: 110, 'text-anchor': 'middle', fill: '#4B544F' }, 'one vector per word'));
})();

/* ---------- 6. Decoder ---------- */
const FR = ['je', 'suis', 'étudiant'];
const EN = ['i', 'am', 'a', 'student', '<eos>'];
const VOCAB = ['a', 'am', 'i', 'thanks', 'student', '<eos>'];
const DEC_ATT = [[.78, .14, .08], [.12, .80, .08], [.10, .35, .55], [.05, .10, .85], [.30, .30, .40]];
const DEC_P = [
  [.05, .06, .78, .03, .05, .03],
  [.08, .74, .06, .02, .06, .04],
  [.62, .05, .04, .03, .22, .04],
  [.06, .03, .02, .04, .81, .04],
  [.03, .02, .03, .02, .05, .85]
];
const esc = s => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
function bars(el, labels, values, fillCls, pickIdx) {
  el.innerHTML = labels.map((l, i) => `<div class="hbar${i === pickIdx ? ' pick' : ''}"><span class="name">${esc(l)}</span><div class="track"><div class="fill ${fillCls}" style="width:${(values[i] * 100).toFixed(1)}%"></div></div><span class="val">${pct(values[i])}</span></div>`).join('');
}
let ds = 0;
function renderDec() {
  const t = Math.min(ds, 4);
  const att = DEC_ATT[t], probs = DEC_P[t];
  const frTop = att.indexOf(Math.max(...att));
  const order = probs.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]);
  const pick = order[0][1], second = order[1][1];
  $('#dec-in').innerHTML = '<span class="label">French input:</span>' + FR.map((w, i) => `<span class="tok" style="${i === frTop && ds < 5 ? `border-color:${COLORS.k};background:var(--k-soft)` : ''}">${w}</span>`).join('');
  let out = '<span class="label">English output:</span><span class="tok out" title="start signal">&lt;start&gt;</span>';
  EN.forEach((w, i) => {
    if (i < ds) out += `<span class="tok out">${esc(w)}</span>`;
    else if (i === ds) out += '<span class="tok next">?</span>';
    else out += '<span class="tok masked" title="masked: score set to minus infinity">masked</span>';
  });
  $('#dec-out').innerHTML = out;
  bars($('#dec-att'), FR, att, 'k', -1);
  bars($('#dec-prob'), VOCAB, probs, 'q', pick);
  const v = $('#dec-verdict');
  if (ds >= 5) {
    v.innerHTML = '<b>Done.</b> The model wrote <code>&lt;eos&gt;</code>, the end-of-sentence word, so it stops: "i am a student".';
  } else {
    const seen = ['&lt;start&gt;', ...EN.slice(0, ds).map(esc)].join(', ');
    v.innerHTML = `<b>Step ${ds + 1}.</b> Masked self-attention can see: ${seen}. Encoder-decoder attention looks mostly at "${FR[frTop]}". Greedy decoding writes <b>"${esc(VOCAB[pick])}"</b> (${pct(probs[pick])}). Beam search with beam size 2 would also keep "${esc(VOCAB[second])}" (${pct(probs[second])}) as a backup.`;
  }
  $('#dec-back').disabled = ds === 0;
  $('#dec-next').disabled = ds >= 5;
}
$('#dec-next').addEventListener('click', () => { if (ds < 5) { ds++; renderDec(); } });
$('#dec-back').addEventListener('click', () => { if (ds > 0) { ds--; renderDec(); } });
$('#dec-reset').addEventListener('click', () => { ds = 0; renderDec(); });
renderDec();

/* ---------- 7. Training ---------- */
const T_START = [.20, .15, .25, .10, .18, .12];
const T_END = [.02, .02, .02, .90, .02, .02];
const TARGET = 3;
function renderTrain() {
  const a = +$('#train').value / 100;
  const p = T_START.map((s, i) => s * (1 - a) + T_END[i] * a);
  const best = p.indexOf(Math.max(...p));
  bars($('#t-target'), VOCAB, VOCAB.map((_, i) => (i === TARGET ? 1 : 0)), 'ink', TARGET);
  bars($('#t-guess'), VOCAB, p, 'q', best);
  const label = a === 0 ? 'untrained' : a === 1 ? 'trained' : `${Math.round(a * 100)}% trained`;
  $('#train-val').textContent = label;
  $('#train').setAttribute('aria-valuetext', label);
  $('#t-p').textContent = pct(p[TARGET]);
  $('#t-loss').textContent = (-Math.log(p[TARGET])).toFixed(2);
}
$('#train').addEventListener('input', renderTrain);
renderTrain();

/* ---------- 8. Quiz ---------- */
const QUIZ = [
  { q: 'In "The animal didn\'t cross the street because it was too tired", what lets the model work out that "it" means the animal?',
    o: ['Self-attention', 'Positional encoding', 'The final softmax'], a: 0,
    why: 'While reading "it", self-attention scores every other word and blends in the most relevant one, "animal".' },
  { q: 'Why does the Transformer add a positional encoding to each word?',
    o: ['To make the vectors smaller', 'Because otherwise word order is invisible', 'To pick the output word'], a: 1,
    why: 'Self-attention compares all words with each other in no particular order. Without positions, "dog bites man" and "man bites dog" look the same.' },
  { q: 'A word\'s query is compared against other words\' ___ to get the scores.',
    o: ['Values', 'Keys', 'Embeddings'], a: 1,
    why: 'Score = query · key. The values are what gets blended in afterwards, using the softmax weights.' },
  { q: 'Why are the scores divided by 8 before the softmax?',
    o: ['8 is the number of heads', 'To save memory', '8 = √64, which keeps softmax from going all-or-nothing'], a: 2,
    why: 'Large scores make softmax give one word nearly everything, which gives weak learning signals. Dividing by √d_k keeps gradients stable.' },
  { q: 'What does multi-head attention do with the outputs of its eight heads?',
    o: ['Keeps only the best head', 'Concatenates them and multiplies by Wᴼ', 'Averages them'], a: 1,
    why: 'The eight Z matrices are joined end to end, then multiplied by Wᴼ to get one vector per word again.' },
  { q: 'In the decoder, masked self-attention lets each position look at…',
    o: ['Only earlier positions', 'Only later positions', 'Only the French input'], a: 0,
    why: 'Future positions are set to −∞ before the softmax, so they get 0%. The model can\'t peek at words it hasn\'t written.' },
  { q: 'In encoder-decoder attention, where do the keys and values come from?',
    o: ['The decoder layer below', 'The output of the encoder stack', 'The vocabulary'], a: 1,
    why: 'Queries come from the decoder; keys and values come from the top encoder. That\'s how the decoder looks back at the input sentence.' },
  { q: 'Keeping the top 2 unfinished translations at every step, instead of only the best word, is called…',
    o: ['Greedy decoding', 'Beam search', 'Backpropagation'], a: 1,
    why: 'Beam search with beam size 2 keeps two candidates and extends both. Greedy decoding keeps only the single best word.' }
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
  ['Transformer', 'A model built around attention instead of reading words one by one. Introduced in "Attention Is All You Need" (2017).'],
  ['Attention', 'A way for the model to decide which other words matter when it processes a word, and blend in their information.'],
  ['Self-attention', 'Attention between words of the same sentence. Each word looks at every other word, including itself.'],
  ['Encoder', 'The half that reads the input sentence and builds an understanding of every word. The paper stacks six.'],
  ['Decoder', 'The half that writes the output one word at a time, using the encoder\'s understanding. Also six layers.'],
  ['Sub-layer', 'A part inside an encoder or decoder layer, such as self-attention or the feed-forward network.'],
  ['Feed-forward network', 'A small neural network applied to each word separately, with the same weights for every position.'],
  ['Weights (parameters)', 'The numbers a model learns during training. Every matrix like Wᴼ is full of them.'],
  ['Vector', 'A list of numbers. Each word becomes a vector so the model can do math with it.'],
  ['Tensor', 'The general word for a grid of numbers: a vector is 1-D, a matrix is 2-D, and so on.'],
  ['Matrix', 'A 2-D grid of numbers. Stacking every word\'s vector as a row gives a matrix, so all words are processed at once.'],
  ['Embedding', 'Turning a word into a vector. The paper uses 512 numbers per word.'],
  ['Dimension', 'How many numbers a vector has: 512 for embeddings, 64 for queries, keys and values in the paper.'],
  ['Positional encoding', 'A vector added to each word\'s embedding to mark its position, built from sine and cosine waves.'],
  ['Query (Q)', 'What a word is looking for. Compared against every key to score relevance.'],
  ['Key (K)', 'The label a word advertises so queries can find it.'],
  ['Value (V)', 'The information a word hands over, weighted by how relevant it was.'],
  ['Wᑫ, Wᴷ, Wⱽ', 'The three learned matrices that turn an embedding into a query, a key and a value.'],
  ['Dot product', 'Multiply two vectors number by number and add the results. Big when the vectors point the same way.'],
  ['Score', 'Query · key: how well one word matches what another is looking for.'],
  ['Scaling (÷√dₖ)', 'Dividing scores by the square root of the key length (√64 = 8) to keep softmax and training stable.'],
  ['Softmax', 'Turns a list of scores into probabilities that are positive and add up to 100%.'],
  ['Attention weights', 'The softmax outputs: how much of each word\'s value gets blended in.'],
  ['z (attention output)', 'The weighted sum of values: a word\'s new vector after attention.'],
  ['Multi-head attention', 'Running attention several times in parallel (8 in the paper) with different weights, then combining.'],
  ['Attention head', 'One of those parallel runs, with its own Wᑫ, Wᴷ and Wⱽ. Each tends to learn a different pattern.'],
  ['Representation subspace', 'A different "angle" on the words. Each head projects the words into its own one.'],
  ['Concatenate', 'Join vectors end to end. The 8 head outputs are concatenated before Wᴼ.'],
  ['Wᴼ', 'The learned matrix that squeezes the concatenated head outputs back into one vector per word.'],
  ['Residual connection', 'Adding a sub-layer\'s input back onto its output, a shortcut that keeps the original information.'],
  ['Layer normalization', 'Rescaling each word\'s numbers into a steady range after every sub-layer.'],
  ['Masking', 'Hiding future words in the decoder by setting their scores to −∞, so they get 0% after softmax.'],
  ['Encoder-decoder attention', 'Decoder attention whose queries come from the decoder and keys and values from the encoder.'],
  ['Linear layer', 'A layer that multiplies by a matrix. At the end it turns the decoder\'s vector into one score per vocabulary word.'],
  ['Logits', 'The raw scores from the final linear layer, one per vocabulary word, before softmax.'],
  ['Vocabulary', 'Every word the model can output. Often 30,000 to 50,000 words; 6 in the toy example.'],
  ['<eos>', 'The end-of-sentence word. When the decoder writes it, the translation is finished.'],
  ['Greedy decoding', 'Always writing the single most likely word at each step.'],
  ['Beam search', 'Keeping the few best unfinished outputs at each step and extending all of them. Beam size sets how many.'],
  ['One-hot encoding', 'A vector as long as the vocabulary with 1 for one word and 0 for the rest. Used to write the right answer.'],
  ['Loss function', 'A number for how wrong the model\'s output is. Training tries to make it small.'],
  ['Cross-entropy', 'A common loss for comparing probability lists. Here: −log(probability given to the right word).'],
  ['Backpropagation', 'Working out how much each weight contributed to the loss, so every weight can be nudged to reduce it.'],
  ['Hyperparameter', 'A setting chosen by people rather than learned, like 6 layers, 8 heads or the beam size.'],
  ['Parallelization', 'Doing many calculations at the same time. Transformers process all words at once, so they train fast.'],
  ['RNN', 'Recurrent neural network: an older model that reads one word at a time, carrying a memory (hidden state) forward.'],
  ['seq2seq', 'Sequence-to-sequence: any model that turns one sequence (a French sentence) into another (an English one).']
];
const glossEl = $('#gloss');
GLOSSARY.forEach(([t, d]) => {
  const div = document.createElement('div');
  div.className = 'term';
  div.innerHTML = `<dt>${esc(t)}</dt><dd>${d}</dd>`;
  div.dataset.search = `${t} ${d}`.toLowerCase();
  glossEl.append(div);
});
$('#gfilter').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  let shown = 0;
  $$('.term', glossEl).forEach(el => {
    const hit = !q || el.dataset.search.includes(q);
    el.hidden = !hit;
    if (hit) shown++;
  });
  $('#gempty').hidden = shown > 0;
});
