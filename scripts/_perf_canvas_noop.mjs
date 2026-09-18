// 决定性探针: canvas 绘制方法全部 no-op (JS 循环照跑, 但零绘制) —— 交替 A/B 消除臂序混淆
// A = baseline;  B = CanvasRenderingContext2D 的绘制方法被置空
// 若 B 下主线程从 ~22% 掉到 ~7% → 那 15% 就是 canvas 光栅化 (Starfield); 否则是别的东西
// 用法: node scripts/_perf_canvas_noop.mjs [--path=/about] [--rounds=3]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const PAGE = argOf('path', '/about')
const ROUNDS = Number(argOf('rounds', '3'))

const dir = mkdtempSync(join(tmpdir(), 'noop-'))
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

// 置空绘制方法 (保留 getContext/属性, 只让绘制调用变成空操作)
await page.evaluate(() => {
  const P = CanvasRenderingContext2D.prototype
  const dead = ['clearRect', 'fill', 'stroke', 'fillRect', 'strokeRect', 'arc', 'beginPath', 'closePath',
    'moveTo', 'lineTo', 'fillText', 'strokeText', 'drawImage', 'save', 'restore', 'translate', 'scale',
    'setTransform', 'rect', 'ellipse', 'quadraticCurveTo', 'bezierCurveTo', 'setLineDash', 'clip']
  window.__orig = {}
  for (const k of dead) { window.__orig[k] = P[k]; P[k] = function () {} }
  // 渐变对象: 让 create*Gradient 返回可 addColorStop 的哑对象
  window.__orig.createRadialGradient = P.createRadialGradient
  window.__orig.createLinearGradient = P.createLinearGradient
  const dumb = () => ({ addColorStop() {} })
  P.createRadialGradient = dumb
  P.createLinearGradient = dumb
})
const restore = () => page.evaluate(() => {
  const P = CanvasRenderingContext2D.prototype
  for (const [k, v] of Object.entries(window.__orig)) P[k] = v
})

const A = [], B = []
for (let r = 0; r < ROUNDS; r++) {
  A.push(await measure())
  await page.evaluate(() => { const P = CanvasRenderingContext2D.prototype; const dead = ['clearRect', 'fill', 'stroke', 'fillRect', 'strokeRect', 'arc', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'fillText', 'strokeText', 'drawImage', 'save', 'restore', 'translate', 'scale', 'setTransform', 'rect', 'ellipse', 'quadraticCurveTo', 'bezierCurveTo', 'setLineDash', 'clip']; for (const k of dead) { window.__orig[k] = P[k]; P[k] = function () {} } const dumb = () => ({ addColorStop() {} }); window.__orig.createRadialGradient = P.createRadialGradient; window.__orig.createLinearGradient = P.createLinearGradient; P.createRadialGradient = dumb; P.createLinearGradient = dumb })
  B.push(await measure())
  await restore()
}
const mean = (v, k) => v.reduce((a, b) => a + b[k], 0) / v.length
console.log(`页面 ${PAGE} · 交替 A/B × ${ROUNDS} 轮 (每轮 3 秒)\n`)
A.forEach((x, i) => console.log(`  A${i + 1} baseline        主线程 ${x.task.toFixed(0).padStart(4)}ms (${(x.task / 30).toFixed(1)}%) · 脚本 ${x.script.toFixed(0).padStart(4)}ms (${(x.script / 30).toFixed(1)}%)`))
B.forEach((x, i) => console.log(`  B${i + 1} canvas全no-op    主线程 ${x.task.toFixed(0).padStart(4)}ms (${(x.task / 30).toFixed(1)}%) · 脚本 ${x.script.toFixed(0).padStart(4)}ms (${(x.script / 30).toFixed(1)}%)`))
const am = mean(A, 'task'), bm = mean(B, 'task')
console.log(`\n  A 均值 ${am.toFixed(0)}ms (${(am / 30).toFixed(1)}%)   B 均值 ${bm.toFixed(0)}ms (${(bm / 30).toFixed(1)}%)   降幅 ${(100 - bm / am * 100).toFixed(0)}%`)
console.log(`  脚本: A ${mean(A, 'script').toFixed(0)}ms → B ${mean(B, 'script').toFixed(0)}ms`)
await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
