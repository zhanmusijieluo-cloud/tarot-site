// 前端体检: 多断点横向溢出 + 三语渲染 + console error (本地 dev server)
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = 'http://localhost:3000'
const CHART = '/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&city=%E8%93%AC%E5%AE%89'

const PAGES = [
  ['/', '首页'], ['/tarot', '塔罗'], ['/spreads', '牌阵'], ['/online', '抽牌'],
  ['/lenormand', '雷诺曼'], ['/learn', '学习'], ['/astrology', '占星'], [CHART, '星盘'],
  ['/archives', '档案'], ['/login', '登录'],
]
const WIDTHS = [1920, 1440, 768, 375]

const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()

console.log('========== 多断点横向溢出 (scrollWidth - clientWidth, >2px 即溢出) ==========')
const errsByPage = {}
for (const [p, zh] of PAGES) {
  const errs = []
  const onConsole = (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 100)) }
  const onErr = (e) => errs.push('[pageerror] ' + String(e).slice(0, 100))
  page.on('console', onConsole); page.on('pageerror', onErr)
  const row = []
  for (const w of WIDTHS) {
    await page.setViewport({ width: w, height: w < 500 ? 812 : 1000 })
    try {
      await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 40000 })
      await new Promise((r) => setTimeout(r, 1200))
      const o = await page.evaluate(() => {
        const de = document.documentElement
        const diff = de.scrollWidth - de.clientWidth
        // 找出溢出的元素
        let culprit = ''
        if (diff > 2) {
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect()
            if (r.width > 0 && r.right > de.clientWidth + 2) {
              const cs = getComputedStyle(el)
              if (cs.position !== 'fixed' && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') {
                culprit = el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 2).join('.')
                break
              }
            }
          }
        }
        return { diff, culprit }
      })
      row.push(`${w}:${o.diff > 2 ? '⚠' + o.diff + (o.culprit ? '(' + o.culprit.slice(0, 28) + ')' : '') : '✓'}`)
    } catch (e) { row.push(`${w}:ERR`) }
  }
  errsByPage[zh] = errs
  console.log(`${zh.padEnd(8)} ${row.join('  ')}`)
  page.off('console', onConsole); page.off('pageerror', onErr)
}

console.log('\n========== console error ==========')
let anyErr = false
for (const [zh, errs] of Object.entries(errsByPage)) {
  if (errs.length) { anyErr = true; console.log(`❌ ${zh}: ${errs.length} 条`); errs.slice(0, 3).forEach((e) => console.log('    ' + e)) }
}
if (!anyErr) console.log('✅ 全部页面无 console error / pageerror')

console.log('\n========== 三语渲染 ==========')
await page.setViewport({ width: 1440, height: 1000 })
for (const lang of ['zh', 'en', 'ja']) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate((l) => localStorage.setItem('oracle-lang', l), lang)
  await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 40000 })
  await new Promise((r) => setTimeout(r, 800))
  const info = await page.evaluate(() => {
    const nav = document.querySelector('nav')?.innerText?.replace(/\s+/g, ' ').slice(0, 90) ?? ''
    const h1 = document.querySelector('h1')?.innerText?.replace(/\s+/g, ' ').slice(0, 50) ?? ''
    return { nav, h1, htmlLang: document.documentElement.lang }
  })
  console.log(`[${lang}] htmlLang=${info.htmlLang} | h1="${info.h1}"`)
  console.log(`      nav="${info.nav}"`)
}

await b.close()
console.log('\n体检完成')
