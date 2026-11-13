/* ============================================================
   QUESTIONS — one generator per kind of frame the game asks about.
   Every generator proves its own answer with inspectCrop before it
   hands a frame to the player.
   ============================================================ */
const rSeed = R => R.int(1, 2147483000);

function plainScene(R, o) {
  o = o || {};
  const env = o.env || R.weighted([['meadow', 4], ['garden', 3], ['estate', 2.4], ['lake', 3.2], ['doorway', 1]]);
  const time = o.time || (env === 'doorway' ? R.pick(['day', 'golden', 'blush', 'overcast']) : R.pick(TIME_KEYS));
  let opts = {};
  if (env === 'meadow') opts = { path: R.chance(0.3), fence: R.chance(0.3) ? R.sign() : 0 };
  else if (env === 'garden') { const aisle = R.chance(0.35); opts = { arch: R.chance(0.4), aisle, chairs: aisle && R.chance(0.75) }; }
  else if (env === 'estate') opts = { door: R.chance(0.6) };
  else if (env === 'lake') opts = { dock: R.chance(0.4) };
  else opts = { decor: R.chance(0.4) ? 'sym' : 'asym' };
  if (o.opts) Object.assign(opts, o.opts);
  return buildScene({
    seed: rSeed(R), env, time, opts, subject: o.subject,
    sx: o.sx != null ? o.sx : R.range(1200, 1800), gy: o.gy != null ? o.gy : R.range(1450, 1550), h: o.h || R.range(560, 640),
  });
}

/* A scene composed for one fixed frame: the subject is placed by
   frame fractions (fx, fy = where the feet are, frac = height). */
function composed(R, o) {
  const F = o.portrait ? rect(833, 0, 1334, 2000) : rect(0, 0, 3000, 2000);
  const spec = {
    seed: rSeed(R), env: o.env, opts: o.opts || {}, subject: o.subject || { kind: 'couple' },
    time: o.time || R.pick(o.env === 'doorway' ? ['day', 'golden', 'blush', 'overcast'] : TIME_KEYS),
    sx: F.x + o.fx * F.w, gy: F.y + o.fy * F.h, h: o.frac * F.h,
  };
  if (o.fg) spec.fg = { kind: o.fg.kind, side: o.fg.side, frame: F };
  return { scene: buildScene(spec), crop: F };
}
const third = side => (side < 0 ? 1 / 3 : 2 / 3);
const sideName = s => (s < 0 ? 'left' : 'right');

/* ---------------- 1 · CALL THE CROP ---------------- */
const WHY_CROP = {
  full: 'Head to toe, with room above the head and under the feet.',
  threeq: 'The frame ends mid-thigh, clear of the knees.',
  waist: 'The frame ends just below the waist, between the elbows and the wrists.',
  tight: 'Head and shoulders. The frame ends mid-chest.',
};
function genCrop(R, force) {
  const type = force || R.pick(['wide', 'full', 'threeq', 'waist', 'tight', 'detail']);
  const done = (scene, crop, why) => ({ kind: 'pick', set: 'crop', scene, crop, answer: type, why, tag: 'crop:' + type, prompt: 'Which crop is this?' });
  if (type === 'detail') {
    const sc = detailScene(R.pick(DETAIL_KEYS), rSeed(R));
    let crop = rect(0, 0, 1500, 1000);
    if (R.chance(0.35)) { const f = sc.focus, cxx = clamp(f.x + f.w / 2, 334, 1166); crop = rect(cxx - 333.5, 0, 667, 1000); }
    return done(sc, crop, `No face in the frame. This one is about ${sc.label}.`);
  }
  const r = tryMany(80, () => {
    const couple = R.chance(0.6);
    if (type === 'wide') {
      const h = R.range(390, 470), aspect = R.chance(0.3) ? 2 / 3 : 1.5;
      const frac = R.range(Math.max(0.21, h / 1950), 0.36);
      const ch = h / frac, cw = ch * aspect;
      const gy = R.range(1400, 1520), sx = R.range(900, 2100);
      const fy = R.range(0.66, 0.8), fx = R.pick([1 / 3, 0.5, 2 / 3]) + R.range(-0.03, 0.03);
      const crop = rect(clamp(sx - fx * cw, -40, 3040 - cw), clamp(gy - fy * ch, -40, 2040 - ch), cw, ch);
      const sc = plainScene(R, { h, gy, sx, subject: { kind: couple ? 'couple' : 'single' } });
      const g = sc.group;
      if (!rContains(crop, g.box, 0.04 * cw) || g.h / ch > 0.385) return null;
      return done(sc, crop, `The ${nounOf(sc)} is only ${Math.round(g.h / ch * 100)}% of the frame height. The place is the subject.`);
    }
    const poseSet = type === 'waist' ? 'waist' : R.weighted([['any', 5], ['bouquet', 1.4]]);
    const sc = plainScene(R, { subject: { kind: couple ? 'couple' : 'single', poseSet } });
    const portraitFirst = couple ? (type === 'full' && R.chance(0.65)) : (type === 'waist' ? R.chance(0.3) : R.chance(0.7));
    for (const aspect of portraitFirst ? [2 / 3, 1.5] : [1.5]) {
      const crop = makeCrop(sc, type, aspect, R, { jitter: 0.025 });
      if (!crop || !inBounds(crop) || !lateralOK(sc, crop, type)) continue;
      if (faultsOf(inspectCrop(sc, crop)).length) continue;
      if (classifyCrop(sc, crop) !== type) continue;
      return done(sc, crop, WHY_CROP[type]);
    }
    return null;
  });
  if (!r) throw new Error('genCrop ' + type);
  return r;
}

/* ---------------- 2 · NAME THE DEVICE / 3 · STACKED ---------------- */
const RECIPES = [
  { flags: ['thirds'], make(R) {
    const side = R.sign(), portrait = R.chance(0.22), env = R.pick(['meadow', 'meadow', 'lake']);
    const c = composed(R, { env, portrait, fx: third(side), fy: R.range(0.8, 0.86), frac: portrait ? R.range(0.36, 0.44) : R.range(0.42, 0.58),
      opts: { treeSide: -side, trees: R.int(1, 2) }, subject: { kind: portrait ? 'single' : R.pick(['couple', 'couple', 'single']) } });
    c.why = `The ${nounOf(c.scene)} stands on the ${sideName(side)} third. The rest of the frame is left for the setting.`;
    return c;
  } },
  { flags: ['symmetry'], make(R) {
    const env = R.weighted([['garden', 4], ['meadow', 2], ['lake', 2], ['estate', 2]]);
    const opts = env === 'garden' ? {} : env === 'estate' ? { door: false } : { mirror: true };
    const c = composed(R, { env, fx: 0.5, fy: env === 'estate' ? R.range(0.8, 0.85) : R.range(0.74, 0.8), frac: R.range(0.3, 0.42), opts });
    c.why = 'Left and right mirror each other around a centred couple.';
    return c;
  } },
  { flags: ['lines'], make(R) {
    const env = R.weighted([['meadow', 5], ['lake', 4]]), fs = R.sign();
    const fence = env === 'meadow' && R.chance(0.8);
    const opts = env === 'meadow' ? { path: true, fence: fence ? fs : 0, treeSide: -fs, trees: R.int(1, 2) } : { dock: true };
    const c = composed(R, { env, fx: fs < 0 ? R.range(0.52, 0.57) : R.range(0.43, 0.48), fy: R.range(0.6, 0.68), frac: R.range(0.27, 0.37), opts });
    c.why = env === 'meadow' ? `The path${fence ? ' and fence run' : ' runs'} straight to the couple.` : 'The dock runs straight to the couple.';
    return c;
  } },
  { flags: ['frame'], make(R) {
    const door = R.chance(0.55);
    const c = door
      ? composed(R, { env: 'doorway', fx: R.range(0.44, 0.56), fy: R.range(0.79, 0.84), frac: R.range(0.3, 0.36), opts: { decor: 'asym' } })
      : composed(R, { env: 'meadow', fx: R.range(0.44, 0.56), fy: R.range(0.76, 0.82), frac: R.range(0.3, 0.38), opts: { arbor: 'arbor', trees: R.int(1, 2) } });
    c.why = `The ${door ? 'doorway' : 'arbor'} makes a second frame around the couple.`;
    return c;
  } },
  { flags: ['space'], make(R) {
    const side = R.sign(), env = R.pick(['meadow', 'lake']);
    const c = composed(R, { env, fx: side < 0 ? R.range(0.12, 0.19) : R.range(0.81, 0.88), fy: R.range(0.84, 0.9), frac: R.range(0.12, 0.165),
      opts: { sparse: true, noSun: R.chance(0.6) }, subject: { kind: R.pick(['couple', 'couple', 'single']) } });
    c.why = `The ${nounOf(c.scene)} takes up about ${Math.round(c.scene.group.h / c.crop.h * 100)}% of the frame height. The empty ${env === 'lake' ? 'sky and water do' : 'sky does'} the work.`;
    return c;
  } },
  { flags: ['layers'], make(R) {
    const env = R.pick(['meadow', 'meadow', 'lake']), side = R.sign();
    const kind = R.weighted([['florals', 5], ['leaves', 3], ['guests', 2]]);
    const c = composed(R, { env, fx: 0.5 - side * R.range(0, 0.065), fy: R.range(0.82, 0.88), frac: R.range(0.44, 0.6), opts: { trees: 1, treeSide: -side }, fg: { kind, side } });
    c.why = `${kind === 'guests' ? 'A soft shoulder' : kind === 'leaves' ? 'Soft leaves' : 'Soft flowers'} close to the lens, the couple behind, the ${env === 'lake' ? 'far shore' : 'hills'} beyond. That is three layers.`;
    return c;
  } },
  /* ---- stacked ---- */
  { flags: ['symmetry', 'lines'], make(R) {
    const c = composed(R, { env: 'garden', fx: 0.5, fy: R.range(0.7, 0.75), frac: R.range(0.28, 0.34), opts: { aisle: true, chairs: true } });
    c.why = 'Both halves mirror each other, and the aisle and rows of guests run to the couple.';
    return c;
  } },
  { flags: ['symmetry', 'frame'], make(R) {
    const k = R.pick(['garden', 'estate', 'doorway']);
    const c = k === 'garden' ? composed(R, { env: 'garden', fx: 0.5, fy: R.range(0.76, 0.8), frac: R.range(0.28, 0.34), opts: { arch: true } })
      : k === 'estate' ? composed(R, { env: 'estate', fx: 0.5, fy: R.range(0.8, 0.85), frac: R.range(0.3, 0.38), opts: { door: true } })
        : composed(R, { env: 'doorway', fx: 0.5, fy: R.range(0.79, 0.84), frac: R.range(0.3, 0.36), opts: { decor: 'sym' } });
    c.why = `The ${k === 'garden' ? 'arch' : 'doorway'} frames the couple, and both halves of the picture mirror each other.`;
    return c;
  } },
  { flags: ['symmetry', 'lines', 'frame'], make(R) {
    const c = composed(R, { env: 'garden', fx: 0.5, fy: R.range(0.7, 0.75), frac: R.range(0.28, 0.33), opts: { aisle: true, chairs: true, arch: true } });
    c.why = 'Mirrored halves, an aisle that runs to the couple, and an arch around them.';
    return c;
  } },
  { flags: ['thirds', 'lines'], make(R) {
    const side = R.sign(), env = R.weighted([['meadow', 5], ['lake', 4]]);
    const opts = env === 'meadow' ? { path: true, fence: R.chance(0.7) ? -side : 0, treeSide: -side, trees: 1 } : { dock: true };
    const c = composed(R, { env, fx: third(side), fy: R.range(0.6, 0.68), frac: R.range(0.27, 0.36), opts });
    c.why = `The couple stands on the ${sideName(side)} third, and the ${env === 'meadow' ? 'path' : 'dock'} runs to them.`;
    return c;
  } },
  { flags: ['thirds', 'layers'], make(R) {
    const side = R.sign(), env = R.pick(['meadow', 'lake']);
    const kind = R.weighted([['florals', 5], ['leaves', 3], ['guests', 2]]);
    const c = composed(R, { env, fx: third(side), fy: R.range(0.82, 0.88), frac: R.range(0.44, 0.56), opts: { trees: 1, treeSide: -side }, fg: { kind, side: -side } });
    c.why = `The couple stands on the ${sideName(side)} third, behind a soft foreground on the ${sideName(-side)}.`;
    return c;
  } },
  { flags: ['thirds', 'space'], make(R) {
    const side = R.sign(), env = R.pick(['meadow', 'lake']);
    const c = composed(R, { env, fx: third(side), fy: R.range(0.84, 0.9), frac: R.range(0.12, 0.165), opts: { sparse: true, noSun: true } });
    c.why = `A small couple on the ${sideName(side)} third, and everything else left empty.`;
    return c;
  } },
  { flags: ['lines', 'layers'], make(R) {
    const fs = R.sign(), kind = R.pick(['florals', 'leaves']);
    const c = composed(R, { env: 'meadow', fx: fs < 0 ? R.range(0.52, 0.57) : R.range(0.43, 0.48), fy: R.range(0.6, 0.68), frac: R.range(0.28, 0.37),
      opts: { path: true, fence: fs, treeSide: -fs, trees: 1 }, fg: { kind, side: -fs } });
    c.why = 'The path and fence run to the couple, seen past a soft foreground.';
    return c;
  } },
  { flags: ['thirds', 'frame'], make(R) {
    const side = R.sign(), door = R.chance(0.5);
    const c = door
      ? composed(R, { env: 'doorway', fx: third(side), fy: R.range(0.79, 0.84), frac: R.range(0.3, 0.36), opts: { decor: 'asym', decorSide: -side } })
      : composed(R, { env: 'meadow', fx: third(side), fy: R.range(0.76, 0.82), frac: R.range(0.3, 0.38), opts: { arbor: 'arbor', trees: 1, treeSide: -side } });
    c.why = `The ${door ? 'doorway' : 'arbor'} frames the couple, and it sits on the ${sideName(side)} third.`;
    return c;
  } },
  { flags: ['frame', 'layers'], make(R) {
    const side = R.sign(), kind = R.pick(['leaves', 'florals']);
    const c = composed(R, { env: 'meadow', fx: 0.5 - side * R.range(0, 0.05), fy: R.range(0.78, 0.83), frac: R.range(0.31, 0.38), opts: { arbor: 'arbor', trees: 1, treeSide: -side }, fg: { kind, side } });
    c.why = 'The arbor frames the couple, seen past a soft foreground.';
    return c;
  } },
  { flags: ['thirds', 'lines', 'layers'], make(R) {
    const side = R.sign(), env = R.pick(['meadow', 'lake']);
    const opts = env === 'meadow' ? { path: true, fence: 0, treeSide: -side, trees: 1 } : { dock: true };
    const c = composed(R, { env, fx: third(side), fy: R.range(0.62, 0.68), frac: R.range(0.28, 0.35), opts, fg: { kind: R.pick(['florals', 'leaves']), side: -side } });
    c.why = `The couple on the ${sideName(side)} third, a ${env === 'meadow' ? 'path' : 'dock'} running to them, and a soft foreground in front.`;
    return c;
  } },
];
const SINGLE_RECIPES = RECIPES.filter(r => r.flags.length === 1);
const MULTI_RECIPES = RECIPES.filter(r => r.flags.length > 1);
const flagKey = flags => DEVICES.map(d => d.key).filter(k => flags.includes(k)).join('+');

function genDevice(R, force) {
  const key = force || R.pick(DEVICES).key;
  const c = SINGLE_RECIPES.find(r => r.flags[0] === key).make(R);
  return { kind: 'pick', set: 'device', scene: c.scene, crop: c.crop, answer: key, flags: [key], why: c.why, tag: 'device:' + key, prompt: 'Which device carries this frame?' };
}
function genStack(R, force) {
  let rec = force ? RECIPES.find(r => flagKey(r.flags) === force) : null;
  if (!rec) rec = R.chance(0.72) ? R.pick(MULTI_RECIPES) : R.pick(SINGLE_RECIPES);
  const c = rec.make(R);
  const flags = DEVICES.map(d => d.key).filter(k => rec.flags.includes(k));
  return { kind: 'multi', set: 'device', scene: c.scene, crop: c.crop, answer: flags, flags, why: c.why, tag: 'stack:' + flags.join('+'), prompt: 'Mark every device at work.' };
}

/* ---------------- 4 · EDGE PATROL ---------------- */
const EDGE_OPTS = [{ key: 'top', name: 'Top' }, { key: 'right', name: 'Right' }, { key: 'bottom', name: 'Bottom' }, { key: 'left', name: 'Left' }, { key: 'clean', name: 'Clean' }];
const FIX = {
  'the knees': 'Come up to mid-thigh or go down to mid-shin.',
  'the ankles': 'Go down past the feet or come up to mid-shin.',
  'the feet': 'Give the feet some floor or come up to mid-shin.',
  'feet on the frame edge': 'Give the feet some floor.',
  'the hands': 'Come up above the wrists or go down past the fingertips.',
  'the wrists': 'Come up above the wrists or go down past the fingertips.',
  'the elbows': 'Come up to mid-chest or go down to just below the waist.',
  'the hip line': 'Come up to the waist or go down to mid-thigh.',
  'the hem of the gown': 'Give the hem some floor.',
  'the hem on the frame edge': 'Give the hem some floor.',
  'the bouquet': 'Keep the whole bouquet or lose it.',
  'the neck': 'Come down to mid-chest.',
  'the face': 'Come down to mid-chest.',
};
const EDGE_SUBS = { bottom: [['knees', 4], ['ankles', 3], ['feet', 2], ['hands', 2.6], ['elbows', 1.4]], top: [['crown', 6], ['tangent', 4]], side: [['partner', 5], ['elbow', 4]] };
const SUB_LABELS = { knees: ['the knees'], ankles: ['the ankles'], feet: ['the feet', 'feet on the frame edge'], hands: ['the hands', 'the wrists'], elbows: ['the elbows'] };
const mainFault = (f, sub) => { f.sort((a, b) => BAND_PRI[b.kind] - BAND_PRI[a.kind]); return f.find(x => (SUB_LABELS[sub] || []).includes(x.label)) || f[0]; };
const EDGE_OF_SUB = { knees: 'bottom', ankles: 'bottom', feet: 'bottom', hands: 'bottom', elbows: 'bottom', crown: 'top', tangent: 'top', partner: 'side', elbow: 'side', clean: 'clean' };

/* Where to put a bottom edge so it lands on the named body part. */
function badCutY(sc, sub, R) {
  const vis = sc.people.filter(p => p.style !== 'gown');
  if (sub === 'knees' || sub === 'ankles' || sub === 'feet') {
    if (!vis.length) return null;
    const p = R.pick(vis);
    if (sub === 'knees') return p.y(0.725 + R.range(-0.012, 0.012));
    if (sub === 'ankles') return p.y(0.945 + R.range(-0.01, 0.008));
    return p.y(R.range(0.979, 0.992));
  }
  const want = sub === 'hands' ? ['the hands', 'the wrists'] : ['the elbows'];
  const bands = [];
  for (const p of sc.people) for (const b of p.bands) if (want.includes(b.label)) bands.push(b);
  if (!bands.length) return null;
  const b = R.pick(bands);
  return lerp(b.y0, b.y1, R.range(0.3, 0.7));
}
/* A crop the same size as `base`, slid sideways so one edge slices someone. */
function sideSlice(sc, base, sub, edge, R) {
  const left = edge === 'left';
  const victim = left ? sc.people[0] : sc.people[sc.people.length - 1];
  let edgeX;
  if (sub === 'partner') {
    if (sc.people.length < 2) return null;
    edgeX = victim.cx + R.range(-0.03, 0.03) * victim.h;
  } else {
    if ((left ? victim.poseL : victim.poseR) !== 'akimbo') return null;
    const el = victim.parts.filter(p => p.k === 'elbow').sort((a, b) => (left ? a.x0 - b.x0 : b.x1 - a.x1))[0];
    const cxn = (el.x0 + el.x1) / 2;
    edgeX = cxn + (left ? 1 : -1) * R.range(0.004, 0.026) * victim.h;
  }
  return rect(left ? edgeX : edgeX - base.w, base.y, base.w, base.h);
}

function genEdge(R, force) {
  const sub0 = force && EDGE_OF_SUB[force] ? force : null;
  let want = sub0 ? EDGE_OF_SUB[sub0] : R.weighted([['bottom', 30], ['top', 15], ['left', 17], ['right', 17], ['clean', 21]]);
  if (want === 'side') want = R.chance(0.5) ? 'left' : 'right';
  const r = tryMany(120, () => {
    const couple = R.chance(0.62);
    const done = (scene, crop, why, sub, faults) => ({ kind: 'edge', scene, crop, answer: want, why, tag: 'edge:' + sub, prompt: 'Which edge hurts this crop?', faults: faults || [] });
    if (want === 'clean') {
      const type = R.pick(['full', 'threeq', 'waist', 'tight', 'threeq', 'full']);
      const sc = plainScene(R, { subject: { kind: couple ? 'couple' : 'single', poseSet: type === 'waist' ? 'waist' : 'any' } });
      for (const aspect of R.chance(0.5) ? [2 / 3, 1.5] : [1.5]) {
        const crop = makeCrop(sc, type, aspect, R, { jitter: 0.02 });
        if (!crop || !inBounds(crop) || !lateralOK(sc, crop, type)) continue;
        const ins = inspectCrop(sc, crop);
        if (faultsOf(ins).length) continue;
        const zone = ins.bottom.length ? ins.bottom[0].label : 'below the feet';
        return done(sc, crop, `Nothing to fix. The frame ends ${zone}, the head has room, and both sides clear everyone.`, 'clean');
      }
      return null;
    }
    if (want === 'bottom') {
      const sub = sub0 || R.weighted(EDGE_SUBS.bottom);
      const poseSet = sub === 'hands' || sub === 'elbows' ? 'waist' : 'any';
      const sc = plainScene(R, { subject: { kind: couple ? 'couple' : 'single', poseSet } });
      const cutY = badCutY(sc, sub, R);
      if (cutY == null) return null;
      for (const aspect of R.chance(0.5) ? [2 / 3, 1.5] : [1.5]) {
        const crop = makeCrop(sc, 'x', aspect, R, { cutY });
        if (!crop || !inBounds(crop) || !lateralOK(sc, crop, 'full')) continue;
        const f = faultsOf(inspectCrop(sc, crop));
        if (!f.length || f.some(x => x.edge !== 'bottom')) continue;
        const m = mainFault(f, sub);
        return done(sc, crop, `The bottom edge lands on ${m.label}. ${FIX[m.label] || ''}`.trim(), sub, f);
      }
      return null;
    }
    if (want === 'top') {
      const sub = sub0 || R.weighted(EDGE_SUBS.top);
      const type = R.pick(['full', 'threeq', 'waist']);
      const sc = plainScene(R, { subject: { kind: couple ? 'couple' : 'single', poseSet: type === 'waist' ? 'waist' : 'any' } });
      const g = sc.group;
      for (const aspect of R.chance(0.5) ? [2 / 3, 1.5] : [1.5]) {
        const base = makeCrop(sc, type, aspect, R);
        if (!base) continue;
        const topY = g.top + (sub === 'crown' ? R.range(0.02, 0.034) : R.range(-0.006, 0.002)) * g.h;
        const hh = rBottom(base) - topY, ww = hh * aspect;
        const crop = rect(base.x + base.w / 2 - ww / 2, topY, ww, hh);
        if (!inBounds(crop) || !lateralOK(sc, crop, 'full')) continue;
        const f = faultsOf(inspectCrop(sc, crop));
        if (!f.length || f.some(x => x.edge !== 'top')) continue;
        return done(sc, crop, sub === 'crown' ? 'The top edge shaves the top of the head. Give it room.' : 'The head touches the top edge. Give it room.', sub, f);
      }
      return null;
    }
    /* left / right */
    const sub = sub0 || R.weighted(EDGE_SUBS.side);
    const type = R.pick(['full', 'threeq']);
    const sc = plainScene(R, { subject: sub === 'partner' ? { kind: 'couple' } : { kind: couple ? 'couple' : 'single', poseSet: 'akimbo' } });
    for (const aspect of [2 / 3, 1.5]) {
      const base = makeCrop(sc, type, aspect, R);
      if (!base) continue;
      const crop = sideSlice(sc, base, sub, want, R);
      if (!crop || !inBounds(crop)) continue;
      const f = faultsOf(inspectCrop(sc, crop));
      if (!f.length || f.some(x => x.edge !== want)) continue;
      /* everyone else must sit comfortably inside */
      const far = want === 'left' ? rRight(crop) - rRight(sc.group.box) : sc.group.box.x - crop.x;
      if (far < 0.04 * sc.group.h) continue;
      return done(sc, crop, sub === 'partner' ? `The ${want} edge cuts a person in half. Take them in or leave them out.` : `The ${want} edge clips an elbow. Widen until the whole arm is in.`, sub, f);
    }
    return null;
  });
  if (!r) throw new Error('genEdge ' + want);
  return r;
}

/* ---------------- 5 · STRONGER FRAME ---------------- */
const AB_FLAWS = [['knees', 12], ['ankles', 9], ['hands', 9], ['feet', 8], ['elbows', 6], ['crown', 12], ['tilt', 18], ['partner', 14], ['elbow', 12]];
function genAB(R, force) {
  const flaw = force || R.weighted(AB_FLAWS);
  const r = tryMany(120, () => {
    const couple = R.chance(0.6);
    let sc, good, bad, tilt = 0, why, flawEdge = 'tilt';
    const fitAspects = R.chance(0.5) ? [2 / 3, 1.5] : [1.5];
    if (flaw === 'tilt') {
      const env = R.weighted([['lake', 4], ['meadow', 3], ['estate', 2], ['garden', 2]]);
      sc = plainScene(R, { env, subject: { kind: couple ? 'couple' : 'single' } });
      const type = R.pick(['full', 'full', 'threeq']);
      for (const aspect of fitAspects) {
        const c = makeCrop(sc, type, aspect, R);
        if (c && inBounds(c, 260) && lateralOK(sc, c, type) && !faultsOf(inspectCrop(sc, c)).length) { good = c; break; }
      }
      if (!good) return null;
      bad = good; tilt = R.sign() * R.range(2.3, 3.5);
      why = `Frame {bad} tips about ${Math.round(Math.abs(tilt))} degrees. Level the ${env === 'estate' ? 'building' : env === 'garden' ? 'hedge line' : 'horizon'} before anything else.`;
    } else if (['knees', 'ankles', 'feet', 'hands', 'elbows'].includes(flaw)) {
      const goodType = { knees: 'threeq', ankles: 'full', feet: 'full', hands: 'threeq', elbows: 'waist' }[flaw];
      sc = plainScene(R, { subject: { kind: couple ? 'couple' : 'single', poseSet: flaw === 'hands' || flaw === 'elbows' ? 'waist' : 'any' } });
      const cutY = badCutY(sc, flaw, R);
      if (cutY == null) return null;
      const hr = R.range(0.07, 0.1);
      for (const aspect of fitAspects) {
        const g2 = makeCrop(sc, goodType, aspect, R, { hr });
        const b2 = makeCrop(sc, 'x', aspect, R, { cutY, hr });
        if (!g2 || !b2 || !inBounds(g2) || !inBounds(b2) || !lateralOK(sc, g2, goodType) || !lateralOK(sc, b2, 'full')) continue;
        const fb = faultsOf(inspectCrop(sc, b2));
        const ig = inspectCrop(sc, g2);
        if (faultsOf(ig).length || !fb.length || fb.some(x => x.edge !== 'bottom')) continue;
        good = g2; bad = b2; flawEdge = 'bottom';
        why = `Frame {bad} ends on ${mainFault(fb, flaw).label}. Frame {good} ends ${ig.bottom.length ? ig.bottom[0].label : 'below the feet'}, a safe place to cut.`;
        break;
      }
      if (!good) return null;
    } else if (flaw === 'crown') {
      const type = R.pick(['full', 'full', 'threeq', 'waist']);
      sc = plainScene(R, { subject: { kind: couple ? 'couple' : 'single', poseSet: type === 'waist' ? 'waist' : 'any' } });
      const g = sc.group;
      for (const aspect of fitAspects) {
        const g2 = makeCrop(sc, type, aspect, R);
        if (!g2 || !inBounds(g2) || !lateralOK(sc, g2, type) || faultsOf(inspectCrop(sc, g2)).length) continue;
        const clip = R.range(0.02, 0.034) * g.h;
        let b2;
        if (type === 'full') b2 = rect(g2.x, g.top + clip, g2.w, g2.h);
        else { const hh = rBottom(g2) - (g.top + clip), ww = hh * aspect; b2 = rect(g2.x + g2.w / 2 - ww / 2, g.top + clip, ww, hh); }
        if (!inBounds(b2) || !lateralOK(sc, b2, 'full')) continue;
        const fb = faultsOf(inspectCrop(sc, b2));
        if (!fb.length || fb.some(x => x.edge !== 'top')) continue;
        good = g2; bad = b2; flawEdge = 'top';
        why = 'Frame {bad} shaves the top of the head. Frame {good} gives it room.';
        break;
      }
      if (!good) return null;
    } else {
      const edge = R.chance(0.5) ? 'left' : 'right';
      const type = R.pick(['full', 'threeq']);
      sc = plainScene(R, { subject: flaw === 'partner' ? { kind: 'couple' } : { kind: couple ? 'couple' : 'single', poseSet: 'akimbo' } });
      for (const aspect of [2 / 3, 1.5]) {
        const g2 = makeCrop(sc, type, aspect, R);
        if (!g2 || !inBounds(g2) || !lateralOK(sc, g2, type) || faultsOf(inspectCrop(sc, g2)).length) continue;
        const b2 = sideSlice(sc, g2, flaw, edge, R);
        if (!b2 || !inBounds(b2)) continue;
        const fb = faultsOf(inspectCrop(sc, b2));
        if (!fb.length || fb.some(x => x.edge !== edge)) continue;
        good = g2; bad = b2; flawEdge = edge;
        why = flaw === 'partner' ? `Frame {bad} cuts a person in half at the ${edge} edge. Frame {good} keeps both whole.` : `Frame {bad} clips an elbow at the ${edge} edge. Frame {good} keeps the whole arm.`;
        break;
      }
      if (!good) return null;
    }
    const goodIsA = R.chance(0.5);
    const A = goodIsA ? { crop: good, tilt: 0 } : { crop: bad, tilt };
    const B = goodIsA ? { crop: bad, tilt } : { crop: good, tilt: 0 };
    return {
      kind: 'ab', scene: sc, a: A, b: B, answer: goodIsA ? 'a' : 'b', tag: 'ab:' + flaw, prompt: 'Which frame is stronger?', flawEdge,
      why: why.replace('{bad}', goodIsA ? 'B' : 'A').replace('{good}', goodIsA ? 'A' : 'B'),
    };
  });
  if (!r) throw new Error('genAB ' + flaw);
  return r;
}

/* ---------------- 6 · WILL IT PRINT? ---------------- */
const PRINTS = [
  { key: '8x10', name: '8×10 print', ratio: '4:5', a: 0.8, match: true },
  { key: '5x7', name: '5×7 print', ratio: '5:7', a: 5 / 7, match: true },
  { key: 'square', name: 'Square', ratio: '1:1', a: 1 },
  { key: 'ig', name: 'Instagram portrait', ratio: '4:5', a: 0.8 },
  { key: 'story', name: 'Reel or Story', ratio: '9:16', a: 9 / 16 },
  { key: 'video', name: 'Slideshow frame', ratio: '16:9', a: 16 / 9 },
  { key: 'spread', name: 'Album spread', ratio: '2:1', a: 2 },
];
const printOf = k => PRINTS.find(p => p.key === k);
const PRINT_MIX = { L: [['8x10', 5], ['5x7', 3], ['square', 3], ['ig', 3], ['story', 3], ['video', 3], ['spread', 2]], P: [['8x10', 5], ['5x7', 3], ['square', 3], ['story', 3], ['video', 1]] };
const targetAspect = (t, landscape) => (t.match && landscape ? 1 / t.a : t.a);
/* The largest window of aspect `at` inside `src`, centred on (cx, cy) as far as it can be. */
function fitWindow(src, at, cx, cy) {
  const as = src.w / src.h;
  const w = at < as ? src.h * at : src.w, h = at < as ? src.h : src.w / at;
  return rect(clamp(cx - w / 2, src.x, rRight(src) - w), clamp(cy - h / 2, src.y, rBottom(src) - h), w, h);
}
/* Breathing room a group needs to count as "kept". */
function needBox(sc) {
  const g = sc.group;
  return rect(g.box.x - 0.03 * g.h, g.top - 0.03 * g.h, g.box.w + 0.06 * g.h, g.feet - g.top + 0.05 * g.h);
}
function castForWidth(R, lo, hi) {
  /* lo..hi = how wide the people may be, in body heights */
  const opts = [];
  if (0.36 >= lo && 0.36 <= hi) opts.push({ kind: 'single' });
  if (0.56 >= lo && 0.56 <= hi) opts.push({ kind: 'couple', arrangement: 'close' });
  if (0.74 >= lo && 0.74 <= hi) opts.push({ kind: 'couple', arrangement: 'hold' });
  for (let n = 3; n <= 9; n++) {
    const sLo = (lo - 0.37) / (n - 1), sHi = (hi - 0.37) / (n - 1);
    const a = Math.max(0.19, sLo), b = Math.min(0.262, sHi);
    if (a <= b) opts.push({ kind: 'group', n, stepU: R.range(a, b) });
  }
  return opts.length ? R.pick(opts) : null;
}
function genPrint(R, force) {
  const r = tryMany(160, () => {
    const landscape = R.chance(0.68);
    const tk = force && (landscape || PRINT_MIX.P.some(x => x[0] === force)) ? force : R.weighted(landscape ? PRINT_MIX.L : PRINT_MIX.P);
    const t = printOf(tk), as = landscape ? 1.5 : 2 / 3, at = targetAspect(t, landscape);
    const widthTrim = at < as, keep = widthTrim ? at / as : as / at;
    const wantFit = R.chance(0.5);
    const snug = keep > 0.9;
    const need = wantFit ? keep - R.range(0.05, 0.15) : keep + (snug ? R.range(0.032, 0.05) : R.range(0.045, 0.1));
    if (need > 0.986 || need < 0.2) return null;
    let sub, sc, src;
    const env = R.weighted([['garden', 4], ['estate', 3], ['meadow', 3], ['lake', 2]]);
    const opts = env === 'garden' ? { arch: false, aisle: false, chairs: false } : env === 'lake' ? { dock: false } : env === 'meadow' ? { path: false, fence: 0 } : {};
    if (widthTrim) {
      sub = castForWidth(R, need * as * 1.14, need * as * 1.68);
      if (!sub) return null;
      const h = R.range(500, 580);
      if (sub.kind === 'group') sub.step = sub.stepU * h;
      sc = plainScene(R, { env, opts, h, sx: 1500, gy: R.range(1470, 1540), subject: sub });
      const nb = needBox(sc), g = sc.group;
      const cw = nb.w / need, ch = cw / as;
      if (ch < g.h * 1.12 || ch > g.h * 1.75) return null;
      const slackX = (cw - nb.w) / 2, slackY = ch - (g.feet - g.top);
      src = rect(nb.x - slackX + R.range(-0.35, 0.35) * slackX, g.top - slackY * R.range(0.42, 0.62), cw, ch);
    } else {
      const h = need < 0.45 ? R.range(400, 470) : R.range(500, 580);
      sub = landscape ? R.pick([{ kind: 'couple' }, { kind: 'couple' }, { kind: 'group', n: R.int(3, 5) }, { kind: 'single' }]) : R.pick([{ kind: 'couple', arrangement: 'close' }, { kind: 'single' }]);
      sc = plainScene(R, { env, opts, h, sx: 1500, gy: R.range(1470, 1540), subject: sub });
      const nb = needBox(sc), g = sc.group;
      const ch = nb.h / need, cw = ch * as;
      if (nb.w > cw * 0.9) return null;
      src = rect(g.cx - cw / 2 + R.range(-0.04, 0.04) * cw, nb.y - (ch - nb.h) * R.range(0.4, 0.6), cw, ch);
    }
    if (!inBounds(src, 300)) return null;
    const nb = needBox(sc);
    if (!rContains(src, nb, 0)) return null;
    const win = fitWindow(src, at, nb.x + nb.w / 2, nb.y + nb.h / 2);
    const useW = nb.w / win.w, useH = nb.h / win.h;
    const bind = widthTrim ? useW : useH, other = widthTrim ? useH : useW;
    if (other > 0.97 || Math.abs(bind - 1) < 0.03) return null;
    const fits = bind <= 1;
    if (fits !== wantFit) return null;
    const axis = widthTrim ? 'width' : 'height';
    const needPct = Math.round((widthTrim ? nb.w / src.w : nb.h / src.h) * 100), keepPct = Math.round(keep * 100);
    const noun = nounOf(sc);
    const why = fits
      ? `${t.name} keeps ${keepPct}% of the ${axis}. This ${noun} needs ${needPct}%, so it fits.`
      : `${t.name} keeps only ${keepPct}% of the ${axis}. This ${noun} needs ${needPct}%, so ${widthTrim ? (sc.people.length > 2 ? 'the people on the ends get cut' : 'the sides get cut') : 'heads or feet get cut'}.`;
    return {
      kind: 'print', scene: sc, crop: src, target: { key: t.key, name: t.name, ratio: t.ratio, aspect: at }, win, answer: fits ? 'fits' : 'cuts',
      why, tag: 'print:' + t.key, prompt: `Does this frame survive ${t.name === 'Square' ? 'a square crop' : 'as ' + (/^[aeiou8]/i.test(t.name) ? 'an ' : 'a ') + t.name}?`, need: nb, keep,
    };
  });
  if (!r) throw new Error('genPrint');
  return r;
}
const PRINT_OPTS = [{ key: 'fits', name: 'Fits' }, { key: 'cuts', name: 'Cuts someone' }];
