/* ============================================================
   SCENES — a venue plus its people, and the renderer that turns
   any crop of that scene into an SVG frame.
   ============================================================ */
let UID = 0;

function buildScene(spec) {
  const s = Object.assign({ sx: 1500, gy: 1500, h: 600, time: 'golden', env: 'meadow', opts: {} }, spec);
  if (s.camH == null) { const rg = ENV_CAM[s.env]; s.camH = lerp(rg[0], rg[1], RNG((s.seed ^ 0x51ed) >>> 0)()); }
  const c = makeCtx(s);
  const env = ENVS[s.env](c, s.opts);
  /* the cast uses its own random stream, so changing a venue option never recasts the couple */
  const SR = RNG((s.seed ^ 0xA53C9) >>> 0);
  const sub = Object.assign({ kind: 'couple' }, s.subject);
  const base = Object.assign({}, sub, { R: SR, cx: s.sx, footY: s.gy, h: s.h });
  const made = sub.kind === 'single' ? makeSingle(base) : sub.kind === 'group' ? makeGroup(base) : makeCouple(base);
  const scene = {
    W: WORLD.W, H: WORLD.H, spec: s, hy: c.hy, seed: s.seed, time: s.time,
    defs: env.defs, back: env.back, mid: env.mid, subject: made.svg, front: env.front || '', fg: null,
    people: made.people, group: groupOf(made.people), feats: env.feats, arrangement: made.arrangement,
  };
  if (s.fg) {
    scene.fg = fgLayer(RNG((s.seed ^ 0x77F1) >>> 0), s.fg.frame, s.fg.kind, s.fg.side, c.T);
    scene.feats.fg = scene.fg.boxes;
  }
  return scene;
}

/* Background blur grows as the frame gets tighter, like a long lens up close. */
function dofSigma(scene, crop) {
  if (!scene.group) return 0;
  const ratio = crop.h / scene.group.h;
  return scene.group.h * clamp((1.02 - ratio) * 0.024, 0, 0.017);
}

/* Inner markup of a frame. opts: { tilt (deg), dof (false = sharp), region (rect the blur must cover) } */
function sceneMarkup(scene, crop, opts) {
  const o = opts || {};
  const pre = 'f' + (++UID) + '-';
  let defs = scene.defs || '';
  let bg = (scene.back || '') + (scene.mid || '');
  const sig = o.dof === false ? 0 : dofSigma(scene, crop);
  const reg = o.region || crop;
  if (sig > 0.7) {
    const m = sig * 3 + 80;
    defs += `<filter id="§dof" filterUnits="userSpaceOnUse" x="${r1(reg.x - m)}" y="${r1(reg.y - m)}" width="${r1(reg.w + 2 * m)}" height="${r1(reg.h + 2 * m)}"><feGaussianBlur stdDeviation="${r1(sig)}"/></filter>`;
    bg = `<g filter="url(#§dof)">${bg}</g>`;
  }
  let fg = '';
  if (scene.fg) {
    const f = scene.fg, m = f.sigma * 3 + 40;
    defs += `<filter id="§fg" filterUnits="userSpaceOnUse" x="${r1(reg.x - m - 300)}" y="${r1(reg.y - m - 300)}" width="${r1(reg.w + 2 * m + 600)}" height="${r1(reg.h + 2 * m + 600)}"><feGaussianBlur stdDeviation="${r1(f.sigma)}"/></filter>`;
    fg = `<g filter="url(#§fg)" opacity="${f.opacity}">${f.svg}</g>`;
  }
  let inner = bg + (scene.subject || '') + (scene.front || '') + fg;
  if (o.tilt) inner = `<g transform="rotate(${o.tilt} ${r1(crop.x + crop.w / 2)} ${r1(crop.y + crop.h / 2)})">${inner}</g>`;
  return (`<defs>${defs}</defs>` + inner).split('§').join(pre);
}

function frameSVG(scene, crop, opts) {
  const o = opts || {};
  return `<svg class="shot${o.cls ? ' ' + o.cls : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="${r1(crop.x)} ${r1(crop.y)} ${r1(crop.w)} ${r1(crop.h)}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${sceneMarkup(scene, crop, o)}<g class="ov">${o.overlay || ''}</g></svg>`;
}
