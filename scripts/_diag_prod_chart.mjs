// 诊断: 线上星盘页在 headless 里到底渲染成什么样 (本地能跑通, 线上跑不通, 要看清差异)
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const URL_ = 'https://mustar.vip/astrology/chart?y=1995&mo=1&d=1&h=12&mi=0&lat=39.9&lng=116.41&tz=8'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--no-proxy-server'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 960 })

const errs = [], bad = [], failed = []
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)) })
page.on('response', (r) => { if (r.status() >= 400) bad.push(`HTTP ${r.status()} ${r.url().slice(0, 110)}`) })
page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText || '?'} ${r.url().slice(0, 110)}`))

await page.goto('https://mustar.vip/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))
await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60000 })

for (const t of [3000, 5000, 8000, 12000, 20000]) {
  await sleep(t === 3000 ? 3000 : t - (t === 5000 ? 3000 : t === 8000 ? 5000 : t === 12000 ? 8000 : 12000))
  const st = await page.evaluate(() => ({
    title: document.title,
    buttons: document.querySelectorAll('button').length,
    svgAll: document.querySelectorAll('svg').length,
    wheelSvg: document.querySelectorAll('svg.select-none').length,
    planetGs: document.querySelectorAll('g[data-ring][data-name]').length,
    canvases: document.querySelectorAll('canvas').length,
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 260),
    checkpoint: document.body.innerText.includes('Vercel Security Checkpoint') || document.body.innerText.includes('Verifying you are human'),
  }))
  console.log(`\n--- ${t}ms ---`)
  console.log(`title="${st.title}" buttons=${st.buttons} svg=${st.svgAll} 盘面svg=${st.wheelSvg} 行星组=${st.planetGs} canvas=${st.canvases}`)
  console.log(`挑战页=${st.checkpoint}`)
  console.log(`正文: ${st.text}`)
}

console.log('\n=== pageerror / console error ===')
console.log(errs.length ? errs.slice(0, 6).join('\n') : '(无)')
console.log('=== 4xx/5xx ===')
console.log(bad.length ? bad.slice(0, 6).join('\n') : '(无)')
console.log('=== 请求失败 ===')
console.log(failed.length ? failed.slice(0, 6).join('\n') : '(无)')

await browser.close()
