// 直接量盘面渲染循环的每帧开销 —— 判断「空闲降频」到底有没有生效。
// 做法: 在页面加载前包一层 requestAnimationFrame, 记录每个回调自身的耗时。
//   降频生效 → 大部分回调是「空转」(几乎 0ms), 只有 1/4 是重活。
//   降频没生效 → 每个回调都 1~3ms。
// 用法: node scripts/_perf_raf_cost.mjs [origin] [--headful]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const argUrl = process.argv.find((a) => a.startsWith('http'))
const ORIGIN = argUrl || 'https://mustar.vip'
const HEADFUL = process.argv.includes('--headful')
const BASE = 'y=1977&mo=3&d=18&h=22&mi=30&lat=30.56&lng=104.27&tz=8&city=' + encodeURIComponent('成都龙泉驿')

const dir = mkdtempSync(join(tmpdir(), 'rafcost-'))
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: !HEADFUL, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.evaluateOnNewDocument(() => {
  try { localStorage.setItem('oracle-lang', 'zh') } catch { /* 忽略 */ }
  const orig = window.requestAnimationFrame.bind(window)
  window.__raf = { total: 0, heavy: 0, heavyMs: 0, reset: false }
  window.requestAnimationFrame = function (cb) {
    return orig(function (ts) {
      const a = performance.now()
      try { cb(ts) } catch (e) { throw e }
      const d = performance.now() - a
      if (window.__raf.reset) {
        window.__raf.total++
        if (d > 0.5) { window.__raf.heavy++; window.__raf.heavyMs += d }
      }
    })
  }
})

await page.goto(`${ORIGIN}/astrology/chart?${BASE}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
for (let k = 0; k < 60; k++) { await sleep(600); if (await page.evaluate(() => document.querySelectorAll('g[data-ring][data-name]').length) > 0) break }

// 等彻底静下来 (自转回正 + 所有缓动收敛)
await sleep(8000)
await page.evaluate(() => { window.__raf.total = 0; window.__raf.heavy = 0; window.__raf.heavyMs = 0; window.__raf.reset = true })
await sleep(4000)
const r = await page.evaluate(() => {
  const x = window.__raf
  return { total: x.total, heavy: x.heavy, heavyMs: Math.round(x.heavyMs * 10) / 10, fps: Math.round(x.total / 4) }
})

console.log(`${ORIGIN}`)
console.log(`  4 秒内 rAF 回调 ${r.total} 次 (${r.fps}fps) · 其中"重活"(>0.5ms) ${r.heavy} 次 · 重活总耗时 ${r.heavyMs}ms`)
console.log(`  → 重活占比 ${r.total ? Math.round(r.heavy / r.total * 100) : 0}% · 平均每帧主线程 ${r.total ? (r.heavyMs / r.total).toFixed(2) : 0}ms`)

await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
