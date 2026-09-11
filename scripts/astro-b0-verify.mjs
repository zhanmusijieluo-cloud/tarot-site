// B0 验收关 v3：astronomia 对拍权威公开值
// 单位坑: solar.apparentLongitude 吃儒略世纪T; moonposition.position 吃JDE; deltaT 吃年
import { march, june, september, december } from 'astronomia/solstice'
import { apparentLongitude } from 'astronomia/solar'
import { position as moonPos } from 'astronomia/moonposition'
import { deltaT } from 'astronomia/deltat'

const DEG = 180 / Math.PI
const CENT = 36525
const jd2000 = (jde) => (jde - 2451545) / CENT        // → 儒略世纪
const toUTCstr = (jd) => new Date((jd - 2440587.5) * 86400000).toISOString().replace('T', ' ').slice(0, 16)
const jdeToUtcJd = (jde) => jde - deltaT(2000 + (jde - 2451545) / CENT) / 86400
const sunLon = (jde) => ((apparentLongitude(jd2000(jde)) * DEG) % 360 + 360) % 360
const moonLon = (jde) => ((moonPos(jde).lon * DEG) % 360 + 360) % 360

const expectMin = (gotJd, iso) => (gotJd - (Date.parse(iso) / 86400000 + 2440587.5)) * 1440

console.log('=== T1 二分二至时刻 (参照: 国际历书发布 UTC 值) ===')
for (const [name, jde, iso] of [
  ['春分', march(2024), '2024-03-20T03:06Z'],
  ['夏至', june(2024), '2024-06-20T20:51Z'],
  ['秋分', september(2024), '2024-09-22T12:44Z'],
  ['冬至', december(2024), '2024-12-21T09:20Z'],
]) console.log(`${name}: 计算 ${toUTCstr(jdeToUtcJd(jde))} | 历书 ${iso.slice(0, 16)} | 差 ${expectMin(jdeToUtcJd(jde), iso).toFixed(1)} 分`)

console.log('\n=== T2 太阳视黄经抽查 (参照: 当年历书/天文年刊) ===')
for (const [jde, iso, expLon] of [
  [2451545.0, '2000-01-01T12:00Z', 280.46],  // J2000正午, 太阳在摩羯10°≈280.46°
  [2460394.79, '2024-03-25T07:00Z', 5.43],   // 满月时刻太阳在白羊5°
]) console.log(`JD ${jde} (${iso.slice(0, 10)}): 计算 ${sunLon(jde).toFixed(3)}° | 参照 ${expLon}° | 差 ${(sunLon(jde) - expLon).toFixed(3)}°`)

console.log('\n=== T3 反推 2024-03-25 满月 (日月视黄经差=180°, 参照历书 07:00 UTC) ===')
let lo = 2460392.5, hi = 2460397.5
for (let i = 0; i < 40; i++) {
  const mid = (lo + hi) / 2
  let d = (moonLon(mid) - sunLon(mid) - 180 + 540) % 360 - 180
  if (d < 0) lo = mid; else hi = mid
}
const fullMoon = jdeToUtcJd((lo + hi) / 2)
console.log(`满月: 计算 ${toUTCstr(fullMoon)} UTC | 历书 2024-03-25 07:00 | 差 ${expectMin(fullMoon, '2024-03-25T07:00Z').toFixed(1)} 分`)

console.log('\n=== T4 月亮黄经速度自检 (月亮日行约13.2°) ===')
console.log(`Δ月黄经/日: ${(moonLon(2460395) - moonLon(2460394)).toFixed(3)}° (参照 12.9~15.4° 区间)` )

console.log(`
判定标准: 误差<5角分(0.083°)=对拍通过。
换算: 5角分对太阳≈12分钟, 对月亮≈9分钟; 占星相位容许度按1~10度计, 此精度已过剩。`)
