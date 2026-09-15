// 线上 mustar.vip 合盘页探测: 看线上版本显示什么
import puppeteer from 'puppeteer-core'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const ARCH_KEY = 'astro-archives-v1'
const archive = { id: 'test-laosh', label: '老姐', birth: { year: 1993, month: 5, day: 29, hour: 9, minute: 50, timezone: 8, latitude: 31.028, longitude: 106.413, city: '蓬安县', timeKnown: true }, note: '', contact: '', savedAt: Date.now() }
const URL_SYN = 'https://mustar.vip/astrology/chart?y=1998&mo=2&d=19&h=9&mi=45&tz=8&lat=31.028&lng=106.413&city=%E8%93%AC%E5%AE%89%E5%8E%BF&sync=test-laosh&stab=compS'

const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 1000 })
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 160)))
await page.goto('https://mustar.vip/', { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.evaluate((k, a) => { localStorage.setItem(k, JSON.stringify([a])); localStorage.setItem('oracle-lang', 'zh') }, ARCH_KEY, archive)
await page.goto(URL_SYN, { waitUntil: 'networkidle0', timeout: 90000 }).catch((e) => console.log('goto err:', String(e).slice(0, 100)))
await new Promise((r) => setTimeout(r, 9000))

const info = await page.evaluate(() => {
  const out = { url: location.href.slice(0, 120), title: document.title }
  out.hasSynBtn = [...document.querySelectorAll('button')].some((x) => /合盘|Synastry/.test(x.textContent))
  out.hasTabs = [...document.querySelectorAll('button')].filter((x) => /次限|三限|Secondary|Tertiary|组合|Composite/.test(x.textContent)).map((x) => x.textContent.trim().slice(0, 16))
  // 找带度数字样的文本 (asc 角标等)
  out.degTexts = [...document.querySelectorAll('text')].map((t) => t.textContent.trim()).filter((t) => /[\d]+°[\d′\"]*/.test(t)).slice(0, 16)
  // svg 结构
  out.svgInfo = [...document.querySelectorAll('svg')].map((s) => ({ vb: s.getAttribute('viewBox'), n: s.querySelectorAll('text').length }))
  out.err = [...document.querySelectorAll('p,div')].filter((e) => /failed|错误|失败|not found|404/.test(e.textContent || '')).slice(0, 3).map((e) => e.textContent.slice(0, 100))
  // 合盘档案弹窗? 
  out.bodySnippet = document.body.innerText.slice(0, 600).replace(/\n+/g, ' | ')
  return out
})
console.log(JSON.stringify(info, null, 1))
await b.close()
