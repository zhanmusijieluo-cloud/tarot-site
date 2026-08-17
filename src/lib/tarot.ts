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

export const SPREADS = {
  single: { name: '单牌指引', positions: ['今日指引'], count: 1 },
  three: { name: '三牌阵', positions: ['过去', '现在', '未来'], count: 3 },
  celtic: { name: '凯尔特十字', positions: ['现状', '挑战', '基础', '过去', '可能', '未来', '自我', '环境', '希望与恐惧', '结果'], count: 10 }
} as const;

export type SpreadType = keyof typeof SPREADS;

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
