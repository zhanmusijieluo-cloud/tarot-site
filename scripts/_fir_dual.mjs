// 法达双环验证: 截图 + 几何计数(大运9/小运61) + 点击弹窗不跳转
import puppeteer from 'puppeteer-core'
const URL = 'http://localhost:3000/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&dp=fir&lang=zh'
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 1500))
console.log('页面JS错误:', errs.length ? errs.slice(0, 3) : '无')

// 环上段弧 path 的起点半径 (相对盘心460,460) 判定属于大运环(362~394)还是小运环(398~430)
const geo = await page.evaluate(() => {
  const cx = 460, cy = 460
  const C = 920
  const svg = [...document.querySelectorAll('svg')].find((s) => s.getAttribute('viewBox') === '0 0 920 920')
  const vb = svg.viewBox.baseVal
  const scale = svg.getBoundingClientRect().width / vb.width
  const main = [], sub = []
  for (const p of svg.querySelectorAll('path')) {
    const d = p.getAttribute('d') || ''
    const m = d.match(/^M\s+(-?[\d.]+)[ ,]+(-?[\d.]+)[ ,]+A/)
    if (!m) continue
    const x = +m[1], y = +m[2]
    const r = Math.hypot(x - 460, y - 460)
    const st = getComputedStyle(p)
    if (parseFloat(st.opacity) === 0 || st.display === 'none') continue
    if (r > 350 && r < 400) main.push(Math.round(r))
    else if (r >= 400 && r < 440) sub.push(Math.round(r))
  }
  return { main: main.length, sub: sub.length, mainR: main[0], subR: sub[0] }
})
console.log('大运环段数(半径≈394):', geo.main, '| 小运环段数(半径≈430):', geo.sub)

await page.screenshot({ path: 'scripts/_fir_dual.png' })

// 点小运段 → 弹窗出现 + URL 不变
const beforeUrl = page.url()
const pos = await page.evaluate(() => {
  const svg = [...document.querySelectorAll('svg')].find((s) => s.getAttribute('viewBox') === '0 0 920 920')
  const r = svg.getBoundingClientRect()
  const scale = r.width / 920
  const gs = [...svg.querySelectorAll('g')].filter((g) => (g.getAttribute('style') || '').includes('pointer'))
  const target = gs[Math.floor(gs.length / 2)]
  if (!target) return null
  const p = target.querySelector('path')
  const pt = p.getPointAtLength(p.getTotalLength() * 0.3)
  const m = p.getScreenCTM()
  return { x: m.a * pt.x + m.c * pt.y + m.e, y: m.b * pt.x + m.d * pt.y + m.f, n: gs.length }
})
if (pos) await page.mouse.click(pos.x, pos.y)
await new Promise((r) => setTimeout(r, 700))
const afterUrl = page.url()
const pop = await page.evaluate(() => {
  const d = [...document.querySelectorAll('div')].find((x) => /大运|period/.test(x.textContent || '') && String(x.className).includes('rounded-xl'))
  return d ? d.textContent.slice(0, 130) : 'NO POPUP'
})
console.log('可点段总数:', pos?.n)
console.log('点击后URL未变(不跳转):', beforeUrl === afterUrl)
console.log('弹窗:', pop)
// 弹窗里的跳转按钮
const hasJump = await page.evaluate(() => !![...document.querySelectorAll('button')].find((x) => /跳转|jump chart/.test(x.textContent || '')))
console.log('弹窗含"跳转此时起排盘"按钮:', hasJump)
if (hasJump) {
  await page.evaluate(() => [...document.querySelectorAll('button')].find((x) => /跳转|jump chart/.test(x.textContent || ''))?.click())
  await new Promise((r) => setTimeout(r, 900))
  console.log('点跳转后URL:', page.url().includes('dp=tr') ? '已切行运盘 ✅' : '未切换 ❌ ' + page.url().slice(-60))
}
await b.close()
