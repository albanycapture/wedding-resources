/* ============================================================
   HANDS-ON — briefs the player answers by cropping.
   Each task carries a scorer that returns marked notes, plus one
   reference crop that is proven to score well before the task ships.
   ============================================================ */
const RATIO_LABELS = [[1.5, '3:2'], [2 / 3, '2:3'], [0.8, '4:5'], [1.25, '5:4'], [1, '1:1'], [16 / 9, '16:9'], [9 / 16, '9:16'], [5 / 7, '5:7'], [1.4, '7:5'], [2, '2:1']];
const aspectLabel = a => { let best = RATIO_LABELS[0]; for (const r of RATIO_LABELS) if (Math.abs(r[0] - a) < Math.abs(best[0] - a)) best = r; return best[1]; };
const CROP_WORD = { wide: 'wide', full: 'full-length', threeq: 'three-quarter', waist: 'waist-up', tight: 'tight', low: 'a low crop near the knees' };
const note = (ok, text, pts, max) => ({ ok, text, pts: Math.round(pts), max });
const sumNotes = notes => notes.reduce((a, n) => a + n.pts, 0);
const PASS_MARK = 75;

function peopleNote(ins, max) {
  if (ins.outside.length) return note(false, ins.outside.length === 1 ? 'One person is left out of the frame.' : `${ins.outside.length} people are left out of the frame.`, 0, max);
  for (const sd of ['left', 'right']) {
    const f = ins[sd].find(x => x.bad);
    if (f) return note(false, `The ${sd} edge cuts through ${f.label}.`, 0, max);
  }
  return note(true, 'Everyone is in and nobody is sliced.', max, max);
}
function edgeNote(ins, max, allowCrown) {
  const b = ins.bottom.filter(x => x.kind !== 'ok').sort((a, c) => BAND_PRI[c.kind] - BAND_PRI[a.kind])[0];
  if (b) return note(false, `The bottom edge lands on ${b.label}. ${FIX[b.label] || ''}`.trim(), 0, max);
  const t = ins.top.find(x => !(x.kind === 'crown' && allowCrown));
  if (t) return note(false, t.kind === 'tangent' ? 'The head touches the top edge.' : `The top edge cuts ${t.label}.`, 0, max);
  return note(true, `Clean edges. The frame ends ${ins.bottom.length ? ins.bottom[0].label : 'below the feet'}.`, max, max);
}
/* People and edges as one line, for briefs where they share a slot. */
function cleanNote(ins, max, allowCrown) {
  const p = peopleNote(ins, max);
  return p.ok === true ? edgeNote(ins, max, allowCrown) : p;
}
function headroomNote(scene, crop, ins, max, lo, hi, allowCrown) {
  if (ins.top.length) {
    if (allowCrown && ins.top.every(t => t.kind === 'crown')) return note(true, 'Cropped into the hair on purpose, which works this tight.', max, max);
    return note(false, 'No headroom.', 0, max);
  }
  if (!ins.inside.length) return note(false, 'Nobody is in the frame.', 0, max);
  const hr = (scene.group.top - crop.y) / crop.h, pct = Math.round(hr * 100);
  if (hr >= lo && hr <= hi) return note(true, `Headroom is ${pct}% of the frame.`, max, max);
  if (hr < lo) return note('part', `Headroom is tight at ${pct}% of the frame.`, max * 0.6 * clamp(hr / lo, 0, 1), max);
  return note('part', `Headroom is heavy at ${pct}% of the frame.`, max * clamp(1 - (hr - hi) / 0.16, 0, 1), max);
}
function typeNote(scene, crop, type, max) {
  const g = scene.group, P = g.tall, got = classifyCrop(scene, crop), frac = g.h / crop.h, pct = Math.round(frac * 100), noun = nounOf(scene);
  if (type === 'wide') {
    if (!rContains(crop, g.box, 0)) return note(false, `A wide frame keeps the whole ${noun} in.`, 0, max);
    if (frac <= 0.4) return note(true, `Reads as wide. The ${noun} is ${pct}% of the frame height.`, max, max);
    if (frac <= 0.52) return note('part', `At ${pct}% of the frame height this is drifting toward full-length. Wide wants under 40%.`, max * 0.5, max);
    return note(false, `At ${pct}% of the frame height this reads as full-length, not wide.`, 0, max);
  }
  if (type === 'full') {
    if (got !== 'full' && got !== 'wide') return note(false, `The feet are out, so this reads as ${CROP_WORD[got]}.`, 0, max);
    if (frac >= 0.6) return note(true, 'Reads as full-length, head to toe.', max, max);
    if (frac >= 0.46) return note('part', `Loose for a full-length. The ${noun} is only ${pct}% of the frame height.`, max * 0.5, max);
    return note(false, `The ${noun} is only ${pct}% of the frame height, so this reads as wide.`, 0, max);
  }
  const yb = rBottom(crop), u = (yb - P.ty) / P.h, rg = CROP_RANGE[type];
  if (got === 'full' || got === 'wide') return note(false, `The feet are in, so this reads as ${CROP_WORD[got]}.`, 0, max);
  if (u >= rg[0] && u <= rg[1]) return note(true, `Reads as ${CROP_WORD[type]}. The frame ends ${zoneName(P, yb)}.`, max, max);
  if (u >= rg[0] - 0.03 && u <= rg[1] + 0.03) return note('part', `Close. The frame ends ${zoneName(P, yb)}, just outside ${CROP_WORD[type]}.`, max * 0.5, max);
  return note(false, `The frame ends ${zoneName(P, yb)}, so this reads as ${CROP_WORD[got]}.`, 0, max);
}
function placementNote(scene, crop, max, tight) {
  const cx = tight ? headsCx(scene) : scene.group.cx;
  const dx = (cx - (crop.x + crop.w / 2)) / crop.w, a = Math.abs(dx);
  if (a <= 0.06) return note(true, 'Centred.', max, max);
  if (Math.abs(a - 1 / 6) <= 0.04) return note(true, `On the ${dx < 0 ? 'left' : 'right'} third.`, max, max);
  const d = Math.min(a - 0.06, Math.abs(a - 1 / 6) - 0.04);
  return note('part', `Neither centred nor on a third. The ${nounOf(scene)} sits ${Math.round(a * 100)}% off centre.`, max * clamp(1 - d / 0.09, 0, 1), max);
}
const allTight = (scene, crop) => scene.people.every(p => rBottom(crop) < p.y(0.34));

/* Largest crop of `aspect` inside `source` that keeps everyone and has clean edges. */
function bestCleanCrop(scene, source, aspect) {
  const wMax = Math.min(source.w, source.h * aspect), g = scene.group;
  for (let s = 1; s >= 0.16; s -= 0.025) {
    const w = wMax * s, h = w / aspect;
    const nx = Math.round((source.w - w) / (source.w * 0.02)), ny = Math.round((source.h - h) / (source.h * 0.02));
    let best = null;
    for (let iy = 0; iy <= ny; iy++) {
      for (let ix = 0; ix <= nx; ix++) {
        const c = rect(source.x + (nx ? (source.w - w) * ix / nx : (source.w - w) / 2), source.y + (ny ? (source.h - h) * iy / ny : (source.h - h) / 2), w, h);
        const ins = inspectCrop(scene, c);
        if (ins.outside.length) continue;
        const tight = allTight(scene, c);
        if (faultsOf(ins, { allowCrown: false }).length) continue;
        const hr = (g.top - c.y) / c.h;
        if (hr < (tight ? 0.03 : 0.045) || hr > 0.16) continue;
        const q = -Math.abs((tight ? headsCx(scene) : g.cx) - (c.x + c.w / 2)) / c.w - Math.abs(hr - 0.085);
        if (!best || q > best.q) best = { c, q };
      }
    }
    if (best) return best.c;
  }
  return null;
}

const SIMPLE_OPTS = { garden: { arch: false, aisle: false, chairs: false }, lake: { dock: false }, meadow: { path: false, fence: 0 }, estate: {} };
const makeTask = (mode, o) => Object.assign({ kind: 'make', mode, prompt: o.brief.title }, o);

/* ---------------- 7 · RE-CROP FOR DELIVERY ---------------- */
function scoreRecrop(scene, ref, crop) {
  const ins = inspectCrop(scene, crop), tight = allTight(scene, crop), notes = [];
  notes.push(peopleNote(ins, 35));
  notes.push(edgeNote(ins, 30, tight));
  notes.push(headroomNote(scene, crop, ins, 15, tight ? 0.02 : 0.035, 0.17, tight));
  const ratio = (crop.w * crop.h) / (ref.w * ref.h);
  notes.push(ratio >= 0.8 ? note(true, 'Keeps as much of the original as a clean crop can.', 20, 20)
    : note('part', `You kept ${Math.round(ratio * 100)}% of what a clean crop could keep. Go bigger.`, 20 * clamp((ratio - 0.35) / 0.45, 0, 1), 20));
  return { score: sumNotes(notes), notes };
}
function genRecrop(R, force) {
  const r = tryMany(80, () => {
    const landscape = force ? !['5x7'].includes(force) && R.chance(0.65) : R.chance(0.65);
    const tk = force || R.weighted(landscape ? [['ig', 4], ['story', 3], ['square', 3], ['8x10', 3], ['spread', 2], ['video', 2]] : [['8x10', 5], ['square', 3], ['video', 2], ['story', 2], ['5x7', 2]]);
    const t = printOf(tk), as = landscape ? 1.5 : 2 / 3, at = targetAspect(t, landscape);
    if (Math.abs(at - as) < 0.02) return null;
    const sub = landscape ? R.pick([{ kind: 'couple' }, { kind: 'couple' }, { kind: 'group', n: R.int(3, 5) }]) : R.pick([{ kind: 'couple', arrangement: 'close' }, { kind: 'single' }, { kind: 'couple', arrangement: 'close' }]);
    const env = R.weighted([['garden', 3], ['estate', 3], ['meadow', 4], ['lake', 3]]);
    const sc = plainScene(R, { env, opts: SIMPLE_OPTS[env], h: R.range(520, 600), sx: 1500, gy: R.range(1470, 1540), subject: sub });
    const g = sc.group;
    let ch = g.h / R.range(0.6, 0.9), cw = ch * as;
    if (g.box.w + 0.12 * g.h > cw) { cw = (g.box.w + 0.12 * g.h) / R.range(0.82, 0.95); ch = cw / as; }
    const src = rect(g.cx - cw / 2 + R.range(-0.04, 0.04) * cw, g.top - (ch - g.h) * R.range(0.42, 0.6), cw, ch);
    if (!inBounds(src, 300) || faultsOf(inspectCrop(sc, src)).length || !rContains(src, g.box, 0.02 * cw)) return null;
    const ref = bestCleanCrop(sc, src, at);
    if (!ref || ref.w * ref.h < 0.1 * src.w * src.h) return null;
    const task = makeTask('recrop', {
      scene: sc, source: src, aspect: at, ref, tag: 'recrop:' + t.key,
      brief: { title: 'Re-crop for ' + (t.name === 'Square' ? 'a square' : t.name), chip: t.ratio, text: 'Keep everyone in and the edges clean.' },
      score: crop => scoreRecrop(sc, ref, crop),
    });
    return task.score(ref).score >= 92 ? task : null;
  });
  if (!r) throw new Error('genRecrop');
  return r;
}

/* ---------------- 8 · CROP TO BRIEF ---------------- */
function scoreBrief(scene, type, crop) {
  const ins = inspectCrop(scene, crop), tight = type === 'tight' && allTight(scene, crop), notes = [];
  notes.push(typeNote(scene, crop, type, 40));
  notes.push(cleanNote(ins, 25, tight));
  if (type === 'wide') {
    const g = scene.group, m = Math.min(g.box.x - crop.x, rRight(crop) - rRight(g.box), g.top - crop.y, rBottom(crop) - g.feet) / crop.w;
    notes.push(m >= 0.04 ? note(true, 'Room on every side.', 15, 15) : note('part', 'Pushed up against an edge.', 15 * clamp(m / 0.04, 0, 1), 15));
  } else notes.push(headroomNote(scene, crop, ins, 15, tight ? 0.02 : 0.04, 0.17, tight));
  notes.push(placementNote(scene, crop, 20, type === 'tight'));
  return { score: sumNotes(notes), notes };
}
function genBrief(R, force) {
  const type = force || R.pick(['wide', 'full', 'threeq', 'waist', 'tight']);
  const r = tryMany(120, () => {
    const couple = R.chance(0.55);
    let sc, src, aspect, ref;
    if (type === 'wide') {
      const h = R.range(400, 470);
      sc = plainScene(R, { h, sx: R.range(1000, 2000), gy: R.range(1420, 1520), subject: { kind: couple ? 'couple' : 'single' } });
      src = rect(0, 0, 3000, 2000);
      aspect = R.pick([1.5, 1.5, 16 / 9, 0.8]);
      const g = sc.group, ch = Math.min(g.h / 0.3, 1960, 2960 / aspect), cw = ch * aspect, side = R.sign();
      ref = rect(clamp(g.cx - third(side) * cw, 0, 3000 - cw), clamp(g.feet - 0.76 * ch, 0, 2000 - ch), cw, ch);
    } else {
      sc = plainScene(R, { h: R.range(540, 620), subject: { kind: couple ? 'couple' : 'single', poseSet: type === 'waist' ? 'waist' : 'any' } });
      const g = sc.group;
      const sAs = !couple && R.chance(0.6) ? 2 / 3 : 1.5;
      let sch = g.h / (type === 'full' ? R.range(0.5, 0.62) : R.range(0.62, 0.74)), scw = sch * sAs;
      if (g.box.w + 0.3 * g.h > scw) { scw = g.box.w + 0.3 * g.h; sch = scw / sAs; }
      src = rect(clamp(g.cx - scw * R.range(0.42, 0.58), -260, 3260 - scw), clamp(g.top - (sch - g.h) * R.range(0.45, 0.62), -260, 2260 - sch), scw, sch);
      if (!rContains(src, g.box, 0.03 * scw)) return null;
      for (const a of R.shuffle(type === 'full' ? [2 / 3, 0.8, 1.5] : [2 / 3, 0.8, 1, 1.5])) {
        const c = makeCrop(sc, type, a, R, { hr: 0.085 });
        if (c && rContains(src, c, 0) && lateralOK(sc, c, type) && !faultsOf(inspectCrop(sc, c)).length) { aspect = a; ref = c; break; }
      }
      if (!ref) return null;
    }
    const noun = nounOf(sc);
    const task = makeTask('brief', {
      scene: sc, source: src, aspect, ref, tag: 'brief:' + type,
      brief: { title: cropName(type), chip: aspectLabel(aspect), text: `Frame the ${noun}.` },
      score: crop => scoreBrief(sc, type, crop),
    });
    return task.score(ref).score >= 92 ? task : null;
  });
  if (!r) throw new Error('genBrief ' + type);
  return r;
}

/* ---------------- 9 · COMPOSE TO BRIEF ---------------- */
const FULL_SRC = () => rect(0, 0, 3000, 2000);
const COMPOSE = {
  thirds(R) {
    const side = R.sign(), type = R.pick(['full', 'threeq']), env = R.pick(['meadow', 'lake', 'meadow']);
    const sc = plainScene(R, { env, opts: SIMPLE_OPTS[env], h: R.range(520, 600), sx: R.range(1250, 1750), gy: R.range(1450, 1550), subject: { kind: 'couple' } });
    const aspect = R.pick([1.5, 1.5, 0.8, 1]), g = sc.group;
    const base = makeCrop(sc, type, aspect, R, { hr: 0.085 });
    if (!base) return null;
    const ref = rect(g.cx - third(side) * base.w, base.y, base.w, base.h);
    if (faultsOf(inspectCrop(sc, ref)).length) return null;
    const t = third(side);
    /* a loosely shot frame around the couple, so the crop box stays a workable size */
    const sh = Math.min(2000, g.h * 2.4), sw = sh * 1.5;
    const source = rect(clamp(g.cx - sw * R.range(0.36, 0.64), 0, 3000 - sw), clamp(g.top - (sh - g.h) * R.range(0.4, 0.6), 0, 2000 - sh), sw, sh);
    return makeTask('compose', {
      scene: sc, source, aspect, ref, tag: 'compose:thirds',
      brief: { title: 'Rule of thirds', chip: aspectLabel(aspect), text: `Couple on the ${sideName(side)} third, ${CROP_WORD[type]}.` },
      score(crop) {
        const ins = inspectCrop(sc, crop), pos = (g.cx - crop.x) / crop.w, d = Math.abs(pos - t), notes = [];
        if (d <= 0.035) notes.push(note(true, `On the ${sideName(side)} third.`, 40, 40));
        else if (Math.abs(pos - (1 - t)) <= 0.06) notes.push(note(false, `That is the ${sideName(-side)} third. The brief asked for the ${sideName(side)}.`, 0, 40));
        else notes.push(note('part', `The couple sits ${Math.round(pos * 100)}% across the frame. The ${sideName(side)} third is at ${Math.round(t * 100)}%.`, 40 * clamp(1 - (d - 0.035) / 0.09, 0, 1), 40));
        notes.push(typeNote(sc, crop, type, 25));
        notes.push(cleanNote(ins, 20, false));
        notes.push(headroomNote(sc, crop, ins, 15, 0.04, 0.17, false));
        return { score: sumNotes(notes), notes };
      },
    });
  },
  symmetry(R) {
    const env = R.pick(['garden', 'garden', 'estate']);
    const opts = env === 'garden' ? (R.chance(0.55) ? { arch: true, aisle: R.chance(0.5), chairs: false } : { arch: false, aisle: false, chairs: false }) : { door: true };
    const sc = plainScene(R, { env, opts, h: R.range(480, 560), sx: R.range(1150, 1850), gy: R.range(1460, 1540), subject: { kind: 'couple' } });
    const f = sc.feats, keep = f.frame || f.pair, g = sc.group;
    const thing = env === 'estate' ? 'doorway' : f.frame ? 'arch' : 'urns';
    const aspect = R.pick([1.5, 1, 0.8]);
    const topN = Math.min(keep.y, g.top), botN = Math.max(rBottom(keep), g.feet);
    let H = (botN - topN) / 0.82, W = H * aspect;
    if (W < keep.w * 1.14) { W = keep.w * 1.14; H = W / aspect; }
    const ref = rect(f.axisX - W / 2, topN - (H - (botN - topN)) * 0.55, W, H);
    return makeTask('compose', {
      scene: sc, source: FULL_SRC(), aspect, ref, tag: 'compose:symmetry',
      brief: { title: 'Symmetry', chip: aspectLabel(aspect), text: thing === 'urns' ? 'Dead centre. Keep both urns in.' : `Dead centre. Keep the whole ${thing} in.` },
      score(crop) {
        const ins = inspectCrop(sc, crop), off = Math.abs(crop.x + crop.w / 2 - f.axisX) / crop.w, notes = [];
        notes.push(off <= 0.012 ? note(true, 'Dead centre on the axis.', 40, 40)
          : note(off <= 0.03 ? 'part' : false, `The frame is ${(off * 100).toFixed(1)}% off the centre line. Symmetry needs it dead centre.`, 40 * clamp(1 - (off - 0.012) / 0.04, 0, 1), 40));
        notes.push(rContains(crop, keep, 0.012 * crop.w) ? note(true, thing === 'urns' ? 'Both urns are in.' : `The whole ${thing} is in.`, 25, 25)
          : note(false, thing === 'urns' ? 'An urn is clipped or missing.' : `The ${thing} is clipped.`, 0, 25));
        notes.push(cleanNote(ins, 20, false));
        const fill = Math.max(keep.w / crop.w / 0.4, keep.h / crop.h / 0.5);
        notes.push(fill >= 1 ? note(true, 'The frame is filled, not floating.', 15, 15) : note('part', `The ${thing === 'urns' ? 'scene is' : thing + ' is'} small in the frame. Come in closer.`, 15 * clamp((fill - 0.5) / 0.5, 0, 1), 15));
        return { score: sumNotes(notes), notes };
      },
    });
  },
  space(R) {
    const side = R.sign(), env = R.pick(['meadow', 'lake']);
    const sc = plainScene(R, { env, opts: { sparse: true, noSun: true, dock: false, path: false, fence: 0 }, h: R.range(300, 350), sx: side < 0 ? R.range(560, 900) : R.range(2100, 2440), gy: R.range(1520, 1700), subject: { kind: 'couple' } });
    const aspect = R.pick([1.5, 1.5, 0.8, 16 / 9]), g = sc.group;
    const ch = Math.min(g.h / 0.19, 2960 / aspect), cw = ch * aspect;
    const ref = rect(side < 0 ? g.cx - 0.2 * cw : g.cx - 0.8 * cw, g.feet - 0.85 * ch, cw, ch);
    const corner = 'bottom-' + sideName(side);
    return makeTask('compose', {
      scene: sc, source: FULL_SRC(), aspect, ref, tag: 'compose:space',
      brief: { title: 'Negative space', chip: aspectLabel(aspect), text: `Couple small in the ${corner} corner. Leave the rest empty.` },
      score(crop) {
        const frac = g.h / crop.h, notes = [];
        const px = (g.cx - crop.x) / crop.w, py = (g.feet - crop.y) / crop.h, ax = side < 0 ? px : 1 - px;
        notes.push(frac <= 0.24 ? note(true, `Small enough. The couple is ${Math.round(frac * 100)}% of the frame height.`, 40, 40)
          : note(frac <= 0.32 ? 'part' : false, `The couple fills ${Math.round(frac * 100)}% of the frame height. Negative space wants them under a quarter.`, 40 * clamp(1 - (frac - 0.24) / 0.14, 0, 1), 40));
        if (ax <= 0.3 && py >= 0.7) notes.push(note(true, `Tucked into the ${corner} corner.`, 40, 40));
        else if (ax >= 0.62) notes.push(note(false, `They are on the ${sideName(-side)} side. The brief asked for the ${corner} corner.`, 0, 40));
        else notes.push(note('part', py < 0.7 ? 'They float mid-frame. Drop them toward the bottom edge.' : `They sit ${Math.round(ax * 100)}% in from the ${sideName(side)} edge. Push them further into the corner.`, 40 * clamp(1 - Math.max((ax - 0.3) / 0.25, (0.7 - py) / 0.3), 0, 1), 40));
        const m = Math.min(g.box.x - crop.x, rRight(crop) - rRight(g.box), g.top - crop.y, rBottom(crop) - g.feet) / crop.w;
        notes.push(m >= 0.02 ? note(true, 'The couple is whole, with a little air around them.', 20, 20) : m >= 0 ? note('part', 'They are jammed against the edge.', 8, 20) : note(false, 'The couple is cut by the frame.', 0, 20));
        return { score: sumNotes(notes), notes };
      },
    });
  },
  frame(R) {
    const door = R.chance(0.55);
    const sc = door ? plainScene(R, { env: 'doorway', opts: { decor: 'asym' }, h: R.range(500, 580), sx: R.range(1150, 1850), gy: R.range(1500, 1600), subject: { kind: 'couple' } })
      : plainScene(R, { env: 'meadow', opts: { arbor: 'arbor', path: false, fence: 0 }, h: R.range(500, 580), sx: R.range(1150, 1850), gy: R.range(1500, 1600), subject: { kind: 'couple' } });
    const fr = sc.feats.frame, thing = door ? 'doorway' : 'arbor', fcx = fr.x + fr.w / 2;
    const aspect = R.pick([2 / 3, 0.8, 1, 1.5]);
    let H = fr.h / 0.64, W = H * aspect;
    if (W < fr.w * 1.2) { W = fr.w * 1.2; H = W / aspect; }
    const ref = rect(fcx - W / 2, fr.y - (H - fr.h) * 0.5, W, H);
    return makeTask('compose', {
      scene: sc, source: FULL_SRC(), aspect, ref, tag: 'compose:frame',
      brief: { title: 'Frame in frame', chip: aspectLabel(aspect), text: `Use the ${thing}. Keep the whole opening in and centre it.` },
      score(crop) {
        const off = Math.abs(fcx - (crop.x + crop.w / 2)) / crop.w, notes = [];
        notes.push(rContains(crop, fr, 0.015 * crop.w) ? note(true, `The whole ${thing} is in.`, 40, 40) : note(false, `The ${thing} is clipped.`, 0, 40));
        notes.push(off <= 0.03 ? note(true, `The ${thing} is centred.`, 35, 35) : note(off <= 0.06 ? 'part' : false, `The ${thing} sits ${Math.round(off * 100)}% off centre.`, 35 * clamp(1 - (off - 0.03) / 0.08, 0, 1), 35));
        const fill = Math.max(fr.h / crop.h / 0.5, fr.w / crop.w / 0.6);
        notes.push(fill >= 1 ? note(true, `The ${thing} fills the frame.`, 25, 25) : note('part', `The ${thing} is small in the frame. Come in closer.`, 25 * clamp((fill - 0.55) / 0.45, 0, 1), 25));
        return { score: sumNotes(notes), notes };
      },
    });
  },
  lines(R) {
    const env = R.pick(['lake', 'meadow']);
    const sc = plainScene(R, { env, opts: env === 'lake' ? { dock: true } : { path: true, fence: R.sign() }, h: R.range(430, 520), sx: R.range(1250, 1750), gy: R.range(1050, 1250), subject: { kind: 'couple' } });
    const lead = sc.feats.lead, g = sc.group, sp = sc.spec, k = sp.h / 1.7;
    const aspect = R.pick([2 / 3, 0.8, 1.5, 1]);
    const ch = g.h / 0.36, cw = ch * aspect;
    const ref = rect(g.cx - cw / 2, g.feet - 0.52 * ch, cw, ch);
    return makeTask('compose', {
      scene: sc, source: FULL_SRC(), aspect, ref, tag: 'compose:lines',
      brief: { title: 'Leading lines', chip: aspectLabel(aspect), text: `Couple in the top half. Let the ${lead.name} run out of the bottom of the frame.` },
      score(crop) {
        const ins = inspectCrop(sc, crop), yb = rBottom(crop), py = (g.feet - crop.y) / crop.h, notes = [];
        const whole = rContains(crop, g.box, 0);
        if (!whole) notes.push(note(false, 'The couple is cut by the frame.', 0, 35));
        else if (py <= 0.62 && py >= 0.28) notes.push(note(true, `The couple stands in the top half, with the ${lead.name} in front of them.`, 35, 35));
        else notes.push(note('part', py > 0.62 ? `Their feet sit ${Math.round(py * 100)}% of the way down. Lift them into the top half so the ${lead.name} has room to run.` : 'They are pinned to the top edge. Give them a little more sky.', 35 * clamp(1 - (py > 0.62 ? (py - 0.62) / 0.2 : (0.28 - py) / 0.1), 0, 1), 35));
        const q = (yb - sc.hy) / (sp.gy - sc.hy), hw = lead.half * q * k;
        const cover = Math.max(0, Math.min(rRight(crop), sp.sx + hw) - Math.max(crop.x, sp.sx - hw)) / crop.w;
        notes.push(cover >= 0.3 ? note(true, `The ${lead.name} runs out of the bottom edge and pulls the eye in.`, 30, 30)
          : note(cover > 0.1 ? 'part' : false, `The ${lead.name} barely reaches the bottom edge. Give it more of the frame.`, 30 * clamp(cover / 0.3, 0, 1), 30));
        notes.push(placementNote(sc, crop, 20, false));
        notes.push(cleanNote(ins, 15, false));
        return { score: sumNotes(notes), notes };
      },
    });
  },
};
const COMPOSE_KEYS = Object.keys(COMPOSE);
function genCompose(R, force) {
  const kind = force || R.pick(COMPOSE_KEYS);
  const r = tryMany(120, () => {
    const t = COMPOSE[kind](R);
    if (!t || !rContains(t.source, t.ref, 0)) return null;
    return t.score(t.ref).score >= 92 ? t : null;
  });
  if (!r) throw new Error('genCompose ' + kind);
  return r;
}
