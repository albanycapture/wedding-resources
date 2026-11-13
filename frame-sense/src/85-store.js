/* ============================================================
   PROGRESS — saved in this browser, and synced to the player's own
   private space when the page runs inside Claude.
   ============================================================ */
const STORE_KEY = 'frame-sense:v1';
const blankProgress = () => ({ v: 1, levels: {}, tags: {}, totals: { frames: 0, keepers: 0, streak: 0 }, settings: { sound: true, openAll: false }, updated: 0 });
let P = blankProgress();
const Sync = { state: 'local', doc: null, busy: false, dirty: false, timer: 0 };

function loadLocal() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) P = mergeProgress(blankProgress(), JSON.parse(raw));
  } catch (e) { /* private window or blocked storage: play on without it */ }
}
function saveLocal() {
  try { window.localStorage.setItem(STORE_KEY, JSON.stringify(P)); } catch (e) { /* not available */ }
}
/* Best-of merge, so two devices never undo each other. */
function mergeProgress(a, b) {
  if (!b || typeof b !== 'object') return a;
  const out = blankProgress();
  const newer = (b.updated || 0) > (a.updated || 0) ? b : a;
  out.updated = Math.max(a.updated || 0, b.updated || 0);
  out.settings = Object.assign({}, out.settings, a.settings, newer.settings);
  const ids = new Set(Object.keys(a.levels || {}).concat(Object.keys(b.levels || {})));
  for (const id of ids) {
    const x = (a.levels || {})[id] || {}, y = (b.levels || {})[id] || {};
    const pick = (f, better) => (x[f] == null ? y[f] : y[f] == null ? x[f] : better(x[f], y[f]));
    out.levels[id] = {
      stars: Math.max(x.stars || 0, y.stars || 0), plays: Math.max(x.plays || 0, y.plays || 0),
      acc: pick('acc', Math.max), pace: pick('pace', Math.min), score: pick('score', Math.max), keepers: pick('keepers', Math.max),
    };
  }
  const tags = new Set(Object.keys(a.tags || {}).concat(Object.keys(b.tags || {})));
  for (const t of tags) {
    const x = (a.tags || {})[t], y = (b.tags || {})[t];
    out.tags[t] = !x ? y : !y ? x : ((y.n || 0) > (x.n || 0) ? y : x);
  }
  const ta = a.totals || {}, tb = b.totals || {};
  out.totals = { frames: Math.max(ta.frames || 0, tb.frames || 0), keepers: Math.max(ta.keepers || 0, tb.keepers || 0), streak: Math.max(ta.streak || 0, tb.streak || 0) };
  return out;
}
function saveProgress() {
  P.updated = Date.now();
  saveLocal();
  if (Sync.doc) { Sync.dirty = true; clearTimeout(Sync.timer); Sync.timer = setTimeout(pushRemote, 1200); }
}
async function pushRemote() {
  if (!Sync.doc || Sync.busy || !Sync.dirty) return;
  Sync.busy = true; Sync.dirty = false;
  try { await Sync.doc.set(JSON.parse(JSON.stringify(P))); Sync.state = 'synced'; }
  catch (e) { Sync.state = 'local'; }
  Sync.busy = false;
  if (Sync.dirty) pushRemote();
  if (typeof onSyncChange === 'function') onSyncChange();
}
/* Inside Claude the page can keep each player's progress in their own private documents. */
async function connectSync() {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    const uid = await user.id();
    if (!uid) return;
    const doc = db.doc('data/users/' + uid + '/progress');
    const snap = await doc.get();
    const before = JSON.stringify(P.levels) + JSON.stringify(P.totals);
    if (snap && snap.exists) P = mergeProgress(P, snap.data());
    Sync.doc = doc; Sync.state = 'synced';
    saveLocal();
    const after = JSON.stringify(P.levels) + JSON.stringify(P.totals);
    if (!snap || !snap.exists || before !== after || JSON.stringify(snap.data().levels || {}) !== JSON.stringify(P.levels)) { Sync.dirty = true; pushRemote(); }
    if (typeof onSyncChange === 'function') onSyncChange();
  } catch (e) { Sync.state = 'local'; }
}

/* ---- records ---- */
const levelRec = id => P.levels[id] || { stars: 0, plays: 0 };
const isOpen = level => P.settings.openAll || level.n === 1 || levelRec(LEVELS[level.n - 2].id).stars > 0;
const nextLevel = () => LEVELS.find(l => levelRec(l.id).stars === 0) || null;
function recordTag(tag, ok) {
  const t = P.tags[tag] || (P.tags[tag] = { n: 0, miss: 0, last: '' });
  t.n++; if (!ok) t.miss++;
  t.last = (t.last + (ok ? '1' : '0')).slice(-12);
}
/* Miss rate over the most recent attempts at each kind of frame. */
function weakSpots(limit) {
  const out = [];
  for (const tag of Object.keys(P.tags)) {
    const t = P.tags[tag];
    if (!t.last || t.last.length < 3) continue;
    const miss = t.last.split('').filter(c => c === '0').length / t.last.length;
    if (miss >= 0.2) out.push({ tag, miss, n: t.last.length });
  }
  out.sort((a, b) => b.miss - a.miss || b.n - a.n);
  return out.slice(0, limit || 4);
}
function recordRun(level, res, stars) {
  const r = P.levels[level.id] || (P.levels[level.id] = { stars: 0, plays: 0 });
  r.plays = (r.plays || 0) + 1;
  r.stars = Math.max(r.stars || 0, stars);
  if (res.acc != null) r.acc = Math.max(r.acc || 0, res.acc);
  if (res.pace != null && res.quick >= 5) r.pace = r.pace == null ? res.pace : Math.min(r.pace, res.pace);
  if (res.avg != null) r.score = Math.max(r.score || 0, res.avg);
  if (res.keepers != null) r.keepers = Math.max(r.keepers || 0, res.keepers);
  P.totals.frames += res.total; P.totals.keepers += res.keepers;
  P.totals.streak = Math.max(P.totals.streak || 0, res.streak || 0);
  saveProgress();
}
