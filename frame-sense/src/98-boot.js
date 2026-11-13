/* ============================================================
   WIRING — clicks, keys, resizing, and start-up.
   ============================================================ */
function onClick(e) {
  const t = e.target.closest ? e.target.closest('button') : null;
  if (!t || t.disabled) return;
  const run = App.run, d = t.dataset;
  /* drill answers first: they are the hot path */
  if (App.screen === 'drill' && run) {
    if (t.id === 'drillExit') { askLeave(); return; }
    if (t.id === 'btnStay') { stayInRun(); return; }
    if (t.id === 'btnLeave') { leaveRun(); return; }
    if (run.leaving) return;
    if (t.id === 'btnNext' || t.id === 'btnNextMake') { nextStep(); return; }
    if (t.id === 'btnRef') { if (run.tool && run.item.ref) { run.tool.showRect(run.item.ref, 'ct-ref', 'one strong answer'); t.disabled = true; } return; }
    if (t.id === 'btnLock') { if (run.item.kind === 'make') lockCrop(); else answer(); return; }
    if (run.state !== 'asking') return;
    if (d.edge) { answer(d.edge); return; }
    if (d.pick) { answer(d.pick); return; }
    if (d.key && t.classList.contains('opt')) { if (run.item.kind === 'multi') togglePick(d.key); else answer(d.key); }
    return;
  }
  if (d.level) { openLevel(d.level); return; }
  if (d.nav === 'home') { goHome(); return; }
  if (d.again) { if (App.last) startRun(App.last); return; }
  if (d.photo != null) { labKeep(); Lab.cur = Number(d.photo); renderLab(); return; }
  if (d.ratio) { labKeep(); Lab.ratio = d.ratio; labMountTool(); renderLabConsole(); layoutLab(); return; }
  switch (t.id) {
    case 'btnStart': if (App.level) startRun(App.level); break;
    case 'btnGuide': openGuide(); break;
    case 'btnSound':
      P.settings.sound = P.settings.sound === false;
      saveProgress(); renderHome();
      if (P.settings.sound) Sound.shutter();
      break;
    case 'btnWeak': startWeak(); break;
    case 'btnLab': openLab(); break;
    case 'btnOpenAll': P.settings.openAll = !P.settings.openAll; saveProgress(); renderHome(); break;
    case 'btnReset':
      byId('foot').innerHTML = `<span class="confirm">Erase every star and score? <button type="button" id="btnResetYes">Erase</button><button type="button" id="btnResetNo">Keep</button></span>`;
      break;
    case 'btnResetYes': { const keep = P.settings; P = blankProgress(); P.settings = keep; P.settings.openAll = false; saveProgress(); renderHome(); toast('Progress erased.'); break; }
    case 'btnResetNo': renderHome(); break;
    case 'labExit': leaveLab(); break;
    case 'labAdd': case 'labAdd2': byId('labFile').click(); break;
    case 'labCheck': labCheck(); break;
    case 'labMark': labMark(); break;
    case 'labMarkCancel': labMarkCancel(); break;
    case 'labSheet': labSheet(); break;
    case 'labRemove': labRemove(); break;
    default: break;
  }
}

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key, run = App.run;
  if (App.screen === 'drill' && run) {
    if (run.leaving) { if (key === 'Escape') { e.preventDefault(); stayInRun(); } return; }
    if (key === 'Escape') { e.preventDefault(); askLeave(); return; }
    const item = run.item;
    if (run.state === 'feedback') {
      if (key === 'Enter' || key === ' ') { e.preventDefault(); nextStep(); }
      return;
    }
    if (run.state !== 'asking' || !item) return;
    const k = item.kind;
    let val = null;
    if (k === 'pick' || k === 'multi') {
      const i = '123456'.indexOf(key);
      if (i >= 0 && key.length === 1 && i < item.options.length) {
        e.preventDefault();
        if (k === 'multi') togglePick(item.options[i].key); else answer(item.options[i].key);
      } else if (k === 'multi' && key === 'Enter') { e.preventDefault(); answer(); }
      return;
    }
    if (k === 'edge') val = { ArrowUp: 'top', ArrowRight: 'right', ArrowDown: 'bottom', ArrowLeft: 'left', ' ': 'clean', c: 'clean', C: 'clean' }[key];
    else if (k === 'ab') val = { ArrowLeft: 'a', ArrowRight: 'b', ArrowUp: 'a', ArrowDown: 'b', a: 'a', A: 'a', b: 'b', B: 'b', 1: 'a', 2: 'b' }[key];
    else if (k === 'print') val = { f: 'fits', F: 'fits', c: 'cuts', C: 'cuts', 1: 'fits', 2: 'cuts' }[key];
    else if (k === 'make') {
      if (key === 'Enter') { e.preventDefault(); lockCrop(); }
      else if (run.tool) run.tool.key(e);
      return;
    }
    if (val) { e.preventDefault(); answer(val); }
    return;
  }
  if (key === 'Escape') {
    if (App.screen === 'lab') leaveLab();
    else if (App.screen !== 'home') goHome();
    return;
  }
  const tag = e.target && e.target.tagName;
  if (key === 'Enter' && tag !== 'BUTTON' && tag !== 'INPUT') {
    if (App.screen === 'level' && App.level) { e.preventDefault(); startRun(App.level); }
  }
}

function start(saved) {
  loadLocal();
  buildThumbs();
  renderHome();
  show('home');
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  /* after a miss, a tap on the picture moves on (with a short guard against double taps) */
  byId('stage').addEventListener('click', e => {
    const run = App.run;
    if (!run || run.state !== 'feedback' || run.leaving || byId('btnNext').hidden) return;
    if (e.target.closest && e.target.closest('#btnNext, .leave')) return;
    const last = run.log[run.log.length - 1];
    if (last && performance.now() - (run.t0 + last.ms) > 700) nextStep();
  });
  byId('labFile').addEventListener('change', e => { labAddFiles(e.target.files); e.target.value = ''; });
  const ls = byId('labStage');
  ls.addEventListener('dragover', e => { e.preventDefault(); });
  ls.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer) labAddFiles(e.dataTransfer.files); });
  const relayout = () => { layoutFrames(); if (App.screen === 'lab') layoutLab(); };
  if (window.ResizeObserver) { const ro = new ResizeObserver(relayout); ro.observe(byId('stage')); ro.observe(byId('labStage')); }
  window.addEventListener('resize', relayout);
  document.addEventListener('visibilitychange', () => { if (App.run) App.run.lastTick = performance.now(); });
  if (saved && saved.level && levelById(saved.level) && isOpen(levelById(saved.level))) openLevel(saved.level);
  connectSync();
}

/* Dev hook used by the automated checks. Harmless in normal play. */
window.FrameSense = { App, LEVELS, P: () => P, startRun, levelById, makeItem, inspectCrop, faultsOf, RNG, answer, lockCrop, nextStep, finishRun, openLevel, goHome };

/* When the page is republished while someone has it open, come back to the level they were on. */
const hot = window.claude && window.claude.hot;
try { if (hot && typeof hot.snapshot === 'function') hot.snapshot(() => ({ level: App.screen !== 'home' && App.level ? App.level.id : null })); } catch (e) { /* not in a viewer */ }
if (hot && typeof hot.ready === 'function') hot.ready(start); else start((hot && hot.data) || {});
