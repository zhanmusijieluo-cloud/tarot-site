// 合盘页侦察: 打开 compS, dump 渲染结构
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const ARCH_KEY = 'astro-archives-v1'
const archive = {
  id: 'test-laosh',
  label: '老姐',
  birth: { year: 1993, month: 5, day: 29, hour: 9, minute: 50, timezone: 8, latitude: 31.028, longitude: 106.413, city: '蓬安县', timeKnown: true },
  note: '', contact: '', savedAt: Date.now(),
}
const URL_SYN = 'http://localhost:3000/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&city=%E8%93%AC%E5%AE%89%E5%8E%BF&sync=test-laosh&stab=compS'

const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 1000 })
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)))

// 1) 先开首页设 localStorage 档案
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.evaluate((k, a) => localStorage.setItem(k, JSON.stringify([a])), ARCH_KEY, archive)
// 2) 打开合盘 compS
await page.goto(URL_SYN, { waitUntil: 'networkidle0', timeout: 90000 })
await new Promise((r) => setTimeout(r, 8000))

const info = await page.evaluate(() => {
  const out = { url: location.href.slice(0, 200), title: document.title }
  out.svgs = [...document.querySelectorAll('svg')].map((s) => ({ cls: (s.getAttribute('class') || '').slice(0, 60), vb: s.getAttribute('viewBox'), w: Math.round(s.getBoundingClientRect().width), texts: s.querySelectorAll('text').length }))
  out.canvases = [...document.querySelectorAll('canvas')].map((c) => ({ w: c.getBoundingClientRect().width, h: c.getBoundingClientRect().height }))
  // 页面按钮文本（找盘种条）
  out.buttons = [...document.querySelectorAll('button')].map((x) => x.textContent.trim().slice(0, 14)).filter(Boolean).slice(0, 40)
  // 找包含 '次限' 字样的元素
  out.compSEl = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /次限|三限|组合/.test(e.textContent || '')).map((e) => e.textContent.trim().slice(0, 30)).slice(0, 12)
  // 错误提示
  out.err = [...document.querySelectorAll('p')].filter((e) => /failed|Error|错误|失败/.test(e.textContent || '')).map((e) => e.textContent.slice(0, 80)).slice(0, 6)
  return out
})
console.log(JSON.stringify(info, null, 1))
await b.close()
