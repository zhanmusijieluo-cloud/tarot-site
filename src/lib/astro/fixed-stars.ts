// ============================================================
// 传统恒星表 (宫神星"恒星"表同款 + 常用亮星)
// 坐标: J2000 黄道 (取自 Hipparcos 星野数据, 黄纬用于交叉验证)
// 运行时: 出生年岁差修正 (+0.01397°/年) 后与星体合相 (orb ≤ 2°)
// ============================================================

export interface FixedStar {
  zh: string          // 中文星名 (宫神星同款命名)
  en: string          // 西名
  lon: number         // J2000 黄经 (度)
  lat: number         // J2000 黄纬 (度, 验证用)
  mag: number         // 视星等
}

export const FIXED_STARS: FixedStar[] = [
  { zh: '土司空', en: 'Diphda', lon: 2.58, lat: -20.78, mag: 2.0 },
  { zh: '毕宿五', en: 'Aldebaran', lon: 69.79, lat: -5.47, mag: 0.9 },
  { zh: '参宿七', en: 'Rigel', lon: 76.83, lat: -31.12, mag: 0.2 },
  { zh: '五车二', en: 'Capella', lon: 81.86, lat: 22.86, mag: 0.1 },
  { zh: '参宿四', en: 'Betelgeuse', lon: 88.75, lat: -16.03, mag: 0.5 },
  { zh: '天狼', en: 'Sirius', lon: 104.08, lat: -39.61, mag: -1.4 },
  { zh: '北河二', en: 'Castor', lon: 110.24, lat: 10.1, mag: 1.6 },
  { zh: '天枢', en: 'Dubhe', lon: 135.2, lat: 49.68, mag: 1.8 },
  { zh: '轩辕十四', en: 'Regulus', lon: 149.83, lat: 0.46, mag: 1.4 },
  { zh: '五帝座一', en: 'Denebola', lon: 171.62, lat: 12.27, mag: 2.1 },
  { zh: '太微左垣一', en: 'Zaniah', lon: 184.83, lat: 1.37, mag: 3.9 },
  { zh: '角宿一', en: 'Spica', lon: 203.84, lat: -2.05, mag: 1.0 },
  { zh: '大角', en: 'Arcturus', lon: 204.23, lat: 30.74, mag: -0.1 },
  { zh: '心宿二', en: 'Antares', lon: 249.76, lat: -4.57, mag: 1.1 },
  { zh: '织女一', en: 'Vega', lon: 285.32, lat: 61.73, mag: 0.0 },
  { zh: '天市右垣七', en: 'Serpens VII', lon: 292.56, lat: -20.66, mag: 4.1 },
  { zh: '北落师门', en: 'Fomalhaut', lon: 333.86, lat: -21.14, mag: 1.2 },
]

const norm = (d: number) => ((d % 360) + 360) % 360

/** 出生时点黄经 = J2000 + 岁差 (黄道上每年约 +0.01397°) */
export function starLonAt(s: FixedStar, year: number): number {
  return norm(s.lon + 0.01397 * (year - 2000))
}

/** 恒星与各星体的合相 (orb ≤ orbDeg, 默认 2°) */
export function starConjunctions(
  s: FixedStar,
  year: number,
  bodies: { name: string; longitude: number }[],
  orbDeg = 2,
): string[] {
  const sl = starLonAt(s, year)
  const out: string[] = []
  for (const b of bodies) {
    const d = Math.abs(norm(b.longitude - sl + 180) - 180)
    if (d <= orbDeg) out.push(b.name)
  }
  return out
}
