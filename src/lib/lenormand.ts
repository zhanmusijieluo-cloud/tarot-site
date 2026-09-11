/**
 * 雷诺曼 36 张牌常量
 * - 牌名走 i18n: ln.(id-1).name / ln.(id-1).kw (id 从 1 开始)
 * - 牌面图: /lenormand/ln_XX.webp (1780年《希望之戏》公有领域扫描, 已裁切压缩)
 * - 雷诺曼传统无逆位: 读牌靠组合, 详见详解页 pairing 板块
 */

export const LN_COUNT = 36;

/** id: 1~36 */
export interface LenormandCardRef {
  id: number;
  /** i18n 键索引 = id - 1 */
  i18nIndex: number;
  /** 对应扑克 (源自 Game of Hope 原牌序) */
  playing: string;
}

/** 每张牌对应的扑克牌面 (标准 Petit Lenormand 传承表) */
const PLAYING = [
  '♥8', '6♥', '8♣', '10♦', 'A♠', 'K♥', 'Q♣', '9♠', '6♦', '10♣',
  '8♦', 'Q♦', '9♦', '7♠', '2♠', '9♥', 'Q♠', 'K♣', 'J♣', 'A♦',
  '7♥', '4♣', '5♣', 'A♥', '9♣', '7♦', '7♣', '8♠', 'K♦', '4♠',
  'J♦', 'J♥', 'A♣', 'K♠', 'Q♥', 'J♠',
];

export const LN_CARDS: LenormandCardRef[] = Array.from({ length: LN_COUNT }, (_, i) => ({
  id: i + 1,
  i18nIndex: i,
  playing: PLAYING[i],
}));

/** 牌面图路径 */
export function lnImage(id: number): string {
  return `/lenormand/ln_${String(id).padStart(2, '0')}.webp`;
}

/** 按 id 查牌 (越界返回 undefined) */
export function lnCard(id: number): LenormandCardRef | undefined {
  return LN_CARDS[id - 1];
}
