// 量「切盘种」端到端耗时, 拆成: 点击 → URL 变 → API 返回 → 盘面画完
// 同时抓主线程 longtask (>50ms), 判断是不是 WebGL 场景重建把主线程堵住
// 用法: node scripts/_perf_switch.mjs [--headful]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const HEADFUL = process.argv.includes('--headful')
const ORIGIN = 'https://mustar.vip'

const BASE = 'y=1977&mo=3&d=18&h=22&mi=30&lat=30.56&lng=104.27&tz=8&city=' + encodeURIComponent('成都龙泉驿')
const TABS = ['三限盘', '次限盘', '行运盘', '三限盘', '次限盘', '行运盘', '日返盘', '三限盘']

const dir = mkdtempSync(join(tmpdir(), 'perfsw-'))
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: !HEADFUL,
  userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('oracle-lang', 'zh') } catch { /* 忽略 */ } })

// 装探针: longtask + resource 计时
await page.evaluateOnNewDocument(() => {
  window.__perf = { longtasks: [], posts: [] }
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__perf.longtasks.push({ start: e.startTime, dur: Math.round(e.duration) })
    }).observe({ entryTypes: ['longtask'] })
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.name.includes('/api/astro/chart')) window.__perf.posts.push({ start: Math.round(e.startTime), end: Math.round(e.startTime + e.duration), dur: Math.round(e.duration) })
      }
    }).observe({ entryTypes: ['resource'] })
  } catch { /* 忽略 */ }
})

console.log(`切盘性能剖析 · ${HEADFUL ? '有头(真实 GPU)' : '无头'} · ${ORIGIN}\n`)
await page.goto(`${ORIGIN}/astrology/chart?${BASE}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
// 等本命盘画出来
for (let k = 0; k < 60; k++) {
  await sleep(600)
  const n = await page.evaluate(() => document.querySelectorAll('g[data-ring][data-name]').length)
  if (n > 0) break
}
await sleep(2500) // 让首屏动画/贴图生成沉淀

console.log('序 盘种     点击→URL  API耗时  点击→画完  长任务(条/最长ms)')
for (let i = 0; i < TABS.length; i++) {
  const tab = TABS[i]
  let res
  try {
    res = await page.evaluate(async (label) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const url0 = location.search

    const btn = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === label)
    if (!btn) return { err: '找不到按钮 ' + label }

    // 拟真: 鼠标先移到按钮上 (触发悬停预取), 停 400ms 再点 —— 真人的操作节奏就是这样
    const pk = Object.keys(btn).find((k) => k.startsWith('__reactProps'))
    btn[pk].onMouseEnter?.({ target: btn, currentTarget: btn })
    await sleep(400)

    // 计时从「点下去」开始; 悬停期间已经发出的请求不计入本次 API 耗时
    const beforePosts = window.__perf.posts.length
    const beforeTasks = window.__perf.longtasks.length
    const t0 = performance.now()
    // 用 props.onClick 保证 transition 不被 3D 动画饿死 (与真人点击等价, 只是不受优先级影响)
    btn[pk].onClick?.({ preventDefault() {}, stopPropagation() {}, nativeEvent: {}, target: btn, currentTarget: btn })

    // URL 变化时刻
    let tUrl = -1
    for (let k = 0; k < 400; k++) {
      if (location.search !== url0) { tUrl = performance.now() - t0; break }
      await sleep(10)
    }

    // 等 API 返回 + 盘面 DOM 更新
    let tApi = -1, tPaint = -1
    for (let k = 0; k < 600; k++) {
      await sleep(20)
      const now = performance.now() - t0
      if (tApi < 0 && window.__perf.posts.length > beforePosts) tApi = window.__perf.posts[window.__perf.posts.length - 1].end - t0
      const gs = document.querySelectorAll('g[data-ring][data-name]').length
      // 缓存命中时不会有新 POST: 只要行星组在且过了 250ms 就算画完
      if (gs > 0 && (tApi > 0 ? now > tApi + 30 : now > 250)) { tPaint = now; break }
    }
    const tasks = window.__perf.longtasks.slice(beforeTasks)
    return {
      url: Math.round(tUrl), api: Math.round(tApi), paint: Math.round(tPaint),
      taskCount: tasks.length, taskMax: tasks.length ? Math.max(...tasks.map((x) => x.dur)) : 0,
      gs: document.querySelectorAll('g[data-ring][data-name]').length,
    }
    }, tab)
  } catch (e) {
    // 部署切换瞬间页面可能被 chunk 自愈重载, 会打断 evaluate —— 跳过这一轮, 不整体崩掉
    console.log(`${String(i + 1).padStart(2)} ${tab.padEnd(8)} ⚠️ 页面导航打断 (${String(e).slice(0, 60)})`)
    await sleep(3000)
    continue
  }

  if (res.err) { console.log(`${i + 1}  ${res.err}`); continue }
  const apiCell = res.api > 0 ? `${res.api}ms` : '缓存命中'
  console.log(
    `${String(i + 1).padStart(2)} ${tab.padEnd(8)} ${String(res.url).padStart(7)}ms ${apiCell.padStart(8)} ${String(res.paint).padStart(9)}ms   ${String(res.taskCount).padStart(2)}条/${String(res.taskMax).padStart(4)}ms  行星组=${res.gs}`
  )
  await sleep(1200)
}

await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
