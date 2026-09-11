// ============================================================
// 占星排盘引擎封装层 (骨架 v0.1)
// 底层: celestine (MIT, 零依赖, 7 分宫制) — 已对拍验证
//   · 太阳黄经 vs Meeus 例题25.a: 差 0.002°
//   · ASC/MC vs 独立Python引擎(aryaminus/astro): 差 <0.001°
// 纪律: 引擎算盘, 模型解读 — 本文件输出即"证据", AI 不得增删行星位置
// ============================================================
import { calculateChart, calculateAspects, AspectType, getSignInfo } from 'celestine'

export type HouseSystem =
  | 'placidus' | 'koch' | 'equal' | 'whole-sign'
  | 'porphyry' | 'regiomontanus' | 'campanus'

export interface BirthData {
  year: number
  month: number
  day: number
  /** 当地时间(未做真太阳时校正前即为钟表时); timeKnown=false 时忽略, 按当地正午 */
  hour: number
  minute: number
  /** UTC 偏移小时数, 如中国=+8 */
  timezone: number
  latitude: number
  longitude: number
  /** 出生城市名, 仅用于展示与存档 */
  city?: string
  houseSystem?: HouseSystem
  /** 不知道出生时间: true 时不算上升/宫位, 行星按当地正午近似 */
  timeKnown?: boolean
  /** 盘档案名(如"小美的盘"), 仅展示与存档 */
  label?: string
  /** 中国三级地点编码"省~市~区"(URL 还原用), 仅展示与存档 */
  cnCode?: string
}

export interface ChartPlanet {
  name: string       // 英文, 如 'Sun'
  zh: string         // 中文, 如 '太阳'
  symbol: string     // '☉'
  longitude: number  // 黄经 0-360
  eclLat: number     // 黄纬(度) — 3D 侧视悬浮高度
  sign: string       // 星座英文 'Leo'
  signZh: string     // 星座中文 '狮子'
  degInSign: number  // 座内度数(十进) 0-30
  formatted: string  // '12°33\' Leo'
  house: number | null   // 未知时间=null
  retrograde: boolean
  speed: number      // °/日
  dignity: { state: string; strength: number } | null
}

export interface ChartAspect {
  a: string; b: string
  type: string      // conjunction|sextile|square|trine|opposition
  typeZh: string
  symbol: string
  orb: number       // 偏离整相位的度数(越小越紧)
  applying: boolean | null
}

export interface NatalChart {
  input: BirthData
  houseSystemUsed: HouseSystem
  timeKnown: boolean
  jd: number
  planets: ChartPlanet[]
  angles: { ascendant: ChartPlanet | null; midheaven: ChartPlanet | null }
  cusps: number[] | null
  aspects: ChartAspect[]
  receptions: Reception[]
  warnings: string[]
}

// ---------- 中文映射表 (B10 规则库之前先内嵌, 后续迁 astro_rules 表) ----------
const SIGNS_ZH: Record<string, string> = {
  Aries: '白羊', Taurus: '金牛', Gemini: '双子', Cancer: '巨蟹',
  Leo: '狮子', Virgo: '处女', Libra: '天秤', Scorpio: '天蝎',
  Sagittarius: '射手', Capricorn: '摩羯', Aquarius: '水瓶', Pisces: '双鱼',
}
const PLANET_ZH: Record<string, string> = {
  Sun: '太阳', Moon: '月亮', Mercury: '水星', Venus: '金星', Mars: '火星',
  Jupiter: '木星', Saturn: '土星', Uranus: '天王星', Neptune: '海王星', Pluto: '冥王星',
  Chiron: '凯龙星', Ceres: '谷神星', Pallas: '智神星', Juno: '婚神星', Vesta: '灶神星',
  'North Node': '北交点', 'South Node': '南交点', Ascendant: '上升', Midheaven: '中天',
  'Part of Fortune': '福点',
}
const PLANET_SYMBOL: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃',
  Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇', Chiron: '⚷',
  Ceres: '⚳', Pallas: '⚴', Juno: '⚵', Vesta: '⚶',
  'North Node': '☊', 'South Node': '☋', Ascendant: 'ASC', Midheaven: 'MC',
}
const ASPECT_ZH: Record<string, string> = {
  conjunction: '合', sextile: '六合', square: '刑', trine: '拱', opposition: '冲',
}

// ---------- 互溶接纳 (Reception) ----------
// 庙座表(现代守护)与传统守护表直接复用 celestine getSignInfo; 耀升表为托勒密公版知识:
// 日羊 月牛 水处 金鱼 火摩 木巨 土天秤 (源: 《四书集》I.19, 各派于此基本一致)
const EXALTATION_SIGN: Record<string, string> = {
  Sun: 'Aries', Moon: 'Taurus', Mercury: 'Virgo', Venus: 'Pisces',
  Mars: 'Capricorn', Jupiter: 'Cancer', Saturn: 'Libra',
  // 三王星无古典耀升位; 现代派部分给天王天蝎/海王射手/冥王摩羯, 争议大 → 不入主表, 规则库二期定流派
  Uranus: '', Neptune: '', Pluto: '',
}
const FALL_SIGN: Record<string, string> = {
  Sun: 'Libra', Moon: 'Scorpio', Mercury: 'Pisces', Venus: 'Virgo',
  Mars: 'Cancer', Jupiter: 'Capricorn', Saturn: 'Aries',
  Uranus: '', Neptune: '', Pluto: '',
}
// 客户主盘十星(不含小行星); 小行星留骨架二期按需开
const CORE_BODIES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
]
const HIGH_LAT = 66.5 // 高纬 Placidus 数学不收敛区

const norm = (d: number) => ((d % 360) + 360) % 360
const toPct = (x: number) => Math.round(x * 100) / 100

// 星座名 → 索引 (0白羊…11双鱼)
const SIGN_IDX: Record<string, number> = {
  Aries: 0, Taurus: 1, Gemini: 2, Cancer: 3, Leo: 4, Virgo: 5,
  Libra: 6, Scorpio: 7, Sagittarius: 8, Capricorn: 9, Aquarius: 10, Pisces: 11,
}
type RulerKind = 'domicile' | 'exaltation' | 'detriment' | 'fall'
const RULER_KIND_ZH: Record<RulerKind, string> = {
  domicile: '庙座', exaltation: '耀升', detriment: '失势', fall: '落陷',
}

export interface Reception {
  a: string          // 行星A (落座者)
  b: string          // 行星B (座主)
  kind: RulerKind    // A 住在 B 的什么宫里
  mutual: boolean    // 互溶: 双向同住
  bySign: string     // 发生在哪个星座(展示用)
}

/**
 * 互溶接纳表: A 落在 B 守护/耀升的星座 → B 接纳 A; 双向同住 = 互溶 (mutual reception)
 * 守护表用 celestine getSignInfo (现代守护, 与主盘 dignities 同流派, 不混古典守护以免自相矛盾)
 */
export function computeReceptions(
  planets: { name: string; sign: string }[],
  opts: { traditional?: boolean } = {},
): Reception[] {
  const rulers = new Map<number, string>()      // 星座idx → 座主(庙)
  const exalted = new Map<number, string>()     // 星座idx → 耀升星
  for (let i = 0; i < 12; i++) {
    const info = getSignInfo(i as never)
    const r = opts.traditional ? info.traditionalRuler : info.ruler
    rulers.set(i, r)
    for (const [p, s] of Object.entries(EXALTATION_SIGN)) if (s && SIGN_IDX[s] === i) exalted.set(i, p)
  }
  const hostOf = (signName: string) => ({
    ruler: rulers.get(SIGN_IDX[signName] ?? -1),
    exalt: exalted.get(SIGN_IDX[signName] ?? -1),
  })
  const out: Reception[] = []
  for (const a of planets) {
    const { ruler, exalt } = hostOf(a.sign)
    if (!ruler && !exalt) continue
    for (const b of planets) {
      if (a.name === b.name) continue
      let kind: RulerKind | null = null
      if (ruler === b.name) kind = 'domicile'
      else if (exalt === b.name) kind = 'exaltation'
      if (!kind) continue
      // 查反向: B 是否也住在 A 的庙/耀升座 → 互溶
      const rev = hostOf(b.sign)
      const mutual = rev.ruler === a.name || rev.exalt === a.name
      // 两个方向各记一条(不吞信息), 展示层按 pair 归并显示"互溶"
      out.push({ a: a.name, b: b.name, kind, mutual, bySign: a.sign })
    }
  }
  return out
}

function bodyToPlanet(
  raw: { name: string; longitude: number; signName: string; degree: number; minute: number; formatted: string; house?: number; longitudeSpeed?: number; isRetrograde?: boolean; latitude?: number; dignity?: { state: string; strength: number } | null },
  houseKnown: boolean,
): ChartPlanet {
  return {
    name: raw.name,
    zh: PLANET_ZH[raw.name] ?? raw.name,
    symbol: PLANET_SYMBOL[raw.name] ?? raw.name,
    longitude: toPct(norm(raw.longitude)),
    eclLat: toPct(raw.latitude ?? 0),
    sign: raw.signName,
    signZh: SIGNS_ZH[raw.signName] ?? raw.signName,
    degInSign: toPct(raw.degree + raw.minute / 60),
    formatted: raw.formatted,
    house: houseKnown && typeof raw.house === 'number' ? raw.house : null,
    retrograde: !!raw.isRetrograde,
    speed: toPct(raw.longitudeSpeed ?? 0),
    dignity: raw.dignity ? { state: raw.dignity.state, strength: raw.dignity.strength } : null,
  }
}

// ---------- 主入口: 排盘 ----------
export function castNatalChart(birth: BirthData): NatalChart {
  const warnings: string[] = []
  const timeKnown = birth.timeKnown !== false
  let system: HouseSystem = birth.houseSystem ?? 'placidus'

  // 高纬度处理: Placidus/Koch 在极区无解 → 明示降级波菲里
  if (Math.abs(birth.latitude) >= HIGH_LAT) {
    if (system === 'placidus' || system === 'koch') {
      warnings.push(`出生地纬度 ${birth.latitude}° 超出 ${system} 制可算范围, 已改用波菲里(Porphyry)制 — 宫位为近似`)
      system = 'porphyry'
    }
  }
  if (!timeKnown) {
    warnings.push('未提供出生时间: 上升与宫位不可算, 月亮位置为当地正午近似(误差可达±6°)')
  }

  // 未知时间 → 当地正午 12:00; 客户主盘只算十星, 小行星/虚点留二期
  const c = calculateChart(
    {
      year: birth.year, month: birth.month, day: birth.day,
      hour: timeKnown ? birth.hour : 12,
      minute: timeKnown ? birth.minute : 0,
      second: 0,
      timezone: birth.timezone,
      latitude: birth.latitude, longitude: birth.longitude,
    },
    {
      houseSystem: system,
      includeAsteroids: false, includeChiron: false,
      includeNodes: false, includeLots: false, includeLilith: false,
    },
  )

  const planets = c.planets
    .filter((p: { name: string }) => CORE_BODIES.includes(p.name))
    .map((p: Parameters<typeof bodyToPlanet>[0]) => bodyToPlanet(p, timeKnown))

  const angles = timeKnown ? {
    ascendant: bodyToPlanet({ ...c.angles.ascendant, name: 'Ascendant' }, true),
    midheaven: bodyToPlanet({ ...c.angles.midheaven, name: 'Midheaven' }, true),
  } : { ascendant: null, midheaven: null }

  // 十大主星之间的相位(不含小行星, 客户盘干净)
  const core = c.planets.filter((p: { name: string }) => CORE_BODIES.includes(p.name))
  const { aspects: rawAspects } = calculateAspects(
    core.map((p: { name: string; longitude: number; longitudeSpeed: number }) => ({
      name: p.name, longitude: p.longitude, longitudeSpeed: p.longitudeSpeed,
    })),
    { aspectTypes: [AspectType.Conjunction, AspectType.Sextile, AspectType.Square, AspectType.Trine, AspectType.Opposition] },
  )
  const aspects: ChartAspect[] = rawAspects.map((a: {
    body1: string; body2: string; type: string; deviation: number; isApplying: boolean | null; symbol: string
  }) => ({
    a: a.body1, b: a.body2, type: a.type, typeZh: ASPECT_ZH[a.type] ?? a.type,
    symbol: a.symbol, orb: toPct(a.deviation), applying: a.isApplying,
  }))

  // 互溶接纳 (十星之间, 与盘面同一守护流派)
  const receptions = computeReceptions(planets.map(p => ({ name: p.name, sign: p.sign })))

  return {
    input: birth,
    houseSystemUsed: system,
    timeKnown,
    jd: c.calculated?.julianDate ?? 0,
    planets, angles,
    cusps: timeKnown
      ? (c.houses as unknown as { cusps: (number | { longitude: number })[] }).cusps.map(x => typeof x === 'number' ? x : x.longitude)
      : null,
    aspects, receptions, warnings,
  }
}

// ---------- 证据文本: 喂给 AI 的结构化占断依据 ----------
// 铁律对齐塔罗: 这些位置/相位是"判官", prompt 里 AI 不得改动或臆造
export function chartEvidence(ch: NatalChart): string {
  const b = ch.input
  const lines: string[] = []
  lines.push(`【本命盘数据】(引擎计算, 勿改动)`)
  lines.push(`出生: ${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')} ${b.timeKnown !== false ? `${String(b.hour).padStart(2, '0')}:${String(b.minute).padStart(2, '0')}` : '时间未知'} 当地时间 (UTC${b.timezone >= 0 ? '+' : ''}${b.timezone}) ${b.city ?? ''} 纬度${b.latitude} 经度${b.longitude}`)
  lines.push(`分宫制: ${ch.houseSystemUsed}${ch.timeKnown ? '' : ' (未使用—时间未知)'}`)
  if (ch.angles.ascendant) lines.push(`上升: ${ch.angles.ascendant.signZh} ${ch.angles.ascendant.degInSign}° | 中天: ${ch.angles.midheaven?.signZh} ${ch.angles.midheaven?.degInSign}°`)
  lines.push(`【行星落座落宫】`)
  for (const p of ch.planets) {
    const dig = p.dignity && p.dignity.state !== 'Peregrine' ? ` [尊贵:${p.dignity.state}/${p.dignity.strength > 0 ? '+' : ''}${p.dignity.strength}]` : ''
    lines.push(`- ${p.symbol}${p.zh}: ${p.signZh}座 ${p.degInSign}°${p.house ? ` 落${p.house}宫` : ''}${p.retrograde ? ' 逆行' : ''}${dig}`)
  }
  lines.push(`【主要相位】(按紧密度排序, orb 越小力量越强)`)
  const sorted = [...ch.aspects].sort((x, y) => x.orb - y.orb)
  for (const a of sorted.slice(0, 14)) {
    const app = a.applying === true ? ', 入相(作用增强)' : a.applying === false ? ', 出相(作用减弱)' : ''
    lines.push(`- ${PLANET_ZH[a.a]}${a.typeZh}${PLANET_ZH[a.b]} (误差${a.orb}°${app})`)
  }
  if (ch.receptions.length) {
    lines.push(`【互溶接纳】(星体做客/房东关系, 互溶=双向互客)` )
    const seen = new Set<string>()
    for (const r of ch.receptions) {
      const key = [r.a, r.b].sort().join('|')
      if (seen.has(key)) continue
      const kindZh = RULER_KIND_ZH[r.kind]
      if (r.mutual) {
        const rev = ch.receptions.find(x => x.a === r.b && x.b === r.a)
        seen.add(key)
        // r: A住r.bySign=B之家(kind); rev: B住rev.bySign=A之家(rev.kind)
        lines.push(`- 互溶: ${PLANET_ZH[r.a]} ↔ ${PLANET_ZH[r.b]} (${PLANET_ZH[r.a]}居${SIGNS_ZH[r.bySign] ?? r.bySign}=${PLANET_ZH[r.b]}之${kindZh}, ${PLANET_ZH[r.b]}居${rev ? SIGNS_ZH[rev.bySign] ?? rev.bySign : '?'}=${PLANET_ZH[r.a]}之${rev ? RULER_KIND_ZH[rev.kind] : ''})`)
      } else {
        seen.add(key)
        lines.push(`- ${PLANET_ZH[r.b]}接纳${PLANET_ZH[r.a]} (${PLANET_ZH[r.a]}居${SIGNS_ZH[r.bySign] ?? r.bySign}=${PLANET_ZH[r.b]}之${kindZh})`)
      }
    }
  }
  if (ch.warnings.length) {
    lines.push(`【精度声明】`)
    for (const w of ch.warnings) lines.push(`! ${w}`)
  }
  return lines.join('\n')
}
