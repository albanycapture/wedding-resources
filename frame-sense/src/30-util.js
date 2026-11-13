/* ============================================================
   UTILITIES
   ============================================================ */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const r1 = v => Math.round(v * 10) / 10;
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* Seeded random source. Every scene is built from one seed so the same
   scene can be drawn twice (side-by-side crops) and replayed in tests. */
function RNG(seed) {
  const f = mulberry32(seed);
  const R = () => f();
  R.range = (a, b) => a + (b - a) * f();
  R.int = (a, b) => Math.floor(a + (b - a + 1) * f());
  R.pick = arr => arr[Math.floor(f() * arr.length)];
  R.chance = p => f() < p;
  R.sign = () => (f() < 0.5 ? -1 : 1);
  R.shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(f() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  R.weighted = pairs => {
    let total = 0;
    for (const p of pairs) total += p[1];
    let t = f() * total;
    for (const p of pairs) { t -= p[1]; if (t <= 0) return p[0]; }
    return pairs[pairs.length - 1][0];
  };
  return R;
}
let SEED_COUNTER = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
const nextSeed = () => (SEED_COUNTER = (SEED_COUNTER + 0x9E3779B9) >>> 0);

/* ---- colour ---- */
function hex2rgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgb2hex(r, g, b) {
  return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}
function mix(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return rgb2hex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}
const shade = (c, t) => (t >= 0 ? mix(c, '#ffffff', t) : mix(c, '#000000', -t));

/* ---- rectangles: {x, y, w, h} ---- */
const rect = (x, y, w, h) => ({ x, y, w, h });
const rRight = r => r.x + r.w;
const rBottom = r => r.y + r.h;
const rInset = (r, d) => rect(r.x + d, r.y + d, r.w - 2 * d, r.h - 2 * d);
function rUnion(a, b) {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return rect(x, y, Math.max(rRight(a), rRight(b)) - x, Math.max(rBottom(a), rBottom(b)) - y);
}
const rContains = (outer, inner, pad = 0) =>
  inner.x >= outer.x + pad && inner.y >= outer.y + pad &&
  rRight(inner) <= rRight(outer) - pad && rBottom(inner) <= rBottom(outer) - pad;
const fmtPct = v => Math.round(v * 100) + '%';
