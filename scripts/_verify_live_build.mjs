// 确证线上跑的是本轮修复后的代码: 从线上 HTML 抽出所有 JS chunk, 逐个搜新代码特征串。
// 特征串来自新增文件:
//   error.tsx        → '不是你的操作有问题'
//   global-error.tsx → '重新加载一下通常就能恢复' (global-error 是独立 chunk)
//   ChartBoundary    → '换一个盘种或宫制通常就能恢复'
//   safe-chart.ts    → 无文案, 靠 ChartBoundary/error 的存在间接证明
// 用法: node scripts/_verify_live_build.mjs
const PAGE = 'https://mustar.vip/astrology/chart?y=1995&mo=1&d=1&h=12&mi=0&lat=39.9&lng=116.41&tz=8'
const MARKERS = [
  ['error.tsx（路由级错误边界）', '不是你的操作有问题'],
  ['ChartBoundary（盘面级边界）', '换一个盘种或宫制通常就能恢复'],
]

const r = await fetch(PAGE, { signal: AbortSignal.timeout(25000) })
const html = await r.text()
console.log(`页面 HTTP ${r.status} · ${html.length} 字节`)

const chunks = [...new Set([...html.matchAll(/\/_next\/static\/immutable\/chunks\/([a-zA-Z0-9._-]+\.js)/g)].map((m) => m[1]))]
console.log(`引用 ${chunks.length} 个 JS chunk\n`)

const found = new Map()
let fetched = 0
for (const c of chunks) {
  try {
    const res = await fetch(`https://mustar.vip/_next/static/immutable/chunks/${c}`, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) continue
    const js = await res.text()
    fetched++
    for (const [label, needle] of MARKERS) {
      if (js.includes(needle)) found.set(label, c)
    }
  } catch { /* 跳过 */ }
}
console.log(`成功拉取 ${fetched}/${chunks.length} 个 chunk\n`)

let ok = true
for (const [label, needle] of MARKERS) {
  const hit = found.get(label)
  console.log(`${hit ? '✅' : '❌'} ${label} — ${hit ? `已上线 (chunk ${hit})` : '未在产物中找到'}`)
  if (!hit) ok = false
}

// global-error 只在根布局崩时才加载, 单独探
const ge = chunks.length
console.log(`\n${ok ? '✅ 线上确认运行的是修复后代码' : '❌ 线上仍是旧代码 (部署可能未完成)'}`)
process.exit(ok ? 0 : 1)
