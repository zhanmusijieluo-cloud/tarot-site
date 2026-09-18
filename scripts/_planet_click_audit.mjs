// 真实浏览器「点星体」稳定性测试 —— 木木 2026-09-18
// 目的: 复现「点击星体突然崩溃」。监听 pageerror / console error / 资源加载失败,
//       并逐颗星点击, 确认弹窗正常且页面存活。
// 用法: node scripts/_planet_click_audit.mjs
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const BASE = 'https://mustar.vip/astrology/chart'
const Q = '?y=1995&mo=6&d=15&h=14&mi=30&cn=%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC&lat=39.9042&lng=116.4074&sys=placidus'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--no-proxy-server'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 960 })

const pageErrors = []
const consoleErrors = []
const failedReqs = []
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)))
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200))
})
page.on('requestfailed', (r) => failedReqs.push(`${r.failure()?.errorText || '?'} ${r.url().slice(0, 110)}`))
page.on('response', (r) => {
  if (r.status() >= 400) failedReqs.push(`HTTP ${r.status()} ${r.url().slice(0, 110)}`)
})

// 先设语言, 避免首屏走英文分支
await page.goto('https://mustar.vip/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))

console.log('打开星盘页…')
await page.goto(BASE + Q, { waitUntil: 'domcontentloaded', timeout: 60000 })
await sleep(3500)

const hasWheel = await page.evaluate(() => !!document.querySelector('svg.select-none'))
console.log('盘面渲染:', hasWheel)

const planets = await page.evaluate(() =>
  [...document.querySelectorAll('g[data-ring][data-name]')].map((g) => ({
    ring: g.getAttribute('data-ring'),
    name: g.getAttribute('data-name'),
  })),
)
console.log('可点击星体数:', planets.length)

let clicked = 0
let detailOk = 0
const failures = []

// 注意: 不能用 page.click() —— 它点的是元素包围盒中心, 而 SVG 的 <g> 中心
// 常常是空白区域, 点击会落到下层元素上(触发取消选中), 造成「假失败」。
// 改用直接派发冒泡 MouseEvent, 可靠触发 React 的 onClick。
const clickPlanet = (ring, name) =>
  page.evaluate(
    (r, n) => {
      const el = document.querySelector(`g[data-ring="${r}"][data-name="${n}"]`)
      if (!el) return false
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      return true
    },
    ring,
    name,
  )

for (const p of planets) {
  const alive = await page.evaluate(() => !!document.querySelector('svg.select-none')).catch(() => false)
  if (!alive) {
    failures.push(`页面在点击 ${p.name} 前已崩溃`)
    break
  }
  try {
    const found = await clickPlanet(p.ring, p.name)
    if (!found) {
      failures.push(`${p.ring}/${p.name}: 找不到元素`)
      continue
    }
    await sleep(450)
    const detail = await page.evaluate(() => {
      const d = document.querySelector('[data-planet-detail]')
      return d ? { key: d.getAttribute('data-planet-detail'), len: d.innerText.trim().length } : null
    })
    clicked++
    if (detail) detailOk++
    else failures.push(`${p.ring}/${p.name}: 未出现弹窗`)
  } catch (e) {
    failures.push(`${p.ring}/${p.name}: 点击异常 ${String(e).slice(0, 80)}`)
  }
}

// 再切几种盘种点一遍（按文字包含匹配按钮）
const allBtns = await page.evaluate(() =>
  [...document.querySelectorAll('button')].map((b) => b.textContent?.trim()).filter(Boolean),
)
console.log('页面按钮:', JSON.stringify(allBtns.slice(0, 24)))

const TYPES = ['次限', '三限', '行运', '日返']
for (const t of TYPES) {
  const ok = await page.evaluate((label) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.trim().includes(label))
    if (b) {
      b.click()
      return true
    }
    return false
  }, t)
  if (!ok) {
    failures.push(`找不到「${t}」按钮`)
    continue
  }
  await sleep(2500)
  const alive = await page.evaluate(() => !!document.querySelector('svg.select-none'))
  if (!alive) {
    failures.push(`切到「${t}」后盘面消失`)
    continue
  }
  const ps = await page.evaluate(() =>
    [...document.querySelectorAll('g[data-ring][data-name]')].slice(0, 3).map((g) => ({
      ring: g.getAttribute('data-ring'),
      name: g.getAttribute('data-name'),
    })),
  )
  for (const p of ps) {
    try {
      await clickPlanet(p.ring, p.name)
      await sleep(400)
      clicked++
      const d = await page.evaluate(() => !!document.querySelector('[data-planet-detail]'))
      if (d) detailOk++
      else failures.push(`${t}/${p.name}: 未出现弹窗`)
    } catch (e) {
      failures.push(`${t}/${p.name}: ${String(e).slice(0, 70)}`)
    }
  }
}

const finalAlive = await page.evaluate(() => !!document.querySelector('svg.select-none')).catch(() => false)

console.log('\n=== 结果 ===')
console.log(`点击次数      : ${clicked}`)
console.log(`弹窗正常      : ${detailOk}`)
console.log(`页面最终存活  : ${finalAlive}`)
console.log(`JS 运行时错误 : ${pageErrors.length}`)
pageErrors.slice(0, 5).forEach((e) => console.log('   ! ' + e))
console.log(`控制台 error  : ${consoleErrors.length}`)
consoleErrors.slice(0, 5).forEach((e) => console.log('   ! ' + e))
console.log(`资源/HTTP 失败: ${failedReqs.length}`)
failedReqs.slice(0, 8).forEach((e) => console.log('   ! ' + e))
console.log(`交互失败明细  : ${failures.length}`)
failures.slice(0, 8).forEach((e) => console.log('   ! ' + e))

await browser.close()
const clean = pageErrors.length === 0 && failedReqs.length === 0 && failures.length === 0 && finalAlive
console.log(clean ? '\n✅ 全绿: 无 JS 错误、无资源失败、无交互失败、页面存活' : '\n⚠️  存在异常, 见上')
process.exit(clean ? 0 : 1)
