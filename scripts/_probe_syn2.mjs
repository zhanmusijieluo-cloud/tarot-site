// 合盘 compS 线条盘 dump: 文字/线/符号
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const ARCH_KEY = 'astro-archives-v1'
const archive = {
  id: 'test-laosh', label: '老姐',
  birth: { year: 1993, month: 5, day: 29, hour: 9, minute: 50, timezone: 8, latitude: 31.028, longitude: 106.413, city: '蓬安县', timeKnown: true },
  note: '', contact: '', savedAt: Date.now(),
}
const URL_SYN = 'http://localhost:3000/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&city=%E8%93%AC%E5%AE%89%E5%8E%BF&sync=test-laosh&stab=compS'

const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 1000 })
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)))
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.evaluate((k, a) => { localStorage.setItem(k, JSON.stringify([a])); localStorage.setItem('oracle-lang', 'zh') }, ARCH_KEY, archive)
await page.goto(URL_SYN, { waitUntil: 'networkidle0', timeout: 90000 })
// 等待线条盘渲染: svg[viewBox="0 0 920 920"] 且有 30+ text
await page.waitForFunction(() => {
  const s = document.querySelector('svg[viewBox="0 0 920 920"]')
  return s && s.querySelectorAll('text').length >= 10 && s.querySelectorAll('line').length >= 10
}, { timeout: 60000 })
await new Promise((r) => setTimeout(r, 2500))

const dump = await page.evaluate(() => {
  const s = document.querySelector('svg[viewBox="0 0 920 920"]')
  const texts = [...s.querySelectorAll('text')].map((t) => ({
    t: t.textContent.trim(), x: Math.round(+t.getAttribute('x') || 0), y: Math.round(+t.getAttribute('y') || 0),
    fs: t.getAttribute('font-size'), fill: (t.getAttribute('fill') || '').slice(0, 12),
  }))
  const lines = [...s.querySelectorAll('line')].map((l) => ({
    x1: Math.round(+l.getAttribute('x1')), y1: Math.round(+l.getAttribute('y1')),
    x2: Math.round(+l.getAttribute('x2')), y2: Math.round(+l.getAttribute('y2')),
    st: (l.getAttribute('stroke') || '').slice(0, 14),
  }))
  const paths = s.querySelectorAll('path').length
  const circles = [...s.querySelectorAll('circle')].map((c) => ({ r: Math.round(+c.getAttribute('r')), cx: Math.round(+c.getAttribute('cx')), cy: Math.round(+c.getAttribute('cy')) })).slice(0, 20)
  return { texts, lines, paths, circles }
})
console.log('texts:', JSON.stringify(dump.texts, null, 0))
console.log('lines:', JSON.stringify(dump.lines, null, 0))
console.log('paths:', dump.paths, 'circles:', JSON.stringify(dump.circles))
await b.close()
