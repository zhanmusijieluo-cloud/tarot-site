// 刁钻场景: 脏localStorage + 手机视口 + 极端时区
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()

// 1) 脏 localStorage: 档案库写成乱码/坏JSON → 档案页与排盘页不能崩
const dirt = [
  ['astro-archives-v1', '{corrupt json!!'],
  ['astro-archives-v1', 'null'],
  ['astro-archives-v1', JSON.stringify([{ id: 'x', label: '缺birth字段' }])],
  ['astro-archives-v1', JSON.stringify([{ id: 'y', label: '坏birth', birth: { year: 'abc', month: null } }])],
]
for (const [k, v] of dirt) {
  const errs = []
  const onErr = (e) => errs.push(String(e).slice(0, 100))
  page.on('pageerror', onErr)
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [k, v])
  for (const p of ['/archives', '/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31&lng=106']) {
    errs.length = 0
    await page.goto('http://localhost:3000' + p, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await new Promise((r) => setTimeout(r, 4000))
    const crashed = errs.some((e) => /insertBefore|Cannot read|hydration|null is not an/i.test(e))
    console.log(`脏档案(${v.slice(0, 30)}) → ${p.slice(0, 20)} ${crashed ? '💥崩: ' + errs[0] : '✅'}`)
  }
  page.off('pageerror', onErr)
}

// 2) 手机视口 390px: 关键页渲染
await page.setViewport({ width: 390, height: 844 })
for (const p of ['/', '/tarot', '/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31&lng=106']) {
  const errs = []
  const onErr = (e) => errs.push(String(e).slice(0, 100))
  page.on('pageerror', onErr)
  await page.goto('http://localhost:3000' + p, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
  await new Promise((r) => setTimeout(r, 4500))
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  console.log(`手机390px ${p.slice(0, 30)} ${errs.length ? '💥' + errs[0] : overflow > 30 ? '⚠️横向溢出' + overflow + 'px' : '✅'}`)
  page.off('pageerror', onErr)
}

// 3) 极端时区 API (东13太平洋, 西12)
page.close(); await b.close()
for (const tz of [13, -12, 14, -11]) {
  const r = await fetch('http://localhost:3000/api/astro/chart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ birth: { year: 1995, month: 6, day: 15, hour: 23, minute: 50, timezone: tz, latitude: -18.14, longitude: 178.44 } }) })
  const j = await r.json().catch(() => null)
  console.log(`时区${tz >= 0 ? '+' : ''}${tz}: ${r.status} ${r.status === 200 ? 'ASC=' + j.chart.angles.ascendant.degInSign.toFixed(1) + '° (有值)' : '→ ' + (j?.error || '')}`)
}
