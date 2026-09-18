// 对照验证: Chrome 走代理 vs 直连 (木木 2026-09-18)
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const URL = 'https://mustar.vip/astrology/chart?y=1995&mo=6&d=15&h=14&mi=30&cn=北京~北京~北京&lat=39.9042&lng=116.4074&sys=placidus'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const run = async (label, args, times) => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', ...args] })
  const page = await b.newPage()
  await page.setViewport({ width: 1280, height: 860 })
  let ok = 0
  const notes = []
  for (let i = 0; i < times; i++) {
    try {
      const r = await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await sleep(2500)
      const wheel = await page.evaluate(() => !!document.querySelector('svg.select-none')).catch(() => false)
      const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 60)).catch(() => '')
      // 注意: 第 2 次起浏览器命中缓存会返回 304, 不能只认 200。
      // 判据以「盘面是否渲染出来」为准, 状态码 200/304 均可。
      const st = r?.status()
      const statusOk = st === 200 || st === 304 || r?.ok()
      if (statusOk && wheel) ok++
      else notes.push('#' + (i + 1) + ' status=' + st + ' 盘面=' + wheel + ' body=' + body)
    } catch (e) {
      notes.push('#' + (i + 1) + ' ' + String(e).slice(0, 80))
    }
    await sleep(400)
  }
  console.log(`\n=== ${label} ===`)
  console.log(`  成功渲染星盘 ${ok}/${times}`)
  if (notes.length) console.log('  失败明细:\n    ' + notes.slice(0, 6).join('\n    '))
  await b.close()
}

await run('A. Chrome 走 Clash 代理 (127.0.0.1:7897)', ['--proxy-server=http://127.0.0.1:7897'], 8)
await run('B. Chrome 直连 (绕过代理)', ['--no-proxy-server'], 8)
