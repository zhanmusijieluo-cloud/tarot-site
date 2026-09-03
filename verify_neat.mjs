/**
 * 凯尔特十字 - 横牌与邻牌真实净空精确测量
 * 关键：分容器宽度扫描，找出「横置 + 不与任何邻牌重叠」的最大安全卡宽档位
 * 并揭示：①求解器临界余量bug ②hover缩放是否导致重叠 ③正确应设的 step
 */
const H_RATIO = 3.4 / 2; // 1.7
const CARD_W_STEPS = [
  { cls: 'w-32', px: 128 }, { cls: 'w-28', px: 112 }, { cls: 'w-24', px: 96 },
  { cls: 'w-20', px: 80 }, { cls: 'w-[4.5rem]', px: 72 }, { cls: 'w-16', px: 64 },
  { cls: 'w-14', px: 56 }, { cls: 'w-12', px: 48 },
];
const COL_GAP = 10;

// 凯尔特十字坐标
const coords = [
  { x: 34, y: 46 }, // 1 现状(竖)
  { x: 34, y: 46 }, // 2 挑战(横) — crossIdx=1
  { x: 34, y: 84 }, // 3 根基
  { x: 10, y: 46 }, // 4 过去
  { x: 34, y: 10 }, // 5 冠顶
  { x: 58, y: 46 }, // 6 近期
  { x: 87, y: 86 }, // 7 自我
  { x: 87, y: 61 }, // 8 环境
  { x: 87, y: 36 }, // 9 期待
  { x: 87, y: 11 }, // 10 最终
];

// 有效宽：横牌=cand*1.7, 其他=cand
const effW = (i, cand) => (i === 1 ? cand * H_RATIO : cand);

function analyze(cw, cand) {
  const crossIdx = 1;
  // 横牌与#4(x10) 净空 = 横牌左缘 - #4右缘
  const crossCx = 34 * cw / 100;
  const crossW = effW(crossIdx, cand);
  const crossL = crossCx - crossW / 2, crossR = crossCx + crossW / 2;
  // #4
  const p4Cx = 10 * cw / 100, p4R = p4Cx + cand / 2;
  // #6
  const p6Cx = 58 * cw / 100, p6L = p6Cx - cand / 2;
  const gapL = crossL - p4R;  // 正值=横牌与#4有间隙
  const gapR = p6L - crossR;  // 正值=横牌与#6有间隙
  // hover 缩放最坏情况（active scale 1.12）：牌中心不动，尺寸放大12% → 净空被吃掉
  const hoverL = gapL - (crossW * 0.06) - (cand * 0.06); // hover 1.06 双侧各放大
  const activeL = gapL - (crossW * 0.06) - (cand * 0.06); // 保守用 hover
  return { gapL: +gapL.toFixed(1), gapR: +gapR.toFixed(1) };
}

console.log('════════ 凯尔特十字 · 横牌与相邻牌净空扫描 ════════');
console.log('（净空>0 = 不重叠；<0 = 重叠；数值为 px）');
console.log('='.repeat(86));
for (const [cw, label] of [[292, '手机'], [400, '窄平板'], [500, '平板'], [600, '宽平板'], [644, '桌面窄'], [672, '桌面']]) {
  console.log(`\n【${label} 容器${cw}px】`);
  for (const cand of CARD_W_STEPS.map(s => s.px).reverse()) {
    const { gapL, gapR } = analyze(cw, cand);
    const netGap = Math.min(gapL, gapR);
    const minSafe = netGap >= COL_GAP;
    const hoverSafe = netGap >= 10; // hover后要有净空
    const status = netGap <= 0 ? '❌重叠' : (netGap < COL_GAP ? '⚠️贴边' : (netGap < 16 ? '🟡偏窄' : '✅安全'));
    console.log(`  卡宽${String(cand).padStart(3)}px 横牌${Math.round(cand * H_RATIO).toString().padStart(3)}px → 左净空${gapL.toFixed(1).padStart(5)} 右净空${gapR.toFixed(1).padStart(5)} 最小${netGap.toFixed(1).padStart(5)} ${status}`);
  }
}
