/**
 * 1) 统计其他牌阵的卡宽基准（用户说"其他牌阵刚刚好"）
 * 2) 验证新设计的凯尔特十字坐标（横牌独立占位、不压1号牌）
 */
import { readFileSync } from 'fs';
const src = readFileSync('src/lib/spread-layout.ts', 'utf8');
const H_RATIO = 3.4 / 2;
const stepsMatch = /export const CARD_W_STEPS:[\s\S]*?= \[([\s\S]*?)\];/.exec(src);
const CARD_W_STEPS = eval(`[${stepsMatch[1]}]`);
const namedConsts = {}; const cg = /const (CROSS_5|AB_CHOICE|PAIR_5|TIMELINE_4_PLUS_1|HOLY_TRIANGLE): SpreadPoint\[\] = ([\s\S]*?);/g; let m2; while ((m2 = cg.exec(src)) !== null) namedConsts[m2[1]] = eval(`(${m2[2]})`);
const rawBlock = /const SPREAD_RAW: Record<string, RawLayout> = ([\s\S]*?);\n\n\/\*\* 兜底/.exec(src); let rawBody = rawBlock[1]; for (const [nm, v] of Object.entries(namedConsts)) if (v) rawBody = rawBody.split(nm).join(JSON.stringify(v)); const SPREAD_RAW = eval(`(${rawBody})`);
const LABEL_SPACE = parseFloat(/const LABEL_SPACE = ([\d.]+)/.exec(src)[1]); const ROW_GAP = parseFloat(/const ROW_GAP = ([\d.]+)/.exec(src)[1]); const COL_GAP = parseFloat(/const COL_GAP = ([\d.]+)/.exec(src)[1]);
function requiredHeight(pts, W, cw) { const ch = cw * H_RATIO; let H = 1; for (const pt of pts) { const y = pt.y; H = Math.max(H, (ch / 2) * (100 / Math.max(y, 0.001)), ((ch / 2) + LABEL_SPACE) * (100 / Math.max(100 - y, 0.001))); } for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const dxPx = Math.abs(pts[i].x - pts[j].x) * W / 100; if (dxPx >= cw + COL_GAP) continue; const dy = Math.abs(pts[i].y - pts[j].y); if (dy < 1) continue; H = Math.max(H, (ch + ROW_GAP) * (100 / dy)); } return H; }
const effW = (i, cand, crossIdx) => (i === crossIdx ? cand * H_RATIO : cand);
function solve(coords, stepIdx, containerW, crossIdx) { const W = Math.max(containerW, 120); const edgeOk = (cand) => coords.every((p, i) => Math.min(p.x, 100 - p.x) * W / 100 >= effW(i, cand, crossIdx) / 2); let px = CARD_W_STEPS[CARD_W_STEPS.length - 1].px; for (let i = stepIdx; i < CARD_W_STEPS.length; i++) { const cand = CARD_W_STEPS[i].px; if (!edgeOk(cand)) continue; const estH = requiredHeight(coords, W, cand); let ok = true; for (let a = 0; a < coords.length && ok; a++) for (let b = a + 1; b < coords.length; b++) { const dyPx = Math.abs(coords[a].y - coords[b].y) * estH / 100; if (dyPx > cand * H_RATIO * 0.5) continue; const needX = effW(a, cand, crossIdx) / 2 + effW(b, cand, crossIdx) / 2 + COL_GAP; const dxPx = Math.abs(coords[a].x - coords[b].x) * W / 100; if (dxPx > 0.001 && dxPx < needX) { ok = false; break; } } if (ok) { px = cand; break; } } const height = requiredHeight(coords, W, px); const cls = CARD_W_STEPS.find(s => s.px === px).cls; return { height: Math.ceil(height), cardW: cls, px }; }

console.log('════ 其他牌阵卡宽基准（桌面672px）════');
for (const k of ['three', 'holy_triangle', 'situation', 'relationship', 'feelings', 'hexagram', 'venus_love', 'love_choice', 'reconciliation', 'weekly']) {
  const g = solve(SPREAD_RAW[k].coords, SPREAD_RAW[k].step ?? 4, 672, -1);
  console.log(`  ${k.padEnd(16)} n=${SPREAD_RAW[k].coords.length} → ${g.cardW}(${g.px}px)`);
}
