/* ============================================================
   OVERLAYS — the marks drawn on a frame after the player answers,
   and the diagrams used in the level briefs.
   Sizes are worked out from the frame's on-screen height so that
   labels read at about 11px whatever the zoom.
   ============================================================ */
const fsFor = (view, px) => view.h * clamp(11.5 / Math.max(120, px), 0.016, 0.075);

function chip(x, y, text, fs, cls, anchor) {
  const w = text.length * fs * 0.62 + fs * 0.95, h = fs * 1.6;
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  const dark = cls === 'acc' || cls === 'good' || cls === 'bad';
  return `<rect class="ov-chip ${cls || ''}" x="${r1(x0)}" y="${r1(y - h / 2)}" width="${r1(w)}" height="${r1(h)}" rx="${r1(fs * 0.28)}"/>` +
    `<text class="ov-text${dark ? ' dark' : ''}" x="${r1(x0 + w / 2)}" y="${r1(y + fs * 0.36)}" font-size="${r1(fs)}" text-anchor="middle">${esc(text)}</text>`;
}
/* keep a chip inside the view */
function chipIn(view, x, y, text, fs, cls, anchor) {
  const w = text.length * fs * 0.62 + fs * 0.95, h = fs * 1.6, pad = fs * 0.5;
  let x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  x0 = clamp(x0, view.x + pad, rRight(view) - w - pad);
  const yy = clamp(y, view.y + h / 2 + pad, rBottom(view) - h / 2 - pad);
  return chip(x0, yy, text, fs, cls);
}
function arrow(x1, y1, x2, y2, hs) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (ang) => `${r1(x2 - Math.cos(a + ang) * hs)} ${r1(y2 - Math.sin(a + ang) * hs)}`;
  return `<path class="ov-acc" d="M${r1(x1)} ${r1(y1)} L${r1(x2)} ${r1(y2)} M${p(0.5)} L${r1(x2)} ${r1(y2)} L${p(-0.5)}"/>`;
}
/* Liang–Barsky: the part of a segment inside a rectangle, or null. */
function clipSeg(x1, y1, x2, y2, r) {
  let t0 = 0, t1 = 1;
  const dx = x2 - x1, dy = y2 - y1;
  const tests = [[-dx, x1 - r.x], [dx, rRight(r) - x1], [-dy, y1 - r.y], [dy, rBottom(r) - y1]];
  for (const [p, q] of tests) {
    if (p === 0) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; }
  }
  return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
}
const dimOutside = (view, crop) => {
  const m = Math.max(view.w, view.h);
  return `<path class="ov-dim" fill-rule="evenodd" d="M${r1(view.x - m)} ${r1(view.y - m)} H${r1(rRight(view) + m)} V${r1(rBottom(view) + m)} H${r1(view.x - m)} Z M${r1(crop.x)} ${r1(crop.y)} H${r1(rRight(crop))} V${r1(rBottom(crop))} H${r1(crop.x)} Z"/>`;
};
const boxPath = (r, cls) => `<rect class="${cls}" x="${r1(r.x)}" y="${r1(r.y)}" width="${r1(r.w)}" height="${r1(r.h)}"/>`;
const edgeLine = (c, edge, cls) => {
  const p = edge === 'top' ? [c.x, c.y, rRight(c), c.y] : edge === 'bottom' ? [c.x, rBottom(c), rRight(c), rBottom(c)] : edge === 'left' ? [c.x, c.y, c.x, rBottom(c)] : [rRight(c), c.y, rRight(c), rBottom(c)];
  return `<path class="${cls}" d="M${r1(p[0])} ${r1(p[1])} L${r1(p[2])} ${r1(p[3])}"/>`;
};

/* The wider view a frame zooms out to, at the frame's own aspect ratio. */
function contextFor(item) {
  const c = item.crop, sc = item.scene;
  if (!sc.group) return c;
  const g = sc.group, pad = 0.1 * g.h;
  const u = rUnion(c, rect(g.box.x - pad, g.top - pad, g.box.w + 2 * pad, g.feet - g.top + 2.2 * pad));
  if (u.w <= c.w * 1.04 && u.h <= c.h * 1.04) return c;
  const a = c.w / c.h;
  let w = Math.max(u.w, u.h * a) * 1.06, h = w / a;
  if (h < u.h * 1.06) { h = u.h * 1.06; w = h * a; }
  return rect(u.x + u.w / 2 - w / 2, u.y + u.h / 2 - h / 2, w, h);
}

function ovThirds(c) {
  let s = '';
  for (const t of [1 / 3, 2 / 3]) {
    s += `<path class="ov-thin" d="M${r1(c.x + c.w * t)} ${r1(c.y)} V${r1(rBottom(c))} M${r1(c.x)} ${r1(c.y + c.h * t)} H${r1(rRight(c))}"/>`;
  }
  return s;
}

function ovDevice(item, px) {
  const c = item.crop, sc = item.scene, f = sc.feats, g = sc.group, fs = fsFor(c, px), flags = item.flags;
  let s = '';
  if (flags.includes('thirds')) {
    s += ovThirds(c);
    const tx = (g.cx - c.x) / c.w < 0.5 ? c.x + c.w / 3 : c.x + c.w * 2 / 3;
    s += `<path class="ov-acc" d="M${r1(tx)} ${r1(c.y)} V${r1(rBottom(c))}"/>`;
    s += chipIn(c, tx, c.y + fs * 1.6, 'third', fs, 'acc', 'middle');
  }
  if (flags.includes('symmetry')) {
    s += `<path class="ov-dash" d="M${r1(f.axisX)} ${r1(c.y)} V${r1(rBottom(c))}"/>`;
    const y = c.y + c.h * 0.16, d = c.w * 0.1, hs = c.h * 0.022;
    s += arrow(f.axisX - d * 0.25, y, f.axisX - d, y, hs) + arrow(f.axisX + d * 0.25, y, f.axisX + d, y, hs);
    s += chipIn(c, f.axisX, c.y + fs * (flags.includes('thirds') ? 3.6 : 1.6), 'mirror', fs, 'acc', 'middle');
  }
  if (flags.includes('lines')) {
    const inner = rInset(c, c.h * 0.03);
    let first = null;
    for (const ln of f.lines) {
      const k = clipSeg(ln[0], ln[1], ln[2], ln[3], inner);
      if (!k) continue;
      s += arrow(k[0], k[1], k[2], k[3], c.h * 0.03);
      if (!first) first = k;
    }
    if (first) s += chipIn(c, first[0], first[1] - fs * 1.8, 'lines', fs, 'acc', 'middle');
  }
  if (flags.includes('frame') && f.frame) {
    const fr = f.frame;
    s += `<rect class="ov-acc-dash" x="${r1(fr.x)}" y="${r1(fr.y)}" width="${r1(fr.w)}" height="${r1(fr.h)}" rx="${r1(fr.w * 0.06)}"/>`;
    s += chipIn(c, fr.x + fr.w / 2, fr.y - fs * 1.1, 'frame', fs, 'acc', 'middle');
  }
  if (flags.includes('space')) {
    const left = (g.cx - c.x) / c.w < 0.5;
    const x0 = left ? rRight(g.box) + c.w * 0.05 : c.x + c.w * 0.04;
    const x1 = left ? rRight(c) - c.w * 0.04 : g.box.x - c.w * 0.05;
    const y0 = c.y + c.h * 0.06, y1 = Math.min(rBottom(c) - c.h * 0.06, g.top + g.h * 0.2);
    if (x1 > x0 && y1 > y0) {
      s += `<rect class="ov-hatch" x="${r1(x0)}" y="${r1(y0)}" width="${r1(x1 - x0)}" height="${r1(y1 - y0)}"/>`;
      s += chipIn(c, (x0 + x1) / 2, (y0 + y1) / 2, 'empty', fs, 'acc', 'middle');
    }
  }
  if (flags.includes('layers')) {
    for (const b of f.fg || []) s += chipIn(c, b.x + b.w / 2, b.y + b.h * 0.45, '1 front', fs, 'acc', 'middle');
    s += chipIn(c, g.cx, g.top - fs * 1.3, '2 subject', fs, '', 'middle');
    const bx = (f.fg && f.fg[0] && f.fg[0].x + f.fg[0].w / 2 < c.x + c.w / 2) ? c.x + c.w * 0.82 : c.x + c.w * 0.18;
    s += chipIn(c, bx, sc.hy - fs * 2.2, '3 back', fs, '', 'middle');
  }
  return s;
}

/* The crop ladder, pinned to one side of the view so its labels never clip. */
function ladderMarks(P, view, fs, active, side) {
  const rows = [['tight', CUT.tight, 'tight'], ['waist', CUT.waist, 'waist-up'], ['threeq', CUT.threeq, '3/4'], ['full', 1.03, 'full']];
  const len = fs * 1.3, wide = 8 * fs * 0.62 + fs * 0.95, pad = fs * 0.5;
  let s = '';
  for (const r of rows) {
    const y = clamp(P.y(r[1]), view.y + fs * 1.2, rBottom(view) - fs * 1.2), on = r[0] === active;
    const w = r[2].length * fs * 0.62 + fs * 0.95;
    const cx = side < 0 ? view.x + pad + wide - w : rRight(view) - pad - wide;
    s += chip(cx, y, r[2], fs, on ? 'acc' : '');
    const lx = side < 0 ? view.x + pad + wide : rRight(view) - pad - wide;
    s += `<path class="${on ? 'ov-acc' : 'ov-thin'}" d="M${r1(lx)} ${r1(y)} h${r1(side < 0 ? len : -len)}"/>`;
  }
  return s;
}
function ovCropReveal(item, view, px) {
  const c = item.crop, sc = item.scene, fs = fsFor(view, px);
  if (!sc.group) return '';
  const g = sc.group, P = g.tall;
  let s = '';
  if (item.answer === 'wide') {
    const x = rRight(g.box) + c.w * 0.025;
    s += `<path class="ov-acc" d="M${r1(x)} ${r1(g.top)} h${r1(fs * 0.7)} V${r1(g.feet)} h${r1(-fs * 0.7)}"/>`;
    s += chipIn(view, x + fs * 1.2, (g.top + g.feet) / 2, Math.round(g.h / c.h * 100) + '% of frame', fs, 'acc');
    return s;
  }
  s += dimOutside(view, c) + boxPath(c, 'ov-acc');
  const roomLeft = g.box.x - view.x, roomRight = rRight(view) - rRight(g.box);
  s += ladderMarks(P, view, fs, item.answer, roomLeft >= roomRight ? -1 : 1);
  return s;
}

function faultPoint(f, crop) {
  const p = f.p;
  if (f.edge === 'bottom' || f.edge === 'top') return [clamp(p.cx, crop.x, rRight(crop)), f.y];
  const parts = p.parts.filter(q => q.x0 < f.x && q.x1 > f.x && q.y1 > crop.y && q.y0 < rBottom(crop));
  const pick = parts.find(q => q.k === 'elbow') || parts.find(q => q.k === 'hand') || parts.find(q => q.k === 'head') || parts.find(q => q.k === 'torso') || parts[0];
  const y = pick ? clamp((pick.y0 + pick.y1) / 2, crop.y + crop.h * 0.08, rBottom(crop) - crop.h * 0.08) : crop.y + crop.h / 2;
  return [f.x, y];
}
const shortLabel = l => l.replace(/^the /, '').replace(/^an? /, '').replace(', which touches the edge', ' on the edge').replace(' on the frame edge', ' on the edge');
function ovEdgeReveal(item, view, px) {
  const c = item.crop, fs = fsFor(view, px);
  let s = dimOutside(view, c);
  for (const e of ['top', 'right', 'bottom', 'left']) s += edgeLine(c, e, e === item.answer ? 'ov-bad' : 'ov-good');
  const seen = {};
  for (const f of item.faults || []) {
    const key = f.edge + f.label;
    if (seen[key]) continue;
    seen[key] = 1;
    const pt = faultPoint(f, c), r = fs * 1.5;
    s += `<circle class="ov-bad" cx="${r1(pt[0])}" cy="${r1(pt[1])}" r="${r1(r)}"/>`;
    s += chipIn(view, pt[0] + r * 1.3, pt[1] + (f.edge === 'top' ? fs * 1.9 : -fs * 1.9), shortLabel(f.label), fs, 'bad');
  }
  if (item.answer === 'clean') s += chipIn(view, c.x + c.w / 2, rBottom(c) + fs * 1.4, 'clean', fs, 'good', 'middle');
  return s;
}

const AB_WORD = { knees: 'knees', ankles: 'ankles', hands: 'hands', feet: 'feet', elbows: 'elbows', crown: 'top of head', tilt: 'tilted', partner: 'half a person', elbow: 'elbow' };
function ovABBad(item, which, px) {
  const side = item[which], c = side.crop, fs = fsFor(c, px), flaw = item.tag.split(':')[1];
  let s = '';
  if (item.flawEdge === 'tilt') {
    const y = clamp(item.scene.hy, c.y + c.h * 0.1, rBottom(c) - c.h * 0.1);
    s += `<path class="ov-dash" d="M${r1(c.x)} ${r1(y)} H${r1(rRight(c))}"/>`;
    s += chipIn(c, c.x + c.w / 2, y - fs * 1.4, 'level', fs, '', 'middle');
  } else {
    const inner = rInset(c, c.h * 0.012);
    s += edgeLine(inner, item.flawEdge, 'ov-bad');
  }
  const pos = item.flawEdge === 'top' ? [c.x + c.w / 2, c.y + fs * 2] : item.flawEdge === 'left' ? [c.x + fs, c.y + c.h * 0.5] : item.flawEdge === 'right' ? [rRight(c) - fs, c.y + c.h * 0.5] : [c.x + c.w / 2, rBottom(c) - fs * 2];
  s += chipIn(c, pos[0], pos[1], AB_WORD[flaw] || flaw, fs, 'bad', item.flawEdge === 'left' ? 'start' : item.flawEdge === 'right' ? 'end' : 'middle');
  return s;
}

function ovPrint(item, px) {
  const c = item.crop, w = item.win, fs = fsFor(c, px), ok = item.answer === 'fits';
  let s = dimOutside(c, w) + boxPath(w, ok ? 'ov-good' : 'ov-bad');
  s += boxPath(item.need, 'ov-dash');
  s += chipIn(c, w.x + w.w / 2, w.y + fs * 1.5, item.target.ratio + (ok ? ' fits' : ' cuts'), fs, ok ? 'good' : 'bad', 'middle');
  return s;
}

/* Animate a frame's viewBox from one rectangle to another. */
function zoomView(svg, from, to, ms) {
  const set = v => svg.setAttribute('viewBox', `${r1(v.x)} ${r1(v.y)} ${r1(v.w)} ${r1(v.h)}`);
  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || !ms) { set(to); return; }
  const t0 = performance.now();
  const step = now => {
    if (!svg.isConnected) return;
    const t = clamp((now - t0) / ms, 0, 1), e = 1 - Math.pow(1 - t, 3);
    set(rect(lerp(from.x, to.x, e), lerp(from.y, to.y, e), lerp(from.w, to.w, e), lerp(from.h, to.h, e)));
    if (t < 1) requestAnimationFrame(step);
  };
  set(from);
  requestAnimationFrame(step);
}

/* ---------------- brief diagrams ---------------- */
/* The classic chart: where a frame can end on a body, and where it can't. */
function ladderDiagram() {
  const R = RNG(4107);
  const p = castPerson(R, 'dress');
  p.color = '#8FA9C4'; p.skin = '#E8B892'; p.hair = '#4B3123'; p.hairStyle = 'bun'; p.shoe = '#2A2A2E';
  const f = figure(Object.assign(p, { cx: 380, footY: 960, h: 880, armL: 'down', armR: 'down' }));
  const safe = [['mid-chest', CUT.tight, 'Tight'], ['below the waist', CUT.waist, 'Waist-up'], ['mid-thigh', CUT.threeq, 'Three-quarter'], ['mid-shin', CUT.shin, ''], ['under the feet', 1.035, 'Full-length']];
  const avoid = [['neck', 0.14], ['elbows', 0.358], ['wrists', 0.495], ['knees', 0.725], ['ankles', 0.945]];
  let s = f.svg;
  const fs = 21;
  for (const a of avoid) {
    const y = f.y(a[1]);
    s += `<path d="M150 ${r1(y)} H520" stroke="var(--miss-hi)" stroke-width="2.5" stroke-dasharray="3 6"/>`;
    s += `<text x="140" y="${r1(y + 7)}" font-size="${fs}" text-anchor="end" class="ov-text" style="fill:var(--miss-hi)">${a[0]}</text>`;
  }
  for (const a of safe) {
    const y = f.y(a[1]);
    s += `<path d="M240 ${r1(y)} H610" stroke="var(--keep-hi)" stroke-width="2.5"/>`;
    s += `<text x="620" y="${r1(y + 7)}" font-size="${fs}" class="ov-text" style="fill:var(--keep-hi)">${a[0]}</text>`;
    if (a[2]) s += `<text x="620" y="${r1(y + 31)}" font-size="${fs - 4}" class="ov-text" style="fill:#fff;opacity:.6;font-weight:400">${a[2]}</text>`;
  }
  s += `<text x="140" y="46" font-size="${fs - 2}" text-anchor="end" class="ov-text" style="fill:var(--miss-hi);letter-spacing:.08em">AVOID</text><text x="620" y="46" font-size="${fs - 2}" class="ov-text" style="fill:var(--keep-hi);letter-spacing:.08em">SAFE</text>`;
  return `<svg viewBox="0 0 860 1040" role="img" aria-label="A standing figure with safe crop lines at mid-chest, below the waist, mid-thigh, mid-shin and under the feet, and lines to avoid at the neck, elbows, wrists, knees and ankles.">${s}</svg>`;
}

/* What each delivery ratio keeps of a 3:2 frame. */
function ratioDiagram() {
  const W = 900, H = 600, ox = 30, oy = 40;
  const rows = [['7:5', 1.4, '5×7'], ['5:4', 1.25, '8×10'], ['1:1', 1, 'square'], ['4:5', 0.8, 'IG portrait'], ['9:16', 9 / 16, 'Reel']];
  let s = `<rect x="${ox}" y="${oy}" width="${W}" height="${H}" fill="#2a2f35"/>`;
  rows.forEach((r, i) => {
    const w = H * r[1], x = ox + (W - w) / 2;
    s += `<rect x="${r1(x)}" y="${oy}" width="${r1(w)}" height="${H}" fill="#fff" fill-opacity="${0.05 + i * 0.012}" stroke="var(--marker)" stroke-width="2"/>`;
    s += `<text x="${r1(x + 8)}" y="${oy + 30 + i * 30}" font-size="19" class="ov-text" style="fill:var(--marker)">${r[0]}</text>`;
  });
  for (const r of [['16:9', 16 / 9], ['2:1', 2]]) {
    const h = W / r[1], y = oy + (H - h) / 2;
    s += `<rect x="${ox}" y="${r1(y)}" width="${W}" height="${r1(h)}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2" stroke-dasharray="8 6"/>`;
    s += `<text x="${ox + W - 8}" y="${r1(y + h - 10)}" font-size="19" text-anchor="end" class="ov-text">${r[0]}</text>`;
  }
  s += `<text x="${ox}" y="${oy - 12}" font-size="19" class="ov-text" style="opacity:.7">3:2 as shot</text>`;
  s += `<text x="${ox}" y="${oy + H + 40}" font-size="19" class="ov-text" style="fill:var(--marker)">solid: trims the width</text><text x="${ox}" y="${oy + H + 72}" font-size="19" class="ov-text">dashed: trims the height</text>`;
  return `<svg viewBox="0 0 ${W + 60} ${H + 150}" role="img" aria-label="A 3 by 2 frame with the area each delivery ratio keeps: 7 by 5, 5 by 4, square, 4 by 5 and 9 by 16 trim the width; 16 by 9 and 2 by 1 trim the height.">${s}</svg>`;
}
const RATIO_TABLE = [
  ['5×7 print', '5:7', '93%', '93%'],
  ['8×10 print', '4:5', '83%', '83%'],
  ['Square', '1:1', '67%', '67%'],
  ['Instagram portrait', '4:5', '53% of the width', '83%'],
  ['Reel or Story', '9:16', '38% of the width', '84% of the width'],
  ['Slideshow frame', '16:9', '84% of the height', '38%'],
  ['Album spread', '2:1', '75% of the height', '33%'],
];

/* A square thumbnail for the contact sheet. */
function squareThumb(scene, crop, overlay) {
  const s = Math.min(crop.w, crop.h);
  let cx = crop.x + crop.w / 2;
  if (scene.group) cx = clamp(scene.group.cx, crop.x + s / 2, rRight(crop) - s / 2);
  else if (scene.focus) cx = clamp(scene.focus.x + scene.focus.w / 2, crop.x + s / 2, rRight(crop) - s / 2);
  const sq = rect(cx - s / 2, crop.y + (crop.h - s) / 2, s, s);
  return frameSVG(scene, sq, { overlay: overlay ? overlay(sq) : '' });
}
