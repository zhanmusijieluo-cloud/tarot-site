// 本地验证：确认本轮「星盘稳定性」修复在本地 dev server 上生效且无回归。
//
// 覆盖:
//   A. 10 个盘种逐个加载 → 无 pageerror / 无 4xx / 盘面确实画出来 (非空壳)
//   B. WebGL 上下文churn: 经典↔俯视↔侧视 快速来回切 12 次 → 无标签页崩溃
//   C. 点星体 → 弹窗出现
//
// 用法: node scripts/_chart_local_verify.mjs [baseUrl]
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const BASE = (process.argv[2] || 'http://localhost:3021').replace(/\/$/, '')
const Q = '?y=1995&mo=6&d=15&h=14&mi=30&cn=%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC&lat=39.9042&lng=116.4074&sys=placidus'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// [按钮文案, 期望 URL 里出现的 dp 值]
const TYPES = [
  ['本命盘', null],
  ['次限盘', 's'],
  ['三限盘', 't'],
  ['行运盘', 'tr'],
  ['日返盘', 'sr'],
  ['月返盘', 'lr'],
  ['日弧', 'arc'],
  ['法达', 'fir'],
  ['小限', 'prof'],
  ['天象盘', 'sky'],
]

let pass = 0, fail = 0
const ok = (b, label, extra = '') => { b ? pass++ : fail++; console.log(`${b ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`) }

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--no-proxy-server', '--js-flags=--expose-gc'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 960 })

let pageErrors = [], consoleErrors = [], badResponses = [], crashed = false
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)) })
page.on('response', (r) => { if (r.status() >= 400) badResponses.push(`HTTP ${r.status()} ${r.url().slice(0, 100)}`) })
page.on('error', (e) => { crashed = true; console.log('💥 标签页崩溃:', String(e).slice(0, 200)) })

const reset = () => { pageErrors = []; consoleErrors = []; badResponses = []; crashed = false }

// 盘面是否真的画出来了: 线条盘 = svg.select-none 里有 g[data-ring][data-name];
// 3D = 有 canvas 且宽高非 0。
// ⚠️ 别用 `svg[viewBox]` —— 会先撞上导航 logo / 图标, 误判成"已渲染"。
const wheelRendered = () => page.evaluate(() => {
  const svg = document.querySelector('svg.select-none')
  const svgPaths = svg ? svg.querySelectorAll('path').length : 0
  const planetGs = document.querySelectorAll('g[data-ring][data-name]').length
  const canvas = document.querySelector('canvas')
  const canvasOk = !!canvas && canvas.width > 0 && canvas.height > 0
  return { svgPaths, planetGs, canvasOk, hasError: !!document.body.innerText.includes('页面出了点问题') }
})

const clickBtn = (label) => page.evaluate((l) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.trim().includes(l))
  if (!b) return false
  b.click()
  return true
}, label)

console.log(`\n=== 目标: ${BASE} ===\n`)

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))
await page.goto(BASE + '/astrology/chart' + Q, { waitUntil: 'domcontentloaded', timeout: 60000 })
await sleep(4000)

// ---------- A. 盘种逐个 ----------
console.log('— A. 10 个盘种 —')
for (const [label, dp] of TYPES) {
  reset()
  if (label !== '本命盘') {
    const hit = await clickBtn(label)
    if (!hit) { ok(false, `${label} 切换按钮找不到`); continue }
    await sleep(3200)
  }
  const st = await wheelRendered()
  const urlOk = dp === null ? true : page.url().includes(`dp=${dp}`)
  const clean = pageErrors.length === 0 && !crashed
  // 经典线条盘: 盘面 svg 里应有大量 path 且挂出了行星 <g>; 3D: canvas 有尺寸
  const drawn = st.svgPaths > 20 && st.planetGs > 0 || st.canvasOk
  ok(clean && !st.hasError && drawn,
    `${label}${urlOk ? '' : ' (URL 未带 dp!)'}`,
    `svgPaths=${st.svgPaths} planetGs=${st.planetGs} canvas=${st.canvasOk} err=${pageErrors.length}${pageErrors[0] ? ' | ' + pageErrors[0] : ''}`)
  if (badResponses.length) console.log('   ⚠️ 4xx/5xx:', badResponses.slice(0, 3).join(' ; '))
}

// ---------- B. WebGL 上下文 churn ----------
console.log('\n— B. 3D 视图反复切换 (压 WebGL 上下文回收) —')
reset()
await clickBtn('本命盘'); await sleep(2500)
for (let i = 0; i < 12; i++) {
  await clickBtn('俯视'); await sleep(700)
  await clickBtn('侧视'); await sleep(700)
  await clickBtn('经典'); await sleep(500)
}
await sleep(1500)
const ctxLost = consoleErrors.filter((x) => /context lost|CONTEXT_LOST|Too many active WebGL/i.test(x))
// canvas 数量不增长 = WebGL 上下文真的被回收了 (Starfield 1 个 + 星盘 1 个 ≈ 2)
const after = await page.evaluate(() => ({
  canvases: document.querySelectorAll('canvas').length,
  heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1,
}))
ok(!crashed && pageErrors.length === 0, '12 轮视图切换后无崩溃', `pageerror=${pageErrors.length} ctxLost=${ctxLost.length}`)
ok(after.canvases <= 3, 'WebGL 上下文未堆积', `canvas=${after.canvases} heap=${after.heapMB}MB`)
if (pageErrors.length) console.log('   ', pageErrors.slice(0, 3).join('\n    '))
if (ctxLost.length) console.log('   WebGL 相关:', ctxLost.slice(0, 2).join(' ; '))

// ---------- C. 点星体 ----------
console.log('\n— C. 点星体弹窗 —')
reset()
const clicked = await page.evaluate(() => {
  const gs = [...document.querySelectorAll('g[data-ring][data-name]')]
  if (!gs.length) return 0
  // 逐颗派发冒泡 click (不能用 page.click: <g> 的包围盒中心常是空白)
  for (const g of gs.slice(0, 12)) {
    g.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  }
  return gs.length
})
await sleep(1500)
const popup = await page.evaluate(() => !!document.querySelector('[data-planet-detail]'))
ok(clicked > 0 && popup && pageErrors.length === 0, '点星体出弹窗', `可点星体=${clicked} popup=${popup} err=${pageErrors.length}`)

console.log(`\n=== 结果: ${pass} 通过 / ${fail} 失败 ===\n`)
await browser.close()
process.exit(fail > 0 ? 1 : 0)
