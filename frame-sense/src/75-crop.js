/* ============================================================
   CROP TOOL — a fixed-ratio crop box over a picture.
   Mouse: drag the box or its corners, wheel to resize.
   Touch: drag anywhere, pull a corner, or pinch.
   Keys:  arrows move, + and - resize.
   The host element is sized by the caller to the picture's ratio.
   ============================================================ */
function CropTool(host, o) {
  const src = o.source, aspect = o.aspect;
  const maxW = Math.min(src.w, src.h * aspect);
  let crop = o.start ? Object.assign({}, o.start) : rect(src.x + (src.w - maxW * 0.7) / 2, src.y + (src.h - maxW * 0.7 / aspect) / 2, maxW * 0.7, maxW * 0.7 / aspect);
  let locked = false, raf = 0;
  const extras = [];
  host.classList.add('ct');
  host.classList.remove('is-locked');
  const box = document.createElement('div');
  box.className = 'ct-box';
  box.tabIndex = 0;
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'Crop box. Arrow keys move it, plus and minus resize it.');
  box.innerHTML = '<div class="ct-grid"></div><div class="ct-h" data-c="nw"></div><div class="ct-h" data-c="ne"></div><div class="ct-h" data-c="sw"></div><div class="ct-h" data-c="se"></div>';
  host.appendChild(box);

  const k = () => (host.clientWidth || 1) / src.w;
  const minW = () => Math.min(maxW, Math.max(src.w * 0.07, 44 / k(), 44 / k() * aspect));
  const place = (node, r) => {
    const s = k();
    node.style.left = (r.x - src.x) * s + 'px'; node.style.top = (r.y - src.y) * s + 'px';
    node.style.width = r.w * s + 'px'; node.style.height = r.h * s + 'px';
  };
  function paint() {
    raf = 0;
    place(box, crop);
    for (const ex of extras) place(ex.node, ex.rect);
  }
  const queue = () => { if (!raf) raf = requestAnimationFrame(paint); };
  function fit(c) {
    const w = clamp(c.w, minW(), maxW), h = w / aspect;
    return rect(clamp(c.x, src.x, rRight(src) - w), clamp(c.y, src.y, rBottom(src) - h), w, h);
  }
  function set(c) { crop = fit(c); queue(); if (o.onChange) o.onChange(crop); }
  function scaleAbout(c, f) {
    const w = clamp(c.w * f, minW(), maxW), h = w / aspect;
    return rect(c.x + c.w / 2 - w / 2, c.y + c.h / 2 - h / 2, w, h);
  }
  function resizeFrom(start, corner, dx, dy) {
    const east = corner === 'ne' || corner === 'se', south = corner === 'sw' || corner === 'se';
    const ax = east ? start.x : rRight(start), ay = south ? start.y : rBottom(start);
    const w1 = start.w + (east ? dx : -dx), w2 = (start.h + (south ? dy : -dy)) * aspect;
    const room = Math.min(east ? rRight(src) - ax : ax - src.x, (south ? rBottom(src) - ay : ay - src.y) * aspect);
    const w = clamp((w1 + w2) / 2, Math.min(minW(), room), room), h = w / aspect;
    crop = rect(east ? ax : ax - w, south ? ay : ay - h, w, h);
    queue();
    if (o.onChange) o.onChange(crop);
  }

  /* ---- pointers ---- */
  const ptrs = new Map();
  let mode = null, start = null, startPt = null, corner = null, pinch = null;
  const dist = () => { const p = Array.from(ptrs.values()); return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1; };
  function down(e) {
    if (locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    try { host.setPointerCapture(e.pointerId); } catch (_) { /* older browsers */ }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { mode = 'pinch'; pinch = { d: dist(), crop: Object.assign({}, crop) }; return; }
    const hd = e.target.closest ? e.target.closest('.ct-h') : null;
    mode = hd ? 'resize' : 'move';
    corner = hd ? hd.dataset.c : null;
    start = Object.assign({}, crop);
    startPt = { x: e.clientX, y: e.clientY };
    if (e.pointerType === 'mouse') box.focus({ preventScroll: true });
  }
  function move(e) {
    if (!ptrs.has(e.pointerId) || locked) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = k();
    if (mode === 'pinch' && ptrs.size >= 2) set(scaleAbout(pinch.crop, dist() / pinch.d));
    else if (mode === 'move') set(rect(start.x + (e.clientX - startPt.x) / s, start.y + (e.clientY - startPt.y) / s, start.w, start.h));
    else if (mode === 'resize') resizeFrom(start, corner, (e.clientX - startPt.x) / s, (e.clientY - startPt.y) / s);
  }
  function up(e) {
    ptrs.delete(e.pointerId);
    if (ptrs.size === 0) mode = null;
    else if (mode === 'pinch') {
      /* one finger left: carry on as a drag from where it is */
      const p = Array.from(ptrs.values())[0];
      mode = 'move'; start = Object.assign({}, crop); startPt = { x: p.x, y: p.y };
    }
  }
  function wheel(e) {
    if (locked) return;
    e.preventDefault();
    set(scaleAbout(crop, e.deltaY > 0 ? 0.96 : 1.04));
  }
  function key(e) {
    if (locked) return;
    const stepU = src.w * (e.shiftKey ? 0.04 : 0.01);
    const map = { ArrowLeft: [-stepU, 0], ArrowRight: [stepU, 0], ArrowUp: [0, -stepU], ArrowDown: [0, stepU] };
    if (map[e.key]) { e.preventDefault(); e.stopPropagation(); set(rect(crop.x + map[e.key][0], crop.y + map[e.key][1], crop.w, crop.h)); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); e.stopPropagation(); set(scaleAbout(crop, 1.035)); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); e.stopPropagation(); set(scaleAbout(crop, 0.965)); }
  }
  host.addEventListener('pointerdown', down);
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerup', up);
  host.addEventListener('pointercancel', up);
  host.addEventListener('wheel', wheel, { passive: false });
  box.addEventListener('keydown', key);
  paint();

  return {
    value: () => Object.assign({}, crop),
    set,
    key,
    focus: () => box.focus({ preventScroll: true }),
    relayout: paint,
    lock() { locked = true; host.classList.add('is-locked'); },
    /* show another rectangle on the picture, e.g. a reference answer */
    showRect(r, cls, label) {
      const node = document.createElement('div');
      node.className = cls;
      if (label) { const sp = document.createElement('span'); sp.textContent = label; node.appendChild(sp); }
      host.appendChild(node);
      extras.push({ node, rect: r });
      paint();
      return node;
    },
    destroy() {
      host.removeEventListener('pointerdown', down); host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerup', up); host.removeEventListener('pointercancel', up);
      host.removeEventListener('wheel', wheel);
      if (raf) cancelAnimationFrame(raf);
      box.remove();
      for (const ex of extras) ex.node.remove();
      host.classList.remove('ct', 'is-locked');
    },
  };
}

/* Drag out a free rectangle on a picture (used to mark the subject in Crop Lab). */
function drawRect(host, src, onDone) {
  host.classList.add('ct');
  const node = document.createElement('div');
  node.className = 'ct-mark';
  node.hidden = true;
  host.appendChild(node);
  let a = null, r = null;
  const pt = e => { const b = host.getBoundingClientRect(), s = src.w / (b.width || 1); return [clamp(src.x + (e.clientX - b.left) * s, src.x, rRight(src)), clamp(src.y + (e.clientY - b.top) * s, src.y, rBottom(src))]; };
  const paint = () => { const s = (host.clientWidth || 1) / src.w; node.style.left = (r.x - src.x) * s + 'px'; node.style.top = (r.y - src.y) * s + 'px'; node.style.width = r.w * s + 'px'; node.style.height = r.h * s + 'px'; };
  function down(e) { e.preventDefault(); try { host.setPointerCapture(e.pointerId); } catch (_) { /* fine */ } a = pt(e); r = rect(a[0], a[1], 0, 0); node.hidden = false; paint(); }
  function move(e) { if (!a) return; const b = pt(e); r = rect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); paint(); }
  function up() { if (!a) return; a = null; if (r.w > src.w * 0.03 && r.h > src.h * 0.03) { stop(); onDone(r); } else node.hidden = true; }
  function stop() { host.removeEventListener('pointerdown', down); host.removeEventListener('pointermove', move); host.removeEventListener('pointerup', up); host.removeEventListener('pointercancel', up); node.remove(); }
  host.addEventListener('pointerdown', down); host.addEventListener('pointermove', move);
  host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
  return { cancel: stop };
}
