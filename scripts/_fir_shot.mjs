// 法达环成品截图 (本地+验证跳转后面板)
import puppeteer from 'puppeteer-core'

const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1460, height: 1050 })
await page.goto('http://localhost:3000/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&city=%E8%93%AC%E5%AE%89&dp=fir', { waitUntil: 'networkidle0', timeout: 90000 })
await new Promise((r) => setTimeout(r, 8000))
const svg = await page.$('svg[viewBox="0 0 920 920"]')
if (svg) await svg.screenshot({ path: 'D:/网站/塔罗/tarot-site/scripts/_firdaria_colored.png' })
// 悬停测试: 取一个法达段 g (cursor:pointer), 悬停前后 fill-opacity 变化
const hovTest = await page.evaluate(async () => {
  const gs = [...document.querySelectorAll('svg g[style]')].filter((x) => (x.getAttribute('style') || '').includes('pointer'))
  if (!gs.length) return 'no segments'
  const fir = gs[20]
  const first = fir.querySelector(':scope > path')
  const before = first.getAttribute('fill-opacity')
  fir.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  await new Promise((r) => setTimeout(r, 400))
  const after = fir.querySelector(':scope > path').getAttribute('fill-opacity')
  return { segs: gs.length, before, after }
})
console.log('悬停前/后透明度:', JSON.stringify(hovTest))
await b.close()
console.log('截图: scripts/_firdaria_colored.png')
