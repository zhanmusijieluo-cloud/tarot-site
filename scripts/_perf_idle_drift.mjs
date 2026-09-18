// 对照组: 不做任何操作, 连测 N 次同样的 3 秒窗口 —— 检验「主线程占用」这个指标本身稳不稳
// 若数字自己往上漂, 说明之前 A/B 的差异是漂移而非真效果 (先证明尺子是直的)
// 用法: node scripts/_perf_idle_drift.mjs [--path=/about] [--n=5] [--headful]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const HEADFUL = process.argv.includes('--headful')
const PAGE = argOf('path', '/about')
const N = Number(argOf('n', '5'))

const dir = mkdtempSync(join(tmpdir(), 'drift-'))
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: !HEADFUL, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
// 数 rAF 频率: 页面里到底有几个 rAF 消费者、每秒多少帧
await page.evaluateOnNewDocument(() => {
  const orig = window.requestAnimationFrame.bind(window)
  window.__raf = { n: 0, t0: performance.now() }
  window.requestAnimationFrame = (cb) => orig((ts) => { window.__raf.n++; cb(ts) })
})
await page.goto('https://mustar.vip' + PAGE, { waitUntil: 'domcontentloaded', timeout: 90000 })
await sleep(12000)

const cdp = await page.createCDPSession()
await cdp.send('Performance.enable')
const read = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))

console.log(`页面 ${PAGE} · 连测 ${N} 次, 每次 3 秒, 期间不做任何操作\n`)
const rows = []
for (let i = 1; i <= N; i++) {
  const rafA = await page.evaluate(() => window.__raf.n)
  const a = await read()
  await sleep(3000)
  const b = await read()
  const rafB = await page.evaluate(() => window.__raf.n)
  const task = (b.TaskDuration - a.TaskDuration) * 1000
  const script = (b.ScriptDuration - a.ScriptDuration) * 1000
  rows.push({ i, task, script, raf: rafB - rafA })
  console.log(`  第 ${i} 次  主线程 ${task.toFixed(0).padStart(4)}ms/3s (${(task / 30).toFixed(1)}%) · 脚本 ${script.toFixed(0).padStart(4)}ms (${(script / 30).toFixed(1)}%) · rAF ${(rafB - rafA) / 3} 次/秒`)
}
const tasks = rows.map((r) => r.task)
const scripts = rows.map((r) => r.script)
const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length
const sd = (v) => Math.sqrt(mean(v.map((x) => (x - mean(v)) ** 2)))
console.log(`\n  主线程 均值 ${mean(tasks).toFixed(0)}ms · 标准差 ${sd(tasks).toFixed(0)}ms · 极差 ${(Math.max(...tasks) - Math.min(...tasks)).toFixed(0)}ms (${((Math.max(...tasks) - Math.min(...tasks)) / mean(tasks) * 100).toFixed(0)}%)`)
console.log(`  脚本   均值 ${mean(scripts).toFixed(0)}ms · 标准差 ${sd(scripts).toFixed(0)}ms`)
console.log(`\n  判读: 若极差 ≥ 20%, 这个指标本身噪声太大 —— 之前 A/B 的小差异 (507 vs 549) 不能当结论。`)
await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
