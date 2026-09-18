// 复现木木截图里的错误页: 用他的原 URL, 多种浏览器状态, 把真实报错连同堆栈捞出来。
// 用法: node scripts/_repro_error_page.mjs
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
// 木木截图里的原始 URL
const URL_ = 'https://mustar.vip/astrology/chart?y=1995&mo=6&d=15&h=14&mi=30&cn=%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC&lat=39.9042&lng=116.4074&sys=placidus'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const SCENARIOS = [
  { name: '① 全新 profile + 直接进盘页', seedLang: false, warm: false },
  { name: '② 全新 profile + 先访问首页设语言再进', seedLang: true, warm: false },
  { name: '③ 同一 profile 第二次访问 (缓存热)', seedLang: true, warm: true },
]

for (const sc of SCENARIOS) {
  console.log(`\n${'='.repeat(60)}\n${sc.name}\n${'='.repeat(60)}`)
  const dir = mkdtempSync(join(tmpdir(), 'repro-'))
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    userDataDir: dir,
    args: ['--no-sandbox', '--no-proxy-server'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 960 })

  const errs = [], cons = [], failed = [], bad = []
  page.on('pageerror', (e) => errs.push(`${e}\n      stack: ${String(e.stack || '').split('\n').slice(0, 6).join('\n             ')}`))
  page.on('console', (m) => { if (m.type() === 'error') cons.push(m.text().slice(0, 500)) })
  page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText || '?'} ${r.url().slice(0, 120)}`))
  page.on('response', (r) => { if (r.status() >= 400) bad.push(`HTTP ${r.status()} ${r.url().slice(0, 120)}`) })

  if (sc.seedLang) {
    await page.goto('https://mustar.vip/', { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))
    await sleep(1500)
  }
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90000 })
  if (sc.warm) { await sleep(3000); await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 }) }

  // 等够时间 (线上冷启动 ~12s)
  let st = null
  for (let i = 0; i < 40; i++) {
    await sleep(1000)
    st = await page.evaluate(() => {
      const t = document.body.innerText
      return {
        errPage: t.includes('页面出了点问题'),
        boundaryCard: t.includes('这张盘没能画出来'),
        planetGs: document.querySelectorAll('g[data-ring][data-name]').length,
        buttons: document.querySelectorAll('button').length,
        text: t.replace(/\s+/g, ' ').slice(0, 200),
      }
    })
    if (st.errPage || st.boundaryCard || st.planetGs > 0) break
  }

  console.log(`结果: 错误页=${st.errPage}  盘面级卡片=${st.boundaryCard}  行星组=${st.planetGs}  按钮=${st.buttons}`)
  console.log(`正文: ${st.text}`)
  console.log(`\n-- pageerror (${errs.length}) --`)
  console.log(errs.length ? errs.join('\n') : '(无)')
  console.log(`-- console.error (${cons.length}) --`)
  console.log(cons.length ? cons.slice(0, 8).join('\n') : '(无)')
  console.log(`-- 请求失败 (${failed.length}) --`)
  console.log(failed.length ? failed.slice(0, 8).join('\n') : '(无)')
  console.log(`-- 4xx/5xx (${bad.length}) --`)
  console.log(bad.length ? bad.slice(0, 8).join('\n') : '(无)')

  await browser.close()
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
}
