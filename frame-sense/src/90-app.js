/* ============================================================
   APP — the roll, the briefs, the drill engine, the results.
   ============================================================ */
const App = { screen: 'home', level: null, run: null, thumbs: {}, plates: {} };
const byId = id => document.getElementById(id);
const pad2 = n => String(n).padStart(2, '0');
const starsHTML = n => `<span class="stars" aria-hidden="true">${'★'.repeat(n)}<span class="off">${'★'.repeat(3 - n)}</span></span>`;
const pct = v => Math.round(v * 100) + '%';
const secs = v => (v == null ? '–' : v.toFixed(1) + ' s');
const LOCK_SVG = '<span class="fr-lock"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="1.5" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.2"/></svg></span>';

function show(name) {
  for (const s of $$('.screen')) s.hidden = s.dataset.screen !== name;
  App.screen = name;
  const sc = $(`.screen[data-screen="${name}"]`);
  if (sc) sc.scrollTop = 0;
}
let toastTimer = 0;
function toast(msg) {
  const t = byId('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}
function ratioChip(label, aspect) {
  const w = aspect >= 1 ? 16 : Math.max(6, Math.round(16 * aspect)), h = aspect >= 1 ? Math.max(6, Math.round(16 / aspect)) : 16;
  return `<span class="chip"><i style="width:${w}px;height:${h}px"></i>${esc(label)}</span>`;
}

/* ---------------- the roll (home) ---------------- */
const THUMB_SPECS = {
  crop: ['crop', 'tight'], device: ['device', 'thirds'], stack: ['stack', 'symmetry+lines+frame'], edge: ['edge', 'knees'], ab: ['ab', 'crown'], print: ['print', null],
  recrop: ['recrop', null], brief: ['brief', 'threeq'], compose: ['compose', 'frame'], cull: ['crop', 'wide'], second: ['edge', 'partner'], gallery: ['stack', 'thirds+lines'],
};
const THUMB_SEEDS = { crop: 9017, device: 9131, stack: 9262, edge: 9393, ab: 9524, print: 9655, recrop: 9786, brief: 9917, compose: 10048, cull: 10179, second: 10310, gallery: 10441 };
function buildThumbs() {
  for (const l of LEVELS) {
    const spec = THUMB_SPECS[l.id];
    let it;
    try { it = GENERATORS[spec[0]](RNG(THUMB_SEEDS[l.id]), spec[1] || undefined); } catch (e) { it = genCrop(RNG(THUMB_SEEDS[l.id]), 'detail'); }
    const crop = it.crop || it.source || it.a.crop;
    let over = null;
    if (it.kind === 'make') over = () => boxPath(it.ref, 'ov-acc');
    else if (it.kind === 'print') over = () => boxPath(it.win, it.answer === 'fits' ? 'ov-good' : 'ov-bad');
    else if (l.id === 'device') over = sq => ovThirds(sq);
    else if (l.id === 'edge' || l.id === 'second') over = sq => edgeLine(rInset(sq, sq.h * 0.02), l.id === 'edge' ? 'bottom' : 'right', 'ov-bad');
    App.thumbs[l.id] = squareThumb(it.scene, crop, over);
  }
}
function renderHome() {
  const nxt = nextLevel();
  let h = `<div class="sheet-head"><span class="label">The roll</span><span class="data">ALBANY 400 · 120 · 6×6 · 12 EXP</span></div>`;
  h += `<div class="strips">`;
  STRIPS.forEach((st, si) => {
    h += `<div class="strip-wrap"><div class="strip-name"><b>${st.name}</b><span>${st.sub}</span></div><div class="strip">`;
    for (const l of LEVELS) {
      if (l.strip !== si) continue;
      const rec = levelRec(l.id), open = isOpen(l), next = !!nxt && nxt.id === l.id && open;
      h += `<button type="button" class="fr${open ? '' : ' is-locked'}${next ? ' is-next' : ''}" data-level="${l.id}" aria-label="Frame ${l.n}, ${esc(l.name)}, ${open ? rec.stars + ' of 3 stars' : 'locked'}">` +
        `<span class="fr-edge"><span>▸ ${l.n}</span><i>ALBANY 400</i></span>` +
        `<span class="fr-img">${App.thumbs[l.id] || ''}${open ? '' : LOCK_SVG}${next ? '<span class="fr-next">Next</span>' : ''}</span>` +
        `<span class="fr-cap"><b>${esc(l.name)}</b>${open ? starsHTML(rec.stars || 0) : ''}</span></button>`;
    }
    h += `</div></div>`;
  });
  byId('sheet').innerHTML = h + `</div>`;

  if (nxt) {
    byId('nextUp').innerHTML = `<section class="next-up"><div><div class="num">${P.totals.frames ? 'UP NEXT' : 'START HERE'} · FRAME ${pad2(nxt.n)} · ${STRIPS[nxt.strip].name.toUpperCase()}</div>` +
      `<h2 class="h-display" style="font-size:clamp(24px,4.4vw,34px)">${esc(nxt.name)}</h2><p>${esc(nxt.blurb)}</p></div>` +
      `<div class="go"><button type="button" class="btn btn-primary" data-level="${nxt.id}">${P.totals.frames ? 'Continue' : 'Load the roll'}</button><span class="goal">${esc(goalText(nxt))}</span></div></section>`;
  } else {
    byId('nextUp').innerHTML = `<section class="next-up"><div><div class="num">ROLL FINISHED</div><h2 class="h-display" style="font-size:clamp(24px,4.4vw,34px)">All twelve frames passed</h2><p>Go back for the third star on any frame, or drill the ones you miss most.</p></div></section>`;
  }
  let s = '';
  const t = P.totals;
  s += `<section class="card"><span class="label">Your numbers</span><div class="stats">` +
    `<div class="stat"><b>${t.frames ? pct(t.keepers / t.frames) : '–'}</b><span>keeper rate</span></div>` +
    `<div class="stat"><b>${t.frames}</b><span>frames culled</span></div>` +
    `<div class="stat"><b>${t.streak || 0}</b><span>best streak</span></div></div></section>`;
  const weak = weakSpots(4);
  s += `<section class="card"><span class="label">Weak spots</span>`;
  if (weak.length) {
    s += `<ul class="weak">` + weak.map(w => `<li><span>${esc(tagName(w.tag))}</span><span class="bar"><i style="width:${Math.round(w.miss * 100)}%"></i></span><span class="data">${Math.round(w.miss * 100)}% miss</span></li>`).join('') + `</ul>`;
    s += weak.some(w => tagSpec(w.tag)) ? `<button type="button" class="btn" id="btnWeak">Drill these</button>` : '';
  } else s += `<p class="muted">The frames you miss most will show up here once you have shot a few.</p>`;
  s += `</section>`;
  s += `<section class="card"><span class="label">Crop Lab</span><p>Re-crop your own photos for every delivery ratio. They stay on this device.</p><button type="button" class="btn" id="btnLab">Open Crop Lab</button></section>`;
  byId('side').innerHTML = s;
  byId('foot').innerHTML = `<span>${Sync.state === 'synced' ? 'Progress is saved to your Claude account.' : 'Progress is saved in this browser.'}</span>` +
    `<button type="button" id="btnOpenAll">${P.settings.openAll ? 'Lock frames again' : 'Open every frame'}</button><button type="button" id="btnReset">Reset progress</button>`;
  const sb = byId('btnSound');
  const snd = P.settings.sound !== false;
  sb.setAttribute('aria-pressed', snd ? 'true' : 'false');
  sb.setAttribute('aria-label', snd ? 'Sound is on. Turn it off.' : 'Sound is off. Turn it on.');
  sb.title = snd ? 'Sound on' : 'Sound off';
  sb.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/>` +
    (snd ? `<path d="M15.5 8.8a4.6 4.6 0 0 1 0 6.4M18 6.3a8.2 8.2 0 0 1 0 11.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>` : `<path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`) + `</svg>`;
}
function onSyncChange() { if (App.screen === 'home') renderHome(); }

/* ---------------- briefs ---------------- */
const thumbFig = (it, name, sub, overlay) => `<figure><div class="thumb" style="aspect-ratio:${r1(it.crop.w / it.crop.h * 100) / 100}">${frameSVG(it.scene, it.crop, { overlay: overlay || '' })}</div><figcaption>${esc(name)}${sub ? `<i>${esc(sub)}</i>` : ''}</figcaption></figure>`;
const landscapeItem = (gen, key, seed) => { for (let i = 0; i < 40; i++) { const it = gen(RNG(seed + i * 17), key); const c = it.crop || it.source; if (c.w > c.h) return it; } return gen(RNG(seed), key); };
const taskPlate = (it, label) => `<figure><div class="thumb" style="aspect-ratio:${r1(it.source.w / it.source.h * 100) / 100};max-height:420px;margin-inline:auto">${frameSVG(it.scene, it.source, { dof: false, overlay: dimOutside(it.source, it.ref) + boxPath(it.ref, 'ov-acc') })}</div><figcaption>${esc(label)}<i>${esc(it.brief.text)}</i></figcaption></figure>`;
const BRIEFS = {
  crop: {
    plate: () => `<div class="plate-grid">` + CROPS.map((c, i) => thumbFig(landscapeItem(genCrop, c.key, 5100 + i * 71), c.name, c.sub)).join('') + `</div>`,
    rules: ['Answer with keys <b>1</b> to <b>6</b>, or tap.', 'A keeper moves on by itself. A miss stops and shows you the frame in context.', '<b>Wide</b> means the subject is under 40% of the frame height. <b>Full-length</b> means the feet are in, with floor under them.', '<b>Three-quarter</b> ends mid-thigh. <b>Waist-up</b> ends just below the waist. <b>Tight</b> ends mid-chest.'],
  },
  device: {
    plate: () => `<div class="plate-grid">` + DEVICES.map((d, i) => { const it = genDevice(RNG(6200 + i * 53), d.key); return thumbFig(it, d.name, d.sub, ovDevice(it, 130)); }).join('') + `</div>`,
    rules: ['Each frame is built around one device. Pick the one doing the most work.', '<b>Thirds</b> needs the subject off-centre on a third line. <b>Symmetry</b> needs both halves to mirror.', '<b>Negative space</b> needs a small subject and a lot of nothing. <b>Layering</b> needs something soft and close to the lens.', 'After each answer the guides are drawn on the frame.'],
  },
  stack: {
    plate: () => `<div class="plate-grid">` + ['symmetry+lines+frame', 'thirds+lines', 'thirds+layers'].map((k, i) => { const it = genStack(RNG(7300 + i * 91), k); return thumbFig(it, it.answer.map(deviceName).join(' + '), '', ovDevice(it, 130)); }).join('') + `</div>`,
    rules: ['Toggle every device you see with keys <b>1</b> to <b>6</b>, then lock with <b>Enter</b>.', 'The answer has to match exactly. One missing or one extra is a miss.', 'Some frames still use a single device.'],
  },
  edge: {
    plate: () => ladderDiagram(),
    rules: ['Tap the edge that hurts the crop, or use the <b>arrow keys</b>. <b>Space</b> calls the frame clean.', '<b>Bottom:</b> never on a joint, and never through hands or feet.', '<b>Top:</b> give the head room. Touching the edge is as bad as cutting it.', '<b>Sides:</b> no clipped elbows and no half people.', 'About one frame in five has nothing wrong with it.'],
  },
  ab: {
    plate: () => { const it = genAB(RNG(8411), 'knees'); return `<div class="plate-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">` + ['a', 'b'].map(w => `<figure><div class="thumb" style="aspect-ratio:${r1(it.a.crop.w / it.a.crop.h * 100) / 100}">${frameSVG(it.scene, it[w].crop, { overlay: w === it.answer ? '' : ovABBad(it, w, 240) })}</div><figcaption>Frame ${w.toUpperCase()}<i>${w === it.answer ? 'stronger' : 'ends on the knees'}</i></figcaption></figure>`).join('') + `</div>`; },
    rules: ['Tap the stronger frame, or press <b>←</b> or <b>→</b>.', 'The weaker frame has exactly one flaw: a joint on the edge, a shaved head, a sliced person, a clipped elbow, or a tilt of two to three degrees.', 'Everything else about the two crops is the same.'],
  },
  print: {
    plate: () => ratioDiagram(),
    rules: ['Press <b>F</b> if everyone fits the new ratio, <b>C</b> if someone gets cut.', 'Prints follow the orientation of the frame. Instagram portrait and Reels are always vertical.', 'Know what each ratio keeps of a 3:2 frame:'],
    extra: () => `<table class="table"><thead><tr><th>Delivery</th><th>Ratio</th><th>From a 3:2</th><th>From a 2:3</th></tr></thead><tbody>` + RATIO_TABLE.map(r => `<tr><td>${r[0]}</td><td class="data">${r[1]}</td><td class="data">${r[2]}</td><td class="data">${r[3]}</td></tr>`).join('') + `</tbody></table>`,
  },
  recrop: {
    plate: () => taskPlate(genRecrop(RNG(8853), '8x10'), 'One strong answer'),
    rules: ['Drag the box, pull a corner, or pinch. Arrow keys move it, <b>+</b> and <b>−</b> resize, <b>Enter</b> locks.', 'Scored out of 100: everyone in (35), clean edges (30), headroom (15), how much of the frame you kept (20).', 'When the new ratio cannot hold a full-length, come in to the next safe line instead of cutting at the ankles.', '75 points keeps a crop.'],
  },
  brief: {
    plate: () => taskPlate(genBrief(RNG(8971), 'threeq'), 'Three-quarter, cut from a loose frame'),
    rules: ['The brief names a crop and a ratio. Cut it out of the loose frame.', 'Scored out of 100: the right crop (40), clean edges (25), headroom (15), placement (20).', 'Placement means centred, or on a third.'],
  },
  compose: {
    plate: () => taskPlate(genCompose(RNG(9094), 'frame'), 'Frame in frame'),
    rules: ['Five briefs: thirds, symmetry, negative space, frame in frame, leading lines.', 'Each is scored on what that device needs. Symmetry is judged to about one percent of dead centre.', 'You are finding the picture inside a wider frame, the way you would in an edit.'],
  },
  cull: {
    plate: () => `<div class="plate-grid">` + [['crop', 'wide'], ['device', 'lines'], ['crop', 'threeq']].map((s, i) => { const it = landscapeItem(GENERATORS[s[0]], s[1], 9500 + i * 37); return thumbFig(it, s[0] === 'crop' ? cropName(s[1]) : deviceName(s[1]), ''); }).join('') + `</div>`,
    rules: ['Sixty seconds of crops and devices, mixed.', 'The clock only runs while a frame is waiting for your answer.', '16 keepers at 85% passes. 20 earns two stars, and 24 at 90% earns three.'],
  },
  second: {
    plate: () => `<div class="plate-grid">` + [['edge', 'knees'], ['edge', 'partner'], ['edge', 'crown']].map((s, i) => { const it = landscapeItem(genEdge, s[1], 9700 + i * 41); return thumbFig(it, tagName(it.tag), ''); }).join('') + `</div>`,
    rules: ['Seventy-five seconds of edge checks, pairs and print checks.', 'The clock only runs while a frame is waiting for your answer.', '13 keepers at 80% passes. 17 earns two stars, and 21 at 90% earns three.'],
  },
  gallery: {
    plate: () => `<div class="plate-grid">` + [['crop', 'full'], ['device', 'symmetry'], ['edge', 'elbow']].map((s, i) => { const it = landscapeItem(GENERATORS[s[0]], s[1], 9900 + i * 43); return thumbFig(it, s[0] === 'crop' ? cropName(s[1]) : s[0] === 'device' ? deviceName(s[1]) : tagName(it.tag), ''); }).join('') + `</div>`,
    rules: ['Twenty frames drawn from every level on the roll.', 'The last four are cropped by hand, and each counts as a keeper at 75 points.', '17 of 20 passes. 18 earns two stars, and 19 earns three.'],
  },
};
function plateFor(id) {
  if (!App.plates[id]) { try { App.plates[id] = BRIEFS[id].plate(); } catch (e) { App.plates[id] = ''; } }
  return App.plates[id];
}
function targetsHTML(l) {
  const rec = levelRec(l.id), c = (b, s) => `<div><b>${b}</b><span>${s}</span></div>`;
  if (l.mode === 'make') return c(l.pass + ' pts', 'to pass') + c('93 pts', 'for three stars') + c(rec.score != null ? rec.score + ' pts' : '–', 'your best');
  if (l.mode === 'timed') return c(l.seconds + ' s', 'on the clock') + c(l.need + ' keepers', 'to pass') + c(rec.keepers != null && rec.plays ? rec.keepers : '–', 'your best');
  if (l.mode === 'exam') return c(l.count, 'frames') + c(pct(l.pass), 'to pass') + c(rec.acc != null ? pct(rec.acc) : '–', 'your best');
  return c(pct(l.pass), 'keepers to pass') + c(secs(l.pace), 'pro pace') + c(rec.acc != null ? pct(rec.acc) + (rec.pace != null ? ' · ' + secs(rec.pace) : '') : '–', 'your best');
}
function briefHTML(l) {
  const b = BRIEFS[l.id];
  return `<div class="brief-grid"><div class="plate">${plateFor(l.id)}</div><div><ul class="rules">${b.rules.map(r => `<li><span>${r}</span></li>`).join('')}</ul>${b.extra ? `<div style="margin-top:14px;overflow-x:auto">${b.extra()}</div>` : ''}`;
}
function openLevel(id) {
  const l = levelById(id);
  if (!l) return;
  if (!isOpen(l)) { toast(`Pass frame ${l.n - 1} to open this one.`); return; }
  App.level = l;
  byId('levelBody').innerHTML =
    `<div class="crumb"><button type="button" class="btn btn-quiet" data-nav="home">← The roll</button></div>` +
    `<header class="level-head"><div class="num">FRAME ${pad2(l.n)} · ${STRIPS[l.strip].name.toUpperCase()} ${starsHTML(levelRec(l.id).stars || 0)}</div><h1 class="h-display">${esc(l.name)}</h1><p class="lede">${esc(l.blurb)}</p></header>` +
    briefHTML(l) + `<div class="targets">${targetsHTML(l)}</div><div class="row"><button type="button" class="btn btn-primary" id="btnStart">Start <kbd>↵</kbd></button></div></div></div>`;
  show('level');
  byId('btnStart').focus({ preventScroll: true });
}
function openGuide() {
  byId('guideBody').innerHTML =
    `<div class="crumb"><button type="button" class="btn btn-quiet" data-nav="home">← The roll</button></div>` +
    `<header class="level-head"><h1 class="h-display">Field guide</h1><p class="lede">Every rule the roll tests, in one place.</p></header>` +
    LEVELS.slice(0, 9).map(l => `<section class="guide-sec"><h2 class="h-2">${esc(l.name)}</h2>${briefHTML(l)}</div></div></section>`).join('');
  show('guide');
}

/* ---------------- the drill engine ---------------- */
const EDGE_ZONES = ['top', 'right', 'bottom', 'left'].map(e => `<button type="button" class="edge-zone" data-edge="${e}" aria-label="${e} edge"></button>`).join('');
const EDGE_KEYS = { top: '↑', right: '→', bottom: '↓', left: '←', clean: 'space' };

function startRun(level) {
  Sound.wake();
  if (App.run) { clearInterval(App.run.timer); clearTimeout(App.run.auto); if (App.run.tool) App.run.tool.destroy(); }
  const R = RNG(nextSeed());
  const run = App.run = {
    level, R, deck: level.deck ? level.deck(R) : null, i: 0, log: [], streak: 0, best: 0, state: 'idle', item: null,
    t0: 0, left: (level.seconds || 0) * 1000, lastTick: 0, timer: 0, auto: 0, tool: null, picked: new Set(), leaving: false, aspect: 1.5,
  };
  App.last = level;
  byId('drillName').textContent = (level.n ? pad2(level.n) + ' · ' : '') + level.name;
  byId('leave').hidden = true;
  show('drill');
  if (level.mode === 'timed') run.timer = setInterval(tick, 100);
  nextItem();
}
function tick() {
  const run = App.run;
  if (!run || run.level.mode !== 'timed') return;
  const now = performance.now();
  if (run.state === 'asking' && !run.leaving) run.left -= Math.min(250, now - run.lastTick);
  run.lastTick = now;
  renderClock();
  if (run.left <= 0) finishRun();
}
function renderClock() {
  const run = App.run, c = byId('clock');
  if (!c || !run) return;
  const s = Math.max(0, Math.ceil(run.left / 1000));
  c.firstChild.textContent = Math.floor(s / 60) + ':' + pad2(s % 60);
  c.classList.toggle('low', s <= 10);
}
function renderBar() {
  const run = App.run, l = run.level, log = run.log;
  const keepers = log.filter(e => e.ok).length, quick = log.filter(e => e.quick), made = log.filter(e => !e.quick);
  const cell = (b, s, cls) => `<div class="${cls || ''}"><b>${b}</b><span>${s}</span></div>`;
  let pips = '';
  if (run.deck) {
    for (let i = 0; i < run.deck.length; i++) pips += `<i class="pip${i < log.length ? (log[i].ok ? ' k' : ' m') : i === log.length ? ' now' : ''}"></i>`;
  }
  byId('pips').innerHTML = pips;
  let r = '';
  if (l.mode === 'timed') {
    r = `<div class="clock" id="clock"><b>0:00</b><span>left</span></div>` + cell(keepers + '/' + l.need, 'keepers') + cell(log.length ? pct(keepers / log.length) : '–', 'rate', 'opt-stat');
  } else if (l.mode === 'make') {
    r = cell(Math.min(log.length + 1, run.deck.length) + '/' + run.deck.length, 'frame') + cell(made.length ? Math.round(made.reduce((a, e) => a + e.score, 0) / made.length) : '–', 'average');
  } else {
    r = cell(Math.min(log.length + 1, run.deck.length) + '/' + run.deck.length, 'frame') + cell(log.length ? pct(keepers / log.length) : '–', 'keepers') +
      cell(quick.length ? secs(quick.reduce((a, e) => a + e.ms, 0) / quick.length / 1000) : '–', 'pace', 'opt-stat');
  }
  byId('readout').innerHTML = r;
  renderClock();
}
function nextItem() {
  const run = App.run;
  if (!run) return;
  clearTimeout(run.auto);
  if (run.tool) { run.tool.destroy(); run.tool = null; }
  if (run.deck && run.i >= run.deck.length) { finishRun(); return; }
  const item = run.item = makeItem(run.deck ? run.deck[run.i] : run.level.mix(run.R));
  run.picked = new Set();
  byId('btnNext').hidden = true;
  mountItem(item);
  renderBar();
  run.state = 'asking';
  run.t0 = run.lastTick = performance.now();
}
function mountItem(item) {
  const run = App.run, frames = byId('frames'), k = item.kind;
  frames.className = 'frames';
  if (k === 'ab') {
    frames.innerHTML = ['a', 'b'].map(w => `<button type="button" class="frame" data-pick="${w}" aria-label="Frame ${w.toUpperCase()}">${frameSVG(item.scene, item[w].crop, { tilt: item[w].tilt })}<span class="frame-tag">${w.toUpperCase()}</span></button>`).join('');
    run.aspect = item.a.crop.w / item.a.crop.h;
  } else if (k === 'make') {
    frames.innerHTML = `<div class="frame" id="cropHost">${frameSVG(item.scene, item.source, { dof: false })}</div>`;
    run.aspect = item.source.w / item.source.h;
  } else {
    frames.innerHTML = `<div class="frame" id="theFrame">${frameSVG(item.scene, item.crop)}${k === 'edge' ? EDGE_ZONES : ''}</div>`;
    run.aspect = item.crop.w / item.crop.h;
  }
  layoutFrames();
  if (k === 'make') {
    run.tool = CropTool(byId('cropHost'), { source: item.source, aspect: item.aspect });
    if (window.matchMedia && window.matchMedia('(hover: hover)').matches) run.tool.focus();
  }
  renderConsole(item);
  byId('live').textContent = item.kind === 'make' ? item.brief.title + '. ' + item.brief.text : item.prompt;
}
function layoutFrames() {
  const run = App.run;
  if (!run || !run.item || App.screen !== 'drill') return;
  const st = byId('stage'), frames = byId('frames'), nodes = $$('.frame', frames);
  const pad = run.item.kind === 'edge' ? 30 : 16;
  frames.style.padding = pad + 'px';
  const W = Math.min(st.clientWidth - pad * 2, 1080), H = st.clientHeight - pad * 2, a = run.aspect;
  if (W <= 0 || H <= 0 || !nodes.length) return;
  let w;
  if (nodes.length === 2) {
    const gap = 12, wRow = Math.min((W - gap) / 2, H * a), wCol = Math.min(W, (H - gap) / 2 * a);
    frames.classList.toggle('col', wCol > wRow);
    w = Math.max(wCol, wRow);
  } else w = Math.min(W, H * a);
  for (const n of nodes) { n.style.width = Math.floor(w) + 'px'; n.style.height = Math.floor(w / a) + 'px'; }
  if (run.tool) run.tool.relayout();
}
function renderConsole(item) {
  const k = item.kind;
  let side = '', body = '';
  if (k === 'pick' || k === 'multi') {
    body = `<div class="opts" id="opts">` + item.options.map((o, i) => `<button type="button" class="opt" data-key="${o.key}"${k === 'multi' ? ' aria-pressed="false"' : ''}><kbd>${i + 1}</kbd><span><b>${esc(o.name)}</b><i>${esc(o.sub)}</i></span></button>`).join('') + `</div>`;
    if (k === 'multi') side = `<button type="button" class="btn btn-primary" id="btnLock" disabled>Lock <kbd>↵</kbd></button>`;
  } else if (k === 'edge') {
    body = `<div class="dpad" id="opts">` + EDGE_OPTS.map(o => `<button type="button" class="opt" data-key="${o.key}"><kbd>${EDGE_KEYS[o.key]}</kbd><span><b>${o.name}</b></span></button>`).join('') + `</div>`;
  } else if (k === 'ab') {
    body = `<div class="opts two" id="opts"><button type="button" class="opt" data-key="a"><kbd>←</kbd><span><b>Frame A</b></span></button><button type="button" class="opt" data-key="b"><kbd>→</kbd><span><b>Frame B</b></span></button></div>`;
  } else if (k === 'print') {
    side = ratioChip(item.target.ratio, item.target.aspect);
    body = `<div class="opts two" id="opts"><button type="button" class="opt" data-key="fits"><kbd>F</kbd><span><b>Fits</b></span></button><button type="button" class="opt" data-key="cuts"><kbd>C</kbd><span><b>Cuts someone</b></span></button></div>`;
  } else {
    side = ratioChip(item.brief.chip, item.aspect) + `<button type="button" class="btn btn-primary" id="btnLock">Lock crop <kbd>↵</kbd></button>`;
  }
  const prompt = k === 'make' ? `${esc(item.brief.title)}<small>${esc(item.brief.text)}</small>` : esc(item.prompt);
  byId('console').innerHTML = `<div class="ask"><div class="ask-text" id="askText">${prompt}</div><div class="row" id="askSide">${side}</div></div>${body}`;
}
function togglePick(key) {
  const run = App.run;
  if (run.picked.has(key)) run.picked.delete(key); else run.picked.add(key);
  for (const b of $$('#opts .opt')) b.setAttribute('aria-pressed', run.picked.has(b.dataset.key) ? 'true' : 'false');
  const lk = byId('btnLock');
  if (lk) lk.disabled = run.picked.size === 0;
}
function answer(val) {
  const run = App.run;
  if (!run || run.state !== 'asking' || run.leaving) return;
  const item = run.item, ms = performance.now() - run.t0;
  let ok;
  if (item.kind === 'multi') {
    if (!run.picked.size) return;
    val = Array.from(run.picked);
    ok = val.length === item.answer.length && item.answer.every(x => run.picked.has(x));
  } else ok = val === item.answer;
  run.state = 'feedback';
  run.log.push({ item, val, ok, ms, quick: true });
  run.streak = ok ? run.streak + 1 : 0;
  run.best = Math.max(run.best, run.streak);
  recordTag(item.tag, ok);
  if (ok) Sound.shutter(); else Sound.miss();
  showFeedback(item, val, ok);
  renderBar();
  const timed = run.level.mode === 'timed';
  if (ok) run.auto = setTimeout(nextStep, timed ? 420 : 1100);
  else if (timed) run.auto = setTimeout(nextStep, 1600);
}
function nextStep() {
  const run = App.run;
  if (!run || run.state !== 'feedback' || run.leaving) return;
  clearTimeout(run.auto);
  run.i++;
  nextItem();
}
function rightName(item) {
  if (item.kind === 'multi') return item.answer.map(deviceName).join(' + ');
  if (item.kind === 'ab') return 'Frame ' + item.answer.toUpperCase();
  const o = (item.options || []).find(x => x.key === item.answer);
  return o ? o.name : '';
}
function revealContext(item, fr) {
  const view = contextFor(item), px = fr.clientHeight;
  const overlay = item.kind === 'edge' ? ovEdgeReveal(item, view, px) : ovCropReveal(item, view, px);
  for (const z of $$('.edge-zone', fr)) z.remove();
  const tmp = document.createElement('div');
  tmp.innerHTML = frameSVG(item.scene, item.crop, { dof: false, overlay, region: view });
  const svg = tmp.firstChild;
  fr.querySelector('svg').replaceWith(svg);
  zoomView(svg, item.crop, view, 480);
}
function showFeedback(item, val, ok) {
  const k = item.kind, timed = App.run.level.mode === 'timed';
  for (const b of $$('#opts .opt')) {
    const key = b.dataset.key;
    b.disabled = true;
    if (k === 'multi') {
      const want = item.answer.includes(key), had = val.includes(key);
      if (want && had) b.classList.add('is-right'); else if (had) b.classList.add('is-wrong'); else if (want) b.classList.add('is-missed');
    } else if (key === item.answer) b.classList.add('is-right');
    else if (key === val) b.classList.add('is-wrong');
  }
  const lk = byId('btnLock');
  if (lk) lk.remove();
  for (const z of $$('.edge-zone')) z.disabled = true;
  if (k === 'ab') {
    for (const b of $$('#frames .frame')) {
      const w = b.dataset.pick;
      b.classList.add(w === item.answer ? 'is-good' : 'is-bad');
      b.disabled = true;
      if (w !== item.answer) b.querySelector('.ov').innerHTML = ovABBad(item, w, b.clientHeight);
    }
  } else {
    const fr = byId('theFrame');
    if (fr) {
      fr.classList.add(ok ? 'flash-k' : 'flash-m');
      const ov = fr.querySelector('.ov'), px = fr.clientHeight;
      if (item.set === 'device') ov.innerHTML = ovDevice(item, px);
      else if (k === 'print') ov.innerHTML = ovPrint(item, px);
      else if (!ok && !timed) revealContext(item, fr);
      else if (k === 'edge' && item.answer !== 'clean') ov.innerHTML = edgeLine(rInset(item.crop, item.crop.h * 0.012), item.answer, 'ov-bad');
    }
  }
  const name = rightName(item);
  byId('askText').innerHTML = `<span class="verdict ${ok ? 'k' : 'm'}">${ok ? 'Keeper' : 'Missed'}</span>${!ok && name ? `<b>${esc(name)}.</b> ` : ''}${esc(item.why)}`;
  byId('askSide').innerHTML = '';
  if (!ok && !timed) { const nb = byId('btnNext'); nb.hidden = false; nb.focus({ preventScroll: true }); }
  byId('live').textContent = (ok ? 'Keeper. ' : 'Missed. ' + name + '. ') + item.why;
}
const notesHTML = notes => `<ul class="notes">` + notes.map(n => `<li><span class="mk ${n.ok === true ? 'y' : n.ok === 'part' ? 'p' : 'n'}">${n.ok === true ? '✓' : n.ok === 'part' ? '~' : '✕'}</span><span>${esc(n.text)}</span><span class="data">${n.pts}/${n.max}</span></li>`).join('') + `</ul>`;
function lockCrop() {
  const run = App.run;
  if (!run || run.state !== 'asking' || !run.tool || run.leaving) return;
  const item = run.item, crop = run.tool.value(), res = item.score(crop), ok = res.score >= PASS_MARK;
  run.state = 'feedback';
  run.tool.lock();
  run.log.push({ item, val: crop, ok, ms: performance.now() - run.t0, score: res.score, notes: res.notes, quick: false });
  run.streak = ok ? run.streak + 1 : 0;
  run.best = Math.max(run.best, run.streak);
  recordTag(item.tag, ok);
  if (ok) Sound.shutter(); else Sound.miss();
  byId('console').innerHTML =
    `<div class="ask"><div class="ask-text"><div class="scoreline"><span class="verdict ${ok ? 'k' : 'm'}">${ok ? 'Keeper' : 'Reshoot'}</span><b>${res.score}</b><span class="muted">of 100 · ${esc(item.brief.title)}, ${esc(item.brief.chip)}</span></div></div></div>` +
    notesHTML(res.notes) +
    `<div class="row end"><button type="button" class="btn" id="btnRef">Show a strong answer</button><button type="button" class="btn btn-primary" id="btnNextMake">Next <kbd>↵</kbd></button></div>`;
  renderBar();
  layoutFrames();
  byId('btnNextMake').focus({ preventScroll: true });
  byId('live').textContent = (ok ? 'Keeper. ' : 'Reshoot. ') + res.score + ' of 100. ' + res.notes.map(n => n.text).join(' ');
}
function askLeave() {
  const run = App.run;
  if (!run) { show('home'); return; }
  if (!run.log.length) { leaveRun(); return; }
  run.leaving = true;
  clearTimeout(run.auto);
  byId('leave').hidden = false;
  byId('btnStay').focus();
}
function stayInRun() {
  const run = App.run;
  if (!run) return;
  run.leaving = false;
  run.lastTick = performance.now();
  byId('leave').hidden = true;
  if (run.state === 'feedback' && run.level.mode === 'timed') run.auto = setTimeout(nextStep, 500);
}
function leaveRun() {
  const run = App.run;
  if (run) {
    clearInterval(run.timer); clearTimeout(run.auto);
    if (run.tool) run.tool.destroy();
    saveProgress();
  }
  const lvl = run && run.level;
  App.run = null;
  byId('frames').innerHTML = '';
  if (lvl && !lvl.practice) openLevel(lvl.id); else goHome();
}
function finishRun() {
  const run = App.run;
  if (!run) return;
  clearInterval(run.timer); clearTimeout(run.auto);
  if (run.tool) { run.tool.destroy(); run.tool = null; }
  const log = run.log, level = run.level;
  const quick = log.filter(e => e.quick), made = log.filter(e => !e.quick), keepers = log.filter(e => e.ok).length;
  const res = {
    total: log.length, keepers, acc: log.length ? keepers / log.length : 0, quick: quick.length, streak: run.best,
    pace: quick.length ? quick.reduce((a, e) => a + e.ms, 0) / quick.length / 1000 : null,
    avg: made.length ? Math.round(made.reduce((a, e) => a + e.score, 0) / made.length) : null,
  };
  const stars = level.practice ? 0 : starsFor(level, res);
  if (level.practice) { P.totals.frames += res.total; P.totals.keepers += res.keepers; P.totals.streak = Math.max(P.totals.streak || 0, res.streak); saveProgress(); }
  else recordRun(level, res, stars);
  if (stars || level.practice) Sound.pass(); else Sound.fail();
  App.run = null;
  byId('frames').innerHTML = '';
  byId('btnNext').hidden = true;
  renderResult(level, res, stars, log);
  show('result');
  const pb = $('#resultBody .btn-primary');
  if (pb) pb.focus({ preventScroll: true });
}

/* ---------------- results ---------------- */
function resultWords(level, res, stars) {
  const k = `${res.keepers} of ${res.total} keepers`;
  if (level.practice) return ['Practice done.', `${k}${res.pace != null ? ' at ' + secs(res.pace) + ' a frame' : ''}.`];
  if (level.mode === 'make') {
    if (!stars) return ['Not yet.', `Your crops averaged ${res.avg} of 100. The pass mark is ${level.pass}.`];
    return [stars === 3 ? 'Three stars.' : 'Passed.', `Your crops averaged ${res.avg} of 100.${stars === 1 ? ' 85 earns the second star.' : stars === 2 ? ' 93 earns the third.' : ''}`];
  }
  if (level.mode === 'timed') {
    if (!stars) return ['Not yet.', `${res.keepers} keepers at ${pct(res.acc)}. You need ${level.need} at ${pct(level.pass)}.`];
    return [stars === 3 ? 'Three stars.' : 'Passed.', `${res.keepers} keepers in ${level.seconds} seconds at ${pct(res.acc)}.${stars === 1 ? ` ${level.need + 4} earns the second star.` : stars === 2 ? ` ${level.need + 8} at 90% earns the third.` : ''}`];
  }
  if (level.mode === 'exam') {
    if (!stars) return ['Not yet.', `${k} (${pct(res.acc)}). The pass mark is ${pct(level.pass)}.`];
    return [stars === 3 ? 'Three stars.' : 'Passed.', `${k} (${pct(res.acc)}).${stars === 1 ? ' 90% earns the second star.' : stars === 2 ? ' 95% earns the third.' : ''}`];
  }
  if (!stars) return ['Not yet.', `${k} (${pct(res.acc)}). The pass mark is ${pct(level.pass)}.`];
  if (stars === 1) return ['Passed.', `${k} at ${secs(res.pace)} a frame. Get under ${secs(level.pace)} for the second star.`];
  if (stars === 2) return ['Passed, on pace.', `${k} at ${secs(res.pace)} a frame. 95% at this pace earns the third star.`];
  return ['Three stars.', `${k} at ${secs(res.pace)} a frame.`];
}
function renderResult(level, res, stars, log) {
  const words = resultWords(level, res, stars), passed = stars > 0;
  const nxt = !level.practice && passed ? LEVELS[level.n] : null;
  let h = `<header class="result-head"><div class="num data">${level.practice ? 'PRACTICE' : 'FRAME ' + pad2(level.n)} · ${esc(level.name).toUpperCase()}</div><h1 class="h-display">${words[0]}</h1>` +
    (level.practice ? '' : `<div class="bigstars" role="img" aria-label="${stars} of 3 stars">${'★'.repeat(stars)}<span class="off">${'★'.repeat(3 - stars)}</span></div>`) +
    `<p class="lede">${esc(words[1])}</p><div class="row">` +
    (nxt ? `<button type="button" class="btn btn-primary" data-level="${nxt.id}">Next: ${esc(nxt.name)}</button><button type="button" class="btn" data-again="1">Run it again</button>` : `<button type="button" class="btn btn-primary" data-again="1">Run it again</button>`) +
    `<button type="button" class="btn btn-quiet" data-nav="home">The roll</button></div></header>`;
  /* breakdown by kind of frame */
  const groups = {};
  for (const e of log) { const g = groups[e.item.tag] || (groups[e.item.tag] = { n: 0, ok: 0 }); g.n++; if (e.ok) g.ok++; }
  const rows = Object.keys(groups).sort((a, b) => groups[a].ok / groups[a].n - groups[b].ok / groups[b].n);
  h += `<div class="result-grid"><section class="card"><span class="label">By kind of frame</span><ul class="breakdown">` +
    rows.map(t => `<li><span>${esc(tagName(t))}</span><span class="data">${groups[t].ok}/${groups[t].n}</span></li>`).join('') +
    `</ul><div class="targets" style="margin-bottom:0">` +
    `<div><b>${pct(res.acc)}</b><span>keepers</span></div><div><b>${res.avg != null && level.mode === 'make' ? res.avg : secs(res.pace)}</b><span>${res.avg != null && level.mode === 'make' ? 'average score' : 'a frame'}</span></div><div><b>${res.streak}</b><span>best streak</span></div></div></section>`;
  const misses = log.filter(e => !e.ok).slice(0, 6), made = log.filter(e => !e.quick);
  const list = level.mode === 'make' ? made : misses;
  h += `<section class="card"><span class="label">${level.mode === 'make' ? 'Your crops' : 'Frames you missed'}</span>`;
  if (!list.length) h += `<p class="muted">None. Every frame was a keeper.</p>`;
  else {
    h += `<ul class="review">` + list.map(e => {
      const it = e.item;
      const c = it.kind === 'make' ? e.val : it.kind === 'ab' ? it[it.answer === 'a' ? 'b' : 'a'].crop : it.crop;
      const tilt = it.kind === 'ab' ? it[it.answer === 'a' ? 'b' : 'a'].tilt : 0;
      const head = it.kind === 'make' ? `${esc(it.brief.title)}, ${esc(it.brief.chip)}: ${e.score}` : esc(rightName(it));
      const text = it.kind === 'make' ? (e.notes.find(n => n.ok !== true) || e.notes[0]).text : it.why;
      return `<li><div class="thumb" style="aspect-ratio:${r1(c.w / c.h * 100) / 100}">${frameSVG(it.scene, c, { tilt, dof: it.kind !== 'make' })}</div><p><b>${head}</b>${esc(text)}</p></li>`;
    }).join('') + `</ul>`;
  }
  h += `</section></div>`;
  byId('resultBody').innerHTML = h;
}

/* ---------------- weak spots ---------------- */
function startWeak() {
  const specs = weakSpots(4).map(w => tagSpec(w.tag)).filter(Boolean);
  if (!specs.length) return;
  startRun({ id: 'weak', name: 'Weak Spots', mode: 'drill', practice: true, count: 12, pass: 0, pace: 0,
    deck: R => R.shuffle(Array.from({ length: 12 }, (_, i) => specs[i % specs.length])) });
}
function goHome() { renderHome(); show('home'); }
