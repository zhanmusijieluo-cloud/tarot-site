// 高频稳定性探测 — 抓「有时候刷新就可以」这种间歇性失败
import fs from 'node:fs'

const URL = 'https://mustar.vip/astrology/chart?y=1995&mo=6&d=15&h=14&mi=30&cn=北京~北京~北京&lat=39.9042&lng=116.4074&sys=placidus'
const N = 300
const CONC = 20

const times = []
const fails = []
let ok = 0

const one = async (i) => {
  const t0 = Date.now()
  try {
    const ctl = AbortSignal.timeout(20000)
    const r = await fetch(URL, { signal: ctl })
    const dt = Date.now() - t0
    times.push(dt)
    if (r.status === 200) { ok++; await r.arrayBuffer() }
    else fails.push('HTTP ' + r.status + ' (#' + i + ', ' + dt + 'ms)')
  } catch (e) {
    fails.push(String(e.cause?.code ?? e.name ?? e) + ' (#' + i + ', ' + (Date.now() - t0) + 'ms)')
  }
}

const t0 = Date.now()
const queue = Array.from({ length: N }, (_, i) => i)
const workers = Array.from({ length: CONC }, async () => {
  while (queue.length) await one(queue.shift())
})
await Promise.all(workers)
const total = Date.now() - t0

times.sort((a, b) => a - b)
const pct = (p) => times[Math.min(times.length - 1, Math.floor(times.length * p))] ?? -1
const bucket = {}
for (const f of fails) { const k = f.split(' (')[0]; bucket[k] = (bucket[k] ?? 0) + 1 }

console.log('=== 300 次并发 20 探测 (HTTP/1.1) ===')
console.log('  总耗时 ' + (total / 1000).toFixed(1) + 's | 成功 ' + ok + '/' + N + ' | 失败 ' + fails.length)
if (times.length) console.log('  耗时 p50=' + pct(0.5) + 'ms  p95=' + pct(0.95) + 'ms  max=' + pct(1) + 'ms')
if (fails.length) {
  console.log('  失败分类:')
  for (const [k, v] of Object.entries(bucket).sort((a, b) => b[1] - a[1])) console.log('    ' + k + ' × ' + v)
  console.log('  失败样例:')
  for (const f of fails.slice(0, 10)) console.log('    ' + f)
}

// 响应头体检
const r = await fetch(URL)
const h = Object.fromEntries(r.headers)
console.log('\n=== 响应头体检 ===')
for (const k of ['server', 'x-vercel-id', 'x-vercel-cache', 'cache-control', 'age', 'alt-svc', 'x-matched-path', 'vary']) {
  console.log('  ' + k.padEnd(18) + ' = ' + (h[k] ?? '(无)'))
}
console.log('  HTTP 版本         = ' + r.httpVersion)
