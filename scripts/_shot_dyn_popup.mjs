// 线上实景截图: 行运盘点「土星」→ 特征弹窗 (修前土星点不动)
import puppeteer from 'puppeteer-core'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 940, deviceScaleFactor: 1.4 })
await p.goto('https://mustar.vip/astrology/chart?y=1995&mo=1&d=1&h=12&mi=0&tz=8&lat=39.9042&lng=116.4074&city=%E5%8C%97%E4%BA%AC&dp=tr&dpy=2026&dpm=9&dpd=18', { waitUntil: 'domcontentloaded', timeout: 90000 })
await new Promise(r => setTimeout(r, 6000))
const c = await p.evaluate(() => {
  const g = document.querySelector('svg [data-name="Saturn"]')
  const tg = [...g.querySelectorAll('g[transform]')].find(x => /translate\(/.test(x.getAttribute('transform')))
  const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(tg.getAttribute('transform'))
  const own = g.ownerSVGElement
  const pt = own.createSVGPoint(); pt.x = +m[1]; pt.y = +m[2]
  const sp = pt.matrixTransform(own.getScreenCTM())
  return { x: sp.x, y: sp.y }
})
await p.mouse.click(c.x, c.y)
await new Promise(r => setTimeout(r, 1200))
const ok = await p.evaluate(() => document.querySelector('[data-planet-detail]')?.getAttribute('data-planet-detail'))
console.log('弹窗 key =', ok)
await p.screenshot({ path: 'D:/网站/塔罗/tarot-site/scripts/_shot_dyn_popup.png' })
await b.close()
