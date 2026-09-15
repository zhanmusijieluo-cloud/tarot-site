// AI 解读链路体检: 线上 /api/interpret/stream 真实调用 (一次性脚本)
const BASE = 'https://mustar.vip'

const run = async (label, body) => {
  const t0 = Date.now()
  try {
    const r = await fetch(BASE + '/api/interpret/stream', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(150000),
    })
    if (!r.ok || !r.body) {
      const t = await r.text().catch(() => '')
      console.log(`${label} ❌ HTTP ${r.status} ${t.slice(0, 200)}`)
      return
    }
    const reader = r.body.getReader()
    const dec = new TextDecoder()
    let first = null, bytes = 0, blocks = 0, sample = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const s = dec.decode(value, { stream: true })
      bytes += s.length
      if (first === null && s.trim()) first = Date.now() - t0
      blocks += (s.match(/\n\n/g) || []).length
      if (sample.length < 260) sample += s
    }
    const ms = Date.now() - t0
    console.log(`${label} ✅ 首字 ${first}ms | 总时长 ${ms}ms | 流字节 ${bytes} | SSE 块 ${blocks}`)
    // 抽取首个 text 字段片段
    const m = [...sample.matchAll(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g)].slice(0, 2).map((x) => x[1].replace(/\\n/g, ' '))
    console.log(`   开头内容: ${m.join(' | ').slice(0, 160) || sample.slice(0, 160).replace(/\s+/g, ' ')}`)
  } catch (e) {
    console.log(`${label} ❌ ${e.message} (${Date.now() - t0}ms)`)
  }
}

console.log('========== AI 解读链路 (线上真实调用) ==========')
await run('[塔罗·三牌]', {
  cards: [
    { id: 0, name: 'The Fool', isReversed: false, upright: '新的开始', element: '风', arcana: 'major' },
    { id: 1, name: 'The Magician', isReversed: false, upright: '创造力', element: '风', arcana: 'major' },
    { id: 2, name: 'The High Priestess', isReversed: true, upright: '直觉', element: '水', arcana: 'major' },
  ],
  question: '我最近的事业发展如何？',
  background: '', spreadName: '三牌阵', positions: ['过去', '现在', '未来'],
  lang: 'zh', deck: 'tarot', spreadKey: null,
})

await run('[雷诺曼·三张]', {
  cards: [
    { id: 1, name: 'Rider', isReversed: false, upright: '消息', element: '', arcana: 'lenormand' },
    { id: 2, name: 'Clover', isReversed: false, upright: '好运', element: '', arcana: 'lenormand' },
    { id: 3, name: 'Ship', isReversed: false, upright: '远行', element: '', arcana: 'lenormand' },
  ],
  question: '近期出行顺利吗？',
  background: '', spreadName: '三张时光线', positions: ['过去', '现在', '未来'],
  lang: 'zh', deck: 'lenormand', spreadKey: 'ln3a',
})

// 追问接口
try {
  const t0 = Date.now()
  const r = await fetch(BASE + '/api/followup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cards: [{ id: 0, name: 'The Fool', reversed: false }], question: '我该注意什么？', spread_name: '三牌阵', interpretation: '（测试）', lang: 'zh' }),
    signal: AbortSignal.timeout(90000),
  })
  const t = await r.text()
  console.log(`[追问接口] ${r.ok ? '✅' : '❌'} HTTP ${r.status} | ${Date.now() - t0}ms | ${t.length}B | ${t.slice(0, 120).replace(/\s+/g, ' ')}`)
} catch (e) { console.log('[追问接口] ❌', e.message) }
