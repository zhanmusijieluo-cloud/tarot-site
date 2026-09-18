import http from 'node:http'
const PIPE = '\\\\.\\pipe\\verge-mihomo'
const req = (path, method = 'GET', body = null) => new Promise((res) => {
  const r = http.request({ socketPath: PIPE, path, method, headers: body ? { 'content-type': 'application/json' } : {} }, (rs) => {
    let d = ''; rs.on('data', (c) => (d += c)); rs.on('end', () => res({ s: rs.statusCode, b: d }))
  })
  r.on('error', (e) => res({ s: 0, b: String(e.message) }))
  r.setTimeout(10000, () => { r.destroy(); res({ s: 0, b: 'timeout' }) })
  if (body) r.write(JSON.stringify(body))
  r.end()
})
const p = await req('/proxies')
const all = JSON.parse(p.b).proxies
const groups = Object.entries(all).filter(([, v]) => ['Selector', 'URLTest', 'Fallback'].includes(v.type))
for (const [name, g] of groups) {
  console.log(`组「${name}」(${g.type}) 当前=${g.now}`)
  const nodes = g.all || []
  console.log('  节点数:', nodes.length)
  console.log('  前 12 个:', nodes.slice(0, 12).join(' | '))
  console.log('')
}
