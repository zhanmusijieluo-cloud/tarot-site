// 合盘相位清单行结构验收: 夹角在前紧跟符号, 容许度+入/出在后
import puppeteer from 'puppeteer-core'
const ARCH_KEY = 'astro-archives-v1'
const archive = {
  id: 'test-laosh',
  label: '老姐',
  birth: { year: 1993, month: 5, day: 29, hour: 9, minute: 50, timezone: 8, latitude: 31.028, longitude: 106.413, city: '蓬安县', timeKnown: true },
  note: '', contact: '', savedAt: Date.now(),
}
const URL = 'http://localhost:3000/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&city=%E8%93%AC%E5%AE%89%E5%8E%BF&sync=test-laosh&stab=compA&lang=zh'
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(String(e).slice(0, 140)))
await page.setViewport({ width: 1400, height: 950, deviceScaleFactor: 2 })
await page.goto('http://localhost:3000/astrology/chart', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.evaluate((k, a) => localStorage.setItem(k, JSON.stringify([a])), ARCH_KEY, archive)
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 3000))

// 相位清单 li: 含 □/△/☌ 符号 + 度数 span 们
const rows = await page.evaluate(() => {
  const lis = [...document.querySelectorAll('li')].filter((l) => {
    const t = l.innerText
    return /[□△⚹☍☌]/.test(t) && /°/.test(t) && l.querySelectorAll('span').length >= 5
  })
  return lis.slice(0, 6).map((l) => [...l.querySelectorAll('span')].map((s) => {
    const r = s.getBoundingClientRect()
    return { t: s.innerText.trim().slice(0, 10), x: Math.round(r.x), w: Math.round(r.width) }
  }))
})
for (const r of rows) {
  console.log(r.map((s) => `[${s.t}]@${s.x}`).join(' '))
  // 量: 相位符号 → 其后第一个度数的间距
  const aspIdx = r.findIndex((s) => /^[□△⚹☍☌]$/.test(s.t))
  const degIdx = r.findIndex((s) => /^\d+(\.\d+)?°$/.test(s.t))
  if (aspIdx >= 0 && degIdx >= 0) console.log('   间距检查: 相位符号右缘→度数 =', degIdx > aspIdx ? r[degIdx].x - (r[aspIdx].x + r[aspIdx].w) : '顺序错(度数不在符号后)')
}
console.log('JS错误:', errs.length ? errs.slice(0, 2) : '无')
const panel = await page.evaluateHandle(() => {
  const li = [...document.querySelectorAll('li')].find((l) => /[□△⚹☍☌]/.test(l.innerText) && /°/.test(l.innerText))
  return li ? li.closest('div.rounded, div[class*=border]') || li.parentElement : null
})
if (panel.asElement()) await panel.asElement().screenshot({ path: 'scripts/_syn_rows.png' })
await b.close()
