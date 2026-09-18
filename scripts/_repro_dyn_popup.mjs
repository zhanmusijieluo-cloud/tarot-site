// 复现: 动态盘 (三限/次限/日返/月返/行运/日弧) 点行星是否有特征弹窗 [data-planet-detail]
// 用法: node scripts/_repro_dyn_popup.mjs [--base=http://localhost:3000] [--headful]
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const args = process.argv.slice(2)
const argOf = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const BASE = argOf('base', 'http://localhost:3000')
const HEADFUL = args.includes('--headful')

const BIRTH = 'y=1995&mo=1&d=1&h=12&mi=0&tz=8&lat=39.9042&lng=116.4074&city=%E5%8C%97%E4%BA%AC'
const KINDS = [['', '本命盘'], ['t', '三限盘'], ['s', '次限盘'], ['sr', '日返盘'], ['lr', '月返盘'], ['tr', '行运盘'], ['arc', '日弧盘']]

const b = await puppeteer.launch({ executablePath: EDGE, headless: !HEADFUL, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 1000 })
const errs = []
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => errs.push('[pageerror] ' + String(e).slice(0, 200)))

for (const [dp, label] of KINDS) {
  const url = `${BASE}/astrology/chart?${BIRTH}${dp ? `&dp=${dp}&dpy=2026&dpm=9&dpd=18` : ''}`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await new Promise((r) => setTimeout(r, 4500))
  errs.length = 0

  // 盘面行星坐标
  const targets = await page.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('svg [data-name]')) {
      const nm = el.getAttribute('data-name')
      if (!nm || out.some((o) => o.nm === nm)) continue
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) out.push({ nm, ring: el.getAttribute('data-ring'), x: r.x + r.width / 2, y: r.y + r.height / 2 })
    }
    return out
  })
  if (!targets.length) { console.log(`[${label}] ❌ 盘面无行星节点`); continue }

  const bad = []
  for (const c of targets) {
    // SVG <g> 只在有笔画的像素上命中 (符号 fill="none" 是空心描边), 鼠标坐标点击会穿透 → 直接派发冒泡 click
    await page.evaluate((nm) => {
      const el = [...document.querySelectorAll('svg [data-name]')].find((x) => x.getAttribute('data-name') === nm)
      el?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }, c.nm)
    await new Promise((r) => setTimeout(r, 400))
    const after = await page.evaluate(() => {
      const d = document.querySelector('[data-planet-detail]')
      if (!d) return { found: false }
      const r = d.getBoundingClientRect()
      return { found: true, key: d.getAttribute('data-planet-detail'), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left), inView: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth }
    })
    if (!after.found || !after.inView || after.key !== c.nm) bad.push(`${c.nm}(ring=${c.ring})→${after.found ? `key=${after.key} 可见=${after.inView}` : '无'}`)
    // 关掉弹窗, 保证下一颗是"从零开始点"
    await page.evaluate(() => { document.querySelector('[data-planet-detail] button')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })) }).catch(() => {})
    await new Promise((r) => setTimeout(r, 150))
  }
  console.log(`[${label}] ${targets.length} 颗星 → ${targets.length - bad.length} 通过${bad.length ? ` ❌ 失败: ${bad.join(' | ')}` : ' ✅'}${errs.length ? ' err:' + errs.slice(0, 1) : ''}`)
  if (bad.length && HEADFUL) await page.screenshot({ path: `D:/网站/塔罗/tarot-site/scripts/_dynpop_${dp || 'natal'}.png` })
}
await b.close()
console.log('DONE')
