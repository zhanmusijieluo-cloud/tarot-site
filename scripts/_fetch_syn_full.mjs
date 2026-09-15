// 从本地API拉合盘全量数据 v2: + 组合盘(base/S/T) + 目标时刻JD
const BIRTH_A = { year: 1998, month: 2, day: 19, hour: 9, minute: 45, timezone: 8, latitude: 31.028, longitude: 106.413, city: '蓬安', label: '木木' }
const BIRTH_B = { year: 1993, month: 5, day: 29, hour: 9, minute: 50, timezone: 8, latitude: 31.028, longitude: 106.413, city: '蓬安', label: '老姐' }
const res = await fetch('http://localhost:3000/api/astro/chart/synastry', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ birthA: BIRTH_A, birthB: BIRTH_B }),
})
const j = await res.json()
if (!j.chart) { console.log('ERR', JSON.stringify(j)); process.exit(1) }
const c = j.chart
const pick = (ch) => ({
  sun: ch.planets.find(p => p.name === 'Sun')?.longitude,
  moon: ch.planets.find(p => p.name === 'Moon')?.longitude,
  asc: ch.angles.ascendant?.longitude,
  mc: ch.angles.midheaven?.longitude,
  cusps: ch.cusps, lat: ch.input?.latitude, jd: ch.jd,
})
// 目标时刻的JD (2026-09-14 12:00 +8 蓬安) — 与引擎 todayTarget 同口径
const tRes = await fetch('http://localhost:3000/api/astro/chart', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ birth: { ...BIRTH_A, year: 2026, month: 9, day: 14, hour: 12, minute: 0 } }),
})
const tj = await tRes.json()
const out = {
  targetJD_2026_09_14_12: tj.chart?.jd ?? null,
  davison: { base: pick(c.davisonChart), T: pick(c.davT), S: pick(c.davS) },
  marksB: { base: pick(c.marksB), T: pick(c.marksBT), S: pick(c.marksBS) },
  marksA: { base: pick(c.marksA), T: pick(c.marksAT), S: pick(c.marksAS) },
  composite: { base: pick(c.composite), T: pick(c.compT), S: pick(c.compS) },
  natalA: { base: pick(c.a) },
  natalB: { base: pick(c.b) },
}
console.log(JSON.stringify(out, null, 1))
