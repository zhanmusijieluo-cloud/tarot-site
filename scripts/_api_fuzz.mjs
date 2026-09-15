// API 边角料轰炸: 喂坏数据/极端值, 期望 400/合理 JSON, 不能 500 崩
const BASE = 'http://localhost:3000'

const chart = (body) => [`${BASE}/api/astro/chart`, body]
const cases = [
  ['chart 空body', chart({})],
  ['chart 缺year', chart({ birth: { month: 2, day: 19 } })],
  ['chart year=0', chart({ birth: { year: 0, month: 2, day: 19, timezone: 8, latitude: 31, longitude: 106 } })],
  ['chart year=99999', chart({ birth: { year: 99999, month: 2, day: 19, timezone: 8, latitude: 31, longitude: 106 } })],
  ['chart lat=999', chart({ birth: { year: 1998, month: 2, day: 19, timezone: 8, latitude: 999, longitude: 106 } })],
  ['chart lng=-999', chart({ birth: { year: 1998, month: 2, day: 19, timezone: 8, latitude: 31, longitude: -999 } })],
  ['chart month=13', chart({ birth: { year: 1998, month: 13, day: 19, timezone: 8, latitude: 31, longitude: 106 } })],
  ['chart day=32', chart({ birth: { year: 1998, month: 2, day: 32, timezone: 8, latitude: 31, longitude: 106 } })],
  ['chart timeKnown=false', chart({ birth: { year: 1998, month: 2, day: 19, timezone: 8, latitude: 31, longitude: 106, timeKnown: false } })],
  ['chart 高纬特罗姆瑟', chart({ birth: { year: 1990, month: 1, day: 15, hour: 3, minute: 0, timezone: 1, latitude: 69.649, longitude: 18.955, houseSystem: 'placidus' } })],
  ['chart 宫制=乱写', chart({ birth: { year: 1998, month: 2, day: 19, hour: 9, minute: 45, timezone: 8, latitude: 31, longitude: 106, houseSystem: 'hack-system' } })],
  ['chart 1901边界', chart({ birth: { year: 1901, month: 1, day: 1, hour: 0, minute: 0, timezone: 8, latitude: 31, longitude: 106 } })],
  ['chart 2100边界', chart({ birth: { year: 2100, month: 12, day: 31, hour: 23, minute: 59, timezone: 8, latitude: -89, longitude: 179 } })],
  ['dynamic 三限未来', [`${BASE}/api/astro/chart/dynamic`, { birth: { year: 1998, month: 2, day: 19, hour: 9, minute: 45, timezone: 8, latitude: 31, longitude: 106 }, target: { year: 2099, month: 12, day: 31 }, mode: 'tertiary' }]],
  ['dynamic mode乱写', [`${BASE}/api/astro/chart/dynamic`, { birth: { year: 1998, month: 2, day: 19, hour: 9, minute: 45, timezone: 8, latitude: 31, longitude: 106 }, target: { year: 2026, month: 9, day: 14 }, mode: 'hacker' }]],
  ['dynamic 缺target', [`${BASE}/api/astro/chart/dynamic`, { birth: { year: 1998, month: 2, day: 19, hour: 9, minute: 45, timezone: 8, latitude: 31, longitude: 106 }, mode: 'secondary' }]],
  ['synastry 同一人', [`${BASE}/api/astro/chart/synastry`, { birthA: { year: 1998, month: 2, day: 19, hour: 9, minute: 45, timezone: 8, latitude: 31.028, longitude: 106.413 }, birthB: { year: 1998, month: 2, day: 19, hour: 9, minute: 45, timezone: 8, latitude: 31.028, longitude: 106.413 } }]],
  ['synastry 缺B', [`${BASE}/api/astro/chart/synastry`, { birthA: { year: 1998, month: 2, day: 19, hour: 9, minute: 45, timezone: 8, latitude: 31.028, longitude: 106.413 } }]],
  ['synastry 对跖点', [`${BASE}/api/astro/chart/synastry`, { birthA: { year: 1998, month: 2, day: 19, hour: 9, minute: 45, timezone: 8, latitude: 31, longitude: 106 }, birthB: { year: 1993, month: 5, day: 29, hour: 9, minute: 50, timezone: 8, latitude: -31, longitude: -74 } }]],
  ['interpret 空问题', [`${BASE}/api/interpret`, { question: '' }]],
  ['followup 空body', [`${BASE}/api/followup`, {}]],
]

let crashed = 0
for (const [tag, [url, body]] of cases) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) })
    const j = await r.json().catch(() => null)
    const errField = j?.error || j?.message || ''
    const bad = r.status >= 500
    if (bad) crashed++
    console.log(`${bad ? '💥500' : r.status === 400 ? '✅400' : '[' + r.status + ']'} ${tag} ${errField ? '→ ' + String(errField).slice(0, 60) : ''}`)
  } catch (e) {
    crashed++
    console.log(`💥网络/超时 ${tag}: ${String(e).slice(0, 80)}`)
  }
}
console.log(crashed ? `\n=== ${crashed} 个500级崩溃! ===` : '\n=== 无500级崩溃, API 边角全部妥善处理 ===')
