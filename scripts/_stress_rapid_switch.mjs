// 压测: 提速之后用户会疯狂连点盘种 —— 每次切换都拆掉重建 WebGL 场景,
// 正好会撞上「上下文耗尽 → webglcontextlost → 降级 → removeChild 崩」的老路。
// 这里走完整真实路径: 首页(3D卡片环占一个上下文) → 软导航进星盘 → 高速连切盘种。
// 盯: canvas 数是否单调增长 / 有没有 webglcontextlost / 盘面级降级卡 / 整页错误页。
// 用法: node scripts/_stress_rapid_switch.mjs [轮数] [--headful]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ROUNDS = Number(process.argv.find((a) => /^\d+$/.test(a)) || 30)
const HEADFUL = process.argv.includes('--headful')
const ORIGIN = 'https://mustar.vip'

const TABS = ['三限盘', '次限盘', '行运盘', '日返盘', '月返盘', '日弧', '本命盘', '三限盘', '行运盘', '次限盘']

const dir = mkdtempSync(join(tmpdir(), 'rapid-'))
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: !HEADFUL, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.evaluateOnNewDocument(() => {
  try { localStorage.setItem('oracle-lang', 'zh') } catch { /* 忽略 */ }
  window.__ctxLost = 0
  // 在页面最早时机挂上 contextlost 监听 (capture 阶段, 能抓到任何 canvas)
  document.addEventListener('webglcontextlost', () => { window.__ctxLost++ }, true)
})

const errs = []
page.on('pageerror', (e) => errs.push(`${e.name}: ${e.message}`.slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)) })
page.on('framenavigated', (f) => { if (f === page.mainFrame()) console.log('   → 整页导航', f.url().replace(ORIGIN, '').slice(0, 60)) })

console.log(`高速连切压测 · ${ROUNDS} 次 · ${HEADFUL ? '有头(真实 GPU)' : '无头'}\n`)

// 1. 首页: 让 HeroCardRing 占住一个 WebGL 上下文
await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: 90000 })
let ready = false
for (let k = 0; k < 30; k++) {
  await sleep(800)
  ready = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => {
      const t = (x.textContent || '').trim()
      return t.startsWith('Astrology') || t.startsWith('星盘')
    })
    return !!(b && Object.keys(b).some((k) => k.startsWith('__reactProps')))
  })
  if (ready) break
}
const homeCanvas = await page.evaluate(() => document.querySelectorAll('canvas').length)
console.log(`首页就绪=${ready} canvas=${homeCanvas}`)

// 2. 软导航进星盘 (首页那个上下文此时应该被 forceContextLoss 归还)
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => {
    const t = (x.textContent || '').trim()
    return t.startsWith('Astrology') || t.startsWith('星盘')
  })
  const pk = b && Object.keys(b).find((k) => k.startsWith('__reactProps'))
  if (b && pk) b[pk].onClick?.({ preventDefault() {}, stopPropagation() {}, nativeEvent: {}, target: b, currentTarget: b })
})
for (let k = 0; k < 40; k++) { await sleep(700); if (page.url().includes('/astrology')) break }

// 3. 排盘
for (let k = 0; k < 45; k++) {
  await sleep(700)
  if (await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').replace(/\s/g, '').includes('排占星盘')))) break
}
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').replace(/\s/g, '').includes('排占星盘'))
  b?.click()
})
for (let k = 0; k < 50; k++) {
  await sleep(700)
  if (await page.evaluate(() => document.querySelectorAll('g[data-ring][data-name]').length > 0)) break
}

// 4. 高速连切: 不等渲染完成就点下一个 (这是提速后最真实的滥用方式)
console.log(`\n开始高速连切 ${ROUNDS} 次…`)
let clicked = 0
for (let i = 0; i < ROUNDS; i++) {
  const tab = TABS[i % TABS.length]
  const ok = await page.evaluate((label) => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === label)
    if (!b) return false
    const pk = Object.keys(b).find((k) => k.startsWith('__reactProps'))
    // 不触发 onMouseEnter (跳过预取), 纯连点 —— 最坏情况
    b[pk].onClick?.({ preventDefault() {}, stopPropagation() {}, nativeEvent: {}, target: b, currentTarget: b })
    return true
  }, tab).catch(() => false)
  if (ok) clicked++
  await sleep(90)   // 比真实人手快得多
  if (i % 10 === 9) {
    const s = await page.evaluate(() => ({
      canvases: document.querySelectorAll('canvas').length,
      gs: document.querySelectorAll('g[data-ring][data-name]').length,
      ctxLost: window.__ctxLost,
      boundary: document.body.innerText.includes('没能画出来'),
      errPage: document.body.innerText.includes('页面出了点问题'),
    })).catch(() => null)
    if (s) console.log(`   第 ${String(i + 1).padStart(2)} 次: canvas=${s.canvases} 行星组=${s.gs} contextlost=${s.ctxLost} 降级卡=${s.boundary} 错误页=${s.errPage}`)
  }
}

await sleep(6000)
const final = await page.evaluate(() => ({
  canvases: document.querySelectorAll('canvas').length,
  gs: document.querySelectorAll('g[data-ring][data-name]').length,
  ctxLost: window.__ctxLost,
  boundary: document.body.innerText.includes('没能画出来'),
  errPage: document.body.innerText.includes('页面出了点问题'),
  msg: (document.querySelector('.font-mono')?.textContent || '').trim().slice(0, 200),
}))

console.log(`\n最终: 点击成功 ${clicked}/${ROUNDS} · canvas=${final.canvases} 行星组=${final.gs} · webglcontextlost=${final.ctxLost} · 降级卡=${final.boundary} · 错误页=${final.errPage}`)
if (final.msg) console.log(`降级卡报错: ${final.msg}`)
const realErrs = errs.filter((e) => !/Failed to load resource|favicon|Download the React DevTools/.test(e))
console.log(`控制台错误 ${realErrs.length} 条`)
realErrs.slice(0, 8).forEach((e) => console.log('   ' + e))

const bad = final.boundary || final.errPage || final.ctxLost > 0 || final.gs === 0
console.log(bad ? '\n❌ 有异常' : '\n✅ 全绿')

await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
