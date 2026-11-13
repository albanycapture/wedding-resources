/* ============================================================
   FIGURES — stylised people with known anatomy.
   Every figure reports where its joints, hands and head are, so the
   game can build crops on purpose and judge the player's crops.
   All measurements are fractions of the figure's height, measured
   down from the top of the head.
   ============================================================ */
const SKIN = ['#F3CDAE', '#E8B892', '#D29C70', '#B37C51', '#8C5B39', '#623D28'];
const HAIR = ['#2B1E18', '#4B3123', '#6E4A2C', '#A9793F', '#D0A85E', '#1C1C22', '#8C3E22', '#9E9C98'];
const SUITS = ['#24324D', '#2E3136', '#3B4A3F', '#5B2A33', '#4C607A', '#1D1E22', '#7F858D', '#A98F6A'];
const GOWNS = ['#FBF7EE', '#FFFFFF', '#F5EBDB', '#F9E9E3'];
const DRESSES = ['#9DB09A', '#8FA9C4', '#E0AFA8', '#7A3B46', '#D1A545', '#C6765B', '#6E7FA8', '#B8A1C9'];
const FLOWERS = [
  ['#F6D5CF', '#FFFFFF', '#E7A9A0', '#C9828A'],
  ['#FFFFFF', '#F3E3B5', '#F7C8A0', '#E9967A'],
  ['#E9D7F0', '#FFFFFF', '#B79AD0', '#8F6FB0'],
  ['#FFFFFF', '#F4EEDF', '#DCE6D2', '#F0C9C9'],
  ['#F5B8A6', '#F7DCC2', '#D9695F', '#A7354B'],
];
const LEAF = ['#5F7D55', '#7A9668', '#4C6A47'];

const BODY = {
  chin: 0.126, neck: 0.15, shoulder: 0.176, chest: 0.25, elbow: 0.358, waist: 0.388,
  hip: 0.47, crotch: 0.505, wrist: 0.495, fingertip: 0.562, midThigh: 0.622,
  knee: 0.725, midShin: 0.835, ankle: 0.945, feet: 1,
};
/* Where a frame edge can land cleanly, by crop name. */
const CUT = { tight: 0.278, waist: 0.432, threeq: 0.622, shin: 0.835 };

/* Arm poses: elbow, wrist and fingertip for side s (-1 = viewer's left). */
const ARM_POSE = {
  down:    (s, w) => ({ el: [s * (w + 0.026), 0.358], wr: [s * (w + 0.031), 0.495], tip: [s * (w + 0.033), 0.562] }),
  akimbo:  (s, w) => ({ el: [s * (w + 0.11), 0.338], wr: [s * (w + 0.02), 0.442], tip: [s * (w - 0.004), 0.47] }),
  pocket:  (s, w) => ({ el: [s * (w + 0.05), 0.362], wr: [s * (w + 0.012), 0.468], tip: null }),
  bouquet: (s, w) => ({ el: [s * (w + 0.03), 0.345], wr: [s * 0.036, 0.428], tip: [s * 0.012, 0.442] }),
  hold:    (s, w) => ({ el: [s * (w + 0.04), 0.365], wr: [s * (w + 0.086), 0.492], tip: [s * (w + 0.113), 0.538] }),
};

function bouquetSVG(x, y, r, pal, R) {
  let s = '';
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R.range(-0.2, 0.2);
    const lx = x + Math.cos(a) * r * 0.82, ly = y + Math.sin(a) * r * 0.82;
    s += `<ellipse cx="${r1(lx)}" cy="${r1(ly)}" rx="${r1(r * 0.42)}" ry="${r1(r * 0.2)}" transform="rotate(${r1(a * 180 / Math.PI)} ${r1(lx)} ${r1(ly)})" fill="${R.pick(LEAF)}"/>`;
  }
  s += `<path d="M${r1(x - r * 0.12)} ${r1(y + r * 0.5)} L${r1(x - r * 0.2)} ${r1(y + r * 1.75)} M${r1(x + r * 0.1)} ${r1(y + r * 0.5)} L${r1(x + r * 0.16)} ${r1(y + r * 1.7)}" stroke="${LEAF[2]}" stroke-width="${r1(r * 0.16)}" stroke-linecap="round" fill="none"/>`;
  const blooms = [[0, 0, 0.44], [-0.5, -0.22, 0.36], [0.48, -0.25, 0.36], [-0.34, 0.42, 0.34], [0.36, 0.4, 0.35], [0.02, -0.58, 0.3], [-0.72, 0.18, 0.24], [0.74, 0.14, 0.24]];
  blooms.forEach((b, i) => {
    const c = pal[(i + R.int(0, 2)) % pal.length];
    const bx = x + b[0] * r, by = y + b[1] * r, br = b[2] * r;
    s += `<circle cx="${r1(bx)}" cy="${r1(by)}" r="${r1(br)}" fill="${c}"/>`;
    s += `<circle cx="${r1(bx)}" cy="${r1(by)}" r="${r1(br * 0.42)}" fill="${shade(c, -0.14)}" opacity=".65"/>`;
  });
  return s;
}

function figure(o) {
  const h = o.h, cx = o.cx, ty = o.footY - h;
  const X = x => r1(cx + x * h), Y = y => r1(ty + y * h), U = v => r1(v * h);
  const P = (x, y) => X(x) + ' ' + Y(y);
  const pts = arr => arr.map(p => X(p[0]) + ',' + Y(p[1])).join(' ');
  const st = o.style;
  const skin = o.skin, skinD = shade(skin, -0.13), ink = shade(skin, -0.55);
  const col = o.color, colD = shade(col, -0.18), colL = shade(col, 0.1);
  const hair = o.hair, hs = o.hairStyle || 'short';
  const shx = st === 'suit' ? 0.094 : 0.084;
  const armW = st === 'suit' ? 0.048 : 0.036;
  const sleeve = st === 'suit' ? shade(col, -0.08) : skin;
  let back = '', body = '';
  const parts = [], bands = [];
  const part = (k, xa, ya, xb, yb, pad = 0) => parts.push({
    k, x0: cx + (Math.min(xa, xb) - pad) * h, x1: cx + (Math.max(xa, xb) + pad) * h,
    y0: ty + (Math.min(ya, yb) - pad) * h, y1: ty + (Math.max(ya, yb) + pad) * h,
  });
  const band = (ua, ub, kind, label) => bands.push({ y0: ty + ua * h, y1: ty + ub * h, kind, label });

  /* contact shadow */
  back += `<ellipse cx="${X(0)}" cy="${Y(1.004)}" rx="${U(st === 'gown' ? 0.25 : 0.17)}" ry="${U(0.021)}" fill="#000" opacity=".17"/>`;

  /* hair and veil that fall behind the body */
  if (o.veil) {
    back += `<path d="M${P(-0.03, 0.012)} C${P(-0.12, 0.1)} ${P(-0.16, 0.36)} ${P(-0.185, 0.6)} Q${P(0, 0.63)} ${P(0.185, 0.6)} C${P(0.16, 0.36)} ${P(0.12, 0.1)} ${P(0.03, 0.012)} Z" fill="#fff" opacity=".5"/>`;
  }
  if (hs === 'long') {
    back += `<path d="M${P(-0.05, 0.05)} C${P(-0.068, 0.14)} ${P(-0.07, 0.2)} ${P(-0.062, 0.262)} Q${P(0, 0.285)} ${P(0.062, 0.262)} C${P(0.07, 0.2)} ${P(0.068, 0.14)} ${P(0.05, 0.05)} Z" fill="${hair}"/>`;
  }

  /* ---------- lower body ---------- */
  if (st === 'suit') {
    const tr = o.trouser || col, trD = shade(tr, -0.2);
    for (const s of [-1, 1]) {
      body += `<polygon points="${pts([[s * 0.094, 0.46], [s * 0.088, 0.725], [s * 0.083, 0.948], [s * 0.03, 0.948], [s * 0.021, 0.725], [s * 0.003, 0.508], [s * 0.003, 0.46]])}" fill="${tr}"/>`;
      body += `<path d="M${P(s * 0.03, 0.722)} Q${P(s * 0.055, 0.737)} ${P(s * 0.08, 0.722)}" stroke="${trD}" stroke-width="${U(0.006)}" fill="none" stroke-linecap="round" opacity=".75"/>`;
      body += `<path d="M${P(s * 0.028, 0.944)} L${P(s * 0.085, 0.944)} Q${P(s * 0.112, 0.972)} ${P(s * 0.104, 0.999)} L${P(s * 0.03, 0.999)} Z" fill="${o.shoe || '#19191c'}"/>`;
    }
    part('legs', -0.094, 0.5, 0.094, 0.948);
    part('feet', -0.112, 0.948, 0.112, 1);
    band(0.49, 0.526, 'joint', 'the hip line');
    band(0.69, 0.76, 'joint', 'the knees');
    band(0.915, 0.972, 'joint', 'the ankles');
    band(0.972, 1, 'clip', 'the feet');
    band(1, 1.016, 'tangent', 'feet on the frame edge');
  } else if (st === 'dress') {
    for (const s of [-1, 1]) {
      body += `<polygon points="${pts([[s * 0.088, 0.64], [s * 0.086, 0.725], [s * 0.084, 0.8], [s * 0.07, 0.948], [s * 0.04, 0.948], [s * 0.03, 0.8], [s * 0.024, 0.725], [s * 0.012, 0.64]])}" fill="${skin}"/>`;
      body += `<path d="M${P(s * 0.034, 0.722)} Q${P(s * 0.055, 0.736)} ${P(s * 0.078, 0.722)}" stroke="${skinD}" stroke-width="${U(0.006)}" fill="none" stroke-linecap="round"/>`;
      body += `<path d="M${P(s * 0.036, 0.944)} L${P(s * 0.074, 0.944)} Q${P(s * 0.098, 0.974)} ${P(s * 0.09, 0.999)} L${P(s * 0.036, 0.999)} Z" fill="${o.shoe || '#B98E62'}"/>`;
    }
    part('legs', -0.088, 0.67, 0.088, 0.948);
    part('feet', -0.098, 0.948, 0.098, 1);
    band(0.69, 0.76, 'joint', 'the knees');
    band(0.915, 0.972, 'joint', 'the ankles');
    band(0.972, 1, 'clip', 'the feet');
    band(1, 1.016, 'tangent', 'feet on the frame edge');
  }

  /* ---------- torso ---------- */
  if (st === 'suit') {
    body += `<path d="M${P(-0.03, 0.148)} Q${P(-0.086, 0.155)} ${P(-0.114, 0.188)} L${P(-0.1, 0.3)} L${P(-0.084, 0.39)} L${P(-0.096, 0.528)} L${P(0.096, 0.528)} L${P(0.084, 0.39)} L${P(0.1, 0.3)} L${P(0.114, 0.188)} Q${P(0.086, 0.155)} ${P(0.03, 0.148)} Z" fill="${col}"/>`;
    body += `<polygon points="${pts([[-0.027, 0.147], [0.027, 0.147], [0, 0.29]])}" fill="#F6F3EC"/>`;
    body += `<polygon points="${pts([[-0.031, 0.146], [0, 0.29], [-0.052, 0.238]])}" fill="${colD}"/>`;
    body += `<polygon points="${pts([[0.031, 0.146], [0, 0.29], [0.052, 0.238]])}" fill="${colD}"/>`;
    if (o.bowtie) {
      body += `<polygon points="${pts([[-0.022, 0.153], [0, 0.163], [-0.022, 0.175]])}" fill="${o.tie}"/><polygon points="${pts([[0.022, 0.153], [0, 0.163], [0.022, 0.175]])}" fill="${o.tie}"/>`;
    } else {
      body += `<polygon points="${pts([[0, 0.156], [0.012, 0.176], [0.007, 0.268], [0, 0.286], [-0.007, 0.268], [-0.012, 0.176]])}" fill="${o.tie}"/>`;
    }
    body += `<path d="M${P(0, 0.29)} L${P(0.004, 0.528)}" stroke="${colD}" stroke-width="${U(0.005)}" fill="none"/>`;
    body += `<circle cx="${X(0.004)}" cy="${Y(0.335)}" r="${U(0.006)}" fill="${colD}"/>`;
    if (o.flower) body += `<circle cx="${X(-0.058)}" cy="${Y(0.232)}" r="${U(0.013)}" fill="${o.flower}"/><ellipse cx="${X(-0.066)}" cy="${Y(0.246)}" rx="${U(0.012)}" ry="${U(0.006)}" fill="${LEAF[0]}"/>`;
    part('torso', -0.114, 0.15, 0.114, 0.528);
  } else {
    /* shoulders and neckline */
    body += `<path d="M${P(-0.024, 0.146)} L${P(-0.086, 0.176)} Q${P(-0.097, 0.19)} ${P(-0.09, 0.236)} L${P(0.09, 0.236)} Q${P(0.097, 0.19)} ${P(0.086, 0.176)} L${P(0.024, 0.146)} Z" fill="${skin}"/>`;
    if (st === 'gown') {
      const hw = o.skirt || 0.205;
      body += `<path d="M${P(-0.062, 0.384)} C${P(-0.1, 0.5)} ${P(-hw * 0.84, 0.8)} ${P(-hw, 0.986)} Q${P(0, 1.006)} ${P(hw, 0.986)} C${P(hw * 0.84, 0.8)} ${P(0.1, 0.5)} ${P(0.062, 0.384)} Z" fill="${col}"/>`;
      body += `<path d="M${P(0.062, 0.384)} C${P(0.1, 0.5)} ${P(hw * 0.84, 0.8)} ${P(hw, 0.986)} Q${P(hw * 0.7, 0.998)} ${P(hw * 0.5, 0.999)} C${P(hw * 0.52, 0.78)} ${P(0.075, 0.5)} ${P(0.03, 0.39)} Z" fill="${colD}" opacity=".45"/>`;
      for (const f of [-0.55, -0.18, 0.22]) {
        body += `<path d="M${P(f * 0.06, 0.4)} Q${P(f * hw * 0.55, 0.7)} ${P(f * hw * 0.9, 0.99)}" stroke="${colD}" stroke-width="${U(0.005)}" fill="none" opacity=".55"/>`;
      }
      body += `<path d="M${P(-0.09, 0.228)} Q${P(-0.045, 0.206)} ${P(0, 0.23)} Q${P(0.045, 0.206)} ${P(0.09, 0.228)} L${P(0.063, 0.392)} L${P(-0.063, 0.392)} Z" fill="${col}"/>`;
      body += `<path d="M${P(-0.063, 0.386)} L${P(0.063, 0.386)}" stroke="${o.sash || colD}" stroke-width="${U(0.012)}" fill="none"/>`;
      part('torso', -0.092, 0.15, 0.092, 0.39);
      part('skirt', -hw, 0.39, hw, 1);
      band(0.945, 1, 'clip', 'the hem of the gown');
      band(1, 1.016, 'tangent', 'the hem on the frame edge');
    } else {
      body += `<path d="M${P(-0.064, 0.384)} C${P(-0.092, 0.46)} ${P(-0.122, 0.58)} ${P(-0.128, 0.668)} Q${P(0, 0.684)} ${P(0.128, 0.668)} C${P(0.122, 0.58)} ${P(0.092, 0.46)} ${P(0.064, 0.384)} Z" fill="${col}"/>`;
      body += `<path d="M${P(0.064, 0.384)} C${P(0.092, 0.46)} ${P(0.122, 0.58)} ${P(0.128, 0.668)} Q${P(0.09, 0.676)} ${P(0.06, 0.678)} C${P(0.07, 0.56)} ${P(0.06, 0.46)} ${P(0.03, 0.39)} Z" fill="${colD}" opacity=".4"/>`;
      body += `<path d="M${P(-0.07, 0.166)} L${P(-0.09, 0.2)} L${P(-0.081, 0.3)} L${P(-0.064, 0.388)} L${P(0.064, 0.388)} L${P(0.081, 0.3)} L${P(0.09, 0.2)} L${P(0.07, 0.166)} Q${P(0, 0.236)} ${P(-0.07, 0.166)} Z" fill="${col}"/>`;
      body += `<path d="M${P(-0.064, 0.384)} L${P(0.064, 0.384)}" stroke="${colD}" stroke-width="${U(0.01)}" fill="none" opacity=".7"/>`;
      part('torso', -0.092, 0.15, 0.092, 0.39);
      part('skirt', -0.128, 0.39, 0.128, 0.68);
    }
  }

  /* ---------- arms ---------- */
  let bq = null;
  for (const s of [-1, 1]) {
    const pose = (s < 0 ? o.armL : o.armR) || 'down';
    if (pose === 'hidden') continue;
    const a = ARM_POSE[pose](s, shx);
    const sh = [s * shx, 0.192];
    body += `<path d="M${P(sh[0], sh[1])} L${P(a.el[0], a.el[1])} L${P(a.wr[0], a.wr[1])}" stroke="${sleeve}" stroke-width="${U(armW)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (a.tip) {
      if (st === 'suit') {
        const dx = a.tip[0] - a.wr[0], dy = a.tip[1] - a.wr[1], L = Math.hypot(dx, dy) || 1;
        body += `<path d="M${P(a.wr[0] - dx / L * 0.004, a.wr[1] - dy / L * 0.004)} L${P(a.wr[0] + dx / L * 0.012, a.wr[1] + dy / L * 0.012)}" stroke="#F6F3EC" stroke-width="${U(armW * 0.92)}" fill="none"/>`;
      }
      body += `<path d="M${P(a.wr[0] + (a.tip[0] - a.wr[0]) * 0.28, a.wr[1] + (a.tip[1] - a.wr[1]) * 0.28)} L${P(a.tip[0], a.tip[1] - 0.012)}" stroke="${skin}" stroke-width="${U(0.033)}" fill="none" stroke-linecap="round"/>`;
      part('hand', a.wr[0], a.wr[1] + 0.012, a.tip[0], a.tip[1], 0.017);
      band(a.wr[1] + 0.014, a.tip[1] + 0.008, 'clip', 'the hands');
    }
    part('upperArm', sh[0], sh[1], a.el[0], a.el[1], armW / 2);
    part('forearm', a.el[0], a.el[1], a.wr[0], a.wr[1], armW / 2);
    part('elbow', a.el[0], a.el[1], a.el[0], a.el[1], 0.03);
    part('wrist', a.wr[0], a.wr[1], a.wr[0], a.wr[1], 0.022);
    band(a.el[1] - 0.024, a.el[1] + 0.024, 'joint', 'the elbows');
    if (pose !== 'pocket') band(a.wr[1] - 0.02, a.wr[1] + 0.014, 'joint', 'the wrists');
    if (pose === 'bouquet') bq = { x: 0, y: 0.44, r: 0.064 };
  }
  if (bq) {
    body += bouquetSVG(cx + bq.x * h, ty + bq.y * h, bq.r * h, o.flowers || FLOWERS[0], o.R);
    part('bouquet', bq.x - bq.r, bq.y - bq.r, bq.x + bq.r, bq.y + bq.r * 1.7);
    band(bq.y - bq.r, bq.y + bq.r * 1.7, 'clip', 'the bouquet');
  }

  /* ---------- neck and head ---------- */
  body += `<polygon points="${pts([[-0.02, 0.11], [0.02, 0.11], [0.025, 0.156], [-0.025, 0.156]])}" fill="${skinD}"/>`;
  let topU = 0;
  const capRx = hs === 'bob' ? 0.056 : hs === 'crop' ? 0.0455 : 0.049;
  const capRy = hs === 'bob' ? 0.071 : hs === 'crop' ? 0.059 : 0.062;
  const capCy = hs === 'bob' ? 0.071 : hs === 'crop' ? 0.063 : 0.062;
  if (hs === 'bun') { body += `<circle cx="${X(0)}" cy="${Y(0.002)}" r="${U(0.027)}" fill="${hair}"/>`; topU = -0.025; }
  body += `<ellipse cx="${X(0)}" cy="${Y(capCy)}" rx="${U(capRx)}" ry="${U(capRy)}" fill="${hair}"/>`;
  body += `<ellipse cx="${X(0)}" cy="${Y(0.076)}" rx="${U(0.04)}" ry="${U(0.05)}" fill="${skin}"/>`;
  /* hairline */
  const yl = hs === 'crop' ? 0.036 : 0.045;
  const ax = capRx * Math.sqrt(Math.max(0, 1 - Math.pow((yl - capCy) / capRy, 2)));
  const partX = (o.part || 0) * 0.02;
  body += `<path d="M${P(-ax, yl)} A${U(capRx)} ${U(capRy)} 0 0 1 ${P(ax, yl)} Q${P(partX, yl - (hs === 'crop' ? 0.006 : -0.004))} ${P(-ax, yl)} Z" fill="${hair}"/>`;
  if (o.face !== false) {
    const e = U(0.0065);
    body += `<path d="M${P(-0.0225, 0.079)} q${e} ${-e * 0.9} ${e * 2} 0 M${P(0.0095, 0.079)} q${e} ${-e * 0.9} ${e * 2} 0" stroke="${ink}" stroke-width="${U(0.0042)}" fill="none" stroke-linecap="round"/>`;
    body += `<path d="M${P(-0.0085, 0.101)} q${U(0.0085)} ${U(0.007)} ${U(0.017)} 0" stroke="${ink}" stroke-width="${U(0.0042)}" fill="none" stroke-linecap="round"/>`;
  }
  part('head', -capRx, topU, capRx, 0.128);
  part('neck', -0.025, 0.11, 0.025, 0.156);
  band(0.03, 0.108, 'face', 'the face');
  band(0.108, 0.164, 'joint', 'the neck');

  let x0 = Infinity, x1 = -Infinity;
  for (const p of parts) { x0 = Math.min(x0, p.x0); x1 = Math.max(x1, p.x1); }
  const top = ty + topU * h;
  return {
    svg: back + body, cx, footY: o.footY, h, ty, top, style: st, parts, bands,
    y: u => ty + u * h,
    box: rect(x0, top, x1 - x0, o.footY - top),
    head: rect(cx - capRx * h, top, capRx * 2 * h, ty + 0.128 * h - top),
    hasBouquet: !!bq, poseL: o.armL || 'down', poseR: o.armR || 'down',
  };
}

/* ---- casting ---- */
function castPerson(R, style) {
  const p = {
    style, R,
    skin: R.pick(SKIN), hair: R.pick(HAIR), part: R.pick([-1, 0, 1]),
    flowers: R.pick(FLOWERS),
  };
  if (style === 'suit') {
    p.color = R.pick(SUITS);
    p.hairStyle = R.weighted([['short', 6], ['crop', 3], ['bun', 0.6], ['bob', 0.6]]);
    p.tie = R.pick(['#1E2230', '#6B2B36', '#3E5A4B', '#C9A24D', '#2A2A2E', '#8793A6']);
    p.bowtie = R.chance(0.3);
    p.flower = R.chance(0.7) ? R.pick(['#F6D5CF', '#FFFFFF', '#E9967A', '#F3E3B5']) : null;
    p.shoe = R.pick(['#19191c', '#3A2A20', '#1d1d20']);
  } else if (style === 'gown') {
    p.color = R.pick(GOWNS);
    p.hairStyle = R.weighted([['bun', 5], ['long', 4], ['bob', 2], ['short', 1]]);
    p.veil = R.chance(0.4);
    p.skirt = R.range(0.17, 0.235);
    p.sash = R.chance(0.3) ? R.pick(['#D9C7A3', '#E7B9B1', '#C9D3C4']) : null;
  } else {
    p.color = R.pick(DRESSES);
    p.hairStyle = R.weighted([['long', 5], ['bun', 3], ['bob', 3], ['short', 1]]);
    p.shoe = R.pick(['#B98E62', '#2A2A2E', '#E9D9C3', '#8C3E22']);
  }
  return p;
}

/* A single subject. poseSet limits where the hands end up:
   'waist'   – hands kept clear of a waist-level cut
   'akimbo'  – one elbow pushed out (for side-edge tests)
   'bouquet' – both hands at the waist with flowers            */
function makeSingle(o) {
  const R = o.R;
  const style = o.style || R.weighted([['suit', 4], ['gown', 4], ['dress', 3]]);
  const p = castPerson(R, style);
  let armL = 'down', armR = 'down';
  const set = o.poseSet || 'any';
  if (set === 'akimbo') { if (R.chance(0.5)) armL = 'akimbo'; else armR = 'akimbo'; if (R.chance(0.35)) armL = armR = 'akimbo'; }
  else if (set === 'bouquet' && style !== 'suit') { armL = armR = 'bouquet'; }
  else if (set === 'waist') { if (style === 'suit' && R.chance(0.5)) { if (R.chance(0.5)) armL = 'pocket'; else armR = 'pocket'; } }
  else if (set === 'any') {
    const k = R();
    if (style === 'suit') { if (k < 0.35) armL = 'pocket'; else if (k < 0.5) armR = 'pocket'; }
    else if (k < 0.45) armL = armR = 'bouquet';
  }
  const f = figure(Object.assign(p, { cx: o.cx, footY: o.footY, h: o.h, armL, armR }));
  return { svg: f.svg, people: [f] };
}

/* A couple. arrangement 'hold' = side by side holding hands,
   'close' = shoulder to shoulder.                                */
function makeCouple(o) {
  const R = o.R, h = o.h;
  const set = o.poseSet || 'any';
  const pair = o.styles || R.weighted([[['suit', 'gown'], 55], [['suit', 'dress'], 20], [['suit', 'suit'], 10], [['gown', 'gown'], 8], [['dress', 'dress'], 7]]);
  const order = R.chance(0.5) ? [pair[0], pair[1]] : [pair[1], pair[0]];
  const A = castPerson(R, order[0]), B = castPerson(R, order[1]);
  if (A.style === 'suit' && B.style === 'suit') { let g = 0; while (B.color === A.color && g++ < 8) B.color = R.pick(SUITS); }
  const short = R.range(0.9, 0.975);
  const tallIsA = A.style === 'suit' ? R.chance(B.style === 'suit' ? 0.5 : 0.8) : R.chance(B.style === 'suit' ? 0.2 : 0.5);
  const hA = tallIsA ? h : h * short, hB = tallIsA ? h * short : h;
  let arr = o.arrangement || (set === 'akimbo' ? 'close' : R.weighted([['hold', 5], ['close', 5]]));
  let aL = 'down', aR = 'down', bL = 'down', bR = 'down';
  const shA = A.style === 'suit' ? 0.094 : 0.084, shB = B.style === 'suit' ? 0.094 : 0.084;
  let gap;
  if (arr === 'hold') {
    aR = 'hold'; bL = 'hold';
    gap = (shA + 0.113) * hA + (shB + 0.113) * hB - 0.026 * h;
  } else {
    aR = 'hidden'; bL = 'hidden';
    gap = (shA + shB) * 0.5 * (hA + hB) * 0.98;
  }
  const outer = (p, side) => {
    if (set === 'akimbo') return 'akimbo';
    if (set === 'waist') return p.style === 'suit' && R.chance(0.45) ? 'pocket' : 'down';
    if (p.style === 'suit') return R.chance(0.4) ? 'pocket' : 'down';
    return 'down';
  };
  aL = outer(A, -1); bR = outer(B, 1);
  if (set === 'akimbo') { if (R.chance(0.5)) aL = 'down'; else bR = 'down'; }
  /* a bouquet needs both hands, so it only fits the shoulder-to-shoulder pose */
  if ((set === 'any' || set === 'bouquet') && arr === 'close') {
    if (B.style !== 'suit' && (set === 'bouquet' || R.chance(0.55))) { bL = bR = 'bouquet'; }
    else if (A.style !== 'suit' && set === 'bouquet') { aL = aR = 'bouquet'; }
  }
  const fA = figure(Object.assign(A, { cx: o.cx - gap / 2, footY: o.footY, h: hA, armL: aL, armR: aR }));
  const fB = figure(Object.assign(B, { cx: o.cx + gap / 2, footY: o.footY, h: hB, armL: bL, armR: bR }));
  return { svg: fA.svg + fB.svg, people: [fA, fB], arrangement: arr };
}

/* A line-up: the couple in the middle, attendants on both sides. */
function makeGroup(o) {
  const R = o.R, h = o.h, n = o.n;
  const maidCol = R.pick(DRESSES), manCol = R.pick(SUITS);
  const mid = (n - 1) / 2;
  const step = o.step || 0.215 * h;
  let svg = '';
  const people = [];
  const order = [];
  for (let i = 0; i < n; i++) order.push(i);
  /* draw outside-in so the couple overlaps the attendants */
  order.sort((a, b) => Math.abs(b - mid) - Math.abs(a - mid));
  const slots = [];
  for (const i of order) {
    const centre = Math.abs(i - mid) <= 0.5 + (n % 2 ? 0.5 : 0);
    const isCouple = n % 2 ? (i === mid || i === mid + 1) : (i === mid - 0.5 || i === mid + 0.5);
    let style;
    if (isCouple) style = i <= mid ? 'suit' : 'gown';
    else style = i < mid ? 'suit' : 'dress';
    if (o.mixed && !isCouple) style = R.chance(0.5) ? 'suit' : 'dress';
    const p = castPerson(R, style);
    if (!isCouple) p.color = style === 'suit' ? manCol : maidCol;
    if (!isCouple && style === 'suit') p.flower = null;
    const ph = h * (isCouple ? R.range(0.95, 1) : R.range(0.9, 0.99));
    let armL = 'down', armR = 'down';
    if (style !== 'suit' && R.chance(isCouple ? 0.9 : 0.6)) armL = armR = 'bouquet';
    const f = figure(Object.assign(p, { cx: o.cx + (i - mid) * step, footY: o.footY, h: ph, armL, armR }));
    slots.push({ i, f });
    void centre;
  }
  for (const s of slots) svg += s.f.svg;
  slots.sort((a, b) => a.i - b.i);
  for (const s of slots) people.push(s.f);
  return { svg, people };
}

function groupOf(people) {
  let box = people[0].box, top = Infinity, tall = people[0];
  for (const p of people) { box = rUnion(box, p.box); top = Math.min(top, p.top); if (p.h > tall.h) tall = p; }
  return { box, top, feet: people[0].footY, cx: box.x + box.w / 2, tall, h: tall.h };
}
