// 品牌 logo 动画变体基准: 拆出「mask / r 形变 / 旋转」各自的主线程成本, 并试 CSS 动画替代方案
// 全部渲染在同一张空白页上, 同一尺寸 (h-10 → 40px 高), 逐个变体单独显示后测主线程占用
// 用法: node scripts/_bench_logo_variants.mjs [--sec=3]
import puppeteer from 'puppeteer-core'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const SEC = Number(argOf('sec', '3'))

// 与 Navbar.tsx 第 77-119 行逐字对应
const RAYS = `<g fill="currentColor">
<path d="M 475 410 L 475 418 L 414 438 Z" /><path d="M 729 410 L 729 418 L 789 438 Z" />
<path d="M 503 453 L 514 464 L 397 570 Z" /><path d="M 691 464 L 702 453 L 809 570 Z" />
<path d="M 547 486 L 559 490 L 522 566 Z" /><path d="M 647 490 L 659 486 L 683 566 Z" />
<path d="M 598 495 L 614 495 L 606 760 Z" /></g>`

const R_ANIM = `<animate attributeName="r" values="74;74;0;0;74" keyTimes="0;0.15;0.5;0.75;1" dur="6s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1" />`
const ROT_ANIM = `<animateTransform attributeName="transform" type="rotate" values="0 603 374;540 603 374;1080 603 374" keyTimes="0;0.55;1" dur="6s" repeatCount="indefinite" calcMode="spline" keySplines="0.55 0.06 0.3 1;0.55 0.06 0.3 1" />`

const svg = ({ maskR, rot, mask = true, id }) => `
<svg viewBox="0 0 1200 852" class="h-10 w-auto" aria-hidden="true" style="color:#d9a8b8">
  ${mask ? `<defs><mask id="${id}"><rect width="1200" height="852" fill="white" /><circle cx="625" cy="348" r="74" fill="black">${maskR}</circle></mask></defs>` : ''}
  <circle cx="603" cy="374" r="96" fill="currentColor" ${mask ? `mask="url(#${id})"` : ''} class="${rot === 'css' ? 'spin' : ''}">${rot === 'smil' ? ROT_ANIM : ''}</circle>
  ${RAYS}
</svg>`

const V = {
  v0_现状_mask加r加旋转: svg({ maskR: R_ANIM, rot: 'smil', id: 'm0' }),
  v1_无mask_只旋转: svg({ maskR: '', rot: 'smil', mask: false, id: 'm1' }),
  v2_有mask_r静止_只旋转: svg({ maskR: '', rot: 'smil', id: 'm2' }),
  v3_全静止_对照: svg({ maskR: '', rot: 'none', id: 'm3' }),
  v4_CSS旋转_加SMIL的r: svg({ maskR: R_ANIM, rot: 'css', id: 'm4' }),
  v5_CSS旋转_CSS的r: svg({ maskR: '', rot: 'css', id: 'm5' }).replace('<circle cx="625" cy="348" r="74" fill="black"></circle>', '<circle cx="625" cy="348" r="74" fill="black" class="morph"></circle>'),
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;height:100%;background:#09080a}
  #box{position:fixed;left:40px;top:40px}
  @keyframes spin{from{transform:rotate(0deg)}50%{transform:rotate(540deg)}to{transform:rotate(1080deg)}}
  .spin{animation:spin 6s cubic-bezier(.55,.06,.3,1) infinite;transform-box:view-box;transform-origin:603px 374px}
  @keyframes morph{0%{r:74px;animation-timing-function:cubic-bezier(.4,0,.2,1)}15%{r:74px;animation-timing-function:cubic-bezier(.4,0,.2,1)}50%{r:0px;animation-timing-function:cubic-bezier(.4,0,.2,1)}75%{r:0px;animation-timing-function:cubic-bezier(.4,0,.2,1)}100%{r:74px}}
  .morph{animation:morph 6s infinite}
</style></head><body><div id="box"></div>
<script>
  window.V = ${JSON.stringify(V)};
  window.show = (k) => { document.getElementById('box').innerHTML = window.V[k] || '' };
  window.show('');
</script></body></html>`

const dir = mkdtempSync(join(tmpdir(), 'logobench-'))
const file = join(dir, 'logo.html')
writeFileSync(file, html, 'utf8')

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, userDataDir: dir,
  args: ['--no-sandbox', '--no-proxy-server', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('file:///' + file.replace(/\\/g, '/'), { waitUntil: 'domcontentloaded' })
const cdp = await page.createCDPSession()
await cdp.send('Performance.enable')
const read = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))

const measure = async () => {
  const a = await read()
  await sleep(SEC * 1000)
  const b = await read()
  return { task: (b.TaskDuration - a.TaskDuration) * 1000 / (SEC * 1000) * 100, script: (b.ScriptDuration - a.ScriptDuration) * 1000 / (SEC * 1000) * 100 }
}

// 先测空页底噪
await page.evaluate(() => window.show(''))
await sleep(1500)
const noise = await measure()
console.log(`空白页底噪: 主线程 ${noise.task.toFixed(2)}% · 脚本 ${noise.script.toFixed(2)}%\n`)

const names = Object.keys(V)
const acc = Object.fromEntries(names.map((n) => [n, []]))
for (let round = 0; round < 2; round++) {
  for (const n of names) {
    await page.evaluate((k) => window.show(k), n)
    await sleep(1200)
    acc[n].push(await measure())
  }
}
console.log('变体 (40px 高, 与导航栏同尺寸) — 两轮均值\n')
for (const n of names) {
  const t = acc[n].reduce((a, b) => a + b.task, 0) / acc[n].length
  const s = acc[n].reduce((a, b) => a + b.script, 0) / acc[n].length
  console.log(`  ${n.padEnd(30)} 主线程 ${t.toFixed(2).padStart(6)}%  (扣底噪 ${(t - noise.task).toFixed(2).padStart(6)}%) · 脚本 ${s.toFixed(2)}%`)
}
await browser.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略 */ }
