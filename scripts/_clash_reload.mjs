// 通过 Clash Verge 的 mihomo 命名管道热重载配置 —— 木木 2026-09-18
// 用途: 改完 clash-verge.yaml 后不用重启 GUI, 直接让内核重新加载。
// 用法: node scripts/_clash_reload.mjs
import http from 'node:http'

const PIPE = '\\\\.\\pipe\\verge-mihomo'
const CFG = 'C:\\Users\\99192\\AppData\\Roaming\\io.github.clash-verge-rev.clash-verge-rev\\clash-verge.yaml'

function req(path, method = 'GET', body = null) {
  return new Promise((res) => {
    const r = http.request(
      { socketPath: PIPE, path, method, headers: body ? { 'content-type': 'application/json' } : {} },
      (rs) => {
        let d = ''
        rs.on('data', (c) => (d += c))
        rs.on('end', () => res({ status: rs.statusCode, body: d }))
      },
    )
    r.on('error', (e) => res({ status: 0, body: String(e.message) }))
    r.setTimeout(15000, () => {
      r.destroy()
      res({ status: 0, body: 'timeout' })
    })
    if (body) r.write(JSON.stringify(body))
    r.end()
  })
}

const before = await req('/configs')
console.log('重载前: 拿到配置', before.status)

const r = await req('/configs?force=true', 'PUT', { path: CFG })
console.log('PUT /configs ->', r.status, String(r.body).slice(0, 200))

// 校验: 用 mihomo 自己的规则匹配接口查 mustar.vip 会走哪个出口
const q = await req('/rules')
if (q.status === 200) {
  const rules = JSON.parse(q.body).rules || []
  const hit = rules.filter((x) => String(x.payload || '').includes('mustar'))
  console.log('规则表中 mustar 相关条目:', JSON.stringify(hit))
  console.log('规则总数:', rules.length)
} else {
  console.log('GET /rules ->', q.status, String(q.body).slice(0, 120))
}
