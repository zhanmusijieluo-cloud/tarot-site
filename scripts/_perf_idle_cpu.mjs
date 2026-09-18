// 量盘面「静止」时主线程实际占用 (CDP Performance metrics)
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ORIGIN = 'https://mustar.vip'
const BASE = 'y=1977&mo=3&d=18&h=22&mi=30&lat=30.56&lng=104.27&tz=8&city=' + encodeURIComponent('成都龙泉驿')

const dir = mkdtempSync(join(tmpdir(), 'idlecpu-'))
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('oracle-lang', 'zh') } catch { /* 忽略 */ } })
await page.goto(`${ORIGIN}/astrology/chart?${BASE}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
for (let k = 0; k < 60; k++) { await sleep(600); if (await page.evaluate(() => document.querySelectorAll('g[data-ring][data-name]').length) > 0) break }
await sleep(4000)

const cdp = await page.createCDPSession()
await cdp.send('Performance.enable')
const read = async () => {
  const { metrics } = await cdp.send('Performance.getMetrics')
  const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]))
  return m
}

const measure = async (label) => {
  const a = await read()
  await sleep(3000)
  const b = await read()
  const dTask = (b.TaskDuration - a.TaskDuration) * 1000
  const dScript = (b.ScriptDuration - a.ScriptDuration) * 1000
  const dLayout = (b.LayoutDuration - a.LayoutDuration) * 1000
  const dRecalc = (b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000
  console.log(`${label}: 3 秒内主线程忙 ${dTask.toFixed(0)}ms (占 ${(dTask / 3000 * 100).toFixed(1)}%) · 脚本 ${dScript.toFixed(0)}ms · 布局 ${dLayout.toFixed(0)}ms · 样式 ${dRecalc.toFixed(0)}ms`)
  return dTask
}

await measure('盘面静止 (本命盘)')

// 切到三限盘再量
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === '三限盘')
  const pk = Object.keys(b).find((k) => k.startsWith('__reactProps'))
  b[pk].onClick?.({ preventDefault() {}, stopPropagation() {}, nativeEvent: {}, target: b, currentTarget: b })
})
await sleep(4000)
await measure('盘面静止 (三限盘)')

// 滚动一下看有没有别的开销
console.log('\n(参考: 无 3D 的普通页面通常 3 秒 < 30ms)')
await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
