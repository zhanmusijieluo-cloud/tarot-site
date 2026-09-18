// 验证错误边界: 脚本自己写一个"故意抛错"的临时路由 → 跑验证 → 跑完删掉。
// 这样探针路由永远不会进仓库/进生产, 但验证可随时重跑。
// 用法: node scripts/_boundary_verify.mjs [baseUrl]   (需先起 dev server)
import puppeteer from 'puppeteer-core'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const CHROME = 'C:/Users/99192/AppData/Local/Google/Chrome/Application/chrome.exe'
const BASE = (process.argv[2] || 'http://localhost:3021').replace(/\/$/, '')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- 建探针路由 ----------
// ⚠️ 目录名不能以 '_' 开头 —— Next 会把 _ 前缀目录当私有目录, 不生成路由。
const PROBE_DIR = resolve(process.cwd(), 'src/app/boom-probe')
const PROBE_FILE = resolve(PROBE_DIR, 'page.tsx')
const PROBE_SRC = `'use client';

// ⚠️ 本文件由 scripts/_boundary_verify.mjs 临时生成, 跑完自动删除。请勿提交。
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ChartBoundary from '@/components/astro/ChartBoundary';

function Boom(): never {
  throw new Error('__boundary_probe__');
}

function Inner() {
  const mode = useSearchParams().get('mode') ?? 'route';
  if (mode === 'route') return <Boom />;
  return (
    <div>
      <p id="sibling-alive">SIBLING_ALIVE</p>
      <ChartBoundary resetKey="probe" label="这张盘没能画出来">
        <Boom />
      </ChartBoundary>
    </div>
  );
}

export default function BoomPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
`
const cleanup = () => { try { rmSync(PROBE_DIR, { recursive: true, force: true }) } catch { /* 忽略 */ } }
process.on('exit', cleanup)
process.on('SIGINT', () => { cleanup(); process.exit(130) })

mkdirSync(PROBE_DIR, { recursive: true })
writeFileSync(PROBE_FILE, PROBE_SRC, 'utf8')
console.log('已生成探针路由 /boom-probe (跑完自动删除)')

let pass = 0, fail = 0
const ok = (b, label, extra = '') => { b ? pass++ : fail++; console.log(`${b ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`) }

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--no-proxy-server'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.evaluate(() => localStorage.setItem('oracle-lang', 'zh'))

// 首次访问要等 Turbopack 现编译新路由, 给足时间
await page.goto(BASE + '/boom-probe?mode=local', { waitUntil: 'domcontentloaded', timeout: 90000 })
await sleep(6000)

// ---- 1. 路由级 error.tsx ----
console.log('\n— 1. 路由级 error.tsx (页面组件抛错) —')
await page.goto(BASE + '/boom-probe?mode=route', { waitUntil: 'domcontentloaded', timeout: 60000 })
await sleep(2500)
const routeState = await page.evaluate(() => ({
  text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200),
  blank: document.body.innerText.trim().length < 5,
  hasRetry: [...document.querySelectorAll('button')].some((b) => /重新加载|Reload/.test(b.textContent || '')),
  hasHome: !!document.querySelector('a[href="/"]'),
}))
ok(!routeState.blank, '不是白屏')
ok(/页面出了点问题/.test(routeState.text), '显示错误卡片文案', routeState.text.slice(0, 60))
ok(routeState.hasRetry, '有「重新加载」按钮')
ok(routeState.hasHome, '有「回首页」链接')
// 自报错: 页面必须把真实报错显示出来 (否则线上出问题只能靠猜)
ok(/__boundary_probe__/.test(routeState.text), '错误页显示真实报错内容', routeState.text.match(/\[route\][^ ]*[^\n]*/)?.[0]?.slice(0, 90) ?? '')

// ---- 2. 组件级 ChartBoundary ----
console.log('\n— 2. 组件级 ChartBoundary (仅子组件抛错) —')
await page.goto(BASE + '/boom-probe?mode=local', { waitUntil: 'domcontentloaded', timeout: 60000 })
await sleep(2500)
const localState = await page.evaluate(() => ({
  siblingAlive: !!document.querySelector('#sibling-alive'),
  boundaryText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200),
}))
ok(localState.siblingAlive, '崩掉的组件被隔离: 同级内容仍然存在')
ok(/这张盘没能画出来/.test(localState.boundaryText), '显示局部降级卡片', localState.boundaryText.slice(0, 60))

// ---- 3. 真盘页不受影响 ----
console.log('\n— 3. 回归: 真盘页仍正常 —')
const errs = []
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)))
await page.goto(BASE + '/astrology/chart?y=1995&mo=1&d=1&h=12&mi=0&lat=39.9&lng=116.41&tz=8', { waitUntil: 'domcontentloaded', timeout: 60000 })
await sleep(3500)
const realOk = await page.evaluate(() => document.querySelectorAll('g[data-ring][data-name]').length > 0)
ok(realOk && errs.length === 0, '星盘页正常渲染', `行星组数>0 err=${errs.length}`)

console.log(`\n=== 结果: ${pass} 通过 / ${fail} 失败 ===\n`)
await browser.close()
cleanup()
console.log('探针路由已删除:', !existsSync(PROBE_DIR))
process.exit(fail > 0 ? 1 : 0)
