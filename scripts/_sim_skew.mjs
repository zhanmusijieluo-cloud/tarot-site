// 模拟「部署切换瞬间的版本不匹配」: 页面加载后, 让后续软导航/RSC/懒加载 chunk 全部失败。
// 用 CDP Network.setBlockedURLs (比 request interception 可靠, 不会卡住导航)。
// 目的: 确认木木点排盘时的错误页, 是不是这种瞬时故障的形态。
// 用法: node scripts/_sim_skew.mjs [rsc|chunk|both]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const MODE = process.argv.find((a) => ['rsc', 'chunk', 'both'].includes(a)) || 'both'
// --brief=3 → 只阻断 3 秒后解除, 模拟「部署切换那一下」的瞬时故障 (用来验证自动恢复)
const briefArg = process.argv.find((a) => a.startsWith('--brief'))
const BRIEF_MS = briefArg ? Number(briefArg.split('=')[1] || 3) * 1000 : 0

const dir = mkdtempSync(join(tmpdir(), 'skew-'))
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1080,500'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1080, height: 500 })

const errs = [], failed = []
page.on('pageerror', (e) => errs.push(`${e.name}: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 300)) })
page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText || '?'} ${r.url().slice(0, 100)}`))
page.on('response', (r) => { if (r.status() >= 400) failed.push(`HTTP ${r.status()} ${r.url().slice(0, 100)}`) })

// 页面内高频采样: 「正在恢复…」只显示几百毫秒, Node 侧 700ms 轮询必然漏掉。
// 写 sessionStorage 而不是内存变量 —— reload 后还要能读到。
await page.evaluateOnNewDocument(() => {
  const tick = () => {
    try {
      const t = document.body ? document.body.innerText : '';
      if (t.includes('正在恢复')) sessionStorage.setItem('__sawHealing', '1');
      if (t.includes('页面出了点问题')) sessionStorage.setItem('__sawErrPage', '1');
    } catch { /* 忽略 */ }
  };
  setInterval(tick, 40);
});

await page.goto('https://mustar.vip/', { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))
await page.goto('https://mustar.vip/astrology', { waitUntil: 'domcontentloaded', timeout: 90000 })

const CAST_RE = /排占星盘|CastChart/
let ready = false
for (let k = 0; k < 45; k++) {
  await sleep(700)
  ready = await page.evaluate((src) => [...document.querySelectorAll('button')].some((b) => new RegExp(src).test((b.textContent || '').replace(/\s/g, ''))), CAST_RE.source)
  if (ready) break
}
console.log(`表单就绪: ${ready} · 模拟模式: ${MODE}`)
if (!ready) { await browser.close(); process.exit(1) }

// ---- CDP 阻断: 页面已就绪, 从这里开始导航所需资源全部拿不到 (等价于"旧客户端遇上新部署") ----
const client = await page.createCDPSession()
await client.send('Network.enable')
const patterns = []
if (MODE === 'chunk' || MODE === 'both') patterns.push('*/_next/static/immutable/chunks/*')
if (MODE === 'rsc' || MODE === 'both') patterns.push('*_rsc=*')
await client.send('Network.setBlockedURLs', { urls: patterns })
console.log(`阻断模式: ${patterns.join(' , ')}${BRIEF_MS ? ` · ${BRIEF_MS / 1000}s 后解除` : ' · 持续阻断'}`)

// 点「排 占 星 盘」
await page.evaluate((src) => {
  const b = [...document.querySelectorAll('button')].find((x) => new RegExp(src).test((x.textContent || '').replace(/\s/g, '')))
  b?.click()
}, CAST_RE.source)

if (BRIEF_MS) {
  setTimeout(() => {
    client.send('Network.setBlockedURLs', { urls: [] }).catch(() => {})
    console.log(`   [${BRIEF_MS / 1000}s] 已解除阻断`)
  }, BRIEF_MS)
}

// 全程记录: 是否出现过错误页 / 恢复态, 以及最终落到哪里
let st = null
let sawErrPage = false
let sawHealing = false
for (let k = 0; k < 60; k++) {
  await sleep(700)
  st = await page.evaluate(() => ({
    path: location.pathname + location.search.slice(0, 50),
    errPage: document.body.innerText.includes('页面出了点问题'),
    healing: document.body.innerText.includes('正在恢复'),
    boundary: document.body.innerText.includes('这张盘没能画出来'),
    msg: (document.querySelector('main p.font-mono')?.textContent || '').slice(0, 260),
    planetGs: document.querySelectorAll('g[data-ring][data-name]').length,
    bodyHead: document.body.innerText.replace(/\s+/g, ' ').slice(0, 140),
  }))
  if (st.errPage) sawErrPage = true
  if (st.healing) sawHealing = true
  // 持续阻断: 见到任一终态就停; 短暂阻断: 必须等到盘面画出来 (自愈成功) 或超时
  if (BRIEF_MS ? st.planetGs > 0 : st.errPage || st.boundary || st.planetGs > 0) break
}

console.log(`\n落在: ${st.path}`)
// 跨 reload 的持久化采样结果
const persisted = await page
  .evaluate(() => ({
    healing: sessionStorage.getItem('__sawHealing') === '1',
    errPage: sessionStorage.getItem('__sawErrPage') === '1',
  }))
  .catch(() => ({ healing: false, errPage: false }))
if (persisted.healing) sawHealing = true
if (persisted.errPage) sawErrPage = true
console.log(`过程: 出现过错误页=${sawErrPage} · 出现过恢复态=${sawHealing}`)
console.log(`终态: 错误页=${st.errPage} 盘面卡=${st.boundary} 行星组=${st.planetGs}`)
console.log(`页面开头: ${st.bodyHead}`)
if (st.msg) console.log(`报错摘要: ${st.msg}`)
if (errs.length) console.log(`\n捕获 ${errs.length} 条 JS 错误:\n  ${errs.slice(0, 6).join('\n  ')}`)
if (failed.length) console.log(`\n失败请求 ${failed.length} 条:\n  ${failed.slice(0, 6).join('\n  ')}`)

await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
