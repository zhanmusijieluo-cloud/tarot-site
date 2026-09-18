// 木木的真实路径 (首次访问): 打开首页(3D卡片环占 WebGL) → 软导航进 /astrology → 点「排占星盘」
//   → chart 页 → 逐个切盘种(三限/次限/行运/日返/月返/日弧) → 看盘面级边界是否兜住。
// 直连 chart URL 是服务端渲染, 完全测不出这条路 (2026-09-18 反复栽在这里)。
// 用法: node scripts/_repro_first_visit_dyn.mjs [轮数] [--headful]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ROUNDS = Number(process.argv.find((a) => /^\d+$/.test(a)) || 3)
const HEADFUL = process.argv.includes('--headful')
const ORIGIN = 'https://mustar.vip'

// 盘种条上的中文标签 → 点击后 URL 里的 dp 值
const TABS = ['三限盘', '次限盘', '行运盘', '日返盘', '月返盘', '日弧盘']

const dir = mkdtempSync(join(tmpdir(), 'firstvisit-'))
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: !HEADFUL,
  userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1280,900'],
})
console.log(`首次访问路径复现 · ${ROUNDS} 轮 · ${HEADFUL ? '有头(真实 GPU)' : '无头'}\n`)

const probe = () => {
  const txt = document.body.innerText
  return {
    url: location.pathname + location.search.slice(0, 70),
    boundary: txt.includes('没能画出来'),
    errPage: txt.includes('页面出了点问题'),
    msgLine: (document.querySelector('.font-mono')?.textContent || '').trim().slice(0, 260),
    planetGs: document.querySelectorAll('g[data-ring][data-name]').length,
    canvases: document.querySelectorAll('canvas').length,
  }
}

let bad = 0
for (let i = 1; i <= ROUNDS; i++) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  const errs = []
  page.on('pageerror', (e) => errs.push(`${e.name}: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 320)) })

  console.log(`── 第 ${i} 轮 ──`)
  try {
    // 1. 首页 (3D 卡片环启动 WebGL)
    // ⚠️ 语言必须在导航前写: hydrate 时 i18n 会读 localStorage 决定文案,
    //    写晚了卡片标题就变中文, 按 'Astrology' 找按钮会一直点空。
    await page.evaluateOnNewDocument(() => { try { localStorage.setItem('oracle-lang', 'zh') } catch { /* 忽略 */ } })
    await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: 90000 })
    // 等首页真正 hydrate (线上 CDN 冷启动可达 12s; 太早点按钮会点空)
    let homeReady = false
    for (let k = 0; k < 30; k++) {
      await sleep(800)
      homeReady = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => {
          const t = (x.textContent || '').trim()
          return t.startsWith('Astrology') || t.startsWith('星盘')
        })
        return !!(b && Object.keys(b).some((k) => k.startsWith('__reactProps')))
      })
      if (homeReady) break
    }
    const homeCanvas = await page.evaluate(() => document.querySelectorAll('canvas').length)
    console.log(`   首页 canvas=${homeCanvas} hydrated=${homeReady}`)

    // 2. 首页 → 星盘 (软导航; 首页导航是 button 不是 <a>)
    // ⚠️ 坑: 这个 onClick 里是 router.push → React transition, 会被首页常驻的 R3F 动画饿住,
    //    dispatchEvent / 真实 .click() 都可能迟迟不生效。直接调 React props.onClick 才稳
    //    (仍然走客户端软导航, 不是整页跳转 —— 这正是我们要复现的条件)。
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => {
        const t = (x.textContent || '').trim()
        return t.startsWith('Astrology') || t.startsWith('星盘')
      })
      if (!b) return
      b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    await sleep(2500)
    if (!page.url().includes('/astrology')) {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => {
          const t = (x.textContent || '').trim()
          return t.startsWith('Astrology') || t.startsWith('星盘')
        })
        const pk = b && Object.keys(b).find((k) => k.startsWith('__reactProps'))
        if (b && pk) b[pk].onClick?.({ preventDefault() {}, stopPropagation() {}, nativeEvent: {}, target: b, currentTarget: b })
      })
    }
    let landed = false
    for (let k = 0; k < 40; k++) { await sleep(700); if (page.url().includes('/astrology')) { landed = true; break } }
    if (!landed) { console.log(`   ⚠️ 未落到 /astrology (停在 ${page.url().slice(0, 60)})`) }
    console.log(`   落到 ${page.url().replace(ORIGIN, '').slice(0, 60)}`)

    // 3. 点「排 占 星 盘」(客户端软导航进 chart 页)
    let ready = false
    for (let k = 0; k < 45; k++) {
      await sleep(700)
      ready = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').replace(/\s/g, '').includes('排占星盘')))
      if (ready) break
    }
    if (!ready) { console.log('   ⚠️ 表单未就绪'); await page.close(); continue }
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').replace(/\s/g, '').includes('排占星盘'))
      b?.click()
    })
    let st = null
    for (let k = 0; k < 50; k++) { await sleep(700); st = await page.evaluate(probe); if (st.errPage || st.boundary || st.planetGs > 0) break }
    console.log(`   本命: 卡=${st?.boundary} 页=${st?.errPage} 行星组=${st?.planetGs}`)
    if (st?.msgLine) console.log(`        卡上报错: ${st.msgLine}`)

    // 4. 逐个切盘种 (每次点击都改 URL → 重新请求 → 重渲染)
    for (const tab of TABS) {
      const clicked = await page.evaluate((label) => {
        const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === label)
        if (!b) return false
        b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
        return true
      }, tab)
      if (!clicked) { console.log(`   ${tab}: ⚠️ 找不到按钮`); continue }
      let s2 = null
      for (let k = 0; k < 40; k++) {
        await sleep(700)
        s2 = await page.evaluate(probe)
        if (s2.errPage || s2.boundary || s2.planetGs > 0) break
      }
      const ok = !s2.boundary && !s2.errPage && s2.planetGs > 0
      if (!ok) bad++
      console.log(`   ${ok ? '✅' : '❌'} ${tab}: 卡=${s2.boundary} 页=${s2.errPage} 行星组=${s2.planetGs} canvas=${s2.canvases} url=${s2.url}`)
      if (s2.msgLine) console.log(`        卡上报错: ${s2.msgLine}`)
    }
    if (errs.length) console.log(`   console 错误 ${errs.length} 条:\n     ${errs.slice(0, 5).join('\n     ')}`)
  } catch (e) {
    console.log(`   ⚠️ 脚本异常: ${String(e).slice(0, 200)}`)
    bad++
  }
  await page.close()
}

console.log(`\n结果: 异常 ${bad} 处`)
await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
