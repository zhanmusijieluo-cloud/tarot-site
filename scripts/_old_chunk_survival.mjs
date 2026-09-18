// 关键验证: 新部署上线后, 【旧部署】的静态 chunk 还能不能访问?
//   - 若仍 200  → 旧客户端懒加载不会失败, ChunkLoadError 另有他因
//   - 若 404    → Vercel 已回收旧部署 → 旧客户端一点击就崩 (与 tarot-site 存储接近 10GB 上限吻合)
// 用法: node scripts/_old_chunk_survival.mjs [最长等待分钟]
const BASE = 'https://mustar.vip/astrology/chart?y=1995&mo=1&d=1&h=12&mi=0&lat=39.9&lng=116.41&tz=8'
const MAX_MIN = Number(process.argv[2] || 7)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const getHtml = async () => {
  const r = await fetch(BASE, { redirect: 'follow', signal: AbortSignal.timeout(20000), cache: 'no-store' })
  return await r.text()
}
const chunksOf = (html) => [...new Set([...html.matchAll(/\/_next\/static\/immutable\/chunks\/([a-zA-Z0-9._-]+\.js)/g)].map((m) => m[1]))].sort()
const keyOf = (a) => a.join(',')

const old = chunksOf(await getHtml())
console.log(`基线(部署前/中): ${old.length} 个 chunk`)
console.log(`  ${old.slice(0, 4).join('\n  ')}\n`)

let newList = null
const deadline = Date.now() + MAX_MIN * 60_000
while (Date.now() < deadline) {
  await sleep(15000)
  try {
    const list = chunksOf(await getHtml())
    if (keyOf(list) !== keyOf(old)) {
      newList = list
      console.log(`★ 新构建已上线: ${list.length} 个 chunk (旧 ${old.length} 个)`)
      break
    }
    console.log(`  ...仍是旧指纹 (${list.length} chunk)`)
  } catch (e) {
    console.log('  抓取异常:', String(e).slice(0, 80))
  }
}

if (!newList) {
  console.log('\n⏰ 超时: 未观测到指纹变化')
  process.exit(1)
}

// 旧构建里有、新构建里没有的 chunk = 旧客户端可能仍在请求的那些
const gone = old.filter((c) => !newList.includes(c))
console.log(`\n旧构建独有 chunk: ${gone.length} / ${old.length}`)
if (!gone.length) {
  console.log('（本次构建 chunk 名完全复用 → 无法区分新旧，需换一次内容变更更大的部署再测）')
}

let alive = 0, dead = 0
const deadList = []
for (const c of gone) {
  const url = `https://mustar.vip/_next/static/immutable/chunks/${c}`
  try {
    const r = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(15000), headers: { Range: 'bytes=0-64' } })
    if (r.status === 200 || r.status === 206) { alive++; } else { dead++; deadList.push(`${r.status} ${c}`) }
  } catch (e) {
    dead++; deadList.push(`ERR ${c} (${String(e).slice(0, 40)})`)
  }
}

console.log(`\n旧 chunk 存活探测: 可访问 ${alive} · 已失效 ${dead}`)
if (deadList.length) console.log(`失效清单(前 10):\n  ${deadList.slice(0, 10).join('\n  ')}`)
console.log(
  alive > 0 && dead === 0
    ? '\n→ 结论: 旧部署资源仍可访问。ChunkLoadError 不是「旧 chunk 被删」, 需查 CDN/边缘瞬时行为。'
    : '\n→ 结论: 旧部署资源已不可访问 → 旧客户端一点击就 ChunkLoadError。根因 = 部署保留策略太短。',
)
