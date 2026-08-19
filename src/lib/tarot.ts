export interface TarotCard {
  id: number;
  name: string;
  numeral: string;
  element: '火' | '水' | '风' | '土';
  zodiac: string;
  emoji: string;
  upright: string;
  reversedMeaning: string;
  keywords: string[];
}

export interface DrawnCard extends TarotCard {
  isReversed: boolean;
}

export interface Spread {
  name: string;
  count: number;
  subtitle: string;
  description: string;
  theme: string;
  positions: readonly string[];
}

export const SPREAD_THEMES: Record<string, { name: string; icon: string; intro: string }> = {
  general: { name: '综合', icon: '✦', intro: '适合初次接触塔罗，或希望快速获得整体指引的问题；覆盖时间、现状、复杂局面等通用场景。' },
  love: { name: '感情', icon: '💕', intro: '适合爱情、关系、暧昧、复合、择偶等感情相关的问题，从双方状态到趋势走向全面梳理。' },
  career: { name: '事业', icon: '💼', intro: '适合工作、职业发展、求职、跳槽、项目推进、职场关系等事业相关的问题。' },
  wealth: { name: '财富', icon: '💰', intro: '适合财务状况、收入机会、投资风险、消费习惯等金钱与资源相关的问题。' },
  choice: { name: '抉择', icon: '⚖️', intro: '适合面临选择、风险判断、问题解决、去留决策等需要权衡多个方案的复杂决策场景。' },
  growth: { name: '成长', icon: '🌱', intro: '适合自我探索、内在课题、优势天赋、未来运势、阶段性成长方向等长期视角的问题。' },
};

export const SPREADS: Record<string, Spread> = {
  single: { name: '单牌指引', count: 1, subtitle: '抓住此刻最重要的一点', description: '从 78 张牌中抽取一张，给出当下最核心的指引。适合日常一问、临时起意的提问，或希望快速获得一句话点拨时使用。', theme: 'general', positions: ['核心指引'] },
  three: { name: '三牌时间流', count: 3, subtitle: '看过去、现在和未来', description: '经典的三牌阵，从过去的影响、当前的状况到未来的走向，串成一条清晰的时间线，帮助你看清事物的演化脉络。', theme: 'general', positions: ['过去', '现在', '未来'] },
  situation: { name: '现状解局', count: 5, subtitle: '拆开表面与隐藏因素', description: '五张牌从核心问题、已显见因素、未显见因素、主要阻碍到下一步行动，帮你拆解当下局面的各个面向，找到关键症结。', theme: 'general', positions: ['核心问题', '已经看见', '尚未看见', '主要阻碍', '下一步'] },
  horseshoe: { name: '七牌马蹄阵', count: 7, subtitle: '完整梳理问题全貌', description: '马蹄形七牌阵，覆盖过去、现在、隐藏因素、阻碍、外部影响、建议和最终可能结果，适合需要全景式梳理的中等复杂度问题。', theme: 'general', positions: ['过去', '现在', '隐藏因素', '阻碍', '外部影响', '建议', '可能结果'] },
  celtic: { name: '凯尔特十字', count: 10, subtitle: '深入复杂问题的根源', description: '塔罗最经典、最完整的牌阵。十个位置层层深入，从现状、挑战、根基、过去到最终走向，剖析复杂问题的根源与脉络，适合需要全面、深度解读的重要议题。', theme: 'general', positions: ['现状', '挑战', '根基', '过去', '可能性', '近期', '自我', '环境', '期待与担忧', '最终走向'] },
  relationship: { name: '关系现状', count: 5, subtitle: '看双方状态与关系连接', description: '聚焦两人关系的整体状态，看你、对方、连接点、阻碍与未来方向，适合已有明确关系需要看清现状的问题。', theme: 'love', positions: ['你的状态', '对方状态', '关系连接', '主要阻碍', '发展方向'] },
  feelings: { name: '对方心意', count: 5, subtitle: '区分表现、倾向与顾虑', description: '探究对方对你的真实感受，区分外在表现、内在倾向、顾虑和下一步倾向，帮助你看清对方心底的态度。', theme: 'love', positions: ['你给出的感受', '对方外在表现', '对方内在倾向', '对方顾虑', '下一步倾向'] },
  ambiguity: { name: '暧昧走向', count: 5, subtitle: '判断吸引、迟疑和趋势', description: '在暧昧不明的阶段使用，看当前信号、吸引来源、迟疑原因、外部影响和近期走向，判断这段暧昧是否值得继续投入。', theme: 'love', positions: ['当前信号', '吸引来源', '迟疑原因', '外部影响', '近期走向'] },
  reconciliation: { name: '复合可能', count: 6, subtitle: '看旧问题与修复条件', description: '六张牌梳理分开原因、双方状态、仍存连接、修复条件和复合趋势，判断是否还有修复的机会以及需要做什么。', theme: 'love', positions: ['分开原因', '你的状态', '对方状态', '仍存连接', '修复条件', '复合趋势'] },
  new_love: { name: '新恋情', count: 5, subtitle: '寻找机会与识别信号', description: '当你渴望一段新感情时使用，看你的准备度、感情阻碍、相遇机会、需要识别的信号和你应采取的行动。', theme: 'love', positions: ['你的准备度', '感情阻碍', '相遇机会', '识别信号', '你的行动'] },
  love_choice: { name: '感情二选一', count: 5, subtitle: '比较两段关系的走向', description: '当你同时面对两段感情不知如何选择时使用，看你的真实需要、A 与 B 两段关系各自的走向，做出更清晰的决定。', theme: 'love', positions: ['你的真实需要', '关系 A', 'A 的走向', '关系 B', 'B 的走向'] },
  career_growth: { name: '事业发展', count: 5, subtitle: '找到优势、限制和机会', description: '整体性看事业当前阶段、可用优势、主要限制、发展机会和关键行动，适合需要梳理职业方向的问题。', theme: 'career', positions: ['当前阶段', '可用优势', '主要限制', '发展机会', '关键行动'] },
  job_search: { name: '求职面试', count: 5, subtitle: '看匹配、印象和改进点', description: '正在找工作或面试时使用，看求职状态、岗位匹配度、对方印象、需要补足和结果趋势。', theme: 'career', positions: ['求职状态', '岗位匹配', '对方印象', '需要补足', '结果趋势'] },
  job_change: { name: '跳槽去留', count: 5, subtitle: '比较留下与离开的代价', description: '在留下和离开之间纠结时使用，对比两种选择各自的收获与代价，以及决策的关键点。', theme: 'career', positions: ['留下的收获', '留下的代价', '离开的收获', '离开的代价', '决策关键'] },
  project: { name: '项目走向', count: 6, subtitle: '分析资源、协作和阻碍', description: '聚焦当前负责或参与的项目，看目标、资源、协作、阻碍、关键转折和结果趋势。', theme: 'career', positions: ['项目目标', '可用资源', '协作状态', '主要阻碍', '关键转折', '结果趋势'] },
  workplace: { name: '职场关系', count: 5, subtitle: '看互动、边界和方向', description: '处理与同事、上级或下属的关系时使用，看双方立场、隐藏互动、需要守住的边界和相处方向。', theme: 'career', positions: ['你的立场', '对方立场', '隐藏互动', '需要守住', '相处方向'] },
  breakthrough: { name: '能力突破', count: 5, subtitle: '找到瓶颈和第一步', description: '感觉自己停滞不前时使用，看当前瓶颈、未充分使用的能力、需要补足的地方、突破机会和第一步行动。', theme: 'career', positions: ['当前瓶颈', '未充分使用', '需要补足', '突破机会', '第一步'] },
  finance_status: { name: '财务现状', count: 5, subtitle: '整理收入、支出和盲点', description: '梳理当前的财务全貌，看收入状态、支出状态、财务盲点、可用资源和调整重点。', theme: 'wealth', positions: ['收入状态', '支出状态', '财务盲点', '可用资源', '调整重点'] },
  income_opportunity: { name: '收入机会', count: 5, subtitle: '识别机会、门槛和风险', description: '关注新的赚钱或增加收入的机会时使用，看现有渠道、潜在机会、进入门槛、需要防范和验证行动。', theme: 'wealth', positions: ['现有渠道', '潜在机会', '进入门槛', '需要防范', '验证行动'] },
  side_business: { name: '副业方向', count: 5, subtitle: '判断能力与需求匹配', description: '考虑做副业时使用，看真实动机、能力匹配度、外部需求、投入代价和最小尝试方案。', theme: 'wealth', positions: ['真实动机', '能力匹配', '外部需求', '投入代价', '最小尝试'] },
  spending_blindspot: { name: '消费盲点', count: 4, subtitle: '看见触发和资金漏洞', description: '觉察自己乱花钱或资金流失时使用，看消费触发、资金漏洞、真实需要和需要建立的新边界。', theme: 'wealth', positions: ['消费触发', '资金漏洞', '真实需要', '新的边界'] },
  finance_three_months: { name: '三月财务', count: 5, subtitle: '观察阶段趋势和重点', description: '看未来三个月的财务走向：当前基础、每个月的发展以及需要稳住的重点。', theme: 'wealth', positions: ['当前基础', '第一个月', '第二个月', '第三个月', '稳住重点'] },
  choice: { name: '二选一', count: 5, subtitle: '平行比较A与B', description: '在两个明确选项之间抉择时使用，平行比较 A 与 B 各自的走向，帮助你做出不偏不倚的决定。', theme: 'choice', positions: ['当前处境', '选择 A', 'A 的走向', '选择 B', 'B 的走向'] },
  stay_or_leave: { name: '去留决策', count: 5, subtitle: '澄清需要与隐藏条件', description: '面对一段关系、工作或生活的去留问题时使用，澄清你的真实需要、留下的影响、离开的影响、隐藏条件和判断关键。', theme: 'choice', positions: ['你的真实需要', '留下的影响', '离开的影响', '隐藏条件', '判断关键'] },
  timing: { name: '时机判断', count: 4, subtitle: '判断准备度和行动信号', description: '在等待还是行动之间犹豫时使用，看自身准备度、外部窗口、等待风险和行动信号。', theme: 'choice', positions: ['自身准备', '外部窗口', '等待风险', '行动信号'] },
  problem_solving: { name: '问题解决', count: 5, subtitle: '从根源走到解决动作', description: '面对具体难题想找解决方案时使用，从问题根源走到表面症状，再到可用资源和解决动作。', theme: 'choice', positions: ['问题根源', '表面症状', '可用资源', '解决动作', '改善方向'] },
  risk_blindspot: { name: '风险盲点', count: 5, subtitle: '识别隐藏风险和边界', description: '感觉某件事有风险但说不清时使用，看已知风险、隐藏风险、容易忽略的点、安全边界和应对动作。', theme: 'choice', positions: ['已知风险', '隐藏风险', '容易忽略', '安全边界', '应对动作'] },
  multi_choice: { name: '多方案比较', count: 7, subtitle: '比较三个方案的得失', description: '三个或多个方案放在一起比较时使用，看核心标准以及每个方案的收获与代价。', theme: 'choice', positions: ['核心标准', '方案 A 收获', '方案 A 代价', '方案 B 收获', '方案 B 代价', '方案 C 收获', '方案 C 代价'] },
  weekly: { name: '本周运势', count: 7, subtitle: '观察一周节奏与主题', description: '看本周一到周末每天的节奏与主题，捕捉关键节点和本周的整体主题。', theme: 'growth', positions: ['周一', '周二', '周三', '周四', '周五', '周末', '本周主题'] },
  month: { name: '未来30天', count: 5, subtitle: '看机会、挑战和行动', description: '未来一个月的主题、机会、挑战、人际影响和需要采取的行动重点。', theme: 'growth', positions: ['本月主题', '主要机会', '主要挑战', '人际影响', '行动重点'] },
  quarter: { name: '未来三个月', count: 7, subtitle: '读取阶段变化与转折', description: '未来三个月的走向，看每个月的发展、关键转折、可用支持和阶段建议。', theme: 'growth', positions: ['当前状态', '第一个月', '第二个月', '第三个月', '关键转折', '可用支持', '阶段建议'] },
  new_stage: { name: '新阶段指引', count: 5, subtitle: '看清告别、进入和第一步', description: '当生命进入一个新阶段时使用，看正在离开的、正在进入的、内在担忧、已有资源和第一步。', theme: 'growth', positions: ['正在离开', '正在进入', '内在担忧', '已有资源', '第一步'] },
  talents: { name: '优势天赋', count: 5, subtitle: '发现能力与适合环境', description: '寻找自己的优势天赋，看自然优势、后天能力、尚未使用的部分、适合的环境和培养方式。', theme: 'growth', positions: ['自然优势', '后天能力', '尚未使用', '适合环境', '培养方式'] },
  inner_lesson: { name: '内在课题', count: 5, subtitle: '理解情绪、需要和模式', description: '探索当下的内在课题，看表层情绪、深层需要、重复模式、需要建立的品质和成长行动。', theme: 'growth', positions: ['表层情绪', '深层需要', '重复模式', '需要建立', '成长行动'] },
};

export type SpreadType = string;

export type TarotStyle = 'moonlight' | 'crystal' | 'shadow' | 'stardust';

export const STYLE_PRESETS: Record<TarotStyle, { name: string; symbol: string }> = {
  moonlight: { name: '月光之镜', symbol: '🌙' },
  crystal: { name: '水晶幻境', symbol: '💎' },
  shadow: { name: '暗影之焰', symbol: '🔥' },
  stardust: { name: '星辰轨迹', symbol: '✨' },
};

export const TAROT_DECK: TarotCard[] = [
  // 大阿卡纳 0-21
  { id:0, name:"愚者", numeral:"0", element:"风", zodiac:"天王星", emoji:"🃏", upright:"新的开始、纯真、自发性、无限可能", reversedMeaning:"鲁莽、冒险、缺乏方向、不负责任", keywords:["新开始","冒险","自由","纯真"] },
  { id:1, name:"魔术师", numeral:"I", element:"风", zodiac:"水星", emoji:"🎩", upright:"创造力、技能、意志、资源运用", reversedMeaning:"欺骗、操控、才华浪费、心术不正", keywords:["创造","意志","能力","行动"] },
  { id:2, name:"女祭司", numeral:"II", element:"水", zodiac:"月亮", emoji:"🌙", upright:"直觉、潜意识、神秘、内在智慧", reversedMeaning:"压抑直觉、表面化、情感封闭", keywords:["直觉","神秘","潜意识","智慧"] },
  { id:3, name:"皇后", numeral:"III", element:"土", zodiac:"金星", emoji:"👑", upright:"丰饶、母性、创造、感官享受", reversedMeaning:"依赖、创造力受阻、忽视自我", keywords:["丰饶","创造","母性","享受"] },
  { id:4, name:"皇帝", numeral:"IV", element:"火", zodiac:"白羊座", emoji:"⚔️", upright:"权威、结构、控制、稳定", reversedMeaning:"独裁、僵化、缺乏纪律、失控", keywords:["权威","结构","稳定","控制"] },
  { id:5, name:"教皇", numeral:"V", element:"土", zodiac:"金牛座", emoji:"✝️", upright:"传统、指导、信仰、学习", reversedMeaning:"反叛传统、教条主义、误导性建议", keywords:["传统","指导","信仰","学习"] },
  { id:6, name:"恋人", numeral:"VI", element:"风", zodiac:"双子座", emoji:"💕", upright:"选择、和谐、关系、价值观", reversedMeaning:"失衡、错误选择、关系冲突", keywords:["选择","和谐","关系","价值"] },
  { id:7, name:"战车", numeral:"VII", element:"水", zodiac:"巨蟹座", emoji:"🏇", upright:"胜利、意志力、自律、前进", reversedMeaning:"失控、方向不明、侵略性", keywords:["胜利","意志","前进","自律"] },
  { id:8, name:"力量", numeral:"VIII", element:"火", zodiac:"狮子座", emoji:"🦁", upright:"勇气、耐心、内在力量、驯服", reversedMeaning:"软弱、恐惧、缺乏自信、失控", keywords:["勇气","力量","耐心","自信"] },
  { id:9, name:"隐者", numeral:"IX", element:"土", zodiac:"处女座", emoji:"🏔️", upright:"内省、独处、智慧、指引", reversedMeaning:"孤独、逃避、过于封闭", keywords:["内省","智慧","独处","指引"] },
  { id:10, name:"命运之轮", numeral:"X", element:"火", zodiac:"木星", emoji:"🎡", upright:"变化、命运、机遇、转折", reversedMeaning:"厄运、抵抗变化、停滞", keywords:["变化","命运","机遇","转折"] },
  { id:11, name:"正义", numeral:"XI", element:"风", zodiac:"天秤座", emoji:"⚖️", upright:"公正、因果、平衡、真相", reversedMeaning:"不公、偏见、逃避责任", keywords:["公正","因果","平衡","真相"] },
  { id:12, name:"倒吊人", numeral:"XII", element:"水", zodiac:"海王星", emoji:"🔙", upright:"牺牲、暂停、新视角、等待", reversedMeaning:"无谓牺牲、停滞、抗拒改变", keywords:["牺牲","等待","视角","领悟"] },
  { id:13, name:"死神", numeral:"XIII", element:"水", zodiac:"天蝎座", emoji:"💀", upright:"结束、转变、重生、放下", reversedMeaning:"抗拒改变、停滞不前、恐惧", keywords:["转变","结束","重生","放下"] },
  { id:14, name:"节制", numeral:"XIV", element:"火", zodiac:"射手座", emoji:"🏺", upright:"平衡、耐心、和谐、中庸", reversedMeaning:"失衡、过度、急躁、冲突", keywords:["平衡","和谐","耐心","中庸"] },
  { id:15, name:"恶魔", numeral:"XV", element:"土", zodiac:"摩羯座", emoji:"😈", upright:"束缚、欲望、物质主义、成瘾", reversedMeaning:"解脱、打破束缚、觉醒", keywords:["欲望","束缚","物质","执念"] },
  { id:16, name:"塔", numeral:"XVI", element:"火", zodiac:"火星", emoji:"⚡", upright:"突变、毁灭、启示、崩塌", reversedMeaning:"避免灾难、延迟改变、内部重建", keywords:["突变","毁灭","启示","觉醒"] },
  { id:17, name:"星星", numeral:"XVII", element:"风", zodiac:"水瓶座", emoji:"⭐", upright:"希望、灵感、宁静、治愈", reversedMeaning:"绝望、缺乏信心、失去方向", keywords:["希望","灵感","治愈","宁静"] },
  { id:18, name:"月亮", numeral:"XVIII", element:"水", zodiac:"双鱼座", emoji:"🌕", upright:"幻觉、恐惧、潜意识、不确定性", reversedMeaning:"走出恐惧、真相浮现、释然", keywords:["幻觉","恐惧","潜意识","直觉"] },
  { id:19, name:"太阳", numeral:"XIX", element:"火", zodiac:"太阳", emoji:"☀️", upright:"喜悦、成功、活力、光明", reversedMeaning:"暂时受阻、过度乐观、延迟", keywords:["喜悦","成功","活力","光明"] },
  { id:20, name:"审判", numeral:"XX", element:"火", zodiac:"冥王星", emoji:"📯", upright:"觉醒、重生、召唤、反省", reversedMeaning:"自我怀疑、拒绝召唤、逃避", keywords:["觉醒","反省","重生","召唤"] },
  { id:21, name:"世界", numeral:"XXI", element:"土", zodiac:"土星", emoji:"🌍", upright:"完成、成就、圆满、旅程终结", reversedMeaning:"未完成、延迟、缺乏Closure", keywords:["完成","成就","圆满","旅程"] },
  // 小阿卡纳-权杖(火)
  { id:22, name:"权杖一", numeral:"Ace", element:"火", zodiac:"", emoji:"🔥", upright:"新的机会、灵感、创造力的火花", reversedMeaning:"错失机会、缺乏动力、延迟", keywords:["机会","灵感","创造","开始"] },
  { id:23, name:"权杖二", numeral:"II", element:"火", zodiac:"", emoji:"🌐", upright:"规划、远见、决策、等待时机", reversedMeaning:"犹豫不决、缺乏规划、恐惧未知", keywords:["规划","远见","决策","计划"] },
  { id:24, name:"权杖三", numeral:"III", element:"火", zodiac:"", emoji:"⛵", upright:"进展、拓展、展望、合作", reversedMeaning:"停滞、阻碍、孤立、失望", keywords:["进展","拓展","展望","合作"] },
  { id:25, name:"权杖四", numeral:"IV", element:"火", zodiac:"", emoji:"🏰", upright:"庆祝、稳定、和谐、成就", reversedMeaning:"不稳定、庆祝受阻、过渡期", keywords:["庆祝","稳定","和谐","成就"] },
  { id:26, name:"权杖五", numeral:"V", element:"火", zodiac:"", emoji:"⚔️", upright:"竞争、冲突、挑战、张力", reversedMeaning:"回避冲突、内耗、和解", keywords:["竞争","冲突","挑战","张力"] },
  { id:27, name:"权杖六", numeral:"VI", element:"火", zodiac:"", emoji:"🏆", upright:"胜利、认可、成功、自信", reversedMeaning:"失败、缺乏认可、傲慢", keywords:["胜利","认可","成功","自信"] },
  { id:28, name:"权杖七", numeral:"VII", element:"火", zodiac:"", emoji:"🛡️", upright:"坚持、防御、挑战、勇气", reversedMeaning:"放弃、被压倒、过度防御", keywords:["坚持","防御","勇气","挑战"] },
  { id:29, name:"权杖八", numeral:"VIII", element:"火", zodiac:"", emoji:"💨", upright:"快速行动、消息、进展、速度", reversedMeaning:"延误、信息混乱、冲动", keywords:["速度","行动","消息","进展"] },
  { id:30, name:"权杖九", numeral:"IX", element:"火", zodiac:"", emoji:"🧗", upright:"坚韧、边界、警惕、最后的考验", reversedMeaning:"疲惫、固执、过度警惕", keywords:["坚韧","边界","警惕","考验"] },
  { id:31, name:"权杖十", numeral:"X", element:"火", zodiac:"", emoji:"📦", upright:"负担、责任、压力、即将结束", reversedMeaning:"放下负担、解脱、过度承担", keywords:["负担","责任","压力","承担"] },
  { id:32, name:"权杖侍从", numeral:"Page", element:"火", zodiac:"", emoji:"🌱", upright:"探索、热情、新消息、冒险精神", reversedMeaning:"冲动、缺乏方向、幼稚", keywords:["探索","热情","消息","冒险"] },
  { id:33, name:"权杖骑士", numeral:"Knight", element:"火", zodiac:"", emoji:"🐎", upright:"行动、冒险、激情、冲动", reversedMeaning:"鲁莽、急躁、能量浪费", keywords:["行动","冒险","激情","冲动"] },
  { id:34, name:"权杖王后", numeral:"Queen", element:"火", zodiac:"", emoji:"🔥", upright:"自信、魅力、独立、热情", reversedMeaning:"嫉妒、控制欲、情绪化", keywords:["自信","魅力","独立","热情"] },
  { id:35, name:"权杖国王", numeral:"King", element:"火", zodiac:"", emoji:"👑", upright:"领导力、远见、企业家精神、果断", reversedMeaning:"专横、傲慢、冲动、滥用权力", keywords:["领导","远见","果断","魄力"] },
  // 小阿卡纳-圣杯(水)
  { id:36, name:"圣杯一", numeral:"Ace", element:"水", zodiac:"", emoji:"🏆", upright:"新的情感、爱、直觉、灵性开启", reversedMeaning:"情感阻塞、错失感情、空虚", keywords:["爱","直觉","情感","灵性"] },
  { id:37, name:"圣杯二", numeral:"II", element:"水", zodiac:"", emoji:"💑", upright:"关系、吸引、合作、灵魂伴侣", reversedMeaning:"分离、不平衡的关系、误解", keywords:["关系","吸引","合作","伴侣"] },
  { id:38, name:"圣杯三", numeral:"III", element:"水", zodiac:"", emoji:"🥂", upright:"庆祝、友谊、社群、快乐", reversedMeaning:"过度放纵、八卦、社交失衡", keywords:["庆祝","友谊","社群","快乐"] },
  { id:39, name:"圣杯四", numeral:"IV", element:"水", zodiac:"", emoji:"😔", upright:"冥想、不满、内省、错过机会", reversedMeaning:"走出冷漠、接受新机会、觉醒", keywords:["冥想","不满","内省","觉醒"] },
  { id:40, name:"圣杯五", numeral:"V", element:"水", zodiac:"", emoji:"🥀", upright:"失落、悲伤、遗憾、专注负面", reversedMeaning:"接受失去、走出悲伤、希望重现", keywords:["失落","悲伤","遗憾","释怀"] },
  { id:41, name:"圣杯六", numeral:"VI", element:"水", zodiac:"", emoji:"🧸", upright:"回忆、纯真、怀旧、过去联系", reversedMeaning:"困在过去、无法释怀、不切实际", keywords:["回忆","纯真","怀旧","过去"] },
  { id:42, name:"圣杯七", numeral:"VII", element:"水", zodiac:"", emoji:"🌈", upright:"幻想、选择、诱惑、白日梦", reversedMeaning:"现实、做出选择、看清真相", keywords:["幻想","选择","诱惑","现实"] },
  { id:43, name:"圣杯八", numeral:"VIII", element:"水", zodiac:"", emoji:"🚶", upright:"放弃、寻找更深意义、离开", reversedMeaning:"犹豫不决、恐惧改变、回头", keywords:["放弃","寻找","离开","追寻"] },
  { id:44, name:"圣杯九", numeral:"IX", element:"水", zodiac:"", emoji:"🌟", upright:"满足、愿望实现、感恩、幸福", reversedMeaning:"不满足、贪心、内在空虚", keywords:["满足","愿望","感恩","幸福"] },
  { id:45, name:"圣杯十", numeral:"X", element:"水", zodiac:"", emoji:"🌈", upright:"家庭和谐、完整幸福、情感满足", reversedMeaning:"家庭冲突、理想破灭、情感困扰", keywords:["家庭","和谐","幸福","圆满"] },
  { id:46, name:"圣杯侍从", numeral:"Page", element:"水", zodiac:"", emoji:"🐟", upright:"创意、敏感、新感情、浪漫消息", reversedMeaning:"情绪化、不成熟、逃避现实", keywords:["创意","敏感","浪漫","消息"] },
  { id:47, name:"圣杯骑士", numeral:"Knight", element:"水", zodiac:"", emoji:"🦢", upright:"浪漫、理想主义、追求爱情、魅力", reversedMeaning:"情绪不稳定、不切实际、幻想", keywords:["浪漫","理想","追求","魅力"] },
  { id:48, name:"圣杯王后", numeral:"Queen", element:"水", zodiac:"", emoji:"🌊", upright:"同理心、直觉、情感深度、滋养", reversedMeaning:"情绪失控、依赖、过度敏感", keywords:["同理","直觉","滋养","深情"] },
  { id:49, name:"圣杯国王", numeral:"King", element:"水", zodiac:"", emoji:"🔱", upright:"情感智慧、外交、成熟、治愈", reversedMeaning:"情感操纵、冷漠、情绪压抑", keywords:["智慧","成熟","治愈","平衡"] },
  // 小阿卡纳-宝剑(风)
  { id:50, name:"宝剑一", numeral:"Ace", element:"风", zodiac:"", emoji:"⚔️", upright:"新想法、清晰、真理、突破", reversedMeaning:"混乱、错误决定、思想混乱", keywords:["真理","突破","清晰","思想"] },
  { id:51, name:"宝剑二", numeral:"II", element:"风", zodiac:"", emoji:"🔮", upright:"僵局、困难选择、逃避真相", reversedMeaning:"做出决定、看清真相、释放", keywords:["僵局","选择","逃避","真相"] },
  { id:52, name:"宝剑三", numeral:"III", element:"风", zodiac:"", emoji:"💔", upright:"心碎、悲伤、背叛、痛苦", reversedMeaning:"疗愈、走出伤痛、释放", keywords:["心碎","悲伤","背叛","疗愈"] },
  { id:53, name:"宝剑四", numeral:"IV", element:"风", zodiac:"", emoji:"🛌", upright:"休息、恢复、冥想、暂停", reversedMeaning:"过度劳累、无法休息、倦怠", keywords:["休息","恢复","冥想","暂停"] },
  { id:54, name:"宝剑五", numeral:"V", element:"风", zodiac:"", emoji:"😤", upright:"冲突、胜利但代价大、背叛", reversedMeaning:"和解、放下斗争、接受损失", keywords:["冲突","胜利","代价","和解"] },
  { id:55, name:"宝剑六", numeral:"VI", element:"风", zodiac:"", emoji:"⛵", upright:"过渡、离开困境、走向平静", reversedMeaning:"困在原地、无法前行、回归旧模式", keywords:["过渡","离开","平静","前行"] },
  { id:56, name:"宝剑七", numeral:"VII", element:"风", zodiac:"", emoji:"🦊", upright:"策略、机智、隐藏、偷窥", reversedMeaning:"暴露、诚实、放弃欺骗", keywords:["策略","机智","隐藏","秘密"] },
  { id:57, name:"宝剑八", numeral:"VIII", element:"风", zodiac:"", emoji:"🙈", upright:"束缚、受害者心态、无力感", reversedMeaning:"挣脱束缚、获得自由、新视角", keywords:["束缚","无力","受害者","自由"] },
  { id:58, name:"宝剑九", numeral:"IX", element:"风", zodiac:"", emoji:"😰", upright:"焦虑、噩梦、担忧、恐惧", reversedMeaning:"走出焦虑、面对恐惧、释然", keywords:["焦虑","恐惧","担忧","噩梦"] },
  { id:59, name:"宝剑十", numeral:"X", element:"风", zodiac:"", emoji:"🌅", upright:"低谷、背叛、终结、触底", reversedMeaning:"重生、最黑暗时刻已过、开始愈合", keywords:["低谷","终结","背叛","重生"] },
  { id:60, name:"宝剑侍从", numeral:"Page", element:"风", zodiac:"", emoji:"👀", upright:"好奇、观察、新想法、消息", reversedMeaning:"八卦、多疑、言语伤害", keywords:["好奇","观察","消息","警惕"] },
  { id:61, name:"宝剑骑士", numeral:"Knight", element:"风", zodiac:"", emoji:"💨", upright:"果断、快速行动、智力、冲动", reversedMeaning:"鲁莽、言语伤人、混乱", keywords:["果断","快速","智力","冲动"] },
  { id:62, name:"宝剑王后", numeral:"Queen", element:"风", zodiac:"", emoji:"🗡️", upright:"清晰思维、独立、界限、真相", reversedMeaning:"冷酷、刻薄、情感压抑", keywords:["清晰","独立","界限","真相"] },
  { id:63, name:"宝剑国王", numeral:"King", element:"风", zodiac:"", emoji:"👤", upright:"公正、理性、权威、果断", reversedMeaning:"滥用权力、冷酷、专制", keywords:["公正","理性","权威","果断"] },
  // 小阿卡纳-星币(土)
  { id:64, name:"星币一", numeral:"Ace", element:"土", zodiac:"", emoji:"💰", upright:"新机会、物质丰盛、实际开始", reversedMeaning:"错失机会、财务问题、延迟", keywords:["机会","丰盛","实际","开始"] },
  { id:65, name:"星币二", numeral:"II", element:"土", zodiac:"", emoji:"🎪", upright:"平衡、适应、多任务、灵活", reversedMeaning:"失衡、超负荷、混乱", keywords:["平衡","适应","灵活","压力"] },
  { id:66, name:"星币三", numeral:"III", element:"土", zodiac:"", emoji:"🏗️", upright:"团队合作、技能、建设、成长", reversedMeaning:"缺乏协作、质量下降、孤立", keywords:["团队","技能","建设","成长"] },
  { id:67, name:"星币四", numeral:"IV", element:"土", zodiac:"", emoji:"🔒", upright:"掌控、安全、储蓄、保守", reversedMeaning:"过度贪婪、失去控制、释放", keywords:["掌控","安全","储蓄","保守"] },
  { id:68, name:"星币五", numeral:"V", element:"土", zodiac:"", emoji:"❄️", upright:"困境、贫困、孤立、需要帮助", reversedMeaning:"走出困境、援助到来、改善", keywords:["困境","贫困","孤立","改善"] },
  { id:69, name:"星币六", numeral:"VI", element:"土", zodiac:"", emoji:"⚖️", upright:"慷慨、给予、接受帮助、慈善", reversedMeaning:"债务、不平等、利用他人", keywords:["慷慨","给予","接受","慈善"] },
  { id:70, name:"星币七", numeral:"VII", element:"土", zodiac:"", emoji:"🌱", upright:"等待收获、耐心、评估进展", reversedMeaning:"不耐烦、投资不当、白费力气", keywords:["等待","耐心","收获","评估"] },
  { id:71, name:"星币八", numeral:"VIII", element:"土", zodiac:"", emoji:"🔨", upright:"勤奋、技艺、专注、精进", reversedMeaning:"缺乏热情、机械化、完美主义", keywords:["勤奋","技艺","专注","精进"] },
  { id:72, name:"星币九", numeral:"IX", element:"土", zodiac:"", emoji:"🍇", upright:"独立、富足、自给自足、享受", reversedMeaning:"财务不稳、过度消费、依赖", keywords:["独立","富足","享受","自给"] },
  { id:73, name:"星币十", numeral:"X", element:"土", zodiac:"", emoji:"🏠", upright:"家庭财富、传承、稳定、legacy", reversedMeaning:"家庭财务问题、遗产纠纷、不稳定", keywords:["财富","传承","稳定","家庭"] },
  { id:74, name:"星币侍从", numeral:"Page", element:"土", zodiac:"", emoji:"📚", upright:"学习、务实、新技能、勤奋", reversedMeaning:"懒惰、缺乏focus、不切实际", keywords:["学习","务实","勤奋","技能"] },
  { id:75, name:"星币骑士", numeral:"Knight", element:"土", zodiac:"", emoji:"🐂", upright:"稳重、可靠、循序渐进、务实", reversedMeaning:"缓慢、固执、缺乏进取心", keywords:["稳重","可靠","务实","耐心"] },
  { id:76, name:"星币王后", numeral:"Queen", element:"土", zodiac:"", emoji:"🌾", upright:"滋养、丰盛、实际、安全感", reversedMeaning:"过度物质、控制、吝啬", keywords:["滋养","丰盛","实际","安全"] },
  { id:77, name:"星币国王", numeral:"King", element:"土", zodiac:"", emoji:"🏦", upright:"成功、商业智慧、稳定、慷慨", reversedMeaning:"贪婪、物质主义、固执、吝啬", keywords:["成功","商业","稳定","慷慨"] }
];

/**
 * 返回原版伟特塔罗（Rider-Waite）牌面的本地图片路径。
 * 牌面图片位于 public/cards/card_XX.jpg（78 张完整牌库，公有领域）。
 */
export function getCardImage(id: number): string {
  return `/cards/card_${String(id).padStart(2, '0')}.jpg`;
}

export function shuffleDraw(count: number): DrawnCard[] {
  const deck = [...TAROT_DECK];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, count).map(card => ({
    ...card,
    isReversed: Math.random() < 0.5
  }));
}

export function generateOverallReading(cards: DrawnCard[], positions: readonly string[]): string {
  const elements = cards.map(c => c.element);
  const elementCounts: Record<string, number> = {};
  elements.forEach(e => { elementCounts[e] = (elementCounts[e] || 0) + 1; });
  const dominant = Object.entries(elementCounts).sort((a, b) => b[1] - a[1])[0];
  const elementNames = { '火': '行动力与热情', '水': '情感与直觉', '风': '思想与沟通', '土': '物质与现实' };
  
  let reading = '';
  
  if (dominant) {
    reading += `<strong>${elementNames[dominant[0] as keyof typeof elementNames] || dominant[0]}元素</strong>能量最为突出（${dominant[1]}张），`;
  }
  
  const majorCount = cards.filter(c => c.id <= 21).length;
  if (majorCount > 0) {
    reading += `同时出现了${majorCount}张大阿卡纳牌，说明当前局面受到较强宿命力量的影响，`;
  }
  
  const reversedCount = cards.filter(c => c.isReversed).length;
  if (reversedCount > cards.length / 2) {
    reading += `逆位牌较多，提示能量处于阻塞或内化状态，需要更多关注内在调整。`;
  } else if (reversedCount === 0) {
    reading += `全部为正位，能量流动顺畅，时机较为有利。`;
  } else {
    reading += `整体能量较为平衡。`;
  }
  
  const fates = cards.filter(c => c.id === 10 || c.id === 13 || c.id === 16);
  if (fates.length > 0) {
    const names = fates.map(c => c.name).join('、');
    reading += `<br><br>牌阵中出现了「${names}」，提示这是一个重要的转折时期，变化正在发生或即将发生。`;
  }
  
  return reading;
}
