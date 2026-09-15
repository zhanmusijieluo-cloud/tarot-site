// 截图相位网格新样式 (对角符号+网格线) 供验收
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const URL = 'http://localhost:3000/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&city=%E8%93%AC%E5%AE%89'

const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 1100 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 90000 })
await new Promise((r) => setTimeout(r, 6000))
// 找到含相位网格的表格并截图
const grid = await page.$('table')
if (grid) {
  await grid.screenshot({ path: 'D:/网站/塔罗/tarot-site/scripts/_grid_new.png' })
  console.log('已截图 scripts/_grid_new.png')
} else {
  await page.screenshot({ path: 'D:/网站/塔罗/tarot-site/scripts/_grid_new.png', fullPage: false })
  console.log('未找到 table, 截了整页')
}
await b.close()
