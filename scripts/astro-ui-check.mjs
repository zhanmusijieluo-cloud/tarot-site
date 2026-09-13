// 真实浏览器点击验收 (Edge headless): 列表/网格切换 · URL同步 · 行星列↔盘联动 · 设置抽屉
import puppeteer from 'puppeteer-core'

const ZH = process.argv.includes('--zh')
const LANG_KEY = '***'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = 'http://localhost:3000/astrology/chart?y=1995&mo=6&d=15&h=14&mi=30&cid=beijing&sys=placidus'

const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 900 })
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 240)))

let pass = 0, fail = 0
const check = (ok, msg) => { ok ? pass++ : fail++; console.log(`${ok ? '✅' : '❌'} ${msg}`) }
// 文案按语言取 (同一测试可在中英下都跑)
const TXT = ZH
  ? { grid: '网格', list: '列表', settings: '排盘设置', housesTab: '宫制', whole: '整宫', koch: '科赫' }
  : { grid: 'Grid', list: 'List', settings: 'Chart Settings', housesTab: 'Houses', whole: 'Whole Sign', koch: 'Koch' }
const clickBtn = (label) => page.evaluate((lt) => {
  const el = [...document.querySelectorAll('button')].find((x) => x.textContent.trim().includes(lt) && x.textContent.trim().length < 24)
  if (el) { el.click(); return true } return false
}, label)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 })
if (ZH) { await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh')); await page.reload({ waitUntil: 'networkidle0' }) }
await sleep(1200)

// 相位区定稿: 左矩阵 + 右清单 同屏并排, 无空白 (旧列表/网格切换已废除)
const tablesOf = () => page.$$eval('table.border-separate', (ts) => ts.length)
check((await tablesOf()) === 1, `矩阵在页 (1张)`)
const duo = await page.evaluate(() => {
  const g = document.querySelector('table.border-separate')
  const sec = g?.closest('section')
  if (!sec) return null
  const list = [...sec.querySelectorAll('ul li button')].filter((x) => x.textContent.includes('\u2013') && x.textContent.includes('\u00b0'))
  // 右清单与矩阵同屏: 条数应与相位数一致级别
  return { listCount: list.length, hasToggle: [...sec.querySelectorAll('button')].some((x) => x.textContent.trim() === '列表' || x.textContent.trim() === '网格') }
})
check(!!duo && duo.listCount > 5, `相位清单与矩阵同屏 (${duo?.listCount} 条)`)
check(!!duo && !duo.hasToggle, `无列表/网格切换钮 (同屏后多余)`)
// 空白消除: 矩阵右侧紧邻清单 (水平间距 < 面板宽30%)
const fill = await page.evaluate(() => {
  const g = document.querySelector('table.border-separate').getBoundingClientRect()
  const ul = document.querySelector('table.border-separate').closest('div.grid')?.querySelector('ul')
  if (!ul) return 9999
  return Math.round(ul.getBoundingClientRect().left - g.right)
})
check(fill < 60, `矩阵与清单无大空隙 (间隔${fill}px)`)
await page.reload({ waitUntil: 'networkidle0' })
await sleep(900)

// T5 网格零滚动 + 弹窗固定大小实色底 (硬性反馈回归锁)
// 默认视图已是线条盘(classic) — 这三条断言锚定3D画布, 先切回俯视再测
await page.evaluate(() => { [...document.querySelectorAll('button')].find((x) => ['俯视', 'Top'].some((k) => x.textContent.trim().startsWith(k)))?.click() })
await sleep(900)
const gridFit = await page.evaluate(() => {
  const g = document.querySelector('table.border-separate')
  const wrap = g?.parentElement
  return wrap ? { oy: wrap.scrollHeight - wrap.clientHeight, ox: wrap.scrollWidth - wrap.clientWidth } : null
})
check(!!gridFit && gridFit.oy <= 4 && gridFit.ox <= 4, `矩阵容器零滚动 (y=${gridFit?.oy} x=${gridFit?.ox})`)
const wBefore = await page.evaluate(() => document.querySelector('.cursor-grab canvas')?.getBoundingClientRect().width ?? 0)
await page.evaluate(() => {
  // 关可能残留的抽屉, 再精准点星盘卡头部的 ☉
  const esc = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '完 成' || x.textContent.trim() === 'Done');
  if (esc) esc.click()
  const wheelCard = document.querySelector('.cursor-grab')?.closest('div[class*="rounded-2xl"]')
  const sun = [...(wheelCard?.querySelectorAll('button') ?? [])].find((x) => x.textContent.trim() === '☉')
  sun?.click()
})
await sleep(1000)
const popupFix = await page.evaluate(() => {
  const cv = document.querySelector('.cursor-grab canvas')
  const pop = [...document.querySelectorAll('div')].find((d) => d.className.toString().includes('lg:right-3'))
  const card = pop?.querySelector('div')
  const m = card ? getComputedStyle(card).backgroundColor.match(/[\d.]+/g) : null
  return { wAfter: cv?.getBoundingClientRect().width ?? 0, alpha: m && m.length >= 4 ? Number(m[3]) : 0 }
})
check(Math.abs(popupFix.wAfter - wBefore) < 2, `星盘大小固定 (弹窗开合宽度 ${Math.round(wBefore)}→${Math.round(popupFix.wAfter)})`)
check(popupFix.alpha >= 0.9, `弹窗实色不透明 (alpha=${popupFix.alpha})`)
await page.evaluate(() => { document.querySelector('[class*="lg:right-3"] button')?.click() }) // 关窗
await sleep(500)

// T6 设置抽屉: 打开 → 五分区 → 宫制Tab切科赫 → URL sys 变
check(await clickBtn(TXT.settings), `点击「${TXT.settings}」`)
await sleep(500)
const tabNames = ZH ? ['时间', '天体', '宫制', '相位', '显示'] : ['Time', 'Bodies', 'Houses', 'Aspects', 'Display']
const found = []
for (const tb of tabNames) if (await page.evaluate((s) => [...document.querySelectorAll('button')].some((x) => x.textContent.trim().includes(s)), tb)) found.push(tb)
check(found.length >= 4, `设置抽屉五分区: ${found.join('/')}`)
check(await clickBtn(TXT.housesTab), `进宫制Tab`)
await sleep(400)
check(await clickBtn(TXT.koch), `选「${TXT.koch}」`)
await sleep(1600)
check(page.url().includes('sys=koch'), `抽屉切宫制生效: ${page.url().match(/sys=[^&]+/)?.[0]}`)

// T7 盘顶行星符号点击 → 浮动小窗详情 (含尊贵+接纳判词)
const symClicked = await page.evaluate(() => {
  const mount = document.querySelector('.cursor-grab')
  const card = mount?.parentElement?.parentElement
  const moon = [...(card?.querySelectorAll('button') ?? [])].find((x) => x.textContent.trim() === '☽')
  if (!moon) return false
  moon.click(); return true
})
await sleep(700)
check(symClicked, `点盘顶行星符号`)
const detailShown = await page.evaluate(() => {
  // 弹窗容器自身文本 (features面板接纳二字已符号化, 不能靠全文)
  const pop = [...document.querySelectorAll('div')].find((d) => d.className.toString().includes('lg:right-3'))
  const t = pop?.innerText ?? ''
  return /落宫|尊贵|House|Dignity/i.test(t) && /相位|aspect/i.test(t) && t.length > 60
})
check(detailShown, `弹窗小窗含尊贵+接纳判词 (替代已删星体列/信息不丢)`)

// T8 新分布: 星图放大+网格垫底重叠 / 特征保留 / 状态大表保留 / 星体列已删
const zones = await page.evaluate(() => {
  const t = document.body.innerText
  const grid = document.querySelector('table.border-separate')
    return {
    birthLine: /GMT ?[+−+-]?\d|回归黄道|tropical/i.test(t),
    features: /特征|features/i.test(t),
    recep: /⇄|↦|互容|mutual/i.test(t),
    statusTable: /黄道状态|ecliptic status/i.test(t),
    gridUnderWheel: (() => {
      const g = document.querySelector('table.border-separate')
      const c = document.querySelector('.cursor-grab canvas') || [...document.querySelectorAll('canvas')].find((x) => x.getBoundingClientRect().width < 1300)
      if (!g || !c) return false
      return g.getBoundingClientRect().top > c.getBoundingClientRect().bottom - 5 // 网格在盘下方(全宽放大)
    })(),
    gridBigCells: (() => {
      const td = [...document.querySelectorAll('table.border-separate tbody td')].find((x) => x.querySelector('[title]'))
      return !!td && td.getBoundingClientRect().width >= 40 // 格子≥40px (爸爸: 太小看不清)
    })(),
    legendVisible: /A=入相|A=applying/i.test(t),
    bodiesPanelGone: !/星体 · 1[0-9]/.test(t),
    twoCol: !!document.querySelector('[class*="lg:grid-cols-[minmax(0,1fr)_236px]"]'),
    wheelTall: (() => { const c = document.querySelector('.cursor-grab canvas') || [...document.querySelectorAll('canvas')].find((x) => x.getBoundingClientRect().width < 1300); return !!c && c.getBoundingClientRect().height >= 560 })(),
  }
})
check(Object.values(zones).every(Boolean), `新分布齐: ${Object.entries(zones).filter(([, v]) => v).map(([k]) => k).join('/')}`)

await b.close()
console.log(`\n结果: ${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
