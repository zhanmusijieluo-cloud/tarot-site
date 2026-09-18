// 决定性实验: 同一 URL、同一代码, 换不同代理出口, 看是否被 Vercel 挑战。
// 若不同出口结果不同 => 拦截取决于网络出口(边缘风控), 与项目代码无关。
// 用法: node scripts/_node_matrix.mjs
import http from 'node:http'
import { execFileSync } from 'node:child_process'

const PIPE = '\\\\.\\pipe\\verge-mihomo'
const PROXY = 'http://127.0.0.1:7897'
const GROUP = '🔰 选择节点'
const URL = 'https://mustar.vip/astrology/chart'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
const PER_NODE = 3

function api(path, method = 'GET', body = null) {
  return new Promise((res) => {
    const r = http.request(
      { socketPath: PIPE, path, method, headers: body ? { 'content-type': 'application/json' } : {} },
      (rs) => {
        let d = ''
        rs.on('data', (c) => (d += c))
        rs.on('end', () => res({ s: rs.statusCode, b: d }))
      },
    )
    r.on('error', (e) => res({ s: 0, b: String(e.message) }))
    r.setTimeout(12000, () => {
      r.destroy()
      res({ s: 0, b: 'timeout' })
    })
    if (body) r.write(JSON.stringify(body))
    r.end()
  })
}

function probe() {
  const args = [
    '-s', '-o', 'NUL', '-D', '-', '-A', UA, '-L',
    '--max-time', '20', '-x', PROXY, '-w', '\n@@@S:%{http_code}', URL,
  ]
  let raw = ''
  try {
    raw = execFileSync('curl', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return { status: 0, mit: false, region: '' }
  }
  const st = Number((/@@@S:(\d+)/.exec(raw) || [, 0])[1])
  const head = raw.split('@@@S')[0]
  return {
    status: st,
    mit: /x-vercel-mitigated:\s*challenge/i.test(head),
    region: (/x-vercel-id:\s*([a-z0-9]+)::/i.exec(head) || [, ''])[1],
  }
}

// 1) 当前出口 IP
const exitIp = execFileSync('curl', ['-s', '-x', PROXY, '--max-time', '15', 'https://api.ipify.org'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
}).trim()
console.log(`当前出口 IP: ${exitIp}\n`)

// 2) 取节点列表
const pr = await api('/proxies')
const g = JSON.parse(pr.b).proxies[GROUP]
const nodes = (g.all || []).filter((n) => n !== 'DIRECT' && n !== 'REJECT').slice(0, 8)
console.log(`组「${GROUP}」取 ${nodes.length} 个节点做矩阵测试, 每节点 ${PER_NODE} 次\n`)

const results = []
for (const node of nodes) {
  const sw = await api(`/proxies/${encodeURIComponent(GROUP)}`, 'PUT', { name: node })
  if (sw.s !== 204) {
    console.log(`  ${node.padEnd(28)} 切换失败 (${sw.s})`)
    continue
  }
  await new Promise((r) => setTimeout(r, 1200))
  const rows = []
  for (let i = 0; i < PER_NODE; i++) rows.push(probe())
  const ch = rows.filter((r) => r.status === 403 && r.mit).length
  const ok = rows.filter((r) => r.status === 200).length
  const region = rows.map((r) => r.region).find(Boolean) || ''
  results.push({ node, ok, ch, region })
  console.log(
    `  ${node.padEnd(28)} 200=${String(ok).padStart(2)}/${PER_NODE}  403挑战=${String(ch).padStart(2)}  边缘=${region}`,
  )
}

const anyCh = results.some((r) => r.ch > 0)
const allOk = results.every((r) => r.ch === 0)
console.log('\n---------------------------------------------')
if (anyCh && !allOk) {
  console.log('✅ 同一 URL 在不同出口下结果不同 => 拦截取决于网络出口(边缘风控), 与项目代码无关。')
} else if (allOk) {
  console.log('ℹ️  本轮所有出口都放行, 未复现挑战(挑战是间歇性的)。')
} else {
  console.log('⚠️  所有出口都被拦 => 更像固定规则, 需去 Vercel Firewall 确认。')
}
