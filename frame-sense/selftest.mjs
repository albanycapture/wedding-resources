// Generator self-test: builds thousands of questions and checks each one
// against the same judging rules the game uses. Run: node selftest.mjs [count]
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
const here = dirname(fileURLToPath(import.meta.url));
const LOGIC = ['30-util.js', '40-figures.js', '50-env.js', '55-details.js', '60-scenes.js', '65-judge.js', '66-items.js', '67-make.js'];
const code = LOGIC.map(f => readFileSync(join(here, 'src', f), 'utf8')).join('\n');
const N = Number(process.argv[2] || 300);
const ctx = vm.createContext({ console, Math, Date, document: { querySelector: () => null, querySelectorAll: () => [] } });
vm.runInContext(code + `
globalThis.__api = { RNG, genCrop, genDevice, genStack, genEdge, genAB, genPrint, genRecrop, genBrief, genCompose, inspectCrop, faultsOf, classifyCrop, CROPS, DEVICES, EDGE_OF_SUB, AB_FLAWS, PRINTS, COMPOSE_KEYS, RECIPES, flagKey, frameSVG, rContains, rect };
`, ctx);
const A = ctx.__api;
let fails = 0;
const bad = (m) => { fails++; if (fails < 40) console.log('  FAIL', m); };
function run(name, n, fn) {
  const t0 = Date.now(); let errs = 0; const counts = {};
  for (let i = 0; i < n; i++) {
    const R = A.RNG(1000 + i * 7919);
    try { const key = fn(R, i); counts[key] = (counts[key] || 0) + 1; }
    catch (e) { errs++; if (errs < 4) console.log('  THROW', name, e.message); }
  }
  fails += errs;
  console.log(`${name.padEnd(12)} n=${n} throws=${errs} ${((Date.now() - t0) / n).toFixed(1)}ms/item  ${JSON.stringify(counts)}`);
}
const ratioOK = (c, set) => set.some(a => Math.abs(c.w / c.h - a) < 0.01);
run('crop', N, (R, i) => {
  const type = A.CROPS[i % 6].key; const it = A.genCrop(R, type);
  if (it.answer !== type) bad('crop answer');
  if (!ratioOK(it.crop, [1.5, 2 / 3])) bad('crop ratio ' + it.crop.w / it.crop.h);
  if (type !== 'detail') { if (A.faultsOf(A.inspectCrop(it.scene, it.crop)).length) bad('crop has faults ' + type); }
  if (A.frameSVG(it.scene, it.crop).includes('NaN')) bad('NaN in svg ' + type);
  return type;
});
run('device', N, (R, i) => { const k = A.DEVICES[i % 6].key; const it = A.genDevice(R, k); if (A.frameSVG(it.scene, it.crop).includes('NaN')) bad('NaN device ' + k); return k; });
run('stack', N, (R) => { const it = A.genStack(R); if (!it.answer.length) bad('stack empty'); if (A.frameSVG(it.scene, it.crop).includes('NaN')) bad('NaN stack'); return it.answer.join('+'); });
run('edge', N, (R, i) => {
  const subs = Object.keys(A.EDGE_OF_SUB); const sub = subs[i % subs.length]; const it = A.genEdge(R, sub);
  const f = A.faultsOf(A.inspectCrop(it.scene, it.crop));
  if (it.answer === 'clean') { if (f.length) bad('edge clean has faults'); }
  else { if (!f.length) bad('edge no fault ' + sub); if (f.some(x => x.edge !== it.answer)) bad('edge wrong edge ' + sub + ' ' + f.map(x => x.edge)); }
  if (!ratioOK(it.crop, [1.5, 2 / 3])) bad('edge ratio');
  return it.tag;
});
run('ab', N, (R, i) => {
  const fl = A.AB_FLAWS[i % A.AB_FLAWS.length][0]; const it = A.genAB(R, fl);
  const g = it.answer === 'a' ? it.a : it.b, b = it.answer === 'a' ? it.b : it.a;
  if (A.faultsOf(A.inspectCrop(it.scene, g.crop)).length || g.tilt) bad('ab good is flawed ' + fl);
  if (!b.tilt && !A.faultsOf(A.inspectCrop(it.scene, b.crop)).length) bad('ab bad is clean ' + fl);
  if (Math.abs(g.crop.w / g.crop.h - b.crop.w / b.crop.h) > 0.01) bad('ab ratios differ');
  if (/\{(bad|good)\}/.test(it.why)) bad('ab why template');
  return it.tag;
});
run('print', N, (R) => { const it = A.genPrint(R); if (!A.rContains(it.crop, it.need, -1)) bad('print need outside'); return it.target.key + ':' + it.answer; });
run('recrop', Math.ceil(N / 3), (R) => { const it = A.genRecrop(R); const s = it.score(it.ref); if (s.score < 92) bad('recrop ref ' + s.score); if (Math.abs(it.ref.w / it.ref.h - it.aspect) > 0.01) bad('recrop ref ratio'); return it.tag; });
run('brief', N, (R, i) => { const t = ['wide', 'full', 'threeq', 'waist', 'tight'][i % 5]; const it = A.genBrief(R, t); const s = it.score(it.ref); if (s.score < 92) bad('brief ref ' + s.score); if (!A.rContains(it.source, it.ref, -1)) bad('brief ref outside'); return t; });
run('compose', N, (R, i) => { const k = A.COMPOSE_KEYS[i % A.COMPOSE_KEYS.length]; const it = A.genCompose(R, k); const s = it.score(it.ref); if (s.score < 92) bad('compose ref ' + s.score);
  // a deliberately poor crop must not pass
  const junk = A.rect(it.source.x, it.source.y, it.source.h * 0.2 * it.aspect, it.source.h * 0.2); if (it.score(junk).score >= 75) bad('compose junk passes ' + k);
  return k; });
console.log(fails ? `\n${fails} problem(s)` : '\nall generators clean');
process.exit(fails ? 1 : 0);
