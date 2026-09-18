// 真实部署切换的端到端验证 —— 人为阻断(CDP)之外的唯一真实验证。
//   页面停在旧部署 → push 触发新部署 → 部署切换的瞬间点「排盘」→ 看真实结果。
// 目的: ① 确认真实切换到底会不会 ChunkLoadError (还是我的模拟过于悲观)
//       ② 确认修复后的自动恢复在**真实**场景下是否生效
// 用法: node scripts/_live_deploy_skew.mjs --push [最长等待分钟]
import puppeteer from 'puppeteer-core'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const CWD = 'D:/网站/塔罗/tarot-site'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const DO_PUSH = process.argv.includes('--push')
const MAX_MIN = Number(process.argv.find((a) => /^\d+$/.test(a)) || 8)

const FP_PAGE = 'https://mustar.vip/astrology/chart?y=1995&mo=1&d=1&h=12&mi=0&lat=39.9&lng=116.41&tz=8'
const fpOf = async () => {
  const html = await (await fetch(FP_PAGE, { cache: 'no-store', signal: AbortSignal.timeout(20000) })).text()
  return [...new Set([...html.matchAll(/\/_next\/static\/immutable\/chunks\/([a-zA-Z0-9._-]+\.js)/g)].map((m) => m[1]))]
    .sort()
    .join(',')
}

const base = await fpOf()
console.log(`基线指纹: ${base.split(',').length} 个 chunk\n`)

const dir = mkdtempSync(join(tmpdir(), 'dplskew-'))
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false, // 有头: 真实 GPU + 真实网络栈
  userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })

const errs = []
page.on('pageerror', (e) => errs.push(`${e.name}: ${e.message}`.slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 220)) })

await page.evaluateOnNewDocument(() => {
  try {
    sessionStorage.setItem('__loads', String(Number(sessionStorage.getItem('__loads') || 0) + 1))
  } catch { /* 忽略 */ }
  setInterval(() => {
    try {
      const t = document.body ? document.body.innerText : ''
      if (t.includes('正在恢复')) sessionStorage.setItem('__sawHealing', '1')
      if (t.includes('页面出了点问题')) sessionStorage.setItem('__sawErrPage', '1')
      if (t.includes('这张盘没能画出来')) sessionStorage.setItem('__sawBoundary', '1')
    } catch { /* 忽略 */ }
  }, 40)
})

await page.goto('https://mustar.vip/', { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))
await page.goto('https://mustar.vip/astrology', { waitUntil: 'domcontentloaded', timeout: 90000 })

let ready = false
for (let i = 0; i < 45; i++) {
  await sleep(700)
  ready = await page.evaluate(() =>
    [...document.querySelectorAll('button')].some((b) => (b.textContent || '').replace(/\s/g, '').includes('排占星盘')),
  )
  if (ready) break
}
console.log(`表单就绪（此刻仍是旧部署）: ${ready}`)
if (!ready) {
  console.log('❌ 表单未就绪，放弃')
  await browser.close()
  process.exit(1)
}

if (DO_PUSH) {
  try {
    const out = execSync('git push origin master 2>&1', { cwd: CWD, encoding: 'utf8' })
    console.log('push:', out.trim().split('\n').slice(-2).join(' | '))
  } catch (e) {
    console.log('push 输出:', String(e.stdout || e.message).trim().split('\n').slice(-2).join(' | '))
  }
}

console.log(`\n轮询部署切换（最长 ${MAX_MIN} 分钟）...`)
let switched = false
const t0 = Date.now()
while (Date.now() - t0 < MAX_MIN * 60_000) {
  await sleep(3000)
  try {
    if ((await fpOf()) !== base) { switched = true; break }
  } catch { /* 部署中抓取失败属正常 */ }
}
if (!switched) {
  console.log('⏰ 超时: 未检测到切换')
  await browser.close()
  process.exit(1)
}
console.log(`★ 部署已切换（+${((Date.now() - t0) / 1000).toFixed(0)}s）→ 立刻点「排盘」`)

await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').replace(/\s/g, '').includes('排占星盘'))
  b?.click()
})

let st = null
for (let k = 0; k < 40; k++) {
  await sleep(700)
  try {
    st = await page.evaluate(() => ({
      path: location.pathname,
      errPage: document.body.innerText.includes('页面出了点问题'),
      boundary: document.body.innerText.includes('这张盘没能画出来'),
      msg: (document.querySelector('main p.font-mono')?.textContent || '').slice(0, 200),
      planetGs: document.querySelectorAll('g[data-ring][data-name]').length,
    }))
  } catch { continue }
  if (st.planetGs > 0) break
}

const p = await page
  .evaluate(() => ({
    loads: Number(sessionStorage.getItem('__loads') || 0),
    healing: sessionStorage.getItem('__sawHealing') === '1',
    errPage: sessionStorage.getItem('__sawErrPage') === '1',
    boundary: sessionStorage.getItem('__sawBoundary') === '1',
  }))
  .catch(() => ({}))

console.log(`\n落在: ${st?.path}`)
console.log(`过程: 错误页=${p.errPage} 盘面卡=${p.boundary} 恢复态=${p.healing} 加载次数=${p.loads}`)
console.log(`终态: 行星组=${st?.planetGs} 错误页=${st?.errPage}`)
if (st?.msg) console.log(`报错摘要: ${st.msg}`)
if (errs.length) console.log(`\nJS 错误 ${errs.length} 条:\n  ${errs.slice(0, 6).join('\n  ')}`)

console.log(
  st?.planetGs > 0 && !p.errPage
    ? '\n→ 真实部署切换: 盘面正常，用户没看到错误页'
    : p.errPage
      ? '\n→ 真实部署切换: 出现过错误页（需要看是否自愈）'
      : '\n→ 真实部署切换: 结果不明确，看上面细节',
)

await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
