// 纯合成层提示能不能拿掉「动画 logo 在固定毛玻璃导航栏里」的开销
// 背景: logo 单独放空白页只占 0.01%, 但放进真实页面时「动画在跑 20.8% / 停掉 9.1%」
//       → 成本来自与固定 header 的交互 (每帧重绘整条 fixed 层)
// 四臂交替: A baseline / B svg will-change:transform / C svg translateZ(0) / D header contain:paint
// 期望: 若某一臂把 20.8% 拉回 ~9%, 就是零视觉改动的纯赚
// 用法: node scripts/_perf_logo_layer.mjs [--path=/about] [--rounds=3]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const PAGE = argOf('path', '/about')
const ROUNDS = Number(argOf('rounds', '3'))

const dir = mkdtempSync(join(tmpdir(), 'logolayer-'))
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
  return { task: (b.TaskDuration - a.TaskDuration) * 1000 / 30, script: (b.ScriptDuration - a.ScriptDuration) * 1000 / 30 }
}

// 用一张可开关的 style 表承载各臂
await page.evaluate(() => {
  const s = document.createElement('style')
  s.id = '__hint'
  s.disabled = true
  document.head.appendChild(s)
})
const setHint = (css) => page.evaluate((c) => {
  const s = document.getElementById('__hint')
  s.textContent = c || ''
  s.disabled = !c
}, css)

const ARMS = [
  ['A baseline', ''],
  ['B svg will-change:transform', 'header svg{will-change:transform}'],
  ['C svg translateZ(0)', 'header svg{transform:translateZ(0);backface-visibility:hidden}'],
  ['D header contain:paint', 'header{contain:paint}'],
  ['E header svg will-change (兜底选择器)', 'nav svg,.h-10{will-change:transform}'],
]

console.log(`页面 ${PAGE} · ${ROUNDS} 轮 × ${ARMS.length} 臂, 每臂 3 秒\n`)
const acc = Object.fromEntries(ARMS.map(([n]) => [n, []]))
for (let r = 0; r < ROUNDS; r++) {
  for (const [name, css] of ARMS) {
    await setHint(css)
    await sleep(500)
    acc[name].push(await measure())
  }
}
await setHint('')
for (const [name] of ARMS) {
  const v = acc[name]
  const t = v.reduce((a, b) => a + b.task, 0) / v.length
  const s = v.reduce((a, b) => a + b.script, 0) / v.length
  console.log(`  ${name.padEnd(34)} 主线程 ${t.toFixed(1).padStart(5)}%  (${v.map((x) => x.task.toFixed(1)).join(' / ')}) · 脚本 ${s.toFixed(1)}%`)
}
const base = acc['A baseline'].reduce((a, b) => a + b.task, 0) / ROUNDS
console.log(`\n  相对 baseline (${base.toFixed(1)}%) 的降幅:`)
for (const [name] of ARMS.slice(1)) {
  const t = acc[name].reduce((a, b) => a + b.task, 0) / ROUNDS
  console.log(`    ${name.padEnd(34)} ${(100 - t / base * 100).toFixed(0)}%`)
}
await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
