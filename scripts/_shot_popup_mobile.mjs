// 窄屏浮动弹窗视觉确认 (390x844 iPhone 尺寸 + 768x1024 平板)
import puppeteer from 'puppeteer-core'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BIRTH = 'y=1995&mo=1&d=1&h=12&mi=0&tz=8&lat=39.9042&lng=116.4074&city=%E5%8C%97%E4%BA%AC'
const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
for (const [w, h] of [[390, 844], [768, 1024]]) {
  const p = await b.newPage()
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 2 })
  await p.goto(`https://mustar.vip/astrology/chart?${BIRTH}&dp=tr&dpy=2026&dpm=9&dpd=18`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  // 轮询等盘面就绪 (别固定 sleep: 线上 CDN 冷启动可达 12s, 本地 4s 就绪)
  for (let i = 0; i < 60; i++) {
    if (await p.evaluate(() => document.querySelectorAll('svg [data-name]').length > 0)) break
    await new Promise(r => setTimeout(r, 500))
  }
  await new Promise(r => setTimeout(r, 800))
  const c = await p.evaluate(() => {
    const g = document.querySelector('svg [data-name="Saturn"]')
    if (!g) return null
    const tg = [...g.querySelectorAll('g[transform]')].find(x => /translate\(/.test(x.getAttribute('transform')))
    const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(tg.getAttribute('transform'))
    const own = g.ownerSVGElement
    const pt = own.createSVGPoint(); pt.x = +m[1]; pt.y = +m[2]
    const sp = pt.matrixTransform(own.getScreenCTM())
    return { x: sp.x, y: sp.y }
  })
  if (!c) { console.log(`${w}x${h}: 盘面未渲染`); await p.close(); continue }
  await p.mouse.click(c.x, c.y)
  await new Promise(r => setTimeout(r, 1200))
  const info = await p.evaluate(() => {
    const d = document.querySelector('[data-planet-detail]')
    if (!d) return { popup: false }
    const r = d.getBoundingClientRect()
    const cs = getComputedStyle(d.parentElement)
    return { popup: true, key: d.getAttribute('data-planet-detail'), pos: cs.position, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], inView: r.top >= 0 && r.bottom <= innerHeight }
  })
  console.log(`${w}x${h} →`, JSON.stringify(info))
  await p.screenshot({ path: `D:/网站/塔罗/tarot-site/scripts/_shot_popup_${w}x${h}.png` })
  await p.close()
}
await b.close()
