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
  | 'morinus' | 'vettius'   // 封装层自算: MC等宫 / 卦限三分 (celestine 无, 数学公开)

// 宫制清单 + 双语标签 (单一数据源: 顶栏/设置面板/URL 共用)
export const HOUSE_SYSTEM_LIST: { id: HouseSystem; zh: string; en: string }[] = [
  { id: 'placidus', zh: '普拉西德', en: 'Placidus' },
  { id: 'koch', zh: '科赫', en: 'Koch' },
  { id: 'equal', zh: '等宫', en: 'Equal' },
  { id: 'whole-sign', zh: '整宫', en: 'Whole Sign' },
  { id: 'porphyry', zh: '波菲里', en: 'Porphyry' },
  { id: 'regiomontanus', zh: '雷吉奥', en: 'Regiomontanus' },
  { id: 'campanus', zh: '坎帕努斯', en: 'Campanus' },
  { id: 'morinus', zh: '莫里努斯', en: 'Morinus' },
  { id: 'vettius', zh: '维提乌斯', en: 'Vettius' },
]
export const HOUSE_SYSTEM_ZH: Record<string, string> = Object.fromEntries(HOUSE_SYSTEM_LIST.map((h) => [h.id, h.zh]))

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
  kind: 'planet' | 'asteroid' | 'point'  // 分层渲染依据: 星球/小行星/虚点符号
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
  type: string      // conjunction|sextile|square|trine|opposition|+minor
  typeZh: string
  symbol: string
  orb: number       // 偏离整相位的度数(越小越紧)
  applying: boolean | null
}

// ---------- 排盘设置 (设置面板 → URL → API → 引擎) ----------
export type BodyGroup = 'asteroids' | 'chiron' | 'nodes' | 'lots' | 'lilith'
export interface CastSettings {
  /** 天体分组开关 (十主星恒含) */
  bodies?: Partial<Record<BodyGroup, boolean>>
  /** 交点类型 (默认 true) */
  nodeType?: 'true' | 'mean'
  /** 莉莉丝类型 (默认 mean) */
  lilithType?: 'mean' | 'true' | 'both'
  /** 参与相位计算/展示的相位类型 (默认五大) */
  aspectTypes?: string[]
  /** 各相位容许度覆盖 (度) */
  orbs?: Record<string, number>
  /** 跨星座相位 (默认开) */
  outOfSign?: boolean
  /** 跨星座相位强度惩罚 0~1 (默认0) */
  oosPenalty?: number
  /** 相位最低强度 0~100 (默认0) */
  minStrength?: number
  /** 相位参与范围: core=十主星 planets=+凯龙交点等主虚点 asteroids=+小行星 all=全部(默认) */
  aspectScope?: 'core' | 'planets' | 'asteroids' | 'all'
  /** 真太阳时校正 (钟表时→视太阳时; 经度差+时差公式) */
  trueSolar?: boolean
  /** 盘面显示偏好 (渲染层) */
  display?: {
    dir?: 'ccw' | 'cw'          // 逆时针(默认)/顺时针盘
    ascPos?: 'left' | 'top'     // ASC 在左(默认)/在上
    aspects?: boolean           // 相位线 (默认开)
    feet?: boolean              // 脚线刻度 (默认开)
    nums?: boolean              // 宫号 (默认开)
    ticks?: boolean             // 度刻度针脚 (默认开)
  }
}

export interface NatalChart {
  input: BirthData
  settings: CastSettings
  houseSystemUsed: HouseSystem
  timeKnown: boolean
  jd: number
  planets: ChartPlanet[]
  angles: { ascendant: ChartPlanet | null; midheaven: ChartPlanet | null }
  cusps: number[] | null
  aspects: ChartAspect[]
  receptions: Reception[]
  hourRuler: string | null // 时主星 (英文星名; 未知时间=null)
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
  'North Node': '北交点', 'South Node': '南交点', 'True North Node': '真北交点', 'True South Node': '真南交点',
  'Mean North Node': '平北交点', 'Mean South Node': '平南交点',
  'Mean Lilith': '平均莉莉丝', 'True Lilith': '真莉莉丝',
  'Part of Fortune': '福点', 'Part of Spirit': '精神点', Vertex: '宿命点',
  Ascendant: '上升', Midheaven: '中天',
}
const PLANET_SYMBOL: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃',
  Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇', Chiron: '⚷',
  Ceres: '⚳', Pallas: '⚴', Juno: '⚵', Vesta: '⚶',
  'North Node': '☊', 'South Node': '☋', 'True North Node': '☊', 'True South Node': '☋',
  'Mean North Node': '☊', 'Mean South Node': '☋',
  'Mean Lilith': '⚸', 'True Lilith': '⚸', 'Part of Fortune': '⊕', 'Part of Spirit': '⊖',
  Vertex: '⎈', Ascendant: 'ASC', Midheaven: 'MC',
}
// 分层: 渲染时行星=星球实体, 小行星=小球, 虚点=纯符号
const BODY_KIND: Record<string, 'planet' | 'asteroid' | 'point'> = {
  Ceres: 'asteroid', Pallas: 'asteroid', Juno: 'asteroid', Vesta: 'asteroid',
  Chiron: 'point', 'North Node': 'point', 'South Node': 'point',
  'True North Node': 'point', 'True South Node': 'point',
  'Mean North Node': 'point', 'Mean South Node': 'point',
  'Mean Lilith': 'point', 'True Lilith': 'point',
  'Part of Fortune': 'point', 'Part of Spirit': 'point', Vertex: 'point',
}
const ASPECT_ZH: Record<string, string> = {
  conjunction: '合', sextile: '六合', square: '刑', trine: '拱', opposition: '冲',
  quincunx: '梅花', 'semi-sextile': '半六合', 'semi-square': '半刑', sesquiquadrate: '倍半刑',
  quintile: '五分相', biquintile: '倍五分相', septile: '七分相', novile: '九分相', decile: '十分相',
}
export const PLANET_ZH_OF = (n: string) => PLANET_ZH[n] ?? n
export const ASPECT_SYMBOL_OF = (n: string) => PLANET_SYMBOL[n] ?? n
export const ASPECT_ZH_OF = (t: string) => ASPECT_ZH[t] ?? t

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
// 十主星 (默认盘面; 小行星/虚点由 settings.bodies 开关追加)
const CORE_BODIES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
]
// 高纬 Placidus 数学不收敛区
const HIGH_LAT = 66.5

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
    kind: BODY_KIND[raw.name] ?? 'planet',
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

// ---------- 真太阳时校正 ----------
// 钟表时 → 视太阳时: ①经度差 (每偏时区中央经线1°=4分钟, 东经为正) ②均时差EoT(Meeus 28.4, 分钟)
function equationOfTimeMinutes(jd: number): number {
  const T = (jd - 2451545) / 36525
  const L0 = (280.4664567 + 36000.76983 * T + 0.0003032 * T * T) % 360 // 太阳平黄经
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360    // 太阳平近点角
  const Mr = M * DEG2R
  const eps = (23.439291 - 0.0130042 * T) * DEG2R
  const y = Math.tan(eps / 2) ** 2
  const l0r = L0 * DEG2R
  const eot =
    y * Math.sin(2 * l0r) - 2 * 0.016708 * Math.sin(Mr) +
    4 * 0.016708 * y * Math.sin(Mr) * Math.cos(2 * l0r) -
    0.5 * y * y * Math.sin(4 * l0r) - 1.25 * 0.016708 * 0.016708 * Math.sin(2 * Mr)
  return (eot * 180 / Math.PI) * 4 // 度→分钟 (1°=4m)
}
const DEG2R = Math.PI / 180

function applyTrueSolar(birth: BirthData, timeKnown: boolean, warnings: string[]): BirthData {
  if (!timeKnown) return birth
  // 先以钟表时粗算 JD 求均时差 (EoT 日变化<30s, 一次迭代足够)
  const jd0 = Date.UTC(birth.year, birth.month - 1, birth.day, birth.hour, birth.minute) / 86400000
    - birth.timezone / 24 + 2440587.5
  const lonCorrection = (birth.longitude - birth.timezone * 15) * 4 // 分钟, 东经偏东为正
  const eot = equationOfTimeMinutes(jd0)
  const shiftMin = lonCorrection + eot
  if (Math.abs(shiftMin) < 0.5) return birth
  const total = birth.hour * 60 + birth.minute + shiftMin
  const wrapped = ((total % 1440) + 1440) % 1440
  const dayShift = Math.floor(total / 1440) // 跨日(如时差+经度差把子时推到前一日)
  const d = new Date(Date.UTC(birth.year, birth.month - 1, birth.day + dayShift))
  warnings.push(`真太阳时校正: 钟表时${birth.hour}:${String(birth.minute).padStart(2, '0')} → 视太阳时${Math.floor(wrapped / 60)}:${String(Math.round(wrapped % 60)).padStart(2, '0')} (经度${lonCorrection >= 0 ? '+' : ''}${lonCorrection.toFixed(1)}m + 均时差${eot >= 0 ? '+' : ''}${eot.toFixed(1)}m)`)
  return {
    ...birth,
    year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
    hour: Math.floor(wrapped / 60), minute: Math.round(wrapped % 60),
  }
}

// ---------- Morinus / Vettius 分宫 (封装层自算, celestine 无) ----------
// Morinus: 自ASC起12等分黄道 (以赤经起算的等宫制, 简化为黄道等分自ASC)
// Vettius: 四分仪制 — ASC/MC 定四轴后, 每卦限(12宫象限)三等分
function cuspsFor(system: HouseSystem, asc: number, mc: number): number[] | null {
  if (system === 'morinus') {
    return Array.from({ length: 12 }, (_, i) => norm(asc + i * 30))
  }
  if (system === 'vettius') {
    // 四分仪三等分 (Porphyry/Vettius): 四轴按黄经增方向从ASC起排, 相邻轴间三等分
    // 通用: 取各轴相对ASC的[0,360)偏移排序 → 逐卦限插两点
    const ic = norm(mc + 180), dsc = norm(asc + 180)
    const rel = [0, norm(ic - asc), norm(dsc - asc), norm(mc - asc)].sort((a, b) => a - b)
    const out: number[] = []
    for (let i = 0; i < 4; i++) {
      const a0 = asc + rel[i]
      const a1 = i < 3 ? asc + rel[i + 1] : asc + 360
      const span = a1 - a0
      out.push(norm(a0), norm(a0 + span / 3), norm(a0 + 2 * span / 3))
    }
    return out.slice(0, 12)
  }
  return null // celestine 原生支持
}

// ---------- 时主星 (Hour Ruler) ----------
// 通行法: 当日0点所在宫由星期主星值日, 此后每1小时按加尔迪亚序 (土木火日金月水) 递推
// 参照验证: 1998-02-19 (周四, 木星日) 09:50 → 太阳 ☉, 与宫神星显示一致
const CHALDEAN = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon']
const DAY_RULER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] // index = getUTCDay (0=周日)
export function hourRulerOf(y: number, mo: number, d: number, hour: number): string {
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay()
  return CHALDEAN[(CHALDEAN.indexOf(DAY_RULER[dow]) + hour) % 7]
}

// ---------- 主入口: 排盘 ----------
export function castNatalChart(birth: BirthData, settings: CastSettings = {}): NatalChart {
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

  // 真太阳时校正 (可选): 钟表时 → 视太阳时
  const effBirth = settings.trueSolar ? applyTrueSolar(birth, timeKnown, warnings) : birth

  // 天体分组开关 (默认只开十主星, 与旧行为一致)
  const B = settings.bodies ?? {}
  const c = calculateChart(
    {
      year: effBirth.year, month: effBirth.month, day: effBirth.day,
      hour: timeKnown ? effBirth.hour : 12,
      minute: timeKnown ? effBirth.minute : 0,
      second: 0,
      timezone: effBirth.timezone,
      latitude: effBirth.latitude, longitude: effBirth.longitude,
    },
    {
      houseSystem: (['morinus', 'vettius'].includes(system) ? 'placidus' : system) as 'placidus' | 'koch' | 'equal' | 'whole-sign' | 'porphyry' | 'regiomontanus' | 'campanus',
      includeAsteroids: !!B.asteroids, includeChiron: !!B.chiron,
      includeNodes: B.nodes ? (settings.nodeType ?? 'true') : false,
      includeLots: !!B.lots, includeLilith: B.lilith ? (settings.lilithType ?? 'mean') : false,
    },
  )

  const planets = c.planets
    .map((p: Parameters<typeof bodyToPlanet>[0]) => bodyToPlanet(p, timeKnown))
  // 虚点合并: 交点/莉莉丝/福精点 (结构同行星, 无速度/尊贵)
  const extra: ChartPlanet[] = []
  for (const n of (c.nodes ?? []) as { name: string; type?: string; longitude: number; signName: string; degree: number; minute: number; formatted: string; house?: number }[]) {
    const nm = n.type === 'Mean' ? `Mean ${n.name}` : n.type === 'True' ? `True ${n.name}` : n.name
    extra.push(bodyToPlanet({ ...n, name: nm }, timeKnown))
  }
  for (const l of (c.lilith ?? []) as { name: string; longitude: number; signName: string; degree: number; minute: number; formatted: string; house?: number }[]) {
    extra.push(bodyToPlanet({ ...l, name: l.name }, timeKnown))
  }
  for (const lot of (c.lots ?? []) as { name: string; longitude: number; signName: string; degree: number; minute: number; formatted: string; house?: number }[]) {
    extra.push(bodyToPlanet({ ...lot, name: lot.name }, timeKnown))
  }
  const allBodies = [...planets, ...extra]

  const angles = timeKnown ? {
    ascendant: bodyToPlanet({ ...c.angles.ascendant, name: 'Ascendant' }, true),
    midheaven: bodyToPlanet({ ...c.angles.midheaven, name: 'Midheaven' }, true),
  } : { ascendant: null, midheaven: null }

  // Morinus/Vettius: 用四轴自算宫头 (celestine 的宫头仅对 placidus 系有效)
  let cuspsOut: number[] | null = null
  if (timeKnown) {
    const rawCusps = (c.houses as unknown as { cusps: (number | { longitude: number })[] }).cusps.map(x => typeof x === 'number' ? x : x.longitude)
    const selfCusps = cuspsFor(system, rawCusps[0], rawCusps[9])
    cuspsOut = selfCusps ?? rawCusps
    if (selfCusps) {
      // 自算宫制: 重挂所有天体的宫位号 (按宫头区间)
      const assign = (p: ChartPlanet) => {
        for (let h = 0; h < 12; h++) {
          const a0 = norm(selfCusps[h]), span = norm(selfCusps[(h + 1) % 12] - a0 + 360) % 360 || 30
          const rel = norm(p.longitude - a0)
          if (rel < span) { p.house = h + 1; break }
        }
      }
      if (timeKnown) allBodies.forEach(assign)
    }
  }

  // 相位: 类型/容许度/跨星座/强度/范围 全由设置驱动
  const at = (settings.aspectTypes?.length ? settings.aspectTypes : ['conjunction', 'sextile', 'square', 'trine', 'opposition']) as AspectType[]
  const orbsCfg = settings.orbs as Partial<Record<AspectType, number>> | undefined
  const scope = settings.aspectScope ?? 'all'
  const SCOPE_PLANETS = new Set([...CORE_BODIES, 'Chiron', 'True North Node', 'True South Node', 'Mean North Node', 'Mean South Node', 'North Node', 'South Node'])
  const scopeBodies = allBodies.filter((p) =>
    scope === 'all' ? true
      : scope === 'asteroids' ? (SCOPE_PLANETS.has(p.name) || p.kind === 'asteroid')
      : scope === 'planets' ? SCOPE_PLANETS.has(p.name)
      : CORE_BODIES.includes(p.name))
  const { aspects: rawAspects } = calculateAspects(
    scopeBodies.map((p) => ({
      name: p.name, longitude: p.longitude, longitudeSpeed: p.speed,
    })),
    {
      aspectTypes: at, orbs: orbsCfg,
      includeOutOfSign: settings.outOfSign !== false,
      outOfSignPenalty: settings.oosPenalty ?? 0,
      minimumStrength: settings.minStrength ?? 0,
    },
  )
  const aspects: ChartAspect[] = rawAspects.map((a: {
    body1: string; body2: string; type: string; deviation: number; isApplying: boolean | null; symbol: string
  }) => ({
    a: a.body1, b: a.body2, type: a.type, typeZh: ASPECT_ZH[a.type] ?? a.type,
    symbol: a.symbol, orb: toPct(a.deviation), applying: a.isApplying,
  }))

  // 互溶接纳 (全部天体, 与盘面同一守护流派)
  const receptions = computeReceptions(allBodies.map(p => ({ name: p.name, sign: p.sign })))

  return {
    input: birth,
    settings,
    houseSystemUsed: system,
    timeKnown,
    jd: c.calculated?.julianDate ?? 0,
    planets: allBodies, angles,
    hourRuler: timeKnown ? hourRulerOf(birth.year, birth.month, birth.day, birth.hour) : null,
    cusps: cuspsOut,
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
  if (ch.hourRuler) lines.push(`时主星: ${PLANET_ZH[ch.hourRuler] ?? ch.hourRuler} (零点起加尔迪亚序)`)
  {
    const s = ch.settings ?? {}
    const bg = Object.entries(s.bodies ?? {}).filter(([, v]) => v).map(([k]) => ({ asteroids: '小行星', chiron: '凯龙', nodes: '交点', lots: '点位', lilith: '莉莉丝' })[k] ?? k)
    const at = s.aspectTypes && s.aspectTypes.length !== 5 ? `相位${s.aspectTypes.length}种` : null
    const ob = s.orbs && Object.keys(s.orbs).length ? `自定义容许度(${Object.entries(s.orbs).map(([k, v]) => `${ASPECT_ZH[k] ?? k}±${v}°`).join(' ')})` : null
    const bits = [
      bg.length ? `含${bg.join('、')}` : null, at, ob,
      s.aspectScope && s.aspectScope !== 'all' ? `相位范围=${({ core: '仅十主星', planets: '主星+虚点', asteroids: '含小行星' })[s.aspectScope]}` : null,
      s.minStrength ? `相位最低强度${s.minStrength}%` : null,
      s.outOfSign === false ? '不计跨星座相位' : null,
      s.nodeType === 'mean' ? '交点用平交点' : null,
      s.lilithType && s.lilithType !== 'mean' ? `莉莉丝=${s.lilithType}` : null,
      s.trueSolar ? '已真太阳时校正' : null,
    ].filter(Boolean)
    if (bits.length) lines.push(`排盘设置: ${bits.join('; ')}`)
  }
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
