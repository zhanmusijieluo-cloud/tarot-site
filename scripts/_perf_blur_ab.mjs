// 决定性 A/B: 关掉 backdrop-filter / filter:blur → 看主线程掉多少
// A = baseline; B = 页面内所有 backdrop-filter 与 filter:blur 置 none
// 交替多轮, 消除臂序/漂移
// 用法: node scripts/_perf_blur_ab.mjs [--path=/about] [--rounds=3]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const PAGE = argOf('path', '/about')
const ROUNDS = Number(argOf('rounds', '3'))

const dir = mkdtempSync(join(tmpdir(), 'blurab-'))
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
const measure = async () => {
  const a = await read()
  await sleep(3000)
  const b = await read()
  return { task: (b.TaskDuration - a.TaskDuration) * 1000, script: (b.ScriptDuration - a.ScriptDuration) * 1000 }
}

// 用一张 style 表统一压制, 便于开关
await page.evaluate(() => {
  const s = document.createElement('style')
  s.id = '__noblur'
  s.textContent = '*, *::before, *::after { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; } .pointer-events-none.absolute { filter: none !important; }'
  s.disabled = true
  document.head.appendChild(s)
})
const setBlur = (off) => page.evaluate((v) => { document.getElementById('__noblur').disabled = !v }, off)

const A = [], B = []
for (let r = 0; r < ROUNDS; r++) {
  await setBlur(false)
  await sleep(500)
  A.push(await measure())
  await setBlur(true)
  await sleep(500)
  B.push(await measure())
}
await setBlur(false)
const mean = (v, k) => v.reduce((a, b) => a + b[k], 0) / v.length
console.log(`页面 ${PAGE} · 交替 A/B × ${ROUNDS} 轮 (每轮 3 秒)\n`)
A.forEach((x, i) => console.log(`  A${i + 1} baseline(有模糊)  主线程 ${x.task.toFixed(0).padStart(4)}ms (${(x.task / 30).toFixed(1)}%) · 脚本 ${x.script.toFixed(0).padStart(4)}ms`))
B.forEach((x, i) => console.log(`  B${i + 1} 模糊全关        主线程 ${x.task.toFixed(0).padStart(4)}ms (${(x.task / 30).toFixed(1)}%) · 脚本 ${x.script.toFixed(0).padStart(4)}ms`))
const am = mean(A, 'task'), bm = mean(B, 'task')
console.log(`\n  A 均值 ${am.toFixed(0)}ms (${(am / 30).toFixed(1)}%)   B 均值 ${bm.toFixed(0)}ms (${(bm / 30).toFixed(1)}%)   降幅 ${(100 - bm / am * 100).toFixed(0)}%`)
console.log(`  脚本: A ${mean(A, 'script').toFixed(0)}ms → B ${mean(B, 'script').toFixed(0)}ms`)
await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
