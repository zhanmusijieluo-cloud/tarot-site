// Vercel 安全挑战(403 Security Checkpoint)监测器 —— 木木 2026-09-18
// 用途: 网站出现「此页面无法加载」时先跑这个, 一眼看出是不是 Vercel 边缘在拦人。
// 判据: 403 + 响应头 X-Vercel-Mitigated: challenge  =>  是 Vercel 拦的, 不是代码问题。
// 用法: node scripts/_challenge_watch.mjs
// 退出码: 0 = 无挑战; 1 = 检出挑战(需去 Vercel Dashboard → Firewall 处理)

import { execFileSync } from 'node:child_process'

const PROXY = 'http://127.0.0.1:7897' // Clash Verge mixed-port
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
const TARGETS = [
  ['裸域 mustar.vip', 'https://mustar.vip/astrology/chart'],
  ['www.mustar.vip ', 'https://www.mustar.vip/astrology/chart'],
]
const ROUNDS = 8

// 用 curl 探测: 一次拿到 状态码 + 响应头 + 正文, 不依赖 undici。
function probe(url, useProxy) {
  const args = [
    '-s',
    '-o',
    process.platform === 'win32' ? 'NUL' : '/dev/null',
    '-D',
    '-', // 响应头到 stdout
    '-A',
    UA,
    '-L',
    '--max-time',
    '20',
    '-w',
    '\n@@@STATUS:%{http_code}',
    useProxy ? '-x' : '--noproxy',
    useProxy ? PROXY : '*',
    url,
  ]
  let raw = ''
  try {
    raw = execFileSync('curl', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return { netErr: true }
  }
  const m = /@@@STATUS:(\d+)/.exec(raw)
  const status = m ? Number(m[1]) : 0
  const headers = raw.split('@@@STATUS')[0]
  const mitigated = /x-vercel-mitigated:\s*challenge/i.test(headers)
  const region = (/x-vercel-id:\s*([a-z0-9]+)::/i.exec(headers) || [, ''])[1]
  return { status, mitigated, region }
}

const summarize = (rows) => {
  const ok = rows.filter((r) => r.status === 200).length
  const ch = rows.filter((r) => r.status === 403 && r.mitigated).length
  const other = rows.filter((r) => r.status !== 200 && !(r.status === 403 && r.mitigated)).length
  const codes = {}
  for (const r of rows) codes[r.netErr ? 'net' : r.status] = (codes[r.netErr ? 'net' : r.status] || 0) + 1
  const region = rows.map((r) => r.region).find(Boolean) || ''
  return { ok, ch, other, codes, region }
}

console.log('=== Vercel 安全挑战监测 ===')
console.log(`轮次: ${ROUNDS}/组    判据: 403 + X-Vercel-Mitigated: challenge\n`)

let challenged = false
for (const [label, url] of TARGETS) {
  for (const [mode, useProxy] of [
    ['直连  ', false],
    ['走代理', true],
  ]) {
    const rows = []
    for (let i = 0; i < ROUNDS; i++) rows.push(probe(url, useProxy))
    const s = summarize(rows)
    if (s.ch > 0) challenged = true
    console.log(
      `  ${label} ${mode}: 正常 ${String(s.ok).padStart(2)}/${ROUNDS}` +
        ` | 被拦(403挑战) ${String(s.ch).padStart(2)} | 其他 ${s.other}` +
        `  [状态码 ${JSON.stringify(s.codes)}${s.region ? '  边缘=' + s.region : ''}]`,
    )
  }
  console.log('')
}

console.log('---------------------------------------------')
if (challenged) {
  console.log('⚠️  检出 Vercel 安全挑战。')
  console.log('    · 403 页由 Vercel 边缘生成(该页是 Astro 渲染, 本项目是 Next.js), 与项目代码无关。')
  console.log('    · 处理: Vercel Dashboard → 项目 tarot-site → Firewall')
  console.log('      检查 Attack Challenge Mode 与自定义 Challenge 规则, 关闭或收窄触发条件。')
  console.log('    · 临时绕过(仅本机): mustar.vip 加入代理绕过列表, 或在 Clash 里让该域名走 DIRECT。')
  process.exit(1)
} else {
  console.log('✅ 未检出挑战, 边缘放行正常。若仍偶发「无法加载」, 优先怀疑本地网络或浏览器缓存。')
  process.exit(0)
}
