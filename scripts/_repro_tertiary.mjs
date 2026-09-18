// 复现「三限盘」降级卡: 盘面级边界(ChartBoundary)兜住的到底是哪一句抛错。
// 背景 (2026-09-18): WebGL forceContextLoss 修好后, 木木截图显示三限盘落到盘面级降级卡。
// 该卡以前只显示通用文案 → 本脚本同时抓 console 的 [chart-boundary] 日志 + 页面上的报错行。
// 用法: node scripts/_repro_tertiary.mjs [--local] [--headful]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const LOCAL = process.argv.includes('--local')
const HEADFUL = process.argv.includes('--headful')
const ORIGIN = LOCAL ? 'http://localhost:3000' : 'https://mustar.vip'

// 木木的盘: 1977-03-18 22:30 四川成都龙泉驿
const BASE = 'y=1977&mo=3&d=18&h=22&mi=30&lat=30.56&lng=104.27&tz=8&city=' + encodeURIComponent('成都龙泉驿')
const MODES = [
  ['三限', `dp=t&dpy=2026&dpm=9&dpd=18`],
  ['次限', `dp=s&dpy=2026&dpm=9&dpd=18`],
  ['行运', `dp=tr&dpy=2026&dpm=9&dpd=18&dph=22&dpmi=30`],
  ['日弧', `dp=arc&dpy=2026&dpm=9&dpd=18`],
  ['日返', `dp=sr&dpy=2026`],
  ['月返', `dp=lr&dpy=2026&dpm=9&dpd=1`],
  ['本命', ''],
]

const dir = mkdtempSync(join(tmpdir(), 'tertiary-'))
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: !HEADFUL,
  userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1280,900'],
})

console.log(`目标: ${ORIGIN} · ${HEADFUL ? '有头(真实 GPU)' : '无头'}\n`)

for (const [label, dp] of MODES) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  const errs = []
  page.on('pageerror', (e) => errs.push(`${e.name}: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 400))
  })

  const url = `${ORIGIN}/astrology/chart?${BASE}${dp ? '&' + dp : ''}`
  let st = null
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
    for (let k = 0; k < 60; k++) {
      await sleep(700)
      st = await page.evaluate(() => {
        const txt = document.body.innerText
        return {
          boundary: txt.includes('没能画出来'),
          errPage: txt.includes('页面出了点问题'),
          msgLine: (document.querySelector('.font-mono')?.textContent || '').trim().slice(0, 300),
          planetGs: document.querySelectorAll('g[data-ring][data-name]').length,
          canvases: document.querySelectorAll('canvas').length,
        }
      })
      if (st.errPage || st.boundary || st.planetGs > 0) break
    }
  } catch (e) {
    console.log(`${label} ⚠️ 脚本异常: ${String(e).slice(0, 160)}`)
    await page.close()
    continue
  }

  const flag = st?.boundary || st?.errPage ? '❌' : st?.planetGs > 0 ? '✅' : '⚠️'
  console.log(`${flag} ${label.padEnd(3)} 盘面卡=${st?.boundary} 错误页=${st?.errPage} 行星组=${st?.planetGs} canvas=${st?.canvases}`)
  if (st?.msgLine) console.log(`     卡上报错: ${st.msgLine}`)
  if (errs.length) console.log(`     console:\n       ${errs.slice(0, 6).join('\n       ')}`)
  await page.close()
}

await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
