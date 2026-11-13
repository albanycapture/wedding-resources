/* ============================================================
   DETAIL SHOTS — rings, flowers, the table. No faces, just things.
   Each is a 1500 x 1000 still life with a known focus rectangle.
   ============================================================ */
const LINENS = [['#EFE8DC', '#DDD3C2'], ['#E6E9EA', '#CCD3D6'], ['#F3E7E2', '#E2CFC8'], ['#E3E6DB', '#CBD1BE'], ['#2F3438', '#22262A']];

function sprigSVG(R, x, y, len, ang, col) {
  let s = `<g transform="rotate(${r1(ang)} ${r1(x)} ${r1(y)})">`;
  s += `<path d="M${r1(x)} ${r1(y)} Q${r1(x + len * 0.5)} ${r1(y - len * 0.08)} ${r1(x + len)} ${r1(y)}" stroke="${shade(col, -0.25)}" stroke-width="${r1(len * 0.014)}" fill="none" stroke-linecap="round"/>`;
  const n = 7;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 0.5), px = x + len * t, py = y - Math.sin(t * Math.PI) * len * 0.04;
    const r = len * lerp(0.085, 0.045, t);
    for (const sd of [-1, 1]) {
      s += `<ellipse cx="${r1(px)}" cy="${r1(py + sd * r * 0.95)}" rx="${r1(r * 0.75)}" ry="${r1(r)}" transform="rotate(${r1(sd * -28)} ${r1(px)} ${r1(py + sd * r * 0.95)})" fill="${i % 2 ? col : shade(col, 0.12)}"/>`;
    }
  }
  return s + '</g>';
}
function bokehSVG(R, n, x0, y0, x1, y1, cols, rMin, rMax) {
  let s = '';
  for (let i = 0; i < n; i++) {
    s += `<circle cx="${r1(R.range(x0, x1))}" cy="${r1(R.range(y0, y1))}" r="${r1(R.range(rMin, rMax))}" fill="${R.pick(cols)}" opacity="${r1(R.range(0.18, 0.5))}"/>`;
  }
  return s;
}
function ringSVG(x, y, rx, ry, w, rot, gold, stone) {
  const g1 = shade(gold, 0.35), g2 = shade(gold, -0.28);
  let s = `<g transform="rotate(${rot} ${r1(x)} ${r1(y)})">`;
  s += `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="none" stroke="${g2}" stroke-width="${r1(w)}"/>`;
  s += `<ellipse cx="${r1(x)}" cy="${r1(y - w * 0.12)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="none" stroke="${gold}" stroke-width="${r1(w * 0.78)}"/>`;
  s += `<path d="M${r1(x - rx * 0.86)} ${r1(y - ry * 0.52)} A${r1(rx)} ${r1(ry)} 0 0 1 ${r1(x - rx * 0.1)} ${r1(y - ry * 1.0)}" fill="none" stroke="${g1}" stroke-width="${r1(w * 0.3)}" stroke-linecap="round"/>`;
  if (stone) {
    const sy = y - ry - w * 0.4, sw = w * 1.25;
    s += `<polygon points="${r1(x - sw)},${r1(sy - sw * 0.5)} ${r1(x - sw * 0.55)},${r1(sy - sw * 1.1)} ${r1(x + sw * 0.55)},${r1(sy - sw * 1.1)} ${r1(x + sw)},${r1(sy - sw * 0.5)} ${r1(x)},${r1(sy + sw * 0.75)}" fill="#EAF4FA"/>`;
    s += `<polygon points="${r1(x - sw)},${r1(sy - sw * 0.5)} ${r1(x + sw)},${r1(sy - sw * 0.5)} ${r1(x)},${r1(sy + sw * 0.75)}" fill="#BCD6E6"/>`;
    s += `<polygon points="${r1(x - sw * 0.3)},${r1(sy - sw * 0.5)} ${r1(x + sw * 0.3)},${r1(sy - sw * 0.5)} ${r1(x)},${r1(sy + sw * 0.75)}" fill="#F7FBFD"/>`;
  }
  return s + '</g>';
}

const DETAILS = {
  rings(R) {
    const ln = R.pick(LINENS.slice(0, 4)), gold = R.pick(['#D9B25A', '#E3C27A', '#D9B25A', '#D8A894', '#D5D9DE']);
    let defs = gradV('bg', 0, 1000, [ln[0], ln[1]]);
    let s = `<rect x="-300" y="-300" width="2100" height="1600" fill="url(#§bg)"/>`;
    s += `<g filter="url(#§soft)">` + bokehSVG(R, 9, -100, -100, 1600, 420, ['#FFFFFF', '#F6D5CF', '#F3E3B5'], 60, 150) + `</g>`;
    defs += `<filter id="§soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter>`;
    const box = R.pick(['#2F4A44', '#27344F', '#5B2A33', '#3A3F45', '#7A5C4A']);
    s += `<rect x="470" y="560" width="560" height="250" rx="26" fill="${shade(box, -0.25)}"/><rect x="470" y="545" width="560" height="225" rx="26" fill="${box}"/><rect x="500" y="570" width="500" height="170" rx="18" fill="${shade(box, 0.1)}"/>`;
    s += `<ellipse cx="760" cy="640" rx="250" ry="40" fill="#000" opacity=".14"/>`;
    s += ringSVG(690, 610, 140, 60, 26, 0, gold, false);
    s += ringSVG(830, 560, 104, 112, 22, 14, gold, true);
    s += sprigSVG(R, 150, 300, 420, 24, '#8FA58A') + sprigSVG(R, 1380, 760, 400, 196, '#7F977B');
    return { defs, svg: s, focus: rect(500, 330, 520, 480), label: 'the rings' };
  },
  bouquet(R) {
    const ln = R.pick(LINENS.slice(0, 4)), pal = R.pick(FLOWERS);
    let defs = gradV('bg', 0, 1000, [ln[0], ln[1]]);
    let s = `<rect x="-300" y="-300" width="2100" height="1600" fill="url(#§bg)"/>`;
    s += `<rect x="-300" y="640" width="2100" height="700" fill="${shade(ln[1], -0.1)}"/>`;
    s += `<ellipse cx="750" cy="800" rx="420" ry="46" fill="#000" opacity=".13"/>`;
    s += `<path d="M700 560 L640 930 M790 560 L850 930 M745 560 L745 950" stroke="#5F7D55" stroke-width="22" stroke-linecap="round"/>`;
    s += `<path d="M640 700 Q745 760 850 700 L850 760 Q745 820 640 760 Z" fill="#F4EDE0"/><path d="M800 745 Q900 860 860 990 M690 745 Q600 870 650 1000" stroke="#F4EDE0" stroke-width="30" fill="none" stroke-linecap="round"/>`;
    s += bouquetSVG(745, 400, 330, pal, R);
    return { defs, svg: s, focus: rect(380, 60, 730, 880), label: 'the bouquet' };
  },
  boutonniere(R) {
    const suit = R.pick(SUITS.slice(0, 6)), sd = shade(suit, -0.2), sl = shade(suit, 0.08), pal = R.pick(FLOWERS);
    let s = `<rect x="-300" y="-300" width="2100" height="1600" fill="${suit}"/>`;
    s += `<polygon points="560,-300 1040,-300 800,620" fill="#F6F3EC"/>`;
    s += `<polygon points="800,-120 860,20 830,540 800,620 770,540 740,20" fill="${R.pick(['#6B2B36', '#3E5A4B', '#1E2230', '#C9A24D'])}"/>`;
    s += `<polygon points="520,-300 800,620 330,330 250,-300" fill="${sd}"/><polygon points="1080,-300 800,620 1270,330 1350,-300" fill="${sd}"/>`;
    s += `<path d="M330 330 L800 620 M1270 330 L800 620" stroke="${sl}" stroke-width="8" fill="none"/>`;
    s += `<path d="M800 620 L812 1300" stroke="${sd}" stroke-width="10"/><circle cx="812" cy="820" r="26" fill="${sd}"/>`;
    s += `<rect x="1020" y="560" width="250" height="26" fill="${sd}"/><polygon points="1040,560 1090,470 1140,560" fill="#F6F3EC"/><polygon points="1110,560 1170,490 1230,560" fill="#EDE8DD"/>`;
    s += sprigSVG(R, 420, 470, 250, -62, '#7F977B');
    s += `<path d="M430 470 L400 640" stroke="#5F7D55" stroke-width="12" stroke-linecap="round"/>`;
    s += `<circle cx="440" cy="400" r="78" fill="${pal[0]}"/><circle cx="440" cy="400" r="50" fill="${pal[2]}"/><circle cx="440" cy="400" r="24" fill="${pal[3]}"/>`;
    s += `<circle cx="352" cy="462" r="46" fill="${pal[1]}"/><circle cx="352" cy="462" r="22" fill="${pal[2]}"/><circle cx="510" cy="470" r="38" fill="${pal[2]}"/>`;
    return { defs: '', svg: s, focus: rect(240, 180, 420, 520), label: 'the boutonniere' };
  },
  cake(R) {
    const wall = R.pick(['#D9CDBD', '#C9D0CF', '#DCCFD0', '#3A3F45']), pal = R.pick(FLOWERS);
    let defs = gradV('bg', -200, 760, [shade(wall, 0.12), wall]);
    defs += `<filter id="§soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>`;
    let s = `<rect x="-300" y="-300" width="2100" height="1600" fill="url(#§bg)"/>`;
    s += `<g filter="url(#§soft)">` + bokehSVG(R, 16, -100, -100, 1600, 480, ['#FFE7B8', '#FFF6E0', '#FFD08A'], 26, 70) + `</g>`;
    s += `<rect x="-300" y="780" width="2100" height="600" fill="#F2ECE0"/><rect x="-300" y="780" width="2100" height="16" fill="#D9D0BF"/>`;
    s += `<ellipse cx="750" cy="790" rx="330" ry="26" fill="#000" opacity=".12"/>`;
    s += `<rect x="470" y="752" width="560" height="26" rx="10" fill="#C9A24D"/><rect x="700" y="775" width="100" height="14" fill="#B08B3D"/>`;
    const tiers = [[520, 560, 460, 195], [580, 380, 340, 182], [640, 220, 220, 162]];
    for (const t of tiers) {
      s += `<rect x="${t[0]}" y="${t[1]}" width="${t[2]}" height="${t[3]}" rx="14" fill="#FBF8F1"/>`;
      s += `<rect x="${t[0] + t[2] * 0.7}" y="${t[1]}" width="${t[2] * 0.3}" height="${t[3]}" rx="14" fill="#E9E2D4" opacity=".7"/>`;
      s += `<rect x="${t[0]}" y="${t[1] + t[3] - 22}" width="${t[2]}" height="10" fill="#EFE7D8"/>`;
    }
    const spots = [[690, 222, 44], [752, 208, 34], [640, 250, 30], [600, 395, 40], [652, 372, 30], [560, 440, 28], [930, 570, 44], [978, 620, 32], [892, 548, 28]];
    spots.forEach((p, i) => {
      s += i % 3 === 2 ? `<ellipse cx="${p[0]}" cy="${p[1]}" rx="${p[2] * 1.5}" ry="${p[2] * 0.6}" transform="rotate(${r1(R.range(-50, 50))} ${p[0]} ${p[1]})" fill="${R.pick(LEAF)}"/>`
        : `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="${pal[i % pal.length]}"/><circle cx="${p[0]}" cy="${p[1]}" r="${p[2] * 0.4}" fill="${shade(pal[i % pal.length], -0.15)}" opacity=".6"/>`;
    });
    return { defs, svg: s, focus: rect(460, 150, 580, 650), label: 'the cake' };
  },
  setting(R) {
    const ln = R.pick(LINENS), dark = ln[0] === '#2F3438';
    let defs = gradV('bg', 0, 1000, [ln[0], ln[1]]);
    let s = `<rect x="-300" y="-300" width="2100" height="1600" fill="url(#§bg)"/>`;
    const metal = R.pick(['#C9A24D', '#C5CAD0', '#B8875A']);
    s += `<ellipse cx="760" cy="530" rx="330" ry="330" fill="#000" opacity=".1"/>`;
    s += `<circle cx="750" cy="510" r="330" fill="${dark ? '#E9E4DA' : '#FFFFFF'}"/><circle cx="750" cy="510" r="322" fill="none" stroke="${metal}" stroke-width="7"/><circle cx="750" cy="510" r="232" fill="${dark ? '#DDD7CB' : '#F3F0E8'}"/>`;
    s += `<rect x="640" y="330" width="220" height="360" rx="8" fill="${R.pick(['#C9D3C4', '#E7B9B1', '#D9C7A3', '#9DB09A'])}"/>`;
    s += sprigSVG(R, 690, 610, 230, -68, '#7F977B');
    s += `<rect x="318" y="250" width="16" height="520" rx="8" fill="${metal}"/><rect x="298" y="210" width="56" height="120" rx="22" fill="${metal}"/>`;
    s += `<rect x="236" y="250" width="16" height="520" rx="8" fill="${metal}"/><rect x="216" y="210" width="56" height="120" rx="22" fill="${metal}"/>`;
    s += `<rect x="1168" y="250" width="18" height="520" rx="8" fill="${metal}"/><path d="M1158 210 Q1210 250 1190 430 L1168 430 Z" fill="${metal}"/>`;
    s += `<rect x="1250" y="330" width="16" height="440" rx="8" fill="${metal}"/><ellipse cx="1258" cy="280" rx="34" ry="52" fill="${metal}"/>`;
    s += `<circle cx="1200" cy="110" r="92" fill="#fff" opacity=".28"/><circle cx="1200" cy="110" r="92" fill="none" stroke="#fff" stroke-width="7" opacity=".7"/><circle cx="1200" cy="110" r="56" fill="#F3E3B5" opacity=".45"/>`;
    s += `<rect x="640" y="60" width="220" height="92" rx="4" fill="#FBF8F1"/><rect x="676" y="92" width="148" height="7" fill="#9A927F"/><rect x="706" y="114" width="88" height="5" fill="#C2BAA7"/>`;
    return { defs, svg: s, focus: rect(190, 40, 1120, 840), label: 'a place setting' };
  },
  stationery(R) {
    const ln = R.pick(LINENS.slice(0, 4)), acc = R.pick(['#9DB09A', '#C6765B', '#8FA9C4', '#B8A1C9', '#C9A24D']);
    let defs = gradV('bg', 0, 1000, [ln[0], ln[1]]);
    let s = `<rect x="-300" y="-300" width="2100" height="1600" fill="url(#§bg)"/>`;
    s += `<g transform="rotate(-9 520 520)"><rect x="268" y="258" width="520" height="560" fill="#000" opacity=".1"/><rect x="260" y="250" width="520" height="560" fill="${shade(acc, 0.5)}"/><path d="M260 250 L520 520 L780 250" stroke="${shade(acc, 0.2)}" stroke-width="5" fill="none"/></g>`;
    s += `<g transform="rotate(4 800 480)"><rect x="588" y="148" width="440" height="640" fill="#000" opacity=".1"/><rect x="580" y="140" width="440" height="640" fill="#FBF8F1"/>`;
    s += `<rect x="680" y="250" width="240" height="12" fill="${acc}"/><rect x="640" y="330" width="320" height="26" fill="#4A4A48"/><rect x="700" y="372" width="200" height="8" fill="#9A927F"/><rect x="640" y="420" width="320" height="26" fill="#4A4A48"/>`;
    s += `<rect x="690" y="520" width="220" height="7" fill="#9A927F"/><rect x="720" y="548" width="160" height="7" fill="#9A927F"/><rect x="705" y="576" width="190" height="7" fill="#9A927F"/><rect x="760" y="670" width="80" height="8" fill="${acc}"/></g>`;
    s += `<g transform="rotate(12 1180 700)"><rect x="1046" y="566" width="300" height="210" fill="#000" opacity=".1"/><rect x="1040" y="560" width="300" height="210" fill="#F5EFE3"/><rect x="1090" y="620" width="200" height="8" fill="#9A927F"/><rect x="1120" y="652" width="140" height="6" fill="#C2BAA7"/><rect x="1105" y="690" width="170" height="6" fill="#C2BAA7"/></g>`;
    s += `<circle cx="420" cy="640" r="58" fill="${shade(acc, -0.25)}"/><circle cx="420" cy="640" r="40" fill="${shade(acc, -0.1)}"/>`;
    s += sprigSVG(R, 1050, 250, 380, -18, '#8FA58A');
    s += `<path d="M180 880 C320 820 420 960 600 900 C700 866 760 900 840 930" stroke="${shade(acc, 0.25)}" stroke-width="20" fill="none" stroke-linecap="round"/>`;
    s += ringSVG(1220, 420, 62, 62, 14, 0, '#D9B25A', false) + ringSVG(1296, 452, 50, 50, 12, 0, '#D9B25A', true);
    return { defs, svg: s, focus: rect(230, 110, 1140, 800), label: 'the invitation suite' };
  },
  toast(R) {
    const wall = R.pick(['#3A3F45', '#4A3F45', '#2F3A3F', '#D9CDBD']);
    let defs = gradV('bg', -200, 1200, [shade(wall, 0.14), wall]);
    defs += `<filter id="§soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="18"/></filter>`;
    let s = `<rect x="-300" y="-300" width="2100" height="1600" fill="url(#§bg)"/>`;
    s += `<g filter="url(#§soft)">` + bokehSVG(R, 22, -100, -100, 1600, 1100, ['#FFE7B8', '#FFF6E0', '#FFD08A', '#F6D5CF'], 30, 90) + `</g>`;
    const flute = (x, rot) => `<g transform="rotate(${rot} ${x} 620)"><path d="M${x - 64} 150 L${x + 64} 150 Q${x + 60} 470 ${x + 9} 560 L${x + 9} 860 L${x + 78} 884 L${x - 78} 884 L${x - 9} 860 L${x - 9} 560 Q${x - 60} 470 ${x - 64} 150 Z" fill="#fff" opacity=".3"/><path d="M${x - 60} 250 L${x + 60} 250 Q${x + 54} 470 ${x + 6} 548 L${x - 6} 548 Q${x - 54} 470 ${x - 60} 250 Z" fill="#F1D48A" opacity=".88"/><path d="M${x - 64} 150 L${x + 64} 150 Q${x + 60} 470 ${x + 9} 560 L${x + 9} 860 L${x + 78} 884 L${x - 78} 884 L${x - 9} 860 L${x - 9} 560 Q${x - 60} 470 ${x - 64} 150 Z" fill="none" stroke="#fff" stroke-width="6" opacity=".75"/><circle cx="${x - 20}" cy="330" r="7" fill="#fff" opacity=".8"/><circle cx="${x + 18}" cy="400" r="5" fill="#fff" opacity=".8"/><circle cx="${x + 4}" cy="290" r="5" fill="#fff" opacity=".8"/></g>`;
    s += flute(610, 13) + flute(890, -13);
    return { defs, svg: s, focus: rect(420, 90, 660, 840), label: 'the toast' };
  },
};
const DETAIL_KEYS = Object.keys(DETAILS);

function detailScene(kind, seed) {
  const R = RNG(seed);
  const d = DETAILS[kind](R);
  return {
    isDetail: true, detail: kind, W: 1500, H: 1000, defs: d.defs, back: d.svg, mid: '', subject: '', front: '', fg: null,
    people: [], group: null, feats: { lines: [] }, focus: d.focus, label: d.label, seed,
  };
}
