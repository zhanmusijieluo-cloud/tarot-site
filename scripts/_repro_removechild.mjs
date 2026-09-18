// 复现木木的 removeChild 崩溃 (100% 必现) —— 定位是"时间"还是"地点"维度触发。
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const B = 'https://mustar.vip/astrology/chart?'

const CASES = [
  ['木木原样', 'y=1977&mo=3&d=18&h=22&mi=30&cn=%E5%9B%9B%E5%B7%9D~%E6%88%90%E9%83%BD~%E9%BE%99%E6%B3%89%E9%A9%BF&lat=31.028&lng=106.413&sys=placidus'],
  ['只换地点(北京)', 'y=1977&mo=3&d=18&h=22&mi=30&cn=%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC&lat=39.9042&lng=116.4074&sys=placidus'],
  ['只换时间(1995)', 'y=1995&mo=6&d=15&h=14&mi=30&cn=%E5%9B%9B%E5%B7%9D~%E6%88%90%E9%83%BD~%E9%BE%99%E6%B3%89%E9%A9%BF&lat=31.028&lng=106.413&sys=placidus'],
  ['我的对照', 'y=1995&mo=6&d=15&h=14&mi=30&cn=%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC&lat=39.9042&lng=116.4074&sys=placidus'],
]

const dir = mkdtempSync(join(tmpdir(), 'rmchild-'))
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1080,500'],
})

for (const [name, q] of CASES) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1080, height: 500 })
  const errs = []
  page.on('pageerror', (e) => errs.push(`${e.name}: ${e.message}`.slice(0, 160)))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })

  await page.goto('https://mustar.vip/', { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))
  await page.goto(B + q, { waitUntil: 'domcontentloaded', timeout: 90000 })

  let st = null
  for (let k = 0; k < 30; k++) {
    await sleep(700)
    try {
      st = await page.evaluate(() => ({
        errPage: document.body.innerText.includes('页面出了点问题'),
        msg: (document.querySelector('main p.font-mono')?.textContent || '').slice(0, 180),
        planetGs: document.querySelectorAll('g[data-ring][data-name]').length,
      }))
    } catch { continue }
    if (st.errPage || st.planetGs > 0) break
  }
  const hit = /removeChild|不是此节点的子节点|not a child/i.test(`${st?.msg} ${errs.join(' ')}`)
  console.log(`${hit ? '❌ 复现' : st?.errPage ? '⚠️ 错误页(非removeChild)' : '✅ 正常'}  ${name}`)
  console.log(`     错误页=${st?.errPage} 行星组=${st?.planetGs} 报错=${st?.msg || '(无)'}`)
  if (!st?.msg && errs.length) console.log(`     console: ${errs.slice(0, 2).join(' | ')}`)
  await page.close()
}

await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
