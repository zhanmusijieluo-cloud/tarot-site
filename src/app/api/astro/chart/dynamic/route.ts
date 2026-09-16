// ============================================================
// POST /api/astro/chart/dynamic — 动态盘 (行运/次限/太阳弧/日返)
// 入参: { birth, settings, type, target:{year,month,day}, returnYear? }
// 出参: DynamicChart { type, natal, outer, crossAspects, warnings }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { type BirthData, type CastSettings, type HouseSystem } from '@/lib/astro/chart'
import {
  castTransitChart, castProgressionChart, castSolarReturnChart, castLunarReturnChart,
  type DynamicType,
} from '@/lib/astro/dynamic'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HOUSE_SYSTEMS: HouseSystem[] = [
  'placidus', 'koch', 'equal', 'whole-sign', 'porphyry', 'regiomontanus', 'campanus',
  'morinus', 'vettius', 'alcabitiuses', 'sripati', 'pullen', 'polich-page', 'krusinski', 'carter', 'vehlow',
]
const VALID_ASPECTS = new Set(['conjunction', 'sextile', 'square', 'trine', 'opposition', 'quincunx', 'semi-sextile', 'semi-square', 'sesquiquadrate', 'quintile', 'biquintile', 'septile', 'novile', 'decile'])
const VALID_GROUPS = new Set(['asteroids', 'chiron', 'nodes', 'lots', 'lilith'])

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 })
}

// 与本命盘路由同一套白名单收窄 (settings 复用, 保持两种盘口径一致)
function parseSettings(s: Record<string, unknown> | undefined): CastSettings {
  const out: CastSettings = {}
  if (!s) return out
  if (s.bodies && typeof s.bodies === 'object') {
    out.bodies = {}
    for (const k of VALID_GROUPS) if ((s.bodies as Record<string, unknown>)[k] === true) (out.bodies as Record<string, boolean>)[k] = true
  }
  if (s.nodeType === 'mean' || s.nodeType === 'true') out.nodeType = s.nodeType
  if (s.lilithType === 'mean' || s.lilithType === 'true' || s.lilithType === 'both') out.lilithType = s.lilithType
  if (Array.isArray(s.aspectTypes)) out.aspectTypes = s.aspectTypes.filter((x: unknown) => typeof x === 'string' && VALID_ASPECTS.has(x))
  if (s.orbs && typeof s.orbs === 'object') {
    out.orbs = {}
    for (const [k, v] of Object.entries(s.orbs)) {
      if (VALID_ASPECTS.has(k) && typeof v === 'number' && v >= 0.5 && v <= 15) (out.orbs as Record<string, number>)[k] = v
    }
  }
  if (s.outOfSign === false) out.outOfSign = false
  if (typeof s.oosPenalty === 'number' && s.oosPenalty >= 0 && s.oosPenalty <= 1) out.oosPenalty = s.oosPenalty
  if (typeof s.minStrength === 'number' && s.minStrength >= 0 && s.minStrength <= 100) out.minStrength = s.minStrength
  if (['core', 'planets', 'asteroids', 'all'].includes(String(s.aspectScope))) out.aspectScope = s.aspectScope as CastSettings['aspectScope']
  if (s.trueSolar === true) out.trueSolar = true
  if (s.display && typeof s.display === 'object') {
    const d: NonNullable<CastSettings['display']> = {}
    const di = s.display as Record<string, unknown>
    if (di.dir === 'cw') d.dir = 'cw'
    if (di.ascPos === 'top') d.ascPos = 'top'
    for (const k of ['aspects', 'feet', 'nums', 'ticks'] as const) if (di[k] === false) d[k] = false
      if (di.feetAlways === true) d.feetAlways = true
    if (Object.keys(d).length) out.display = d
  }
  return out
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const b = body?.birth
    if (!b || typeof b !== 'object') return bad('缺少出生资料')

    const year = Number(b.year), month = Number(b.month), day = Number(b.day)
    const hour = Number(b.hour ?? 12), minute = Number(b.minute ?? 0)
    const timezone = Number(b.timezone), latitude = Number(b.latitude), longitude = Number(b.longitude)
    const timeKnown = b.timeKnown !== false

    if (!Number.isInteger(year) || year < 1900 || year > 2100) return bad('出生年份需在 1900-2100')
    if (!Number.isInteger(month) || month < 1 || month > 12) return bad('出生月份无效')
    if (!Number.isInteger(day) || day < 1 || day > 31) return bad('出生日期无效')
    if (!(timezone >= -12 && timezone <= 14)) return bad('时区无效')
    if (!(latitude >= -90 && latitude <= 90)) return bad('纬度无效')
    if (!(longitude >= -180 && longitude <= 180)) return bad('经度无效')

    // 目标日期 (行运/推运用) / 返照年 (日返用)
    const type = String(body?.type ?? '') as DynamicType
    if (!['transit', 'progression', 'tertiary', 'solar-arc', 'solar-return', 'lunar-return'].includes(type)) return bad('盘型无效')
    let target = { year: 0, month: 1, day: 1 }
    if (type === 'solar-return') {
      const ry = Number(body?.returnYear ?? new Date().getFullYear())
      if (!Number.isInteger(ry) || ry < 1901 || ry > 2100) return bad('返照年份需在 1901-2100')
      target = { year: ry, month: 1, day: 1 }
    } else {
      const t = body?.target ?? {}
      const ty = Number(t.year), tm = Number(t.month), td = Number(t.day)
      if (!Number.isInteger(ty) || ty < 1900 || ty > 2100) return bad('目标年份需在 1900-2100')
      if (!Number.isInteger(tm) || tm < 1 || tm > 12) return bad('目标月份无效')
      if (!Number.isInteger(td) || td < 1 || td > 31) return bad('目标日期无效')
      // 时分 (行运/天象用; 推运类忽略) + 访客时区 (行运瞬时换算用)
      const th = Number(t.hour), tmi = Number(t.minute)
      const tz = Number(t.tzOffset)
      target = {
        year: ty, month: tm, day: td,
        ...(Number.isInteger(th) && th >= 0 && th <= 23 ? { hour: th } : {}),
        ...(Number.isInteger(tmi) && tmi >= 0 && tmi <= 59 ? { minute: tmi } : {}),
        ...(Number.isFinite(tz) && tz >= -12 && tz <= 14 ? { tzOffset: tz } : {}),
      }
    }

    const houseSystem: HouseSystem = HOUSE_SYSTEMS.includes(b.houseSystem) ? b.houseSystem : 'placidus'
    const settings = parseSettings(body?.settings)

    const birth: BirthData = {
      year, month, day,
      hour: timeKnown ? hour : 12,
      minute: timeKnown ? minute : 0,
      timezone, latitude, longitude,
      city: typeof b.city === 'string' ? b.city.slice(0, 40) : undefined,
      label: typeof b.label === 'string' ? b.label.slice(0, 30) : undefined,
      cnCode: typeof b.cnCode === 'string' ? b.cnCode.slice(0, 60) : undefined,
      houseSystem, timeKnown,
    }

    // 日返地点 (可选: 客户在 A 地出生、B 地过生日 → 用 B 地经纬度)
    const loc = body?.location
    let location: { latitude: number; longitude: number; timezone: number } | undefined
    if (loc && Number.isFinite(Number(loc.latitude)) && Number.isFinite(Number(loc.longitude))) {
      const la = Number(loc.latitude), lo = Number(loc.longitude), tz = Number(loc.timezone)
      if (la >= -90 && la <= 90 && lo >= -180 && lo <= 180 && tz >= -12 && tz <= 14) location = { latitude: la, longitude: lo, timezone: tz }
    }

    let chart
    const lang = (body?.lang === 'en' || body?.lang === 'ja') ? body.lang : 'zh'
    if (type === 'transit') chart = castTransitChart(birth, settings, target, lang)
    else if (type === 'progression') chart = castProgressionChart(birth, settings, target, 'secondary', lang)
    else if (type === 'tertiary') chart = castProgressionChart(birth, settings, target, 'tertiary', lang)
    else if (type === 'solar-arc') chart = castProgressionChart(birth, settings, target, 'solar-arc', lang)
    else if (type === 'lunar-return') chart = castLunarReturnChart(birth, settings, target, location, lang)
    else chart = castSolarReturnChart(birth, settings, target.year, location, lang)

    return NextResponse.json({ chart })
  } catch (e) {
    return bad(`动态盘计算失败: ${e instanceof Error ? e.message : String(e)}`)
  }
}
