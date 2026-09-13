// 验收: 1995 盘新规则 — 单向接纳须有相位; 互溶无相位标慷慨
import { castNatalChart } from '../src/lib/astro/chart.ts'
const ZH = { Aries: '白羊', Taurus: '金牛', Gemini: '双子', Cancer: '巨蟹', Leo: '狮子', Virgo: '处女', Libra: '天秤', Scorpio: '天蝎', Sagittarius: '射手', Capricorn: '摩羯', Aquarius: '水瓶', Pisces: '双鱼' }
const c = castNatalChart({ year: 1995, month: 6, day: 15, hour: 14, minute: 30, timezone: 8, latitude: 39.9042, longitude: 116.4074, houseSystem: 'whole-sign' })
const aspPairs = new Set(c.aspects.map(x => [x.a, x.b].sort().join('|')))
let pass = 0, fail = 0
const check = (ok, label) => { console.log(`${ok ? '✅' : '❌'} ${label}`); ok ? pass++ : fail++ }

// 1) aspected 字段与相位表一致 (逐条)
let flagBad = 0
for (const r of c.receptions) {
  const real = aspPairs.has([r.a, r.b].sort().join('|'))
  if (r.aspected !== real) { console.log(`  ⚠ ${r.a}→${r.b}: aspected=${r.aspected} 相位表=${real}`); flagBad++ }
}
check(flagBad === 0, `全部 ${c.receptions.length} 条接纳的 aspected 标志与相位表一致`)

// 2) 经典案例核对 (本盘已知): 太阳-水星 距13.8° 无合相 → ☉被☿接纳 应 aspected=false
const sunMerc = c.receptions.find(r => r.a === 'Sun' && r.b === 'Mercury')
check(!!sunMerc && sunMerc.aspected === false, '☉被☿接纳 标为无相位 (新规则下不再作为"接纳"展示)')
// 3) 金星-水星 距4.3° 有合 → ♀被☿接纳 aspected=true
const venMerc = c.receptions.find(r => r.a === 'Venus' && r.b === 'Mercury')
check(!!venMerc && venMerc.aspected === true, '♀被☿接纳 有合相支撑 → 成立')
// 4) 土星-海王 互溶: 距59.5° 六合容许6° → 真互溶
const satNept = c.receptions.find(r => r.a === 'Saturn' && r.b === 'Neptune')
check(!!satNept && satNept.mutual && satNept.aspected, '♄♆互溶 且有六合相位 → 标准互溶')
// 5) 展示层模拟: 弹窗太阳可显示的接纳 (filter aspected||mutual)
// 三分接纳加入后: 太阳双子=风象昼主土星 → 被♄三分接纳, 且太阳刑土星0.67°有相位 → 成立一条
const sunShown = c.receptions.filter(r => (r.a === 'Sun' || r.b === 'Sun') && (r.aspected || r.mutual))
const sunTri = sunShown.find(r => r.kind === 'triplicity')
check(sunShown.length === 1 && !!sunTri, `太阳弹窗接纳区 ${sunShown.length} 条: 三分接纳${sunTri ? ` ☉居双子被♄接纳(三分, 有刑相位)` : '缺失'} (旧值0已过时)`)
// 6) 特征面板模拟
const panel = c.receptions.filter(r => r.aspected || r.mutual)
console.log('   新规则下整盘展示接纳:', panel.map(r => `${r.a}→${r.b}${r.mutual ? '★' : ''}${r.aspected ? '' : '(慷慨)'}`).join('  '))
// 7) 回归: 奥巴马盘接纳仍算得动
const ob = castNatalChart({ year: 1961, month: 8, day: 4, hour: 19, minute: 24, timezone: -10, latitude: 21.3069, longitude: -157.8583 })
check(ob.receptions.length > 0 && ob.receptions.every(r => typeof r.aspected === 'boolean'), `奥巴马盘 ${ob.receptions.length} 条接纳均带 aspected 字段`)
console.log(`\n结果: ${pass} 通过 / ${fail} 失败`)
