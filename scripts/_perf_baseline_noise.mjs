// 底噪对照: 同一套测量环境, 分别测 about:blank / 空白静态页 / 真实页面
// 若 about:blank 本身就占 ~15%, 那么之前「关于页 20%」绝大部分是环境底噪, 根本没什么可优化
// 用法: node scripts/_perf_baseline_noise.mjs [--rounds=3]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const ROUNDS = Number(argOf('rounds', '3'))

const dir = mkdtempSync(join(tmpdir(), 'noise-'))
const staticPath = join(dir, 'blank.html')
writeFileSync(staticPath, '<!doctype html><html><head><meta charset="utf-8"><title>blank</title></head><body style="background:#0a0f1e;color:#dbe4f5">blank page</body></html>')

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})

const measureOn = async (page, rounds = ROUNDS) => {
  const cdp = await page.createCDPSession()
  await cdp.send('Performance.enable')
  const read = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))
  const out = []
  for (let i = 0; i < rounds; i++) {
    const a = await read()
    await sleep(3000)
    const b = await read()
    out.push({ task: (b.TaskDuration - a.TaskDuration) * 1000, script: (b.ScriptDuration - a.ScriptDuration) * 1000 })
  }
  const mean = (k) => out.reduce((a, b) => a + b[k], 0) / out.length
  return { task: mean('task'), script: mean('script'), raw: out }
}

const cases = [
  ['about:blank', 'about:blank', 2000],
  ['静态空白页(本地文件)', 'file:///' + staticPath.replace(/\\/g, '/'), 2000],
  ['mustar.vip/about', 'https://mustar.vip/about', 12000],
  ['mustar.vip/ (首页)', 'https://mustar.vip/', 12000],
]

console.log('同一套环境 · 每个 case 测 ' + ROUNDS + ' 轮 × 3 秒 (headless Chrome)\n')
const rows = []
for (const [label, url, warm] of cases) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await sleep(warm)
  const r = await measureOn(page)
  rows.push({ label, ...r })
  console.log(`  ${label.padEnd(24)} 主线程 ${r.task.toFixed(0).padStart(4)}ms/3s (${(r.task / 30).toFixed(1)}%) · 脚本 ${r.script.toFixed(0).padStart(4)}ms (${(r.script / 30).toFixed(1)}%)`)
  await page.close()
}

const blank = rows[0].task
console.log(`\n  about:blank 底噪 = ${(blank / 30).toFixed(1)}% —— 任何低于/接近这个数的页面都「没什么可优化的」`)
for (const r of rows.slice(2)) {
  const net = r.task - blank
  console.log(`  ${r.label} 扣掉底噪后 ≈ ${(net / 30).toFixed(1)}% 主线程 (净 ${net.toFixed(0)}ms/3s)`)
}
await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
