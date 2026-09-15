// dump 星座符号位置 + 形状特征
import puppeteer from 'puppeteer-core'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const ARCH_KEY = 'astro-archives-v1'
const archive = { id: 'test-laosh', label: '老姐', birth: { year: 1993, month: 5, day: 29, hour: 9, minute: 50, timezone: 8, latitude: 31.028, longitude: 106.413, city: '蓬安县', timeKnown: true }, note: '', contact: '', savedAt: Date.now() }
const URL_SYN = 'http://localhost:3000/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&city=%E8%93%AC%E5%AE%89%E5%8E%BF&sync=test-laosh&stab=compS'

const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 1000 })
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.evaluate((k, a) => { localStorage.setItem(k, JSON.stringify([a])); localStorage.setItem('oracle-lang', 'zh') }, ARCH_KEY, archive)
await page.goto(URL_SYN, { waitUntil: 'networkidle0', timeout: 90000 })
await page.waitForFunction(() => {
  const s = document.querySelector('svg[viewBox="0 0 920 920"]')
  return s && s.querySelectorAll('path').length >= 30
}, { timeout: 60000 })
await new Promise((r) => setTimeout(r, 2000))

const dump = await page.evaluate(() => {
  const s = document.querySelector('svg[viewBox="0 0 920 920"]')
  const cx = 460, cy = 460
  const out = []
  for (const p of s.querySelectorAll('path')) {
    const bb = p.getBBox()
    const mx = bb.x + bb.width / 2, my = bb.y + bb.height / 2
    const r = Math.round(Math.hypot(mx - cx, my - cy))
    const ang = Math.round(((Math.atan2(mx - cx, -(my - cy)) * 180 / Math.PI) + 360) % 360)
    const d = (p.getAttribute('d') || '').replace(/\s+/g, ' ').slice(0, 46)
    const tf = (p.getAttribute('transform') || '').slice(0, 40)
    out.push({ r, ang, w: Math.round(bb.width), h: Math.round(bb.height), d, tf })
  }
  // 星座带半径区间 ~348-392: 找 r 在 340-400 的
  const band = out.filter((x) => x.r > 330 && x.r < 410)
  return { total: out.length, band: band.sort((a, c) => a.ang - c.ang), others: out.filter((x) => !(x.r > 330 && x.r < 410)).map((x) => `${x.r}@${x.ang}`) }
})
console.log('path总数:', dump.total)
console.log('=== 星座带区域 (r 330-410) ===')
for (const x of dump.band) console.log(`r=${x.r} ang=${String(x.ang).padStart(3)} ${x.w}x${x.h} d="${x.d}" tf="${x.tf}"`)
console.log('=== 其他 ===')
console.log(dump.others.join('  '))
await b.close()
