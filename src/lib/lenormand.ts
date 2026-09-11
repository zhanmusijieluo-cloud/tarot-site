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

/** 中文牌名静态镜像（会话存储/服务端 prompt 用；显示层一律走 i18n ln.N.name） */
export const LN_ZH_NAMES: Record<number, string> = {
  1: '骑手', 2: '三叶草', 3: '船', 4: '房子', 5: '树', 6: '云',
  7: '蛇', 8: '棺材', 9: '花束', 10: '镰刀', 11: '鞭子', 12: '鸟',
  13: '孩子', 14: '狐狸', 15: '熊', 16: '星', 17: '鹳', 18: '狗',
  19: '塔', 20: '公园', 21: '山', 22: '十字路口', 23: '老鼠', 24: '心',
  25: '戒指', 26: '书', 27: '信', 28: '男人', 29: '女人', 30: '百合',
  31: '太阳', 32: '月亮', 33: '钥匙', 34: '鱼', 35: '锚', 36: '十字',
};

/** 英文牌名静态镜像（服务端 prompt 用） */
export const LN_EN_NAMES: Record<number, string> = {
  1: 'Rider', 2: 'Clover', 3: 'Ship', 4: 'House', 5: 'Tree', 6: 'Clouds',
  7: 'Snake', 8: 'Coffin', 9: 'Bouquet', 10: 'Scythe', 11: 'Whip', 12: 'Birds',
  13: 'Child', 14: 'Fox', 15: 'Bear', 16: 'Star', 17: 'Stork', 18: 'Dog',
  19: 'Tower', 20: 'Park', 21: 'Mountain', 22: 'Crossroad', 23: 'Mice', 24: 'Heart',
  25: 'Ring', 26: 'Book', 27: 'Letter', 28: 'Man', 29: 'Woman', 30: 'Lily',
  31: 'Sun', 32: 'Moon', 33: 'Key', 34: 'Fish', 35: 'Anchor', 36: 'Cross',
};

/** 日文牌名静态镜像（日本通行ルノルマン叫法, 与 i18n ln.N.name 同源） */
export const LN_JA_NAMES: Record<number, string> = {
  1: '騎士', 2: 'クローバー', 3: '船', 4: '家', 5: '木', 6: '雲',
  7: '蛇', 8: '棺', 9: 'ブーケ', 10: '鎌', 11: '鞭', 12: '鳥',
  13: '子ども', 14: '狐', 15: '熊', 16: '星', 17: 'コウノトリ', 18: '犬',
  19: '塔', 20: '庭園', 21: '山', 22: '十字架路', 23: 'ネズミ', 24: '心臓',
  25: '指輪', 26: '本', 27: '手紙', 28: '男性', 29: '女性', 30: 'ユリ',
  31: '太陽', 32: '月', 33: '鍵', 34: '魚', 35: '錨', 36: '十字架',
};

/**
 * 占卜流程用牌面对象 — 字段刻意与塔罗 DrawnCard 兼容,
 * 让 TarotScene / 解读室能共用渲染逻辑。isReversed 恒为 false。
 */
export interface LnDrawnCard {
  id: number;
  name: string;
  isReversed: false;
  upright: string;
  reversedMeaning: string;
  element: string;
  zodiac: string;
  numeral: string;
  arcana: 'lenormand';
}

/** 36 张牌组（与 /lenormand 牌墙同源; 洗牌抽卡按此池进行） */
export const LN_DECK: LnDrawnCard[] = Array.from({ length: LN_COUNT }, (_, i) => ({
  id: i + 1,
  name: LN_ZH_NAMES[i + 1],
  isReversed: false as const,
  // upright 槽位承载中文关键词串(服务端 prompt 直接引用; 显示层不读它)
  upright: [
    '消息 · 访客 · 新动向', '小幸运 · 短暂机会', '旅行 · 远方 · 贸易', '家庭 · 稳定 · 根基', '健康 · 成长 · 生命力', '困惑 · 不确定 · 迷雾',
    '诱惑 · 复杂 · 智慧', '结束 · 停滞 · 转化', '礼物 · 欣赏 · 美好', '切割 · 决断 · 突袭', '争执 · 重复 · 竞争', '交谈 · 忧虑 · 沟通',
    '纯真 · 新的开始 · 小事', '职场 · 机敏 · 防骗', '力量 · 财富 · 守护者', '希望 · 指引 · 灵感', '转变 · 搬迁 · 更新', '忠诚 · 朋友 · 信任',
    '机构 · 孤立 · 界限', '社交 · 公共 · 聚会', '阻碍 · 挑战 · 考验', '选择 · 分岔 · 抉择', '损耗 · 焦虑 · 侵蚀', '爱情 · 情感 · 亲密',
    '承诺 · 契约 · 循环', '知识 · 秘密 · 学习', '文件 · 消息 · 沟通', '男性 · 当事人 · 行动者', '女性 · 当事人 · 感知者', '成熟 · 平和 · 美德',
    '成功 · 活力 · 光明', '情绪 · 直觉 · 声誉', '解决 · 关键 · 开启', '财富 · 生意 · 流动', '稳定 · 坚持 · 归宿', '考验 · 使命 · 负担',
  ][i],
  reversedMeaning: '',
  element: PLAYING[i],
  zodiac: '',
  numeral: String(i + 1).padStart(2, '0'),
  arcana: 'lenormand' as const,
}));

/** 多语言牌名: 会话卡对象 → 当前语言显示名 */
export function lnLocalName(id: number, lang: string, t?: (k: string) => string): string {
  const viaI18n = t ? t(`ln.${id - 1}.name`) : '';
  if (viaI18n && !viaI18n.startsWith('ln.')) return viaI18n;
  if (lang === 'en') return LN_EN_NAMES[id] || '';
  if (lang === 'ja') return LN_ZH_NAMES[id] || ''; // 日文牌名走 i18n 兜底(汉字相近)
  return LN_ZH_NAMES[id] || '';
}

/**
 * 雷诺曼牌阵 (与塔罗 SPREADS 分开, 避免混入塔罗牌阵库)
 * - positions: 中文位名(前端 localizePositions 可覆盖); 雷诺曼核心是"连线造句"
 */
export const LN_SPREADS: Record<string, { name: string; count: number; positions: string[] }> = {
  lnx3: {
    name: '三张连线',
    count: 3,
    positions: ['情况主线', '正在发生', '走向结果'],
  },
  lnx5: {
    name: '五张十字',
    count: 5,
    positions: ['主题核心', '左侧影响', '右侧影响', '上方助力', '下方根基'],
  },
  lnx9: {
    name: '九张方阵',
    count: 9,
    positions: ['左上', '上', '右上', '左', '中心·主题', '右', '左下', '下', '右下'],
  },
};
