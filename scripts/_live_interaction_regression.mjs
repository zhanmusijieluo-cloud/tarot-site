// 线上完整交互回归 —— 木木最初报的是「排盘 / 点星体 / 切换星盘时偶尔崩溃」。
// 修完那 5 个脆弱点后, 还没把这条完整路径在**线上 + 真实 GPU** 上跑过一遍。
// 用法: node scripts/_live_interaction_regression.mjs [--headful]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const HEADFUL = process.argv.includes('--headful')
const URL_ =
  'https://mustar.vip/astrology/chart?y=1995&mo=6&d=15&h=14&mi=30&cn=%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC&lat=39.9042&lng=116.4074&sys=placidus'

// 盘种（顺序刻意打乱, 反复切才能真正压到场景重建）
const SPREADS = ['行运盘', '三限盘', '次限盘', '月返盘', '日返盘', '法达', '日弧', '小限', '天象盘', '本命盘']
// 视图（俯视/侧视 = 3D, 最容易暴露 WebGL 问题）
const VIEWS = ['线条盘', '经典', '俯视', '侧视', '经典']

const dir = mkdtempSync(join(tmpdir(), 'liveint-'))
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: !HEADFUL,
  userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })

const errs = [], failed = []
page.on('pageerror', (e) => errs.push(`${e.name}: ${e.message}`.slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)) })
page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText || '?'} ${r.url().slice(0, 80)}`))
page.on('response', (r) => { if (r.status() >= 400) failed.push(`HTTP ${r.status()} ${r.url().slice(0, 80)}`) })

console.log(`模式: ${HEADFUL ? '有头(真实 GPU)' : '无头'} · 视口 1440×900\n`)

await page.goto('https://mustar.vip/', { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))
await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90000 })

let ready = false
for (let i = 0; i < 40; i++) {
  await sleep(800)
  ready = await page.evaluate(() => document.querySelectorAll('g[data-ring][data-name]').length > 0)
  if (ready) break
}
if (!ready) {
  const head = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 120))
  console.log(`❌ 初始盘面未就绪 · 页面开头: ${head}`)
  await browser.close()
  process.exit(1)
}
console.log('✅ 初始本命盘就绪\n')

const state = () =>
  page.evaluate(() => ({
    errPage: document.body.innerText.includes('页面出了点问题'),
    boundary: document.body.innerText.includes('这张盘没能画出来'),
    planetGs: document.querySelectorAll('g[data-ring][data-name]').length,
    canvases: document.querySelectorAll('canvas').length,
  }))

const clickBtn = (txt) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').replace(/\s/g, '').includes(t))
    if (!b) return false
    b.click()
    return true
  }, txt)

let bad = 0

// ---- A. 切换盘种 ----
console.log('— A. 切换盘种 —')
for (const s of SPREADS) {
  const before = errs.length
  if (!(await clickBtn(s))) { console.log(`  ⚠️ ${s}: 按钮没找到`); continue }
  await sleep(2600)
  const st = await state()
  const isBad = st.errPage || st.boundary || errs.length > before
  if (isBad) bad++
  console.log(
    `  ${isBad ? '❌' : '✅'} ${s.padEnd(4)} — 错误页=${st.errPage} 盘面卡=${st.boundary} 行星组=${st.planetGs} canvas=${st.canvases}`,
  )
  if (errs.length > before) console.log(`     ${errs.slice(before, before + 2).join('\n     ')}`)
}

// ---- B. 点星体（逐个）----
console.log('\n— B. 点星体（逐个弹窗）—')
await sleep(1500)
const names = await page.evaluate(() =>
  [...document.querySelectorAll('g[data-ring][data-name]')].map((g) => g.getAttribute('data-name')),
)
let hit = 0
const miss = []
for (const n of names) {
  const before = errs.length
  const ok = await page.evaluate((name) => {
    const g = [...document.querySelectorAll('g[data-ring][data-name]')].find((x) => x.getAttribute('data-name') === name)
    if (!g) return false
    // ⚠️ SVG <g> 上 page.click() 会产生假失败, 必须 dispatchEvent
    g.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    return true
  }, n)
  await sleep(650)
  const shown = await page.evaluate(() => !!document.querySelector('[data-planet-detail]'))
  if (ok && shown && errs.length === before) hit++
  else miss.push(`${n}(弹窗=${shown} 新错=${errs.length - before})`)
}
if (miss.length) bad++
console.log(`  ${miss.length ? '❌' : '✅'} 弹窗正常 ${hit}/${names.length}${miss.length ? ` · 异常: ${miss.join(', ')}` : ''}`)

// ---- C. 切换视图（含 3D）----
console.log('\n— C. 切换视图 —')
for (const v of VIEWS) {
  const before = errs.length
  if (!(await clickBtn(v))) { console.log(`  ⚠️ ${v}: 按钮没找到`); continue }
  await sleep(3200)
  const st = await state()
  const isBad = st.errPage || st.boundary || errs.length > before
  if (isBad) bad++
  console.log(`  ${isBad ? '❌' : '✅'} ${v.padEnd(4)} — 错误页=${st.errPage} canvas=${st.canvases} 行星组=${st.planetGs}`)
}

// ---- 总结 ----
const fin = await state()
console.log(`\n最终: 错误页=${fin.errPage} 盘面卡=${fin.boundary} 行星组=${fin.planetGs} canvas=${fin.canvases}`)
console.log(`全程: JS 错误 ${errs.length} 条 · 失败请求 ${failed.length} 条`)
if (errs.length) console.log(`  ${errs.slice(0, 8).join('\n  ')}`)
if (failed.length) console.log(`  ${failed.slice(0, 5).join('\n  ')}`)
console.log(bad === 0 ? '\n🎉 全绿：交互全程无崩溃、无错误页' : `\n⚠️ 有 ${bad} 处异常`)

await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
