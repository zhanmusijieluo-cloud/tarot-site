// 双环真鼠标命中: 内环(r=256)/外环(r=300) 相距 44px, 命中垫 r=13.5 会不会串环?
// 判据: 点内环 X → 弹窗 key 必须是 X·in; 点外环 X → 必须是 X·out (不能张冠李戴)
// 用法: node scripts/_repro_dual_hit.mjs [--base=...] [--dp=s]
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const args = process.argv.slice(2)
const argOf = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const BASE = argOf('base', 'http://localhost:3000')
const DP = argOf('dp', 's')
const BIRTH = 'y=1995&mo=6&d=15&h=14&mi=30&tz=8&lat=39.9042&lng=116.4074&city=%E5%8C%97%E4%BA%AC'

const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 940 })
await page.goto(`${BASE}/astrology/chart?${BIRTH}&dp=${DP}&dpy=2026&dpm=9&dpd=18`, { waitUntil: 'domcontentloaded', timeout: 90000 })
await new Promise((r) => setTimeout(r, 5000))

// 切双环 (英文站默认 en; 中文站是「双环」)
const switched = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((x) => ['Dual', '双环', 'デュアル'].includes((x.textContent || '').trim()))
  if (!btn) return false
  btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  return true
})
console.log('切双环:', switched ? 'OK' : '❌ 按钮没找到')
await new Promise((r) => setTimeout(r, 1800))

// 取内外环同名星 (Sun 必定两环都有)
const centers = await page.evaluate(() => {
  const out = []
  for (const ring of ['in', 'out']) {
    const g = document.querySelector(`g[data-ring="${ring}"][data-name="Sun"]`)
    if (!g) continue
    const tg = [...g.querySelectorAll('g[transform]')].find((x) => /translate\(/.test(x.getAttribute('transform')))
    if (!tg) continue
    const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(tg.getAttribute('transform'))
    const own = g.ownerSVGElement
    const pt = own.createSVGPoint(); pt.x = +m[1]; pt.y = +m[2]
    const sp = pt.matrixTransform(own.getScreenCTM())
    out.push({ ring, x: sp.x, y: sp.y })
  }
  return out
})
if (centers.length < 2) { console.log('❌ 双环未渲染出内外两枚 Sun:', JSON.stringify(centers)); await b.close(); process.exit(1) }
const gap = Math.hypot(centers[0].x - centers[1].x, centers[0].y - centers[1].y)
console.log(`内外环 Sun 屏幕距离 ${gap.toFixed(1)}px`)

let pass = 0, fail = 0
for (const c of centers) {
  const hit = await page.evaluate(([x, y, ring]) => {
    const el = document.elementFromPoint(x, y)
    const owner = el?.closest('svg [data-name]')
    return { ring: owner?.getAttribute('data-ring') ?? null, name: owner?.getAttribute('data-name') ?? null }
  }, [c.x, c.y, c.ring])
  await page.mouse.click(c.x, c.y)
  await new Promise((r) => setTimeout(r, 500))
  const got = await page.evaluate(() => document.querySelector('[data-planet-detail]')?.getAttribute('data-planet-detail') ?? null)
  const want = `Sun·${c.ring}`
  const ok = got === want && hit.ring === c.ring
  ok ? pass++ : fail++
  console.log(`  ${ok ? '✅' : '❌'} 点 ${c.ring} 环 Sun → 命中环=${hit.ring ?? '空'} 弹窗=${got ?? '无'} (期望 ${want})`)
  await page.evaluate(() => { document.querySelector('[data-planet-detail] button')?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
  await new Promise((r) => setTimeout(r, 200))
}
console.log(`===== ${pass} pass / ${fail} fail =====`)
await b.close()
process.exit(fail ? 1 : 0)
