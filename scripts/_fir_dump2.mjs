import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 1 })
await page.goto('http://localhost:3000/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&dp=fir&lang=zh', { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 2000))
const st = await page.evaluate(() => {
  const svg = [...document.querySelectorAll('svg')].find((s) => s.getAttribute('viewBox') === '0 0 920 920')
  if (!svg) return 'no 920 svg'
  const paths = [...svg.querySelectorAll('path')]
  // 统计 path 起点半径分布
  const radBuckets = {}
  for (const p of paths) {
    const m = (p.getAttribute('d') || '').match(/^M\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/)
    if (!m) continue
    const r = Math.round(Math.hypot(+m[1] - 460, +m[2] - 460))
    const bk = Math.floor(r / 10) * 10
    radBuckets[bk] = (radBuckets[bk] || 0) + 1
  }
  const cursors = [...svg.querySelectorAll('g')].filter((g) => (g.getAttribute('style') || '').includes('pointer')).length
  const textSamples = [...svg.querySelectorAll('text')].slice(-24).map((t) => t.textContent)
  return { totalPaths: paths.length, radBuckets, cursors, textSamples }
})
console.log(JSON.stringify(st, null, 1))
await b.close()
