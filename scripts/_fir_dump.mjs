import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') errs.push('console:' + m.text().slice(0, 160)) })
await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 1 })
const URL = 'http://localhost:3000/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&dp=fir&lang=zh'
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 2500))
const st = await page.evaluate(() => {
  const svgs = [...document.querySelectorAll('svg')]
  const big = svgs.map((s) => ({ vb: s.getAttribute('viewBox'), paths: s.querySelectorAll('path').length, circles: s.querySelectorAll('circle').length, texts: s.querySelectorAll('text').length }))
  return {
    finalUrl: location.href,
    bodyHasNatal: /法达|Firdaria|大运/.test(document.body.innerText),
    bodySnippet: document.body.innerText.replace(/\s+/g, ' ').slice(0, 300),
    svgCount: svgs.length,
    big,
    loading: /Loading|加载/.test(document.body.innerText),
  }
})
console.log(JSON.stringify(st, null, 1))
console.log('ERRS:', errs.slice(0, 6))
await b.close()
