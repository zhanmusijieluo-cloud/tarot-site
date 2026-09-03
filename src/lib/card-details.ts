/**
 * 终极豪华版牌面详解数据结构
 * 每张牌包含：三语完整内容 + 牌面象征 + 多领域解读 + 神秘学关联
 */

/** 单张牌的完整详解（三语） */
export interface CardDetails {
  id: number;
  zh: CardLangContent;
  en: CardLangContent;
  ja: CardLangContent;
}

/** 单语种内容 */
export interface CardLangContent {
  /** 牌面描述：详细描写画面中的元素、人物、符号、颜色 */
  symbolism: string;
  /** 核心含义概述（1-2段） */
  core: string;
  /** 正位详解（3-5段，含深层含义） */
  upright: string;
  /** 逆位详解（3-5段） */
  reversed: string;
  /** 感情解读 */
  love: string;
  /** 事业解读 */
  career: string;
  /** 财运解读 */
  wealth: string;
  /** 健康/心灵解读 */
  health: string;
  /** 关键词列表 */
  keywords: string[];
  /** 一句话提醒/建议 */
  advice: string;
  /** 神话典故/文化原型（大阿卡纳为主） */
  myth?: string;
  /** 愚人之旅：与前后牌的关系/递进 */
  journey?: string;
  /** 颜色象征 */
  colorSymbolism?: string;
  /** 数字学含义 */
  numerology?: string;
  /** Yes/No 速查 */
  yesno?: string;
  /** 冥想指引 */
  meditation?: string;
  /** 水晶/植物/其他对应 */
  correspondences?: string;
}

// ============================================================
// 以下为自动生成的 78 张牌完整数据
// 生成脚本：scripts/generate-card-details.mjs
// ============================================================

// （数据在 card-details.data.ts 中，由生成脚本产出）