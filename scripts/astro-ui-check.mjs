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

// 相位矩阵 = border-separate 表 (黄道状态大表是普通table, 不能混计)
const tablesOf = () => page.$$eval('table.border-separate', (ts) => ts.filter((t) => t.querySelectorAll('td').length > 20).length)
check((await tablesOf()) >= 1, `初始网格模式: 矩阵表渲染`)
check(page.url().indexOf('ag=') === -1, `默认URL无ag参数 (grid为默认态)`)

// T2 点"列表" → 矩阵消失(除状态表) + URL 带 ag=list
check(await clickBtn(TXT.list), `点击「${TXT.list}」`)
await sleep(900)
const listPills = await page.$$eval('p,span', (ss) => ss.filter((s) => /[A-Za-z\u4e00-\u9fff]–[A-Za-z\u4e00-\u9fff]/.test(s.textContent) && s.textContent.length < 30).length)
check(listPills > 5, `列表模式: 相位行 ${listPills} 个`)
check(page.url().includes('ag=list'), `URL 同步 ag=list`)

// T3 列表数据正确性: 图例固定符号仍在网格模式 (先切回网格验)
check(await clickBtn(TXT.grid), `点击「${TXT.grid}」回网格`)
await sleep(900)
const gridFacts = await page.evaluate(() => {
  const t = document.querySelector('table.border-separate')
  if (!t) return null
  const txt = document.body.innerText
  return { hasSquare: txt.includes('□'), hasConj: txt.includes('☌'), hasQnx: txt.includes('⚻'), legend: txt.includes('A=入相') || txt.includes('A=applying') }
})
check(!!gridFacts && gridFacts.hasSquare && gridFacts.hasConj && gridFacts.hasQnx && gridFacts.legend, `矩阵含合/刑/梅花符号+图例 (固定符号表)`)

// T4 刷新保持列表/网格 (URL 即真相)
await page.reload({ waitUntil: 'networkidle0' })
await sleep(900)
check((await tablesOf()) >= 1, `刷新后仍网格 (ag 已清)`)

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

// T7 左列行星行点击 → 盘面联动 (行背景变化 + 详情出现)
const rowClicked = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('button')].filter((x) => /宫|—/.test(x.textContent) && x.textContent.length > 6 && x.textContent.length < 40)
  if (!rows.length) return false
  rows[0].click(); return true
})
await sleep(700)
check(rowClicked, `点行星列首行`)
const detailShown = await page.evaluate(() => {
  const t = document.body.innerText
  return /落宫|House|尊贵|Dignity|入庙|失势/.test(t)
})
check(detailShown, `点击后详情/尊贵信息可见`)

// T8 宫神星式五区分布: 资料卡 / 行星列 / 相位矩阵 / 特征面板 / 黄道状态大表 全部在场
const zones = await page.evaluate(() => {
  const t = document.body.innerText
  return {
    birthCard: /出生资料|birth data/i.test(t),
    features: /特征|features/i.test(t),
    recep: /互容接纳|mutual|被.*接纳|received/i.test(t),
    statusTable: /黄道状态|ecliptic status/i.test(t),
    grid: !!document.querySelector('table.border-separate'),
    wide3col: !!document.querySelector('[class*="lg:grid-cols-[236px"]'),
  }
})
check(Object.values(zones).every(Boolean), `五区齐: ${Object.entries(zones).filter(([, v]) => v).map(([k]) => k).join('/')}`)

await b.close()
console.log(`\n结果: ${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
