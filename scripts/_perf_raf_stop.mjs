// 探针: 把 window.requestAnimationFrame 置空 → 所有 rAF 消费者在下一帧后彻底停摆
// 若主线程从 ~21% 掉到个位数 → 那 15% 是「页面永远在产帧」的合成成本 (与画什么无关)
// 用法: node scripts/_perf_raf_stop.mjs [--path=/about] [--rounds=3]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const PAGE = argOf('path', '/about')
const ROUNDS = Number(argOf('rounds', '3'))

const dir = mkdtempSync(join(tmpdir(), 'rafstop-'))
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('https://mustar.vip' + PAGE, { waitUntil: 'domcontentloaded', timeout: 90000 })
await sleep(12000)

const cdp = await page.createCDPSession()
await cdp.send('Performance.enable')
const read = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))
const measure = async () => {
  const a = await read()
  await sleep(3000)
  const b = await read()
  return { task: (b.TaskDuration - a.TaskDuration) * 1000, script: (b.ScriptDuration - a.ScriptDuration) * 1000 }
}

// 顺便统计 rAF 频率 (证明「永远在产帧」)
await page.evaluate(() => {
  window.__rafN = 0
  const orig = window.requestAnimationFrame.bind(window)
  window.__rafOrig = orig
  window.requestAnimationFrame = (cb) => orig((ts) => { window.__rafN++; cb(ts) })
})
const rafRate = async () => { const a = await page.evaluate(() => window.__rafN); await sleep(1000); const b = await page.evaluate(() => window.__rafN); return b - a }

const A = [], B = []
for (let r = 0; r < ROUNDS; r++) {
  A.push({ ...(await measure()), raf: await rafRate() })
  await page.evaluate(() => { window.requestAnimationFrame = () => 0 })
  await sleep(600)   // 让已排队的回调跑完
  B.push({ ...(await measure()), raf: await rafRate() })
  await page.evaluate(() => { window.requestAnimationFrame = window.__rafOrig })
  await sleep(600)
}
const mean = (v, k) => v.reduce((a, b) => a + b[k], 0) / v.length
console.log(`页面 ${PAGE} · 交替 A/B × ${ROUNDS} 轮 (每轮 3 秒)\n`)
A.forEach((x, i) => console.log(`  A${i + 1} baseline      主线程 ${x.task.toFixed(0).padStart(4)}ms (${(x.task / 30).toFixed(1)}%) · 脚本 ${x.script.toFixed(0).padStart(4)}ms · rAF ${x.raf}/s`))
B.forEach((x, i) => console.log(`  B${i + 1} rAF 停摆      主线程 ${x.task.toFixed(0).padStart(4)}ms (${(x.task / 30).toFixed(1)}%) · 脚本 ${x.script.toFixed(0).padStart(4)}ms · rAF ${x.raf}/s`))
const am = mean(A, 'task'), bm = mean(B, 'task')
console.log(`\n  A 均值 ${am.toFixed(0)}ms (${(am / 30).toFixed(1)}%)   B 均值 ${bm.toFixed(0)}ms (${(bm / 30).toFixed(1)}%)   降幅 ${(100 - bm / am * 100).toFixed(0)}%`)
console.log(`  rAF: A ${mean(A, 'raf').toFixed(0)}/s → B ${mean(B, 'raf').toFixed(0)}/s`)
await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
