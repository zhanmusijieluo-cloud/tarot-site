// 相位线删除验收 v2: 2D 弦线=0 + 点行星弹窗含相位 + 切3D俯视/侧视无报错
import puppeteer from 'puppeteer-core'
const URL = 'http://localhost:3000/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&lang=zh'
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)))
page.on('console', (m) => { if (m.type() === 'error') errs.push('c:' + m.text().slice(0, 140)) })
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 1500))

// 1) 2D 线条盘弦线 (transition 样式 line) + 四色 line
const chords = await page.evaluate(() => {
  const svg = [...document.querySelectorAll('svg')].find((x) => x.getAttribute('viewBox') === '0 0 920 920')
  const ASPECT_COLS = ['#ffd75e', '#5b9dd9', '#e05c5c', '#5cc87f', '#a86fd8', '#8f97ad']
  const trans = [...svg.querySelectorAll('line')].filter((l) => (l.getAttribute('style') || '').includes('transition'))
  const colored = [...svg.querySelectorAll('line')].filter((l) => ASPECT_COLS.some((c) => (l.getAttribute('stroke') || '').toLowerCase() === c))
  return { transChords: trans.length, aspectColoredLines: colored.length, totalLines: svg.querySelectorAll('line').length }
})
console.log('2D弦线:', JSON.stringify(chords))

// 2) 点太阳 → 弹窗含相位
const pos = await page.evaluate(() => {
  const svg = [...document.querySelectorAll('svg')].find((x) => x.getAttribute('viewBox') === '0 0 920 920')
  const g = svg.querySelector('g[data-name="Sun"]')
  const gp = g.querySelector('g > g[transform]')
  const m = gp.getAttribute('transform').match(/translate\(([-\d.]+),([-\d.]+)\)/)
  const ctm = gp.getScreenCTM()
  return { x: ctm.a * (+m[1]) + ctm.e, y: ctm.d * (+m[2]) + ctm.f }
})
await page.mouse.click(pos.x, pos.y)
await new Promise((r) => setTimeout(r, 900))
const popup = await page.evaluate(() => {
  const t = document.body.innerText
  const m = t.match(/相位[^\n]{0,60}|Aspect[^\n]{0,60}/)
  return { hasAspect: /相位|Aspect/i.test(t), sample: m ? m[0].replace(/\s+/g, ' ') : '' }
})
console.log('太阳弹窗含相位:', JSON.stringify(popup))

// 3) 切俯视 3D
const clickView = async (re) => page.evaluate((src) => {
  const rx = new RegExp(src)
  const btn = [...document.querySelectorAll('button')].find((x) => rx.test((x.textContent || '').trim()))
  if (btn) { btn.click(); return (btn.textContent || '').trim() }
  return 'NOT FOUND'
}, re)
console.log('切俯视:', await clickView('俯视|^Top'))
await new Promise((r) => setTimeout(r, 3000))
// canvas 存在且无报错 = 3D 正常
const has3d = await page.evaluate(() => !!document.querySelector('canvas'))
console.log('3D canvas:', has3d)
await page.screenshot({ path: 'scripts/_no_lines_top.png' })
console.log('切侧视:', await clickView('侧视|^Side'))
await new Promise((r) => setTimeout(r, 2500))
await page.screenshot({ path: 'scripts/_no_lines_side.png' })
console.log('JS错误:', errs.length ? errs.slice(0, 4) : '无')
await b.close()
