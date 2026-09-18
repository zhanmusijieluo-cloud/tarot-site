// 切一次盘种, 列出期间发生的全部网络请求 + 主线程空闲情况
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ORIGIN = 'https://mustar.vip'
const BASE = 'y=1977&mo=3&d=18&h=22&mi=30&lat=30.56&lng=104.27&tz=8&city=' + encodeURIComponent('成都龙泉驿')

const dir = mkdtempSync(join(tmpdir(), 'perfdetail-'))
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('oracle-lang', 'zh') } catch { /* 忽略 */ } })

const reqs = []
page.on('request', (r) => reqs.push({ t: Date.now(), url: r.url(), method: r.method(), type: r.resourceType() }))
page.on('response', (r) => {
  const rec = reqs.find((x) => x.url === r.url() && !x.status)
  if (rec) { rec.status = r.status(); rec.doneAt = Date.now() }
})

await page.goto(`${ORIGIN}/astrology/chart?${BASE}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
for (let k = 0; k < 60; k++) { await sleep(600); if (await page.evaluate(() => document.querySelectorAll('g[data-ring][data-name]').length) > 0) break }
await sleep(3000)

// 主线程空闲度: 数 1 秒内 rAF 帧数 + 每帧脚本耗时
const idleCost = await page.evaluate(() => new Promise((res) => {
  let frames = 0, scriptMs = 0
  const t0 = performance.now()
  const step = () => {
    const a = performance.now()
    // 空转一帧, 只测浏览器自身的调度负担
    const b = performance.now()
    scriptMs += b - a
    frames++
    if (performance.now() - t0 < 1000) requestAnimationFrame(step)
    else res({ frames, scriptMs: Math.round(scriptMs * 100) / 100 })
  }
  requestAnimationFrame(step)
}))
console.log(`静止时 1 秒内 rAF 帧数 = ${idleCost.frames} (约 ${idleCost.frames}fps)`)

// 切一次盘种, 记录请求
reqs.length = 0
const t0 = Date.now()
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === '三限盘')
  const pk = Object.keys(b).find((k) => k.startsWith('__reactProps'))
  b[pk].onClick?.({ preventDefault() {}, stopPropagation() {}, nativeEvent: {}, target: b, currentTarget: b })
})
await sleep(2500)
const t1 = Date.now()

console.log(`\n切换期间 (${t1 - t0}ms) 的网络请求:`)
for (const r of reqs) {
  const u = r.url.replace(ORIGIN, '').slice(0, 110)
  console.log(`  +${String(r.t - t0).padStart(4)}ms ${r.method.padEnd(5)} ${String(r.status ?? '-').padEnd(4)} ${(r.doneAt ? (r.doneAt - t0) + 'ms' : '').padStart(7)}  ${u}`)
}
if (!reqs.length) console.log('  (无请求)')

// 切换期间主线程帧率
const during = await page.evaluate(() => new Promise((res) => {
  let frames = 0
  const t0 = performance.now()
  const step = () => { frames++; if (performance.now() - t0 < 1000) requestAnimationFrame(step); else res(frames) }
  requestAnimationFrame(step)
}))
console.log(`\n切换后 1 秒 rAF 帧数 = ${during}`)

await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
