// 查看/切换 Clash 主选择组的节点 —— 木木 2026-09-18
// 用法:
//   node scripts/_fix_node.mjs              # 只看当前节点
//   node scripts/_fix_node.mjs "<节点名>"    # 切到指定节点
import http from 'node:http'

const PIPE = '\\\\.\\pipe\\verge-mihomo'
const GROUP = '🔰 选择节点'

function req(path, method = 'GET', body = null) {
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
    r.setTimeout(10000, () => {
      r.destroy()
      res({ s: 0, b: 'timeout' })
    })
    if (body) r.write(JSON.stringify(body))
    r.end()
  })
}

const all = JSON.parse((await req('/proxies')).b).proxies
const g = all[GROUP]
console.log('主选择组当前节点:', g.now)

const target = process.argv[2]
if (target) {
  if (!(g.all || []).includes(target)) {
    console.log('❌ 节点不存在于该组:', target)
    console.log('可选:', (g.all || []).slice(0, 10).join(' | '))
    process.exit(1)
  }
  const sw = await req(`/proxies/${encodeURIComponent(GROUP)}`, 'PUT', { name: target })
  console.log('切换到', target, '-> HTTP', sw.s)
  const after = JSON.parse((await req('/proxies')).b).proxies[GROUP]
  console.log('确认当前节点:', after.now)
}
