// 直接抓 CPU Profile, 按「自身耗时」聚合出到底哪个函数在烧主线程
// (先量后改: 别再靠排除法猜了 —— 上一轮猜 Starfield 就没验证)
// 用法: node scripts/_perf_profile_idle.mjs [--path=/about] [--sec=4]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const PAGE = argOf('path', '/about')
const SEC = Number(argOf('sec', '4'))

const dir = mkdtempSync(join(tmpdir(), 'prof-'))
const HEADFUL = process.argv.includes('--headful')
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: !HEADFUL, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('https://mustar.vip' + PAGE, { waitUntil: 'domcontentloaded', timeout: 90000 })
await sleep(12000)

const cdp = await page.createCDPSession()
await cdp.send('Profiler.enable')
await cdp.send('Profiler.setSamplingInterval', { interval: 200 })   // 200µs 采样
await cdp.send('Profiler.start')
await sleep(SEC * 1000)
const { profile } = await cdp.send('Profiler.stop')

// 自身耗时聚合: samples[i] 对应 timeDeltas[i] (µs)
const byId = new Map(profile.nodes.map((n) => [n.id, n]))
const self = new Map()
let total = 0
for (let i = 0; i < profile.samples.length; i++) {
  const dt = profile.timeDeltas[i] || 0
  const node = byId.get(profile.samples[i])
  if (!node) continue
  const cf = node.callFrame
  const url = (cf.url || '').replace(/^https?:\/\/[^/]+/, '')
  const key = `${cf.functionName || '(anonymous)'} @ ${url}:${cf.lineNumber + 1}`
  self.set(key, (self.get(key) || 0) + dt)
  total += dt
}
const rows = [...self.entries()].map(([k, v]) => ({ k, ms: v / 1000 })).sort((a, b) => b.ms - a.ms)
console.log(`页面 ${PAGE} · 采样 ${SEC}s · 采样点 ${profile.samples.length} · 样本总时长 ${(total / 1000).toFixed(0)}ms`)
console.log(`(只统计 JS 自身耗时; TaskDuration 里还有光栅化/合成, 不在这份 profile 里)\n`)
for (const r of rows.slice(0, 22)) {
  const pct = (r.ms / (SEC * 1000)) * 100
  console.log(`  ${r.ms.toFixed(1).padStart(7)}ms  ${pct.toFixed(1).padStart(5)}%  ${r.k.slice(0, 110)}`)
}
const jsTotal = rows.reduce((a, b) => a + b.ms, 0)
console.log(`\n  JS 合计 ${jsTotal.toFixed(0)}ms / ${SEC * 1000}ms = ${(jsTotal / (SEC * 10)).toFixed(1)}% 主线程`)
await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
