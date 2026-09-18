// 找出页面上「贵」的 CSS: 全屏 backdrop-filter / filter:blur / 常驻 CSS animation / 大面积渐变
// 判据: 元素面积 × 效果类型 (backdrop-filter 会强制每帧重采样背后内容, 最贵)
// 用法: node scripts/_audit_expensive_css.mjs [--path=/about] [--headful]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const PAGE = argOf('path', '/about')

const dir = mkdtempSync(join(tmpdir(), 'cssaudit-'))
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: !process.argv.includes('--headful'), userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('https://mustar.vip' + PAGE, { waitUntil: 'domcontentloaded', timeout: 90000 })
await sleep(10000)

const res = await page.evaluate(() => {
  const vw = innerWidth, vh = innerHeight, screenArea = vw * vh
  const hits = []
  const running = []
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const area = Math.max(0, r.width) * Math.max(0, r.height)
    const tag = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')
    const bf = cs.backdropFilter && cs.backdropFilter !== 'none' ? cs.backdropFilter : null
    const fi = cs.filter && cs.filter !== 'none' ? cs.filter : null
    const anim = cs.animationName && cs.animationName !== 'none' ? `${cs.animationName} ${cs.animationDuration} ${cs.animationIterationCount}` : null
    if (bf || fi || anim) hits.push({ tag, area: Math.round(area), pct: +(area / screenArea * 100).toFixed(1), bf, fi, anim, pos: cs.position })
    if (anim && area > 0) running.push({ tag, anim, pct: +(area / screenArea * 100).toFixed(1) })
  }
  hits.sort((a, b) => b.area - a.area)
  const canvases = [...document.querySelectorAll('canvas')].map((c) => {
    const r = c.getBoundingClientRect()
    return { cls: c.className, w: c.width, h: c.height, cssW: Math.round(r.width), cssH: Math.round(r.height), dpr: devicePixelRatio }
  })
  return { screenArea, total: hits.length, top: hits.slice(0, 14), runningCount: running.length, canvases }
})

console.log(`页面 ${PAGE} · 视口 1440x900 · 含 backdrop-filter / filter / animation 的元素共 ${res.total} 个\n`)
console.log('  面积占比  元素                                      backdrop-filter / filter / animation')
for (const h of res.top) {
  const eff = [h.bf && `backdrop:${h.bf}`, h.fi && `filter:${h.fi}`, h.anim && `anim:${h.anim}`].filter(Boolean).join(' | ')
  console.log(`  ${String(h.pct).padStart(6)}%  ${h.tag.slice(0, 40).padEnd(41)} ${eff.slice(0, 60)}`)
}
console.log(`\n  常驻 CSS 动画元素: ${res.runningCount} 个`)
console.log(`  canvas: ${JSON.stringify(res.canvases)}`)
await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
