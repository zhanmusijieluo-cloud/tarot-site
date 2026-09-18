// 间歇性错误页复现: 木木的原始 URL 反复加载 N 次, 每次都抓 pageerror/console/失败请求。
// 间歇性问题靠重复次数抓, 单次干净说明不了问题。
// 用法: node scripts/_repro_loop.mjs [次数] [--headful]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const URL_ = 'https://mustar.vip/astrology/chart?y=1995&mo=6&d=15&h=14&mi=30&cn=%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC&lat=39.9042&lng=116.4074&sys=placidus'
const N = Number(process.argv[2] || 20)
const HEADFUL = process.argv.includes('--headful')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const dir = mkdtempSync(join(tmpdir(), 'reproloop-'))
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: !HEADFUL,
  userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 960 })

let errs = [], cons = [], failed = []
page.on('pageerror', (e) => errs.push(`${e.name}: ${e.message}\n      ${String(e.stack || '').split('\n').slice(0, 5).join('\n      ')}`))
page.on('console', (m) => { if (m.type() === 'error') cons.push(m.text().slice(0, 400)) })
page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText || '?'} ${r.url().slice(0, 110)}`))
page.on('response', (r) => { if (r.status() >= 400) failed.push(`HTTP ${r.status()} ${r.url().slice(0, 110)}`) })

console.log(`模式: ${HEADFUL ? '有头(真实 GPU)' : '无头'} · 目标: ${N} 次\n`)

await page.goto('https://mustar.vip/', { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))

let errPageHits = 0, okHits = 0
for (let i = 1; i <= N; i++) {
  errs = []; cons = []; failed = []
  try {
    await page.goto(URL_ + `&_r=${i}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    let st = null
    for (let k = 0; k < 30; k++) {
      await sleep(800)
      st = await page.evaluate(() => ({
        errPage: document.body.innerText.includes('页面出了点问题'),
        boundary: document.body.innerText.includes('这张盘没能画出来'),
        planetGs: document.querySelectorAll('g[data-ring][data-name]').length,
        msg: (document.querySelector('main p.font-mono')?.textContent || '').slice(0, 160),
      }))
      if (st.errPage || st.boundary || st.planetGs > 0) break
    }
    const bad = st.errPage || st.boundary || st.planetGs === 0
    if (st.errPage) errPageHits++
    if (!bad && errs.length === 0) okHits++
    const flag = bad ? '❌' : '✅'
    console.log(`[${i}/${N}] ${flag} 错误页=${st.errPage} 盘面卡=${st.boundary} 行星组=${st.planetGs} pageerror=${errs.length} 失败请求=${failed.length}`)
    if (st.msg) console.log(`       错误摘要: ${st.msg}`)
    if (errs.length) console.log(`       ${errs.join('\n       ')}`)
    if (cons.length) console.log(`       console: ${cons.slice(0, 3).join(' | ')}`)
    if (failed.length) console.log(`       请求: ${failed.slice(0, 3).join(' | ')}`)
  } catch (e) {
    console.log(`[${i}/${N}] ⚠️ 脚本异常: ${String(e).slice(0, 150)}`)
  }
}

console.log(`\n=== 汇总: 正常 ${okHits}/${N} · 出现错误页 ${errPageHits} 次 ===`)
await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
