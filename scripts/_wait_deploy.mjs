// 等 Vercel 新部署上线: 轮询线上 chunk 指纹, 变了就是新版本生效。
// 用法: node scripts/_wait_deploy.mjs [最长等待分钟]
const BASE = 'https://mustar.vip/astrology/chart?y=1995&mo=1&d=1&h=12&mi=0&lat=39.9&lng=116.41&tz=8'
const MAX_MIN = Number(process.argv[2] || 8)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 走直连 (本机 Clash 已给 mustar.vip 配 DIRECT; 系统 http_proxy 是坏的)
const fetchHtml = async () => {
  const r = await fetch(BASE, { redirect: 'follow', signal: AbortSignal.timeout(20000) })
  return { status: r.status, html: await r.text() }
}

const fingerprint = (html) => {
  const chunks = [...html.matchAll(/\/_next\/static\/immutable\/chunks\/([a-zA-Z0-9._-]+\.js)/g)]
    .map((m) => m[1])
    .sort()
  return { chunks, key: chunks.join(',') }
}

let base = null
try {
  const { status, html } = await fetchHtml()
  base = fingerprint(html)
  console.log(`基线: HTTP ${status} · ${base.chunks.length} 个 chunk`)
  console.log(`指纹: ${base.key.slice(0, 120)}...`)
} catch (e) {
  console.log('基线抓取失败(可能部署中):', String(e).slice(0, 120))
}

const deadline = Date.now() + MAX_MIN * 60_000
let last = ''
let i = 0
while (Date.now() < deadline) {
  i++
  await sleep(15000)
  try {
    const { status, html } = await fetchHtml()
    const fp = fingerprint(html)
    const tag = fp.key === base?.key ? '未变' : '★ 已变'
    if (fp.key !== last) {
      console.log(`[${i}] HTTP ${status} · ${fp.chunks.length} chunk · ${tag}`)
      last = fp.key
    }
    if (base && fp.key !== base.key) {
      // 换了一批 chunk → 新构建已生效; 再确认错误边界文案进了产物
      const marker = html.includes('页面出了点问题')
      console.log('\n✅ 新构建已上线')
      console.log('   首页 HTML 含错误边界文案:', marker, '(客户端 chunk 懒加载, false 属正常)')
      process.exit(0)
    }
  } catch (e) {
    console.log(`[${i}] 请求异常:`, String(e).slice(0, 90))
  }
}
console.log('\n⏰ 超时: 指纹未变化, 部署可能仍在进行或失败')
process.exit(1)
