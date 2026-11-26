// WI-041 independent contrast computation (WCAG 2.1 relative luminance, 1.4.3 / 1.4.11)
// Method: sRGB channels composited with "source over" in 8-bit space, then
// linearised with the WCAG transfer function (threshold 0.03928), L = 0.2126R+0.7152G+0.0722B,
// ratio = (Llight+0.05)/(Ldark+0.05). Glass composites include the page gradient layers
// from styles.css (.fo-backdrop) under rgba glass fills, optionally with the CSS
// saturate(1.35) backdrop-filter matrix (blur(18px) is not simulated; it only averages
// neighbours and removes the 1px dot grid, which we note per row).

const F = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const lum = ([r, g, b]) => 0.2126 * F(r) + 0.7152 * F(g) + 0.0722 * F(b);
const over = (fg, bg) => [
  fg[3] * fg[0] + (1 - fg[3]) * bg[0],
  fg[3] * fg[1] + (1 - fg[3]) * bg[1],
  fg[3] * fg[2] + (1 - fg[3]) * bg[2],
];
const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
};
const rgba = (r, g, b, a) => [r, g, b, a];
const ratio = (a, b) => {
  const l1 = lum(a.slice(0, 3).concat([1]));
  const l2 = lum(b.slice(0, 3).concat([1]));
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
};
const css = (c) => `rgb(${c.map((v) => Math.round(v * 10) / 10).join(' ')})`;

// saturate(s) filter matrix applied to linear RGB (CSS filter-effects spec)
function saturate(c, s) {
  const [r, g, b] = c.slice(0, 3).map(F);
  const m = [
    [0.213 + 0.787 * s, 0.715 * (1 - s), 0.072 * (1 - s)],
    [0.213 * (1 - s), 0.715 + 0.285 * s, 0.072 * (1 - s)],
    [0.213 * (1 - s), 0.715 * (1 - s), 0.072 + 0.928 * s],
  ];
  return [
    clamp255(m[0][0] * r + m[0][1] * g + m[0][2] * b),
    clamp255(m[1][0] * r + m[1][1] * g + m[1][2] * b),
    clamp255(m[2][0] * r + m[2][1] * g + m[2][2] * b),
  ];
}
const clamp255 = (v) => Math.max(0, Math.min(1, v)) * 255;

// ---- Palette (theme.ts + styles.css) ----
const light = {
  textPrimary: hex('#0f1b2d'), textSecondary: hex('#42536b'),
  focus: hex('#1b56c4'), onFocus: hex('#ffffff'),
  page: hex('#eef2f8'), cardSolid: hex('#ffffff'),
  solidBorder: rgba(15, 27, 45, 0.14),
  glassBg: rgba(255, 255, 255, 0.62), glassBorder: rgba(255, 255, 255, 0.65),
  success: hex('#12674a'),
};
const dark = {
  textPrimary: hex('#e8eefc'), textSecondary: hex('#a9b8d6'),
  focus: hex('#9dc2ff'), onFocus: hex('#06101f'),
  page: hex('#0b1220'), cardSolid: hex('#141d2e'),
  solidBorder: rgba(150, 180, 230, 0.22),
  glassBg: rgba(22, 32, 52, 0.68), glassBorder: rgba(150, 180, 230, 0.28),
  success: hex('#7ee2b8'),
};

// Page gradient layers from .fo-backdrop (full-strength centres)
const tints = {
  blue: rgba(96, 148, 255, 0.22), purple: rgba(196, 126, 255, 0.18), teal: rgba(84, 214, 190, 0.16),
};
const dots = rgba(120, 140, 180, 0.12 * 0.55); // layer opacity 0.55 folded in

function pageRegion(theme, tintsOn) {
  let c = theme.page;
  for (const t of tintsOn) c = over(t, c);
  return over(dots, c); // dot grid applies on top everywhere
}

// glass card fill over a page region
function glassCard(theme, region, applySaturate) {
  const c = over(theme.glassBg, region);
  return applySaturate ? saturate(c, 1.35) : c;
}

const rows = [];
function row(surface, theme, what, fg, bg, note = '', applySat = false) {
  const r = ratio(fg.slice(0, 3), bg);
  rows.push({ surface, theme, what, ratio: r, bgNote: note, applySat });
  return r;
}

function report(theme, name) {
  const regions = {
    plain: pageRegion(theme, []),
    blue: pageRegion(theme, [tints.blue]),
    purple: pageRegion(theme, [tints.purple]),
    teal: pageRegion(theme, [tints.teal]),
  };
  const textIsDark = lum(theme.textPrimary.slice(0, 3)) < lum(theme.page.slice(0, 3));
  // worst page region for text = lowest luminance for dark text, highest for light text
  const worstPage = Object.entries(regions).sort((a, b) =>
    textIsDark ? lum(a[1].slice(0, 3)) - lum(b[1].slice(0, 3)) : lum(b[1].slice(0, 3)) - lum(a[1].slice(0, 3))
  )[0];
  const worstPageName = worstPage[0];

  const R = [];
  const add = (surface, what, fg, bg, note, applySat = false) =>
    R.push({ surface, what, ratio: ratio(fg.slice(0, 3), bg), note, applySat });

  // --- Solid ---
  add('Solid', 'Primary text on card', theme.textPrimary, theme.cardSolid, css(theme.cardSolid));
  add('Solid', 'Primary text on page', theme.textPrimary, theme.page, css(theme.page));
  add('Solid', 'Secondary text on card', theme.textSecondary, theme.cardSolid, '');
  add('Solid', 'Secondary text on page', theme.textSecondary, theme.page, '');
  add('Solid', 'Accent text (actions/icon) on card', theme.focus, theme.cardSolid, '--fo-focus as text colour');
  add('Solid', 'Card border vs page', over(theme.solidBorder, theme.page), theme.page, 'composite vs adjacent');
  add('Solid', 'Card border vs card', over(theme.solidBorder, theme.cardSolid), theme.cardSolid, 'composite vs adjacent');
  add('Solid', 'Focus ring vs page', theme.focus, theme.page, '3px outline on page');
  add('Solid', 'Focus ring vs card', theme.focus, theme.cardSolid, '');
  add('Solid', 'Primary action text on accent', theme.onFocus, theme.focus, 'Run button');

  // --- Glass (worst-case region) ---
  const region = regions[worstPageName];
  const glassNoFilter = glassCard(theme, region, false);
  const glassSat = glassCard(theme, region, true);
  const glass = ratio(theme.textPrimary.slice(0, 3), glassNoFilter) <=
    ratio(theme.textPrimary.slice(0, 3), glassSat) ? glassNoFilter : glassSat;
  const glassKind = ratio(theme.textPrimary.slice(0, 3), glassNoFilter) <=
    ratio(theme.textPrimary.slice(0, 3), glassSat) ? 'raw composite' : 'saturate(1.35)';

  add('Glass', `Primary text on glass (${worstPageName} region, ${glassKind})`, theme.textPrimary, glass, css(glass));
  add('Glass', `Secondary text on glass (${worstPageName})`, theme.textSecondary, glass, '');
  add('Glass', `Accent text on glass (${worstPageName})`, theme.focus, glass, '');
  add('Glass', `Glass border vs glass card (${worstPageName})`, over(theme.glassBorder, glass), glass, 'composite vs adjacent fill');
  add('Glass', `Glass border vs page (${worstPageName})`, over(theme.glassBorder, region), region, 'composite vs page behind edge');
  add('Glass', `Focus ring vs glass card (${worstPageName})`, theme.focus, glass, '');
  add('Glass', `Primary action text on accent (${worstPageName})`, theme.onFocus, theme.focus, '');

  // --- Dimmed text classes (opacity on text.primary over card/glass) ---
  const dim = (a) => over([...theme.textPrimary.slice(0, 3), a], theme.cardSolid);
  add('Solid', 'Card brief (opacity .80) on card', dim(0.80), theme.cardSolid, '');
  add('Solid', 'Card kind (opacity .68) on card', dim(0.68), theme.cardSolid, '');
  add('Solid', 'Card hint (opacity .66) on card', dim(0.66), theme.cardSolid, '');
  add('Solid', 'Clock (opacity .78) on header', over([...theme.textPrimary.slice(0, 3), 0.78], over(rgba(238, 242, 248, 0.78), theme.page)),
    over(rgba(238, 242, 248, 0.78), theme.page), '78% header fill over plain page');
  const dimGlass = over([...theme.textPrimary.slice(0, 3), 0.66], glass);
  add('Glass', `Card hint (opacity .66) on glass (${worstPageName})`, dimGlass, glass, 'lowest-opacity text on worst glass');
  add('Solid', 'Connected chip text on header', theme.success, over(rgba(238, 242, 248, 0.78), theme.page), 'success.main on header fill');

  console.log(`\n===== ${name.toUpperCase()} THEME =====`);
  console.log(`worst glass region: ${worstPageName} (${css(region)})`);
  for (const r of R) {
    const bar = r.ratio >= 4.5 ? 'PASS-4.5' : r.ratio >= 3 ? 'PASS-3 ' : 'FAIL   ';
    console.log(`${bar} ${r.ratio.toFixed(2).padStart(6)}  ${r.surface.padEnd(6)} ${r.what}${r.note ? '   [' + r.note + ']' : ''}`);
  }
  return R;
}

const L = report(light, 'light');
const D = report(dark, 'dark');

// Absolute bound: all three tints stacked + dots (not co-located in reality)
for (const [nm, th] of [['light', light], ['dark', dark]]) {
  const stacked = glassCard(th, pageRegion(th, Object.values(tints)), true);
  console.log(`\nBOUND ${nm}: primary text on stacked-tint glass = ${ratio(th.textPrimary.slice(0, 3), stacked).toFixed(2)}, secondary = ${ratio(th.textSecondary.slice(0, 3), stacked).toFixed(2)}, accent = ${ratio(th.focus.slice(0, 3), stacked).toFixed(2)}, glass border vs card = ${ratio(over(th.glassBorder, stacked).slice(0, 3), stacked).toFixed(2)}`);
}
