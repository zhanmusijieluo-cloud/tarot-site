// 验证「浏览器扩展改动 DOM → React removeChild 崩溃」这条因果链。
// 依据: 无头(无扩展)4 个用例全绿, 木木(装了一排扩展)100% 崩 —— 唯一差异就是扩展。
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const URL_ =
  'https://mustar.vip/astrology/chart?y=1977&mo=3&d=18&h=22&mi=30&cn=%E5%9B%9B%E5%B7%9D~%E6%88%90%E9%83%BD~%E9%BE%99%E6%B3%89%E9%A9%BF&lat=31.028&lng=106.413&sys=placidus'

const dir = mkdtempSync(join(tmpdir(), 'extsim-'))
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1080,500'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1080, height: 500 })
const errs = []
page.on('pageerror', (e) => errs.push(`${e.name}: ${e.message}`.slice(0, 200)))

await page.goto('https://mustar.vip/', { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))
await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90000 })

let ok = false
for (let i = 0; i < 40; i++) {
  await sleep(800)
  ok = await page.evaluate(() => document.querySelectorAll('g[data-ring][data-name]').length > 0)
  if (ok) break
}
console.log(`盘面就绪: ${ok}`)

// 模拟翻译类扩展的典型手法: 把 React 管理的文本节点换成自己的包裹节点
const injected = await page.evaluate(() => {
  const host = document.querySelector('main') || document.body
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
  let n = null
  while ((n = walker.nextNode())) {
    if (n.nodeValue && n.nodeValue.trim().length > 1) break
  }
  if (!n) return 'no-text-node'
  const wrap = document.createElement('span')
  wrap.setAttribute('data-ext', '1')
  wrap.textContent = n.nodeValue
  n.parentNode.replaceChild(wrap, n)
  return 'replaced'
})
console.log(`注入模拟扩展改动: ${injected}`)

// 触发 React 更新
for (const label of ['行运盘', '本命盘']) {
  await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').replace(/\s/g, '').includes(t))
    b?.click()
  }, label)
  await sleep(3000)
}

const st = await page.evaluate(() => ({
  errPage: document.body.innerText.includes('页面出了点问题'),
  msg: (document.querySelector('main p.font-mono')?.textContent || '').slice(0, 220),
}))
console.log(`\n错误页=${st.errPage}`)
if (st.msg) console.log(`报错: ${st.msg}`)
if (errs.length) console.log(`JS 错误:\n  ${errs.slice(0, 3).join('\n  ')}`)

const hit = /removeChild|not a child|不是此节点的子节点/i.test(`${st.msg} ${errs.join(' ')}`)
console.log(hit ? '\n✅ 复现 removeChild —— 证实「外部改动 DOM」足以触发' : '\n⚠️ 未复现（注入点可能不在 React 更新路径上）')

await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
