/* ============================================================
   VENUES — the places the couple stands in.
   The world is a 3000 x 2000 "negative" (3:2). Everything is drawn
   with one consistent perspective: a camera at camH metres looking
   level at the subject, so ground lines really do converge on the
   vanishing point behind the couple.
   ============================================================ */
const WORLD = { W: 3000, H: 2000, B: 520 };

const TIMES = {
  golden: {
    sky: ['#7EA6C4', '#BFD0CB', '#F3D7A6', '#F8BE82'], sun: '#FFF4D2', glow: '#FFD38A', sunR: 62,
    far: ['#C4AE95', '#A99F7C'], tree: ['#5C7345', '#748B4E', '#495E3B'], ground: ['#B3AC62', '#8C9A4C', '#647B3A'],
    path: '#E6D3A8', water: ['#E9C99A', '#8FB1BC', '#5F8FA3'], hedge: ['#4E6A45', '#3C5639'], cloud: '#FFF3DF',
    stone: ['#EBDDC6', '#D6C4A8', '#B9A78B'], gravel: ['#E3D6BD', '#CDBC9E'],
  },
  day: {
    sky: ['#4F92D4', '#86BBE8', '#CFE7F6'], sun: '#FFFDF0', glow: '#FFFFFF', sunR: 54,
    far: ['#93B8AE', '#7CA78F'], tree: ['#3F7D4E', '#5A9A5C', '#2F6843'], ground: ['#93C772', '#6FB05B', '#4E9346'],
    path: '#EBE1C6', water: ['#BFE1F2', '#74B2DB', '#3F86B8'], hedge: ['#3E7A4A', '#2D6240'], cloud: '#FFFFFF',
    stone: ['#F0EBE0', '#DDD5C5', '#BFB7A6'], gravel: ['#E7E1D2', '#D0C9B8'],
  },
  overcast: {
    sky: ['#A7B5C0', '#C6D0D7', '#E5EAEC'], sun: null, glow: '#FFFFFF', sunR: 0,
    far: ['#9BABAA', '#879992'], tree: ['#4E6F59', '#66856A', '#3F5D4A'], ground: ['#8DA982', '#72936C', '#587A56'],
    path: '#DCD8CB', water: ['#D5DEE2', '#A3B6C0', '#7E97A4'], hedge: ['#476A52', '#375743'], cloud: '#F4F6F7',
    stone: ['#E4E2DC', '#CFCDC6', '#B0AEA7'], gravel: ['#DAD8D0', '#C3C1B8'],
  },
  dusk: {
    sky: ['#232C5A', '#51487F', '#B76A8A', '#F3A677'], sun: '#FFDCA6', glow: '#FF9E6B', sunR: 50,
    far: ['#4F4A76', '#3D3F66'], tree: ['#22364B', '#2D4459', '#1A2A3C'], ground: ['#49655A', '#35524B', '#263F3B'],
    path: '#9A8D9A', water: ['#F0A67E', '#77699C', '#3B4576'], hedge: ['#24423F', '#1B3433'], cloud: '#E9A6A0',
    stone: ['#B8A6B0', '#9A8A9C', '#756A82'], gravel: ['#9E90A0', '#83778C'],
  },
  blush: {
    sky: ['#8AA4D2', '#C5BBDC', '#F3C9C6', '#FBE2BC'], sun: '#FFF3E0', glow: '#FFC9B0', sunR: 58,
    far: ['#BAA2B6', '#A195AA'], tree: ['#55705A', '#6E8A6B', '#435C4A'], ground: ['#A3B580', '#839E66', '#65824F'],
    path: '#EBDBCA', water: ['#F6D7C5', '#B3B6D6', '#8291BE'], hedge: ['#4A6B52', '#3A5844'], cloud: '#FFF1EC',
    stone: ['#EFE2DC', '#DCCDC8', '#BDAEAB'], gravel: ['#E6DAD3', '#D0C2BC'],
  },
};
const TIME_KEYS = Object.keys(TIMES);

function makeCtx(spec) {
  const R = RNG(spec.seed);
  const { sx, gy, h, camH } = spec;
  const hy = gy - h * camH / 1.7;
  const k = h / 1.7;
  const c = { R, sx, gy, h, hy, camH, k, T: TIMES[spec.time], time: spec.time };
  c.gY = q => hy + (gy - hy) * q;               /* ground line at depth factor q (1 = subject, >1 = nearer) */
  c.pY = (q, m) => hy + (camH - m) * q * k;     /* a point m metres above the ground */
  c.pX = (q, m) => sx + m * q * k;              /* a point m metres to the side of the subject axis */
  c.qBottom = (WORLD.H + WORLD.B - hy) / (gy - hy);
  return c;
}
const gradV = (id, y0, y1, cols) =>
  `<linearGradient id="§${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${r1(y0)}" x2="0" y2="${r1(y1)}">` +
  cols.map((col, i) => `<stop offset="${Math.round(i / (cols.length - 1) * 1000) / 1000}" stop-color="${col}"/>`).join('') + `</linearGradient>`;
const mirrorX = (svg, ax) => svg + `<g transform="translate(${r1(2 * ax)} 0) scale(-1 1)">${svg}</g>`;
const X0 = -WORLD.B, XW = WORLD.W + 2 * WORLD.B;

function skyLayer(c, o) {
  const { T, R, hy } = c;
  let defs = gradV('sky', -WORLD.B * 0.4, hy, T.sky);
  let svg = `<rect x="${X0}" y="${-WORLD.B}" width="${XW}" height="${r1(hy + WORLD.B + 40)}" fill="url(#§sky)"/>`;
  if (T.sun && !o.noSun) {
    const sunX = o.sunX != null ? o.sunX : c.sx + R.sign() * R.range(700, 1300);
    const sunY = hy - R.range(90, 260);
    defs += `<radialGradient id="§glow"><stop offset="0" stop-color="${T.glow}" stop-opacity=".8"/><stop offset=".45" stop-color="${T.glow}" stop-opacity=".25"/><stop offset="1" stop-color="${T.glow}" stop-opacity="0"/></radialGradient>`;
    svg += `<circle cx="${r1(sunX)}" cy="${r1(sunY)}" r="620" fill="url(#§glow)"/><circle cx="${r1(sunX)}" cy="${r1(sunY)}" r="${T.sunR}" fill="${T.sun}"/>`;
    c.sunX = sunX;
  }
  if (!o.noClouds) {
    const n = R.int(2, 4);
    for (let i = 0; i < n; i++) {
      const x = R.range(-200, 3200), y = R.range(60, Math.max(120, hy - 420)), w = R.range(260, 520);
      const op = R.range(0.35, 0.6);
      svg += `<g fill="${T.cloud}" opacity="${r1(op)}"><ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(w)}" ry="${r1(w * 0.13)}"/><ellipse cx="${r1(x - w * 0.3)}" cy="${r1(y + w * 0.05)}" rx="${r1(w * 0.55)}" ry="${r1(w * 0.1)}"/><ellipse cx="${r1(x + w * 0.35)}" cy="${r1(y - w * 0.05)}" rx="${r1(w * 0.5)}" ry="${r1(w * 0.09)}"/></g>`;
    }
  }
  return { defs, svg };
}

/* Rolling ridge line. With ax set, the ridge is mirrored about that axis. */
function hillPath(R, baseY, amp, ax) {
  const p1 = R.range(0, 6.28), p2 = R.range(0, 6.28), w1 = R.range(1100, 1700), w2 = R.range(420, 640);
  const x1 = WORLD.W + WORLD.B, bottom = WORLD.H + WORLD.B;
  let d = `M${X0} ${bottom}`;
  for (let x = X0; x <= x1; x += 70) {
    const t = ax != null ? Math.abs(x - ax) : x;
    const y = baseY - amp * (0.62 * Math.sin(t / w1 * 6.283 + p1) + 0.38 * Math.sin(t / w2 * 6.283 + p2));
    d += ` L${x} ${r1(y)}`;
  }
  return d + ` L${x1} ${bottom} Z`;
}

function treeSVG(R, x, baseY, H, kind, cols) {
  const c0 = cols[0], c1 = cols[1], c2 = cols[2];
  if (kind === 'cypress') {
    return `<rect x="${r1(x - H * 0.012)}" y="${r1(baseY - H * 0.12)}" width="${r1(H * 0.024)}" height="${r1(H * 0.12)}" fill="#5b4636"/>` +
      `<ellipse cx="${r1(x)}" cy="${r1(baseY - H * 0.54)}" rx="${r1(H * 0.105)}" ry="${r1(H * 0.47)}" fill="${c2}"/>` +
      `<ellipse cx="${r1(x - H * 0.03)}" cy="${r1(baseY - H * 0.56)}" rx="${r1(H * 0.055)}" ry="${r1(H * 0.4)}" fill="${c0}" opacity=".7"/>`;
  }
  if (kind === 'pine') {
    let s = `<rect x="${r1(x - H * 0.02)}" y="${r1(baseY - H * 0.2)}" width="${r1(H * 0.04)}" height="${r1(H * 0.2)}" fill="#5b4636"/>`;
    for (let i = 0; i < 3; i++) {
      const y = baseY - H * (0.14 + i * 0.25), w = H * (0.24 - i * 0.05), t = H * 0.42;
      s += `<polygon points="${r1(x - w)},${r1(y)} ${r1(x + w)},${r1(y)} ${r1(x)},${r1(y - t)}" fill="${i % 2 ? c0 : c2}"/>`;
    }
    return s;
  }
  let s = `<path d="M${r1(x - H * 0.03)} ${r1(baseY)} L${r1(x - H * 0.022)} ${r1(baseY - H * 0.5)} L${r1(x + H * 0.022)} ${r1(baseY - H * 0.5)} L${r1(x + H * 0.03)} ${r1(baseY)} Z" fill="#6a5140"/>`;
  s += `<circle cx="${r1(x)}" cy="${r1(baseY - H * 0.66)}" r="${r1(H * 0.34)}" fill="${c2}"/>`;
  s += `<circle cx="${r1(x - H * 0.21)}" cy="${r1(baseY - H * 0.53)}" r="${r1(H * 0.23)}" fill="${c2}"/>`;
  s += `<circle cx="${r1(x + H * 0.22)}" cy="${r1(baseY - H * 0.55)}" r="${r1(H * 0.24)}" fill="${c0}"/>`;
  s += `<circle cx="${r1(x - H * 0.06)}" cy="${r1(baseY - H * 0.74)}" r="${r1(H * 0.25)}" fill="${c0}"/>`;
  s += `<circle cx="${r1(x - H * 0.12)}" cy="${r1(baseY - H * 0.8)}" r="${r1(H * 0.15)}" fill="${c1}" opacity=".85"/>`;
  return s;
}

function treeline(c, baseY, scale, cols, farCol, ax) {
  const { R } = c;
  let s = '';
  const from = ax != null ? ax : X0, to = WORLD.W + WORLD.B;
  for (let x = from + R.range(0, 60); x < to; x += R.range(55, 120) * scale) {
    const r = R.range(42, 78) * scale;
    const col = mix(R.pick(cols), farCol, 0.45);
    s += `<circle cx="${r1(x)}" cy="${r1(baseY - r * 0.55)}" r="${r1(r)}" fill="${col}"/>`;
  }
  return ax != null ? mirrorX(s, ax) : s;
}

/* A straight band on the ground that vanishes at the point behind the
   subject: paths, runners, docks. Xa..Xb are metres to the side. */
function groundBand(c, Xa, Xb, qFar, qNear, fill, extra) {
  return `<polygon points="${r1(c.pX(qFar, Xa))},${r1(c.gY(qFar))} ${r1(c.pX(qFar, Xb))},${r1(c.gY(qFar))} ${r1(c.pX(qNear, Xb))},${r1(c.gY(qNear))} ${r1(c.pX(qNear, Xa))},${r1(c.gY(qNear))}" fill="${fill}"${extra || ''}/>`;
}
const groundLine = (c, Xm, qFar, qNear) => [c.pX(qNear, Xm), c.gY(qNear), c.pX(qFar, Xm), c.gY(qFar)];

function fenceSVG(c, Xm, feats) {
  const { T } = c;
  let s = '';
  const wood = mix('#8a6b4c', T.far[1], 0.25), woodD = shade(wood, -0.25);
  const qs = [];
  for (let i = 0; i < 15; i++) qs.push(1 / lerp(1 / 0.24, 1 / (c.qBottom * 1.05), i / 14));
  /* rails first: thin wedges that meet at the vanishing point */
  for (const m of [0.95, 0.5]) {
    const qa = qs[0], qb = qs[qs.length - 1];
    s += `<polygon points="${r1(c.pX(qa, Xm))},${r1(c.pY(qa, m))} ${r1(c.pX(qb, Xm))},${r1(c.pY(qb, m))} ${r1(c.pX(qb, Xm))},${r1(c.pY(qb, m - 0.1))} ${r1(c.pX(qa, Xm))},${r1(c.pY(qa, m - 0.1))}" fill="${wood}"/>`;
  }
  for (const q of qs) {
    const x = c.pX(q, Xm), w = 0.11 * q * c.k;
    s += `<rect x="${r1(x - w / 2)}" y="${r1(c.pY(q, 1.12))}" width="${r1(w)}" height="${r1(c.gY(q) - c.pY(q, 1.12))}" fill="${woodD}"/>`;
  }
  feats.lines.push([c.pX(c.qBottom * 0.72, Xm), c.pY(c.qBottom * 0.72, 0.95), c.pX(1.12, Xm), c.pY(1.12, 0.95)]);
  return s;
}

function flowerDots(c, qMin, qMax, n, cols, avoidHalf) {
  const { R } = c;
  let s = '';
  for (let i = 0; i < n; i++) {
    const q = 1 / R.range(1 / qMax, 1 / qMin);
    let Xm = R.range(-9, 9) / Math.max(1, q * 0.6);
    if (avoidHalf && Math.abs(Xm) < avoidHalf) Xm = (Xm < 0 ? -1 : 1) * (avoidHalf + R.range(0, 1.2));
    const x = c.pX(q, Xm), y = c.gY(q), r = Math.min(13, 0.017 * q * c.k * R.range(0.7, 1.3));
    if (x < X0 || x > WORLD.W + WORLD.B) continue;
    s += `<circle cx="${r1(x)}" cy="${r1(y - r)}" r="${r1(r)}" fill="${R.pick(cols)}" opacity=".85"/>`;
  }
  return s;
}

/* ---------------- MEADOW ---------------- */
function envMeadow(c, o) {
  const { R, T, sx, hy } = c;
  let defs = '', back = '', mid = '';
  const feats = { horizonY: hy, lines: [] };
  const sky = skyLayer(c, { noClouds: o.sparse || o.mirror, sunX: o.mirror ? sx : o.sunX, noSun: o.noSun });
  defs += sky.defs; back += sky.svg;
  const ax = o.mirror ? sx : null;
  if (o.sparse) {
    back += `<path d="${hillPath(R, hy - 6, 14, ax)}" fill="${mix(T.far[1], T.sky[T.sky.length - 1], 0.35)}"/>`;
  } else {
    back += `<path d="${hillPath(R, hy - 70, 80, ax)}" fill="${mix(T.far[0], T.sky[T.sky.length - 1], 0.3)}"/>`;
    back += `<path d="${hillPath(R, hy - 22, 46, ax)}" fill="${T.far[1]}"/>`;
    back += treeline(c, hy + 6, 1, T.tree, T.far[1], ax);
  }
  defs += gradV('gr', hy, WORLD.H + WORLD.B * 0.6, T.ground);
  mid += `<rect x="${X0}" y="${r1(hy)}" width="${XW}" height="${r1(WORLD.H + WORLD.B - hy)}" fill="url(#§gr)"/>`;
  /* soft swells so the ground is not one flat sheet */
  if (!o.sparse) {
    for (let i = 0; i < 4; i++) {
      const q = R.range(0.3, 2.6), y = c.gY(q);
      mid += `<ellipse cx="${r1(R.range(-200, 3200))}" cy="${r1(y)}" rx="${r1(R.range(500, 1100))}" ry="${r1(18 * q)}" fill="${T.ground[2]}" opacity=".16"/>`;
    }
  }
  /* trees: kept clear of the couple's heads */
  let trees = '';
  if (!o.sparse) {
    const want = o.mirror ? 2 : (o.trees != null ? o.trees : R.int(2, 3));
    const sides = o.mirror ? [1] : null;
    for (let i = 0; i < want; i++) {
      const q = R.range(0.3, 0.78);
      const Hm = R.range(6.5, 10.5), Ht = Hm * q * c.k;
      const side = sides ? 1 : (o.treeSide || R.sign());
      const Xm = side * R.range(2.6, 6.5) / q * (o.mirror ? 0.8 + i * 0.75 : 1);
      const kind = o.treeKind || R.weighted([['round', 6], ['pine', 2], ['cypress', 1.5]]);
      trees += treeSVG(R, c.pX(q, Xm), c.gY(q), Ht, kind, T.tree);
    }
    if (o.mirror) trees = mirrorX(trees, sx);
  }
  mid += trees;
  if (o.path) {
    const w = 0.78;
    mid += groundBand(c, -w, w, 0.03, c.qBottom, T.path);
    mid += groundBand(c, -w, -w * 0.82, 0.03, c.qBottom, shade(T.path, -0.12), ' opacity=".5"');
    mid += groundBand(c, w * 0.82, w, 0.03, c.qBottom, shade(T.path, -0.12), ' opacity=".5"');
    feats.lines.push(groundLine(c, -w, 1.1, c.qBottom * 0.7), groundLine(c, w, 1.1, c.qBottom * 0.7));
    feats.lead = { half: w, name: 'path' };
  }
  if (o.fence) {
    const sides = o.fence === 2 ? [-1, 1] : [o.fence];
    for (const s of sides) mid += fenceSVG(c, s * (o.path ? 1.75 : 1.5), feats);
  }
  if (!o.sparse && !o.noFlowers) mid += flowerDots(c, 0.45, Math.min(2.6, c.qBottom), 90, ['#F6E7C6', '#F4D3C8', '#FFFFFF', '#E9C46A'], o.path ? 1.1 : 0.5);
  let frame = null;
  if (o.arbor) { const a = arborSVG(c, o.arbor); mid += a.svg; frame = a.frame; }
  if (frame) feats.frame = frame;
  if (o.mirror) feats.axisX = sx;
  return { defs, back, mid, front: '', feats };
}

/* Timber arbor or floral arch standing around the couple. */
function arborSVG(c, kind) {
  const { R, T } = c;
  const q = 0.965, half = kind === 'arch' ? 1.28 : 1.22, top = kind === 'arch' ? 2.9 : 2.72;
  const xl = c.pX(q, -half), xr = c.pX(q, half), yb = c.gY(q), yt = c.pY(q, top);
  const pw = 0.11 * q * c.k;
  const wood = kind === 'arch' ? '#F3EEE2' : mix('#9a7650', T.far[1], 0.2), woodD = shade(wood, -0.22);
  let s = '';
  if (kind === 'arch') {
    const rr = (xr - xl) / 2, yArc = c.pY(q, top - 1.28 * 0.92);
    s += `<path d="M${r1(xl)} ${r1(yb)} L${r1(xl)} ${r1(yArc)} A${r1(rr)} ${r1(yArc - yt)} 0 0 1 ${r1(xr)} ${r1(yArc)} L${r1(xr)} ${r1(yb)}" stroke="${woodD}" stroke-width="${r1(pw * 1.5)}" fill="none"/>`;
    s += `<path d="M${r1(xl)} ${r1(yb)} L${r1(xl)} ${r1(yArc)} A${r1(rr)} ${r1(yArc - yt)} 0 0 1 ${r1(xr)} ${r1(yArc)} L${r1(xr)} ${r1(yb)}" stroke="${wood}" stroke-width="${r1(pw)}" fill="none"/>`;
    /* florals around the curve, mirrored so the arch stays symmetrical */
    const pal = R.pick(FLOWERS);
    let fl = '';
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      const ang = Math.PI * (0.5 + t * 0.62);
      const px = (xl + xr) / 2 + Math.cos(ang) * rr * R.range(0.94, 1.08);
      const py = yArc - Math.sin(ang) * (yArc - yt) * R.range(0.94, 1.08);
      const r = pw * R.range(1.0, 2.1);
      fl += i % 3 === 0
        ? `<ellipse cx="${r1(px)}" cy="${r1(py)}" rx="${r1(r * 1.5)}" ry="${r1(r * 0.7)}" transform="rotate(${r1(R.range(0, 180))} ${r1(px)} ${r1(py)})" fill="${R.pick(LEAF)}"/>`
        : `<circle cx="${r1(px)}" cy="${r1(py)}" r="${r1(r)}" fill="${R.pick(pal)}"/>`;
    }
    for (let i = 0; i < 9; i++) {
      const py = lerp(yArc, yb, i / 14 + R.range(0, 0.02)), r = pw * R.range(0.9, 1.8);
      fl += `<circle cx="${r1(xl + R.range(-pw, pw))}" cy="${r1(py)}" r="${r1(r)}" fill="${i % 3 ? R.pick(pal) : R.pick(LEAF)}"/>`;
    }
    s += mirrorX(fl, (xl + xr) / 2);
  } else {
    const yBeam = yt, bh = 0.2 * q * c.k;
    s += `<rect x="${r1(xl - pw * 0.7)}" y="${r1(yBeam)}" width="${r1(pw * 1.4)}" height="${r1(yb - yBeam)}" fill="${woodD}"/><rect x="${r1(xr - pw * 0.7)}" y="${r1(yBeam)}" width="${r1(pw * 1.4)}" height="${r1(yb - yBeam)}" fill="${woodD}"/>`;
    s += `<rect x="${r1(xl - pw * 3)}" y="${r1(yBeam - bh * 0.2)}" width="${r1(xr - xl + pw * 6)}" height="${r1(bh)}" fill="${wood}"/>`;
    s += `<rect x="${r1(xl - pw * 2)}" y="${r1(yBeam + bh * 1.15)}" width="${r1(xr - xl + pw * 4)}" height="${r1(bh * 0.5)}" fill="${woodD}"/>`;
    /* drape and a floral cluster on one corner */
    const side = R.sign();
    const cxn = side < 0 ? xl : xr;
    s += `<path d="M${r1(xl)} ${r1(yBeam + bh)} Q${r1((xl + xr) / 2)} ${r1(yBeam + bh * 4.2)} ${r1(xr)} ${r1(yBeam + bh)} L${r1(xr)} ${r1(yBeam + bh * 0.4)} Q${r1((xl + xr) / 2)} ${r1(yBeam + bh * 2.6)} ${r1(xl)} ${r1(yBeam + bh * 0.4)} Z" fill="#FBF6EC" opacity=".88"/>`;
    const pal = R.pick(FLOWERS);
    for (let i = 0; i < 16; i++) {
      const px = cxn + R.range(-pw * 4, pw * 4), py = yBeam + R.range(-bh * 0.8, bh * 5), r = pw * R.range(1.2, 2.6);
      s += i % 3 === 0
        ? `<ellipse cx="${r1(px)}" cy="${r1(py)}" rx="${r1(r * 1.5)}" ry="${r1(r * 0.7)}" transform="rotate(${r1(R.range(0, 180))} ${r1(px)} ${r1(py)})" fill="${R.pick(LEAF)}"/>`
        : `<circle cx="${r1(px)}" cy="${r1(py)}" r="${r1(r)}" fill="${R.pick(pal)}"/>`;
    }
  }
  const ov = kind === 'arch' ? pw * 2.4 : pw * 3.2;
  return { svg: s, frame: rect(xl - ov, yt - ov, xr - xl + 2 * ov, yb - yt + ov) };
}

/* ---------------- GARDEN CEREMONY ---------------- */
function envGarden(c, o) {
  const { R, T, sx, hy } = c;
  let defs = '', back = '', mid = '', front = '';
  const feats = { horizonY: hy, lines: [], axisX: sx };
  const sky = skyLayer(c, { noSun: true, noClouds: true });
  defs += sky.defs; back += sky.svg;
  /* cypress row behind the hedge, mirrored */
  let cy = '';
  for (let j = 0; j < 5; j++) {
    const q = 0.5, Xm = 2.4 + j * 2.9;
    cy += treeSVG(R, c.pX(q, Xm), c.gY(q), R.range(7.4, 8.6) * q * c.k, 'cypress', T.tree);
  }
  back += mirrorX(cy, sx);
  const qh = 0.7, yTop = c.pY(qh, 2.7), yBase = c.gY(qh);
  defs += gradV('hd', yTop, yBase, [T.hedge[0], T.hedge[1]]);
  back += `<rect x="${X0}" y="${r1(yTop)}" width="${XW}" height="${r1(yBase - yTop + 4)}" fill="url(#§hd)"/>`;
  back += `<rect x="${X0}" y="${r1(yTop)}" width="${XW}" height="${r1(0.16 * qh * c.k)}" fill="${shade(T.hedge[0], 0.14)}"/>`;
  /* clipped buttresses along the hedge for rhythm */
  let but = '';
  for (let j = 0; j < 6; j++) {
    const Xm = 2.1 + j * 2.6, x = c.pX(qh, Xm), w = 0.5 * qh * c.k;
    but += `<rect x="${r1(x - w / 2)}" y="${r1(yTop)}" width="${r1(w)}" height="${r1(yBase - yTop)}" fill="${T.hedge[1]}" opacity=".55"/>`;
  }
  back += mirrorX(but, sx);
  defs += gradV('gr', yBase, WORLD.H + WORLD.B * 0.6, T.ground);
  mid += `<rect x="${X0}" y="${r1(yBase)}" width="${XW}" height="${r1(WORLD.H + WORLD.B - yBase)}" fill="url(#§gr)"/>`;
  /* topiary in urns, mirrored */
  let top = '';
  for (const Xm of [3.1, 6.4]) {
    const q = 0.98, x = c.pX(q, Xm), yb = c.gY(q), u = q * c.k;
    top += `<path d="M${r1(x - 0.26 * u)} ${r1(yb - 0.62 * u)} L${r1(x + 0.26 * u)} ${r1(yb - 0.62 * u)} L${r1(x + 0.17 * u)} ${r1(yb)} L${r1(x - 0.17 * u)} ${r1(yb)} Z" fill="${T.stone[1]}"/>`;
    top += `<rect x="${r1(x - 0.3 * u)}" y="${r1(yb - 0.68 * u)}" width="${r1(0.6 * u)}" height="${r1(0.09 * u)}" fill="${T.stone[0]}"/>`;
    top += `<circle cx="${r1(x)}" cy="${r1(yb - 1.12 * u)}" r="${r1(0.48 * u)}" fill="${T.tree[2]}"/><circle cx="${r1(x - 0.1 * u)}" cy="${r1(yb - 1.2 * u)}" r="${r1(0.3 * u)}" fill="${T.tree[0]}" opacity=".8"/>`;
  }
  mid += mirrorX(top, sx);
  { const u = 0.98 * c.k, yb = c.gY(0.98), half = 3.1 * u + 0.5 * u; feats.pair = rect(sx - half, yb - 1.62 * u, 2 * half, 1.62 * u); }
  if (o.aisle) {
    const w = 0.82, runner = mix('#FBF7EE', T.sky[T.sky.length - 1], 0.12);
    mid += groundBand(c, -w, w, 0.99, c.qBottom, runner);
    mid += groundBand(c, -w, -w * 0.9, 0.99, c.qBottom, shade(runner, -0.1));
    mid += groundBand(c, w * 0.9, w, 0.99, c.qBottom, shade(runner, -0.1));
    feats.lines.push(groundLine(c, -w, 1.08, c.qBottom * 0.62), groundLine(c, w, 1.08, c.qBottom * 0.62));
    feats.lead = { half: w, name: 'aisle' };
    let pet = '';
    for (let i = 0; i < 30; i++) {
      const q = 1 / R.range(1 / (c.qBottom * 0.9), 1 / 1.05), Xm = (w + R.range(0, 0.22));
      const r = 0.035 * q * c.k;
      pet += `<ellipse cx="${r1(c.pX(q, Xm))}" cy="${r1(c.gY(q))}" rx="${r1(r * 1.6)}" ry="${r1(r * 0.6)}" fill="${R.pick(['#F6D5CF', '#FFFFFF', '#E7A9A0'])}"/>`;
    }
    mid += mirrorX(pet, sx);
  }
  if (o.arch) { const a = arborSVG(c, 'arch'); mid += a.svg; feats.frame = a.frame; }
  if (o.chairs) {
    /* rows of seated guests seen from the back of the aisle */
    const rows = [1.2, 1.4, 1.66, 2.02, 2.5];
    const cloth = ['#3B4A5F', '#6B7A8C', '#8C6A72', '#A9B4A0', '#C9A98F', '#4F5D54', '#D9C9B8', '#7D6F8E', '#2F3A46'];
    for (const q of rows) {
      let row = '';
      const u = q * c.k, yb = c.gY(q);
      for (let j = 0; j < 7; j++) {
        const Xm = 1.42 + j * 0.64, x = c.pX(q, Xm);
        if (x > WORLD.W + WORLD.B + 200) break;
        row += `<rect x="${r1(x - 0.2 * u)}" y="${r1(yb - 0.95 * u)}" width="${r1(0.4 * u)}" height="${r1(0.5 * u)}" rx="${r1(0.05 * u)}" fill="#F4EFE4"/>`;
        row += `<rect x="${r1(x - 0.19 * u)}" y="${r1(yb - 0.46 * u)}" width="${r1(0.04 * u)}" height="${r1(0.46 * u)}" fill="#D9D2C3"/><rect x="${r1(x + 0.15 * u)}" y="${r1(yb - 0.46 * u)}" width="${r1(0.04 * u)}" height="${r1(0.46 * u)}" fill="#D9D2C3"/>`;
        if (R.chance(0.88)) {
          const cl = R.pick(cloth), hr = R.pick(HAIR);
          row += `<path d="M${r1(x - 0.25 * u)} ${r1(yb - 0.72 * u)} Q${r1(x - 0.25 * u)} ${r1(yb - 1.08 * u)} ${r1(x)} ${r1(yb - 1.08 * u)} Q${r1(x + 0.25 * u)} ${r1(yb - 1.08 * u)} ${r1(x + 0.25 * u)} ${r1(yb - 0.72 * u)} Z" fill="${cl}"/>`;
          row += `<circle cx="${r1(x)}" cy="${r1(yb - 1.22 * u)}" r="${r1(0.115 * u)}" fill="${hr}"/>`;
        }
      }
      front += mirrorX(row, sx);
    }
    feats.lines.push([c.pX(2.5, -1.42), c.pY(2.5, 1.22), c.pX(1.2, -1.42), c.pY(1.2, 1.22)], [c.pX(2.5, 1.42), c.pY(2.5, 1.22), c.pX(1.2, 1.42), c.pY(1.2, 1.22)]);
  }
  return { defs, back, mid, front, feats };
}

/* ---------------- ESTATE FACADE ---------------- */
function envEstate(c, o) {
  const { R, T, sx, hy } = c;
  let defs = '', back = '', mid = '';
  const feats = { horizonY: hy, lines: [], axisX: sx };
  const sky = skyLayer(c, { noSun: true, noClouds: true });
  defs += sky.defs; back += sky.svg;
  const q = 0.8, u = q * c.k, yb = c.gY(q), yTop = c.pY(q, 5.3);
  const stone = T.stone;
  defs += gradV('wall', yTop, yb, [stone[0], stone[1]]);
  back += `<rect x="${X0}" y="${r1(yTop)}" width="${XW}" height="${r1(yb - yTop + 6)}" fill="url(#§wall)"/>`;
  back += `<rect x="${X0}" y="${r1(yTop - 0.42 * u)}" width="${XW}" height="${r1(0.46 * u)}" fill="${stone[2]}"/>`;
  back += `<rect x="${X0}" y="${r1(yTop - 0.52 * u)}" width="${XW}" height="${r1(0.12 * u)}" fill="${stone[0]}"/>`;
  back += `<rect x="${X0}" y="${r1(yb - 0.5 * u)}" width="${XW}" height="${r1(0.5 * u + 6)}" fill="${stone[2]}" opacity=".55"/>`;
  const glass = mix('#5E7387', T.sky[0], 0.35);
  let side = '';
  for (let j = 0; j < 3; j++) {
    const Xm = 3.25 + j * 3.3, x = c.pX(q, Xm), w = 0.62 * u;
    const y1 = c.pY(q, 3.5), y2 = c.pY(q, 0.95);
    side += `<path d="M${r1(x - w)} ${r1(y2)} L${r1(x - w)} ${r1(y1)} A${r1(w)} ${r1(w)} 0 0 1 ${r1(x + w)} ${r1(y1)} L${r1(x + w)} ${r1(y2)} Z" fill="${stone[2]}"/>`;
    side += `<path d="M${r1(x - w * 0.82)} ${r1(y2 - w * 0.12)} L${r1(x - w * 0.82)} ${r1(y1)} A${r1(w * 0.82)} ${r1(w * 0.82)} 0 0 1 ${r1(x + w * 0.82)} ${r1(y1)} L${r1(x + w * 0.82)} ${r1(y2 - w * 0.12)} Z" fill="${glass}"/>`;
    side += `<path d="M${r1(x)} ${r1(y1 - w * 0.8)} L${r1(x)} ${r1(y2 - w * 0.12)} M${r1(x - w * 0.82)} ${r1((y1 + y2) / 2)} L${r1(x + w * 0.82)} ${r1((y1 + y2) / 2)}" stroke="${stone[0]}" stroke-width="${r1(0.05 * u)}" fill="none"/>`;
  }
  for (const Xm of [1.66, 4.9, 8.2]) {
    const x = c.pX(q, Xm), w = 0.2 * u;
    side += `<rect x="${r1(x - w)}" y="${r1(yTop)}" width="${r1(2 * w)}" height="${r1(yb - yTop)}" fill="${stone[0]}"/>`;
    side += `<rect x="${r1(x + w * 0.35)}" y="${r1(yTop)}" width="${r1(w * 0.65)}" height="${r1(yb - yTop)}" fill="${stone[2]}" opacity=".45"/>`;
    side += `<rect x="${r1(x - w * 1.35)}" y="${r1(yTop)}" width="${r1(2.7 * w)}" height="${r1(0.22 * u)}" fill="${stone[0]}"/><rect x="${r1(x - w * 1.35)}" y="${r1(yb - 0.3 * u)}" width="${r1(2.7 * w)}" height="${r1(0.3 * u)}" fill="${stone[0]}"/>`;
  }
  back += mirrorX(side, sx);
  if (o.door !== false) {
    const dw = 1.02 * u, y1 = c.pY(q, 2.5), xl = sx - dw, xr = sx + dw;
    const doorCol = mix('#2D3A36', T.hedge[1], 0.4);
    back += `<path d="M${r1(xl - 0.16 * u)} ${r1(yb)} L${r1(xl - 0.16 * u)} ${r1(y1)} A${r1(dw + 0.16 * u)} ${r1(dw + 0.16 * u)} 0 0 1 ${r1(xr + 0.16 * u)} ${r1(y1)} L${r1(xr + 0.16 * u)} ${r1(yb)} Z" fill="${stone[0]}"/>`;
    back += `<path d="M${r1(xl)} ${r1(yb)} L${r1(xl)} ${r1(y1)} A${r1(dw)} ${r1(dw)} 0 0 1 ${r1(xr)} ${r1(y1)} L${r1(xr)} ${r1(yb)} Z" fill="${doorCol}"/>`;
    back += `<path d="M${r1(sx)} ${r1(y1 - dw)} L${r1(sx)} ${r1(yb)}" stroke="${shade(doorCol, -0.3)}" stroke-width="${r1(0.04 * u)}"/>`;
    feats.frame = rect(xl - 0.16 * u, y1 - dw - 0.16 * u, 2 * dw + 0.32 * u, yb - y1 + dw + 0.16 * u);
  }
  defs += gradV('gr', yb, WORLD.H + WORLD.B * 0.6, [T.gravel[0], T.gravel[1], shade(T.gravel[1], -0.1)]);
  mid += `<rect x="${X0}" y="${r1(yb)}" width="${XW}" height="${r1(WORLD.H + WORLD.B - yb)}" fill="url(#§gr)"/>`;
  mid += `<rect x="${X0}" y="${r1(yb)}" width="${XW}" height="${r1(0.1 * u)}" fill="${stone[2]}" opacity=".6"/>`;
  let pots = '';
  for (const Xm of [2.25, 5.6]) {
    const qq = 0.94, x = c.pX(qq, Xm), y = c.gY(qq), uu = qq * c.k;
    pots += `<path d="M${r1(x - 0.3 * uu)} ${r1(y - 0.6 * uu)} L${r1(x + 0.3 * uu)} ${r1(y - 0.6 * uu)} L${r1(x + 0.22 * uu)} ${r1(y)} L${r1(x - 0.22 * uu)} ${r1(y)} Z" fill="${shade(stone[2], -0.12)}"/>`;
    pots += `<ellipse cx="${r1(x)}" cy="${r1(y - 1.5 * uu)}" rx="${r1(0.36 * uu)}" ry="${r1(0.95 * uu)}" fill="${T.tree[2]}"/><ellipse cx="${r1(x - 0.08 * uu)}" cy="${r1(y - 1.55 * uu)}" rx="${r1(0.2 * uu)}" ry="${r1(0.78 * uu)}" fill="${T.tree[0]}" opacity=".75"/>`;
  }
  mid += mirrorX(pots, sx);
  void R;
  return { defs, back, mid, front: '', feats };
}

/* ---------------- LAKESIDE ---------------- */
function envLake(c, o) {
  const { R, T, sx, hy } = c;
  let defs = '', back = '', mid = '';
  const feats = { horizonY: hy, lines: [] };
  const sky = skyLayer(c, { noClouds: o.sparse || o.mirror, sunX: o.mirror ? sx : o.sunX, noSun: o.noSun });
  defs += sky.defs; back += sky.svg;
  const ax = o.mirror ? sx : null;
  let shore = '';
  if (o.sparse) {
    shore += `<path d="${hillPath(R, hy - 10, 16, ax)}" fill="${mix(T.far[1], T.sky[T.sky.length - 1], 0.3)}"/>`;
  } else {
    shore += `<path d="${hillPath(R, hy - 90, 95, ax)}" fill="${mix(T.far[0], T.sky[T.sky.length - 1], 0.25)}"/>`;
    shore += `<path d="${hillPath(R, hy - 30, 44, ax)}" fill="${T.far[1]}"/>`;
    shore += treeline(c, hy + 4, 0.9, T.tree, T.far[1], ax);
  }
  back += shore;
  defs += gradV('wt', hy, WORLD.H + WORLD.B * 0.5, T.water);
  mid += `<rect x="${X0}" y="${r1(hy)}" width="${XW}" height="${r1(WORLD.H + WORLD.B - hy)}" fill="url(#§wt)"/>`;
  /* the far shore, mirrored in the water */
  mid += `<g transform="translate(0 ${r1(2 * hy)}) scale(1 -1)" opacity=".28">${shore}</g>`;
  mid += `<rect x="${X0}" y="${r1(hy - 2)}" width="${XW}" height="5" fill="${shade(T.water[0], 0.25)}" opacity=".7"/>`;
  for (let i = 0; i < 16; i++) {
    const q = R.range(0.12, c.qBottom * 0.8), y = c.gY(q), w = R.range(120, 520) * Math.max(0.5, q * 0.5);
    const x = ax != null ? sx + R.range(60, 1700) : R.range(-300, 3300);
    const ln = `<rect x="${r1(x - w / 2)}" y="${r1(y)}" width="${r1(w)}" height="${r1(Math.max(2.5, 3.2 * q))}" rx="2" fill="#fff" opacity="${r1(R.range(0.1, 0.24))}"/>`;
    mid += ax != null ? mirrorX(ln, sx) : ln;
  }
  if (o.dock) {
    const w = 1.02, qEnd = 0.86, wood = mix('#B79A76', T.far[1], 0.25), woodD = shade(wood, -0.24);
    mid += groundBand(c, -w - 0.08, w + 0.08, qEnd, c.qBottom, woodD);
    mid += groundBand(c, -w, w, qEnd + 0.004, c.qBottom, wood);
    let pl = '';
    for (let i = 0; i < 26; i++) {
      const q = 1 / lerp(1 / qEnd, 1 / (c.qBottom * 1.02), i / 25);
      pl += `<path d="M${r1(c.pX(q, -w))} ${r1(c.gY(q))} L${r1(c.pX(q, w))} ${r1(c.gY(q))}" stroke="${woodD}" stroke-width="${r1(Math.max(1.4, 2.2 * q))}" opacity=".55"/>`;
    }
    mid += pl;
    for (const s of [-1, 1]) {
      for (const q of [0.88, 1.18, 1.62, 2.3]) {
        const x = c.pX(q, s * (w + 0.06)), pw = 0.11 * q * c.k;
        mid += `<rect x="${r1(x - pw / 2)}" y="${r1(c.pY(q, 0.48))}" width="${r1(pw)}" height="${r1(c.gY(q) - c.pY(q, 0.48) + 0.4 * q * c.k)}" rx="${r1(pw * 0.2)}" fill="${woodD}"/>`;
      }
    }
    feats.lines.push(groundLine(c, -w, 1.06, c.qBottom * 0.7), groundLine(c, w, 1.06, c.qBottom * 0.7));
    feats.lead = { half: w, name: 'dock' };
  } else {
    /* grassy bank the subject stands on */
    const qB = 0.82, yB = c.gY(qB);
    defs += gradV('bk', yB, WORLD.H + WORLD.B * 0.6, [T.ground[0], T.ground[1], T.ground[2]]);
    let d = `M${X0} ${WORLD.H + WORLD.B}`;
    const p = R.range(0, 6), wv = R.range(700, 1100);
    for (let x = X0; x <= WORLD.W + WORLD.B; x += 80) {
      const t = ax != null ? Math.abs(x - ax) : x;
      d += ` L${x} ${r1(yB + 16 * Math.sin(t / wv * 6.283 + p))}`;
    }
    d += ` L${WORLD.W + WORLD.B} ${WORLD.H + WORLD.B} Z`;
    mid += `<path d="${d}" fill="url(#§bk)"/>`;
    if (!o.sparse) {
      let tr = '';
      const n = o.mirror ? 2 : R.int(1, 2);
      for (let i = 0; i < n; i++) {
        const q = R.range(0.84, 0.95), Hm = R.range(5.5, 8);
        const Xm = (o.mirror ? 1 : (o.treeSide || R.sign())) * (3.4 + i * 2.6 + R.range(0, 0.8));
        tr += treeSVG(R, c.pX(q, Xm), c.gY(q), Hm * q * c.k, R.pick(['round', 'round', 'pine']), T.tree);
      }
      mid += o.mirror ? mirrorX(tr, sx) : tr;
      mid += flowerDots(c, 0.9, Math.min(2.6, c.qBottom), 60, ['#F6E7C6', '#FFFFFF', '#E9C46A'], 0.5);
    }
  }
  if (o.mirror) feats.axisX = sx;
  return { defs, back, mid, front: '', feats };
}

/* ---------------- DOORWAY (shot from inside) ---------------- */
function envDoorway(c, o) {
  const { R, T, sx, hy } = c;
  let defs = '', back = '', mid = '';
  const feats = { horizonY: hy, lines: [] };
  const sky = skyLayer(c, { sunX: sx + R.sign() * 500 });
  defs += sky.defs; back += sky.svg;
  /* a bright garden outside */
  const yh = c.gY(0.45);
  back += treeline(c, c.gY(0.3), 2.2, T.tree, T.far[1], null);
  defs += gradV('hd', c.pY(0.45, 2.4), yh, [T.hedge[0], T.hedge[1]]);
  back += `<rect x="${X0}" y="${r1(c.pY(0.45, 2.4))}" width="${XW}" height="${r1(yh - c.pY(0.45, 2.4) + 4)}" fill="url(#§hd)"/>`;
  defs += gradV('gr', yh, c.gy + 40, [T.ground[0], T.ground[1]]);
  back += `<rect x="${X0}" y="${r1(yh)}" width="${XW}" height="${r1(WORLD.H + WORLD.B - yh)}" fill="url(#§gr)"/>`;
  back += groundBand(c, -0.9, 0.9, 0.46, 1.0, T.path);
  /* the wall and its opening */
  const u = c.k, half = 1.06 * u, yb = c.gy + 2, ySpring = c.pY(1, 1.92), rr = half;
  const off = o.offset || 0;
  const xl = sx + off - half, xr = sx + off + half;
  const wall = o.wall || R.pick(['#2B2622', '#2A2D33', '#33302B', '#2F2A30']);
  const wallL = shade(wall, 0.08);
  const open = `M${r1(xl)} ${r1(yb)} L${r1(xl)} ${r1(ySpring)} A${r1(rr)} ${r1(rr)} 0 0 1 ${r1(xr)} ${r1(ySpring)} L${r1(xr)} ${r1(yb)} Z`;
  mid += `<path fill-rule="evenodd" d="M${X0} ${-WORLD.B} H${WORLD.W + WORLD.B} V${WORLD.H + WORLD.B} H${X0} Z ${open}" fill="${wall}"/>`;
  mid += `<path d="${open}" fill="none" stroke="${wallL}" stroke-width="${r1(0.09 * u)}"/>`;
  /* floor with a pool of daylight */
  defs += gradV('fl', yb, WORLD.H + WORLD.B * 0.5, [shade(wall, 0.16), shade(wall, 0.05)]);
  mid += `<rect x="${X0}" y="${r1(yb)}" width="${XW}" height="${r1(WORLD.H + WORLD.B - yb)}" fill="url(#§fl)"/>`;
  mid += `<polygon points="${r1(xl)},${r1(yb)} ${r1(xr)},${r1(yb)} ${r1(sx + off + half * 2.6)},${r1(WORLD.H + WORLD.B)} ${r1(sx + off - half * 2.6)},${r1(WORLD.H + WORLD.B)}" fill="${T.sky[T.sky.length - 1]}" opacity=".13"/>`;
  mid += `<rect x="${X0}" y="${r1(yb - 0.14 * u)}" width="${r1(xl - X0)}" height="${r1(0.14 * u)}" fill="${wallL}"/><rect x="${r1(xr)}" y="${r1(yb - 0.14 * u)}" width="${r1(WORLD.W + WORLD.B - xr)}" height="${r1(0.14 * u)}" fill="${wallL}"/>`;
  /* furnishings: mirrored for a symmetrical room, otherwise one-sided */
  const sconce = x => `<rect x="${r1(x - 0.05 * u)}" y="${r1(c.pY(1, 2.0))}" width="${r1(0.1 * u)}" height="${r1(0.34 * u)}" fill="#B99557"/><circle cx="${r1(x)}" cy="${r1(c.pY(1, 2.08))}" r="${r1(0.36 * u)}" fill="#FFD9A0" opacity=".14"/><circle cx="${r1(x)}" cy="${r1(c.pY(1, 2.08))}" r="${r1(0.12 * u)}" fill="#FFE9C4"/>`;
  const picture = x => `<rect x="${r1(x - 0.62 * u)}" y="${r1(c.pY(1, 2.2))}" width="${r1(1.24 * u)}" height="${r1(0.9 * u)}" fill="#8C744D"/><rect x="${r1(x - 0.54 * u)}" y="${r1(c.pY(1, 2.2) + 0.08 * u)}" width="${r1(1.08 * u)}" height="${r1(0.74 * u)}" fill="${mix(T.far[0], wall, 0.35)}"/>`;
  const table = x => `<rect x="${r1(x - 0.7 * u)}" y="${r1(c.pY(1, 0.86))}" width="${r1(1.4 * u)}" height="${r1(0.08 * u)}" fill="#6B5238"/><rect x="${r1(x - 0.62 * u)}" y="${r1(c.pY(1, 0.8))}" width="${r1(0.07 * u)}" height="${r1(0.8 * u)}" fill="#59432E"/><rect x="${r1(x + 0.55 * u)}" y="${r1(c.pY(1, 0.8))}" width="${r1(0.07 * u)}" height="${r1(0.8 * u)}" fill="#59432E"/>` +
    `<ellipse cx="${r1(x)}" cy="${r1(c.pY(1, 1.36))}" rx="${r1(0.3 * u)}" ry="${r1(0.36 * u)}" fill="${T.tree[0]}"/><rect x="${r1(x - 0.1 * u)}" y="${r1(c.pY(1, 1.14))}" width="${r1(0.2 * u)}" height="${r1(0.28 * u)}" fill="#D9D2C3"/>`;
  if (o.decor === 'sym') {
    mid += mirrorX(sconce(sx + off + half + 0.85 * u) + picture(sx + off + half + 2.6 * u), sx + off);
    feats.axisX = sx;
  } else {
    const s = o.decorSide || R.sign();
    mid += picture(sx + off + s * (half + 1.6 * u)) + table(sx + off + s * (half + 1.6 * u));
    mid += sconce(sx + off - s * (half + 0.9 * u));
    const cxn = sx + off - s * (half + 2.9 * u);
    const drape = mix(wall, R.pick(['#B9A48C', '#8E9AA6', '#A88F8F']), 0.42);
    mid += `<path d="M${r1(cxn - 0.62 * u)} ${-WORLD.B} L${r1(cxn + 0.62 * u)} ${-WORLD.B} L${r1(cxn + 0.7 * u)} ${r1(yb)} L${r1(cxn - 0.7 * u)} ${r1(yb)} Z" fill="${drape}"/>`;
    for (const f of [-0.42, -0.14, 0.14, 0.42]) mid += `<path d="M${r1(cxn + f * u)} ${-WORLD.B} L${r1(cxn + f * 1.13 * u)} ${r1(yb)}" stroke="${shade(drape, -0.22)}" stroke-width="${r1(0.05 * u)}" opacity=".7"/>`;
  }
  feats.frame = rect(xl, ySpring - rr, xr - xl, yb - ySpring + rr);
  return { defs, back, mid, front: '', feats };
}

/* ---------------- FOREGROUND (out-of-focus layer) ---------------- */
function fgLayer(R, frame, kind, side, T) {
  let s = '';
  const fx = frame.x, fy = frame.y, fw = frame.w, fh = frame.h;
  const boxes = [];
  if (kind === 'florals') {
    const pal = R.pick(FLOWERS);
    const ex = side < 0 ? fx : fx + fw;
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const x = ex - side * R.range(-0.04, 0.2) * fw * (1 - t * 0.35);
      const y = fy + fh * lerp(1.04, 0.3, t) + R.range(-0.04, 0.04) * fh;
      const r = fh * R.range(0.07, 0.13);
      s += i % 4 === 3
        ? `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(r * 1.6)}" ry="${r1(r * 0.6)}" transform="rotate(${r1(R.range(-60, 60))} ${r1(x)} ${r1(y)})" fill="${R.pick(LEAF)}"/>`
        : `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${R.pick(pal)}"/>`;
    }
    for (let i = 0; i < 5; i++) {
      const x = fx + fw * (side < 0 ? R.range(0.1, 0.42) : R.range(0.58, 0.9)), y = fy + fh * R.range(0.95, 1.06), r = fh * R.range(0.07, 0.12);
      s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${R.pick(pal)}"/>`;
    }
    boxes.push(side < 0 ? rect(fx, fy + fh * 0.22, fw * 0.22, fh * 0.78) : rect(fx + fw * 0.78, fy + fh * 0.22, fw * 0.22, fh * 0.78));
    return { svg: s, sigma: fh * 0.017, opacity: 0.94, boxes };
  }
  if (kind === 'leaves') {
    const ex = side < 0 ? fx : fx + fw;
    for (let i = 0; i < 16; i++) {
      const x = ex - side * R.range(-0.03, 0.34) * fw, y = fy + R.range(-0.03, 0.3) * fh * (1 - Math.abs(x - ex) / (fw * 0.5));
      const r = fh * R.range(0.06, 0.11);
      s += `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(r * 1.7)}" ry="${r1(r * 0.62)}" transform="rotate(${r1(side * R.range(15, 70))} ${r1(x)} ${r1(y)})" fill="${R.pick([T.tree[2], T.tree[0], shade(T.tree[2], -0.2)])}"/>`;
    }
    for (let i = 0; i < 7; i++) {
      const x = ex - side * R.range(-0.02, 0.1) * fw, y = fy + R.range(0.25, 0.75) * fh, r = fh * R.range(0.05, 0.09);
      s += `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(r * 1.7)}" ry="${r1(r * 0.62)}" transform="rotate(${r1(side * R.range(40, 90))} ${r1(x)} ${r1(y)})" fill="${R.pick([T.tree[2], T.tree[0]])}"/>`;
    }
    boxes.push(side < 0 ? rect(fx, fy, fw * 0.36, fh * 0.34) : rect(fx + fw * 0.64, fy, fw * 0.36, fh * 0.34));
    return { svg: s, sigma: fh * 0.015, opacity: 0.95, boxes };
  }
  /* 'guests': an over-the-shoulder view from the aisle */
  const cols = R.shuffle(['#2C3440', '#4A3B3F', '#3A4A44', '#5A5560']);
  const one = (cx, col, hr) => `<path d="M${r1(cx - fw * 0.2)} ${r1(fy + fh * 1.1)} L${r1(cx - fw * 0.19)} ${r1(fy + fh * 0.82)} Q${r1(cx - fw * 0.17)} ${r1(fy + fh * 0.64)} ${r1(cx)} ${r1(fy + fh * 0.63)} Q${r1(cx + fw * 0.17)} ${r1(fy + fh * 0.64)} ${r1(cx + fw * 0.19)} ${r1(fy + fh * 0.82)} L${r1(cx + fw * 0.2)} ${r1(fy + fh * 1.1)} Z" fill="${col}"/><ellipse cx="${r1(cx)}" cy="${r1(fy + fh * 0.5)}" rx="${r1(fw * 0.072)}" ry="${r1(fh * 0.135)}" fill="${hr}"/>`;
  s += one(fx + fw * 0.07, cols[0], R.pick(HAIR));
  if (side === 0) { s += one(fx + fw * 0.93, cols[1], R.pick(HAIR)); boxes.push(rect(fx, fy + fh * 0.36, fw * 0.27, fh * 0.64), rect(fx + fw * 0.73, fy + fh * 0.36, fw * 0.27, fh * 0.64)); }
  else if (side > 0) { s = one(fx + fw * 0.93, cols[0], R.pick(HAIR)); boxes.push(rect(fx + fw * 0.73, fy + fh * 0.36, fw * 0.27, fh * 0.64)); }
  else boxes.push(rect(fx, fy + fh * 0.36, fw * 0.27, fh * 0.64));
  return { svg: s, sigma: fh * 0.013, opacity: 0.97, boxes };
}

const ENVS = { meadow: envMeadow, garden: envGarden, estate: envEstate, lake: envLake, doorway: envDoorway };
const ENV_CAM = { meadow: [0.82, 1.0], garden: [1.42, 1.55], estate: [1.1, 1.25], lake: [0.82, 0.98], doorway: [1.2, 1.35] };
