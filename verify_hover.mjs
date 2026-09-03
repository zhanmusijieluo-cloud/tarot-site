/**
 * 根因定位：hover/active 放大（scale 1.06 / 1.12）是否吃掉净空导致横牌与邻牌重叠
 * 桌面672px 用 step=1 = 112px 卡宽时，横牌190px，净空仅10px
 */
const H_RATIO = 3.4 / 2;
const cw = 672;
const cand = 112;
const crossW = cand * H_RATIO;

// 中心坐标
const crossCx = 34 * cw / 100;
const crossL0 = crossCx - crossW / 2, crossR0 = crossCx + crossW / 2;
const p4Cx = 10 * cw / 100, p4R0 = p4Cx + cand / 2;
const p6Cx = 58 * cw / 100, p6L0 = p6Cx - cand / 2;
const gapL0 = crossL0 - p4R0, gapR0 = p6L0 - crossR0;

console.log(`═══ 桌面672px · step=1(112px) ═══`);
console.log(`横牌中心 x=${crossCx}px 宽${crossW}px → 左缘${crossL0.toFixed(1)} 右缘${crossR0.toFixed(1)}`);
console.log(`#4过去 x=${p4Cx}px 右缘${p4R0.toFixed(1)} → 横牌左净空 ${gapL0.toFixed(1)}px`);
console.log(`#6近期 x=${p6Cx}px 左缘${p6L0.toFixed(1)} → 横牌右净空 ${gapR0.toFixed(1)}px`);
console.log('');

// 缩放影响：按钮 scale 会以中心缩放，牌宽*scale，净空减少 (scale-1)/2 * (crossW+cand)
console.log('─── 缩放对净空的影响（中心缩放，左右各扩大一半）───');
for (const [name, scale] of [['hover', 1.06], ['active', 1.12]]) {
  const shrinkL = (crossW * (scale - 1)) / 2 + (cand * (scale - 1)) / 2;
  const gapL = gapL0 - shrinkL, gapR = gapR0 - shrinkL;
  console.log(`${name}(×${scale}): 净空减少${shrinkL.toFixed(1)}px → 左净空${gapL.toFixed(1)}px 右净空${gapR.toFixed(1)}px ${gapL > 0 ? '不重叠' : '⚠️重叠!'}`);
}

console.log('');
console.log('═══ 对比：若 step=2(96px) ═══');
const cand2 = 96;
const crossW2 = cand2 * H_RATIO;
const crossL2 = crossCx - crossW2 / 2, crossR2 = crossCx + crossW2 / 2;
const p4R2 = p4Cx + cand2 / 2, p6L2 = p6Cx - cand2 / 2;
const gL2 = crossL2 - p4R2, gR2 = p6L2 - crossR2;
console.log(`横牌${crossW2}px → 左净空${gL2.toFixed(1)}px 右净空${gR2.toFixed(1)}px`);
for (const [name, scale] of [['hover', 1.06], ['active', 1.12]]) {
  const shrink = (crossW2 * (scale - 1)) / 2 + (cand2 * (scale - 1)) / 2;
  console.log(`${name}(×${scale}): 净空减少${shrink.toFixed(1)}px → 左${(gL2 - shrink).toFixed(1)}px 右${(gR2 - shrink).toFixed(1)}px ${gL2 - shrink > 0 ? '✅不重叠' : '⚠️重叠'}`);
}
