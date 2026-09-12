// 相位配色唯一定义 (爸爸定标: 六合蓝/刑红/拱绿/冲紫) — 盘线与网格/图例同源
// 独立模块防 ChartWheel↔AspectGrid 循环引用
export const ASPECT_HEX: Record<string, string> = {
  conjunction: '#ffd75e',   // 合(0°) 亮金 (避免与太阳盘橙同色, AI复检对比度最弱后提亮)
  sextile: '#5b9dd9',      // 六合(60°) 蓝
  square: '#e05c5c',       // 刑(90°) 红
  trine: '#5cc87f',        // 拱(120°) 绿
  opposition: '#a86fd8',   // 冲(180°) 紫
  quincunx: '#8f97ad',     // 梅花(150°) 中性灰
  'semi-square': '#c98f5f',
  'sesquiquadrate': '#c98f5f',
  'semi-sextile': '#9aa3b5',
  quintile: '#5fb8b0',
  biquintile: '#5fb8b0',
  septile: '#a8a0d0',
  novile: '#a8a0d0',
  decile: '#a8a0d0',
};
export const ASPECT_NUM: Record<string, number> = Object.fromEntries(
  Object.entries(ASPECT_HEX).map(([k, v]) => [k, parseInt(v.slice(1), 16)]),
);
export const aspectHex = (t: string) => ASPECT_HEX[t] ?? '#9aa3b5';
export const aspectNum = (t: string) => ASPECT_NUM[t] ?? 0x9aa3b5;
