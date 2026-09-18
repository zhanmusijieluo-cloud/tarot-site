// 累积性泄漏压力测试 —— 「偶尔崩溃」的另一面。
// 交互矩阵只切了 2 次 3D, 看不出「每次漏一点点」的累积效应。
// 这里反复切视图 / 切盘种, 盯 canvas 数与 JS 堆有没有单调增长。
// 用法: node scripts/_live_leak_stress.mjs [轮数] [--headful]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const HEADFUL = process.argv.includes('--headful')
const ROUNDS = Number(process.argv.find((a) => /^\d+$/.test(a)) || 12)
const URL_ =
  'https://mustar.vip/astrology/chart?y=1995&mo=6&d=15&h=14&mi=30&cn=%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC&lat=39.9042&lng=116.4074&sys=placidus'

const dir = mkdtempSync(join(tmpdir(), 'leak-'))
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: !HEADFUL,
  userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900', '--enable-precise-memory-info'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })

const errs = []
page.on('pageerror', (e) => errs.push(`${e.name}: ${e.message}`.slice(0, 160)))
page.on('console', (m) => {
  const t = m.text()
  if (m.type() === 'error') errs.push('[console] ' + t.slice(0, 160))
  // 上下文被浏览器掐掉的信号 —— 泄漏最严重的表现
  if (/context lost|CONTEXT_LOST|Too many active WebGL|WebGL context/i.test(t)) errs.push('[webgl] ' + t.slice(0, 160))
})

await page.goto('https://mustar.vip/', { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))
await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90000 })

let ok = false
for (let i = 0; i < 40; i++) {
  await sleep(800)
  ok = await page.evaluate(() => document.querySelectorAll('g[data-ring][data-name]').length > 0)
  if (ok) break
}
if (!ok) {
  console.log('❌ 初始盘面未就绪')
  await browser.close()
  process.exit(1)
}

const snap = () =>
  page.evaluate(() => ({
    canvases: document.querySelectorAll('canvas').length,
    planetGs: document.querySelectorAll('g[data-ring][data-name]').length,
    heapMB:
      typeof performance !== 'undefined' && performance.memory
        ? Math.round(performance.memory.usedJSHeapSize / 1048576)
        : -1,
    errPage: document.body.innerText.includes('页面出了点问题'),
  }))

const clickBtn = (t) =>
  page.evaluate((txt) => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').replace(/\s/g, '').includes(txt))
    if (!b) return false
    b.click()
    return true
  }, t)

console.log(`模式: ${HEADFUL ? '有头(真实 GPU)' : '无头'} · ${ROUNDS} 轮 3D 往返\n`)
const s0 = await snap()
console.log(`基线: canvas=${s0.canvases} 行星组=${s0.planetGs} 堆=${s0.heapMB}MB\n`)

console.log('— A. 3D ↔ 2D 往返（最容易泄漏的一条）—')
const rows = []
for (let i = 1; i <= ROUNDS; i++) {
  await clickBtn('俯视')
  await sleep(2600)
  const in3d = await snap()
  await clickBtn('经典')
  await sleep(2000)
  const back = await snap()
  rows.push({ i, in3d: in3d.canvases, back: back.canvases, heap: back.heapMB, err: back.errPage })
  console.log(
    `  #${String(i).padStart(2)}  3D:canvas=${in3d.canvases}  →  回2D:canvas=${back.canvases} 堆=${back.heapMB}MB 错误页=${back.errPage}`,
  )
}

const first = rows[0]
const last = rows[rows.length - 1]
console.log(
  `\nA 段小结: 回 2D 后 canvas ${first.back} → ${last.back}（应恒定）· 堆 ${first.heap}MB → ${last.heap}MB`,
)

console.log('\n— B. 盘种循环（连切两圈）—')
const SPREADS = ['行运盘', '三限盘', '次限盘', '月返盘', '日返盘', '法达', '日弧', '小限', '天象盘', '本命盘']
for (let r = 1; r <= 2; r++) {
  for (const s of SPREADS) {
    await clickBtn(s)
    await sleep(900)
  }
  const st = await snap()
  console.log(`  第 ${r} 圈结束: canvas=${st.canvases} 行星组=${st.planetGs} 堆=${st.heapMB}MB 错误页=${st.errPage}`)
}

const fin = await snap()
console.log(`\n最终: canvas=${fin.canvases} 行星组=${fin.planetGs} 堆=${fin.heapMB}MB 错误页=${fin.errPage}`)
console.log(`全程 JS 错误 ${errs.length} 条`)
if (errs.length) console.log(`  ${errs.slice(0, 8).join('\n  ')}`)

const canvasLeak = last.back > first.back
const heapGrow = last.heap > 0 && first.heap > 0 && last.heap - first.heap > 120
console.log(
  canvasLeak
    ? '\n❌ canvas 数在增长 → WebGL 上下文泄漏'
    : heapGrow
      ? `\n⚠️ canvas 稳定, 但 JS 堆涨了 ${last.heap - first.heap}MB → 留意纹理/对象是否释放`
      : '\n✅ 无泄漏迹象: canvas 恒定, 堆无明显增长',
)

await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
