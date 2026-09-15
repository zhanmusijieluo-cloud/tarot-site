// 拉我们全部盘的10行星 (marksB基础 / marksBT / marksBS / natalB次限三限) 用于对拍
const res = await fetch('http://localhost:3000/api/astro/chart/synastry', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    birthA: { year: 1998, month: 2, day: 19, hour: 9, minute: 45, timezone: 8, latitude: 31.028, longitude: 106.413, city: '蓬安' },
    birthB: { year: 1993, month: 5, day: 29, hour: 9, minute: 50, timezone: 8, latitude: 31.028, longitude: 106.413, city: '蓬安' },
  }),
})
const c = (await res.json()).chart
const SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼']
const fmt = (l) => `${SIGNS[Math.floor((l % 360) / 30)]}${Math.floor(l % 30)}°${String(Math.round(((l % 30) % 1) * 60)).padStart(2, '0')}′`
const NAMES = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']
const show = (tag, ch) => {
  console.log(`\n== ${tag} ==`)
  for (const n of NAMES) {
    const p = ch.planets.find(p => p.name === n)
    if (p) console.log(`  ${n.padEnd(8)} ${fmt(p.longitude)} (${p.longitude.toFixed(2)})`)
  }
}
show('marksB 基础', c.marksB)
show('marksBT 三限', c.marksBT)
show('marksBS 次限', c.marksBS)
