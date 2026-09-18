// 探针: SMIL 动画 (品牌 logo 月亮自转 1080° 无缝循环) 是不是那 19% 的来源
// 三臂交替: A baseline / B 停掉所有 SMIL / C 停 SMIL + 移除星空 canvas
// 用法: node scripts/_perf_smil_ab.mjs [--path=/about] [--rounds=3]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const PAGE = argOf('path', '/about')
const ROUNDS = Number(argOf('rounds', '3'))

const dir = mkdtempSync(join(tmpdir(), 'smil-'))
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('https://mustar.vip' + PAGE, { waitUntil: 'domcontentloaded', timeout: 90000 })
await sleep(11000)

// 先盘点页面上有多少 SMIL
const smilInfo = await page.evaluate(() => {
  const sel = 'animate, animateTransform, animateMotion, animateColor, set'
  const all = [...document.querySelectorAll(sel)]
  const perSvg = [...document.querySelectorAll('svg')].map((s, i) => ({
    i, cls: s.getAttribute('class'), anim: s.querySelectorAll(sel).length,
  })).filter((x) => x.anim > 0)
  return { total: all.length, perSvg }
})
console.log(`页面 ${PAGE} · SMIL 动画元素共 ${smilInfo.total} 个, 分布在 ${smilInfo.perSvg.length} 个 svg 里`)
for (const s of smilInfo.perSvg.slice(0, 8)) console.log(`   svg#${s.i} class="${s.cls ?? ''}" 动画元素 ${s.anim} 个`)
console.log()

const cdp = await page.createCDPSession()
await cdp.send('Performance.enable')
const read = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))
const measure = async () => {
  const a = await read()
  await sleep(3000)
  const b = await read()
  return { task: (b.TaskDuration - a.TaskDuration) * 1000, script: (b.ScriptDuration - a.ScriptDuration) * 1000 }
}

const killSmil = () => page.evaluate(() => {
  for (const s of document.querySelectorAll('svg')) { try { s.pauseAnimations() } catch { /* 忽略 */ } }
  for (const el of document.querySelectorAll('animate, animateTransform, animateMotion, animateColor, set')) el.remove()
})
const restoreSmil = () => page.evaluate(() => {
  for (const s of document.querySelectorAll('svg')) { try { s.unpauseAnimations() } catch { /* 忽略 */ } }
})
const dropCanvas = () => page.evaluate(() => {
  const c = document.querySelector('.starfield-bg')
  if (c) { window.__sf = c; c.remove() }
})
const restoreCanvas = () => page.evaluate(() => { if (window.__sf) { document.body.appendChild(window.__sf); window.__sf = null } })

const A = [], B = [], C = []
for (let r = 0; r < ROUNDS; r++) {
  A.push(await measure())
  await killSmil(); await sleep(500)
  B.push(await measure())
  await dropCanvas(); await sleep(500)
  C.push(await measure())
  await restoreCanvas(); await restoreSmil(); await sleep(500)
}
const mean = (v) => v.reduce((a, b) => a + b.task, 0) / v.length
const show = (label, v) => console.log(`  ${label.padEnd(26)} ${v.map((x) => (x.task / 30).toFixed(1) + '%').join('  ')}   均值 ${mean(v).toFixed(0)}ms (${(mean(v) / 30).toFixed(1)}%)`)
console.log(`交替 A/B/C × ${ROUNDS} 轮 (每轮 3 秒)\n`)
show('A baseline', A)
show('B 停 SMIL', B)
show('C 停 SMIL + 去星空', C)
console.log(`\n  A→B 降幅 ${(100 - mean(B) / mean(A) * 100).toFixed(0)}%   A→C 降幅 ${(100 - mean(C) / mean(A) * 100).toFixed(0)}%`)
await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
