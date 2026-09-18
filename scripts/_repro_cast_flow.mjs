// 复现木木的路径: 在 /astrology 表单页点「排 占 星 盘」→ 客户端软导航(router.push) → chart 页
// 之前所有测试都是 page.goto(chart URL) 直连(服务端渲染) —— 这条路从没测过!
// 用法: node scripts/_repro_cast_flow.mjs [轮数] [--headful] [--from-home]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ROUNDS = Number(process.argv.find((a) => /^\d+$/.test(a)) || 10)
const HEADFUL = process.argv.includes('--headful')
const FROM_HOME = process.argv.includes('--from-home')

const dir = mkdtempSync(join(tmpdir(), 'castflow-'))
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: !HEADFUL,
  userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1080,500'],
})

console.log(`模式: ${HEADFUL ? '有头(真实 GPU)' : '无头'} · ${ROUNDS} 轮 · 入口: ${FROM_HOME ? '首页→星盘' : '直达 /astrology'}\n`)

const CAST = '排占星盘'
let bad = 0

for (let i = 1; i <= ROUNDS; i++) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1080, height: 500 })
  const errs = [], failed = []
  page.on('pageerror', (e) => errs.push(`${e.name}: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 260)) })
  page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText || '?'} ${r.url().slice(0, 80)}`))
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`HTTP ${r.status()} ${r.url().slice(0, 80)}`) })

  try {
    await page.goto('https://mustar.vip/', { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))

    if (FROM_HOME) {
      // 首页 → 点「Astrology」卡片（首页导航是 button, 不是 <a> —— 之前用 a 选择器一直是空点）
      // ⚠️ 用 dispatchEvent 而不是 .click(): React 合成事件对 .click() 有时不响应
      const clicked = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim().startsWith('Astrology'))
        if (!b) return 'not-found'
        b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
        return 'dispatched'
      })
      // 等软导航真正落到 /astrology（固定 sleep 会漏, 线上 CDN 冷启动慢）
      let landed = false
      for (let k = 0; k < 40; k++) {
        await sleep(700)
        if (page.url().includes('/astrology')) { landed = true; break }
      }
      if (!landed) console.log(`  [诊断] 首页点击=${clicked} 但仍停在 ${page.url()}`)
    } else {
      await page.goto('https://mustar.vip/astrology', { waitUntil: 'domcontentloaded', timeout: 90000 })
    }

    // 等表单就绪 (排盘按钮出现)
    let ready = false
    for (let k = 0; k < 45; k++) {
      await sleep(700)
      ready = await page.evaluate((c) => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').replace(/\s/g, '').includes(c)), CAST)
      if (ready) break
    }
    if (!ready) {
      console.log(`#${String(i).padStart(2)} ⚠️ 表单未就绪 (url=${page.url().slice(0, 70)})`)
      await page.close(); continue
    }

    // 点「排 占 星 盘」
    await page.evaluate((c) => {
      const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').replace(/\s/g, '').includes(c))
      b?.click()
    }, CAST)

    // 等 chart 页渲染完成 / 或错误页
    let st = null
    for (let k = 0; k < 50; k++) {
      await sleep(700)
      st = await page.evaluate(() => ({
        path: location.pathname + location.search.slice(0, 60),
        errPage: document.body.innerText.includes('页面出了点问题'),
        boundary: document.body.innerText.includes('这张盘没能画出来'),
        msg: (document.querySelector('main p.font-mono')?.textContent || '').slice(0, 220),
        planetGs: document.querySelectorAll('g[data-ring][data-name]').length,
        buttons: document.querySelectorAll('button').length,
        canvases: document.querySelectorAll('canvas').length,
      }))
      if (st.errPage || st.boundary || st.planetGs > 0) break
    }

    const isBad = !st || st.errPage || st.boundary || st.planetGs === 0 || errs.length > 0
    if (isBad) bad++
    console.log(`${isBad ? '❌' : '✅'} #${String(i).padStart(2)} — 错误页=${st?.errPage} 盘面卡=${st?.boundary} 行星组=${st?.planetGs} canvas=${st?.canvases} 错误=${errs.length} 失败请求=${failed.length}`)
    if (st?.msg) console.log(`     报错摘要: ${st.msg}`)
    if (st?.path) console.log(`     落在: ${st.path}`)
    if (errs.length) console.log(`     ${errs.slice(0, 4).join('\n     ')}`)
    if (failed.length) console.log(`     请求: ${failed.slice(0, 4).join(' | ')}`)
  } catch (e) {
    bad++
    console.log(`#${String(i).padStart(2)} ⚠️ 脚本异常: ${String(e).slice(0, 160)}`)
  }
  await page.close()
}

console.log(`\n结果: ${ROUNDS - bad}/${ROUNDS} 正常${bad ? ` · ❌ ${bad} 轮异常` : ''}`)
await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
