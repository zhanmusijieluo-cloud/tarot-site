// 本地/线上星盘页稳定性回归。
//
// 覆盖:
//   A. 10 个盘种逐个加载 → 无 pageerror / 无 4xx / 盘面确实画出来 (非空壳)
//   B. WebGL 上下文 churn: 经典↔俯视↔侧视 快速来回切 12 次 → 无标签页崩溃 + canvas 不堆积
//   C. 点星体 → 弹窗出现
//
// 用法: node scripts/_chart_local_verify.mjs [baseUrl]
//
// ⚠️ 必须轮询等就绪, 不能用固定 sleep —— 线上(CDN 冷启动)要 ~12s 才水合,
//    本地 dev 只要 ~3s。固定 sleep 会把「慢」误判成「坏」。
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '')
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

// 盘面状态快照。⚠️ 别用 `svg[viewBox]` —— 会先撞上导航 logo/图标, 误判"已渲染"。
const snap = () => page.evaluate(() => {
  const svg = document.querySelector('svg.select-none')
  return {
    svgPaths: svg ? svg.querySelectorAll('path').length : 0,
    planetGs: document.querySelectorAll('g[data-ring][data-name]').length,
    buttons: document.querySelectorAll('button').length,
    canvases: document.querySelectorAll('canvas').length,
    hasError: !!document.body.innerText.includes('页面出了点问题'),
  }
})

// 轮询等「控制条 + 盘面」都就绪; 线上冷启动可能要十几秒
const waitReady = async (timeoutMs = 45000) => {
  const t0 = Date.now()
  let last = null
  while (Date.now() - t0 < timeoutMs) {
    last = await snap()
    if (last.buttons > 20 && (last.planetGs > 0 || last.canvases > 1)) return last
    await sleep(700)
  }
  return last
}

// 等 URL 落到目标盘种 (确认导航真的发生了, 避免拿旧盘面当新盘面)
const waitUrl = async (dp, timeoutMs = 15000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    if (page.url().includes(`dp=${dp}`)) return true
    await sleep(300)
  }
  return false
}

const clickBtn = (label) => page.evaluate((l) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.trim().includes(l))
  if (!b) return false
  b.click()
  return true
}, label)

console.log(`\n=== 目标: ${BASE} ===\n`)

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))
await page.goto(BASE + '/astrology/chart' + Q, { waitUntil: 'domcontentloaded', timeout: 90000 })

const first = await waitReady()
console.log(`首屏就绪: 按钮=${first.buttons} 行星组=${first.planetGs} 盘面path=${first.svgPaths} (冷启动轮询)\n`)

// ---------- A. 盘种逐个 ----------
console.log('— A. 10 个盘种 —')
for (const [label, dp] of TYPES) {
  reset()
  if (label !== '本命盘') {
    const hit = await clickBtn(label)
    if (!hit) { ok(false, `${label} 切换按钮找不到`); continue }
    if (dp) await waitUrl(dp)
  }
  const st = await waitReady()
  const urlOk = dp === null ? true : page.url().includes(`dp=${dp}`)
  const clean = pageErrors.length === 0 && !crashed
  const drawn = st.svgPaths > 20 && st.planetGs > 0 || st.canvases > 1
  ok(clean && !st.hasError && drawn,
    `${label}${urlOk ? '' : ' (URL 未带 dp!)'}`,
    `svgPaths=${st.svgPaths} planetGs=${st.planetGs} err=${pageErrors.length}${pageErrors[0] ? ' | ' + pageErrors[0] : ''}`)
  if (badResponses.length) console.log('   ⚠️ 4xx/5xx:', badResponses.slice(0, 3).join(' ; '))
}

// ---------- B. WebGL 上下文 churn ----------
console.log('\n— B. 3D 视图反复切换 (压 WebGL 上下文回收) —')
reset()
await clickBtn('本命盘'); await waitReady()
for (let i = 0; i < 12; i++) {
  await clickBtn('俯视'); await sleep(900)
  await clickBtn('侧视'); await sleep(900)
  await clickBtn('经典'); await sleep(700)
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
