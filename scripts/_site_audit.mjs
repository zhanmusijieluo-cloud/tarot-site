// 全站体检机器人: 逐页访问, 抓 console error / pageerror / 404 / 500 / 网络失败
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = 'http://localhost:3000'
const PAGES = [
  '/', '/about', '/manual', '/spreads',
  '/tarot', '/reading', '/reading/session', '/online', '/online/custom', '/online/quick', '/offline', '/daily',
  '/online/spread/celtic-cross',
  '/lenormand', '/lenormand/draw', '/lenormand/custom', '/lenormand/offline', '/lenormand/card/1',
  '/learn', '/learn/myth', '/learn/practice', '/learn/card/1', '/learn/myth/hermes', '/learn/practice/basics',
  '/astrology', '/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&city=%E8%93%AC%E5%AE%89',
  '/archives', '/login', '/register',
  '/bazi', '/ziwei',
  '/no-such-page-404-test',
]

const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 1000 })

const report = []
for (const p of PAGES) {
  const rec = { page: p, consoleErrs: [], pageErrs: [], badResp: [], failedReq: [], status: null }
  const onConsole = (m) => { if (m.type() === 'error') rec.consoleErrs.push(m.text().slice(0, 150)) }
  const onPageError = (e) => rec.pageErrs.push(String(e).slice(0, 150))
  const onResponse = (r) => { if (r.status() >= 400) rec.badResp.push(r.status() + ' ' + r.url().replace(BASE, '').slice(0, 80)) }
  const onRequestFailed = (r) => {
    const f = r.failure()?.errorText
    if (f && f !== 'net::ERR_ABORTED') rec.failedReq.push(f + ' ' + r.url().replace(BASE, '').slice(0, 80))
  }
  page.on('console', onConsole); page.on('pageerror', onPageError); page.on('response', onResponse); page.on('requestfailed', onRequestFailed)
  try {
    const resp = await page.goto(BASE + p, { waitUntil: 'networkidle0', timeout: 45000 }).catch(async (e) => {
      // networkidle 超时的页面退回 domcontentloaded (有持续请求的页面)
      return await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 45000 })
    })
    rec.status = resp ? resp.status() : 'goto-failed'
    await new Promise((r) => setTimeout(r, 3500))
  } catch (e) {
    rec.status = 'NAV-FAIL: ' + String(e).slice(0, 80)
  }
  page.off('console', onConsole); page.off('pageerror', onPageError); page.off('response', onResponse); page.off('requestfailed', onRequestFailed)
  const clean = !rec.pageErrs.length && !rec.badResp.length && !rec.failedReq.length && rec.status !== 'NAV-FAIL'
  report.push(rec)
  if (!clean || p.includes('404-test')) {
    console.log(`\n[${rec.status}] ${p}`)
    if (rec.pageErrs.length) console.log('  PAGE ERROR:', rec.pageErrs.slice(0, 3))
    if (rec.badResp.length) console.log('  HTTP>=400:', [...new Set(rec.badResp)].slice(0, 6))
    if (rec.failedReq.length) console.log('  网络失败:', [...new Set(rec.failedReq)].slice(0, 6))
    if (rec.consoleErrs.length) console.log('  console:', [...new Set(rec.consoleErrs)].slice(0, 4))
  } else {
    console.log(`[${rec.status}] ${p} ✅`)
  }
}
await b.close()
console.log('\n=== 体检完成 ===')
