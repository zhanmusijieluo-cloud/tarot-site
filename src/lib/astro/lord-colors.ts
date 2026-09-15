// ============================================================
// 法达/小限 主星配色 (单一来源: StatusTabs 表格 + ChartWheel2D 外环共用)
// 爸爸定标: 大运主星上色区分阶段; 色相与四元素/行星惯例一致
// ============================================================
export const LORD_HEX: Record<string, string> = {
  Sun: '#f0c470', Moon: '#c8d8f0', Mercury: '#8fd8c0', Venus: '#e8a0b8',
  Mars: '#ff9c90', Jupiter: '#8cc0ff', Saturn: '#b8a8d0',
  NorthNode: '#d8c090', SouthNode: '#8898a8',
}
export const LORD_HEX_OF = (lord: string): string => LORD_HEX[lord] ?? '#9aa3b5'
