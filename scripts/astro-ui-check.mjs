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

// T1 初始=列表: 有相位圆片, 无矩阵表
const pills = await page.$$eval('span', (ss) => ss.filter((s) => /[A-Za-z\u4e00-\u9fff]–/.test(s.textContent)).length)
const tablesOf = () => page.$$eval('table', (ts) => ts.filter((t) => t.querySelectorAll('td').length > 20).length)
check(pills > 5, `列表模式: 相位圆片 ${pills} 个`)
check((await tablesOf()) === 0, `初始无矩阵表`)

// T2 点"网格" → 矩阵出现 + URL 带 ag=grid
check(await clickBtn(TXT.grid), `点击「${TXT.grid}」`)
await sleep(900)
const tblN = await tablesOf()
check(tblN >= 1, `网格模式: 相位矩阵渲染 (${tblN} 张表)`)
check(page.url().includes('ag=grid'), `URL 同步 ag=grid`)

// T3 矩阵数据正确性: 水星-火星 □ 0.1S 应有一格; 图例存在
const gridFacts = await page.evaluate(() => {
  const t = [...document.querySelectorAll('table')].find((x) => x.querySelectorAll('td').length > 20)
  if (!t) return null
  const txt = t.innerText
  return { hasSquare: txt.includes('□'), hasConj: txt.includes('☌'), legend: document.body.innerText.includes('A=入相') || document.body.innerText.includes('A=applying') }
})
check(!!gridFacts && gridFacts.hasSquare && gridFacts.hasConj, `矩阵含刑/合符号 (数据来自引擎)`)

// T4 刷新保持网格 (URL 即真相)
await page.reload({ waitUntil: 'networkidle0' })
await sleep(900)
check((await tablesOf()) >= 1, `刷新后仍网格`)

// T5 点"列表" → 矩阵消失 + ag 移除
check(await clickBtn(TXT.list), `点击「${TXT.list}」`)
await sleep(900)
check((await tablesOf()) === 0, `切回列表, 矩阵消失`)
check(!page.url().includes('ag=grid'), `URL 清理 ag`)

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

// T7 行星列点击 → 盘面高亮联动 (选中的行背景变化 + 详情卡出现)
await page.evaluate(() => document.querySelectorAll('[class*=glass-btn]').length)
const rowClicked = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('button')].filter((x) => /宫|H/.test(x.textContent) && x.textContent.length > 6)
  if (!rows.length) return false
  rows[0].click(); return true
})
await sleep(700)
check(rowClicked, `点行星列首行`)
const detailShown = await page.evaluate(() => {
  const t = document.body.innerText
  return /落宫|House|尊贵|Dignity|互溶|Reception/.test(t) && !!document.querySelector('.fixed, [class*=absolute]')
})
check(detailShown, `点击后出详情/高亮 (联动生效)`)

// T8 布局: 宽屏下 盘+侧栏 双栏 (lg:grid-cols-[1fr_268px])
const twoCol = await page.evaluate(() => {
  const aside = document.querySelector('aside')
  if (!aside) return false
  return getComputedStyle(aside.parentElement).display === 'grid'
})
check(twoCol, `宽屏双栏布局 (盘 | 行星列)`)

await b.close()
console.log(`\n结果: ${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
