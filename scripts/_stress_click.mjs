// 内存泄漏复测 — 线上生产环境 + 3D 视图点击 (木木报「点星体突然崩溃」)
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = 'https://mustar.vip/astrology/chart?y=1995&mo=6&d=15&h=14&mi=30&cid=beijing&sys=placidus'

const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox', '--enable-precise-memory-info'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 940 })
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + String(e).slice(0, 250)))
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 250)) })
page.on('error', (e) => errs.push('TAB_CRASH: ' + String(e).slice(0, 200)))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = (t) => page.evaluate((txt) => { const el = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === txt); if (el) { el.click(); return true } return false }, t)
const mem = () => page.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1)
const clickAllBodies = async () => {
  const names = await page.evaluate(() => [...document.querySelectorAll('g[data-ring]')].map((g) => g.getAttribute('data-ring') + '|' + g.getAttribute('data-name')))
  for (const n of names) {
    const [ring, name] = n.split('|')
    await page.evaluate((r, nm) => { const g = document.querySelector(`g[data-ring="${r}"][data-name="${nm}"]`); if (g) g.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })) }, ring, name)
    await sleep(50)
  }
  return names.length
}

await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 90000 })
await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))
await page.reload({ waitUntil: 'networkidle0', timeout: 90000 })
await sleep(4000)

console.log('=== A. 线上 · 经典线条盘 · 反复点 12 轮 ===')
console.log('  起始堆 = ' + (await mem()) + ' MB')
const s1 = []
for (let i = 0; i < 12; i++) {
  await clickAllBodies()
  s1.push(await mem())
}
console.log('  ' + s1.join(' → ') + ' MB')
const grow1 = s1[s1.length - 1] - s1[0]
console.log('  12 轮净增 = ' + grow1 + ' MB  (线性泄漏则持续涨; 收敛则只是缓存)')

console.log('\n=== B. 线上 · 俯视(3D) · canvas 连点 80 次 ===')
await clickText('俯视')
await sleep(3000)
const box = await page.evaluate(() => { const c = document.querySelector('div.cursor-grab canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
if (!box) {
  console.log('  ⚠️ 没找到 3D canvas')
} else {
  const before = await mem()
  for (let i = 0; i < 80; i++) {
    const px = box.x + box.w * (0.25 + 0.5 * ((i * 37) % 100) / 100)
    const py = box.y + box.h * (0.25 + 0.5 * ((i * 61) % 100) / 100)
    await page.mouse.click(px, py)
    await sleep(40)
  }
  await sleep(1000)
  const after = await mem()
  console.log('  80 次点击: ' + before + ' → ' + after + ' MB (Δ' + (after - before) + ')')
  console.log('  页面存活 =', await page.evaluate(() => !!document.querySelector('div.cursor-grab canvas')).catch(() => false))
}

if (errs.length) console.log('\n⚠️ 捕获到的错误:\n  ' + errs.slice(0, 8).join('\n  '))
else console.log('\n✅ 全程无 JS 错误 / 无标签页崩溃')

await b.close()
