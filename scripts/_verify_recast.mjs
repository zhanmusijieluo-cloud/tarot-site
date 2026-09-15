// 验证: 新 recastAxes 后, davT/marksBT/marksBS/marksAT 对拍爱星盘
const res = await fetch('http://localhost:3000/api/astro/chart/synastry', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    birthA: { year: 1998, month: 2, day: 19, hour: 9, minute: 45, timezone: 8, latitude: 31.028, longitude: 106.413, city: '蓬安' },
    birthB: { year: 1993, month: 5, day: 29, hour: 9, minute: 50, timezone: 8, latitude: 31.028, longitude: 106.413, city: '蓬安' },
  }),
})
const c = (await res.json()).chart
const n180 = (x) => ((x + 180) % 360) - 180
const SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼']
const fmt = (l) => `${SIGNS[Math.floor((l % 360) / 30)]}${(l % 30).toFixed(2)}°`

// 爱星盘基准 (反解自截图)
const AE = {
  davT: [119.283, 142.03, 168.57, 200.117, 234.92, 268.77, 299.283, 322.03, 348.57, 20.117, 54.92, 88.77],
  marksBT: [153.27, 179.21, 208.13, 241.05, 273.77, 304.51, 333.27, 359.20, 28.13, 61.05, 93.48, 124.89],
}
let worst = 0, worstLabel = ''
for (const [key, ae] of Object.entries(AE)) {
  const ch = c[key]
  console.log(`\n== ${key} (真盘推运→恒星时重排法) ==`)
  console.log(`  ASC: ${fmt(ch.angles.ascendant.longitude)}  MC: ${fmt(ch.angles.midheaven.longitude)}`)
  for (let i = 0; i < 12; i++) {
    const e = n180(ch.cusps[i] - ae[i])
    if (Math.abs(e) > Math.abs(worst)) { worst = e; worstLabel = `${key} C${i + 1}` }
    console.log(`  C${String(i + 1).padStart(2)}: 我 ${fmt(ch.cusps[i])} (${ch.cusps[i].toFixed(2)})  爱 ${ae[i].toFixed(2)}  差 ${e >= 0 ? '+' : ''}${e.toFixed(2)}°`)
  }
}
console.log(`\n>>> 最大残差: ${worstLabel} = ${worst.toFixed(3)}°`)
// 快查其余4盘轴
for (const k of ['davS', 'marksBS', 'marksAS', 'marksAT']) {
  console.log(`${k}: ASC=${fmt(c[k].angles.ascendant.longitude)} MC=${fmt(c[k].angles.midheaven.longitude)}`)
}
