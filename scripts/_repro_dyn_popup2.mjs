// 复现 v2: ① 真实路径(本命盘页 → 点盘种条「行运盘/三限盘」→ 点行星) ② 视口高度扫描
// 检查点: 弹窗是否存在 / 是否在视口内可见 / lg 断点是否生效
// 用法: node scripts/_repro_dyn_popup2.mjs [--base=...] [--headful]
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const args = process.argv.slice(2)
const argOf = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const BASE = argOf('base', 'http://localhost:3000')
const HEADFUL = args.includes('--headful')

const BIRTH = 'y=1995&mo=1&d=1&h=12&mi=0&tz=8&lat=39.9042&lng=116.4074&city=%E5%8C%97%E4%BA%AC'
const VIEWPORTS = [[1440, 900], [1280, 720], [1080, 515], [900, 700]]
const CHIPS = [['Transit', '行运盘', 'tr'], ['Tertiary', '三限盘', 't'], ['Secondary', '次限盘', 's'], ['Solar Return', '日返盘', 'sr'], ['Lunar Return', '月返盘', 'lr']]

const b = await puppeteer.launch({ executablePath: EDGE, headless: !HEADFUL, args: ['--no-sandbox'] })
const page = await b.newPage()
const errs = []
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
page.on('pageerror', (e) => errs.push('[pageerror] ' + String(e).slice(0, 160)))

const probe = () => page.evaluate(() => {
  const d = document.querySelector('[data-planet-detail]')
  const sel = document.querySelector('svg [data-name] circle')
  const info = { popup: false, selMark: !!sel, vw: innerWidth, vh: innerHeight, lgOn: matchMedia('(min-width:1024px)').matches }
  if (d) {
    const r = d.getBoundingClientRect()
    info.popup = true
    info.key = d.getAttribute('data-planet-detail')
    info.rect = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]
    info.fullyInView = r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth
    info.partlyInView = r.bottom > 0 && r.top < innerHeight
  }
  return info
})

const clickPlanet = (nm) => page.evaluate((n) => {
  const el = [...document.querySelectorAll('svg [data-name]')].find((x) => x.getAttribute('data-name') === n)
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  return !!el
}, nm)

for (const [w, h] of VIEWPORTS) {
  await page.setViewport({ width: w, height: h })
  for (const [chip, zh, dp] of CHIPS) {
    // —— 真实路径: 先开本命盘页, 再点盘种条 ——
    await page.goto(`${BASE}/astrology/chart?${BIRTH}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await new Promise((r) => setTimeout(r, 4000))
    const clicked = await page.evaluate((labels) => {
      const btn = [...document.querySelectorAll('button')].find((x) => labels.includes((x.textContent || '').trim()))
      if (!btn) return false
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      return true
    }, [chip, zh])
    if (!clicked) { console.log(`${w}x${h} [${chip}] ❌ 盘种条按钮没找到`); continue }
    await new Promise((r) => setTimeout(r, 4500))
    errs.length = 0
    await clickPlanet('Sun')
    await new Promise((r) => setTimeout(r, 700))
    const p = await probe()
    const verdict = p.popup ? (p.fullyInView ? '✅ 完整可见' : p.partlyInView ? '⚠️ 部分可见(被视口裁切)' : '❌ 在视口外') : '❌ 无弹窗'
    console.log(`${w}x${h} lg=${p.lgOn ? 'Y' : 'N'} [${chip}] 点Sun → ${verdict}${p.rect ? ` rect=${JSON.stringify(p.rect)}` : ''} 选中圈=${p.selMark}${errs.length ? ' err:' + errs[0] : ''}`)
    if (HEADFUL && verdict.startsWith('❌')) await page.screenshot({ path: `D:/网站/塔罗/tarot-site/scripts/_dynpop2_${dp}_${w}x${h}.png` })
  }
}
await b.close()
console.log('DONE')
