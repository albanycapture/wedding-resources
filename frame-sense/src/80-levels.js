/* ============================================================
   THE ROLL — twelve frames in four strips.
   Each level names what it asks for and what counts as a pass.
   ============================================================ */
const STRIPS = [
  { name: 'Read', sub: 'name what you see' },
  { name: 'Judge', sub: 'find the flaw' },
  { name: 'Make', sub: 'crop it yourself' },
  { name: 'Deadline', sub: 'all of it, against the clock' },
];
/* A list of n keys where every key appears at least once, shuffled. */
function spread(keys, n, R) {
  let out = keys.slice(0, n);
  while (out.length < n) out.push(R.pick(keys));
  out = R.shuffle(out);
  for (let i = 2; i < out.length; i++) {
    if (out[i] === out[i - 1] && out[i] === out[i - 2]) {
      const j = out.findIndex((v, idx) => idx > i && v !== out[i]);
      if (j > 0) { const t = out[i]; out[i] = out[j]; out[j] = t; }
    }
  }
  return out;
}
const CROP_KEYS = CROPS.map(c => c.key), DEVICE_KEYS = DEVICES.map(c => c.key);
const EDGE_BASE = ['clean', 'clean', 'knees', 'ankles', 'hands', 'crown', 'tangent', 'partner', 'elbow', 'feet', 'elbows'];
const AB_BASE = ['knees', 'ankles', 'hands', 'feet', 'elbows', 'crown', 'tilt', 'tilt', 'partner', 'elbow'];

const LEVELS = [
  { id: 'crop', name: 'Call the Crop', strip: 0, mode: 'drill', count: 14, pass: 0.85, pace: 2.6,
    blurb: 'Six framings, from the whole venue down to a ring. Name each one at a glance.',
    deck: R => spread(CROP_KEYS, 14, R).map(k => ['crop', k]) },
  { id: 'device', name: 'Name the Device', strip: 0, mode: 'drill', count: 14, pass: 0.8, pace: 3.2,
    blurb: 'Six composition devices. Each frame leans on one of them. Say which.',
    deck: R => spread(DEVICE_KEYS, 14, R).map(k => ['device', k]) },
  { id: 'stack', name: 'Stacked', strip: 0, mode: 'drill', count: 10, pass: 0.7, pace: 7,
    blurb: 'Real frames stack devices. Mark every one at work, no more and no fewer.',
    deck: () => Array.from({ length: 10 }, () => ['stack', null]) },
  { id: 'edge', name: 'Edge Patrol', strip: 1, mode: 'drill', count: 14, pass: 0.8, pace: 3.6,
    blurb: 'One edge of each crop is in the wrong place, or none is. Walk all four.',
    deck: R => R.shuffle(EDGE_BASE.concat([R.pick(['knees', 'hands', 'crown']), R.pick(['partner', 'elbow', 'ankles']), R.pick(['clean', 'feet', 'tangent'])])).map(k => ['edge', k]) },
  { id: 'ab', name: 'Stronger Frame', strip: 1, mode: 'drill', count: 12, pass: 0.85, pace: 4,
    blurb: 'Two crops of one frame. One of them has a single flaw. Pick the other.',
    deck: R => R.shuffle(AB_BASE.concat([R.pick(['knees', 'crown', 'hands']), R.pick(['tilt', 'partner', 'elbow'])])).map(k => ['ab', k]) },
  { id: 'print', name: 'Will It Print?', strip: 1, mode: 'drill', count: 12, pass: 0.8, pace: 4.5,
    blurb: 'A frame and a delivery ratio. Decide whether everyone survives the crop.',
    deck: () => Array.from({ length: 12 }, () => ['print', null]) },
  { id: 'recrop', name: 'Re-crop', strip: 2, mode: 'make', count: 5, pass: 75,
    blurb: 'Take a finished frame to a new ratio. When it will not fit, find the next clean crop.',
    deck: () => Array.from({ length: 5 }, () => ['recrop', null]) },
  { id: 'brief', name: 'Crop to Brief', strip: 2, mode: 'make', count: 5, pass: 75,
    blurb: 'A loose frame and a one-line brief. Cut the named crop out of it.',
    deck: R => R.shuffle(['wide', 'full', 'threeq', 'waist', 'tight']).map(k => ['brief', k]) },
  { id: 'compose', name: 'Compose to Brief', strip: 2, mode: 'make', count: 5, pass: 75,
    blurb: 'Find the composition inside a wide frame: thirds, symmetry, space, a frame, a line.',
    deck: R => R.shuffle(COMPOSE_KEYS).map(k => ['compose', k]) },
  { id: 'cull', name: 'Speed Cull', strip: 3, mode: 'timed', seconds: 60, need: 16, pass: 0.85,
    blurb: 'Sixty seconds of crops and devices. Sixteen keepers at 85% gets you through.',
    mix: R => (R.chance(0.5) ? ['crop', R.pick(CROP_KEYS)] : ['device', R.pick(DEVICE_KEYS)]) },
  { id: 'second', name: 'Second Look', strip: 3, mode: 'timed', seconds: 75, need: 13, pass: 0.8,
    blurb: 'Seventy-five seconds of edges, pairs and print checks. Thirteen keepers at 80%.',
    mix: R => R.weighted([[['edge', null], 4], [['ab', null], 3.5], [['print', null], 2.5]]) },
  { id: 'gallery', name: 'The Full Gallery', strip: 3, mode: 'exam', count: 20, pass: 0.85,
    blurb: 'Twenty frames across everything on the roll, the last four cropped by hand.',
    deck: R => R.shuffle([['crop', null], ['crop', null], ['crop', null], ['device', null], ['device', null], ['device', null], ['stack', null], ['stack', null],
      ['edge', null], ['edge', null], ['edge', null], ['ab', null], ['ab', null], ['ab', null], ['print', null], ['print', null]])
      .concat(R.shuffle([['recrop', null], ['brief', null], ['brief', null], ['compose', null]])) },
];
LEVELS.forEach((l, i) => { l.n = i + 1; });
const levelById = id => LEVELS.find(l => l.id === id);

const GENERATORS = { crop: genCrop, device: genDevice, stack: genStack, edge: genEdge, ab: genAB, print: genPrint, recrop: genRecrop, brief: genBrief, compose: genCompose };
const OPTIONS = { crop: CROPS, device: DEVICES, stack: DEVICES, edge: EDGE_OPTS, print: PRINT_OPTS };
/* Build one question. Generators retry internally; this adds a last line of defence. */
function makeItem(spec) {
  for (let i = 0; i < 6; i++) {
    try {
      const it = GENERATORS[spec[0]](RNG(nextSeed()), spec[1] || undefined);
      it.gen = spec[0];
      it.options = OPTIONS[spec[0]] || null;
      return it;
    } catch (e) { /* try another seed */ }
  }
  const it = genCrop(RNG(nextSeed()), 'detail');
  it.gen = 'crop'; it.options = CROPS;
  return it;
}

/* Stars for a finished run. res: { acc, pace, keepers, avg } */
function starsFor(level, res) {
  if (level.mode === 'make') return res.avg >= 93 ? 3 : res.avg >= 85 ? 2 : res.avg >= level.pass ? 1 : 0;
  if (level.mode === 'timed') {
    if (res.keepers < level.need || res.acc < level.pass) return 0;
    return res.keepers >= level.need + 8 && res.acc >= 0.9 ? 3 : res.keepers >= level.need + 4 ? 2 : 1;
  }
  if (level.mode === 'exam') return res.acc >= 0.95 ? 3 : res.acc >= 0.9 ? 2 : res.acc >= level.pass ? 1 : 0;
  if (res.acc < level.pass) return 0;
  if (res.acc >= 0.95 && res.pace <= level.pace) return 3;
  return res.pace <= level.pace ? 2 : 1;
}
function goalText(level) {
  if (level.mode === 'make') return `Pass at ${level.pass} points average`;
  if (level.mode === 'timed') return `Pass with ${level.need} keepers at ${Math.round(level.pass * 100)}%`;
  if (level.mode === 'exam') return `Pass at ${Math.round(level.pass * 100)}% keepers`;
  return `Pass at ${Math.round(level.pass * 100)}% · pro pace ${level.pace.toFixed(1)} s a frame`;
}

/* Plain names for the weak-spot list. */
function tagName(tag) {
  const [k, v] = tag.split(':');
  if (k === 'crop') return cropName(v) + ' crops';
  if (k === 'device') return deviceName(v);
  if (k === 'stack') return 'Stacked: ' + v.split('+').map(deviceName).join(' + ');
  if (k === 'edge') return { clean: 'Clean frames', knees: 'Knees on the edge', ankles: 'Ankles on the edge', feet: 'Clipped feet', hands: 'Hands on the edge', elbows: 'Elbows on the bottom edge', crown: 'Shaved heads', tangent: 'Heads touching the edge', partner: 'Half a person', elbow: 'Clipped elbows' }[v] || v;
  if (k === 'ab') return 'Pairs: ' + (AB_WORD[v] || v);
  if (k === 'print') return 'Print check: ' + (printOf(v) ? printOf(v).name : v);
  if (k === 'recrop') return 'Re-crop: ' + (printOf(v) ? printOf(v).name : v);
  if (k === 'brief') return 'Brief: ' + cropName(v);
  if (k === 'compose') return 'Compose: ' + ({ thirds: 'thirds', symmetry: 'symmetry', space: 'negative space', frame: 'frame in frame', lines: 'leading lines' }[v] || v);
  return tag;
}
const tagSpec = tag => { const [k, v] = tag.split(':'); return GENERATORS[k] && !['recrop', 'brief', 'compose'].includes(k) ? [k, v] : null; };
