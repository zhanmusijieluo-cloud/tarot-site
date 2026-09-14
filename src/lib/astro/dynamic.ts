// ============================================================
// 动态盘引擎 (B层扩展): 行运 / 次限推运 / 太阳弧 / 日返
// 统一模型: 内盘=本命 + 外盘(outer) + 外→内跨盘相位(crossAspects)
// 全部确定性计算, 与本命盘同一引擎栈 (celestine)
// ============================================================
import {
  calculateProgression, calculateAspects, getPosition, ephemeris,
  AspectType,
} from 'celestine'
import {
  castNatalChart, PLANET_ZH_OF, ASPECT_SYMBOL_OF, ASPECT_ZH_OF,
  type BirthData, type CastSettings, type ChartPlanet, type ChartAspect, type NatalChart,
} from '@/lib/astro/chart'

export type DynamicType = 'natal' | 'transit' | 'solar-return' | 'lunar-return' | 'progression' | 'tertiary' | 'solar-arc'

export interface DynDate { year: number; month: number; day: number; hour?: number; minute?: number }

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
    dignity: null,
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
  return (rawAll as Array<{ body1: string; body2: string; type: string; symbol: string; deviation: number }>)
    .filter((a) => outerNames.has(a.body1) !== outerNames.has(a.body2))
    .map((a) => {
      const outerFirst = outerNames.has(a.body1)
      const r: ChartAspect = {
        a: outerFirst ? a.body1 : a.body2,
        b: outerFirst ? a.body2 : a.body1,
        type: a.type as ChartAspect['type'], typeZh: ASPECT_ZH_OF(a.type),
        symbol: a.symbol, orb: toPct(a.deviation), applying: null,
      }
      return r
    })
}

// ---------- 行运盘 ----------
export function castTransitChart(birth: BirthData, settings: CastSettings, target: DynDate): DynamicChart {
  const natal = castNatalChart(birth, settings)
  const warnings = [...natal.warnings]
  const jd = toJD({ ...target, hour: 12 }, birth.timezone)
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
    type: mode === 'tertiary' ? 'tertiary' : mode === 'solar-arc' ? 'solar-arc' : 'progression',
    natal, crossAspects: cross, warnings,
    outer: {
      planets: outerPlanets, jd: pr.dates.targetJD, date: fromJD(pr.dates.targetJD, birth.timezone),
      label: `${target.year}-${target.month}-${target.day} ${mode === 'tertiary' ? '三限' : mode === 'solar-arc' ? '太阳弧' : '次限'}盘`,
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
