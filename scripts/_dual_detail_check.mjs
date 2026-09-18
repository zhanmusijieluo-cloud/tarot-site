// 双环盘弹窗相位验证 (木木 2026-09-18 报: 双环点木星弹窗无相位)
// 覆盖: 次限盘 单环/双环 · 三限 · 行运 · 日返 · 月返 · 日弧
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = 'http://localhost:3021/astrology/chart?y=1995&mo=6&d=15&h=14&mi=30&cid=beijing&sys=placidus'

const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 940 })
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)))

let pass = 0, fail = 0
const check = (ok, msg, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✅' : '❌'} ${msg}${extra ? ' :: ' + extra : ''}`) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = (t) => page.evaluate((txt) => {
  const el = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === txt)
  if (el) { el.click(); return true } return false
}, t)
const clickRing = (ring, name) => page.evaluate((r, n) => {
  const g = document.querySelector(`g[data-ring="${r}"][data-name="${n}"]`)
  if (!g) return false
  g.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  return true
}, ring, name)
const clearSel = () => page.evaluate(() => {
  const s = document.querySelector('svg.select-none')   // 盘面本体 (勿用 svg circle: 会点到站标 logo 跳首页)
  if (s) { s.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return true }
  return false
})
const onChartPage = () => page.evaluate(() => location.pathname.includes('/astrology/chart'))
const detail = () => page.evaluate(() => {
  const el = document.querySelector('[data-planet-detail]')
  return el ? { sel: el.getAttribute('data-planet-detail'), text: el.innerText } : null
})
const waitReady = async () => {
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(() => document.querySelectorAll('svg g[data-ring]').length > 0)) return true
    await sleep(300)
  }
  return false
}
const dump = (d) => console.log('   弹窗:\n' + (d?.text ?? '(空)').split('\n').filter((l) => l.trim()).map((l) => '     ' + l).join('\n'))

await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 })
await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))
await page.reload({ waitUntil: 'networkidle0' })
await sleep(1500)

// ============ 1. 次限盘 · 单环 (回归基线) ============
console.log('\n--- 次限盘 单环 (点土星: 有相位; 木星本次限孤立无相位, 属数据正常) ---')
check(await clickText('次限盘'), '点开次限盘')
await sleep(2500)
check(await waitReady(), '盘面就绪')
check(await clickRing('single', 'Saturn'), '点单环木星')
await sleep(400)
let d = await detail()
check(!!d, '弹窗出现', d?.sel ?? '')
check(!!d && d.text.includes('相位'), '单环弹窗有「相位」区块 (土星)')
dump(d)

// ============ 2. 次限盘 · 双环 (木木报的 BUG) ============
console.log('\n--- 次限盘 双环 · 点外环木星 ---')
check(await clickText('双环'), '切到双环')
await sleep(1200)
check(await waitReady(), '双环盘面就绪')
check(await clickRing('out', 'Jupiter'), '点外环木星')
await sleep(400)
d = await detail()
check(!!d, '弹窗出现', d?.sel ?? '')
check(!!d && d.text.includes('相位'), '双环弹窗有「相位」区块')
check(!!d && d.text.includes('内环'), '双环弹窗标出「内环」对方')
dump(d)
await page.screenshot({ path: 'C:/Users/99192/WorkBuddy AI/2026-09-18-17-12-50/双环-次限-修复后.png' })

console.log('\n--- 次限盘 双环 · 点内环木星 ---')
check(await clickRing('in', 'Jupiter'), '点内环木星')
await sleep(400)
d = await detail()
check(!!d && d.text.includes('相位'), '内环木星弹窗有「相位」区块')
check(!!d && d.text.includes('外环'), '内环木星弹窗标出「外环」对方')
dump(d)

// ============ 3. 其他盘种 (同一段代码路径) ============
const waitRing = async (ring, ms) => {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    if (await page.evaluate((r) => document.querySelectorAll(`g[data-ring="${r}"]`).length > 0, ring)) return true
    await sleep(250)
  }
  return false
}
for (const kind of ['三限盘', '行运盘', '日返盘', '月返盘', '日弧']) {
  console.log(`\n--- ${kind} 双环 ---`)
  check(await onChartPage(), `${kind} 仍在星盘页`)
  check(await clickText(kind), `点开${kind}`)
  await sleep(3500)
  const dualOk = await clickText('双环')
  check(dualOk, `${kind} 找到「双环」按钮`)
  if (!dualOk) console.log('   页面按钮: ' + await page.evaluate(() => [...document.querySelectorAll('button')].map(x=>x.textContent.trim()).filter(Boolean).slice(0,40).join(' | ')))
  check(await waitRing('out', 6000), `${kind} 外环渲染出现`)
  await clearSel()
  await sleep(300)
  const name = await page.evaluate(() => {
    const gs = [...document.querySelectorAll('g[data-ring="out"]')]
    return gs.length ? gs[0].getAttribute('data-name') : null
  })
  check(!!name, `${kind} 外环有行星`, name ?? '')
  check(await clickRing('out', name), `${kind} 点外环 ${name}`)
  await sleep(400)
  d = await detail()
  check(!!d && d.text.includes('相位'), `${kind} 双环弹窗有「相位」区块`, d ? d.sel : 'no-panel')
  if (kind === '日返盘') await page.screenshot({ path: 'C:/Users/99192/WorkBuddy AI/2026-09-18-17-12-50/双环-日返-修复后.png' })
}

console.log(`\n===== ${pass} pass / ${fail} fail =====`)
await b.close()
process.exit(fail ? 1 : 0)
