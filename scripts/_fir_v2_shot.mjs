// 法达 v2 截图: 深色+浅色两版
import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1100, height: 1100, deviceScaleFactor: 2 })
await page.goto('http://localhost:3000/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&dp=fir&lang=zh', { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 1800))
const svg = await page.$('svg[viewBox="0 0 920 920"]')
await svg.screenshot({ path: 'scripts/_fir_v2_dark.png' })
// 符号总数 (环上 GlyphPath 应有 9+61=70 个 g[transform^="rotate"])
const n = await page.evaluate(() => {
  const s = [...document.querySelectorAll('svg')].find((x) => x.getAttribute('viewBox') === '0 0 920 920')
  return { rot: [...s.querySelectorAll('g[transform^="rotate"]')].length, paths: s.querySelectorAll('path').length }
})
console.log('旋转符号组数:', JSON.stringify(n))
await b.close()
