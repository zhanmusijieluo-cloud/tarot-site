/**
 * 全量扫描：active 放大(×1.12)是否导致任意牌阵相邻牌重叠
 * 对每个牌阵，枚举求解器实际选中的卡宽，再模拟 active 缩放后的边界框
 */
import { readFileSync } from 'fs';
const src = readFileSync('src/lib/spread-layout.ts', 'utf8');
const H_RATIO = 3.4 / 2;
const stepsMatch = /export const CARD_W_STEPS:[\s\S]*?= \[([\s\S]*?)\];/.exec(src);
const CARD_W_STEPS = eval(`[${stepsMatch[1]}]`);
const namedConsts = {};
const cg = /const (CROSS_5|AB_CHOICE|PAIR_5|TIMELINE_4_PLUS_1|HOLY_TRIANGLE): SpreadPoint\[\] = ([\s\S]*?);/g;
let m2; while ((m2 = cg.exec(src)) !== null) namedConsts[m2[1]] = eval(`(${m2[2]})`);
const rawBlock = /const SPREAD_RAW: Record<string, RawLayout> = ([\s\S]*?);\n\n\/\*\* 兜底/.exec(src);
let rawBody = rawBlock[1];
for (const [nm, v] of Object.entries(namedConsts)) if (v) rawBody = rawBody.split(nm).join(JSON.stringify(v));
const SPREAD_RAW = eval(`(${rawBody})`);
const LABEL_SPACE = parseFloat(/const LABEL_SPACE = ([\d.]+)/.exec(src)[1]);
const ROW_GAP = parseFloat(/const ROW_GAP = ([\d.]+)/.exec(src)[1]);
const COL_GAP = parseFloat(/const COL_GAP = ([\d.]+)/.exec(src)[1]);
function requiredHeight(pts, W, cw) { const ch = cw * H_RATIO; let H = 1; for (const pt of pts) { const y = pt.y; H = Math.max(H, (ch / 2) * (100 / Math.max(y, 0.001)), ((ch / 2) + LABEL_SPACE) * (100 / Math.max(100 - y, 0.001))); } for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const dxPx = Math.abs(pts[i].x - pts[j].x) * W / 100; if (dxPx >= cw + COL_GAP) continue; const dy = Math.abs(pts[i].y - pts[j].y); if (dy < 1) continue; H = Math.max(H, (ch + ROW_GAP) * (100 / dy)); } return H; }
const effW = (i, cand, crossIdx) => (i === crossIdx ? cand * H_RATIO : cand);
function solve(coords, stepIdx, containerW, crossIdx) {
  const W = Math.max(containerW, 120); const edgeOk = (cand) => coords.every((p, i) => Math.min(p.x, 100 - p.x) * W / 100 >= effW(i, cand, crossIdx) / 2);
  let px = CARD_W_STEPS[CARD_W_STEPS.length - 1].px;
  for (let i = stepIdx; i < CARD_W_STEPS.length; i++) { const cand = CARD_W_STEPS[i].px; if (!edgeOk(cand)) continue; const estH = requiredHeight(coords, W, cand); let ok = true; for (let a = 0; a < coords.length && ok; a++) for (let b = a + 1; b < coords.length; b++) { const dyPx = Math.abs(coords[a].y - coords[b].y) * estH / 100; if (dyPx > cand * H_RATIO * 0.5) continue; const needX = effW(a, cand, crossIdx) / 2 + effW(b, cand, crossIdx) / 2 + COL_GAP; const dxPx = Math.abs(coords[a].x - coords[b].x) * W / 100; if (dxPx > 0.001 && dxPx < needX) { ok = false; break; } } if (ok) { px = cand; break; } }
  const height = requiredHeight(coords, W, px); const cls = CARD_W_STEPS.find(s => s.px === px).cls; return { height: Math.ceil(height), cardW: cls, px };
}
// active 缩放检测：两牌边界框（含缩放）×1.12，检查是否重叠
const ACTIVE = 1.12;
function overlaps(coords, cand, crossIdx, cw, containerH) {
  const boxes = coords.map((p, i) => {
    const baseW = effW(i, cand, crossIdx), baseH = cand * H_RATIO;
    const w = baseW * ACTIVE, h = baseH * ACTIVE;
    const cx = p.x * cw / 100, cy = p.y * containerH / 100;
    return { i, l: cx - w / 2, r: cx + w / 2, t: cy - h / 2, b: cy + h / 2 };
  });
  const bad = [];
  for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
    if (a === 0 && b === 1) continue; // 凯尔特交叉预期叠
    const hO = Math.min(boxes[a].r, boxes[b].r) - Math.max(boxes[a].l, boxes[b].l);
    const vO = Math.min(boxes[a].b, boxes[b].b) - Math.max(boxes[a].t, boxes[b].t);
    if (hO > 0 && vO > 0) bad.push(`#${a + 1}~#${b + 1}(${Math.round(hO)}x${Math.round(vO)})`);
  }
  return bad;
}
console.log('═══ 全量扫描：active(×1.12) 放大后是否重叠 ═══');
let any = false;
for (const k of Object.keys(SPREAD_RAW)) {
  const crossIdx = k === 'celtic' ? 1 : -1;
  for (const [cw, label] of [[292, '手机'], [672, '桌面']]) {
    const g = solve(SPREAD_RAW[k].coords, SPREAD_RAW[k].step ?? 4, cw, crossIdx);
    const bad = overlaps(SPREAD_RAW[k].coords, g.px, crossIdx, cw, g.height);
    if (bad.length) { any = true; console.log(`⚠️ ${k} ${label}(${cw}px) cardW=${g.cardW}: active重叠 ${bad.join(', ')}`); }
  }
}
if (!any) console.log('✅ 全部牌阵 active 放大均不重叠');
