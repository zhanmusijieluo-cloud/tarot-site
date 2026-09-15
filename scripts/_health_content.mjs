// 内容库体检: Supabase 各表 + 静态 JSON 完整性 (一次性脚本, 用完即删)
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY }

const get = async (table, params = '') => {
  const r = await fetch(`${URL}/rest/v1/${table}?${params}`, { headers: H })
  const txt = await r.text()
  let j = null
  try { j = JSON.parse(txt) } catch {}
  return { st: r.status, rows: Array.isArray(j) ? j : null, raw: txt.slice(0, 160) }
}

console.log('========== Supabase 表结构探测 ==========')
const TABLES = ['learn_articles', 'card_meanings', 'cards', 'tarot_case_log', 'reading_feedback', 'user_archives']
const cols = {}
for (const t of TABLES) {
  const r = await get(t, 'select=*&limit=1')
  if (r.rows && r.rows.length) {
    cols[t] = Object.keys(r.rows[0])
    console.log(`[OK]   ${t.padEnd(17)} 列: ${cols[t].join(', ')}`)
  } else {
    console.log(`[${r.st}]  ${t.padEnd(17)} ${r.raw}`)
  }
}

// ---- learn_articles 三语完整性 ----
console.log('\n========== learn_articles 三语完整性 ==========')
const la = await get('learn_articles', 'select=*')
if (la.rows) {
  const c = cols.learn_articles
  const pick = (o, base) => ['zh', 'en', 'ja'].map((L) => {
    const k = c.find((x) => x === `${base}_${L}` || x === `${base}${L}` || x === base + L)
    return k ? (o[k] ?? '') : null
  })
  const byCat = {}
  let blank = { title: 0, summary: 0, content: 0 }
  for (const row of la.rows) {
    byCat[row.category ?? '?'] = (byCat[row.category ?? '?'] ?? 0) + 1
    for (const base of ['title', 'summary', 'content']) {
      const vals = pick(row, base)
      if (vals.some((v) => v === null)) continue
      if (vals.some((v) => !String(v).trim())) blank[base]++
    }
  }
  console.log('总行数:', la.rows.length, '| 分类:', JSON.stringify(byCat))
  console.log('三语有空值的行数 → title:', blank.title, 'summary:', blank.summary, 'content:', blank.content)
  const sample = la.rows[0]
  console.log('首行 title 三语长度:', pick(sample, 'title').map((v) => v?.length ?? 'N/A').join(' / '))
  console.log('首行 content 三语长度:', pick(sample, 'content').map((v) => v?.length ?? 'N/A').join(' / '))
}

// ---- card_meanings 完整性 ----
console.log('\n========== card_meanings 完整性 ==========')
const cm = await get('card_meanings', 'select=*')
if (cm.rows) {
  const c = cols.card_meanings
  console.log('总行数:', cm.rows.length)
  console.log('列:', c.join(', '))
  const jsonCols = c.filter((x) => /keyword|meaning|career|love|finance|growth|mystic|domain|upright|reversed/i.test(x))
  for (const k of jsonCols) {
    let empty = 0, nulls = 0
    for (const row of cm.rows) {
      const v = row[k]
      if (v === null || v === undefined) nulls++
      else if (Array.isArray(v) ? v.length === 0 : (typeof v === 'object' ? Object.keys(v).length === 0 : !String(v).trim())) empty++
    }
    console.log(`  ${k.padEnd(26)} 空=${empty}  null=${nulls}`)
  }
  const ids = cm.rows.map((r) => r.card_id ?? r.id).filter((x) => x !== undefined)
  const uniq = new Set(ids)
  console.log('唯一卡 id 数:', uniq.size, '| 范围:', Math.min(...ids), '-', Math.max(...ids))
}

// ---- 其它表计数 ----
console.log('\n========== 其它表 ==========')
for (const t of ['cards', 'tarot_case_log', 'reading_feedback', 'user_archives']) {
  const r = await get(t, 'select=*')
  console.log(`${t.padEnd(17)} ${r.rows ? r.rows.length + ' 行' : 'st=' + r.st + ' ' + r.raw}`)
}

// ---- 静态 JSON ----
console.log('\n========== 静态数据文件 ==========')
const FILES = [
  ['public/data/card-details.json', 78, 17, 3],
  ['public/data/ln-details.json', 36, null, 3],
  ['public/data/ln-combos.json', 1260, null, 3],
  ['public/data/card-directions.json', 78, null, null],
  ['public/data/ln-directions.json', 36, null, null],
]
for (const [f, expectN] of FILES) {
  if (!fs.existsSync(f)) { console.log(`[缺失] ${f}`); continue }
  const raw = fs.readFileSync(f, 'utf8')
  let j = null
  try { j = JSON.parse(raw) } catch { console.log(`[解析失败] ${f}`); continue }
  const n = Array.isArray(j) ? j.length : Object.keys(j).length
  console.log(`${f.padEnd(38)} ${(raw.length / 1024).toFixed(0)}KB  条目=${n}${expectN ? ' (期望' + expectN + ')' : ''}`)
}
