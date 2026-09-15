// 截取本地最新版 compS/compT 盘面 + 关键数据, 供爸爸对比
import puppeteer from 'puppeteer-core'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const ARCH_KEY = 'astro-archives-v1'
const archive = { id: 'test-laosh', label: '老姐', birth: { year: 1993, month: 5, day: 29, hour: 9, minute: 50, timezone: 8, latitude: 31.028, longitude: 106.413, city: '蓬安县', timeKnown: true }, note: '', contact: '', savedAt: Date.now() }
const base = 'y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&city=%E8%93%AC%E5%AE%89%E5%8E%BF&sync=test-laosh&stab='

const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1500, height: 1100 })
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.evaluate((k, a) => { localStorage.setItem(k, JSON.stringify([a])); localStorage.setItem('oracle-lang', 'zh') }, ARCH_KEY, archive)

for (const [tab, fname] of [['compS', '检查图-组合次限-女儿网站.png'], ['compT', '检查图-组合三限-女儿网站.png']]) {
  await page.goto('http://localhost:3000/astrology/chart?' + base + tab, { waitUntil: 'networkidle0', timeout: 90000 })
  await page.waitForFunction(() => {
    const s = document.querySelector('svg[viewBox="0 0 920 920"]')
    return s && s.querySelectorAll('text').length >= 20
  }, { timeout: 60000 })
  await new Promise((r) => setTimeout(r, 2500))
  const card = await page.evaluate(() => {
    const s = document.querySelector('svg[viewBox="0 0 920 920"]')
    const r = s.getBoundingClientRect()
    // 关键读数
    const asc = [...s.querySelectorAll('text')].find((t) => t.textContent.trim() === 'ASC')?.nextElementSibling?.textContent ?? ''
    return { x: r.x, y: r.y, w: r.width, h: r.height, asc: [...document.querySelectorAll('text')].map((t) => t.textContent.trim()).filter((t) => /°/.test(t)).slice(0, 6) }
  })
  await page.screenshot({ path: 'D:/网站/塔罗/' + fname, clip: { x: Math.max(0, card.x - 8), y: Math.max(0, card.y - 8), width: Math.min(1500, card.w + 16), height: Math.min(1100, card.h + 16) } })
  console.log(fname, '→ ASC/DSC/MC/IC 及前几组度数:', JSON.stringify(card.asc))
}
await b.close()
console.log('完成')
