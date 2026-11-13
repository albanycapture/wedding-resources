/* ============================================================
   JUDGING — what each edge of a crop does to the people in it.
   Used three ways: to build frames with exactly one fault, to
   prove a "clean" frame really is clean, and to score the
   player's own crops.
   ============================================================ */
const CROPS = [
  { key: 'wide', name: 'Wide', sub: 'the place is the subject' },
  { key: 'full', name: 'Full-length', sub: 'head to toe' },
  { key: 'threeq', name: 'Three-quarter', sub: 'ends mid-thigh' },
  { key: 'waist', name: 'Waist-up', sub: 'ends below the waist' },
  { key: 'tight', name: 'Tight', sub: 'head and shoulders' },
  { key: 'detail', name: 'Detail', sub: 'no faces, just the thing' },
];
const DEVICES = [
  { key: 'thirds', name: 'Rule of thirds', sub: 'subject on a third line' },
  { key: 'symmetry', name: 'Symmetry', sub: 'mirrored around the centre' },
  { key: 'lines', name: 'Leading lines', sub: 'lines run to the subject' },
  { key: 'frame', name: 'Frame in frame', sub: 'an opening around them' },
  { key: 'space', name: 'Negative space', sub: 'small subject, big empty' },
  { key: 'layers', name: 'Layering', sub: 'soft foreground in front' },
];
const cropName = k => (CROPS.find(c => c.key === k) || {}).name || k;
const deviceName = k => (DEVICES.find(c => c.key === k) || {}).name || k;
const BAND_PRI = { face: 4, joint: 3, clip: 2, tangent: 1 };
/* Bottom-edge ranges (fraction of body height) that read as each crop. */
const CROP_RANGE = { tight: [0.2, 0.335], waist: [0.385, 0.478], threeq: [0.565, 0.69] };

function zoneName(p, y) {
  const u = (y - p.ty) / p.h;
  if (u < 0.2) return 'the shoulders';
  if (u < 0.345) return 'mid-chest';
  if (u < 0.485) return 'just below the waist';
  if (u < 0.69) return 'mid-thigh';
  if (u < 0.92) return 'mid-shin';
  return 'below the feet';
}

function inspectCrop(scene, crop) {
  const yt = crop.y, yb = crop.y + crop.h, xl = crop.x, xr = crop.x + crop.w;
  const out = { top: [], bottom: [], left: [], right: [], inside: [], outside: [] };
  for (const p of scene.people) {
    const b = p.box;
    if (b.x + b.w <= xl + 1 || b.x >= xr - 1 || p.top >= yb - 1 || p.footY <= yt + 1) { out.outside.push(p); continue; }
    out.inside.push(p);
    const vy0 = Math.max(yt, p.top), vy1 = Math.min(yb, p.footY);
    const tol = 0.006 * p.h;
    const headIn = p.head.x >= xl + 0.01 * p.h && p.head.x + p.head.w <= xr - 0.01 * p.h;
    const tightish = yb < p.y(0.34);
    for (const sd of ['left', 'right']) {
      const x = sd === 'left' ? xl : xr;
      const hit = {};
      let any = false;
      for (const part of p.parts) {
        if (part.y1 <= vy0 || part.y0 >= vy1) continue;
        if (x > part.x0 + tol && x < part.x1 - tol) { hit[part.k] = true; any = true; }
      }
      if (!any) continue;
      let f;
      if (hit.head) f = { kind: 'slice', label: 'a head', bad: true };
      else if (hit.bouquet) f = { kind: 'clip', label: 'the bouquet', bad: true };
      else if (hit.hand) f = { kind: 'clip', label: 'a hand', bad: true };
      else if (hit.elbow) f = { kind: 'joint', label: 'an elbow', bad: true };
      else if (hit.wrist) f = { kind: 'joint', label: 'a wrist', bad: true };
      else if (hit.torso || hit.skirt || hit.legs || hit.neck || hit.feet) f = { kind: 'slice', label: headIn ? 'a shoulder' : 'a person', bad: !(tightish && headIn) };
      else f = { kind: 'slice', label: 'an arm', bad: !(tightish && headIn) };
      f.p = p; f.x = x;
      out[sd].push(f);
    }
    if (yb < p.footY + 0.016 * p.h) {
      let best = null;
      for (const bd of p.bands) {
        if (yb >= bd.y0 && yb <= bd.y1 && (!best || BAND_PRI[bd.kind] > BAND_PRI[best.kind])) best = bd;
      }
      out.bottom.push(best ? { p, kind: best.kind, label: best.label, y: yb } : { p, kind: 'ok', label: zoneName(p, yb), y: yb });
    }
    if (yt > p.top - 0.012 * p.h) {
      let f;
      if (yt < p.top + 0.004 * p.h) f = { kind: 'tangent', label: 'the head, which touches the edge' };
      else if (yt < p.y(0.046)) f = { kind: 'crown', label: 'the top of the head' };
      else if (yt < p.y(0.128)) f = { kind: 'face', label: 'the face' };
      else f = { kind: 'headless', label: 'the head' };
      f.p = p; f.y = yt;
      out.top.push(f);
    }
  }
  return out;
}

/* Everything wrong with a crop. allowCrown: a tight portrait may crop into the hair on purpose. */
function faultsOf(ins, opts) {
  const o = opts || {}, f = [];
  for (const b of ins.bottom) if (b.kind !== 'ok') f.push(Object.assign({ edge: 'bottom' }, b));
  for (const t of ins.top) {
    if (t.kind === 'crown' && o.allowCrown) continue;
    f.push(Object.assign({ edge: 'top' }, t));
  }
  for (const sd of ['left', 'right']) for (const s of ins[sd]) if (s.bad) f.push(Object.assign({ edge: sd }, s));
  return f;
}

/* Nearest y to `ideal` that clears every joint, hand and hem by `need`. */
function safeCut(people, ideal, span, need) {
  for (let d = 0; d <= span; d += 2) {
    for (const sg of d === 0 ? [1] : [1, -1]) {
      const y = ideal + sg * d;
      let clear = Infinity;
      for (const p of people) {
        if (y > p.footY + 0.016 * p.h || y < p.top) continue;
        for (const b of p.bands) {
          const dist = y < b.y0 ? b.y0 - y : y > b.y1 ? y - b.y1 : -1;
          if (dist < clear) clear = dist;
        }
      }
      if (clear >= need) return y;
    }
  }
  return null;
}

const headsCx = scene => {
  let a = Infinity, b = -Infinity;
  for (const p of scene.people) { a = Math.min(a, p.head.x); b = Math.max(b, p.head.x + p.head.w); }
  return (a + b) / 2;
};

/* Build a crop of a named type. o: { cutY, hr (headroom fraction), foot, cx, jitter } */
function makeCrop(scene, type, aspect, R, o) {
  o = o || {};
  const g = scene.group, P = g.tall, head = g.top;
  let top, ch;
  if (type === 'full') {
    const foot = o.foot != null ? o.foot : R.range(0.05, 0.085), hr = o.hr != null ? o.hr : R.range(0.065, 0.1);
    ch = (g.feet - head) / (1 - foot - hr); top = head - hr * ch;
  } else {
    const cut = o.cutY != null ? o.cutY : safeCut(scene.people, P.y(CUT[type]), 0.032 * P.h, 0.012 * P.h);
    if (cut == null) return null;
    const hr = o.hr != null ? o.hr : R.range(0.07, 0.11);
    ch = (cut - head) / (1 - hr); top = head - hr * ch;
  }
  const cw = ch * aspect;
  const cx = (o.cx != null ? o.cx : (type === 'tight' ? headsCx(scene) : g.cx)) + (o.jitter ? R.range(-o.jitter, o.jitter) * cw : 0);
  return rect(cx - cw / 2, top, cw, ch);
}

const inBounds = (crop, pad) => {
  const d = pad == null ? 360 : pad;
  return crop.x >= -d && crop.y >= -d && rRight(crop) <= WORLD.W + d && rBottom(crop) <= WORLD.H + d;
};
/* Side-to-side fit: tight frames only need the heads, looser ones need everybody. */
function lateralOK(scene, crop, type) {
  const g = scene.group;
  if (type === 'tight') {
    let a = Infinity, b = -Infinity;
    for (const p of scene.people) { a = Math.min(a, p.head.x); b = Math.max(b, p.head.x + p.head.w); }
    const m = 0.04 * g.h;
    return a >= crop.x + m && b <= rRight(crop) - m;
  }
  const m = 0.032 * g.h;
  return g.box.x >= crop.x + m && rRight(g.box) <= rRight(crop) - m;
}
function classifyCrop(scene, crop) {
  const g = scene.group, P = g.tall, yb = rBottom(crop);
  if (yb >= g.feet + 0.012 * P.h) return g.h / crop.h <= 0.42 ? 'wide' : 'full';
  const u = (yb - P.ty) / P.h;
  if (u < 0.36) return 'tight';
  if (u < 0.52) return 'waist';
  if (u < 0.705) return 'threeq';
  return 'low';
}
const tryMany = (n, fn) => { for (let i = 0; i < n; i++) { const r = fn(i); if (r) return r; } return null; };
const nounOf = scene => (scene.people.length > 2 ? 'group' : scene.people.length === 2 ? 'couple' : 'subject');
