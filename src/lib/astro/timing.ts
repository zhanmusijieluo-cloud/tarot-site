// ============================================================
// 占星时间技法表 (宫神星同款): 法达星限 / 小限法 / 福点·精神点 Aphesis
// 数据来源: 都勒斯小年表 + 中世纪法达序 (Abu Ma'shar) + Valens 黄道释放
// ============================================================

// 传统七政庙主 (12星座黄道序)
export const SIGN_RULER: string[] = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
]
// 中国传统名 (与 chart.ts 行星名一致)
export const SIGN_RULER_ZH: string[] = [
  '火星', '金星', '水星', '月亮', '太阳', '水星',
  '金星', '火星', '木星', '土星', '土星', '木星',
]
// 曜升主 (七曜; 双子/狮子/天蝎/射手/水瓶无曜升)
// 白羊☉ 金牛☽ 巨蟹♃ 处女☿ 天秤♄ 摩羯♂ 双鱼♀ (托勒密《四书》I.19)
export const SIGN_EXALT: (string | null)[] = [
  'Sun', 'Moon', null, 'Jupiter', null, 'Mercury',
  'Saturn', null, null, 'Mars', null, 'Venus',
]
// 都勒斯小年 (Aphesis / 黄道释放用): 太阳19 月亮25 水星20 金星8 火星15 木星12 土星30(摩羯27)
export const MINOR_YEARS: Record<string, number> = {
  Sun: 19, Moon: 25, Mercury: 20, Venus: 8, Mars: 15, Jupiter: 12, Saturn: 30,
}
export function minorYears(signIdx: number): number {
  const lord = SIGN_RULER[signIdx]
  if (lord === 'Saturn' && signIdx === 9) return 27 // 摩羯土星 27 (Firmicus/Valens 细分)
  return MINOR_YEARS[lord]
}

// ---- 法达星限 (Firdaria, Abu Ma'shar 通版; 总75年) ----
// 日生: 日(10)金(8)水(13)月(9)土(11)木(12)火(7)北交(3)南交(2)
// 夜生: 月(9)土(11)木(12)火(7)北交(3)南交(2)日(10)金(8)水(13)
const FIRDARIA_DAY: [string, number][] = [
  ['Sun', 10], ['Venus', 8], ['Mercury', 13], ['Moon', 9], ['Saturn', 11],
  ['Jupiter', 12], ['Mars', 7], ['NorthNode', 3], ['SouthNode', 2],
]
const FIRDARIA_NIGHT: [string, number][] = [
  ['Moon', 9], ['Saturn', 11], ['Jupiter', 12], ['Mars', 7],
  ['NorthNode', 3], ['SouthNode', 2], ['Sun', 10], ['Venus', 8], ['Mercury', 13],
]
export interface FirdarSeg { lord: string; years: number; startAge: number; endAge: number }

// ---- 法达二级表 (Abu Ma'shar: 每主段平分7子段, 第1子段=主星自己, 然后按迦勒底序循环; 交点不细分; 75年循环; 真实年365.2425) ----
export interface FirdarRow { lord: string; sub: string | null; y: number; m: number; d: number; startAge: number; endAge: number }
// 子序基准: 迦勒底降序 (日→金→水→月→土→木→火), 与主序同源
const CHALDEAN7 = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars']
const YEAR_DAYS = 365.2425

export function firdariaTable(dayChart: boolean, by: number, bm: number, bd: number, rounds = 2): FirdarRow[] {
  const seq = dayChart ? FIRDARIA_DAY : FIRDARIA_NIGHT
  const base = Date.UTC(by, bm - 1, bd)
  const rows: FirdarRow[] = []
  let days = 0
  for (let r = 0; r < rounds; r++) {
    for (const [lord, years] of seq) {
      const isNode = lord === 'NorthNode' || lord === 'SouthNode'
      const parts = isNode ? 1 : 7
      const partLen = years / parts
      const startIdx = CHALDEAN7.indexOf(lord)
      for (let k = 0; k < parts; k++) {
        const dt = new Date(base + Math.round(days) * 86400000)
        rows.push({
          lord,
          sub: isNode ? null : CHALDEAN7[(startIdx + k) % 7],
          y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(),
          startAge: days / YEAR_DAYS,
          endAge: (days + partLen * YEAR_DAYS) / YEAR_DAYS,
        })
        days += partLen * YEAR_DAYS
      }
    }
  }
  return rows
}
export function firdaria(dayChart: boolean): FirdarSeg[] {
  const seq = dayChart ? FIRDARIA_DAY : FIRDARIA_NIGHT
  let age = 0
  return seq.map(([lord, years]) => {
    const seg = { lord, years, startAge: age, endAge: age + years }
    age += years
    return seg
  })
}

// ---- 小限法 (Profections): 出生 ASC 所在宫为 1 岁宫, 每年推进一宫 ----
export interface ProfectionSeg { age: number; house: number; signIdx: number; lord: string }
export function profections(ascSignIdx: number, maxAge = 75): ProfectionSeg[] {
  const out: ProfectionSeg[] = []
  for (let age = 0; age <= maxAge; age++) {
    const house = (age % 12) + 1
    const signIdx = (ascSignIdx + age) % 12
    out.push({ age, house, signIdx, lord: SIGN_RULER[signIdx] })
  }
  return out
}

// ---- Aphesis / 黄道释放 (L1): 从福点(或精神点)所在星座起, 按黄道序推进 ----
export interface AphesisSeg { signIdx: number; lord: string; years: number; startAge: number; endAge: number }
export function aphesisL1(lotSignIdx: number, maxAge = 95): AphesisSeg[] {
  const out: AphesisSeg[] = []
  let age = 0
  let si = lotSignIdx
  // 上限: 最多 40 段 (95岁/最短段8年≈12段, 富余)
  for (let i = 0; i < 40 && age < maxAge; i++) {
    const years = minorYears(si)
    out.push({ signIdx: si, lord: SIGN_RULER[si], years, startAge: age, endAge: age + years })
    age += years
    si = (si + 1) % 12
  }
  return out
}
