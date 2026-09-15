// 法达环点击 v3: 取子段色块 bbox 中心真实 mouse.click
import puppeteer from 'puppeteer-core'

const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1460, height: 1000 })
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 140)) })
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 160)))
await page.goto('http://localhost:3000/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&city=%E8%93%AC%E5%AE%89&dp=fir', { waitUntil: 'networkidle0', timeout: 90000 })
await new Promise((r) => setTimeout(r, 8000))
// 找第2个主段 g 的某个子段 path 的"填充点"坐标 (用 path SVG 坐标逆变换: 取 d 属性第一个点近似)
const pt = await page.evaluate(() => {
  const gs = [...document.querySelectorAll('svg g[style]')].filter((x) => x.getAttribute('style')?.includes('pointer'))
  const g = gs[1]
  const p = g.querySelector('path')
  const bb = p.getBBox()
  // bbox 不一定在弧上; 用 svg 点变换: 取弧中外半径中点 — 直接调 SVGPoint 沿 d 采样
  const svg = g.ownerSVGElement
  const len = p.getTotalLength()
  for (let i = 0; i < 40; i++) {
    const q = p.getPointAtLength((len * i) / 40)
    const m = p.getScreenCTM()
    const sp = svg.createSVGPoint(); sp.x = q.x; sp.y = q.y
    const scr = sp.matrixTransform(m)
    if (i === 5) return { x: scr.x, y: scr.y }
  }
  return null
})
console.log('色块采样点:', pt)
await page.mouse.click(pt.x, pt.y)
await new Promise((r) => setTimeout(r, 6000))
console.log('点击后URL:', decodeURIComponent(page.url().slice(0, 160)))
console.log(page.url().includes('dp=tr') ? '✅ 跳转行运盘生效' : '❌ 未跳转')
await b.close()
