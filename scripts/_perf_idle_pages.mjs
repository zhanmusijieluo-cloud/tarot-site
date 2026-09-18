// 对比不同页面的「静止主线程占用」, 判断空闲开销到底来自盘面还是全局背景动画
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const HEADFUL = process.argv.includes('--headful')
const ORIGIN = 'https://mustar.vip'
const BASE = 'y=1977&mo=3&d=18&h=22&mi=30&lat=30.56&lng=104.27&tz=8&city=' + encodeURIComponent('成都龙泉驿')

const PAGES = [
  ['星盘页(含3D盘)', `/astrology/chart?${BASE}`],
  ['关于页(无盘面)', '/about'],
  ['首页', '/'],
]

const dir = mkdtempSync(join(tmpdir(), 'idlepages-'))
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: !HEADFUL, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})

for (const [label, path] of PAGES) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('oracle-lang', 'zh') } catch { /* 忽略 */ } })
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)))
  try {
    await page.goto(ORIGIN + path, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await sleep(14000)   // 让动画/懒加载/图片都静下来

    const cdp = await page.createCDPSession()
    await cdp.send('Performance.enable')
    const read = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))
    const a = await read()
    await sleep(3000)
    const b = await read()
    const task = (b.TaskDuration - a.TaskDuration) * 1000
    const script = (b.ScriptDuration - a.ScriptDuration) * 1000
    const canvases = await page.evaluate(() => document.querySelectorAll('canvas').length)
    const gs = await page.evaluate(() => document.querySelectorAll('g[data-ring][data-name]').length)
    console.log(`${label.padEnd(16)} 主线程忙 ${task.toFixed(0).padStart(4)}ms/3s (${(task / 30).toFixed(1)}%) · 脚本 ${script.toFixed(0).padStart(4)}ms · canvas=${canvases} 行星组=${gs}`)
    if (errs.length) console.log(`                 页面错误: ${errs.slice(0, 2).join(' | ')}`)
  } catch (e) {
    console.log(`${label.padEnd(16)} ⚠️ ${String(e).slice(0, 100)}`)
  }
  await page.close()
}

await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
