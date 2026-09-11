// 排盘封装层验收测试: 对拍权威参照值
import { castNatalChart, chartEvidence } from '../src/lib/astro/chart.ts'

let pass = 0, fail = 0
const near = (got, exp, tol, label) => {
  const ok = Math.abs(got - exp) <= tol
  console.log(`${ok ? '✅' : '❌'} ${label}: ${got} (期望 ${exp}±${tol})`)
  ok ? pass++ : fail++
}

// ---- T1 奥巴马盘 (公开权威资料: astro.com 快照) ----
// 参照: Sun 狮子12°33' Moon 双子3°21' ASC 水瓶18°03' MC 天蝎28°53'
const obama = castNatalChart({
  year: 1961, month: 8, day: 4, hour: 19, minute: 24, timezone: -10,
  latitude: 21.3069, longitude: -157.8583, city: 'Honolulu',
})
const sun = obama.planets.find(p => p.name === 'Sun')
const moon = obama.planets.find(p => p.name === 'Moon')
near(sun.degInSign, 12.55, 0.05, '太阳 狮子度数')
near(moon.degInSign, 3.36, 0.05, '月亮 双子度数')
near(obama.angles.ascendant.degInSign, 18.05, 0.05, '上升 水瓶度数')
near(obama.angles.midheaven.degInSign, 28.90, 0.05, '中天 天蝎度数')
console.log(`   太阳落宫=${sun.house} 月亮落宫=${moon.house} 相位${obama.aspects.length}条 警告=${obama.warnings.length}`)

// ---- T2 七宫制切换: ASC/MC 恒定, 中间宫头随制变化 ----
const systems = ['placidus', 'koch', 'equal', 'whole-sign', 'porphyry', 'regiomontanus', 'campanus']
const ascSet = new Set(), cusp2Set = new Set()
for (const s of systems) {
  const c = castNatalChart({ year: 1961, month: 8, day: 4, hour: 19, minute: 24, timezone: -10, latitude: 21.3069, longitude: -157.8583, houseSystem: s })
  ascSet.add(c.angles.ascendant.longitude.toFixed(2))
  cusp2Set.add(c.cusps[1].toFixed(1))
  if (c.houseSystemUsed !== s) { console.log(`❌ 宫制 ${s} 被意外替换为 ${c.houseSystemUsed}`); fail++ } else pass++
}
console.log(`${ascSet.size === 1 ? '✅' : '❌'} 七宫制 ASC 恒定: ${[...ascSet].join(',')}`)
console.log(`${cusp2Set.size >= 5 ? '✅' : '❌'} 2宫头随宫制变化(${cusp2Set.size}种取值): ${[...cusp2Set].join(',')}`)

// ---- T3 高纬降级: 挪威特罗姆瑟 69.6°N, Placidus 应明示改波菲里 ----
const nord = castNatalChart({ year: 1990, month: 1, day: 15, hour: 3, minute: 0, timezone: 1, latitude: 69.649, longitude: 18.955, city: 'Tromsø', houseSystem: 'placidus' })
const warned = nord.warnings.some(w => w.includes('波菲里'))
console.log(`${warned && nord.houseSystemUsed === 'porphyry' ? '✅' : '❌'} 高纬自动降级且如实声明: 制=${nord.houseSystemUsed} 警告=[${nord.warnings.join(' | ')}]`)
warned && nord.houseSystemUsed === 'porphyry' ? pass++ : fail++

// ---- T4 未知时间降级: 行星有座无宫, 上升为 null ----
const noTime = castNatalChart({ year: 1990, month: 5, day: 20, hour: 0, minute: 0, timezone: 8, latitude: 31.23, longitude: 121.47, city: '上海', timeKnown: false })
const ok4 = noTime.angles.ascendant === null && noTime.planets.every(p => p.house === null) && noTime.warnings.length > 0
console.log(`${ok4 ? '✅' : '❌'} 未知时间: ASC=${noTime.angles.ascendant === null ? 'null' : '有值!'} 宫位全null=${noTime.planets.every(p => p.house === null)} 声明=${noTime.warnings[0]?.slice(0, 20)}...`)

// ---- T5 中国生辰冒烟 (北京 1988-06-15 08:30 UTC+8) + 证据文本 ----
const cn = castNatalChart({ year: 1988, month: 6, day: 15, hour: 8, minute: 30, timezone: 8, latitude: 39.9042, longitude: 116.4074, city: '北京' })
console.log('\n===== chartEvidence 输出预览 (喂 AI 的证据格式) =====')
console.log(chartEvidence(cn))

console.log(`\n结果: ${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
