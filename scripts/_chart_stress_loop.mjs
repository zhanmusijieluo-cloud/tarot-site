// 星盘页交互压测：模拟「排盘 → 点星体 → 切盘种 → 切 3D」的真实操作循环。
// 目标: 复现木木报的「偶尔崩溃」。同时监控 JS 错误 / 资源失败 / 标签页崩溃 / 内存曲线。
// 用法: node scripts/_chart_stress_loop.mjs [轮数]
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const BASE = 'https://mustar.vip/astrology/chart'
const Q = '?y=1995&mo=6&d=15&h=14&mi=30&cn=%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC&lat=39.9042&lng=116.4074&sys=placidus'
const ROUNDS = Number(process.argv[2] || 6)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const TYPES = ['本命盘', '次限盘', '三限盘', '行运盘', '日返盘', '月返盘', '日弧', '法达', '小限', '天象盘']

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--no-proxy-server', '--js-flags=--expose-gc'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 960 })

const pageErrors = []
const consoleErrors = []
const failedReqs = []
let crashed = false
let crashAt = ''

page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)))
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160))
})
page.on('requestfailed', (r) => failedReqs.push(`${r.failure()?.errorText || '?'} ${r.url().slice(0, 90)}`))
page.on('response', (r) => {
  if (r.status() >= 400) failedReqs.push(`HTTP ${r.status()} ${r.url().slice(0, 90)}`)
})
page.on('error', (e) => {
  crashed = true
  crashAt = String(e).slice(0, 200)
})

await page.goto('https://mustar.vip/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))
await page.goto(BASE + Q, { waitUntil: 'domcontentloaded', timeout: 60000 })
await sleep(3500)

const clickText = (label) =>
  page.evaluate((l) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.trim().includes(l))
    if (!b) return false
    b.click()
    return true
  }, label)

const clickPlanets = (n) =>
  page.evaluate((count) => {
    const gs = [...document.querySelectorAll('g[data-ring][data-name]')].slice(0, count)
    let k = 0
    for (const g of gs) {
      g.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      k++
    }
    return k
  }, n)

const mem = () =>
  page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1)).catch(() => -1)

const alive = () => page.evaluate(() => !!document.querySelector('svg.select-none')).catch(() => false)

console.log(`交互压测开始：${ROUNDS} 轮 × (切 10 个盘种 + 点星体)\n`)
const memTrace = []

for (let round = 1; round <= ROUNDS; round++) {
  for (const t of TYPES) {
    if (crashed) break
    const okBtn = await clickText(t)
    if (!okBtn) continue
    await sleep(1900)
    if (!(await alive())) {
      console.log(`  ✗ 轮${round} 切到「${t}」后盘面消失`)
      continue
    }
    await clickPlanets(5)
    await sleep(500)
  }
  // 每轮顺带切一次 3D 视图（WebGL 崩溃高发区）
  if (!crashed) {
    await clickText('俯视')
    await sleep(1800)
    await clickText('侧视')
    await sleep(1800)
    await clickText('经典 · 线条盘')
    await sleep(1200)
  }
  const m = await mem()
  memTrace.push(m)
  console.log(`  轮 ${round}/${ROUNDS}  堆内存=${m}MB  崩溃=${crashed}`)
  if (crashed) break
}

const finalAlive = await alive()
console.log('\n=== 结果 ===')
console.log(`标签页崩溃      : ${crashed}${crashAt ? '  → ' + crashAt : ''}`)
console.log(`页面最终存活    : ${finalAlive}`)
console.log(`JS 运行时错误   : ${pageErrors.length}`)
pageErrors.slice(0, 6).forEach((e) => console.log('   ! ' + e))
console.log(`控制台 error    : ${consoleErrors.length}`)
consoleErrors.slice(0, 6).forEach((e) => console.log('   ! ' + e))
console.log(`资源/HTTP 失败  : ${failedReqs.length}`)
failedReqs.slice(0, 8).forEach((e) => console.log('   ! ' + e))
console.log(`堆内存曲线      : ${memTrace.join(' → ')} MB`)
if (memTrace.length > 1) {
  const growth = memTrace[memTrace.length - 1] - memTrace[0]
  console.log(`堆增长          : ${growth > 0 ? '+' : ''}${growth} MB`)
}

await browser.close()
const clean = !crashed && pageErrors.length === 0 && failedReqs.length === 0 && finalAlive
console.log(clean ? '\n✅ 未复现崩溃' : '\n⚠️  存在异常')
process.exit(clean ? 0 : 1)
