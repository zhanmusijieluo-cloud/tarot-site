// 真实鼠标命中测试: 行星符号是 fill="none" 空心描边, 点"符号中心"会不会穿透?
// 对每颗星: 取符号 <g transform> 的 translate(cx,cy) 作为视觉中心 → elementFromPoint + 真鼠标点击
// 用法: node scripts/_repro_dyn_hit.mjs [--base=...] [--dp=tr]
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const args = process.argv.slice(2)
const argOf = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const BASE = argOf('base', 'https://mustar.vip')
const DP = argOf('dp', 'tr')
const BIRTH = 'y=1995&mo=1&d=1&h=12&mi=0&tz=8&lat=39.9042&lng=116.4074&city=%E5%8C%97%E4%BA%AC'

const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto(`${BASE}/astrology/chart?${BIRTH}&dp=${DP}&dpy=2026&dpm=9&dpd=18`, { waitUntil: 'domcontentloaded', timeout: 90000 })
await new Promise((r) => setTimeout(r, 5000))

// 取每颗星符号的视觉中心 (GlyphPath 的 <g transform="translate(cx,cy) scale(s) ..."> 里的 cx,cy)
const centers = await page.evaluate(() => {
  const out = []
  for (const g of document.querySelectorAll('svg [data-name]')) {
    const nm = g.getAttribute('data-name')
    if (out.some((o) => o.nm === nm)) continue
    const tg = [...g.querySelectorAll('g[transform]')].find((x) => /translate\(/.test(x.getAttribute('transform')))
    if (!tg) continue
    const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(tg.getAttribute('transform'))
    if (!m) continue
    const own = g.ownerSVGElement
    const pt = own.createSVGPoint(); pt.x = +m[1]; pt.y = +m[2]
    const sp = pt.matrixTransform(own.getScreenCTM())
    out.push({ nm, x: sp.x, y: sp.y })
  }
  return out
})

console.log(`盘种 dp=${DP} · ${centers.length} 颗星 — 点「符号几何中心」`)
for (const c of centers) {
  const hit = await page.evaluate(([x, y, nm]) => {
    const el = document.elementFromPoint(x, y)
    const owner = el?.closest('svg [data-name]')
    return { tag: el?.tagName, owner: owner?.getAttribute('data-name') ?? null, isMine: owner?.getAttribute('data-name') === nm }
  }, [c.x, c.y, c.nm])
  await page.mouse.click(c.x, c.y)
  await new Promise((r) => setTimeout(r, 350))
  const pop = await page.evaluate(() => {
    const d = document.querySelector('[data-planet-detail]')
    return d ? d.getAttribute('data-planet-detail') : null
  })
  const ok = pop === c.nm
  console.log(`  ${ok ? '✅' : '❌'} ${c.nm.padEnd(9)} 中心命中=${hit.isMine ? '符号' : hit.owner ? '别的星(' + hit.owner + ')' : '空(' + hit.tag + ')'} → 弹窗=${pop ?? '无'}`)
  await page.evaluate(() => { document.querySelector('[data-planet-detail] button')?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
  await new Promise((r) => setTimeout(r, 120))
}
await b.close()
console.log('DONE')
