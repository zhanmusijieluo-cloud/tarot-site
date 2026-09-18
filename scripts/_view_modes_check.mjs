// 视图切换档位验收 (木木 2026-09-18):
//   1. 3D 两档只在本命盘出现, 且文案回到「俯视」「侧视」
//   2. 推运盘/法达盘不出现这两个按钮, 且从本命盘带过来的 3D 档位要回落线条盘
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
// 视图档位按钮: 文案以「盘/视/盘」结尾且短, 且在同一组里
const viewBtns = () => page.evaluate(() => {
  const all = [...document.querySelectorAll('button')].map((x) => x.textContent.trim())
  return all.filter((t) => t === '俯视' || t === '侧视' || t.includes('线条盘'))
})
// 3D 盘 canvas 挂在 ChartScene 的 div.cursor-grab 下; 页面级背景星空也有 canvas, 不能用总数判断
const has3D = () => page.evaluate(() => !!document.querySelector('div.cursor-grab canvas'))
const has2D = () => page.evaluate(() => !!document.querySelector('svg.select-none'))
const onChartPage = () => page.evaluate(() => location.pathname.includes('/astrology/chart'))

await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 })
await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))
await page.reload({ waitUntil: 'networkidle0' })
await sleep(2500)

// ============ 1. 本命盘: 三档齐全 + 文案 ============
console.log('\n--- 本命盘 (默认) ---')
let v = await viewBtns()
check(v.length === 3, '本命盘有 3 个视图按钮', JSON.stringify(v))
check(v.includes('俯视') && v.includes('侧视'), '文案为「俯视」「侧视」(无后缀)')
check(await clickText('俯视'), '点「俯视」')
await sleep(2000)
check(await has3D(), '俯视渲染出 3D canvas')
await clickText('侧视')
await sleep(1500)
check(await has3D(), '侧视渲染出 3D canvas')

// ============ 2. 带着 3D 档位切到推运盘: 按钮消失 + 回落线条盘 ============
for (const kind of ['次限盘', '三限盘', '行运盘', '日返盘', '月返盘', '日弧', '法达', '小限']) {
  console.log(`\n--- ${kind} ---`)
  check(await onChartPage(), `${kind} 仍在星盘页`)
  check(await clickText(kind), `点开${kind}`)
  await sleep(3200)
  v = await viewBtns()
  check(!v.includes('俯视') && !v.includes('侧视'), `${kind} 无「俯视/侧视」按钮`, JSON.stringify(v))
  check(!(await has3D()), `${kind} 未渲染 3D 盘`)
  check(await has2D(), `${kind} 渲染线条盘`)
}

// ============ 3. 切回本命盘: 三档恢复 ============
console.log('\n--- 切回本命盘 ---')
check(await clickText('本命盘'), '点回本命盘')
await sleep(3000)
v = await viewBtns()
check(v.length === 3, '本命盘视图按钮恢复 3 个', JSON.stringify(v))

await page.screenshot({ path: 'C:/Users/99192/WorkBuddy AI/2026-09-18-17-12-50/视图档位-本命盘.png' })
console.log(`\n===== ${pass} pass / ${fail} fail =====`)
await b.close()
process.exit(fail ? 1 : 0)
