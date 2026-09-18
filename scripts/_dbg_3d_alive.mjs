// 确认测试环境里 3D 盘有没有真的起来 (glFail 降级的话, 之前所有"3D 重建"的推理都不成立)
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const HEADFUL = process.argv.includes('--headful')
const dir = mkdtempSync(join(tmpdir(), 'dbg3d-'))
const b = await puppeteer.launch({
  executablePath: 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe',
  headless: !HEADFUL, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.evaluateOnNewDocument(() => { try { localStorage.setItem('oracle-lang', 'zh') } catch {} })
await p.goto('https://mustar.vip/astrology/chart?y=1977&mo=3&d=18&h=22&mi=30&lat=30.56&lng=104.27&tz=8', { waitUntil: 'domcontentloaded', timeout: 90000 })
await sleep(14000)
const r = await p.evaluate(() => {
  const cvs = [...document.querySelectorAll('canvas')]
  const probe = (c) => { try { return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false } }
  return {
    canvases: cvs.length,
    sizes: cvs.map((c) => `${c.width}x${c.height}`),
    isWebGL: cvs.map(probe),
    glFailText: document.body.innerText.includes('3D 视图暂时不可用'),
    svgPlanets: document.querySelectorAll('g[data-ring][data-name]').length,
    has3dHint: !!document.querySelector('[class*="cursor-grab"]'),
    webglSupported: (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false } })(),
  }
})
console.log(JSON.stringify(r, null, 1))
await b.close()
rmSync(dir, { recursive: true, force: true })
