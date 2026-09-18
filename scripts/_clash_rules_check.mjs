import http from 'node:http'
const PIPE = '\\\\.\\pipe\\verge-mihomo'
const req = (path) => new Promise((res) => {
  const r = http.request({ socketPath: PIPE, path, method: 'GET' }, (rs) => {
    let d = ''; rs.on('data', (c) => (d += c)); rs.on('end', () => res({ s: rs.statusCode, b: d }))
  })
  r.on('error', (e) => res({ s: 0, b: String(e.message) }))
  r.setTimeout(8000, () => { r.destroy(); res({ s: 0, b: 'timeout' }) })
  r.end()
})
const c = await req('/configs')
const cfg = JSON.parse(c.b)
console.log('模式        :', cfg.mode)
console.log('混合端口    :', cfg['mixed-port'])
console.log('TUN 模式    :', cfg.tun?.enable)
const r = await req('/rules')
const rules = JSON.parse(r.b).rules
const mine = rules.filter((x) => String(x.payload || '').includes('mustar'))
console.log('规则总数    :', rules.length)
console.log('mustar 规则 :', JSON.stringify(mine))
console.log('规则表首条  :', JSON.stringify(rules[0]).slice(0, 120))
