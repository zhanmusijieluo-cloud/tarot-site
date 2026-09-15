// 引擎深度体检: 16 宫制 × 6 动态盘 × 16 合盘盘 (打线上 mustar.vip, 一次性脚本)
const BASE = 'https://mustar.vip'
const birth = { year: 1998, month: 2, day: 19, hour: 9, minute: 45, timezone: 8, latitude: 31.028, longitude: 106.413, city: '蓬安', timeKnown: true, houseSystem: 'placidus' }
const birthB = { year: 1993, month: 5, day: 29, hour: 9, minute: 50, timezone: 8, latitude: 39.9, longitude: 116.41, city: '北京', timeKnown: true, houseSystem: 'placidus' }

const post = async (path, body) => {
  try {
    const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) })
    const j = await r.json().catch(() => ({}))
    return { st: r.status, j }
  } catch (e) { return { st: 'ERR', j: { error: e.message } } }
}

// ---------- 1. 16 宫制 ----------
console.log('========== 16 宫制 (线上) ==========')
const SYS = ['placidus', 'koch', 'equal', 'whole-sign', 'porphyry', 'regiomontanus', 'campanus', 'morinus', 'vettius', 'alcabitiuses', 'sripati', 'pullen', 'polich-page', 'krusinski', 'carter', 'vehlow']
let sysBad = 0
for (const s of SYS) {
  const r = await post('/api/astro/chart', { birth: { ...birth, houseSystem: s }, settings: {} })
  const c = r.j?.chart ?? {}
  const ok = r.st === 200 && c.cusps?.length === 12 && c.angles?.ascendant
  if (!ok) sysBad++
  const w = (c.warnings ?? []).length
  console.log(`${ok ? '✅' : '❌'} ${s.padEnd(15)} st=${r.st} used=${String(c.houseSystemUsed).padEnd(13)} cusps=${c.cusps?.length ?? '-'} warn=${w} ASC=${c.angles?.ascendant?.longitude?.toFixed(3) ?? '-'}`)
}
console.log(`宫制小结: ${16 - sysBad}/16 正常`)

// ---------- 1b. 高纬降级 (诚实性检查) ----------
console.log('\n========== 高纬降级 (北纬 69.6° 特罗姆瑟) ==========')
for (const s of ['placidus', 'koch', 'porphyry']) {
  const r = await post('/api/astro/chart', { birth: { ...birth, latitude: 69.65, longitude: 18.96, city: '特罗姆瑟', houseSystem: s }, settings: {} })
  const c = r.j?.chart ?? {}
  console.log(`${s.padEnd(10)} st=${r.st} used=${c.houseSystemUsed} warn=${JSON.stringify(c.warnings ?? []).slice(0, 90)}`)
}

// ---------- 2. 动态盘 6 型 ----------
console.log('\n========== 动态盘 API (6 型) ==========')
const TYPES = ['transit', 'progression', 'tertiary', 'solar-arc', 'solar-return', 'lunar-return']
for (const t of TYPES) {
  const r = await post('/api/astro/chart/dynamic', { birth, settings: {}, type: t, target: { year: 2026, month: 9, day: 15, hour: 22, minute: 0, tzOffset: 8 } })
  const c = r.j?.chart ?? {}
  const outer = c.outer?.planets?.length ?? 0
  const cross = c.crossAspects?.length ?? 0
  console.log(`${r.st === 200 && outer > 0 ? '✅' : '❌'} ${t.padEnd(14)} st=${r.st} outer行星=${outer} 跨盘相位=${cross} ${c.error ? 'ERR:' + c.error : ''}`)
}

// ---------- 3. 合盘 16 盘 ----------
console.log('\n========== 合盘 16 盘字段 ==========')
const r = await post('/api/astro/chart/synastry', { birthA: birth, birthB, settings: {} })
const ch = r.j?.chart ?? {}
const TABS = [
  ['a', '比较盘A'], ['b', '比较盘B'], ['composite', '组合盘'], ['marksA', '马盘A'], ['marksB', '马盘B'],
  ['davisonChart', '时空盘'], ['compT', '组合三限'], ['compS', '组合次限'], ['marksAT', '马盘A三限'],
  ['marksBT', '马盘B三限'], ['marksAS', '马盘A次限'], ['marksBS', '马盘B次限'], ['davT', '时空三限'], ['davS', '时空次限'],
]
console.log(`st=${r.st} 跨盘相位=${ch.crossAspects?.length ?? '-'} 字段总数=${Object.keys(ch).length}`)
let tabBad = 0
for (const [k, zh] of TABS) {
  const c = ch[k]
  const n = c?.planets?.length ?? 0
  const asc = c?.angles?.ascendant?.longitude
  const ok = n > 0 && asc !== undefined
  if (!ok) tabBad++
  console.log(`${ok ? '✅' : '❌'} ${k.padEnd(13)} ${zh.padEnd(9)} 行星=${String(n).padEnd(3)} ASC=${asc !== undefined ? asc.toFixed(2) : 'null'}`)
}
console.log(`合盘小结: ${TABS.length - tabBad}/${TABS.length} 盘正常`)
