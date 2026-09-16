/**
 * 占星模块三语支持（zh / en / ja）
 *
 * 背景：占星模块原先统一用 `zhMode ? 中文 : 英文` 两分支写法，
 * 而 `zhMode = lang !== 'en'` —— 于是**日文用户被归入"非英文"分支，看到的是中文**。
 * 本文件提供三语选择器 L() 与日文术语表，供逐处替换时复用。
 *
 * 用法：
 *   import { L, type AstroLang } from '@/lib/astro/i18n';
 *   const label = L(lang, '本命盘', 'Natal', 'ネイタル');
 */

export type AstroLang = 'zh' | 'en' | 'ja';

/** 三语选择：ja 优先判日文，其次 en，否则中文 */
export function L(lang: AstroLang, zh: string, en: string, ja: string): string {
  if (lang === 'ja') return ja;
  if (lang === 'en') return en;
  return zh;
}

/** 由 i18n 的 lang 归一化为 AstroLang */
export function toAstroLang(lang: string): AstroLang {
  return lang === 'ja' ? 'ja' : lang === 'en' ? 'en' : 'zh';
}

/**
 * 日文占星术语表（按日本占星圈通用译法整理）。
 * 说明：日本占星界对外来术语多用片假名音译，古典技法用汉字或片假名混写；
 * 下表取行业通行写法，供界面文案复用。如站主有偏好的译法，改这里即可全局生效。
 */
export const JA = {
  // ---- 盘种 ----
  natal: 'ネイタル',
  natalChart: 'ネイタルチャート',
  sky: 'トランシット',
  transit: 'トランシット',
  synastry: 'シナストリー',
  secondary: '二次限',
  tertiary: '三次限',
  lunarReturn: 'ルナリターン',
  solarReturn: 'ソーラーリターン',
  firdaria: 'ファルダリア',
  solarArc: 'ソーラーアーク',
  profection: 'プロフェクション',

  // ---- 星体 ----
  sun: '太陽', moon: '月', mercury: '水星', venus: '金星', mars: '火星',
  jupiter: '木星', saturn: '土星', uranus: '天王星', neptune: '海王星', pluto: '冥王星',
  northNode: 'ドラゴンヘッド', southNode: 'ドラゴンテイル',
  ascendant: 'アセンダント', descendant: 'ディセンダント',
  midheaven: 'MC', ic: 'IC',

  // ---- 相位 ----
  conjunction: 'コンジャンクション',
  opposition: 'オポジション',
  trine: 'トライン',
  square: 'スクエア',
  sextile: 'セクスタイル',
  quincunx: 'クインカンクス',
  applying: 'アプライイング',
  separating: 'セパレーティング',

  // ---- 尊贵 / 接纳 ----
  domicile: 'ドミサイル',
  exaltation: 'エグザルテーション',
  detriment: 'デトリメント',
  fall: 'フォール',
  peregrine: 'ペレグリン',
  triplicity: 'トリプリシティ',
  term: 'ターム',
  face: 'フェイス',
  reception: 'レセプション',
  mutualReception: 'ミューチュアルレセプション',

  // ---- 宫位 / 星座 ----
  house: 'ハウス',
  sign: 'サイン',
  retrograde: '逆行',
  dignity: 'ディグニティ',
  aspects: 'アスペクト',
  features: '特徴',
  longitude: '経度',
  exalts: 'エグザルテーション',
  rules: 'ルーラー',
  score: 'スコア',

  // ---- 操作 ----
  editData: 'データ編集',
  chartSettings: 'チャート設定',
  pickArchive: 'プロフィールから選択',
  clearSelection: '選択解除',
  classicWheel: 'クラシックホイール',
  tropical: 'トロピカル',
} as const;

/**
 * 日文行星名（简体中文名 → 日文）。
 * 日文与中文多数同形，主要差异：太阳→太陽、月亮→月、北交→ドラゴンヘッド。
 * 各占星组件统一从这里导入，避免多处重复定义。
 */
export const PLANET_JA: Record<string, string> = {
  Sun: '太陽', Moon: '月', Mercury: '水星', Venus: '金星', Mars: '火星',
  Jupiter: '木星', Saturn: '土星', Uranus: '天王星', Neptune: '海王星', Pluto: '冥王星',
  NorthNode: 'ドラゴンヘッド', SouthNode: 'ドラゴンテイル',
  Ascendant: 'アセンダント', Descendant: 'ディセンダント', Midheaven: 'MC', IC: 'IC',
};
