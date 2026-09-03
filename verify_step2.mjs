/**
 * 凯尔特十字 step=2 后的最终确认 + 手机端处理方案分析
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

const celtic = SPREAD_RAW['celtic'];
console.log('═══ 凯尔特十字 step=2 最终确认 ═══');
for (const [cw, label] of [[292, '手机'], [672, '桌面']]) {
  const g = solve(celtic.coords, celtic.step ?? 2, cw, 1);
  const crossW = g.px * H_RATIO;
  const crossCx = 34 * cw / 100, crossL = crossCx - crossW / 2, crossR = crossCx + crossW / 2;
  const p4R = 10 * cw / 100 + g.px / 2, p6L = 58 * cw / 100 - g.px / 2;
  const gapL = crossL - p4R, gapR = p6L - crossR;
  console.log(`${label}(${cw}px): cardW=${g.cardW}(${g.px}px) 高${g.height} 横牌宽${Math.round(crossW)}px 左净空${gapL.toFixed(1)} 右净空${gapR.toFixed(1)}`);
  // active 放大后
  const shrink = (crossW * 0.12) / 2 + (g.px * 0.12) / 2;
  console.log(`  active(×1.12)后净空减少${shrink.toFixed(1)}px → 左${(gapL - shrink).toFixed(1)} 右${(gapR - shrink).toFixed(1)} ${gapL - shrink > 0 ? '✅' : '⚠️'}`);
}

// 手机端处理：横牌是否可微调坐标（把 #4/#6 往中央收）来避免重叠
console.log('\n═══ 手机端(292px) 解决方案推演 ═══');
console.log('手机 48px 是最小档。要避免 active 重叠，需: 横牌实际净空 ≥ active 消耗');
// 横牌中心固定34%，needs: (34-10)% * 292 = 70px 空间放 #4的一半(24) + 横牌一半(41) → 需扩
// 计算必要净空
const p4x = 10, p6x = 58, crossx = 34;
const cand = 48, crossW = cand * H_RATIO;
const needPerSide = (cand * 1.12) / 2 + (crossW * 1.12) / 2; // 各自放大后的一半宽之和，还需+净空
const availL = (crossx - p4x) / 100 * cw; // #4中心到横牌中心
const availR = (p6x - crossx) / 100 * cw;
console.log(`cand=48, crossW=${crossW.toFixed(1)}px`);
console.log(`active 放大后相邻牌一半宽之和 needs ${needPerSide.toFixed(1)}px`);
console.log(`#4中心距横牌中心 ${availL.toFixed(1)}px, #6中心距横牌中心 ${availR.toFixed(1)}px`);
console.log(`实际空间 ${availL.toFixed(1)}px vs 需要 ${needPerSide.toFixed(1)}px → ${availL >= needPerSide ? '足够' : '不足'}`);
