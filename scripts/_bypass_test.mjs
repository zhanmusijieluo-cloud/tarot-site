import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const URL = 'https://mustar.vip/astrology/chart?y=1995&mo=6&d=15&h=14&mi=30&cid=beijing&sys=placidus'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const run = async (label, args, times) => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', ...args] })
  const p = await b.newPage()
  await p.setViewport({ width: 1280, height: 860 })
  let ok = 0, code403 = 0, other = 0
  for (let i = 0; i < times; i++) {
    try {
      const r = await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await sleep(2200)
      const wheel = await p.evaluate(() => !!document.querySelector('svg.select-none')).catch(() => false)
      if (wheel) ok++
      else if (r?.status() === 403) code403++
      else other++
    } catch { other++ }
    await sleep(300)
  }
  console.log(`  ${label}\n    星盘正常渲染 ${ok}/${times}  |  被拦(403) ${code403}  |  其他 ${other}`)
  await b.close()
}
console.log('=== 修改系统代理绕过列表之后 ===')
await run('C. Chrome 用系统代理设置 (现状, 已绕过 mustar.vip)', [], 8)
