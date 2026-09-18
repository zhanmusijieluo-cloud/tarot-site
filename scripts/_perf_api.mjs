// 量各盘种 API 服务端耗时 (切盘慢的第一嫌疑: 星历计算)
const ORIGIN = process.argv.includes('--local') ? 'http://localhost:3000' : 'https://mustar.vip'

const birth = {
  year: 1977, month: 3, day: 18, hour: 22, minute: 30,
  timezone: 8, latitude: 30.56, longitude: 104.27,
  city: '成都龙泉驿', houseSystem: 'placidus', timeKnown: true,
}
const target = { year: 2026, month: 9, day: 18, hour: 22, minute: 30 }

const TYPES = ['transit', 'progression', 'tertiary', 'solar-arc', 'solar-return', 'lunar-return']

const timeIt = async (url, body) => {
  const t0 = performance.now()
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  const t1 = performance.now()
  return { ms: Math.round(t1 - t0), status: r.status, bytes: JSON.stringify(j).length, err: j.error }
}

console.log(`目标: ${ORIGIN}\n`)
console.log('盘种'.padEnd(14) + '第1次'.padStart(8) + '第2次'.padStart(8) + '第3次'.padStart(8) + '  响应大小')
for (const type of TYPES) {
  const body = { birth, settings: {}, type, target, lang: 'zh' }
  const runs = []
  for (let i = 0; i < 3; i++) runs.push(await timeIt(`${ORIGIN}/api/astro/chart/dynamic`, body))
  const err = runs.find((x) => x.err)?.err
  console.log(type.padEnd(14) + runs.map((x) => String(x.ms).padStart(8)).join('') + `  ${(runs[2].bytes / 1024).toFixed(1)}KB` + (err ? `  ❌ ${err}` : ''))
}

// 本命盘 (切盘种不重算, 但首次进页会算)
{
  const body = { birth, settings: {}, lang: 'zh' }
  const runs = []
  for (let i = 0; i < 3; i++) runs.push(await timeIt(`${ORIGIN}/api/astro/chart`, body))
  console.log('natal(本命)'.padEnd(14) + runs.map((x) => String(x.ms).padStart(8)).join('') + `  ${(runs[2].bytes / 1024).toFixed(1)}KB`)
}
