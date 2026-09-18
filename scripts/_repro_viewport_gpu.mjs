// 视口矩阵 + 真实 GPU 复现: 木木的窗口又宽又扁 (~1080×500), 且用的是真实显卡。
// 之前的测试都是 1440×960 无头(软件渲染) —— 这两个维度都没覆盖过。
// 用法: node scripts/_repro_viewport_gpu.mjs
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const URL_ = 'https://mustar.vip/astrology/chart?y=1995&mo=6&d=15&h=14&mi=30&cn=%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC&lat=39.9042&lng=116.4074&sys=placidus'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 木木的窗口又宽又扁; 再补几个极端与常见档
const VIEWPORTS = [
  ['木木的宽扁窗', 1080, 500],
  ['宽扁加大', 1440, 620],
  ['常见笔记本', 1440, 960],
  ['1080p 全屏', 1920, 1080],
  ['超宽', 2560, 1200],
  ['极扁', 1600, 420],
  ['手机', 390, 844],
  ['平板', 768, 1024],
]

const HEADFUL = process.argv.includes('--headful')
console.log(`模式: ${HEADFUL ? '有头(真实 GPU)' : '无头'} · ${VIEWPORTS.length} 个视口\n`)

for (const [name, w, h] of VIEWPORTS) {
  const dir = mkdtempSync(join(tmpdir(), 'vpgpu-'))
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: !HEADFUL,
    userDataDir: dir,
    args: ['--no-sandbox', '--no-proxy-server', `--window-size=${w},${h}`],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h })

  const errs = [], failed = []
  page.on('pageerror', (e) => errs.push(`${e.name}: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)) })
  page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText || '?'} ${r.url().slice(0, 90)}`))
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`HTTP ${r.status()} ${r.url().slice(0, 90)}`) })

  try {
    await page.goto('https://mustar.vip/', { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))
    await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90000 })

    let st = null
    for (let i = 0; i < 35; i++) {
      await sleep(800)
      st = await page.evaluate(() => ({
        errPage: document.body.innerText.includes('页面出了点问题'),
        boundary: document.body.innerText.includes('这张盘没能画出来'),
        planetGs: document.querySelectorAll('g[data-ring][data-name]').length,
        buttons: document.querySelectorAll('button').length,
        msg: (document.querySelector('main p.font-mono')?.textContent || '').slice(0, 150),
      }))
      if (st.errPage || st.boundary || st.planetGs > 0) break
    }

    // 3D 视图也过一遍 (真实 GPU 下最容易出事的路径)
    let gl3d = 'n/a'
    if (!st.errPage && st.buttons > 20) {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.includes('俯视'))
        b?.click()
      })
      await sleep(4000)
      const g = await page.evaluate(() => ({
        canvases: document.querySelectorAll('canvas').length,
        errPage: document.body.innerText.includes('页面出了点问题'),
        unavailable: document.body.innerText.includes('3D 视图暂时不可用'),
      }))
      gl3d = `canvas=${g.canvases} 错误页=${g.errPage} 3D不可用=${g.unavailable}`
    }

    const bad = st.errPage || st.boundary || st.planetGs === 0 || errs.length > 0
    console.log(`${bad ? '❌' : '✅'} ${name} (${w}×${h}) — 错误页=${st.errPage} 盘面卡=${st.boundary} 行星组=${st.planetGs} 按钮=${st.buttons} 错误=${errs.length} 失败请求=${failed.length}`)
    if (st.msg) console.log(`     摘要: ${st.msg}`)
    if (errs.length) console.log(`     ${errs.slice(0, 3).join('\n     ')}`)
    if (failed.length) console.log(`     请求: ${failed.slice(0, 3).join(' | ')}`)
    console.log(`     3D: ${gl3d}`)
  } catch (e) {
    console.log(`⚠️ ${name} (${w}×${h}) 脚本异常: ${String(e).slice(0, 140)}`)
  }

  await browser.close()
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
}
