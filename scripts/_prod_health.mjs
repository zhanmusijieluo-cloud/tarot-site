// 线上健康检查 — 木木报「此页面无法加载」时先跑这个, 三层定位 (DNS / 服务端 / 稳定性)
// 用法: node scripts/_prod_health.mjs [域名, 默认 mustar.vip]
import dns from 'node:dns'

const HOST = process.argv[2] ?? 'mustar.vip'
const LONG_URL = `https://${HOST}/astrology/chart?y=1995&mo=6&d=15&h=14&mi=30&cn=北京~北京~北京&lat=39.9042&lng=116.4074&sys=placidus`
const PAGES = ['/', '/astrology/chart', '/reading/session']

const resolveVia = (server, host) => new Promise((res) => {
  const r = new dns.Resolver()
  r.setServers([server])
  const timer = setTimeout(() => res('TIMEOUT'), 5000)
  r.resolve4(host, (e, v) => { clearTimeout(timer); res(e ? 'ERR ' + e.code : v.join(', ')) })
})

console.log('===== 1. DNS 解析一致性 (' + HOST + ') =====')
for (const s of ['192.168.101.1', '223.5.5.5', '119.29.29.29', '114.114.114.114', '180.76.76.76']) {
  console.log('  ' + s.padEnd(17) + ' → ' + await resolveVia(s, HOST))
}
console.log('  (都指向 Vercel anycast 76.76.21.x 即为正常; 不一致 = DNS 缓存/传播问题)')

console.log('\n===== 2. 关键页面状态码 =====')
for (const p of PAGES) {
  const url = `https://${HOST}${p}`
  try {
    const r = await fetch(url, { redirect: 'manual' })
    console.log('  ' + String(r.status).padEnd(4) + ' ' + p + (r.status === 200 ? '' : '  → location: ' + (r.headers.get('location') ?? '-')))
  } catch (e) {
    console.log('  FAIL ' + p + '  ' + String(e).slice(0, 90))
  }
}

console.log('\n===== 3. 木木那个长 URL 连打 15 次 (查间歇性失败) =====')
let ok = 0
const fails = []
for (let i = 0; i < 15; i++) {
  const t0 = Date.now()
  try {
    const r = await fetch(LONG_URL)
    if (r.status === 200) ok++
    else fails.push(r.status + ' @第' + (i + 1) + '次')
  } catch (e) {
    fails.push(String(e).slice(0, 60) + ' @第' + (i + 1) + '次')
  }
  if (i === 0) console.log('  首次耗时 ' + (Date.now() - t0) + 'ms')
}
console.log('  成功 ' + ok + '/15' + (fails.length ? ' | 失败: ' + fails.join('; ') : ' | 全部成功'))

console.log('\n===== 结论参考 =====')
console.log('  三层全绿 → 服务端/DNS 无问题, 问题在浏览器本地 (缓存 · 扩展 · 代理/VPN · QUIC)')
console.log('  先让木木试: Ctrl+Shift+R 硬刷新 → Ctrl+Shift+N 无痕 → edge://settings/content/all 清站点数据')
