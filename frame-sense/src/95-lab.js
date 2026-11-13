/* ============================================================
   CROP LAB — practise on your own photos.
   Nothing leaves this browser: each photo is resized here and kept
   in this device's own storage, so it is there next time.
   ============================================================ */
const LAB_RATIOS = [['4:5', 0.8], ['1:1', 1], ['9:16', 9 / 16], ['16:9', 16 / 9], ['5:7', 5 / 7], ['2:3', 2 / 3], ['3:2', 1.5], ['2:1', 2]];
const SHEET_RATIOS = ['4:5', '1:1', '9:16', '16:9', '5:7', '2:1'];
const Lab = { photos: [], cur: 0, ratio: '4:5', tool: null, drawing: null, loaded: false, db: null };
const labAspect = key => LAB_RATIOS.find(r => r[0] === key)[1];

function labOpenDB() {
  return new Promise(resolve => {
    try {
      const rq = window.indexedDB.open('frame-sense-lab', 1);
      rq.onupgradeneeded = () => { rq.result.createObjectStore('photos', { keyPath: 'id' }); };
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => resolve(null);
      rq.onblocked = () => resolve(null);
    } catch (e) { resolve(null); }
  });
}
function labPut(p) {
  if (!Lab.db) return;
  try { Lab.db.transaction('photos', 'readwrite').objectStore('photos').put({ id: p.id, w: p.w, h: p.h, blob: p.blob, subject: p.subject, crops: p.crops }); } catch (e) { /* storage full or blocked */ }
}
function labDel(id) {
  if (!Lab.db) return;
  try { Lab.db.transaction('photos', 'readwrite').objectStore('photos').delete(id); } catch (e) { /* ignore */ }
}
async function labLoad() {
  if (Lab.loaded) return;
  Lab.loaded = true;
  Lab.db = await labOpenDB();
  if (!Lab.db) return;
  const rows = await new Promise(resolve => {
    try {
      const rq = Lab.db.transaction('photos', 'readonly').objectStore('photos').getAll();
      rq.onsuccess = () => resolve(rq.result || []);
      rq.onerror = () => resolve([]);
    } catch (e) { resolve([]); }
  });
  for (const r of rows) {
    if (!r || !r.blob) continue;
    Lab.photos.push({ id: r.id, w: r.w, h: r.h, blob: r.blob, url: URL.createObjectURL(r.blob), subject: r.subject || null, crops: r.crops || {} });
  }
}
function labDecode(file) {
  const viaImg = () => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src = url;
  });
  return window.createImageBitmap ? window.createImageBitmap(file).catch(viaImg) : viaImg();
}
async function labAddFiles(files) {
  let added = 0, failed = 0;
  for (const f of Array.from(files || []).slice(0, 24)) {
    try {
      const bmp = await labDecode(f);
      const bw = bmp.naturalWidth || bmp.width, bh = bmp.naturalHeight || bmp.height;
      const s = Math.min(1, 1800 / Math.max(bw, bh)), w = Math.round(bw * s), h = Math.round(bh * s);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(bmp, 0, 0, w, h);
      const blob = await new Promise(resolve => cv.toBlob(resolve, 'image/jpeg', 0.88));
      if (!blob) throw new Error('encode');
      const p = { id: 'p' + Date.now() + '-' + Math.floor(Math.random() * 1e6), w, h, blob, url: URL.createObjectURL(blob), subject: null, crops: {} };
      Lab.photos.push(p);
      labPut(p);
      added++;
    } catch (e) { failed++; }
  }
  if (failed) toast(failed === 1 ? 'One file could not be read. Export it as a JPEG and try again.' : failed + ' files could not be read. Export them as JPEGs and try again.');
  if (added) { Lab.cur = Lab.photos.length - added; renderLab(); }
}
function layoutLab() {
  const host = byId('labHost'), st = byId('labStage');
  if (!host || !Lab.photos.length) return;
  const p = Lab.photos[Lab.cur], a = p.w / p.h;
  const W = Math.min(st.clientWidth - 32, 1080), H = st.clientHeight - 32;
  if (W <= 0 || H <= 0) return;
  const w = Math.min(W, H * a);
  host.style.width = Math.floor(w) + 'px'; host.style.height = Math.floor(w / a) + 'px';
  if (Lab.tool) Lab.tool.relayout();
}
function labKeep() {
  const p = Lab.photos[Lab.cur];
  if (p && Lab.tool) { p.crops[Lab.ratio] = Lab.tool.value(); labPut(p); }
}
function labMountTool() {
  const p = Lab.photos[Lab.cur];
  if (Lab.tool) Lab.tool.destroy();
  Lab.tool = CropTool(byId('labHost'), { source: rect(0, 0, p.w, p.h), aspect: labAspect(Lab.ratio), start: p.crops[Lab.ratio] || null });
  if (p.subject) Lab.tool.showRect(p.subject, 'ct-mark');
}
function renderLab() {
  const has = Lab.photos.length > 0;
  byId('labEmpty').hidden = has;
  byId('labTray').hidden = !has;
  if (Lab.tool) { Lab.tool.destroy(); Lab.tool = null; }
  if (Lab.drawing) { Lab.drawing.cancel(); Lab.drawing = null; }
  if (!has) {
    byId('labFrames').innerHTML = '';
    byId('labConsole').innerHTML = `<p class="muted">Nothing is uploaded. Photos are resized in this browser and kept on this device only.</p>`;
    return;
  }
  Lab.cur = clamp(Lab.cur, 0, Lab.photos.length - 1);
  const p = Lab.photos[Lab.cur];
  byId('labTray').innerHTML = Lab.photos.map((q, i) => `<button type="button" data-photo="${i}" aria-current="${i === Lab.cur}" aria-label="Photo ${i + 1} of ${Lab.photos.length}"><img src="${q.url}" alt=""></button>`).join('');
  byId('labFrames').innerHTML = `<div class="frame" id="labHost"><img src="${p.url}" alt="Your photo" draggable="false"></div>`;
  layoutLab();
  labMountTool();
  renderLabConsole();
}
function renderLabConsole(extra) {
  const p = Lab.photos[Lab.cur];
  byId('labConsole').innerHTML =
    `<div class="ask"><div class="ask-text">Re-crop for ${Lab.ratio}<small>${p.subject ? 'Subject marked. Check the crop for a rough score.' : 'Mark your subject to get a rough score for each crop.'}</small></div></div>` +
    `<div class="segs" role="group" aria-label="Ratio">` + LAB_RATIOS.map(r => `<button type="button" class="seg" data-ratio="${r[0]}" aria-pressed="${r[0] === Lab.ratio}">${r[0]}</button>`).join('') + `</div>` +
    (extra || '') +
    `<div class="row"><button type="button" class="btn btn-primary" id="labCheck">Check crop</button><button type="button" class="btn" id="labMark">${p.subject ? 'Re-mark subject' : 'Mark subject'}</button>` +
    `<button type="button" class="btn" id="labSheet">Delivery sheet</button><button type="button" class="btn btn-quiet" id="labRemove">Remove photo</button></div>`;
}
/* A rough score from the one thing the game knows about your photo: the box you drew. */
function scorePhotoCrop(p, c, a) {
  const S = p.subject, notes = [];
  const maxW = Math.min(p.w, p.h * a), maxH = maxW / a;
  const ix = Math.max(0, Math.min(rRight(S), rRight(c)) - Math.max(S.x, c.x)), iy = Math.max(0, Math.min(rBottom(S), rBottom(c)) - Math.max(S.y, c.y));
  const cover = (ix * iy) / (S.w * S.h), whole = cover > 0.985, canFit = S.w <= maxW && S.h <= maxH;
  if (cover < 0.02) return { score: 0, notes: [note(false, 'Your subject is outside this crop. Move the box over them.', 0, 100)] };
  if (whole) notes.push(note(true, 'Your subject is whole.', 40, 40));
  else if (!canFit) notes.push(note('part', `This ratio cannot hold the whole subject from this frame. Your crop keeps ${Math.round(cover * 100)}% of it.`, 40 * cover, 40));
  else notes.push(note(false, `The crop cuts into your subject and keeps ${Math.round(cover * 100)}% of it.`, 40 * Math.max(0, cover - 0.5), 40));
  const m = Math.min(S.x - c.x, rRight(c) - rRight(S), S.y - c.y, rBottom(c) - rBottom(S)) / Math.min(c.w, c.h);
  notes.push(!whole ? note(false, 'No room to breathe on at least one side.', 0, 20) : m >= 0.03 ? note(true, 'Room on every side.', 20, 20) : note('part', 'The subject is pressed against an edge.', 20 * clamp(m / 0.03, 0, 1), 20));
  const dx = (S.x + S.w / 2 - (c.x + c.w / 2)) / c.w, ax = Math.abs(dx);
  if (ax <= 0.06) notes.push(note(true, 'Centred.', 25, 25));
  else if (Math.abs(ax - 1 / 6) <= 0.04) notes.push(note(true, `On the ${dx < 0 ? 'left' : 'right'} third.`, 25, 25));
  else notes.push(note('part', `Neither centred nor on a third. The subject sits ${Math.round(ax * 100)}% off centre.`, 25 * clamp(1 - Math.min(ax - 0.06, Math.abs(ax - 1 / 6) - 0.04) / 0.09, 0, 1), 25));
  const hr = (S.y - c.y) / c.h;
  notes.push(hr >= 0.03 && hr <= 0.22 ? note(true, `Headroom is ${Math.round(hr * 100)}% of the frame.`, 15, 15)
    : hr < 0.03 ? note('part', 'Headroom is tight.', 9 * clamp(hr / 0.03, 0, 1), 15)
      : note('part', `Headroom is heavy at ${Math.round(hr * 100)}% of the frame.`, 15 * clamp(1 - (hr - 0.22) / 0.2, 0, 1), 15));
  return { score: sumNotes(notes), notes };
}
function labCheck() {
  const p = Lab.photos[Lab.cur];
  if (!p || !Lab.tool) return;
  labKeep();
  if (!p.subject) { renderLabConsole(`<p class="muted">Draw a box around your subject first. Tap Mark subject.</p>`); return; }
  const res = scorePhotoCrop(p, Lab.tool.value(), labAspect(Lab.ratio));
  renderLabConsole(`<div class="scoreline"><b>${res.score}</b><span class="muted">of 100. A rough check, based on the box you drew.</span></div>` + notesHTML(res.notes));
  layoutLab();
}
function labMark() {
  const p = Lab.photos[Lab.cur];
  if (!p) return;
  labKeep();
  if (Lab.tool) { Lab.tool.destroy(); Lab.tool = null; }
  byId('labConsole').innerHTML = `<div class="ask"><div class="ask-text">Drag a box around your subject<small>Head to toe, or as much of them as the frame holds.</small></div><div class="row"><button type="button" class="btn" id="labMarkCancel">Cancel</button></div></div>`;
  Lab.drawing = drawRect(byId('labHost'), rect(0, 0, p.w, p.h), r => {
    p.subject = r; Lab.drawing = null;
    labPut(p); labMountTool(); renderLabConsole(); layoutLab();
  });
  layoutLab();
}
function labMarkCancel() {
  if (Lab.drawing) { Lab.drawing.cancel(); Lab.drawing = null; }
  labMountTool(); renderLabConsole(); layoutLab();
}
function labSheet() {
  const p = Lab.photos[Lab.cur];
  if (!p) return;
  labKeep();
  const img = byId('labHost').querySelector('img');
  renderLabConsole(`<div class="sheet-out" id="sheetOut"></div>`);
  const out = byId('sheetOut');
  for (const key of SHEET_RATIOS) {
    const a = labAspect(key), set = p.crops[key];
    let c = set;
    if (!c) {
      const w = Math.min(p.w, p.h * a), h = w / a;
      const cx = p.subject ? p.subject.x + p.subject.w / 2 : p.w / 2, cy = p.subject ? p.subject.y + p.subject.h / 2 : p.h / 2;
      c = rect(clamp(cx - w / 2, 0, p.w - w), clamp(cy - h / 2, 0, p.h - h), w, h);
    }
    const cv = document.createElement('canvas');
    cv.width = 260; cv.height = Math.round(260 / a);
    try { cv.getContext('2d').drawImage(img, c.x, c.y, c.w, c.h, 0, 0, cv.width, cv.height); } catch (e) { /* image not ready */ }
    const fig = document.createElement('figure'), cap = document.createElement('figcaption');
    cap.textContent = key + (set ? '' : ' · not set yet');
    fig.appendChild(cv); fig.appendChild(cap); out.appendChild(fig);
  }
  layoutLab();
}
function labRemove() {
  const p = Lab.photos[Lab.cur];
  if (!p) return;
  try { URL.revokeObjectURL(p.url); } catch (e) { /* ignore */ }
  labDel(p.id);
  Lab.photos.splice(Lab.cur, 1);
  renderLab();
}
async function openLab() {
  await labLoad();
  show('lab');
  renderLab();
}
function leaveLab() {
  labKeep();
  if (Lab.tool) { Lab.tool.destroy(); Lab.tool = null; }
  if (Lab.drawing) { Lab.drawing.cancel(); Lab.drawing = null; }
  goHome();
}
