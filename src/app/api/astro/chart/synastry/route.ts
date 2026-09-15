// ============================================================
// POST /api/astro/chart/synastry — 合盘 (比较盘): A/B 两张本命 + 跨盘相位
// 入参: { birthA, birthB, settings }
// 出参: { chart: SynastryChart { a, b, crossAspects, warnings } }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { type BirthData, type CastSettings, type HouseSystem } from '@/lib/astro/chart'
import { castSynastry } from '@/lib/astro/dynamic'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HOUSE_SYSTEMS: HouseSystem[] = ['placidus', 'koch', 'equal', 'whole-sign', 'porphyry', 'regiomontanus', 'campanus', 'morinus', 'vettius', 'alcabitiuses', 'sripati', 'pullen', 'polich-page', 'krusinski', 'carter', 'vehlow']
const VALID_ASPECTS = new Set(['conjunction', 'sextile', 'square', 'trine', 'opposition', 'quincunx', 'semi-sextile', 'semi-square', 'sesquiquadrate', 'quintile', 'biquintile', 'septile', 'novile', 'decile'])
const VALID_GROUPS = new Set(['asteroids', 'chiron', 'nodes', 'lots', 'lilith'])

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 })
}

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
  return out
}

function parseBirth(b: Record<string, unknown> | undefined): BirthData | null {
  if (!b) return null
  const year = Number(b.year), month = Number(b.month), day = Number(b.day)
  const hour = Number(b.hour ?? 12), minute = Number(b.minute ?? 0)
  const timezone = Number(b.timezone), latitude = Number(b.latitude), longitude = Number(b.longitude)
  const timeKnown = b.timeKnown === false ? false : true
  if (!Number.isInteger(year) || year < 1901 || year > 2100) return null
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  if (!Number.isInteger(day) || day < 1 || day > 31) return null
  if (!Number.isFinite(timezone) || timezone < -12 || timezone > 14) return null
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null
  const houseSystem: HouseSystem = HOUSE_SYSTEMS.includes(b.houseSystem as HouseSystem) ? (b.houseSystem as HouseSystem) : 'placidus'
  return {
    year, month, day,
    hour: timeKnown ? Math.min(23, Math.max(0, hour)) : 12,
    minute: timeKnown ? Math.min(59, Math.max(0, minute)) : 0,
    timezone, latitude, longitude,
    city: typeof b.city === 'string' ? b.city.slice(0, 40) : undefined,
    label: typeof b.label === 'string' ? b.label.slice(0, 30) : undefined,
    cnCode: typeof b.cnCode === 'string' ? b.cnCode.slice(0, 60) : undefined,
    houseSystem, timeKnown,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const birthA = parseBirth(body?.birthA)
    const birthB = parseBirth(body?.birthB)
    if (!birthA) return bad('主盘资料无效')
    if (!birthB) return bad('合盘档案资料无效')
    const settings = parseSettings(body?.settings)
    const chart = castSynastry(birthA, birthB, settings)
    return NextResponse.json({ chart })
  } catch (e) {
    return bad(`合盘计算失败: ${e instanceof Error ? e.message : String(e)}`)
  }
}
