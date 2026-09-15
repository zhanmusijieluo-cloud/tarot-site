// 线上站抽样体检: mustar.vip 关键页 + console error
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = 'https://mustar.vip'
const PAGES = [
  '/', '/tarot', '/astrology', '/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&city=%E8%93%AC%E5%AE%89',
  '/lenormand', '/learn', '/login', '/register', '/spreads',
]

const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 1000 })

for (const p of PAGES) {
  const errs = [], bad = []
  const onConsole = (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)) }
  const onPageError = (e) => errs.push('[pageerror] ' + String(e).slice(0, 120))
  const onResponse = (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().slice(0, 90)) }
  page.on('console', onConsole); page.on('pageerror', onPageError); page.on('response', onResponse)
  let st = 'NAV-FAIL'
  try {
    const resp = await page.goto(BASE + p, { waitUntil: 'networkidle0', timeout: 45000 }).catch(() => page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 45000 }))
    st = resp ? resp.status() : 'null'
    await new Promise((r) => setTimeout(r, 4000))
  } catch (e) { st = 'FAIL' }
  page.off('console', onConsole); page.off('pageerror', onPageError); page.off('response', onResponse)
  const ok = !errs.length && !bad.length && st === 200
  console.log(`[${st}] ${p} ${ok ? '✅' : '⚠️'}`)
  if (!ok) { if (bad.length) console.log('  HTTP>=400:', [...new Set(bad)].slice(0, 5)); if (errs.length) console.log('  console:', [...new Set(errs)].slice(0, 3)) }
}
await b.close()
console.log('线上体检完成')
