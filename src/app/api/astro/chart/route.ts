import { NextRequest, NextResponse } from 'next/server'
import { castNatalChart, chartEvidence, type BirthData, type HouseSystem } from '@/lib/astro/chart'

/**
 * 占星排盘 API (骨架 v0.1)
 * POST /api/astro/chart  { birth: BirthData } → { chart, evidence }
 * 引擎算盘: 本路由输出即占断证据, 前端与 AI 均不得改动行星位置
 */

const HOUSE_SYSTEMS: HouseSystem[] = [
  'placidus', 'koch', 'equal', 'whole-sign', 'porphyry', 'regiomontanus', 'campanus',
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

    const chart = castNatalChart(birth)
    return NextResponse.json({ chart, evidence: chartEvidence(chart) })
  } catch (e) {
    console.error('[astro/chart] error:', e)
    return NextResponse.json({ error: '排盘计算失败' }, { status: 500 })
  }
}
