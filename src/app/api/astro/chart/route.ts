import { NextRequest, NextResponse } from 'next/server'
import { castNatalChart, chartEvidence, type BirthData, type CastSettings, type HouseSystem } from '@/lib/astro/chart'

/**
 * 占星排盘 API (骨架 v0.1)
 * POST /api/astro/chart  { birth: BirthData } → { chart, evidence }
 * 引擎算盘: 本路由输出即占断证据, 前端与 AI 均不得改动行星位置
 */

const HOUSE_SYSTEMS: HouseSystem[] = [
  'placidus', 'koch', 'equal', 'whole-sign', 'porphyry', 'regiomontanus', 'campanus',
  'morinus', 'vettius', 'alcabitiuses', 'sripati', 'pullen', 'polich-page', 'krusinski', 'carter', 'vehlow',
]

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const b = body?.birth

    if (!b || typeof b !== 'object') return bad('缺少出生资料')

    // ---- 入参校验 (全部白名单收窄, 引擎内部还有第二层) ----
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN)
    const year = num(b.year), month = num(b.month), day = num(b.day)
    const hour = num(b.hour), minute = num(b.minute ?? 0)
    const timezone = num(b.timezone), latitude = num(b.latitude), longitude = num(b.longitude)

    if (!Number.isInteger(year) || year < 1900 || year > 2100) return bad('出生年份需在 1900-2100')
    if (!Number.isInteger(month) || month < 1 || month > 12) return bad('出生月份无效')
    if (!Number.isInteger(day) || day < 1 || day > 31) return bad('出生日期无效')
    const timeKnown = b.timeKnown !== false
    if (timeKnown) {
      if (!Number.isInteger(hour) || hour < 0 || hour > 23) return bad('出生小时需在 0-23')
      if (!Number.isInteger(minute) || minute < 0 || minute > 59) return bad('出生分钟需在 0-59')
    }
    if (!(timezone >= -12 && timezone <= 14)) return bad('时区无效')
    if (!(latitude >= -90 && latitude <= 90)) return bad('纬度无效')
    if (!(longitude >= -180 && longitude <= 180)) return bad('经度无效')

    const houseSystem: HouseSystem =
      HOUSE_SYSTEMS.includes(b.houseSystem) ? b.houseSystem : 'placidus'

    // ---- 排盘设置 (白名单收窄) ----
    const VALID_ASPECTS = new Set(['conjunction','sextile','square','trine','opposition','quincunx','semi-sextile','semi-square','sesquiquadrate','quintile','biquintile','septile','novile','decile'])
    const VALID_GROUPS = new Set(['asteroids','chiron','nodes','lots','lilith'])
    const s = body?.settings ?? {}
    const settings: CastSettings = {}
    if (s.bodies && typeof s.bodies === 'object') {
      settings.bodies = {}
      for (const k of VALID_GROUPS) if (s.bodies[k] === true) (settings.bodies as Record<string, boolean>)[k] = true
    }
    if (s.nodeType === 'mean' || s.nodeType === 'true') settings.nodeType = s.nodeType
    if (s.lilithType === 'mean' || s.lilithType === 'true' || s.lilithType === 'both') settings.lilithType = s.lilithType
    if (Array.isArray(s.aspectTypes)) {
      settings.aspectTypes = s.aspectTypes.filter((x: unknown) => typeof x === 'string' && VALID_ASPECTS.has(x))
    }
    if (s.orbs && typeof s.orbs === 'object') {
      settings.orbs = {}
      for (const [k, v] of Object.entries(s.orbs)) {
        if (VALID_ASPECTS.has(k) && typeof v === 'number' && v >= 0.5 && v <= 15) (settings.orbs as Record<string, number>)[k] = v
      }
    }
    if (s.outOfSign === false) settings.outOfSign = false
    if (typeof s.oosPenalty === 'number' && s.oosPenalty >= 0 && s.oosPenalty <= 1) settings.oosPenalty = s.oosPenalty
    if (typeof s.minStrength === 'number' && s.minStrength >= 0 && s.minStrength <= 100) settings.minStrength = s.minStrength
    if (['core', 'planets', 'asteroids', 'all'].includes(s.aspectScope)) settings.aspectScope = s.aspectScope
    if (s.trueSolar === true) settings.trueSolar = true
    if (s.display && typeof s.display === 'object') {
      const d: NonNullable<CastSettings['display']> = {}
      if (s.display.dir === 'cw') d.dir = 'cw'
      if (s.display.ascPos === 'top') d.ascPos = 'top'
      for (const k of ['aspects', 'feet', 'nums', 'ticks'] as const) if (s.display[k] === false) d[k] = false
      if (s.display.feetAlways === true) d.feetAlways = true
      if (Object.keys(d).length) settings.display = d
    }

    const birth: BirthData = {
      year, month, day,
      hour: timeKnown ? hour : 12,
      minute: timeKnown ? minute : 0,
      timezone, latitude, longitude,
      city: typeof b.city === 'string' ? b.city.slice(0, 40) : undefined,
      label: typeof b.label === 'string' ? b.label.slice(0, 30) : undefined,
      cnCode: typeof b.cnCode === 'string' ? b.cnCode.slice(0, 60) : undefined,
      houseSystem,
      timeKnown,
    }

    const chart = castNatalChart(birth, settings)
    return NextResponse.json({ chart, evidence: chartEvidence(chart) })
  } catch (e) {
    console.error('[astro/chart] error:', e)
    return NextResponse.json({ error: '排盘计算失败' }, { status: 500 })
  }
}
