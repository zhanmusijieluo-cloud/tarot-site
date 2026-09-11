/**
 * 牌阵布局注册表 —— 按「牌阵 key」定义每个牌阵的真实空间结构（坐标为容器百分比，顺序与牌位索引一一对应）。
 *
 * 解读室（/reading/session）与牌阵详情页（/online/spread/[key]）共用，
 * 保证「详情页预览的布局」和「解读室实际摆出的布局」完全一致。
 *
 * ─────────────────────────────────────────────────────────────
 * 【重要约定】新增牌阵时，摆放必须先查经典塔罗牌阵的权威参考，禁止随手排网格：
 *  - 经典牌阵（马蹄阵、时间流、六芒星等）：严格按传统摆法
 *  - 时间/阶段类：横向时间线，左=过去/起点，右=未来/结果
 *  - 对比抉择类：A 与 B 左右分立对称，决策核心居中或居顶
 *  - 关系类：双方左右相对而坐，连接/互动放中间
 *  - 网站原创分析型牌阵按语义逻辑：中心=核心现状，上=压力/障碍/显见，
 *    下=基础/行动，左=自身/内在/过去侧，右=外部/机会/未来侧
 *
 * 【几何自动求解】本文件不再手工指定纵横比与卡宽——solveGeometry() 会按
 * 坐标 + 牌宽档位自动算出「不遮挡标签、行间有净空、列间有净隙」所需的
 * 最小容器高度和该高度下能用的最大牌宽（在手机 320px 与桌面 672px 容器
 * 两端同时满足），彻底避免手工拍数字导致的溢出/留白问题。
 * ─────────────────────────────────────────────────────────────
 */

export interface SpreadPoint {
  x: number;
  y: number;
}

/** 卡片宽高比：aspectRatio '2 / 3.4' */
export const CARD_H_RATIO = 3.4 / 2;

/** 几何约束常量（px，按两端视口统一取保守值） */
const LABEL_SPACE = 24; // 牌位名称占位（mt-1.5 + 一行文字）
const ROW_GAP = 26; // 同列相邻两牌之间除标签外的净空
const COL_GAP = 10; // 横向相邻两牌之间的净隙

/** 单卡宽度档位（Tailwind class → px）。求解时从大到小尝试。 */
export const CARD_W_STEPS: { cls: string; px: number }[] = [
  { cls: 'w-32', px: 128 },
  { cls: 'w-28', px: 112 },
  { cls: 'w-24', px: 96 },
  { cls: 'w-20', px: 80 },
  { cls: 'w-[4.5rem]', px: 72 },
  { cls: 'w-16', px: 64 },
  { cls: 'w-14', px: 56 },
  { cls: 'w-12', px: 48 },
];

/** Tailwind 卡宽 class → 像素值（横置交叉牌需按 px 计算横向尺寸） */
export function cardWClassToPx(cls: string): number {
  return CARD_W_STEPS.find((s) => s.cls === cls)?.px ?? 64;
}

/** 两端设计视口下的容器宽（页面 max-w-2xl 减去内边距后的可用宽） */
const CONTAINER_W = { mobile: 292, desktop: 672 };

interface RawLayout {
  coords: SpreadPoint[];
  /** 指定卡宽档位索引（0=最大 w-32）；不指定则自动求解最大可用档位 */
  step?: number;
}

/** 十字形：中心核心 + 上障碍 + 左自身 + 右外部 + 下行动 */
const CROSS_5: SpreadPoint[] = [
  { x: 50, y: 52 }, // 中
  { x: 24, y: 52 }, // 左
  { x: 76, y: 52 }, // 右
  { x: 50, y: 17 }, // 上
  { x: 50, y: 87 }, // 下
];

/** A/B 对比型：顶部决策核心 + 左右两列各两张 */
const AB_CHOICE: SpreadPoint[] = [
  { x: 50, y: 13 }, // 核心/处境
  { x: 26, y: 50 }, // A
  { x: 26, y: 87 }, // A 走向
  { x: 74, y: 50 }, // B
  { x: 74, y: 87 }, // B 走向
];

/** 双方关系型：你左 · 对方右 · 连接居中 · 阻碍在上 · 方向在下 */
const PAIR_5: SpreadPoint[] = [
  { x: 24, y: 48 }, // 你
  { x: 76, y: 48 }, // 对方
  { x: 50, y: 48 }, // 连接/互动
  { x: 50, y: 14 }, // 阻碍/边界
  { x: 50, y: 85 }, // 方向
];

/** 横向时间线 4 张 + 底部补充 1 张 */
const TIMELINE_4_PLUS_1: SpreadPoint[] = [
  { x: 13, y: 38 },
  { x: 38, y: 38 },
  { x: 62, y: 38 },
  { x: 87, y: 38 },
  { x: 50, y: 82 },
];

/**
 * 圣三角牌阵：倒三角形。
 * 权威摆法（taluo.chinatarot / daybreaktarot / 终极塔罗奥义）：
 * 1 过去=左下，2 现在=右下，3 未来=顶端
 */
const HOLY_TRIANGLE: SpreadPoint[] = [
  { x: 26, y: 78 }, // 1 过去与原因（左下）
  { x: 74, y: 78 }, // 2 现状与症结（右下）
  { x: 50, y: 18 }, // 3 未来与结果（顶）
];

const SPREAD_RAW: Record<string, RawLayout> = {
  // ═══ 综合 ═══
  single: {
    coords: [{ x: 50, y: 52 }],
      step: 2,
  },
  three: {
    // 经典三牌时间流：过去-现在-未来 一条横线
    coords: [
      { x: 20, y: 52 },
      { x: 50, y: 52 },
      { x: 80, y: 52 },
    ],
      step: 2,
  },
  holy_triangle: {
    coords: HOLY_TRIANGLE,
      step: 2,
  },
  // ═══ 雷诺曼 (id 1-36 独立牌组, key 以 ln 前缀区分) ═══
  ln3a: {
    // 三张时光线：左→中→右连读成句
    coords: [
      { x: 20, y: 52 },
      { x: 50, y: 52 },
      { x: 80, y: 52 },
    ],
      step: 2,
  },
  ln3b: {
    // 三张解题盒：同直线布局
    coords: [
      { x: 20, y: 52 },
      { x: 50, y: 52 },
      { x: 80, y: 52 },
    ],
      step: 2,
  },
  ln5: {
    // 五张聚焦线：一行五张，中心为题眼（主流雷诺曼读法，非十字）
    coords: [
      { x: 10, y: 52 },
      { x: 30, y: 52 },
      { x: 50, y: 52 },
      { x: 70, y: 52 },
      { x: 90, y: 52 },
    ],
      step: 4,
  },
  ln9: {
    // 九张全景盒：3×3 环绕中心主题
    coords: [
      { x: 22, y: 18 }, { x: 50, y: 18 }, { x: 78, y: 18 },
      { x: 22, y: 50 }, { x: 50, y: 50 }, { x: 78, y: 50 },
      { x: 22, y: 82 }, { x: 50, y: 82 }, { x: 78, y: 82 },
    ],
  },
  situation: {
    // 核心问题居中；已看见在左（明处），未看见在右（暗处）；阻碍压上方；行动落下方
    coords: CROSS_5,
      step: 4,
  },
  horseshoe: {
    // 经典马蹄阵：七张沿拱形弧线排列（左下起点顺时针到右下）
    // 两端 #1/#7 各内收 2%（8→10, 92→90）保证手机端不出界
    coords: [
      { x: 10, y: 78 }, // 1 过去
      { x: 16, y: 42 }, // 2 现在
      { x: 33, y: 17 }, // 3 隐藏因素
      { x: 50, y: 11 }, // 4 阻碍
      { x: 67, y: 17 }, // 5 外部影响
      { x: 84, y: 42 }, // 6 建议
      { x: 90, y: 78 }, // 7 可能结果
    ],
    step: 7,
  },
  hexagram: {
    // 六芒星牌阵（所罗门之星）：七张构成六芒星 —— 1/2/3 组成倒三角（时间线：左下过去、右下现在、顶上未来），
    // 4/5/6 组成正三角（左中策略、右中环境、正下态度），7 结果居中。
    // 权威参考：tarnote「所罗门之星」、zhouyi.cc 六芒星占卜法、sharuo 塔罗讲堂图示
    coords: [
      { x: 26, y: 76 }, // 1 过去状况（倒三角 左下）
      { x: 74, y: 76 }, // 2 现在状况（倒三角 右下）
      { x: 50, y: 12 }, // 3 未来状况（倒三角 顶点）
      { x: 50, y: 44 }, // 4 应对策略（正三角 顶点，与3上下相对）
      { x: 30, y: 44 }, // 5 周遭环境（正三角 左下）
      { x: 70, y: 44 }, // 6 自身态度（正三角 右下）
      { x: 50, y: 62 }, // 7 最终结果（两三角交叠中心）
    ],
      step: 6,
  },

  // ═══ 感情 ═══
  relationship: {
    // 双方相对：你在左、对方在右、连接居中、阻碍在上、发展方向在下
    coords: PAIR_5,
      step: 5,
  },
  feelings: {
    // 你在左；对方外在（展示面）右上、内在（深层）右侧中、顾虑右下；下一步倾向在你与对方之间
    coords: [
      { x: 20, y: 52 }, // 你给出的感受
      { x: 63, y: 18 }, // 对方外在表现
      { x: 85, y: 52 }, // 对方内在倾向
      { x: 63, y: 86 }, // 对方顾虑
      { x: 41, y: 52 }, // 下一步倾向
    ],
      step: 5,
  },
  ambiguity: {
    // 当前信号居中；吸引在左（拉力）、迟疑在右（阻力）；外部分别压上；走向落下方
    coords: CROSS_5,
      step: 4,
  },
  reconciliation: {
    // 分开原因悬于顶部；你/连接/对方三张水平居中一线；修复条件与复合趋势落在底部两端
    coords: [
      { x: 50, y: 13 }, // 分开原因
      { x: 23, y: 48 }, // 你的状态
      { x: 77, y: 48 }, // 对方状态
      { x: 50, y: 48 }, // 仍存连接
      { x: 29, y: 85 }, // 修复条件
      { x: 71, y: 85 }, // 复合趋势
    ],
      step: 6,
  },
  new_love: {
    // 你的准备度在左（自身基底）、阻碍压上、机会在右、识别信号居中、行动落下方
    coords: [
      { x: 24, y: 52 }, // 你的准备度
      { x: 50, y: 17 }, // 感情阻碍
      { x: 76, y: 52 }, // 相遇机会
      { x: 50, y: 52 }, // 识别信号
      { x: 50, y: 87 }, // 你的行动
    ],
      step: 4,
  },
  love_choice: {
    // 你的真实需要居顶；关系 A 与其走向在左列，关系 B 与其走向在右列
    coords: AB_CHOICE,
      step: 5,
  },
  inspiration: {
    // 灵感对应牌阵：左右两列平行线 —— 左列（自己）自上而下 1/3/5，右列（对方）自上而下 2/4/6，
    // 同一行的两张互相对应。权威参考：tarnote 靈感對應牌陣、sharuo 塔罗讲堂「1 3 5 / 2 4 6」
    coords: [
      { x: 30, y: 16 }, // 1 你对对方的看法（左上）
      { x: 70, y: 16 }, // 2 对方对你的看法（右上）
      { x: 30, y: 50 }, // 3 你认为目前的关系（左中）
      { x: 70, y: 50 }, // 4 对方认为目前的关系（右中）
      { x: 30, y: 84 }, // 5 你期望将来的发展（左下）
      { x: 70, y: 84 }, // 6 对方期望将来的发展（右下）
    ],
      step: 3,
  },
  venus_love: {
    // 维纳斯之爱牌阵：阵形取自金星符号♀（圆环+下方十字）。
    // 权威参考：sharuo 塔罗讲堂图示「上行 3 1 2 4 / 下行 7 5 8 6」——
    // 圆环部分 3(左) 1(顶) 2(右上) 4(下)，十字横臂 7(左) 8(右)，交点 5，竖线底端 6。
    coords: [
      { x: 50, y: 14 }, // 1 你对问题的看法（圆环顶）
      { x: 68, y: 28 }, // 2 对方对你的心态（圆环右上）
      { x: 32, y: 28 }, // 3 你对对方的影响（圆环左）
      { x: 50, y: 42 }, // 4 对方对你的影响（圆环下）
      { x: 50, y: 60 }, // 5 双方之间的障碍（十字交点）
      { x: 50, y: 88 }, // 6 恋情的结果（竖线底端）
      { x: 26, y: 60 }, // 7 你未来的心境（横臂左）
      { x: 74, y: 60 }, // 8 对方未来的心境（横臂右）
    ],
      step: 5,
  },
  lovers_pyramid: {
    // 恋人金字塔：三角形 —— 底边 1(你) 左、2(对方) 右，3(关系) 居中上方，4(未来) 塔尖。
    // 权威参考：『恋人塔罗牌』p104、pairs.tw 戀人金字塔牌陣
    coords: [
      { x: 22, y: 82 }, // 1 你的心态（底左）
      { x: 78, y: 82 }, // 2 对方的心态（底右）
      { x: 50, y: 52 }, // 3 目前的关系（中层）
      { x: 50, y: 14 }, // 4 未来发展（塔尖）
    ],
      step: 3,
  },
  voice_of_heart: {
    // 心之声牌阵（传统版型）：上行 1现在-2未来-3内在-4外在 横排；下行 5对方-6期望-7自己-8建言 横排。
    // 权威参考：tarnote 心之聲牌陣、daybreaktarot 版型图
    coords: [
      { x: 13, y: 24 }, // 1 双方现在状况
      { x: 38, y: 24 }, // 2 不久后的未来
      { x: 62, y: 24 }, // 3 对方的内在印象
      { x: 87, y: 24 }, // 4 对方的外在印象
      { x: 13, y: 76 }, // 5 对方的状况
      { x: 38, y: 76 }, // 6 对方的期望
      { x: 62, y: 76 }, // 7 自己的状况
      { x: 87, y: 76 }, // 8 关系的建言
    ],
      step: 5,
  },
  gypsy_cross: {
    // 吉普赛十字牌阵：中央十字 —— 上1对方心情、下4环境阻碍、左2自己现状、右3相处方式、中心5结果。
    // 权威参考：zhouyi.cc 吉普赛十字占卜法（揭牌顺序 上→下→左右→中心）
    coords: [
      { x: 50, y: 12 }, // 1 对方的心情想法（上）
      { x: 18, y: 50 }, // 2 自己的现状（左）
      { x: 82, y: 50 }, // 3 相处方式与态度（右）
      { x: 50, y: 88 }, // 4 环境与阻碍（下）
      { x: 50, y: 50 }, // 5 关系的最终结果（中心）
    ],
      step: 3,
  },

  // ═══ 事业 ═══
  career_growth: {
    // 当前阶段居中；优势在左、限制压上、机会在右、行动落下方
    coords: CROSS_5,
      step: 4,
  },
  job_search: {
    // 求职状态居中；匹配在左、对方印象显于上、需补足落于底、结果趋势朝右前
    coords: [
      { x: 50, y: 52 },
      { x: 24, y: 52 },
      { x: 50, y: 17 },
      { x: 50, y: 87 },
      { x: 76, y: 52 },
    ],
      step: 4,
  },
  job_change: {
    // 「留下」整列在左、「离开」整列在右（各上下两张），决策关键居中
    coords: [
      { x: 21, y: 20 }, // 留下的收获
      { x: 21, y: 82 }, // 留下的代价
      { x: 79, y: 20 }, // 离开的收获
      { x: 79, y: 82 }, // 离开的代价
      { x: 50, y: 51 }, // 决策关键
    ],
      step: 5,
  },
  project: {
    // 金字塔：目标居顶；资源/协作/阻碍三力横列中部；关键转折与结果趋势落底
    coords: [
      { x: 50, y: 12 }, // 项目目标
      { x: 20, y: 52 }, // 可用资源
      { x: 50, y: 52 }, // 协作状态
      { x: 80, y: 52 }, // 主要阻碍
      { x: 30, y: 88 }, // 关键转折
      { x: 70, y: 88 }, // 结果趋势
    ],
      step: 6,
  },
  workplace: {
    // 你与对方左右相对；隐藏互动居中；边界压上；相处方向落底
    coords: PAIR_5,
      step: 5,
  },
  breakthrough: {
    // 当前瓶颈居中；未使用的能力在左；补足打基础于底；突破机会开在上；第一步朝右迈出
    coords: [
      { x: 50, y: 52 },
      { x: 24, y: 52 },
      { x: 50, y: 87 },
      { x: 50, y: 17 },
      { x: 76, y: 52 },
    ],
      step: 4,
  },

  // ═══ 财富 ═══
  finance_status: {
    // 收入在左、支出在右（进出对流）；盲点居中；资源压上；调整重点落底
    coords: [
      { x: 24, y: 52 },
      { x: 76, y: 52 },
      { x: 50, y: 52 },
      { x: 50, y: 17 },
      { x: 50, y: 87 },
    ],
      step: 4,
  },
  income_opportunity: {
    // 现有渠道在左、潜在机会在右；门槛居中（跨过去的门）；防范警醒于上；验证行动落底
    coords: [
      { x: 24, y: 52 },
      { x: 76, y: 52 },
      { x: 50, y: 52 },
      { x: 50, y: 17 },
      { x: 50, y: 87 },
    ],
      step: 4,
  },
  side_business: {
    // 真实动机居中；能力在左（自身）、需求在右（市场）；投入代价压上；最小尝试落底
    coords: CROSS_5,
      step: 4,
  },
  spending_blindspot: {
    // 2×2：触发与漏洞在上行（问题面），真实需要与边界在下行（对策面）
    coords: [
      { x: 30, y: 28 },
      { x: 70, y: 28 },
      { x: 30, y: 76 },
      { x: 70, y: 76 },
    ],
      step: 3,
  },
  finance_three_months: {
    // 时间线：当前基础 + 三个月横向排列，稳住重点落于中下
    coords: TIMELINE_4_PLUS_1,
      step: 5,
  },

  // ═══ 抉择 ═══
  choice: {
    // 经典二选一：当前处境居顶；A 与 A 走向在左列，B 与 B 走向在右列
    coords: AB_CHOICE,
      step: 5,
  },
  stay_or_leave: {
    // 你的需要居中；留在左、离开在右；隐藏条件压上；判断关键落底
    coords: CROSS_5,
      step: 4,
  },
  timing: {
    // 菱形四点：窗口开在上、风险守在左、信号亮在右、自身准备垫底
    coords: [
      { x: 50, y: 84 }, // 自身准备
      { x: 50, y: 16 }, // 外部窗口
      { x: 18, y: 50 }, // 等待风险
      { x: 82, y: 50 }, // 行动信号
    ],
      step: 3,
  },
  problem_solving: {
    // 分支流程：根源起于左 → 症状浮于上、资源沉于下 → 解决动作居中推进 → 改善方向指向右端
    coords: [
      { x: 13, y: 52 }, // 问题根源
      { x: 38, y: 20 }, // 表面症状
      { x: 38, y: 84 }, // 可用资源
      { x: 63, y: 52 }, // 解决动作
      { x: 88, y: 52 }, // 改善方向
    ],
      step: 5,
  },
  risk_blindspot: {
    // 已知风险在左（明处）、隐藏风险居中（暗处）；容易忽略悬于上；安全边界在右；应对动作落底
    coords: [
      { x: 24, y: 52 },
      { x: 50, y: 52 },
      { x: 50, y: 17 },
      { x: 76, y: 52 },
      { x: 50, y: 87 },
    ],
      step: 4,
  },
  multi_choice: {
    // 三方案对比：核心标准居顶；A/B/C 三列各自「收获在上、代价在下」纵向对齐
    coords: [
      { x: 50, y: 11 }, // 核心标准
      { x: 19, y: 49 }, // A 收获
      { x: 19, y: 87 }, // A 代价
      { x: 50, y: 49 }, // B 收获
      { x: 50, y: 87 }, // B 代价
      { x: 81, y: 49 }, // C 收获
      { x: 81, y: 87 }, // C 代价
    ],
      step: 6,
  },

  // ═══ 成长 ═══
  weekly: {
    // 周一至周五横排一行；周末与本周主题并列底部
    coords: [
      { x: 11, y: 28 }, // 周一
      { x: 30.5, y: 28 },
      { x: 50, y: 28 },
      { x: 69.5, y: 28 },
      { x: 89, y: 28 }, // 周五
      { x: 30.5, y: 80 }, // 周末
      { x: 69.5, y: 80 }, // 本周主题
    ],
      step: 6,
  },
  month: {
    // 本月主题居中；挑战在左、机会在右；人际影响压上；行动重点落底
    coords: [
      { x: 50, y: 52 },
      { x: 76, y: 52 },
      { x: 24, y: 52 },
      { x: 50, y: 17 },
      { x: 50, y: 87 },
    ],
      step: 4,
  },
  quarter: {
    // 时间线：当前状态 + 三个月横排；关键转折/可用支持/阶段建议并列底部
    coords: [
      { x: 12, y: 28 }, // 当前状态
      { x: 37, y: 28 }, // 第一个月
      { x: 62, y: 28 }, // 第二个月
      { x: 87, y: 28 }, // 第三个月
      { x: 25, y: 80 }, // 关键转折
      { x: 50, y: 80 }, // 可用支持
      { x: 75, y: 80 }, // 阶段建议
    ],
      step: 6,
  },
  new_stage: {
    // 离开在左（过去侧）、进入在右（未来侧）；担忧压上、资源垫底；第一步立于正中
    coords: [
      { x: 24, y: 52 },
      { x: 76, y: 52 },
      { x: 50, y: 17 },
      { x: 50, y: 87 },
      { x: 50, y: 52 },
    ],
      step: 4,
  },
  talents: {
    // 自然优势天赋降于上；后天能力居中；待开发在左；适合环境在右；培养方式筑底
    coords: [
      { x: 50, y: 17 },
      { x: 50, y: 52 },
      { x: 24, y: 52 },
      { x: 76, y: 52 },
      { x: 50, y: 87 },
    ],
      step: 4,
  },
  inner_lesson: {
    // 纵向深度轴：表层情绪浮于上、深层需要沉于底、重复模式居于核心；建立在左、行动在右
    coords: [
      { x: 50, y: 17 },
      { x: 50, y: 87 },
      { x: 50, y: 52 },
      { x: 24, y: 52 },
      { x: 76, y: 52 },
    ],
      step: 4,
  },
};

/** 兜底：无注册布局时按张数网格排布（自定义牌阵等） */
function fallbackCoords(n: number): SpreadPoint[] {
  const cols = Math.min(n, 4);
  const rowCount = Math.ceil(n / cols);
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const inRow = r === rowCount - 1 ? ((n - 1) % cols) + 1 : cols;
    return { x: (((i % cols) + 0.5) / inRow) * 100, y: (((r + 0.5) / rowCount) * 100) };
  });
}

/* ═══════════════════════ 几何自动求解 ═══════════════════════ */

/**
 * 给定坐标与容器宽、卡宽，求「所有点完整可见（含标签）、同列有净空」所需的最小容器高。
 */
function requiredHeight(pts: SpreadPoint[], W: number, cw: number): number {
  const ch = cw * CARD_H_RATIO;
  let H = 1;
  for (const pt of pts) {
    const y = pt.y;
    H = Math.max(H, (ch / 2) * (100 / Math.max(y, 0.001)), ((ch / 2) + LABEL_SPACE) * (100 / Math.max(100 - y, 0.001)));
  }
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dxPx = Math.abs(pts[i].x - pts[j].x) * W / 100;
      if (dxPx >= cw + COL_GAP) continue; // 不同列
      const dy = Math.abs(pts[i].y - pts[j].y);
      if (dy < 1) continue; // 同位叠牌
      H = Math.max(H, (ch + ROW_GAP) * (100 / dy));
    }
  }
  return H;
}

export interface SolvedStyle {
  /** 容器高度（px）——按当前实际宽度精确求解，无留白无溢出 */
  height: number;
}

/**
 * 【核心 API】按容器实际宽度求解注册牌阵的布局样式。
 * 内部委托 solveCoordsLayout；卡宽取注册档位（不超过容器宽的 30%），
 * 容器高按「所有牌完整可见 + 标签占位 + 同列净空」精确算出。
 */
export function solveSpreadLayout(
  key: string | null | undefined,
  n: number,
  containerW: number
): { coords: SpreadPoint[]; height: number; cardW: string } {
  const layout = key ? SPREAD_RAW[key] : undefined;
  const registered = layout && layout.coords.length === n;
  const coords = registered ? layout!.coords : fallbackCoords(n);
  const stepIdx = registered ? (layout!.step ?? 4) : 4;
  // 若有横置交叉牌（crossIdx ≥ 0）传 crossIdx 让求解器按 1.7 倍有效宽处理
  const geom = solveCoordsLayout(coords, stepIdx, containerW, getCrossIdx(key, n));
  return { coords, ...geom };
}

/**
 * 【通用 API】对任意百分比坐标求解布局（自定义牌阵网格等）。
 * 算法与注册牌阵一致：从指定档位向下逐级尝试可用最大卡宽，再精确求容器高。
 */
export function solveCoordsLayout(
  coords: SpreadPoint[],
  stepIdx: number,
  containerW: number,
  crossIdx = -1
): { height: number; cardW: string } {
  // 卡宽求解：
  // ① 边缘约束：最靠边的牌不出界 → 每点有效宽的一半 ≤ 距容器边缘距离
  // ② 列间约束：同一水平带内相邻牌净隙 ≥ COL_GAP
  // ③ 横置交叉牌（crossIdx ≥ 0）有效宽 = cand × CARD_H_RATIO（高变宽，需一并计入约束），
  //    否则求解器按竖牌宽估算，会导致横牌横向溢出或压到相邻牌。
  // 从注册档位向下逐级尝试，取第一个满足的；都不满足则用最小档。
  const W = Math.max(containerW, 120);
  const effW = (i: number, cand: number) => (i === crossIdx ? cand * CARD_H_RATIO : cand);
  const edgeOk = (cand: number) =>
    coords.every((p, i) => Math.min(p.x, 100 - p.x) * W / 100 >= effW(i, cand) / 2);
  let px = CARD_W_STEPS[CARD_W_STEPS.length - 1].px;
  for (let i = stepIdx; i < CARD_W_STEPS.length; i++) {
    const cand = CARD_W_STEPS[i].px;
    if (!edgeOk(cand)) continue;
    // 检查同水平带（y 差换算 px 后 < 半张牌高，用「先按此卡宽估一版容器高」精确化）内任意两点的横向净隙
    const estH = requiredHeight(coords, W, cand);
    let ok = true;
    for (let a = 0; a < coords.length && ok; a++) {
      for (let b = a + 1; b < coords.length; b++) {
        const dyPx = Math.abs(coords[a].y - coords[b].y) * estH / 100;
        if (dyPx > cand * CARD_H_RATIO * 0.5) continue;
        const needX = effW(a, cand) / 2 + effW(b, cand) / 2 + COL_GAP;
        const dxPx = Math.abs(coords[a].x - coords[b].x) * W / 100;
        if (dxPx > 0.001 && dxPx < needX) { ok = false; break; }
      }
    }
    if (ok) { px = cand; break; }
  }

  // 高度按最终选定的卡宽精确求解
  const height = requiredHeight(coords, W, px);
  return { height: Math.ceil(height), cardW: CARD_W_STEPS[CARD_W_STEPS.findIndex((s) => s.px === px)].cls };
}

/** 自定义牌阵网格：{row,col,cols} 格位坐标 → 容器百分比坐标 */
export function customGridToCoords(
  cells: { row: number; col: number; cols: number }[]
): SpreadPoint[] {
  return cells.map((p) => ({
    x: ((p.col + 0.5) / Math.max(p.cols, 1)) * 100,
    y: ((p.row + 0.5) / CUSTOM_GRID_ROWS) * 100,
  }));
}

/** 自定义牌阵画布固定行数（布阵页与解读室必须一致） */
export const CUSTOM_GRID_ROWS = 8;
/** 自定义牌阵画布最大列数（与布阵页 MAX_COLS 一致） */
export const CUSTOM_GRID_MAX_COLS = 12;

/**
 * 【自定义牌阵专用】按格位行列求解解读室布局——自适应且互不遮挡。
 *
 * 与百分比通用求解器的区别：自定义格位是规则网格，直接用确定几何而非逐级试探：
 * - 卡宽 = min(列宽上限, 全局档位上限)，保证同列相邻牌 + 标签互不遮挡
 * - 容器高 = 行数 × (牌高 + 标签高)，每行独立成带，绝无纵向溢出
 * - 牌位名一律单行截断（CSS truncate 由渲染端负责），不再挤占下一行
 */
export function solveCustomGridLayout(
  cells: { row: number; col: number; cols: number }[],
  containerW: number
): { height: number; cardW: string } {
  const W = Math.max(containerW, 120);
  const usedCols = Math.min(Math.max(...cells.map((c) => c.col)) + 1, CUSTOM_GRID_MAX_COLS);
  // 列宽约束：卡宽 ≤ 列距 − 净隙；再与全局最小档兜底
  const colPitch = W / usedCols;
  const maxByCol = colPitch - COL_GAP;
  const px = Math.min(
    CARD_W_STEPS[2].px, // 上限 w-24=96px，避免大画布牌过大
    ...CARD_W_STEPS.map((s) => s.px).filter((v) => v <= maxByCol),
    CARD_W_STEPS[CARD_W_STEPS.length - 1].px
  );
  const ch = px * CARD_H_RATIO;
  // 每行独立高度带：牌高 + 标签占位，行间自然分离，标签永不压到下一行牌面
  const rows = CUSTOM_GRID_ROWS_MAX_ROW(cells);
  const height = Math.ceil(rows * (ch + LABEL_SPACE));
  const cls = CARD_W_STEPS.find((s) => s.px === px)!.cls;
  return { height, cardW: cls };
}

/** 自定义布阵实际用到的最大行数（自上而下的紧凑高度，不留空行白） */
function CUSTOM_GRID_ROWS_MAX_ROW(cells: { row: number; col: number }[]): number {
  return Math.max(...cells.map((c) => c.row)) + 1;
}

/** 兼容导出：仅坐标（旧调用点迁移用） */
export function getSpreadCoords(key: string | null | undefined, n: number): SpreadPoint[] {
  const layout = key ? SPREAD_RAW[key] : undefined;
  if (layout && layout.coords.length === n) return layout.coords;
  return fallbackCoords(n);
}

/** 需要横置 90° 的牌的下标（当前无横置牌阵，始终返回 -1；自定义牌阵永不横置） */
export function getCrossIdx(_key: string | null | undefined, _n: number): number {
  return -1;
}
