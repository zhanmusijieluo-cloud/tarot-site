// 关于页静止开销 A/B 拆解: 到底花在「JS 脚本」还是「canvas 光栅化/合成」
// 四臂对照 (全部运行时操作, 不改代码):
//   ① baseline
//   ② canvas display:none      (不合成 → 分离合成成本)
//   ③ canvas 从 DOM 移除        (脱离文档 → 大概率跳过光栅化, 但 JS 循环照跑)
//   ④ canvas.width/height=300  (光栅面积缩到 1/43 → 测面积相关性)
// 用法: node scripts/_perf_starfield_ab.mjs [--headful]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const HEADFUL = process.argv.includes('--headful')
const PAGE = process.argv.find((x) => x.startsWith('--path='))?.slice(7) || '/about'

const dir = mkdtempSync(join(tmpdir(), 'sfab-'))
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: !HEADFUL, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('https://mustar.vip' + PAGE, { waitUntil: 'domcontentloaded', timeout: 90000 })
await sleep(12000)

const cdp = await page.createCDPSession()
await cdp.send('Performance.enable')
const read = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))

const measure = async (label) => {
  const a = await read()
  await sleep(3000)
  const b = await read()
  const task = (b.TaskDuration - a.TaskDuration) * 1000
  const script = (b.ScriptDuration - a.ScriptDuration) * 1000
  const layout = (b.LayoutDuration - a.LayoutDuration) * 1000
  const style = (b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000
  console.log(`${label.padEnd(34)} 主线程 ${task.toFixed(0).padStart(4)}ms/3s (${(task / 30).toFixed(1)}%) · 脚本 ${script.toFixed(0).padStart(4)}ms · 布局 ${layout.toFixed(0)} · 样式 ${style.toFixed(0)}`)
  return { task, script }
}

const info = await page.evaluate(() => {
  const c = document.querySelector('.starfield-bg')
  return { found: !!c, w: c?.width, h: c?.height, cssW: c?.clientWidth, cssH: c?.clientHeight, dpr: devicePixelRatio }
})
console.log(`页面 ${PAGE} · canvas ${JSON.stringify(info)}\n`)

const base = await measure('① baseline')
await page.evaluate(() => { const c = document.querySelector('.starfield-bg'); if (c) c.style.display = 'none' })
await measure('② canvas display:none')
await page.evaluate(() => { document.querySelector('.starfield-bg')?.remove() })
await measure('③ canvas 移出 DOM')
// 重新插回一个超小背衬 canvas, 观察 JS 仍在跑但光栅面积骤减
await page.evaluate(() => {
  const old = document.querySelector('.starfield-bg')
  if (old) { old.style.display = ''; document.body.appendChild(old); old.width = 300; old.height = 200 }
})
await measure('④ 背衬缩到 300x200')
await page.evaluate(() => { const c = document.querySelector('.starfield-bg'); if (c) c.style.display = 'none' })
await measure('⑤ 小背衬 + display:none')

console.log(`\n对照结论: 主线程 ${base.task.toFixed(0)}ms → 移出 DOM 后看降幅, 若脚本几乎不变而主线程大降 = 光栅/合成主导`)
await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
