const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const SVGNS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs = {}, text) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  return el;
}
function fmtMs(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(0)} µs`;
  return `${ms.toFixed(ms < 10 ? 2 : 1)} ms`;
}

/* ---------- Hero: the factory picture ---------- */
const PARTS = {
  compute: {
    cls: 'c-compute', title: 'Compute: the factory',
    body: 'Time the GPU spends doing actual math: adding and multiplying numbers. Speed is measured in FLOPS, floating-point operations per second. An A100 can do up to 312 trillion per second. This is the part you paid for, so you want the factory busy.'
  },
  memory: {
    cls: 'c-memory', title: 'Memory bandwidth: the warehouse and trucks',
    body: 'The factory has only a tiny, fast storeroom (SRAM). Everything else sits in a big, slower warehouse (DRAM, the GPU memory nvidia-smi shows). Time spent shipping numbers between them is memory-bandwidth time, and the factory is idle while it waits.'
  },
  overhead: {
    cls: 'c-overhead', title: 'Overhead: the office',
    body: 'Everything else. Python running your code, PyTorch deciding which GPU function to call, and the cost of launching it. If each job is tiny, the factory finishes instantly and waits for the next instruction.'
  }
};
let selectedPart = null;
function selectPart(p) {
  selectedPart = selectedPart === p ? null : p;
  $$('.scene .part').forEach(g => g.classList.toggle('dim', !!selectedPart && g.dataset.part !== selectedPart));
  $$('.timebar button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.part === selectedPart)));
  const ex = $('#explain');
  if (!selectedPart) {
    ex.innerHTML = '<p>Click a part of the picture, or one of the three colors, to see what it means. These three colors mean the same thing everywhere on this page.</p>';
    return;
  }
  const d = PARTS[selectedPart];
  ex.innerHTML = `<h3 class="${d.cls}">${d.title}</h3><p>${d.body}</p>`;
}
$$('.scene .part, .timebar button').forEach(el => {
  el.addEventListener('click', () => selectPart(el.dataset.part));
  if (el.tagName.toLowerCase() === 'g') {
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPart(el.dataset.part); }
    });
  }
});

// Trucks: loaded ones drive to the factory on the top lane, empty ones drive back below.
const truckLayer = $('#trucks');
const trucks = [];
function makeTruck(loaded) {
  const g = svg('g');
  const body = loaded ? '#E39A14' : '#fff';
  if (loaded) {
    g.append(svg('rect', { x: 0, y: 0, width: 30, height: 16, rx: 2, fill: body, stroke: '#8A5700', 'stroke-width': 1.5 }));
    g.append(svg('rect', { x: 30, y: 4, width: 10, height: 12, rx: 2, fill: '#8A5700' }));
  } else {
    g.append(svg('rect', { x: 10, y: 0, width: 30, height: 16, rx: 2, fill: body, stroke: '#8A5700', 'stroke-width': 1.5 }));
    g.append(svg('rect', { x: 0, y: 4, width: 10, height: 12, rx: 2, fill: '#8A5700' }));
  }
  truckLayer.append(g);
  return g;
}
for (let i = 0; i < 3; i++) trucks.push({ el: makeTruck(true), dir: 1, off: i / 3, y: 241 });
for (let i = 0; i < 3; i++) trucks.push({ el: makeTruck(false), dir: -1, off: i / 3 + 0.15, y: 267 });
const paper = $('#paper');
const gear = $('#gear');
function placeScene(t) {
  const span = 266 - 44;
  for (const tr of trucks) {
    const p = ((t / 6000) + tr.off) % 1;
    const x = tr.dir === 1 ? 206 + p * span : 206 + (1 - p) * span;
    tr.el.setAttribute('transform', `translate(${x.toFixed(1)} ${tr.y})`);
  }
  const py = ((t / 2600) % 1) * 30;
  paper.setAttribute('transform', `translate(0 ${py.toFixed(1)})`);
  gear.setAttribute('transform', `translate(520 268) rotate(${((t / 20) % 360).toFixed(1)})`);
}
if (reduceMotion) {
  placeScene(0);
} else {
  const loop = t => { placeScene(t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}

/* ---------- 1. Factory and trucks ---------- */
const ft = { f: 100, t: 60 };
function renderFT() {
  const out = Math.min(ft.f, ft.t);
  const max = Math.max(ft.f, ft.t, 100);
  $('#ft-f').style.width = `${(ft.f / max) * 100}%`;
  $('#ft-t').style.width = `${(ft.t / max) * 100}%`;
  $('#ft-o').style.width = `${(out / max) * 100}%`;
  $('#ft-fv').textContent = `${ft.f}/hr`;
  $('#ft-tv').textContent = `${ft.t}/hr`;
  $('#ft-ov').textContent = `${out}/hr`;
  const v = $('#ft-verdict');
  if (ft.f > ft.t) {
    v.className = 'verdict memory';
    v.innerHTML = '<b>The trucks are the bottleneck.</b> The factory sits idle part of the time. A bigger factory changes nothing here; this is what memory-bound means.';
  } else if (ft.t > ft.f) {
    v.className = 'verdict compute';
    v.innerHTML = '<b>The factory is the bottleneck.</b> Materials are piling up. More trucks change nothing here; this is what compute-bound means.';
  } else {
    v.className = 'verdict';
    v.innerHTML = '<b>Perfectly balanced.</b> Both sides are fully used. Speeding up either one alone won\'t help much.';
  }
}
$('#dbl-factory').addEventListener('click', () => { ft.f = Math.min(ft.f * 2, 6400); renderFT(); });
$('#dbl-trucks').addEventListener('click', () => { ft.t = Math.min(ft.t * 2, 6400); renderFT(); });
$('#reset-ft').addEventListener('click', () => { ft.f = 100; ft.t = 60; renderFT(); });
renderFT();

/* ---------- 2. BERT: share of math vs share of time ---------- */
const BERT = [
  { name: 'Matrix multiplies', flops: 99.8, time: 61.0, cls: 'compute' },
  { name: 'Normalization', flops: 0.17, time: 25.5, cls: 'memory' },
  { name: 'Pointwise operations', flops: 0.03, time: 13.5, cls: 'memory' }
];
const bertEl = $('#bert');
BERT.forEach(r => {
  const row = document.createElement('div');
  row.className = 'hbar';
  row.innerHTML = `<span class="name">${r.name}</span><div class="track"><div class="fill ${r.cls}"></div></div><span class="val"></span>`;
  bertEl.append(row);
  r.row = row;
});
function renderBert(mode) {
  $('#bert-flops').setAttribute('aria-pressed', String(mode === 'flops'));
  $('#bert-time').setAttribute('aria-pressed', String(mode === 'time'));
  BERT.forEach(r => {
    const v = r[mode];
    r.row.querySelector('.fill').style.width = `${v}%`;
    r.row.querySelector('.val').textContent = `${v}%`;
  });
  $('#bert-note').innerHTML = mode === 'flops'
    ? 'Matrix multiplies are <b>99.8%</b> of the math. The rest looks like a rounding error. Now switch to time.'
    : 'The "rounding error" takes <b>39%</b> of the time. Those operations are waiting on memory, not math.';
}
$('#bert-flops').addEventListener('click', () => renderBert('flops'));
$('#bert-time').addEventListener('click', () => renderBert('time'));
renderBert('flops');

/* ---------- 3. Fusion lab ---------- */
// 100M fp32 numbers on an A100: one read or write = 400 MB / 1.5 TB/s; one pass of math = 1e8 / 9.75e12 FLOPS.
const TRIP_MS = 0.4e9 / 1.5e12 * 1000;
const MATH_MS = 1e8 / 9.75e12 * 1000;
const OPS = {
  cos: { label: 'cos', code: '.cos()' },
  sin: { label: 'sin', code: '.sin()' },
  exp: { label: 'exp', code: '.exp()' },
  mul: { label: '× 2', code: '.mul(2)' },
  add: { label: '+ 1', code: '.add(1)' },
  relu: { label: 'relu', code: '.relu()' }
};
const MAX_OPS = 8;
let chain = ['cos', 'cos'];
const opBtns = $('#op-buttons');
for (const [key, op] of Object.entries(OPS)) {
  const b = document.createElement('button');
  b.className = 'btn';
  b.textContent = `Add ${op.label}`;
  b.addEventListener('click', () => { if (chain.length < MAX_OPS) { chain.push(key); renderFusion(); } });
  opBtns.append(b);
}
const resetBtn = document.createElement('button');
resetBtn.className = 'btn quiet';
resetBtn.textContent = 'Reset to cos, cos';
resetBtn.addEventListener('click', () => { chain = ['cos', 'cos']; renderFusion(); });
opBtns.append(resetBtn);

function segs(list, scale) {
  return list.map(([kind, ms]) => {
    const name = kind === 'read' ? 'read from memory' : kind === 'write' ? 'write to memory' : 'math';
    return `<div class="seg ${kind}" style="width:${(ms / scale) * 100}%" title="${name}: ${fmtMs(ms)}"></div>`;
  }).join('');
}
function renderFusion() {
  const k = chain.length;
  const chainEl = $('#chain');
  chainEl.innerHTML = '<span class="label">x</span>';
  chain.forEach((key, i) => {
    chainEl.insertAdjacentHTML('beforeend', '<span class="arrow" aria-hidden="true">›</span>');
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = `${OPS[key].label}<button aria-label="Remove ${OPS[key].label}" ${k === 1 ? 'disabled' : ''}>×</button>`;
    chip.querySelector('button').addEventListener('click', () => { if (chain.length > 1) { chain.splice(i, 1); renderFusion(); } });
    chainEl.append(chip);
  });
  $$('#op-buttons .btn:not(.quiet)').forEach(b => { b.disabled = k >= MAX_OPS; });

  const eager = k * (2 * TRIP_MS + MATH_MS);
  const fused = 2 * TRIP_MS + k * MATH_MS;
  const eagerSegs = [];
  chain.forEach(() => eagerSegs.push(['read', TRIP_MS], ['calc', MATH_MS], ['write', TRIP_MS]));
  const fusedSegs = [['read', TRIP_MS], ...chain.map(() => ['calc', MATH_MS]), ['write', TRIP_MS]];
  $('#lane-eager').innerHTML = segs(eagerSegs, eager);
  $('#lane-fused').innerHTML = segs(fusedSegs, eager);

  $('#fz-trips').textContent = `${2 * k} → 2`;
  $('#fz-eager').textContent = fmtMs(eager);
  $('#fz-fused').textContent = fmtMs(fused);
  $('#fz-speed').textContent = `${(eager / fused).toFixed(1)}×`;

  const lines = chain.map((key, i) => `x${i + 1} = ${i === 0 ? 'x' : 'x' + i}${OPS[key].code}`);
  $('#code-eager').textContent = lines.join('\n') + `\n# ${2 * k} trips to memory`;
  $('#code-fused').textContent = `y = x${chain.map(key => OPS[key].code).join('')}\n# 2 trips to memory`;
}
renderFusion();

/* ---------- 4. Compute intensity ---------- */
const N = 1e8, BW = 1.5e12, PEAK = 9.75e12, BYTES = 8; // read + write one fp32 per number
const MEM_S = N * BYTES / BW;
const CROSS = PEAK * BYTES / BW; // ~52 multiplications per number
function intensityAt(r) {
  const mem = MEM_S, cmp = N * r / PEAK, t = Math.max(mem, cmp);
  return { r, mem, cmp, t, tf: N * r / t / 1e12, bw: N * BYTES / t / 1e12 };
}
const roof = $('#roof');
const C = { l: 56, r: 34, t: 18, b: 44, w: 640, h: 300 };
const xMax = 10, yMin = -1.3, yMax = Math.log10(20);
const cx = v => C.l + (v / xMax) * (C.w - C.l - C.r);
const cy = tf => C.t + (1 - (Math.log10(tf) - yMin) / (yMax - yMin)) * (C.h - C.t - C.b);
(function drawRoof() {
  const x0 = cx(0), xc = cx(Math.log2(CROSS)), x1 = cx(xMax);
  roof.append(svg('rect', { x: x0, y: C.t, width: xc - x0, height: C.h - C.t - C.b, fill: '#F8E8C8' }));
  roof.append(svg('rect', { x: xc, y: C.t, width: x1 - xc, height: C.h - C.t - C.b, fill: '#DCE3FA' }));
  roof.append(svg('text', { x: x0 + 10, y: C.t + 20, fill: '#8A5700', 'font-weight': 700 }, 'Memory-bound'));
  roof.append(svg('text', { x: x1 - 10, y: C.t + 20, 'text-anchor': 'end', fill: '#2D55DB', 'font-weight': 700 }, 'Compute-bound'));
  [0.1, 1, 10].forEach(v => {
    roof.append(svg('line', { x1: x0, x2: x1, y1: cy(v), y2: cy(v), stroke: '#BCC3BC', 'stroke-width': 1 }));
    roof.append(svg('text', { x: x0 - 8, y: cy(v) + 4, 'text-anchor': 'end' }, String(v)));
  });
  [0, 2, 4, 6, 8, 10].forEach(v => {
    roof.append(svg('text', { x: cx(v), y: C.h - C.b + 20, 'text-anchor': 'middle' }, String(2 ** v)));
  });
  roof.append(svg('text', { x: (x0 + x1) / 2, y: C.h - 6, 'text-anchor': 'middle' }, 'Multiplications per number (repeat)'));
  roof.append(svg('text', { x: 14, y: (C.t + C.h - C.b) / 2, 'text-anchor': 'middle', transform: `rotate(-90 14 ${(C.t + C.h - C.b) / 2})` }, 'TFLOPS achieved'));
  roof.append(svg('line', { x1: x0, x2: x1, y1: cy(9.75), y2: cy(9.75), stroke: '#2D55DB', 'stroke-width': 1.5, 'stroke-dasharray': '5 5' }));
  roof.append(svg('text', { x: x1 - 10, y: cy(9.75) + 20, 'text-anchor': 'end', fill: '#2D55DB' }, 'peak: 9.75 TFLOPS'));
  let d = '';
  for (let v = 0; v <= xMax + 1e-9; v += 0.05) {
    const p = intensityAt(2 ** v);
    d += `${d ? 'L' : 'M'}${cx(v).toFixed(1)} ${cy(p.tf).toFixed(1)} `;
  }
  roof.append(svg('path', { d, fill: 'none', stroke: '#1C2320', 'stroke-width': 3 }));
  roof.append(svg('circle', { id: 'roof-dot', r: 8, fill: '#fff', stroke: '#1C2320', 'stroke-width': 3 }));
})();
function renderIntensity() {
  const v = parseFloat($('#rep').value);
  const r = Math.max(1, Math.round(2 ** v));
  const p = intensityAt(r);
  $('#rep-val').textContent = `${r}×`;
  $('#rep').setAttribute('aria-valuetext', `${r} multiplications per number`);
  $('#rep-code').textContent = `def f(x):\n    for _ in range(${r}):   # repeat = ${r}\n        x = x * 2\n    return x`;
  const dot = $('#roof-dot');
  dot.setAttribute('cx', cx(Math.log2(r)));
  dot.setAttribute('cy', cy(p.tf));
  const memBusy = p.mem / p.t * 100, cmpBusy = p.cmp / p.t * 100;
  $('#g-mem').textContent = `${memBusy.toFixed(0)}%`;
  $('#g-cmp').textContent = `${cmpBusy.toFixed(0)}%`;
  $('#g-mem-f').style.width = `${memBusy}%`;
  $('#g-cmp-f').style.width = `${cmpBusy}%`;
  $('#r-time').textContent = fmtMs(p.t * 1000);
  $('#r-tf').textContent = `${p.tf < 1 ? p.tf.toFixed(2) : p.tf.toFixed(1)} TF`;
  $('#r-bw').textContent = `${p.bw < 0.1 ? p.bw.toFixed(3) : p.bw.toFixed(2)} TB/s`;
  const ratio = p.cmp / p.mem;
  const vd = $('#r-verdict');
  if (ratio < 0.7) {
    vd.className = 'verdict memory';
    vd.innerHTML = `<b>Memory-bound.</b> The trucks are maxed out and the factory is idle ${(100 - cmpBusy).toFixed(0)}% of the time. Extra math here is free: runtime stays at ${fmtMs(p.t * 1000)}.`;
  } else if (ratio > 1.4) {
    vd.className = 'verdict compute';
    vd.innerHTML = '<b>Compute-bound.</b> The factory is maxed out. Each extra multiplication now adds time, and the trucks start waiting instead.';
  } else {
    vd.className = 'verdict';
    vd.innerHTML = `<b>Right at the tipping point.</b> About ${Math.round(CROSS)} multiplications per number keeps both the trucks and the factory busy.`;
  }
}
$('#rep').addEventListener('input', renderIntensity);
renderIntensity();

/* ---------- 5. Overhead timeline ---------- */
const LAUNCH_US = 10, KERNELS = 10;
function simulate(g, graphs) {
  const cpu = [], gpu = [];
  let prevEnd = 0;
  if (graphs) {
    cpu.push([0, 12]);
    for (let i = 0; i < KERNELS; i++) {
      const s = i === 0 ? 12 : prevEnd + 0.5;
      gpu.push([s, s + g]); prevEnd = s + g;
    }
  } else {
    for (let i = 0; i < KERNELS; i++) {
      const cs = i * LAUNCH_US, ce = cs + LAUNCH_US;
      cpu.push([cs, ce]);
      const s = Math.max(ce, prevEnd);
      gpu.push([s, s + g]); prevEnd = s + g;
    }
  }
  const total = Math.max(prevEnd, cpu[cpu.length - 1][1]);
  return { cpu, gpu, total, util: KERNELS * g / total };
}
const fmtUs = us => us >= 1000 ? `${(us / 1000).toFixed(2)} ms` : `${us < 10 ? us.toFixed(1) : us.toFixed(0)} µs`;
function renderOverhead() {
  const s = parseInt($('#ksize').value, 10);
  const g = 10 ** (s / 100 * Math.log10(200)); // 1 µs to 200 µs
  const graphs = $('#graphs').checked;
  const sim = simulate(g, graphs);
  const sim2 = simulate(2 * g, graphs);
  $('#ksize-val').textContent = fmtUs(g);
  $('#ksize').setAttribute('aria-valuetext', `${fmtUs(g)} of GPU work per operation`);

  const tl = $('#tl');
  tl.innerHTML = '';
  const L = 64, R = 12, W = 720 - L - R;
  const sx = t => L + (t / sim.total) * W;
  const lanes = [{ y: 22, name: 'CPU', blocks: sim.cpu, fill: '#B9327E' }, { y: 74, name: 'GPU', blocks: sim.gpu, fill: '#2D55DB' }];
  tl.append(svg('rect', { x: L, y: 74, width: W, height: 34, fill: '#D9DDD6' }));
  for (const lane of lanes) {
    tl.append(svg('text', { x: 0, y: lane.y + 22, 'font-weight': 700, fill: '#1C2320' }, lane.name));
    for (const [a, b] of lane.blocks) {
      tl.append(svg('rect', { x: sx(a), y: lane.y, width: Math.max(1.5, sx(b) - sx(a) - 1), height: 34, fill: lane.fill }));
    }
  }
  tl.append(svg('text', { x: L, y: 136 }, '0'));
  tl.append(svg('text', { x: 720 - R, y: 136, 'text-anchor': 'end' }, fmtUs(sim.total)));

  const util = sim.util * 100;
  const grow = (sim2.total / sim.total - 1) * 100;
  $('#o-util').textContent = `${util.toFixed(0)}%`;
  $('#o-total').textContent = fmtUs(sim.total);
  $('#o-double').textContent = `${grow.toFixed(0)}%`;
  const vd = $('#o-verdict');
  if (graphs) {
    const eagerTotal = simulate(g, false).total;
    vd.className = util < 50 ? 'verdict overhead' : 'verdict compute';
    vd.innerHTML = `<b>One launch instead of ten.</b> Total time drops from ${fmtUs(eagerTotal)} to ${fmtUs(sim.total)}. ` +
      (util < 50 ? 'The kernels are so tiny that even a single launch is a big share of the time.' : 'The GPU runs the kernels back to back without waiting for Python.');
  } else if (util < 50) {
    vd.className = 'verdict overhead';
    vd.innerHTML = `<b>Overhead-bound.</b> The GPU is idle ${(100 - util).toFixed(0)}% of the time, waiting for the CPU to hand over the next job. Doubling the work only makes it ${grow.toFixed(0)}% slower.`;
  } else if (util < 85) {
    vd.className = 'verdict';
    vd.innerHTML = '<b>Partly hidden.</b> The CPU sometimes keeps ahead, but gaps remain. Bigger operations or fewer launches would close them.';
  } else {
    vd.className = 'verdict compute';
    vd.innerHTML = '<b>The CPU is running ahead.</b> Kernels are long enough that the CPU queues the next one before the GPU needs it. The overhead is hidden.';
  }
}
$('#ksize').addEventListener('input', renderOverhead);
$('#graphs').addEventListener('change', renderOverhead);
renderOverhead();

/* ---------- 6. Quiz ---------- */
const CHOICES = { overhead: 'Overhead', memory: 'Memory bandwidth', compute: 'Compute' };
const QUIZ = [
  { q: 'You double the batch size, and each training step gets only 10% slower.', a: 'overhead',
    why: 'Overhead stays the same however big your data is. Compute and memory time grow with it, so runtime that barely moves means overhead dominates. Fix it with tracing, CUDA Graphs or a compiler.' },
  { q: 'A chain of six pointwise operations (add, multiply, an activation) runs one by one in eager mode on a huge tensor.', a: 'memory',
    why: 'Each operation sends the whole tensor to memory and back, with very little math per number. Fusing them into one kernel cuts six round trips to one.' },
  { q: 'Your model is mostly huge matrix multiplies, and the profiler shows 85% of peak FLOPS.', a: 'compute',
    why: 'At 85% of peak the factory is nearly flat out. Use Tensor Cores with lower precision, or get more hardware. Cutting overhead won\'t help much.' },
  { q: 'In the profiler, the GPU row is full of gaps while the CPU row is solid.', a: 'overhead',
    why: 'Gaps mean the GPU finishes each job and waits for the CPU to send the next. That\'s overhead not being hidden.' },
  { q: 'A fused kernel takes the same time whether it computes ReLU or the much longer GELU.', a: 'memory',
    why: 'The kernel spends its time moving data, so extra math is free until you reach the tipping point.' },
  { q: 'You upgrade to a GPU with twice the FLOPS but the same memory bandwidth, and your normalization-heavy model gets no faster.', a: 'memory',
    why: 'A bigger factory doesn\'t help when the trucks are the limit. This is the factory-and-trucks experiment from chapter 1.' },
  { q: 'Scientific code does millions of PyTorch operations, each on a tensor of 10 numbers.', a: 'overhead',
    why: 'Each tiny operation pays the full Python and PyTorch dispatch cost for almost no GPU work. PyTorch manages about 280 thousand of those a second.' }
];
const answers = new Array(QUIZ.length).fill(null);
const quizEl = $('#quiz');
QUIZ.forEach((item, i) => {
  const box = document.createElement('div');
  box.className = 'q';
  box.innerHTML = `<p class="ask" id="q${i}">${item.q}</p><div class="opts" role="group" aria-labelledby="q${i}"></div><p class="why" hidden></p>`;
  const opts = box.querySelector('.opts');
  for (const [key, label] of Object.entries(CHOICES)) {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = label;
    b.addEventListener('click', () => {
      answers[i] = key;
      $$('.btn', opts).forEach(x => x.classList.remove('right', 'wrong'));
      const ok = key === item.a;
      b.classList.add(ok ? 'right' : 'wrong');
      const why = box.querySelector('.why');
      why.hidden = false;
      why.innerHTML = ok
        ? `<b>Right, it's ${CHOICES[item.a].toLowerCase()}.</b> ${item.why}`
        : '<b>Not quite.</b> Think about which part would still be busy if you made the others infinitely fast. Try another answer.';
      renderScore();
    });
    opts.append(b);
  }
  quizEl.append(box);
});
function renderScore() {
  const right = answers.filter((a, i) => a === QUIZ[i].a).length;
  $('#score').textContent = `${right} of ${QUIZ.length} diagnosed`;
}
renderScore();

/* ---------- Glossary ---------- */
const GLOSSARY = [
  ['FLOP', 'One floating-point operation: a single add or multiply on decimal numbers.'],
  ['FLOPS and teraflops', 'FLOPs per second, a measure of how fast hardware does math. One teraflop is a trillion per second.'],
  ['Compute-bound', 'Most time goes to actual math. The factory is the bottleneck. Fix: Tensor Cores or more hardware.'],
  ['Memory-bandwidth bound', 'Most time goes to moving data between GPU memory and the compute units. Fix: operator fusion.'],
  ['Overhead-bound', 'Most time goes to Python, framework dispatch and kernel launches while the GPU waits. Fix: tracing, CUDA Graphs, compilers.'],
  ['Matrix multiplication (matmul)', 'Multiplying grids of numbers. The core of neural networks, and 99.8% of BERT\'s math.'],
  ['Tensor Cores', 'GPU circuits built only for matrix multiplication. On an A100: 312 TFLOPS for matmuls versus 19.5 for everything else.'],
  ['Kernel', 'A function that runs on the GPU. Each PyTorch operation usually launches one or more kernels.'],
  ['DRAM (global memory)', 'The GPU\'s big, slower memory: the warehouse. It\'s what nvidia-smi reports and what runs out in "CUDA out of memory".'],
  ['SRAM (shared memory)', 'Small, very fast memory right next to the compute units: the factory\'s storeroom.'],
  ['Memory bandwidth', 'How many bytes per second can move between DRAM and the compute units. About 1.5 TB/s on an A100.'],
  ['Pointwise operation', 'An operation applied to each number on its own, like cos(x) or x × 2. Little math, lots of data movement. A unary operation takes one input.'],
  ['Reduction', 'An operation that combines many numbers into fewer, like a sum or a max.'],
  ['Operator fusion', 'Running several operations in one kernel so data stays in fast memory between them. The most important optimization in deep learning compilers.'],
  ['Eager mode', 'Running each operation as soon as Python reaches it. Flexible and easy to debug, but it can\'t fuse because it doesn\'t know what comes next.'],
  ['Compute intensity', 'How much math you do for each byte you move. Higher intensity shifts you from memory-bound toward compute-bound.'],
  ['Rematerialization (activation checkpointing)', 'Recomputing values instead of storing them. Since math is cheap and memory trips are expensive, it can save both memory and time.'],
  ['Asynchronous execution', 'The CPU queues GPU work and keeps going without waiting, so it can run ahead and hide its overhead.'],
  ['Dispatch', 'The work PyTorch does to choose the right kernel, checking things like data type, device and whether gradients are needed.'],
  ['Tracing', 'Recording a program\'s operations once so they can be replayed without Python\'s step-by-step decisions. Examples: jit.trace, FX, jax.jit.'],
  ['JIT compiler', 'A compiler that works while your program runs. The essay points to TorchDynamo, which later became the engine behind torch.compile.'],
  ['CUDA Graphs', 'A way to record a whole sequence of GPU kernels and launch it in one go, cutting per-launch overhead.'],
  ['GPU-Util', 'The nvidia-smi figure for the share of time some kernel is running on the GPU. A low number often points to overhead.'],
  ['Profiler', 'A tool that records what the CPU and GPU did over time. Gaps on the GPU row point to overhead.'],
  ['Triton, NVFuser, XLA', 'Tools that generate fused GPU code. Triton lets you write your own fused kernels in Python-like code.']
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
  $$('.term', glossEl).forEach(el => {
    const hit = !q || el.dataset.search.includes(q);
    el.hidden = !hit;
    if (hit) shown++;
  });
  $('#gempty').hidden = shown > 0;
});
