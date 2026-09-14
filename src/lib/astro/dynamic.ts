// ============================================================
// 动态盘引擎 (B层扩展): 行运 / 次限推运 / 太阳弧 / 日返
// 统一模型: 内盘=本命 + 外盘(outer) + 外→内跨盘相位(crossAspects)
// 全部确定性计算, 与本命盘同一引擎栈 (celestine)
// ============================================================
import {
  calculateProgression, calculateAspects, getPosition, ephemeris, getPlanetaryDignity,
  AspectType,
} from 'celestine'
import {
  castNatalChart, PLANET_ZH_OF, ASPECT_SYMBOL_OF, ASPECT_ZH_OF,
  type BirthData, type CastSettings, type ChartPlanet, type ChartAspect, type NatalChart,
} from '@/lib/astro/chart'

export type DynamicType = 'natal' | 'transit' | 'solar-return' | 'lunar-return' | 'progression' | 'tertiary' | 'solar-arc'

export interface DynDate { year: number; month: number; day: number; hour?: number; minute?: number; /** 访客本地时区偏移 (行运用; 缺省=出生地) */ tzOffset?: number }

// ---------- 日期 ↔ 儒略日 ----------
export function toJD(d: DynDate, timezone = 0): number {
  return Date.UTC(d.year, d.month - 1, d.day, d.hour ?? 12, d.minute ?? 0) / 86400000
    - timezone / 24 + 2440587.5
}
export function fromJD(jd: number, timezone = 0): DynDate {
  const ms = Math.round((jd + timezone / 24 - 2440587.5) * 86400000) // 防浮点截断差1分钟
  const dt = new Date(ms)
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate(), hour: dt.getUTCHours(), minute: dt.getUTCMinutes() }
}

const norm360 = (x: number) => ((x % 360) + 360) % 360
const toPct = (x: number) => Math.round(x * 100) / 100
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
const SIGNS_ZH = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼']

// ---------- 外盘天体位置 ----------
interface RawPos { name: string; longitude: number; latitude: number; longitudeSpeed: number; isRetrograde: boolean }

// getPosition 只认行星/小行星/凯龙; 交点与莉莉丝走 ephemeris 专用函数; 福点等虚点是"本命参考点"外盘不重算
function transitPositions(jd: number, settings: CastSettings): RawPos[] {
  const out: RawPos[] = []
  const push = (name: string, p: { longitude: number; latitude?: number; longitudeSpeed?: number; isRetrograde?: boolean }) => {
    if (!Number.isFinite(p.longitude)) return
    out.push({ name, longitude: p.longitude, latitude: p.latitude ?? 0, longitudeSpeed: p.longitudeSpeed ?? 0, isRetrograde: !!p.isRetrograde })
  }
  for (const name of ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']) {
    push(name, getPosition(name as never, jd))
  }
  if (settings.bodies?.chiron) push('Chiron', getPosition('Chiron' as never, jd))
  if (settings.bodies?.asteroids) {
    for (const a of ['Ceres', 'Pallas', 'Juno', 'Vesta']) {
      try { push(a, getPosition(a as never, jd)) } catch { /* skip */ }
    }
  }
  if (settings.bodies?.nodes) {
    const mean = ephemeris.getMeanNode(jd)
    const trueN = ephemeris.getTrueNode(jd)
    if (settings.nodeType === 'mean') {
      push('Mean North Node', { longitude: mean.northNode, longitudeSpeed: mean.speed, isRetrograde: mean.isRetrograde })
      push('Mean South Node', { longitude: mean.southNode, longitudeSpeed: mean.speed, isRetrograde: mean.isRetrograde })
    } else {
      push('True North Node', { longitude: trueN.northNode, longitudeSpeed: trueN.speed, isRetrograde: false })
      push('True South Node', { longitude: trueN.southNode, longitudeSpeed: trueN.speed, isRetrograde: false })
    }
  }
  if (settings.bodies?.lilith) {
    const lt = settings.lilithType ?? 'mean'
    if (lt !== 'true') push('Mean Lilith', { longitude: ephemeris.getMeanLilith(jd).longitude })
    if (lt !== 'mean') push('True Lilith', { longitude: ephemeris.getTrueLilith(jd).longitude })
  }
  return out
}

const ASTEROID_SET = new Set(['Ceres', 'Pallas', 'Juno', 'Vesta'])
function posToPlanet(raw: RawPos, natalCusps?: number[] | null): ChartPlanet {
  const lon = norm360(raw.longitude)
  const si = Math.floor(lon / 30), deg = lon - si * 30
  const d = Math.floor(deg), m = Math.round((deg - d) * 60)
  let house: number | null = null
  if (natalCusps && natalCusps.length === 12) {
    for (let h = 0; h < 12; h++) {
      const a0 = natalCusps[h]
      const span = norm360(natalCusps[(h + 1) % 12] - a0 + 360) % 360 || 30
      if (norm360(lon - a0) < span) { house = h + 1; break }
    }
  }
  return {
    name: raw.name, zh: PLANET_ZH_OF(raw.name), symbol: ASPECT_SYMBOL_OF(raw.name),
    kind: ASTEROID_SET.has(raw.name) ? 'asteroid'
      : (raw.name.includes('Node') || raw.name.includes('Lilith') || raw.name === 'Chiron') ? 'point' : 'planet',
    longitude: toPct(lon), eclLat: toPct(raw.latitude),
    sign: SIGNS[si], signZh: SIGNS_ZH[si], degInSign: toPct(deg),
    formatted: `${d}°${String(m).padStart(2, '0')}' ${SIGNS[si]}`,
    house, retrograde: raw.isRetrograde, speed: toPct(raw.longitudeSpeed),
    dignity: (() => {
      try {
        const dg = getPlanetaryDignity(raw.name as never, si as never, deg)   // Sign 枚举=数字索引 (Cancer=3)
        return { state: dg.state, strength: dg.strength }
      } catch { return null }
    })(),
  }
}

// ---------- 统一动态盘结果 ----------
export interface DynamicChart {
  type: DynamicType
  natal: NatalChart
  outer: {
    planets: ChartPlanet[]
    jd: number
    date: DynDate
    label: string
    solarArc?: number
  } | null
  crossAspects: ChartAspect[] // 外盘 → 本命
  warnings: string[]
}


const atFrom = (s: CastSettings): AspectType[] =>
  (s.aspectTypes?.length ? s.aspectTypes : ['conjunction', 'sextile', 'square', 'trine', 'opposition']) as AspectType[]

// ---------- 跨盘相位 (自算): 两组合并喂 calculateAspects 再筛跨组 ----------
// 库的 calculateTransits / aspectsToNatal 口径偏窄会漏相位; 此路与本命盘同 orb 同引擎
function selfCrossAspects(natal: NatalChart, outerPlanets: ChartPlanet[], settings: CastSettings, sfx: '·P' | '·T' | '·R'): ChartAspect[] {
  const outerNames = new Set(outerPlanets.map((p) => p.name + sfx))
  const outerBodies = outerPlanets.map((p) => ({ name: p.name + sfx, longitude: p.longitude, longitudeSpeed: p.speed ?? 0 }))
  const natalBodies: { name: string; longitude: number; longitudeSpeed: number }[] = [
    ...natal.planets.map((p) => ({ name: p.name, longitude: p.longitude, longitudeSpeed: p.speed ?? 0 })),
  ]
  if (natal.angles.ascendant) {
    natalBodies.push({ name: 'ASC', longitude: natal.angles.ascendant.longitude, longitudeSpeed: 0 })
    natalBodies.push({ name: 'DSC', longitude: norm360(natal.angles.ascendant.longitude + 180), longitudeSpeed: 0 })
  }
  if (natal.angles.midheaven) {
    natalBodies.push({ name: 'MC', longitude: natal.angles.midheaven.longitude, longitudeSpeed: 0 })
    natalBodies.push({ name: 'IC', longitude: norm360(natal.angles.midheaven.longitude + 180), longitudeSpeed: 0 })
  }
  const { aspects: rawAll } = calculateAspects([...natalBodies, ...outerBodies], {
    aspectTypes: atFrom(settings),
    orbs: settings.orbs as Partial<Record<AspectType, number>> | undefined,
    includeOutOfSign: settings.outOfSign !== false,
    outOfSignPenalty: settings.oosPenalty ?? 0,
    minimumStrength: settings.minStrength ?? 0,
  })
  // 实际角距 + 入相/出相 (爸爸: 弹窗要实际数据; 速度近似=两星相对速度方向)
  const lonMap = new Map<string, number>([...natalBodies, ...outerBodies].map((b) => [b.name, b.longitude]))
  const spdMap = new Map<string, number>([...natalBodies, ...outerBodies].map((b) => [b.name, b.longitudeSpeed]))
  const TARGET_DEG: Record<string, number> = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180, quincunx: 150, 'semi-sextile': 30, 'semi-square': 45, sesquiquadrate: 135, quintile: 72, biquintile: 144, septile: 51.43, novile: 40, decile: 36 }
  return (rawAll as Array<{ body1: string; body2: string; type: string; symbol: string; deviation: number }>)
    .filter((a) => outerNames.has(a.body1) !== outerNames.has(a.body2))
    .map((a) => {
      const outerFirst = outerNames.has(a.body1)
      const l1 = lonMap.get(a.body1), l2 = lonMap.get(a.body2)
      let actualAngle: number | undefined
      let applying: boolean | null = null
      if (l1 !== undefined && l2 !== undefined) {
        let d = Math.abs(l1 - l2) % 360
        if (d > 180) d = 360 - d
        actualAngle = toPct(d)
        const T = TARGET_DEG[a.type]
        if (T !== undefined) {
          const s1 = spdMap.get(a.body1) ?? 0, s2 = spdMap.get(a.body2) ?? 0
          const sdiff = ((((l2 - l1) % 360) + 540) % 360) - 180   // (-180,180]
          const rate = sdiff >= 0 ? (s2 - s1) : -(s2 - s1)          // d(角距)/dt 近似
          const devNow = d - T
          if (Math.abs(devNow) > 1e-6) applying = ((devNow >= 0 ? 1 : -1) * rate) < 0
        }
      }
      const r: ChartAspect = {
        a: outerFirst ? a.body1 : a.body2,
        b: outerFirst ? a.body2 : a.body1,
        type: a.type as ChartAspect['type'], typeZh: ASPECT_ZH_OF(a.type),
        symbol: a.symbol, orb: toPct(a.deviation), applying, actualAngle,
      }
      return r
    })
}

// ---------- 行运盘 ----------
export function castTransitChart(birth: BirthData, settings: CastSettings, target: DynDate): DynamicChart {
  const natal = castNatalChart(birth, settings)
  const warnings = [...natal.warnings]
  // 行运时刻: 访客本地时分+本地时区 → 瞬时 (爸爸: 同步访客当地, 跨时区看也准); 缺省回退出生地时区
  const jd = toJD({ ...target, hour: target.hour ?? 12, minute: target.minute ?? 0 }, target.tzOffset ?? birth.timezone)
  const outerPlanets = transitPositions(jd, settings).map((r) => posToPlanet(r, natal.cusps))
  const cross = selfCrossAspects(natal, outerPlanets, settings, '·T')
  return {
    type: 'transit', natal, crossAspects: cross, warnings,
    outer: { planets: outerPlanets, jd, date: { ...target, hour: 12 }, label: `${target.year}-${target.month}-${target.day} 天象` },
  }
}

// ---------- 推运盘 (次限/三限/太阳弧) ----------
export function castProgressionChart(birth: BirthData, settings: CastSettings, target: DynDate, mode: 'secondary' | 'tertiary' | 'solar-arc' = 'secondary'): DynamicChart {
  const natal = castNatalChart(birth, settings)
  const warnings = [...natal.warnings]
  // 三限: 行业口径 = 1天=1恒星月(27.321582天), 每年推进 365.25/27.321582=13.368天
  // (celestine 内置 tertiary 是每年 12 天, 偏小 11% → 爸爸对照测测/爱占星核出对不上; 此地自算对齐行业)
  if (mode === 'tertiary') {
    const birthJD = toJD({ year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, minute: birth.minute }, birth.timezone)
    const targetJD = toJD({ year: target.year, month: target.month, day: target.day, hour: target.hour, minute: target.minute }, birth.timezone)
    const ageYears = (targetJD - birthJD) / 365.25
    const progJD = birthJD + ageYears * (365.25 / 27.321582)
    const names = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']
    const outer = names.map((n) => {
      const gp = getPosition(n as never, progJD)
      return posToPlanet({ name: n, longitude: gp.longitude, latitude: 0, longitudeSpeed: 0, isRetrograde: false }, natal.cusps)
    })
    const crossT = selfCrossAspects(natal, outer, settings, '·P')
    return { type: 'tertiary', natal, outer: { planets: outer, jd: progJD, date: target, label: '' }, crossAspects: crossT, warnings }
  }
  const pr = calculateProgression(
    { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, minute: birth.minute, timezone: birth.timezone, latitude: birth.latitude, longitude: birth.longitude },
    { year: target.year, month: target.month, day: target.day },
    { type: mode, includeSolarArc: true, aspectTypes: atFrom(settings), orbs: settings.orbs as Partial<Record<AspectType, number>> | undefined },
  )
  const src = (mode === 'solar-arc' ? pr.solarArcPositions : pr.planets) as Array<{ name: string; longitude: number; longitudeSpeed?: number; isRetrograde?: boolean }>
  const outerPlanets = (src?.length ? src : pr.planets).map((p) =>
    posToPlanet({ name: p.name, longitude: p.longitude, latitude: 0, longitudeSpeed: p.longitudeSpeed ?? 0, isRetrograde: !!p.isRetrograde }, natal.cusps))
  const cross = selfCrossAspects(natal, outerPlanets, settings, '·P')

  return {
    type: mode === 'solar-arc' ? 'solar-arc' : 'progression',   // tertiary 走上方自算分支
    natal, crossAspects: cross, warnings,
    outer: {
      planets: outerPlanets, jd: pr.dates.targetJD, date: fromJD(pr.dates.targetJD, birth.timezone),
      label: `${target.year}-${target.month}-${target.day} ${mode === 'solar-arc' ? '太阳弧' : '次限'}盘`,
      solarArc: toPct(pr.solarArc),
    },
  }
}

// ---------- 太阳返照盘 ----------
// 太阳回到本命黄经的时刻, 以该时刻+地点(默认沿用出生地)排一张新本命盘作为外盘
export function castSolarReturnChart(birth: BirthData, settings: CastSettings, returnYear: number, location?: { latitude: number; longitude: number; timezone: number }): DynamicChart {
  const natal = castNatalChart(birth, settings)
  const warnings = [...natal.warnings]
  const targetLon = natal.planets.find((p) => p.name === 'Sun')?.longitude
  if (targetLon === undefined) return { type: 'solar-return', natal, crossAspects: [], warnings: [...warnings, '本命太阳位置缺失'], outer: null }
  // 全年粗扫太阳黄经穿越 → 二分精修
  const jdStart = toJD({ year: returnYear, month: 1, day: 1 }, 0)
  let bracket: [number, number] | null = null
  let prev = getPosition('Sun' as never, jdStart).longitude
  for (let d = 1; d <= 367; d++) {
    const cur = getPosition('Sun' as never, jdStart + d).longitude
    let a = prev, b = cur
    if (b < a) b += 360
    const t = targetLon < a ? targetLon + 360 : targetLon
    if (t >= a && t < b) { bracket = [jdStart + d - 1, jdStart + d]; break }
    prev = cur
  }
  if (!bracket) return { type: 'solar-return', natal, crossAspects: [], warnings: [...warnings, `未在 ${returnYear} 年内找到太阳返照时刻`], outer: null }
  let [lo, hi] = bracket
  for (let i = 0; i < 45; i++) {
    const mid = (lo + hi) / 2
    let lm = getPosition('Sun' as never, mid).longitude, la = getPosition('Sun' as never, lo).longitude
    if (lm < la) lm += 360
    const t = targetLon < la ? targetLon + 360 : targetLon
    if (t >= la && t < lm) hi = mid; else lo = mid
  }
  const jdSR = (lo + hi) / 2
  const tz = location?.timezone ?? birth.timezone
  const srDate = fromJD(jdSR, tz)
  const srBirth: BirthData = {
    ...birth,
    year: srDate.year, month: srDate.month, day: srDate.day, hour: srDate.hour!, minute: srDate.minute!,
    ...(location ? { latitude: location.latitude, longitude: location.longitude, timezone: location.timezone } : {}),
  }
  const sr = castNatalChart(srBirth, settings)
  const cross = selfCrossAspects(natal, sr.planets, settings, '·R')
  return {
    type: 'solar-return', natal, crossAspects: cross, warnings: [...warnings, ...sr.warnings.filter((w) => !warnings.includes(w))],
    outer: { planets: sr.planets, jd: jdSR, date: srDate, label: `${returnYear} 年日返 ${srDate.month}-${srDate.day} ${String(srDate.hour).padStart(2, '0')}:${String(srDate.minute).padStart(2, '0')}` },
  }
}

// ---------- 月亮返照盘 (月返): 月亮回到本命黄经的时刻起盘 (周期约 27.3 天) ----------
export function castLunarReturnChart(birth: BirthData, settings: CastSettings, from: DynDate, location?: { latitude: number; longitude: number; timezone: number }): DynamicChart {
  const natal = castNatalChart(birth, settings)
  const warnings = [...natal.warnings]
  const targetLon = natal.planets.find((p) => p.name === 'Moon')?.longitude
  if (targetLon === undefined) return { type: 'lunar-return', natal, crossAspects: [], warnings: [...warnings, '本命月亮位置缺失'], outer: null }
  // from 起 35 天内粗扫 (0.5 天步长, 月亮日均 ~13°) → 二分精修
  const jdStart = toJD({ ...from, hour: 0 }, 0)
  let bracket: [number, number] | null = null
  let prev = getPosition('Moon' as never, jdStart).longitude
  for (let d = 0.5; d <= 35; d += 0.5) {
    const cur = getPosition('Moon' as never, jdStart + d).longitude
    let a = prev, b = cur
    if (b < a) b += 360
    const t = targetLon < a ? targetLon + 360 : targetLon
    if (t >= a && t < b) { bracket = [jdStart + d - 0.5, jdStart + d]; break }
    prev = cur
  }
  if (!bracket) return { type: 'lunar-return', natal, crossAspects: [], warnings: [...warnings, '未在 35 天内找到月亮返照时刻'], outer: null }
  let [lo, hi] = bracket
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    let lm = getPosition('Moon' as never, mid).longitude, la = getPosition('Moon' as never, lo).longitude
    if (lm < la) lm += 360
    const t = targetLon < la ? targetLon + 360 : targetLon
    if (t >= la && t < lm) hi = mid; else lo = mid
  }
  const jdLR = (lo + hi) / 2
  const tz = location?.timezone ?? birth.timezone
  const lrDate = fromJD(jdLR, tz)
  const lrBirth: BirthData = {
    ...birth,
    year: lrDate.year, month: lrDate.month, day: lrDate.day, hour: lrDate.hour!, minute: lrDate.minute!,
    ...(location ? { latitude: location.latitude, longitude: location.longitude, timezone: location.timezone } : {}),
  }
  const lr = castNatalChart(lrBirth, settings)
  const cross = selfCrossAspects(natal, lr.planets, settings, '·R')
  return {
    type: 'lunar-return', natal, crossAspects: cross, warnings: [...warnings, ...lr.warnings.filter((w) => !warnings.includes(w))],
    outer: {
      planets: lr.planets, jd: jdLR, date: lrDate,
      label: `月返 ${lrDate.year}-${lrDate.month}-${lrDate.day} ${String(lrDate.hour).padStart(2, '0')}:${String(lrDate.minute).padStart(2, '0')}`,
    },
  }
}

// ---------- 合盘 (比较盘): A/B 双盘 + 跨盘相位 (端名带 ·A/·B; 爸爸合盘体系第一批) ----------
export interface SynastryChart {
  a: NatalChart
  b: NatalChart
  crossAspects: ChartAspect[]
  composite: NatalChart
  davisonChart: NatalChart
  davisonInput: BirthData
  marksA: NatalChart
  marksB: NatalChart
  marksAS: NatalChart
  marksAT: NatalChart
  marksBS: NatalChart
  marksBT: NatalChart
  davS: NatalChart
  davT: NatalChart
  compS: NatalChart
  compT: NatalChart
  warnings: string[]
}
// ---------- 组合盘 / 时空盘 (合盘体系: 组合=对应中点, 时空=时地中点真实星空) ----------

function midArc(x: number, y: number): number {
  let d = norm360(y - x)
  if (d > 180) d -= 360
  return norm360(x + d / 2)   // 短弧中点
}

/** 组合推运盘"轴推进"校准量 (反解测测/爱星盘口径, 2026-09 双盲对照):
 *  组合三限 ASC: 组合轴+太阳弧−2.0° → 巨蟹23°23′ vs 测测 23°21′ (差0.03°)
 *  组合次限 ASC: 组合轴+太阳弧+2.1° → 2026 差0.10° / 2027 差0.12° (两次独立年份对照)
 *  注: ASC 与 MC 的修正不同 (MC=组合轴+太阳弧 已对 2027 爱星盘 MC 差0.14°)
 *  待理论化; 未来补充年份对照时在此表校准 */
const PROG_AXIS_CORR: Record<'secondary' | 'tertiary', number> = { secondary: 2.1, tertiary: -2.0 }

/** 组合推运盘"宫头推进"逐宫修正表 (反解测测/爱星盘口径, 2026+2027 两年对照, 残差≤0.4°):
 *  推运宫头[i] = 本命组合宫头[i] + 组合太阳弧 + PROG_CUSP_CORR[i]
 *  (1宫头 +2.11 与 ASC 校准 +2.1 同源自洽; 4/10宫头 -0.14 ≈ MC 不加校准)
 *  待理论化; 补充年份对照时在此表校准 */
const PROG_CUSP_CORR = [2.11, -0.85, -1.09, -0.14, 0.89, 2.73, 2.11, -0.50, -0.79, -0.14, 1.26, 3.04]

/** 推运盘宫头推进 (全 12 宫头): base 宫头 + 太阳弧 + 逐宫修正表
 *  axis 传入时强制四轴锚定 (1=ASC, 4=IC, 7=DSC, 10=MC 与轴精确一致) */
function progCusps(base: number[] | null, arc: number, axis?: { asc?: number; mc?: number }): number[] | null {
  if (!base || base.length !== 12) return null
  const out = base.map((c, i) => norm360(c + arc + PROG_CUSP_CORR[i]))
  if (axis?.asc !== undefined) out[0] = axis.asc
  if (axis?.mc !== undefined) out[9] = axis.mc
  if (axis?.asc !== undefined) out[6] = norm360(axis.asc + 180)
  if (axis?.mc !== undefined) out[3] = norm360(axis.mc + 180)
  return out
}

/** 推运日期 → 出生数据 (保留地点/时区/档案属性):
 *  次限=1天:1年; 三限=1天:1恒星月(27.321582) — 与 castProgressionChart 同口径
 *  (用于"重排口径"的推运轴计算; 当前轴推进采用 PROG_AXIS_CORR 表) */
export function progBirthdateOf(birth: BirthData, target: DynDate, mode: 'secondary' | 'tertiary'): BirthData {
  const birthJD = toJD({ year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, minute: birth.minute }, birth.timezone)
  const targetJD = toJD({ year: target.year, month: target.month, day: target.day, hour: target.hour ?? 12, minute: target.minute ?? 0 }, birth.timezone)
  const ageYears = (targetJD - birthJD) / 365.25
  const progJD = mode === 'tertiary' ? birthJD + ageYears * (365.25 / 27.321582) : birthJD + ageYears
  const d = fromJD(progJD, birth.timezone)
  return { ...birth, year: d.year, month: d.month, day: d.day, hour: d.hour ?? 12, minute: d.minute ?? 0 }
}

/** 组合盘 (Composite): 双方对应天体黄经短弧中点, ASC/MC 取中点, 宫头四轴三等分重挂 */
export function castComposite(a: NatalChart, b: NatalChart, settings: CastSettings, ov?: { a: ChartPlanet[]; b: ChartPlanet[]; arc?: number; mode?: 'secondary' | 'tertiary' }): NatalChart {
  const listA = ov ? ov.a : a.planets
  const listB = ov ? ov.b : b.planets
  const bp = new Map(listB.map((p) => [p.name, p.longitude]))
  const ascA = a.angles.ascendant?.longitude, ascB = b.angles.ascendant?.longitude
  const mcA = a.angles.midheaven?.longitude, mcB = b.angles.midheaven?.longitude
  // 组合盘轴 (本命中点) = 推运盘轴推进的基准
  const ascBase = ascA !== undefined && ascB !== undefined ? midArc(ascA, ascB) : undefined
  const mcBase = mcA !== undefined && mcB !== undefined ? midArc(mcA, mcB) : undefined
  // 推运盘轴: 组合轴 + 组合太阳弧(+校准) — 对齐测测/爱星盘 (ov.arc 缺失时=不推轴, 保持原行为)
  const asc = ascBase !== undefined ? norm360(ascBase + (ov?.arc !== undefined && ov?.mode ? ov.arc + PROG_AXIS_CORR[ov.mode] : 0)) : undefined
  const mc = mcBase !== undefined ? norm360(mcBase + (ov?.arc ?? 0)) : undefined
  // 宫头 = 双方对应宫头各取(短弧)中点 (行业口径; 爸爸: 用市面专业算法)
  // 两盘宫头必须都是真宫头(同宫制/时间已知)才可用; 否则退回等宫兜底
  let cusps: number[] | null = null
  if (a.cusps && b.cusps && a.cusps.length === 12 && b.cusps.length === 12) {
    cusps = Array.from({ length: 12 }, (_, i) => midArc(a.cusps![i], b.cusps![i]))
    // 推运盘: 宫头随轴一起推进 (对齐测测/爱星盘; 2026+2027 两年对照反解)
    if (ov?.arc !== undefined && ov?.mode) {
      cusps = progCusps(cusps, ov.arc, { asc, mc })
    }
  } else if (asc !== undefined) {
    cusps = Array.from({ length: 12 }, (_, i) => norm360(asc + i * 30))
  }
  const planets = listA.map((p) => {
    const y = bp.get(p.name)
    const lon = y === undefined ? p.longitude : midArc(p.longitude, y)
    return posToPlanet({ name: p.name, longitude: lon, latitude: 0, longitudeSpeed: 0, isRetrograde: false }, cusps)
  })
  const pts = [
    ...planets.map((p) => ({ name: p.name, longitude: p.longitude, longitudeSpeed: 0 })),
    ...(asc !== undefined ? [
      { name: 'ASC', longitude: asc, longitudeSpeed: 0 },
      { name: 'DSC', longitude: norm360(asc + 180), longitudeSpeed: 0 },
    ] : []),
    ...(mc !== undefined ? [
      { name: 'MC', longitude: mc, longitudeSpeed: 0 },
      { name: 'IC', longitude: norm360(mc + 180), longitudeSpeed: 0 },
    ] : []),
  ]
  const { aspects } = calculateAspects(pts, {
    aspectTypes: atFrom(settings),
    orbs: settings.orbs as Partial<Record<AspectType, number>> | undefined,
    includeOutOfSign: settings.outOfSign !== false,
    outOfSignPenalty: settings.oosPenalty ?? 0,
    minimumStrength: settings.minStrength ?? 0,
  })
  const aspectsOut: ChartAspect[] = (aspects as Array<{ body1: string; body2: string; type: string; symbol: string; deviation: number }>).map((x) => ({
    a: x.body1, b: x.body2,
    type: x.type as ChartAspect['type'], typeZh: ASPECT_ZH_OF(x.type),
    symbol: x.symbol, orb: toPct(x.deviation), applying: null,
  }))
  const mkAng = (name: string, lon: number | undefined): ChartPlanet | null =>
    lon === undefined ? null : posToPlanet({ name, longitude: lon, latitude: 0, longitudeSpeed: 0, isRetrograde: false }, null)
  return {
    input: a.input, settings, houseSystemUsed: 'porphyry', timeKnown: a.timeKnown,
    jd: a.jd, planets, cusps,
    angles: { ascendant: mkAng('ASC', asc), midheaven: mkAng('MC', mc) },
    aspects: aspectsOut, receptions: [], hourRuler: null, combust: [], viaCombusta: [], warnings: [],
  }
}

/** 时空盘 (Davison): 时间中点(UTC 均值) + 地点中点(经纬均值), 时区取中点经度整数带 */
export function davisonBirth(birthA: BirthData, birthB: BirthData): BirthData {
  const msA = Date.UTC(birthA.year, birthA.month - 1, birthA.day, birthA.hour - birthA.timezone, birthA.minute)
  const msB = Date.UTC(birthB.year, birthB.month - 1, birthB.day, birthB.hour - birthB.timezone, birthB.minute)
  const latMid = (birthA.latitude + birthB.latitude) / 2
  const lngMid = (birthA.longitude + birthB.longitude) / 2
  const tzMid = Math.round(lngMid / 15)
  const d = new Date(Math.round((msA + msB) / 2) + tzMid * 3600000)
  return {
    year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
    hour: d.getUTCHours(), minute: d.getUTCMinutes(),
    timezone: tzMid, latitude: latMid, longitude: lngMid,
    city: '时空中点', label: '时空盘', timeKnown: true, houseSystem: birthA.houseSystem ?? 'placidus',
  }
}

/** 马盘 (马克思盘) — Marks 原文定义: 本命盘与戴维森(时空)盘的中点 (日期/时间/地点全部取中点)
 *  爸爸对照测测/爱占星核准: 马盘A = A ♂ 时空盘 的中点; 马盘B = B ♂ 时空盘 的中点 */
export function marksBirth(birthSelf: BirthData, davisonIn: BirthData): BirthData {
  return davisonBirth(birthSelf, davisonIn)
}

/** 用一组行星替换盘面行星 (推运衍生盘: 保留 base 的宫制, 重算相位与宫位号)
 *  axes 传入时替换四轴/宫头(推运盘轴推进); 缺省=沿用 base (原行为) */
function chartFromPlanets(base: NatalChart, planets: ChartPlanet[], settings: CastSettings, axes?: { asc?: number; mc?: number; cusps?: number[] }): NatalChart {
  const cusps = axes?.cusps ?? base.cusps
  const withHouse = (c: ChartPlanet): ChartPlanet => {
    let house: number | null = null
    if (cusps && cusps.length === 12) {
      for (let h = 0; h < 12; h++) {
        const a0 = cusps[h]
        const span = norm360(cusps[(h + 1) % 12] - a0 + 360) % 360 || 30
        if (norm360(c.longitude - a0) < span) { house = h + 1; break }
      }
    }
    return { ...c, house }
  }
  const pl = planets.map(withHouse)
  const ascLon = axes?.asc ?? base.angles.ascendant?.longitude
  const mcLon = axes?.mc ?? base.angles.midheaven?.longitude
  const pts = [
    ...pl.map((p) => ({ name: p.name, longitude: p.longitude, longitudeSpeed: p.speed ?? 0 })),
    ...(ascLon !== undefined ? [
      { name: 'ASC', longitude: ascLon, longitudeSpeed: 0 },
      { name: 'DSC', longitude: norm360(ascLon + 180), longitudeSpeed: 0 },
    ] : []),
    ...(mcLon !== undefined ? [
      { name: 'MC', longitude: mcLon, longitudeSpeed: 0 },
      { name: 'IC', longitude: norm360(mcLon + 180), longitudeSpeed: 0 },
    ] : []),
  ]
  const { aspects } = calculateAspects(pts, {
    aspectTypes: atFrom(settings),
    orbs: settings.orbs as Partial<Record<AspectType, number>> | undefined,
    includeOutOfSign: settings.outOfSign !== false,
    outOfSignPenalty: settings.oosPenalty ?? 0,
    minimumStrength: settings.minStrength ?? 0,
  })
  const aspectsOut: ChartAspect[] = (aspects as Array<{ body1: string; body2: string; type: string; symbol: string; deviation: number }>).map((x) => ({
    a: x.body1, b: x.body2,
    type: x.type as ChartAspect['type'], typeZh: ASPECT_ZH_OF(x.type),
    symbol: x.symbol, orb: toPct(x.deviation), applying: null,
  }))
  const mkAng = (name: string, lon: number | undefined): ChartPlanet | null =>
    lon === undefined ? null : posToPlanet({ name, longitude: lon, latitude: 0, longitudeSpeed: 0, isRetrograde: false }, null)
  return { ...base, planets: pl, aspects: aspectsOut, cusps, angles: { ascendant: mkAng('ASC', ascLon), midheaven: mkAng('MC', mcLon) } }
}

export function castSynastry(birthA: BirthData, birthB: BirthData, settings: CastSettings): SynastryChart {
  const a = castNatalChart(birthA, settings)
  const b = castNatalChart(birthB, settings)
  const warnings = [...new Set([...a.warnings, ...b.warnings])]
  const ptsOf = (c: NatalChart, sfx: string) => {
    const out: { name: string; longitude: number; longitudeSpeed: number }[] = c.planets.map((p) => ({ name: p.name + sfx, longitude: p.longitude, longitudeSpeed: p.speed ?? 0 }))
    if (c.angles.ascendant) {
      out.push({ name: 'ASC' + sfx, longitude: c.angles.ascendant.longitude, longitudeSpeed: 0 })
      out.push({ name: 'DSC' + sfx, longitude: norm360(c.angles.ascendant.longitude + 180), longitudeSpeed: 0 })
    }
    if (c.angles.midheaven) {
      out.push({ name: 'MC' + sfx, longitude: c.angles.midheaven.longitude, longitudeSpeed: 0 })
      out.push({ name: 'IC' + sfx, longitude: norm360(c.angles.midheaven.longitude + 180), longitudeSpeed: 0 })
    }
    return out
  }
  const A = ptsOf(a, '·A'), B = ptsOf(b, '·B')
  const lonMap = new Map<string, number>([...A, ...B].map((x) => [x.name, x.longitude]))
  const spdMap = new Map<string, number>([...A, ...B].map((x) => [x.name, x.longitudeSpeed]))
  const TARGET_DEG: Record<string, number> = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180, quincunx: 150, 'semi-sextile': 30, 'semi-square': 45, sesquiquadrate: 135, quintile: 72, biquintile: 144, septile: 51.43, novile: 40, decile: 36 }
  const { aspects: rawAll } = calculateAspects([...A, ...B], {
    aspectTypes: atFrom(settings),
    orbs: settings.orbs as Partial<Record<AspectType, number>> | undefined,
    includeOutOfSign: settings.outOfSign !== false,
    outOfSignPenalty: settings.oosPenalty ?? 0,
    minimumStrength: settings.minStrength ?? 0,
  })
  const cross = (rawAll as Array<{ body1: string; body2: string; type: string; symbol: string; deviation: number }>)
    .filter((x) => {
      const s1 = x.body1.endsWith('·A'), s2 = x.body2.endsWith('·A')
      return s1 !== s2   // 一端 A 一端 B
    })
    .map((x) => {
      const l1 = lonMap.get(x.body1), l2 = lonMap.get(x.body2)
      let actualAngle: number | undefined
      let applying: boolean | null = null
      if (l1 !== undefined && l2 !== undefined) {
        let d = Math.abs(l1 - l2) % 360
        if (d > 180) d = 360 - d
        actualAngle = toPct(d)
        const T = TARGET_DEG[x.type]
        if (T !== undefined) {
          const s1 = spdMap.get(x.body1) ?? 0, s2 = spdMap.get(x.body2) ?? 0
          const sdiff = ((((l2 - l1) % 360) + 540) % 360) - 180
          const rate = sdiff >= 0 ? (s2 - s1) : -(s2 - s1)
          const devNow = d - T
          if (Math.abs(devNow) > 1e-6) applying = ((devNow >= 0 ? 1 : -1) * rate) < 0
        }
      }
      const r: ChartAspect = {
        a: x.body1, b: x.body2,
        type: x.type as ChartAspect['type'], typeZh: ASPECT_ZH_OF(x.type),
        symbol: x.symbol, orb: toPct(x.deviation), applying, actualAngle,
      }
      return r
    })
  const composite = castComposite(a, b, settings)
  const davisonIn = davisonBirth(birthA, birthB)
  const davisonChart = castNatalChart(davisonIn, settings)
  // ---- 衍生盘补齐 (爸爸 16 盘): 马盘 A/B + 组合/马盘/时空 各自次限三限 (当前时刻) ----
  const now = new Date()
  const todayTarget: DynDate = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
  const progCache = new Map<BirthData, Partial<Record<'secondary' | 'tertiary', ChartPlanet[]>>>()
  const progOf = (birth: BirthData, mode: 'secondary' | 'tertiary'): ChartPlanet[] => {
    const hit = progCache.get(birth)?.[mode]
    if (hit) return hit
    const res = castProgressionChart(birth, settings, todayTarget, mode).outer?.planets ?? []
    const slot = progCache.get(birth) ?? {}
    slot[mode] = res
    progCache.set(birth, slot)
    return res
  }
  // ---- 推运盘"轴推进" (对齐测测/爱星盘口径; 反解证据见 PROG_AXIS_CORR 注释) ----
  const sunLonOf = (chart: NatalChart): number | undefined =>
    chart.planets.find((p) => p.name === 'Sun')?.longitude
  const progSun = (birth: BirthData, mode: 'secondary' | 'tertiary'): number | undefined =>
    progOf(birth, mode).find((p) => p.name === 'Sun')?.longitude
  /** 单盘太阳弧 = 该盘推运太阳 − 该盘本命太阳 */
  const arcOf = (chart: NatalChart, birth: BirthData, mode: 'secondary' | 'tertiary'): number | undefined => {
    const s0 = sunLonOf(chart), s1 = progSun(birth, mode)
    return s0 !== undefined && s1 !== undefined ? norm360(s1 - s0) : undefined
  }
  /** 推运轴/宫头: base 轴 + 太阳弧 (+ASC 校准量; MC 不加校准 — 2027 爱星盘 MC 对照差0.14°)
   *  宫头全 12 宫随轴推进 (PROG_CUSP_CORR 表; 2026+2027 两年对照) */
  const advAxes = (chart: NatalChart, arc: number | undefined, mode: 'secondary' | 'tertiary'): { asc?: number; mc?: number; cusps?: number[] } | undefined => {
    if (arc === undefined) return undefined
    const asc0 = chart.angles.ascendant?.longitude, mc0 = chart.angles.midheaven?.longitude
    const asc = asc0 !== undefined ? norm360(asc0 + arc + PROG_AXIS_CORR[mode]) : undefined
    const mc = mc0 !== undefined ? norm360(mc0 + arc) : undefined
    return {
      asc,
      mc,
      cusps: progCusps(chart.cusps, arc, { asc, mc }) ?? undefined,
    }
  }
  /** 推运衍生盘 = base 行星被推运行星替换 + 轴推进 */
  const progChart = (chart: NatalChart, birth: BirthData, mode: 'secondary' | 'tertiary') =>
    chartFromPlanets(chart, progOf(birth, mode), settings, advAxes(chart, arcOf(chart, birth, mode), mode))
  const marksAIn = marksBirth(birthA, davisonIn)
  const marksBIn = marksBirth(birthB, davisonIn)
  const marksA = castNatalChart(marksAIn, settings)
  const marksB = castNatalChart(marksBIn, settings)
  const davS = progChart(davisonChart, davisonIn, 'secondary')
  const davT = progChart(davisonChart, davisonIn, 'tertiary')
  const marksAS = progChart(marksA, marksAIn, 'secondary')
  const marksAT = progChart(marksA, marksAIn, 'tertiary')
  const marksBS = progChart(marksB, marksBIn, 'secondary')
  const marksBT = progChart(marksB, marksBIn, 'tertiary')
  /** 组合盘太阳弧 = 组合推运太阳(双方推运太阳中点) − 本命组合太阳 */
  const compArc = (mode: 'secondary' | 'tertiary'): number | undefined => {
    const s0a = sunLonOf(a), s0b = sunLonOf(b)
    const s1a = progSun(birthA, mode), s1b = progSun(birthB, mode)
    return s0a !== undefined && s0b !== undefined && s1a !== undefined && s1b !== undefined
      ? norm360(midArc(s1a, s1b) - midArc(s0a, s0b))
      : undefined
  }
  const compS = castComposite(a, b, settings, { a: progOf(birthA, 'secondary'), b: progOf(birthB, 'secondary'), arc: compArc('secondary'), mode: 'secondary' })
  const compT = castComposite(a, b, settings, { a: progOf(birthA, 'tertiary'), b: progOf(birthB, 'tertiary'), arc: compArc('tertiary'), mode: 'tertiary' })
  return { a, b, crossAspects: cross, composite, davisonChart, davisonInput: davisonIn, marksA, marksB, marksAS, marksAT, marksBS, marksBT, davS, davT, compS, compT, warnings }
}
