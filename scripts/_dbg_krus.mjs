// 调试 v10: A2 用 -176.013752 (负值直传, 不 nrm) vs 183.9861 — 看 krLon 差异
const D2R = Math.PI / 180, R2D = 180 / Math.PI
const nrm = (x) => ((x % 360) + 360) % 360
const cosd = (x) => Math.cos(x * D2R), sind = (x) => Math.sin(x * D2R)
function cotransEcl(lon, latDeg, rot) {
  const x = cosd(latDeg) * cosd(lon)
  const y = cosd(latDeg) * sind(lon)
  const z = sind(latDeg)
  const e = rot * D2R
  const y2 = y * Math.cos(e) + z * Math.sin(e)
  const z2 = -y * Math.sin(e) + z * Math.cos(e)
  const rxy = Math.sqrt(x * x + y2 * y2)
  let lonOut = Math.atan2(y2, x); if (lonOut < 0) lonOut += 2 * Math.PI
  const latOut = rxy !== 0 ? Math.atan(z2 / rxy) : (z2 >= 0 ? Math.PI / 2 : -Math.PI / 2)
  return [nrm(lonOut * R2D), latOut * R2D]
}
const fi = 31.028
const A = cotransEcl(-176.013752, 6.593207, -(90 - fi))   // 负角直传
const B = cotransEcl(183.986248, 6.593207, -(90 - fi))    // 归一化角
console.log('A2=-176 直传 → krLon =', A[0].toFixed(6))
console.log('A2=+183.99 归一 → krLon =', B[0].toFixed(6))
console.log('python dbg_krus2 报 187.700021 — 但数学上应相同!')
// 那dbg_krus2 的 187.70 是哪来的: 它 A1 输出未 nrm? dbg_krus2 se_cotrans 返回 %360 → A1=15.46
// dbg_krus2 A2: x[0] = x[0] - (armc-90) = 15.46-191.48 = -176.01 (未nrm, 但 %360≡183.99)
// → 两者输入到 A3 只差 ±360, cos/sin 完全相同 → A3 输出必须相同!
// 刚才 python 两个版本(187.70 vs 我复刻的187.70) — 一致; 但 v7 JS 打印 187.70 也一致!
// 所以 TS 现在的 182.06 是"另一条公式"的产物 — 因为 TS 里 A2 加了 nrm() 再减 — 不等价!
// nrm(15.46) - nrm(191.48) = 15.46-191.48 = -176.01 ✓ 相同... 但 TS 代码是
// nrm( cotransEcl(...)[0] - (ramc-90) ) — nrm 在减法之后! -176.01 nrm → 183.99 → 传给 A3
// 而 python 传 -176.01 → cos(183.99°)=cos(-176.01°) 数学等价 → A3 必须相同
// 除非... TS 版 A1 输入用了 ascEcl=16.7773 但 ramc=281.4758 (精度!) → krLon 差 5.64°?
// 验证: 用 SE 精确 ASC=16.777348, armc=281.475607:
const asc2 = 16.777348, armc2 = 281.475607
const a1 = cotransEcl(asc2, 0, -23.4392911)
const a2 = nrm(a1[0] - (armc2 - 90))
const a3 = cotransEcl(a2, a1[1], -(90 - fi))
console.log('精确值版 krLon =', a3[0].toFixed(6))
