// 3D 场景反复建/拆压测。
//
// 背景: 盘面默认是 2D 线条盘 (ChartWheel 的 useState('classic')), 动态盘更是
// viewModes={['classic']} 只有 2D —— 所以切盘种根本不会建 WebGL 上下文。
// 真正会反复 new/dispose WebGL 场景的只有一条路:
//   本命盘 → 点「3D/侧视」→ 切到别的盘种(3D 卸载) → 切回本命盘 → 再点 3D → …
// 这是验证 forceContextLoss() 有没有真正归还上下文的地方 (canvas 数是否单调增长)。
//
// 用法: node scripts/_stress_3d_churn.mjs [轮数] [--headful]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ROUNDS = Number(process.argv.find((a) => /^\d+$/.test(a)) || 12)
const HEADFUL = process.argv.includes('--headful')
const ORIGIN = 'https://mustar.vip'
const BASE = 'y=1977&mo=3&d=18&h=22&mi=30&lat=30.56&lng=104.27&tz=8&city=' + encodeURIComponent('成都龙泉驿')

const dir = mkdtempSync(join(tmpdir(), 'churn-'))
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: !HEADFUL, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.evaluateOnNewDocument(() => {
  try { localStorage.setItem('oracle-lang', 'zh') } catch { /* 忽略 */ }
  window.__ctxLost = 0
  document.addEventListener('webglcontextlost', () => { window.__ctxLost++ }, true)
})
const errs = []
page.on('pageerror', (e) => errs.push(`${e.name}: ${e.message}`.slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)) })

const clickText = (label) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === t)
  if (!b) return false
  const pk = Object.keys(b).find((k) => k.startsWith('__reactProps'))
  b[pk].onClick?.({ preventDefault() {}, stopPropagation() {}, nativeEvent: {}, target: b, currentTarget: b })
  return true
}, label)

const snap = () => page.evaluate(() => ({
  canvases: document.querySelectorAll('canvas').length,
  glCanvas: [...document.querySelectorAll('canvas')].filter((c) => {
    try { return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
  }).length,
  ctxLost: window.__ctxLost,
  has3d: !!document.querySelector('[class*="cursor-grab"]'),
  boundary: document.body.innerText.includes('没能画出来'),
  errPage: document.body.innerText.includes('页面出了点问题'),
}))

console.log(`3D 场景反复建/拆压测 · ${ROUNDS} 轮 · ${HEADFUL ? '有头(真实 GPU)' : '无头'}\n`)
await page.goto(`${ORIGIN}/astrology/chart?${BASE}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
for (let k = 0; k < 60; k++) { await sleep(600); if (await page.evaluate(() => document.querySelectorAll('g[data-ring][data-name]').length > 0)) break }
console.log('初始:', JSON.stringify(await snap()))

const VIEW_BTN = await page.evaluate(() => {
  const labels = [...document.querySelectorAll('button')].map((x) => (x.textContent || '').trim())
  return labels.filter((x) => /3D|立体|侧视|顶视|Top|Side|Classic|线条/.test(x)).slice(0, 6)
})
console.log('视图按钮候选:', JSON.stringify(VIEW_BTN))

let bad = 0
for (let i = 1; i <= ROUNDS; i++) {
  // 1. 切到 3D (第 2 个视图按钮; 第 1 个是 classic)
  const okView = await clickText(VIEW_BTN[1] ?? '3D')
  await sleep(1400)
  const s1 = await snap()
  // 2. 切走 (3D 场景卸载 → 应归还上下文)
  await clickText('三限盘')
  await sleep(1200)
  // 3. 切回本命盘
  await clickText('本命盘')
  await sleep(1400)
  const s2 = await snap()
  const flag = s2.errPage || s2.boundary ? '❌' : '✅'
  if (flag === '❌') bad++
  console.log(`  ${flag} 第 ${String(i).padStart(2)} 轮 点3D=${okView} → 3D态:canvas=${s1.canvases} gl=${s1.glCanvas} 3d挂载=${s1.has3d} → 切走再回:canvas=${s2.canvases} gl=${s2.glCanvas} ctxlost=${s2.ctxLost} 降级卡=${s2.boundary} 错误页=${s2.errPage}`)
}

const fin = await snap()
console.log(`\n最终: canvas=${fin.canvases} glCanvas=${fin.glCanvas} webglcontextlost=${fin.ctxLost} 降级卡=${fin.boundary} 错误页=${fin.errPage}`)
const realErrs = errs.filter((e) => !/Failed to load resource|favicon|React DevTools/.test(e))
console.log(`控制台错误 ${realErrs.length} 条`)
realErrs.slice(0, 8).forEach((e) => console.log('   ' + e))
console.log(bad || fin.ctxLost || fin.boundary || fin.errPage ? '\n❌ 有异常' : '\n✅ 全绿')

await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
