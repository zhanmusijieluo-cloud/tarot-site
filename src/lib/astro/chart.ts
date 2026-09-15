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
  | 'morinus' | 'vettius'   // 封装层自算 (celestine 无)
  | 'alcabitiuses' | 'sripati' | 'pullen' | 'polich-page' | 'krusinski' | 'carter' | 'vehlow'   // 封装层自算 (对拍 Swiss Ephemeris 官方算法)

// 宫制清单 + 双语标签 (单一数据源: 顶栏/设置面板/URL 共用)
export const HOUSE_SYSTEM_LIST: { id: HouseSystem; zh: string; en: string }[] = [
  { id: 'placidus', zh: '普拉西德', en: 'Placidus' },
  { id: 'koch', zh: '科赫', en: 'Koch' },
  { id: 'equal', zh: '等宫', en: 'Equal' },
  { id: 'whole-sign', zh: '整宫', en: 'Whole Sign' },
  { id: 'porphyry', zh: '波菲里', en: 'Porphyry' },
  { id: 'regiomontanus', zh: '雷吉奥', en: 'Regiomontanus' },
  { id: 'campanus', zh: '坎帕努斯', en: 'Campanus' },
  { id: 'alcabitiuses', zh: '阿卡比特', en: 'Alcabitius' },
  { id: 'sripati', zh: '斯里帕蒂', en: 'Sripati' },
  { id: 'vehlow', zh: '维洛等宫', en: 'Vehlow' },
  { id: 'pullen', zh: '普伦SD', en: 'Pullen SD' },
  { id: 'morinus', zh: '莫里努斯', en: 'Morinus' },
  { id: 'polich-page', zh: '波利奇-佩奇', en: 'Polich-Page' },
  { id: 'krusinski', zh: '克鲁辛斯基', en: 'Krusinski' },
  { id: 'carter', zh: '卡特赤经', en: 'Carter' },
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
  /** 古典五级尊贵明细 (爸爸定标: 三分/界/面/岐度 与庙旺并列) */
  triplicity?: { day: string; night: string; coop: string; active: string }
  term?: string            // 界主 (埃及界)
  face?: string            // 面主 (十分度)
  critical?: boolean       // 岐度 (紧要度数±1°)
}

export interface ChartAspect {
  a: string; b: string
  type: string      // conjunction|sextile|square|trine|opposition|+minor
  typeZh: string
  symbol: string
  orb: number       // 偏离整相位的度数(越小越紧)
  applying: boolean | null
  actualAngle?: number  // 两星实际角距 0-180° (爸爸: 弹窗要显示实际度数, 不是只给理论相位)
}

// ---------- 古典五级尊贵规则表 (公开公版知识) ----------
// 三分主星 (都勒斯 Dorothean triplicities): 火=日/木/土 土=金/月/火 风=土/水/木 水=金/火/月 (宫神星同源)
const TRIPLICITY: Record<string, { day: string; night: string; coop: string }> = {
  fire: { day: 'Sun', night: 'Jupiter', coop: 'Saturn' },
  earth: { day: 'Venus', night: 'Moon', coop: 'Mars' },
  air: { day: 'Saturn', night: 'Mercury', coop: 'Jupiter' },
  water: { day: 'Venus', night: 'Mars', coop: 'Moon' },
}
const ELEM_OF_SIGN = ['fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water']
// 埃及界 (Egyptian Terms): 每星座5段 [行星, 截止度数)
const EGYPTIAN_TERMS: [string, number][][] = [
  [['Jupiter',6],['Venus',14],['Mercury',21],['Mars',26],['Saturn',30]],
  [['Venus',8],['Mercury',14],['Jupiter',22],['Saturn',27],['Mars',30]],
  [['Mercury',6],['Venus',12],['Jupiter',17],['Mars',24],['Saturn',30]],
  [['Mars',7],['Venus',13],['Mercury',19],['Jupiter',26],['Saturn',30]],
  [['Jupiter',6],['Venus',11],['Saturn',18],['Mercury',24],['Mars',30]],
  [['Mercury',7],['Venus',17],['Mars',21],['Jupiter',28],['Saturn',30]],
  [['Saturn',6],['Mercury',14],['Venus',21],['Mars',28],['Jupiter',30]],
  [['Mars',7],['Venus',11],['Mercury',19],['Jupiter',24],['Saturn',30]],
  [['Jupiter',12],['Venus',17],['Mercury',21],['Saturn',26],['Mars',30]],
  [['Mars',7],['Venus',14],['Mercury',22],['Jupiter',26],['Saturn',30]],
  [['Saturn',6],['Mercury',13],['Venus',20],['Mars',25],['Jupiter',30]],
  [['Venus',12],['Jupiter',16],['Mercury',19],['Mars',28],['Saturn',30]],
]
// 面 (Chaldean decan faces): 每星座3个十分度
const FACES: string[][] = [
  ['Mars','Sun','Venus'],  ['Mercury','Moon','Saturn'],  ['Jupiter','Mars','Sun'],
  ['Venus','Mercury','Moon'],  ['Saturn','Jupiter','Mars'],  ['Sun','Venus','Mercury'],
  ['Moon','Saturn','Jupiter'],  ['Mars','Sun','Venus'],  ['Mercury','Moon','Saturn'],
  ['Jupiter','Mars','Sun'],  ['Venus','Mercury','Moon'],  ['Saturn','Jupiter','Mars'],
]
// 岐度/紧要度数 (Critical Degrees, 容许±1°): 基本宫1/13/26, 固定宫9/21, 变动宫4/17 — 爸爸PPT32+宫神星同款
const CRITICAL_DEG = [1, 13, 26, 9, 21, 4, 17]
const CRITICAL_SIGN = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3] // 0=基本 1=固定 2=变动

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
    feet?: boolean              // 脚线 (默认: 仅选中星显示; true=常显)
    feetAlways?: boolean        // 脚线常显开关
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
  combust: string[]        // 焦身/燃烧段名单 (距日17′~8°30′, 星性难发挥)
  Cazimi?: string[]        // 日核: 距日 0°~17′ (PPT33) 如皇帝内臣, 倍受宠爱反强
  underBeams?: string[]    // 在日光下: 距日 8°30′~17° (PPT33) 受影响程度轻, 兼有"近贵" 
  viaCombusta: string[]    // 燃烧之路 (巨蟹14°55′—摩羯14°55′ 之间)
  /** 阿拉伯点 (宫神星"阿拉伯点"表): 福/精/物质/婚姻(男/女)/子女 */
  arabicLots?: { key: string; zh: string; en: string; longitude: number }[]
  /** 每宫宫头宫神星 (almuten: 庙5旺4三分3界2面1 计分最高者, 12项; 宫头未知=[]) */
  cuspAlmuten?: string[]
  /** 月亮空亡 (出座前不再与其他七政精确成相) */
  moonVoid?: boolean
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
  Ascendant: '上升', Midheaven: '中天', Descendant: '下降', IC: '天底',
}
const PLANET_SYMBOL: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃',
  Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇', Chiron: '⚷',
  Ceres: '⚳', Pallas: '⚴', Juno: '⚵', Vesta: '⚶',
  'North Node': '☊', 'South Node': '☋', 'True North Node': '☊', 'True South Node': '☋',
  'Mean North Node': '☊', 'Mean South Node': '☋',
  'Mean Lilith': '⚸', 'True Lilith': '⚸', 'Part of Fortune': '⊕', 'Part of Spirit': '⊖',
  Vertex: '⎈', Ascendant: 'ASC', Midheaven: 'MC', Descendant: 'DSC', IC: 'IC',
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

// ---------- 互容接纳 (Reception) ----------
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
type RulerKind = 'domicile' | 'exaltation' | 'triplicity' | 'detriment' | 'fall'
const RULER_KIND_ZH: Record<RulerKind, string> = {
  domicile: '庙座', exaltation: '耀升', triplicity: '三分', detriment: '失势', fall: '落陷',
}

export interface Reception {
  a: string          // 行星A (落座者)
  b: string          // 行星B (座主)
  kind: RulerKind    // A 住在 B 的什么宫里
  mutual: boolean    // 互容: 双向同住
  aspected: boolean  // 两星是否成相位 (古典规则: 单向接纳必须有相位; 互容无相位=慷慨Ibn Ezra, 仍成立)
  bySign: string     // 发生在哪个星座(展示用)
}

/**
 * 互容接纳表: A 落在 B 守护/耀升的星座 → B 接纳 A; 双向同住 = 互容 (mutual reception)
 * 守护表用 celestine getSignInfo (现代守护, 与主盘 dignities 同流派, 不混古典守护以免自相矛盾)
 */
export function computeReceptions(
  planets: { name: string; sign: string }[],
  opts: { traditional?: boolean; aspectPairs?: string[]; triplicityActive?: Record<string, string> } = {},
): Reception[] {
  const aspSet = new Set(opts.aspectPairs ?? [])
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
      else if (opts.triplicityActive?.[a.sign] === b.name) kind = 'triplicity'  // 三分主星接纳 (都勒斯, 昼夜取主)
      if (!kind) continue
      // 查反向: B 是否也住在 A 的庙/耀升座 → 互容
      const rev = hostOf(b.sign)
      const mutual = rev.ruler === a.name || rev.exalt === a.name || opts.triplicityActive?.[b.sign] === a.name
      // 两个方向各记一条(不吞信息), 展示层按 pair 归并显示"互容"
      const pairKey = [a.name, b.name].sort().join('|')
      out.push({ a: a.name, b: b.name, kind, mutual, aspected: aspSet.has(pairKey), bySign: a.sign })
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

// ---------- 自算宫制 (封装层实现, celestine 无) ----------
// 数学均译自 Swiss Ephemeris 官方源码 swehouse.c (GPL, aloistr/swisseph), 已逐制对拍验证:
// · Morinus('M'): 赤经等分 — equator points (RAMC + n*30) 逐点投影回黄道 (swe_cotrans)
// · Alcabitius('B'): ASC 赤经半弧三分, 沿赤纬圈(极高0)投影到黄道
// · Sripati('S') / Pullen SD('L') / Vehlow('V') / Carter('F'): 黄道/赤经三角公式
// · Polich-Page('T'): 每宫头用"极高度 f"的 Asc1 大圆交点公式 (topocentric 同款)
// · Krusinski('U'): Asc-天顶大圆 12 等分, 三次坐标变换往返投影
// 注: ASC/MC/其余轴仍由 celestine (已对拍 SE ≤0.004°) 提供, 此处只算 12 宫头。
const D2R = Math.PI / 180
const R2D = 180 / Math.PI
const nrm = (x: number): number => ((x % 360) + 360) % 360
const sind = (x: number): number => Math.sin(x * D2R)
const cosd = (x: number): number => Math.cos(x * D2R)
const tand = (x: number): number => Math.tan(x * D2R)
const asind = (x: number): number => Math.asin(Math.max(-1, Math.min(1, x))) * R2D
const acosd = (x: number): number => Math.acos(Math.max(-1, Math.min(1, x))) * R2D
const atand = (x: number): number => Math.atan(x) * R2D
const atan2d = (y: number, x: number): number => Math.atan2(y, x) * R2D
const dif360 = (x: number): number => ((x + 180) % 360 + 360) % 360 - 180

/** 黄赤交角 (IAU 多项式, °) */
function obliquityOf(jd: number): number {
  const T = (jd - 2451545.0) / 36525
  return 23.4392911 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T
}

/** swe_cotrans 等价 (绕 X 轴坐标旋转, 全 3D 保真): 本约定 +ε = 黄道→赤道 (SE 符号相反, 翻译时取负) */
/** swe_cotrans 逐行等价 (swephlib.c): polcart(x[2]=1) → coortrf(y'=y·c+z·s; z'=-y·s+z·c) → cartpol
 *  注意与引擎内其他代码的旋转方向约定不同 — 这是 SE 原文语义 (Krusinski 专用) */
function cotransEcl(lon: number, latDeg: number, rot: number): [number, number] {
  const x = cosd(latDeg) * cosd(lon)
  const y = cosd(latDeg) * sind(lon)
  const z = sind(latDeg)
  const e = rot * D2R
  const y2 = y * Math.cos(e) + z * Math.sin(e)
  const z2 = -y * Math.sin(e) + z * Math.cos(e)
  const rxy = Math.sqrt(x * x + y2 * y2)
  let lonOut = Math.atan2(y2, x); if (lonOut < 0) lonOut += 2 * Math.PI
  const latOut = rxy !== 0 ? Math.atan(z2 / rxy) : (z2 >= 0 ? Math.PI / 2 : -Math.PI / 2)
  return [nrm(lonOut * R2D), latOut * R2D]
}

/** SE Asc1 等价: 求赤经 x1 处、极高度 f 的大圆与黄道交点黄经 (swehouse.c Asc1/Asc2) */
function asc1(x1: number, f: number, sine: number, cose: number): number {
  x1 = nrm(x1)
  if (Math.abs(90 - f) < 1e-8) return 180
  if (Math.abs(90 + f) < 1e-8) return 0
  const asc2 = (x: number, ff: number): number => {
    let ass = -tand(ff) * sine + cose * cosd(x)
    if (Math.abs(ass) < 1e-10) ass = 0
    let sx = sind(x)
    if (Math.abs(sx) < 1e-10) sx = 0
    let out: number
    if (sx === 0) out = ass < 0 ? -1e-8 : 1e-8
    else if (ass === 0) out = sx < 0 ? -90 : 90
    else out = atand(sx / ass)
    if (out < 0) out = 180 + out
    return out
  }
  const n = Math.floor(x1 / 90) + 1
  let ass: number
  if (n === 1) ass = asc2(x1, f)
  else if (n === 2) ass = 180 - asc2(180 - x1, -f)
  else if (n === 3) ass = 180 + asc2(x1 - 180, -f)
  else ass = 360 - asc2(360 - x1, f)
  return nrm(ass)
}

/** SE 通用尾处理: 4-9 宫头 = 10-3 宫头 +180 */
function mirrorCusps(c: number[]): number[] {
  return [c[0], c[1], c[2], nrm(c[9] + 180), nrm(c[10] + 180), nrm(c[11] + 180),
          nrm(c[0] + 180), nrm(c[1] + 180), nrm(c[2] + 180), c[9], c[10], c[11]]
}

/** 自算宫制总入口: 返回 12 宫头 (黄经序, [0]=1宫头=ASC锚); 不在自算集返回 null
 *  ramc=赤经MC(°), fi=地理纬度(°), eps=黄赤交角(°), ascEcl/mcEcl=黄经(°) */
function selfHouseCusps(system: string, ramc: number, fi: number, eps: number, ascEcl: number, mcEcl: number): number[] | null {
  const sine = sind(eps), cose = cosd(eps)

  if (system === 'morinus') {
    // 官方 'M' (swehouse.c 1517): cusp[j] = cotrans(armc + j*30, 0, -ε), j=1..12 顺序:
    // a 从 th 起 +30 步进, 第一个+30 → cusp[11], +60 → cusp[12], +90 → cusp[1], +120 → cusp[2]…
    // 即 cusp[i] = ecl(ramc + (i+2)*30)
    const out: number[] = []
    for (let i = 0; i < 12; i++) {
      const [lon] = cotransEcl(nrm(ramc + (i + 3) * 30), 0, -eps)
      out.push(lon)
    }
    return out
  }
  if (system === 'carter') {
    // 官方 'F' (1541): a=ASC赤经; ra=a+(i-1)*30; cusp = atand(tand(ra)/cose) (i=2,3,10,11,12 独立);
    // 注意 SE 循环含 i=10 → C10 = ASC赤经+270° 的投影点 (≠MC!)
    const [ascRA] = cotransEcl(ascEcl, 0, +eps)
    const eclOfRa = (ra: number): number => nrm(atan2d(sind(ra), cosd(ra) * cose))
    const c2 = eclOfRa(ascRA + 30)
    const c3 = eclOfRa(ascRA + 60)
    const c10 = eclOfRa(ascRA + 270)
    const c11 = eclOfRa(ascRA + 300)
    const c12 = eclOfRa(ascRA + 330)
    return [ascEcl, c2, c3, nrm(c10 + 180), nrm(c11 + 180), nrm(c12 + 180),
            nrm(ascEcl + 180), nrm(c2 + 180), nrm(c3 + 180), c10, c11, c12]
  }
  if (system === 'alcabitiuses') {
    // 官方 'B' (1581): dek=ASC赤纬; sda=arccos(-tanφ·tanδ) 沿赤道量; 三分; Asc1(ra, 0) 投影
    const dek = asind(sind(ascEcl) * sine)
    const r = Math.max(-1, Math.min(1, -tand(fi) * tand(dek)))
    const sda = acosd(r)
    const sna = 180 - sda
    const c11 = asc1(nrm(ramc + sda / 3), 0, sine, cose)
    const c12 = asc1(nrm(ramc + 2 * sda / 3), 0, sine, cose)
    const c2 = asc1(nrm(ramc + 180 - 2 * sna / 3), 0, sine, cose)
    const c3 = asc1(nrm(ramc + 180 - sna / 3), 0, sine, cose)
    return mirrorCusps([ascEcl, c2, c3, 0, 0, 0, nrm(ascEcl + 180), nrm(c2 + 180), nrm(c3 + 180), mcEcl, c11, c12])
  }
  if (system === 'sripati') {
    // 官方 'S' (1581前段): 波菲里象限, 宫头=象限三等分点向轴回缩半格
    const acmc = dif360(ascEcl - mcEcl)
    if (acmc < 0) return null   // 极圈内 ASC/DC 换位 → 主流程降级波菲里
    const q1 = 180 - acmc
    const s1 = q1 / 3, s4 = acmc / 3
    const c1 = nrm(ascEcl - s4 * 0.5)
    const c2 = nrm(ascEcl + s1 * 0.5)
    const c3 = nrm(ascEcl + s1 * 1.5)
    const c10 = nrm(mcEcl - s1 * 0.5)
    const c11 = nrm(mcEcl + s4 * 0.5)
    const c12 = nrm(mcEcl + s4 * 1.5)
    return [c1, c2, c3, nrm(c10 + 180), nrm(c11 + 180), nrm(c12 + 180), nrm(c1 + 180), nrm(c2 + 180), nrm(c3 + 180), c10, c11, c12]
  }
  if (system === 'pullen') {
    // 官方 'L' (Pullen SD / ex Neo-Porphyry)
    const acmc = dif360(ascEcl - mcEcl)
    if (acmc < 0) return null
    const q1 = 180 - acmc
    let d = (acmc - 90) / 4
    const c11 = acmc <= 30 ? nrm(mcEcl + acmc / 2) : nrm(mcEcl + 30 + d)
    const c12 = acmc <= 30 ? c11 : nrm(mcEcl + 60 + 3 * d)
    d = (q1 - 90) / 4
    const c2 = q1 <= 30 ? nrm(ascEcl + q1 / 2) : nrm(ascEcl + 30 + d)
    const c3 = q1 <= 30 ? c2 : nrm(ascEcl + 60 + 3 * d)
    return [ascEcl, c2, c3, nrm(mcEcl + 180), nrm(c11 + 180), nrm(c12 + 180), nrm(ascEcl + 180), nrm(c2 + 180), nrm(c3 + 180), mcEcl, c11, c12]
  }
  if (system === 'vehlow') {
    // 官方 'V': cusp1 = ASC - 15, 之后每 30°
    const c1 = nrm(ascEcl - 15)
    return [c1, nrm(c1 + 30), nrm(c1 + 60), nrm(c1 + 90), nrm(c1 + 120), nrm(c1 + 150),
            nrm(c1 + 180), nrm(c1 + 210), nrm(c1 + 240), nrm(c1 + 270), nrm(c1 + 300), nrm(c1 + 330)]
  }
  if (system === 'polich-page') {
    // 官方 'T' (topocentric): fh1=atand(tanφ/3), fh2=atand(2tanφ/3)
    const fh1 = atand(tand(fi) / 3), fh2 = atand((tand(fi) * 2) / 3)
    const c11 = asc1(nrm(30 + ramc), fh1, sine, cose)
    const c12 = asc1(nrm(60 + ramc), fh2, sine, cose)
    const c2 = asc1(nrm(120 + ramc), fh2, sine, cose)
    const c3 = asc1(nrm(150 + ramc), fh1, sine, cose)
    return mirrorCusps([ascEcl, c2, c3, 0, 0, 0, nrm(ascEcl + 180), nrm(c2 + 180), nrm(c3 + 180), mcEcl, c11, c12])
  }
  if (system === 'krusinski') {
    // 官方 'U' (Bogdan Krusinski 2006): Asc-天顶大圆 12 等分 → 子午圈投影回黄道
    // 逐行复刻 SE swe_cotrans 链: 每次变换保留 (lon,lat) 全部分量传递 (丢纬度分量 = 错 5.6°!);
    // python 全链复现对拍 SE: 6 宫头差 ≤0.0006°
    const a1 = cotransEcl(ascEcl, 0, -eps)                                // A1: ecl → equ
    const a2 = a1[0] - (ramc - 90)                                        // A2: 旋转 (不 nrm 亦可)
    const a3 = cotransEcl(a2, a1[1], -(90 - fi))                          // A3: equ → hor (带A1纬度!)
    const krLon = a3[0]                                                   // krHorizonLon
    const a5 = cotransEcl(0, a3[1], -90)                                  // A4 清零 + A5: hor → house circle
    const latA5 = a5[1]                                                   // A5 后纬度分量 (传入 B1)
    const out: number[] = []
    for (let i = 0; i < 6; i++) {
      // B 链: [30i, latA5] --B1(+90)--> hor --B2(+krLon)--> --B3(90-φ)--> equ --B4(+RAMC-90)--> tan→ecl
      const v1 = cotransEcl(30 * i, latA5, 90)           // B1: house circle → horizontal
      const v2Lon = nrm(v1[0] + krLon)                   // B2
      const v3 = cotransEcl(v2Lon, v1[1], 90 - fi)       // B3: horizontal → equatorial
      const ra2 = nrm(v3[0] + (ramc - 90))               // B4
      out.push(nrm(atand(tand(ra2) / cose) + (ra2 > 90 && ra2 <= 270 ? 180 : 0)))
    }
    // 自检锚: out[0] 应=ASC (链路验证), 否则降级
    if (Math.abs(dif360(out[0] - ascEcl)) > 0.5) return null
    const [c1, c2, c3, c4, c5, c6] = out
    return [c1, c2, c3, c4, c5, c6, nrm(c1 + 180), nrm(c2 + 180), nrm(c3 + 180), nrm(c4 + 180), nrm(c5 + 180), nrm(c6 + 180)]
  }
  return null
}

// ---------- Morinus / Vettius 分宫 (封装层自算, celestine 无) ----------
// Morinus/阿卡比特/斯里帕蒂/普伦/波利奇-佩奇/克鲁辛斯基/卡特/维洛 = 上 selfHouseCusps (官方算法)
// Vettius: 四分仪制 — ASC/MC 定四轴后, 每卦限(12宫象限)三等分
function cuspsFor(system: HouseSystem, asc: number, mc: number): number[] | null {
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
      houseSystem: (['morinus', 'vettius', 'alcabitiuses', 'sripati', 'pullen', 'polich-page', 'krusinski', 'carter', 'vehlow'].includes(system) ? 'placidus' : system) as 'placidus' | 'koch' | 'equal' | 'whole-sign' | 'porphyry' | 'regiomontanus' | 'campanus',
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

  // 古典五级尊贵: 三分主星(都勒斯, 日/夜盘取主)/埃及界/面(十分度)/岐度(紧要度数±1°) — 爸爸定标补全
  // 日/夜盘: 太阳在地平线上方 = 第7~12宫 = 昼盘 (上午09:50太阳第11宫 → 昼盘 ✓)
  const dayChart = (() => {
    const sunp = planets.find((x) => x.name === 'Sun')
    return !!sunp && !!sunp.house && sunp.house >= 7 && sunp.house <= 12
  })()
  for (const p of allBodies) {
    const lon = norm(p.longitude)
    const si = Math.floor(lon / 30)
    const el = ELEM_OF_SIGN[si]
    const tri = TRIPLICITY[el]
    p.triplicity = tri ? { ...tri, active: dayChart ? tri.day : tri.night } : undefined
    const deg = lon % 30
    for (const [pl, end] of EGYPTIAN_TERMS[si]) if (deg < end) { p.term = pl; break }
    p.face = FACES[si][Math.min(2, Math.floor(deg / 10))]
    const mode = CRITICAL_SIGN[si]
    const cand = mode === 0 ? [1, 13, 26] : mode === 1 ? [9, 21] : [4, 17]
    p.critical = cand.some((c) => Math.abs(deg - c) <= 1)
  }

  const angles = timeKnown ? {
    ascendant: bodyToPlanet({ ...c.angles.ascendant, name: 'Ascendant' }, true),
    midheaven: bodyToPlanet({ ...c.angles.midheaven, name: 'Midheaven' }, true),
  } : { ascendant: null, midheaven: null }
  // 四轴也补先天尊贵位主 (黄道状态表 AC/MC 行同宫神星: 三分/界/十度)
  for (const ax of [angles.ascendant, angles.midheaven]) {
    if (!ax) continue
    const lon = norm(ax.longitude)
    const si = Math.floor(lon / 30)
    const tri = TRIPLICITY[ELEM_OF_SIGN[si]]
    ax.triplicity = tri ? { ...tri, active: dayChart ? tri.day : tri.night } : undefined
    const deg = lon % 30
    for (const [pl, end] of EGYPTIAN_TERMS[si]) if (deg < end) { ax.term = pl; break }
    ax.face = FACES[si][Math.min(2, Math.floor(deg / 10))]
  }

  // 自算宫制 (Morinus/阿卡比特/斯里帕蒂/普伦/波利奇-佩奇/克鲁辛斯基/卡特/维提乌斯):
  // 用四轴自算宫头 (celestine 的宫头仅对 placidus 系有效); RAMC 由 MC 黄经反推, ε 用 IAU 多项式
  let cuspsOut: number[] | null = null
  if (timeKnown) {
    const rawCusps = (c.houses as unknown as { cusps: (number | { longitude: number })[] }).cusps.map(x => typeof x === 'number' ? x : x.longitude)
    const SELF_SET = new Set<string>(['morinus', 'alcabitiuses', 'sripati', 'pullen', 'polich-page', 'krusinski', 'carter', 'vehlow'])
    let selfCusps: number[] | null = null
    if (SELF_SET.has(system)) {
      const jdNow = c.calculated?.julianDate ?? 0
      const eps = obliquityOf(jdNow)
      const asc0 = angles.ascendant?.longitude, mc0 = angles.midheaven?.longitude
      if (asc0 !== undefined && mc0 !== undefined) {
        const [ramc] = cotransEcl(mc0, 0, +eps)
        selfCusps = selfHouseCusps(system, ramc, effBirth.latitude, eps, asc0, mc0)
        if (selfCusps === null) {
          // 极圈/病态几何: SE 同款降级波菲里并明示
          warnings.push(`${HOUSE_SYSTEM_ZH[system] ?? system}制在此纬度不可算, 已改用波菲里(Porphyry)制 — 宫位为近似`)
          selfCusps = cuspsFor('porphyry', asc0, mc0)
          system = 'porphyry'
        }
      }
    } else {
      selfCusps = cuspsFor(system, rawCusps[0], rawCusps[9])
    }
    cuspsOut = selfCusps ?? rawCusps
    if (selfCusps) {
      // 自算宫制: 重挂所有天体的宫位号 (按宫头区间)
      const assign = (p: ChartPlanet) => {
        for (let h = 0; h < 12; h++) {
          const a0 = norm(selfCusps![h]), span = norm(selfCusps![(h + 1) % 12] - a0 + 360) % 360 || 30
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
  // 四轴相位 (爸爸: 盘上没四轴相位 — 宫神星/astro.com 标配; DSC=ASC对宫, IC=MC对宫)
  const AXIS_NAMES = ['Ascendant', 'Descendant', 'Midheaven', 'IC'] as const
  const axisBodies: { name: string; longitude: number; longitudeSpeed: number }[] = timeKnown && angles.ascendant && angles.midheaven ? [
    { name: 'Ascendant', longitude: angles.ascendant.longitude, longitudeSpeed: 0 },
    { name: 'Midheaven', longitude: angles.midheaven.longitude, longitudeSpeed: 0 },
    { name: 'Descendant', longitude: norm(angles.ascendant.longitude + 180), longitudeSpeed: 0 },
    { name: 'IC', longitude: norm(angles.midheaven.longitude + 180), longitudeSpeed: 0 },
  ] : []
  const { aspects: rawAspects } = calculateAspects(
    [
      ...scopeBodies.map((p) => ({
        name: p.name, longitude: p.longitude, longitudeSpeed: p.speed,
      })),
      ...axisBodies,
    ],
    {
      aspectTypes: at, orbs: orbsCfg,
      includeOutOfSign: settings.outOfSign !== false,
      outOfSignPenalty: settings.oosPenalty ?? 0,
      minimumStrength: settings.minStrength ?? 0,
    },
  )
  // 过滤 轴×轴: ASC-DSC 恒180°/MC-IC 恒180° 是定义非相位; 轴只与真星体成相
  const axisSet = new Set<string>(AXIS_NAMES)
  const axisAspects = rawAspects.filter((a: { body1: string; body2: string }) =>
    !(axisSet.has(a.body1) && axisSet.has(a.body2)))
  // 两星实际角距 0-180° (爸爸: 弹窗显示实际度数)
  const lonMap = new Map<string, number>([...scopeBodies, ...axisBodies].map((b) => [b.name, b.longitude]))
  const angleBetween = (n1: string, n2: string): number | undefined => {
    const l1 = lonMap.get(n1), l2 = lonMap.get(n2)
    if (l1 === undefined || l2 === undefined) return undefined
    let d = Math.abs(l1 - l2) % 360
    if (d > 180) d = 360 - d
    return toPct(d)
  }
  const aspects: ChartAspect[] = axisAspects.map((a: {
    body1: string; body2: string; type: string; deviation: number; isApplying: boolean | null; symbol: string
  }) => ({
    a: a.body1, b: a.body2, type: a.type, typeZh: ASPECT_ZH[a.type] ?? a.type,
    symbol: a.symbol, orb: toPct(a.deviation), applying: a.isApplying,
    actualAngle: angleBetween(a.body1, a.body2),
  }))

  // 互容接纳 (全部天体, 与盘面同一守护流派)
  const receptions = computeReceptions(allBodies.map(p => ({ name: p.name, sign: p.sign })), {
    aspectPairs: aspects.map(x => [x.a, x.b].sort().join('|')),
    // 三分主星接纳: A 落 B 的三分星座 → 三分级接纳 (都勒斯, 昼夜取主 — 爸爸: 三分主要用来看接纳互容)
    triplicityActive: Object.fromEntries(allBodies.filter(p => p.triplicity).map(p => [p.sign, p.triplicity!.active])),
  })

  // 接近太阳三段 (木木PPT33·宫神星口径): 日核≤17′ / 燃烧17′~8°30′ / 日光下8°30′~17°; 日月本身不适用
  const sunLon = planets.find((p) => p.name === 'Sun')?.longitude
  const combust: string[] = []
  const combustOld: string[] = []
  const cazimi: string[] = []
  const underBeams: string[] = []
  const viaCombusta: string[] = []
  if (sunLon !== undefined) {
    for (const p of allBodies) {
      if (p.name === 'Sun' || p.name === 'Moon') continue
      const sep = Math.abs(((p.longitude - sunLon + 540) % 360) - 180)
      if (sep <= 17) combust.push(p.name) // 兼容字段: 17°内均受影响
      if (sep <= 17 / 60) cazimi.push(p.name)
      else if (sep <= 8.5) combustOld.push(p.name) // 燃烧段 (17′~8°30′, 8.5取8°30′)
      else underBeams.push(p.name)
    }
  }
  // 燃烧之路 Via Combusta (窄版·爸爸定标): ♎14°55′ → ♏14°55′ (秋分点±15°的30°暗区, 托勒密"从螯钳到蝎心")
  for (const p of allBodies) {
    const inZone = ((p.longitude - 194.9167) % 360 + 360) % 360 < 30 // 天秤14°55′起顺行30°内
    if (inZone) viaCombusta.push(p.name)
  }

  // ---------- 阿拉伯点 (宫神星"阿拉伯点"表; Al-Biruni/阿拉伯传承六点) ----------
  const arabicLots: { key: string; zh: string; en: string; longitude: number }[] = []
  if (timeKnown && angles.ascendant) {
    const ascL = angles.ascendant.longitude
    const lonOf = (n: string) => planets.find((p) => p.name === n)?.longitude
    const sunL = lonOf('Sun'), moonL = lonOf('Moon'), jupL = lonOf('Jupiter'),
      merL = lonOf('Mercury'), venL = lonOf('Venus'), satL = lonOf('Saturn')
    if ([sunL, moonL, jupL, merL, venL, satL].every((x) => x !== undefined)) {
      // 福/精: 日盘 福=Asc+月-日 精=Asc+日-月; 夜盘互换 (与 celestine lots 同式)
      arabicLots.push({ key: 'fortune', zh: '福点', en: 'Fortune', longitude: dayChart ? norm(ascL + moonL! - sunL!) : norm(ascL + sunL! - moonL!) })
      arabicLots.push({ key: 'spirit', zh: '精神点', en: 'Spirit', longitude: dayChart ? norm(ascL + sunL! - moonL!) : norm(ascL + moonL! - sunL!) })
      // 物质点: Asc+木-水 (Firmicus 传承, 日夜同式)
      arabicLots.push({ key: 'substance', zh: '物质点', en: 'Substance', longitude: norm(ascL + jupL! - merL!) })
      // 婚姻点: 男=Asc+金-土 女=Asc+土-金 (Dorotheus/Hermes, 日夜同式)
      arabicLots.push({ key: 'marriage_m', zh: '婚姻点(男)', en: 'Marriage (M)', longitude: norm(ascL + venL! - satL!) })
      arabicLots.push({ key: 'marriage_f', zh: '婚姻点(女)', en: 'Marriage (F)', longitude: norm(ascL + satL! - venL!) })
      // 子女点: 日盘 Asc+土-木; 夜盘反转 (Al-Biruni 5宫条)
      arabicLots.push({ key: 'children', zh: '子女点', en: 'Children', longitude: dayChart ? norm(ascL + satL! - jupL!) : norm(ascL + jupL! - satL!) })
    }
  }

  // ---------- 每宫宫头宫神星 (almuten: 庙5 旺4 三分3(宗派主) 界2 面1, 计分最高者; 平分取高类别) ----------
  const cuspAlmuten: string[] = []
  if (timeKnown && cuspsOut) {
    for (const c of cuspsOut) {
      const cn = norm(c)
      const si2 = Math.floor(cn / 30)
      const deg2 = cn % 30
      const scores: Record<string, number> = {}
      const order: string[] = []
      const add = (n: string | undefined | null, v: number) => {
        if (!n) return
        if (!(n in scores)) order.push(n)
        scores[n] = (scores[n] ?? 0) + v
      }
      add(getSignInfo(si2 as never).traditionalRuler, 5)                                        // 本垣
      const exP = Object.entries(EXALTATION_SIGN).find(([, s]) => s && SIGN_IDX[s] === si2)?.[0]
      add(exP, 4)                                                                                // 曜升
      const trp = TRIPLICITY[ELEM_OF_SIGN[si2]]
      add(trp ? (dayChart ? trp.day : trp.night) : null, 3)                                      // 三分(宗派主)
      for (const [pl, end] of EGYPTIAN_TERMS[si2]) if (deg2 < end) { add(pl, 2); break }         // 界
      add(FACES[si2][Math.min(2, Math.floor(deg2 / 10))], 1)                                     // 面
      let best = '', bestScore = 0
      for (const n of order) if (scores[n] > bestScore) { best = n; bestScore = scores[n] }
      cuspAlmuten.push(best)
    }
  }

  // ---------- 月亮空亡 (VOC): 月出座前不再与七政精确成相 (Lilly 口径, 五主相位) ----------
  let moonVoid = false
  if (timeKnown) {
    const moonP = planets.find((p) => p.name === 'Moon')
    const seven = planets.filter((p) => ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].includes(p.name))
    if (moonP && seven.length) {
      const ASP = [0, 60, 90, 120, 180]
      const remain = 30 - (norm(moonP.longitude) % 30)   // 出座前剩余度数
      const step = 0.05
      const others = seven.map((o) => ({ lon: norm(o.longitude), sp: o.speed ?? 0 }))
      let hit = false
      for (let s = step; s <= remain + 1e-9 && !hit; s += step) {
        const t = s / 13.176  // 天
        const prevM = norm(moonP.longitude + s - step)
        const curM = norm(moonP.longitude + s)
        for (const o of others) {
          const oL = o.lon + o.sp * t
          const d0 = (() => { const d = Math.abs(prevM - oL) % 360; return d > 180 ? 360 - d : d })()
          const d1 = (() => { const d = Math.abs(curM - oL) % 360; return d > 180 ? 360 - d : d })()
          for (const A of ASP) if ((d0 - A) * (d1 - A) <= 0) { hit = true; break }
          if (hit) break
        }
      }
      moonVoid = !hit
    }
  }

  return {
    input: birth,
    settings,
    houseSystemUsed: system,
    timeKnown,
    jd: c.calculated?.julianDate ?? 0,
    planets: allBodies, angles,
    hourRuler: timeKnown ? hourRulerOf(birth.year, birth.month, birth.day, birth.hour) : null,
    cusps: cuspsOut,
    aspects, receptions, combust: combustOld, Cazimi: cazimi, underBeams, viaCombusta, warnings,
    arabicLots, cuspAlmuten, moonVoid,
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
  if (ch.Cazimi?.length) lines.push(`日核Cazimi(距日≤0°17′, 反强如内臣近贵): ${ch.Cazimi.map((n) => PLANET_ZH[n] ?? n).join('、')}`)
  if (ch.combust?.length) lines.push(`焦身·燃烧(距日17′~8°30′, 星性难发挥): ${ch.combust.map((n) => PLANET_ZH[n] ?? n).join('、')}`)
  if (ch.underBeams?.length) lines.push(`在日光下(距日8°30′~17°, 影响轻兼近贵): ${ch.underBeams.map((n) => PLANET_ZH[n] ?? n).join('、')}`)
  if (ch.viaCombusta?.length) lines.push(`燃烧之路(窄版 天秤14°55′—天蝎14°55′): ${ch.viaCombusta.map((n) => PLANET_ZH[n] ?? n).join('、')}`)
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
  const realRecep = ch.receptions.filter(r => r.aspected || r.mutual) // 古典规则: 单向接纳须成相位; 互容无相位=慷慨(降格)
  if (realRecep.length) {
    lines.push(`【互容·接纳】(接纳须两星成相位·单向; 互容=双向同住无需相位, 无相位时仅能量共享)` )
    const seen = new Set<string>()
    for (const r of realRecep) {
      const key = [r.a, r.b].sort().join('|')
      if (seen.has(key)) continue
      const kindZh = RULER_KIND_ZH[r.kind]
      if (r.mutual) {
        const rev = ch.receptions.find(x => x.a === r.b && x.b === r.a)
        seen.add(key)
        // r: A住r.bySign=B之家(kind); rev: B住rev.bySign=A之家(rev.kind)
        lines.push(`- ${r.aspected ? '互容+接纳' : '互容(无相位)'}: ${PLANET_ZH[r.a]} ↔ ${PLANET_ZH[r.b]} (${PLANET_ZH[r.a]}居${SIGNS_ZH[r.bySign] ?? r.bySign}=${PLANET_ZH[r.b]}之${kindZh}, ${PLANET_ZH[r.b]}居${rev ? SIGNS_ZH[rev.bySign] ?? rev.bySign : '?'}=${PLANET_ZH[r.a]}之${rev ? RULER_KIND_ZH[rev.kind] : ''})`)
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
  // 阿拉伯点 (六点) + 宫神星 + 月亮空亡 — 古典技法判读用
  if (ch.arabicLots?.length) {
    const fmtLot = (lon: number) => { const si = Math.floor(((lon % 360) + 360) % 360 / 30); const d = lon % 30; return `${SIGNS_ZH[Object.keys(SIGNS_ZH)[si]] ?? ''} ${Math.floor(d)}°${String(Math.round((d % 1) * 60)).padStart(2, '0')}′` }
    lines.push(`【阿拉伯点】(六点): ${ch.arabicLots.map((l) => `${l.zh}=${fmtLot(l.longitude)}`).join(' · ')}`)
  }
  if (ch.cuspAlmuten?.length) {
    lines.push(`【宫神星】(各宫宫头尊贵计分最强主星, 庙5旺4三分3界2面1): ${ch.cuspAlmuten.map((n, i) => `${i + 1}宫=${PLANET_ZH[n] ?? n}`).join(' ')}`)
  }
  if (ch.moonVoid) lines.push(`【月亮空亡】是 — 月出座前不再与其他七政精确成相, 推进类事项易悬置难落地 (古典凶兆之一)`)
  return lines.join('\n')
}
