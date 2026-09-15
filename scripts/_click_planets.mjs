// 实弹复现 v3: 合盘页 16 盘 Tab 逐个点行星, 检查真错误覆盖层
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const ARCH_KEY = 'astro-archives-v1'
const archive = {
  id: 'test-laosh',
  label: '老姐',
  birth: { year: 1993, month: 5, day: 29, hour: 9, minute: 50, timezone: 8, latitude: 31.028, longitude: 106.413, city: '蓬安县', timeKnown: true },
  note: '', contact: '', savedAt: Date.now(),
}
const BASE = 'http://localhost:3000/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&city=%E8%93%AC%E5%AE%89%E5%8E%BF&sync=test-laosh&stab='
const TABS = ['compS', 'compT', 'davison', 'davS', 'davT', 'marksA', 'marksAT', 'marksB', 'marksBT', 'natalA', 'natalB']

const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 1000 })
const consoleErrs = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 250)) })
page.on('pageerror', (e) => consoleErrs.push('[pageerror] ' + String(e).slice(0, 250)))

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.evaluate((k, a) => localStorage.setItem(k, JSON.stringify([a])), ARCH_KEY, archive)

const checkErr = () => page.evaluate(() => {
  const portal = document.querySelector('nextjs-portal')
  if (!portal?.shadowRoot) return false
  return !!portal.shadowRoot.querySelector('[data-nextjs-dialog], [data-nextjs-dialog-overlay], dialog')
})

for (const tab of TABS) {
  await page.goto(BASE + tab, { waitUntil: 'networkidle0', timeout: 90000 })
  await new Promise((r) => setTimeout(r, 5000))
  consoleErrs.length = 0
  const targets = await page.evaluate(() => {
    const els = [...document.querySelectorAll('svg [data-name]')]
    const seen = new Set(); const list = []
    for (const el of els) {
      const nm = el.getAttribute('data-name')
      if (!nm || seen.has(nm)) continue
      seen.add(nm)
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) list.push({ nm, x: r.x + r.width / 2, y: r.y + r.height / 2 })
    }
    return list.slice(0, 12)
  })
  let crashed = false
  for (const c of targets) {
    await page.mouse.click(c.x, c.y)
    await new Promise((r) => setTimeout(r, 500))
    if (await checkErr()) {
      console.log(`  [${tab} · ${c.nm}] 💥 错误覆盖层! console:`, consoleErrs.slice(0, 2))
      await page.screenshot({ path: `D:/网站/塔罗/tarot-site/scripts/_crash_${tab}.png` })
      crashed = true
      break
    }
    consoleErrs.length = 0
  }
  if (!crashed) console.log(`  [${tab}] ✅ ${targets.length} 星全点, 无崩溃`)
}
await b.close()
console.log('DONE')
