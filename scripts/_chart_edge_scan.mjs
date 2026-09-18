// 星盘极端参数扫描：找出会抛错/崩页的生辰组合。
// 重点覆盖: 极地纬度(Placidus 在 ±66.5° 以上数学无解) / 未知出生时间 / 全宫制 / 全盘种。
// 用法: node scripts/_chart_edge_scan.mjs
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const BASE = 'https://mustar.vip/astrology/chart'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const SYS = ['placidus', 'koch', 'equal', 'whole-sign', 'porphyry', 'regiomontanus', 'campanus', 'morinus', 'vettius', 'alcabitiuses', 'sripati', 'pullen', 'polich-page', 'krusinski', 'carter', 'vehlow']
const DP = ['', 's', 't', 'tr', 'sr', 'lr', 'arc', 'fir', 'prof', 'sky']

// 高危生辰：极地 / 未知时辰 / 闰日 / 古早 / 未来 / 赤道 / 南半球
const CASES = [
  ['正常-北京', 'y=1995&mo=6&d=15&h=14&mi=30&cn=%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC&lat=39.9042&lng=116.4074'],
  ['未知时辰', 'y=1995&mo=6&d=15&h=12&mi=0&cn=%E5%8C%97%E4%BA%AC~%E5%8C%97%E4%BA%AC&lat=39.9042&lng=116.4074&nt=1'],
  ['北极圈内-朗伊尔城', 'y=1995&mo=6&d=15&h=14&mi=30&lat=78.22&lng=15.63&tz=1'],
  ['极地-南纬89', 'y=1995&mo=6&d=15&h=14&mi=30&lat=-89&lng=0&tz=0'],
  ['极地-北纬89', 'y=1995&mo=6&d=15&h=14&mi=30&lat=89&lng=0&tz=0'],
  ['赤道', 'y=1995&mo=6&d=15&h=14&mi=30&lat=0&lng=0&tz=0'],
  ['闰日-2月29', 'y=2000&mo=2&d=29&h=14&mi=30&lat=39.9&lng=116.4&tz=8'],
  ['古早-1900', 'y=1900&mo=1&d=1&h=0&mi=0&lat=39.9&lng=116.4&tz=8'],
  ['未来-2030', 'y=2030&mo=12&d=31&h=23&mi=59&lat=39.9&lng=116.4&tz=8'],
  ['南半球-悉尼', 'y=1995&mo=6&d=15&h=14&mi=30&lat=-33.87&lng=151.21&tz=10'],
]

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--no-proxy-server'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 960 })

let curLabel = ''
const errors = []
const failed = []
page.on('pageerror', (e) => errors.push(`[${curLabel}] ${String(e).slice(0, 150)}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[${curLabel}] console: ${m.text().slice(0, 150)}`)
})
page.on('response', (r) => {
  if (r.status() >= 400) failed.push(`[${curLabel}] HTTP ${r.status()} ${r.url().slice(0, 90)}`)
})
let crashed = false
page.on('error', (e) => {
  crashed = true
  errors.push(`[${curLabel}] 标签页崩溃: ${String(e).slice(0, 120)}`)
})

await page.goto('https://mustar.vip/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))

let total = 0
let blank = 0
const blankCases = []

const check = async (label, url) => {
  curLabel = label
  total++
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 })
    await sleep(1500)
    const st = await page.evaluate(() => {
      const wheel = !!document.querySelector('svg.select-none')
      const txt = (document.body.innerText || '').slice(0, 400)
      const hasErr = /排盘失败|出错了|Something went wrong/i.test(txt)
      return { wheel, hasErr }
    })
    if (!st.wheel && !st.hasErr) {
      blank++
      blankCases.push(curLabel)
    }
  } catch (e) {
    errors.push(`[${label}] 导航异常 ${String(e).slice(0, 90)}`)
  }
}

// 阶段 1: 所有高危生辰 × 全部 16 种宫制
console.log('阶段 1/2: 高危生辰 × 16 种宫制 …')
for (const [label, q] of CASES) {
  for (const sys of SYS) {
    await check(`${label}/${sys}`, `${BASE}?${q}&sys=${sys}`)
    if (crashed) break
  }
  if (crashed) break
}

// 阶段 2: 代表生辰 × 4 种宫制 × 全部 10 种盘种
if (!crashed) {
  console.log('阶段 2/2: 代表生辰 × 盘种 …')
  const repCases = [CASES[0], CASES[1], CASES[3]]
  const repSys = ['placidus', 'whole-sign', 'krusinski', 'pullen']
  for (const [label, q] of repCases) {
    for (const sys of repSys) {
      for (const dp of DP) {
        if (!dp) continue
        await check(`${label}/${sys}/dp=${dp}`, `${BASE}?${q}&sys=${sys}&dp=${dp}`)
        if (crashed) break
      }
      if (crashed) break
    }
    if (crashed) break
  }
}

console.log(`\n扫描完成：${total} 个组合`)
console.log(`标签页崩溃      : ${crashed}`)
console.log(`盘面未渲染(空壳): ${blank}`)
blankCases.slice(0, 20).forEach((c) => console.log('   · ' + c))
console.log(`JS/控制台错误   : ${errors.length}`)
const uniq = [...new Set(errors)]
uniq.slice(0, 25).forEach((e) => console.log('   ! ' + e))
console.log(`HTTP 失败       : ${failed.length}`)
;[...new Set(failed)].slice(0, 12).forEach((e) => console.log('   ! ' + e))

await browser.close()
const clean = !crashed && errors.length === 0 && blank === 0
console.log(clean ? '\n✅ 全绿' : '\n⚠️  有异常，见上')
process.exit(clean ? 0 : 1)
