// 时间线: 500ms 窗口连续采样 24 秒, 看主线程占用是不是「周期性尖峰」
// A = baseline;  B = 停掉 SMIL (品牌 logo 月亮自转 1080° + mask 半径 74→0→74, 6 秒循环)
// 若 A 每 ~6 秒冒一次尖峰而 B 平坦 → 尖峰就是 logo 的 SMIL 动画
// 用法: node scripts/_perf_smil_period.mjs [--path=/about] [--sec=24]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const PAGE = argOf('path', '/about')
const SEC = Number(argOf('sec', '24'))

const dir = mkdtempSync(join(tmpdir(), 'smilperiod-'))
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('https://mustar.vip' + PAGE, { waitUntil: 'domcontentloaded', timeout: 90000 })
await sleep(11000)

const cdp = await page.createCDPSession()
await cdp.send('Performance.enable')
const read = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))

const timeline = async (label) => {
  const rows = []
  const W = 500
  let prev = await read()
  const t0 = Date.now()
  for (let i = 0; i < Math.round(SEC * 1000 / W); i++) {
    await sleep(W)
    const cur = await read()
    const task = (cur.TaskDuration - prev.TaskDuration) * 1000
    const script = (cur.ScriptDuration - prev.ScriptDuration) * 1000
    prev = cur
    rows.push({ t: ((Date.now() - t0) / 1000).toFixed(1), pct: task / W * 100, script: script / W * 100 })
  }
  const pcts = rows.map((r) => r.pct)
  const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length
  const sd = Math.sqrt(pcts.reduce((a, b) => a + (b - mean) ** 2, 0) / pcts.length)
  console.log(`\n=== ${label} ===`)
  // 用字符画时间线: 每格 = 1 个 500ms 窗口, 高度按 0-30% 归一
  const bar = (p) => '█'.repeat(Math.min(30, Math.round(p))) + '·'.repeat(Math.max(0, 30 - Math.round(p)))
  for (const r of rows) console.log(`  ${r.t.padStart(5)}s ${r.pct.toFixed(1).padStart(5)}% |${bar(r.pct)}`)
  console.log(`  均值 ${mean.toFixed(1)}% · 标准差 ${sd.toFixed(1)} · 最大 ${Math.max(...pcts).toFixed(1)}% · 最小 ${Math.min(...pcts).toFixed(1)}%`)
  return { mean, sd, max: Math.max(...pcts), min: Math.min(...pcts) }
}

const A = await timeline('A baseline (SMIL 在跑)')
const kill = await page.evaluate(() => {
  let n = 0
  for (const s of document.querySelectorAll('svg')) { try { s.pauseAnimations(); n++ } catch { /* 忽略 */ } }
  for (const el of document.querySelectorAll('animate, animateTransform, animateMotion, animateColor, set')) { el.remove(); n++ }
  return n
})
await sleep(800)
const B = await timeline(`B 停掉 SMIL (移除 ${kill} 个动画元素)`)

console.log(`\n对比: 均值 ${A.mean.toFixed(1)}% → ${B.mean.toFixed(1)}% · 标准差 ${A.sd.toFixed(1)} → ${B.sd.toFixed(1)} · 峰值 ${A.max.toFixed(1)}% → ${B.max.toFixed(1)}%`)
console.log(`判读: 标准差从 ${A.sd.toFixed(1)} 掉到 ${B.sd.toFixed(1)} = A 的不稳定来自 SMIL 动画`)
await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
