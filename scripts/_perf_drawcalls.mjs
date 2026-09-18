// 数 WebGL 绘制调用次数 → 直接判定盘面到底每秒画几帧 (比测 TaskDuration 干净得多)
// 用法: node scripts/_perf_drawcalls.mjs [--headful]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const HEADFUL = process.argv.includes('--headful')
const ORIGIN = 'https://mustar.vip'
const BASE = 'y=1977&mo=3&d=18&h=22&mi=30&lat=30.56&lng=104.27&tz=8&city=' + encodeURIComponent('成都龙泉驿')

const dir = mkdtempSync(join(tmpdir(), 'drawcalls-'))
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: !HEADFUL, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.evaluateOnNewDocument(() => {
  try { localStorage.setItem('oracle-lang', 'zh') } catch { /* 忽略 */ }
  window.__gl = { draw: 0, raf: 0, heavy: 0 }
  for (const name of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
    const C = window[name]
    if (!C) continue
    for (const fn of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const orig = C.prototype[fn]
      if (!orig) continue
      C.prototype[fn] = function (...a) { window.__gl.draw++; return orig.apply(this, a) }
    }
  }
  const oraf = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = function (cb) {
    return oraf(function (ts) {
      const a = performance.now()
      cb(ts)
      if (performance.now() - a > 0.5) window.__gl.heavy++
      window.__gl.raf++
    })
  }
})

await page.goto(`${ORIGIN}/astrology/chart?${BASE}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
for (let k = 0; k < 60; k++) { await sleep(600); if (await page.evaluate(() => document.querySelectorAll('g[data-ring][data-name]').length) > 0) break }
await sleep(9000)   // 静置: 自转回正 + 缓动收敛

const sample = async (label, secs) => {
  await page.evaluate(() => { window.__gl.draw = 0; window.__gl.raf = 0; window.__gl.heavy = 0 })
  await sleep(secs * 1000)
  const r = await page.evaluate(() => ({ ...window.__gl }))
  console.log(`${label}: ${secs}s 内 绘制调用 ${r.draw} 次 (≈${(r.draw / secs).toFixed(0)}/s) · rAF ${r.raf} 次 (${(r.raf / secs).toFixed(0)}fps) · 重活 ${r.heavy} 次 (${Math.round(r.heavy / Math.max(1, r.raf) * 100)}%)`)
}

await sample('静止', 4)

// 交互中 (拖拽) 应该回到满帧
await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2
  c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, pointerId: 1 }))
  window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: cx + 30, clientY: cy + 10, pointerId: 1 }))
})
await sample('拖拽中', 3)

await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
