/**
 * 78 张韦特塔罗牌性静态库（三语）
 * ---------------------------------------------------------------
 * 用途：替代 AI 每次现场生成 traits 字段（元素/灵数/行星星座/正逆位差异）。
 * 这些是固定知识、与问卜者问题背景无关，离线写死可大幅减少模型推理与输出负担。
 * 运行时由 server.ts 取用：
 *   1. 直接拼入板块1 的「牌性特质」位置（格式与原 AI 输出一致）；
 *   2. 作为已知材料注入 prompt，供模型做跨牌联动/根源分析时引用。
 * 分点格式约定：以「• 」开头、\n\n 分隔（与 toListMd 兼容）。
 */

export interface CardTraits {
  /** 简体中文 */
  zh: string;
  /** English */
  en: string;
  /** 日本語 */
  ja: string;
}

export const CARD_TRAITS: Record<number, CardTraits> = {
  // ══════════ 大阿卡纳 0-21 ══════════
  0: {
    zh: '• 元素为风，灵数 0 象征无限潜能与未定义的开始，对应天王星，主突破与觉醒\n\n• 正位核心是纯真的出发与开放的可能性；逆位则偏向鲁莽冒进、缺乏准备或方向感涣散',
    en: '• Element: Air; number 0 symbolizes infinite potential and an undefined beginning; ruled by Uranus, governing breakthrough and awakening\n\n• Upright core: innocent departure and open possibility; reversed leans toward recklessness, lack of preparation, or scattered direction',
    ja: '• 元素は風、数0は無限の可能性と未定義の始まりを象徴し、天王星が支配し、突破と覚醒を司ります\n\n• 正位置の核心は純真な出発と開かれた可能性。逆位置では向こう見ずさ、準備不足、方向感覚の散漫さに傾きます',
  },
  1: {
    zh: '• 元素为风，灵数 1 象征开创与显化之力，对应水星，主沟通与技艺\n\n• 正位核心是意志聚焦、资源在握、心想事成；逆位则偏向欺骗操控、才能错用或行动力涣散',
    en: '• Element: Air; number 1 symbolizes initiative and the power of manifestation; ruled by Mercury, governing communication and craft\n\n• Upright core: focused will, resources at hand, manifestation; reversed leans toward deception, misused talent, or scattered drive',
    ja: '• 元素は風、数1は開拓と顕現の力を象徴し、水星が支配し、コミュニケーションと技を司ります\n\n• 正位置の核心は意志の集中、資源の掌握、願望の実現。逆位置では欺き、才能の誤用、行動力の散漫さに傾きます',
  },
  2: {
    zh: '• 元素为水，灵数 2 象征二元与直觉的平衡，对应月亮，主潜意识与奥秘\n\n• 正位核心是静观内在智慧、直觉敏锐；逆位则偏向压抑直觉、情感封闭或被表象迷惑',
    en: '• Element: Water; number 2 symbolizes duality and intuitive balance; ruled by the Moon, governing the subconscious and mysteries\n\n• Upright core: inner wisdom, keen intuition; reversed leans toward suppressed intuition, emotional closure, or illusion by appearances',
    ja: '• 元素は水、数2は二元性と直観の均衡を象徴し、月が支配し、潜在意識と神秘を司ります\n\n• 正位置の核心は内なる知恵の静観と鋭敏な直観。逆位置では直観の抑圧、感情の閉鎖、表面に惑わされる傾向に傾きます',
  },
  3: {
    zh: '• 元素为土，灵数 3 象征创造与丰饶的绽放，对应金星，主感官与滋养\n\n• 正位核心是丰盛、母性能量与创造力的舒展；逆位则偏向依赖、创造力受阻或忽视自我照顾',
    en: '• Element: Earth; number 3 symbolizes creation and flourishing abundance; ruled by Venus, governing the senses and nurturing\n\n• Upright core: abundance, maternal energy, creative blossoming; reversed leans toward dependence, blocked creativity, or self-neglect',
    ja: '• 元素は土、数3は創造と豊かさの開花を象徴し、金星が支配し、感覚と滋養を司ります\n\n• 正位置の核心は豊かさ、母性的エネルギー、創造力の伸びやかさ。逆位置では依存、創造力の阻害、自己ケアの軽視に傾きます',
  },
  4: {
    zh: '• 元素为火，灵数 4 象征稳固的结构与秩序，对应白羊座，主权威与开拓\n\n• 正位核心是理性掌控、建立规则与稳定；逆位则偏向僵化独裁、控制失灵或纪律涣散',
    en: '• Element: Fire; number 4 symbolizes solid structure and order; corresponds to Aries, governing authority and pioneering\n\n• Upright core: rational command, establishing rules and stability; reversed leans toward rigidity, failed control, or lax discipline',
    ja: '• 元素は火、数4は堅固な構造と秩序を象徴し、牡羊座に対応し、権威と開拓を司ります\n\n• 正位置の核心は理性的な統御、規則と安定の構築。逆位置では硬直・独裁、制御の失敗、規律の弛みに傾きます',
  },
  5: {
    zh: '• 元素为土，灵数 5 象征突破常规的过渡与学习，对应金牛座，主传统与信仰\n\n• 正位核心是遵循正统、获得指导与传承；逆位则偏向反叛教条、接受误导或价值观僵化',
    en: '• Element: Earth; number 5 symbolizes transition beyond convention and learning; corresponds to Taurus, governing tradition and belief\n\n• Upright core: orthodoxy, receiving guidance and heritage; reversed leans toward rebellion against dogma, misleading counsel, or ossified values',
    ja: '• 元素は土、数5は常識を超える過渡と学びを象徴し、牡牛座に対応し、伝統と信仰を司ります\n\n• 正位置の核心は正統への遵守、指導と継承の獲得。逆位置では教義への反発、誤った助言、価値観の硬直に傾きます',
  },
  6: {
    zh: '• 元素为风，灵数 6 象征和谐的选择与关系的联结，对应双子座，主沟通与抉择\n\n• 正位核心是价值观契合的结合与明智选择；逆位则偏向关系失衡、错误选择或价值冲突',
    en: '• Element: Air; number 6 symbolizes harmonious choice and relational bonding; corresponds to Gemini, governing communication and decision\n\n• Upright core: union of aligned values and wise choice; reversed leans toward imbalanced relations, wrong choices, or value conflicts',
    ja: '• 元素は風、数6は調和の選択と関係の結びつきを象徴し、双子座に対応し、コミュニケーションと決断を司ります\n\n• 正位置の核心は価値観が合致した結合と賢明な選択。逆位置では関係の不均衡、誤った選択、価値観の衝突に傾きます',
  },
  7: {
    zh: '• 元素为水，灵数 7 象征内在胜利与掌控，对应巨蟹座，主意志与守护\n\n• 正位核心是自律驱动的前进与攻克难关；逆位则偏向失控狂奔、方向迷失或攻击性外露',
    en: '• Element: Water; number 7 symbolizes inner victory and mastery; corresponds to Cancer, governing will and protection\n\n• Upright core: disciplined advance and conquering obstacles; reversed leans into losing control, lost direction, or exposed aggression',
    ja: '• 元素は水、数7は内的勝利と掌握を象徴し、蟹座に対応し、意志と守護を司ります\n\n• 正位置の核心は自律に導かれた前進と難関の克服。逆位置では制御を失った疾走、方向の喪失、攻撃性の露呈に傾きます',
  },
  8: {
    zh: '• 元素为火，灵数 8 象征力量与韧性的循环，对应狮子座，主勇气与柔驯\n\n• 正位核心是以温柔与耐心驾驭内在兽性；逆位则偏向自我怀疑、恐惧压倒信心或情绪失控',
    en: '• Element: Fire; number 8 symbolizes the cycle of strength and resilience; corresponds to Leo, governing courage and gentle taming\n\n• Upright core: taming inner beast with gentleness and patience; reversed leans toward self-doubt, fear over confidence, or emotional loss of control',
    ja: '• 元素は火、数8は力と靭性の循環を象徴し、獅子座に対応し、勇気と柔軟な手懐けを司ります\n\n• 正位置の核心は優しさと忍耐で内なる野性を手懐けること。逆位置では自己不信、恐怖が自信を圧倒する、情緒の暴走に傾きます',
  },
  9: {
    zh: '• 元素为土，灵数 9 象征接近完成的内省阶段，对应处女座，主分析与沉淀\n\n• 正位核心是主动退居一隅、寻求智慧与指引；逆位则偏向孤立逃避、过度封闭或拒绝连接',
    en: '• Element: Earth; number 9 symbolizes the introspective stage near completion; corresponds to Virgo, governing analysis and refinement\n\n• Upright core: deliberate retreat for wisdom and guidance; reversed leans toward isolating escape, over-closure, or refusing connection',
    ja: '• 元素は土、数9は完成間近の内省段階を象徴し、乙女座に対応し、分析と沈殿を司ります\n\n• 正位置の核心は意図的な退隠による知恵と導きの探究。逆位置では孤立からの逃避、過度の閉鎖、繋がりの拒絶に傾きます',
  },
  10: {
    zh: '• 元素为火，灵数 10 象征一个周期的圆满与新循环的起点，对应木星，主机运与扩张\n\n• 正位核心是命运转折带来机遇；逆位则偏向时运不济、抗拒变化或原地空转',
    en: '• Element: Fire; number 10 symbolizes a completed cycle and the start of a new one; ruled by Jupiter, governing fortune and expansion\n\n• Upright core: fateful turning points bringing opportunity; reversed leans into ill luck, resisting change, or spinning in place',
    ja: '• 元素は火、数10は一周期の円満と新循環の始まりを象徴し、木星が支配し、機運と拡張を司ります\n\n• 正位置の核心は運命の転換が機会をもたらすこと。逆位置では不運、変化への抵抗、その場での空転に傾きます',
  },
  11: {
    zh: '• 元素为风，灵数 11 象征平衡中的因果清算，对应天秤座，主公正与权衡\n\n• 正位核心是真相大白、责任对等、因果兑现；逆位则偏向偏袒不公、逃避问责或法律文书纠纷',
    en: '• Element: Air; number 11 symbolizes karmic reckoning in balance; corresponds to Libra, governing justice and weighing\n\n• Upright core: truth revealed, equal responsibility, karma fulfilled; reversed leans into bias and unfairness, dodging accountability, or legal-document disputes',
    ja: '• 元素は風、数11は均衡の中の因果の精算を象徴し、天秤座に対応し、公正と天秤かけを司ります\n\n• 正位置の核心は真実の明白化、対等な責任、因縁の実現。逆位置では偏りと不公平、責任の回避、法的文書の紛争に傾きます',
  },
  12: {
    zh: '• 元素为水，灵数 12 象征悬置与牺牲后的洞见，对应海王星，主消融与灵性\n\n• 正位核心是主动暂停、换个视角看全局；逆位则偏向无谓牺牲、僵持拖延或拒绝让步',
    en: '• Element: Water; number 12 symbolizes suspension and insight after sacrifice; ruled by Neptune, governing dissolution and spirituality\n\n• Upright core: chosen pause, seeing the whole from a new angle; reversed leans toward needless martyrdom, stalemate delay, or refusal to yield',
    ja: '• 元素は水、数12は懸置と犠牲後の洞察を象徴し、海王星が支配し、溶解と霊性を司ります\n\n• 正位置の核心は意図的な停止と視点を変えた全体把握。逆位置では無意味な犠牲、膠着した先延ばし、譲歩の拒否に傾きます',
  },
  13: {
    zh: '• 元素为水，灵数 13 象征旧形态的终结与转化，对应天蝎座，主蜕变与深层净化\n\n• 正位核心是彻底放下、迎接必然的转变与重生；逆位则偏向抗拒结束、抱残守缺或被恐惧拖住',
    en: '• Element: Water; number 13 symbolizes the end of old forms and transformation; corresponds to Scorpio, governing metamorphosis and deep purification\n\n• Upright core: thorough letting go, embracing inevitable change and rebirth; reversed leans toward resisting endings, clinging to remnants, or being dragged by fear',
    ja: '• 元素は水、数13は古い形態の終焉と変容を象徴し、蠍座に対応し、変態と深層の浄化を司ります\n\n• 正位置の核心は完全に手放し、必然の転換と再生を受け入れること。逆位置では終わりへの抵抗、残骸への固執、恐怖に引きずられる傾向に傾きます',
  },
  14: {
    zh: '• 元素为火，灵数 14 象征对立元素的调和炼金，对应射手座，主节制与远行\n\n• 正位核心是恰到好处的平衡、耐心调兑；逆位则偏向失衡极端、急躁冒进或生活节奏紊乱',
    en: '• Element: Fire; number 14 symbolizes alchemical blending of opposites; corresponds to Sagittarius, governing temperance and far journeys\n\n• Upright core: just-right balance, patient blending; reversed leans into extremes and imbalance, rash haste, or disordered rhythms of life',
    ja: '• 元素は火、数14は対立元素の調和という錬金を象徴し、射手座に対応し、節制と遠行を司ります\n\n• 正位置の核心は程良いバランスと忍耐ある調合。逆位置では極端な不均衡、短気な突進、生活リズムの乱れに傾きます',
  },
  15: {
    zh: '• 元素为土，灵数 15 象征物质层面的诱惑与束缚，对应摩羯座，主欲望与规训\n\n• 正位核心是被执念、成瘾或不健康关系捆绑；逆位则偏向挣脱锁链、觉察依附并开始解脱',
    en: '• Element: Earth; number 15 symbolizes material temptation and bondage; corresponds to Capricorn, governing desire and discipline\n\n• Upright core: chained by obsession, addiction, or unhealthy attachment; reversed leans toward breaking chains, seeing dependency, beginning release',
    ja: '• 元素は土、数15は物質面での誘惑と束縛を象徴し、山羊座に対応し、欲望と規律を司ります\n\n• 正位置の核心は執着、依存、不健全な関係に縛られること。逆位置では鎖を断ち切り、依存に気づき、解放へ向かう傾向に傾きます',
  },
  16: {
    zh: '• 元素为火，灵数 16 象征高塔崩塌式的骤变，对应火星，主冲击与破立\n\n• 正位核心是突发剧变摧毁虚假结构、带来启示；逆位则偏向侥幸避险、延迟崩溃或转为内部瓦解',
    en: '• Element: Fire; number 16 symbolizes tower-collapse upheaval; ruled by Mars, governing shock and rupture\n\n• Upright core: sudden upheaval destroys false structures and brings revelation; reversed leans into narrowly escaping disaster, delayed collapse, or internal disintegration',
    ja: '• 元素は火、数16は塔の崩壊のような急変を象徴し、火星が支配し、衝撃と破壊・構築を司ります\n\n• 正位置の核心は突発的激変が虚偽の構造を破壊し啓示をもたらすこと。逆位置では危機の回避、崩壊の先送り、内部からの瓦解への転化に傾きます',
  },
  17: {
    zh: '• 元素为风，灵数 17 象征风暴后的宁静与希望，对应水瓶座，主灵感与未来\n\n• 正位核心是创伤后的疗愈、信念重燃；逆位则偏向希望黯淡、信心不足或方向感模糊',
    en: '• Element: Air; number 17 symbolizes calm and hope after the storm; corresponds to Aquarius, governing inspiration and the future\n\n• Upright core: healing after trauma, faith rekindled; reversed leans into dimmed hope, lacking confidence, or blurred direction',
    ja: '• 元素は風、数17は嵐の後の静けさと希望を象徴し、水瓶座に対応し、霊感と未来を司ります\n\n• 正位置の核心はトラウマからの癒しと信念の再燃。逆位置では希望の陰り、自信不足、方向感覚のぼやけに傾きます',
  },
  18: {
    zh: '• 元素为水，灵数 18 象征月光下的迷雾与潜意识深处，对应双鱼座，主幻梦与直觉\n\n• 正位核心是不安与幻象交织、真相尚未明朗；逆位则偏向迷雾渐散、恐惧消退、真相浮现',
    en: '• Element: Water; number 18 symbolizes moonlit mist and subconscious depths; corresponds to Pisces, governing illusion and intuition\n\n• Upright core: anxiety interwoven with illusions, truth unclear; reversed leans into mist lifting, fear receding, truth surfacing',
    ja: '• 元素は水、数18は月光の霧と潜在意識の深みを象徴し、魚座に対応し、幻想と直観を司ります\n\n• 正位置の核心は不安と幻想が交錯し、真実がまだ不明瞭なこと。逆位置では霧が晴れ、恐怖が後退し、真実が浮上する傾向に傾きます',
  },
  19: {
    zh: '• 元素为火，灵数 19 象征光焰鼎盛的成功时刻，对应太阳，主生命力与荣耀\n\n• 正位核心是喜悦明朗、事情走向成功；逆位则偏向光芒受阻、过度乐观或成果延迟',
    en: '• Element: Fire; number 19 symbolizes the triumphant height of light; ruled by the Sun, governing vitality and glory\n\n• Upright core: joy and clarity, things moving to success; reversed leans into dimmed brilliance, excessive optimism, or delayed results',
    ja: '• 元素は火、数19は光炎最盛の成功の時を象徴し、太陽が支配し、生命力と栄光を司ります\n\n• 正位置の核心は喜びと明晰さ、物事が成功へ向かうこと。逆位置では光の阻害、過度の楽観、成果の遅延に傾きます',
  },
  20: {
    zh: '• 元素为火，灵数 20 象征审判号角下的总清算与重生，对应冥王星，主深层转化\n\n• 正位核心是觉醒召唤、旧账清偿、迎来第二人生；逆位则偏向自我怀疑、拒绝回应召唤或逃避反省',
    en: '• Element: Fire; number 20 symbolizes final reckoning and rebirth under the trumpet call; ruled by Pluto, governing deep transformation\n\n• Upright core: awakening call, old accounts settled, a second life begins; reversed leans into self-doubt, ignoring the call, or evading self-examination',
    ja: '• 元素は火、数20は審判のラッパの下での総決算と再生を象徴し、冥王星が支配し、深層変容を司ります\n\n• 正位置の核心は覚醒の呼び声、宿題の清算、第二の人生の到来。逆位置では自己怀疑、呼び声への拒否、内省の回避に傾きます',
  },
  21: {
    zh: '• 元素为土，灵数 21 象征旅程终点的大功告成，对应土星，主收成与整合\n\n• 正位核心是目标达成、圆满整合、世界为你打开；逆位则偏向临门差一步、收尾延迟或圆满感缺失',
    en: '• Element: Earth; number 21 symbolizes grand completion at journey\u2019s end; ruled by Saturn, governing harvest and integration\n\n• Upright core: goal achieved, wholeness integrated, the world opens up; reversed leans into falling short at the finish, delayed closure, or missing fulfillment',
    ja: '• 元素は土、数21は旅の終わりの大功告成を象徴し、土星が支配し、収穫と統合を司ります\n\n• 正位置の核心は目標達成、円満な統合、世界が開かれること。逆位置では終盤の一歩不足、仕上げの遅延、満足感の欠如に傾きます',
  },

  // ══════════ 权杖（火）22-35 ══════════
  22: {
    zh: '• 权杖首牌，元素为火，数字 1 象征纯粹的行动火花与开端，主灵感迸发\n\n• 正位核心是新机会点燃热情与创造力；逆位则偏向火花熄灭、错失时机或动力延迟',
    en: '• First Wands card, Element: Fire; Ace symbolizes pure spark of action and beginnings, governing bursts of inspiration\n\n• Upright core: new opportunities igniting passion and creativity; reversed leans into extinguished sparks, missed timing, or delayed drive',
    ja: '• 杖の最初のカード、元素は火、エースは純粋な行動の火花と始まりを象徴し、霊感の爆発を司ります\n\n• 正位置の核心は新しい機会が情熱と創造力に火をつけること。逆位置では火花の消滅、好機の逸失、動力の遅延に傾きます',
  },
  23: {
    zh: '• 元素为火，灵数 2 象征行动前的权衡观望，主规划与远见\n\n• 正位核心是手持世界、审慎布局等待最佳时机；逆位则偏向犹豫不决、恐惧未知或计划落空',
    en: '• Element: Fire; number 2 symbolizes weighing and watching before acting, governing planning and vision\n\n• Upright core: holding the world in hand, prudent positioning for the right moment; reversed leans into indecision, fear of the unknown, or plans falling through',
    ja: '• 元素は火、数2は行動前の熟慮と観望を象徴し、計画と先見を司ります\n\n• 正位置の核心は世界を手に、慎重に配置して最適の瞬間を待つこと。逆位置では決断の猶予、未知への恐れ、計画の頓挫に傾きます',
  },
  24: {
    zh: '• 元素为火，灵数 3 象征初次扩张与向外展望，主进展与合作\n\n• 正位核心是船只出港、事业拓展、远景成型；逆位则偏向扩张受挫、停滞港口或合作生变',
    en: '• Element: Fire; number 3 symbolizes first expansion and outward outlook, governing progress and cooperation\n\n• Upright core: ships departing, ventures expanding, horizons forming; reversed leans into stalled expansion, harbor stagnation, or cooperation souring',
    ja: '• 元素は火、数3は初めての拡張と外への展望を象徴し、進展と協力を司ります\n\n• 正位置の核心は船の出港、事業の拡大、展望の形成。逆位置では拡張の挫折、港での停滞、協力関係の変質に傾きます',
  },
  25: {
    zh: '• 元素为火，灵数 4 象征阶段性成果的欢庆与安顿，主稳定与归属\n\n• 正位核心是庆祝里程碑、根基安稳；逆位则偏向庆典延期、根基松动或处于过渡期动荡',
    en: '• Element: Fire; number 4 symbolizes celebrating and settling milestone achievements, governing stability and belonging\n\n• Upright core: celebrating milestones, secure foundations; reversed leans into postponed celebrations, loosened roots, or transitional turbulence',
    ja: '• 元素は火、数4は段階的成果の歓慶と安住を象徴し、安定と帰属を司ります\n\n• 正位置の核心は節目の祝賀と安定した基盤。逆位置では祝賀の延期、基盤の揺らぎ、過渡期の動揺に傾きます',
  },
  26: {
    zh: '• 元素为火，灵数 5 象征多方竞逐的摩擦场面，主竞争与张力\n\n• 正位核心是良性竞争、混乱中锻炼实力；逆位则偏向回避冲突、转向内耗或勉强和解',
    en: '• Element: Fire; number 5 symbolizes friction of many contenders, governing competition and tension\n\n• Upright core: fair contest, honing strength amid chaos; reversed leans into avoiding conflict, turning inward friction, or reluctant reconciliation',
    ja: '• 元素は火、数5は多方面からの競争による摩擦を象徴し、競争と緊張を司ります\n\n• 正位置の核心は健全な競争と混乱の中での力の鍛錬。逆位置では衝突の回避、内面の消耗、形式的な和解に傾きます',
  },
  27: {
    zh: '• 元素为火，灵数 6 象征凯旋与公开认可，主胜利与声誉\n\n• 正位核心是骑马凯旋、赢得掌声与自信；逆位则偏向败退、认可缺席或得意忘形',
    en: '• Element: Fire; number 6 symbolizes triumph and public recognition, governing victory and reputation\n\n• Upright core: riding in triumph, earning applause and confidence; reversed leans into retreat, absent recognition, or hubris',
    ja: '• 元素は火、数6は凱旋と公の承認を象徴し、勝利と評判を司ります\n\n• 正位置の核心は馬で凱旋し、拍手と自信を得ること。逆位置では敗退、承認の不在、有頂天に傾きます',
  },
  28: {
    zh: '• 元素为火，灵数 7 象征守住阵地的防御战，主坚持与勇气\n\n• 正位核心是以寡敌众、捍卫立场的韧性；逆位则偏向寡不敌众、放弃阵地或过度设防',
    en: '• Element: Fire; number 7 symbolizes defensive battle to hold ground, governing persistence and courage\n\n• Upright core: outnumbered but holding your position; reversed leans into being overrun, abandoning ground, or over-fortifying',
    ja: '• 元素は火、数7は陣地を守る防御戦を象徴し、忍耐と勇気を司ります\n\n• 正位置の核心は少数で多数に対抗し立場を守る靭性。逆位置では多勢に圧倒され、陣地を放棄、過剰な防備に傾きます',
  },
  29: {
    zh: '• 元素为火，灵数 8 象征齐飞的箭矢般的高速推进，主速度与消息\n\n• 正位核心是事情骤然提速、消息纷至；逆位则偏向进程延误、信息混乱或仓促冲动',
    en: '• Element: Fire; number 8 symbolizes arrows flying in swift advance, governing speed and messages\n\n• Upright core: sudden acceleration, news arriving fast; reversed leans into delays, garbled information, or hasty impulsiveness',
    ja: '• 元素は火、数8は飛び交う矢のような高速推進を象徴し、速度と便りを司ります\n\n• 正位置の核心は事態の突然の加速と続々届く知らせ。逆位置では進行の遅延、情報の混線、性急な衝動に傾きます',
  },
  30: {
    zh: '• 元素为火，灵数 9 象征伤后仍立的最后防线，主坚韧与警觉\n\n• 正位核心是伤痕累累却依然坚守、最后一搏；逆位则偏向精疲力竭、固执硬撑或草木皆兵',
    en: '• Element: Fire; number 9 symbolizes the last stand while wounded, governing resilience and vigilance\n\n• Upright core: battle-scarred yet still standing, one final push; reversed leans into exhaustion, stubborn endurance, or jumping at shadows',
    ja: '• 元素は火、数9は負傷しながらも立つ最後の防線を象徴し、堅忍と警戒を司ります\n\n• 正位置の核心は傷だらけでも持ちこたえ、最後の一踏ん張りを行うこと。逆位置では疲弊、意固地な耐え抜き、疑心暗鬼に傾きます',
  },
  31: {
    zh: '• 元素为火，灵数 10 象征负重到极限的压力峰值，主负担与责任\n\n• 正位核心是身扛十杖、重压下即将见终点的坚持；逆位则偏向卸下部分负担、学会拒绝或超载崩溃',
    en: '• Element: Fire; number 10 symbolizes peak pressure under maximal burden, governing load and duty\n\n• Upright core: carrying ten staves, persisting under weight near the finish; reversed leans into putting burdens down, learning refusal, or overload collapse',
    ja: '• 元素は火、数10は限界までの負荷による圧力のピークを象徴し、負担と責任を司ります\n\n• 正位置の核心は十本の杖を背負い、重圧の中で終点目前まで耐え抜くこと。逆位置では負担の一部解放、拒否の学習、過積載による崩壊に傾きます',
  },
  32: {
    zh: '• 宫廷牌·侍从级，元素为火，象征火元素的稚嫩萌芽，主探索与热忱\n\n• 正位核心是满怀热情探索新领域、迎来新消息；逆位则偏向三分钟热度、方向幼稚或冲动行事',
    en: '• Court card, Page rank, Element: Fire — the tender sprout of fire energy, governing exploration and zeal\n\n• Upright core: eager exploration of new territory, news arriving; reversed leans into short-lived enthusiasm, immature direction, or impulsive acts',
    ja: '• 宮廷カードのペイジ、元素は火、火の元素の幼い芽を象徴し、探求と熱忱を司ります\n\n• 正位置の核心は情熱を持って新分野を探究し、新しい知らせを迎えること。逆位置では三日坊主の熱、未熟な方向、衝動的な行動に傾きます',
  },
  33: {
    zh: '• 宫廷牌·骑士级，元素为火，象征火元素的疾驰冲锋，主行动与冒险\n\n• 正位核心是激情驱动的快速出击与开拓；逆位则偏向横冲直撞、急躁误事或能量空耗',
    en: '• Court card, Knight rank, Element: Fire — fire energy charging forward, governing action and adventure\n\n• Upright core: passion-driven swift strikes and pioneering; reversed leans into headlong charging, hasty blunders, or wasted energy',
    ja: '• 宮廷カードのナイト、元素は火、火の元素の疾走する突撃を象徴し、行動と冒険を司ります\n\n• 正位置の核心は情熱に駆られた速攻と開拓。逆位置では当て所なく突っ走る、短気による失策、エネルギーの空費に傾きます',
  },
  34: {
    zh: '• 宫廷牌·王后级，元素为火，象征火元素的成熟魅力，主自信与感染力\n\n• 正位核心是独立自信、以热情鼓舞他人；逆位则偏向嫉妒心起、控制欲强或情绪化待人',
    en: '• Court card, Queen rank, Element: Fire — mature charisma of fire energy, governing confidence and magnetism\n\n• Upright core: independent confidence, inspiring others with warmth; reversed leans into jealousy, controlling urges, or moody treatment of others',
    ja: '• 宮廷カードのクイーン、元素は火、火の元素の熟した魅力を象徴し、自信と感染力を司ります\n\n• 正位置の核心は独立した自信と、熱意で他者を鼓舞すること。逆位置では嫉妬心、支配欲、感情的な接し方に傾きます',
  },
  35: {
    zh: '• 宫廷牌·国王级，元素为火，象征火元素的巅峰统御，主领导与魄力\n\n• 正位核心是高瞻远瞩、果断拍板的领袖气场；逆位则偏向专横跋扈、傲慢自大或滥用权力',
    en: '• Court card, King rank, Element: Fire — the commanding apex of fire energy, governing leadership and boldness\n\n• Upright core: visionary decisiveness, leader presence; reversed leans into tyranny, arrogance, or abuse of power',
    ja: '• 宮廷カードのキング、元素は火、火の元素の頂点にある統御を象徴し、リーダーシップと胆力を司ります\n\n• 正位置の核心は先見性のある果断な決定とリーダーの風格。逆位置では専横、傲慢、権力の濫用に傾きます',
  },

  // ══════════ 圣杯（水）36-49 ══════════
  36: {
    zh: '• 圣杯首牌，元素为水，数字 1 象征情感之源的涌流，主爱与灵性开启\n\n• 正位核心是新的感情萌动、心灵被滋养；逆位则偏向情感阻塞、爱意流失或内心空虚',
    en: '• First Cups card, Element: Water; Ace symbolizes the wellspring of emotion, governing love and spiritual opening\n\n• Upright core: new feelings stirring, the heart nourished; reversed leans into emotional blockage, draining affection, or inner emptiness',
    ja: '• カップの最初のカード、元素は水、エースは感情の源泉の湧き出しを象徴し、愛と霊的開花を司ります\n\n• 正位置の核心は新しい感情の芽生えと心の滋養。逆位置では感情の阻塞、愛の流出、内面の空虚に傾きます',
  },
  37: {
    zh: '• 元素为水，灵数 2 象征两颗心的相互映照，主吸引与联结\n\n• 正位核心是双向奔赴的默契、平等的情感交换；逆位则偏向关系失衡、单向付出或误解滋生',
    en: '• Element: Water; number 2 symbolizes two hearts mirroring each other, governing attraction and bonding\n\n• Upright core: mutual rapport, equal emotional exchange; reversed leans into imbalanced relationship, one-sided giving, or breeding misunderstanding',
    ja: '• 元素は水、数2は二つの心の映し合いを象徴し、魅力と結びつきを司ります\n\n• 正位置の核心は双方向の默契と対等な感情の交換。逆位置では関係の不均衡、片思いの付出、誤解の発生に傾きます',
  },
  38: {
    zh: '• 元素为水，灵数 3 象征情感在群体中的流动，主友谊与欢庆\n\n• 正位核心是好友相聚、社群支持的快乐；逆位则偏向圈子过剩的放纵、八卦是非或社交倦怠',
    en: '• Element: Water; number 3 symbolizes emotion flowing within community, governing friendship and celebration\n\n• Upright core: gathering of friends, joy of communal support; reversed leans into excess indulgence, gossip drama, or social fatigue',
    ja: '• 元素は水、数3は集団の中の感情の流れを象徴し、友情と祝賀を司ります\n\n• 正位置の核心は友人の集まりと共同体の支えによる喜び。逆位置では過剰な放縦、噂話のもめごと、社交の疲れに傾きます',
  },
  39: {
    zh: '• 元素为水，灵数 4 象征对眼前馈赠的无感停顿，主内省与倦怠\n\n• 正位核心是心灰意冷中忽视身边的机会；逆位则偏向走出冷漠、重新接纳递来的杯子',
    en: '• Element: Water; number 4 symbolizes apathetic pause blind to offered gifts, governing introspection and weariness\n\n• Upright core: dispiritedly overlooking chances at hand; reversed leans into emerging from indifference, accepting the offered cup anew',
    ja: '• 元素は水、数4は目の前の贈り物への無感覚な停滞を象徴し、内省と疲弊を司ります\n\n• 正位置の核心は意気消沈の中で身近な機会を見過ごすこと。逆位置では無関心から抜け出し、差し出された杯を再び受け入れる傾向に傾きます',
  },
  40: {
    zh: '• 元素为水，灵数 5 象征失落中的注意力偏差，主悲伤与释怀\n\n• 正位核心是只盯着打翻的三杯而看不见身后立着的两杯；逆位则偏向接纳失去、转身看见尚存的希望',
    en: '• Element: Water; number 5 symbolizes attention bias amid loss, governing grief and release\n\n• Upright core: staring at three spilled cups, blind to two standing behind; reversed leans into accepting loss, turning to see remaining hope',
    ja: '• 元素は水、数5は喪失の中の注意の偏りを象徴し、悲嘆と釈放を司ります\n\n• 正位置の核心はこぼれた三杯ばかり見て、後ろに立つ二杯に気づかないこと。逆位置では喪失を受け入れ、残された希望に目を向ける傾向に傾きます',
  },
  41: {
    zh: '• 元素为水，灵数 6 象征来自过去的纯真馈赠，主怀旧与旧缘\n\n• 正位核心是童年式善意、故人或旧情的温暖回响；逆位则偏向困在过去、理想化旧日而无法前行',
    en: '• Element: Water; number 6 symbolizes innocent gifts from the past, governing nostalgia and old bonds\n\n• Upright core: childhood kindness, warm echoes of old friends or feelings; reversed leans into being stuck in the past, idealizing yesterday and unable to move on',
    ja: '• 元素は水、数6は過去からの純真な贈り物を象徴し、懐古と旧縁を司ります\n\n• 正位置の核心は子供時代のような善意と、故人や旧情の温かな残響。逆位置では過去に囚われ、昨日を理想化して前に進めない傾向に傾きます',
  },
  42: {
    zh: '• 元素为水，灵数 7 象征七彩幻杯的诱惑迷宫，主幻想与甄别\n\n• 正位核心是选项繁多却多为海市蜃楼、需辨真假；逆位则偏向幻觉破灭、脚踏实地做出取舍',
    en: '• Element: Water; number 7 symbolizes the maze of seven phantasmal cups, governing fantasy and discernment\n\n• Upright core: abundant options that are mostly mirage, needing triage; reversed leans into illusions shattering, grounded choice-making',
    ja: '• 元素は水、数7は七つの幻の杯の誘惑の迷宮を象徴し、幻想とふるい分けを司ります\n\n• 正位置の核心は選択肢が多くても大半が蜃気楼であり、真偽の見極めが必要なこと。逆位置では幻想が崩れ、地に足をつけて取捨選択する傾向に傾きます',
  },
  43: {
    zh: '• 元素为水，灵数 8 象征毅然离开堆叠成就的转身，主告别与追寻\n\n• 正位核心是主动放弃「看似足够」的生活去寻找更深意义；逆位则偏向想走又留、恐惧改变或半途回头',
    en: '• Element: Water; number 8 symbolizes resolute departure from stacked achievements, governing farewell and seeking\n\n• Upright core: leaving a \u201cgood enough\u201d life for deeper meaning; reversed leans into wanting to leave yet staying, fearing change, or turning back midway',
    ja: '• 元素は水、数8は積み上げた成果を毅然と後にする姿を象徴し、別れと探求を司ります\n\n• 正位置の核心は「十分に見える」生活を捨て、より深い意味を求めること。逆位置では行きたいのに留まる、変化への恐れ、途中で引き返す傾向に傾きます',
  },
  44: {
    zh: '• 元素为水，灵数 9 象征愿望即将成真的满足时刻，主如愿与享乐\n\n• 正位核心是心想事成的幸福感、自我款待；逆位则偏向得到却不满足、欲壑难填或内在空虚',
    en: '• Element: Water; number 9 symbolizes the satisfied moment as wishes near fruition, governing fulfillment and enjoyment\n\n• Upright core: happiness of getting what you wished, self-reward; reversed leans into having yet unfulfilled, insatiable wants, or inner emptiness',
    ja: '• 元素は水、数9は願いが叶いゆく満足の時を象徴し、成就と享受を司ります\n\n• 正位置の核心は願いが叶う幸福感と自分へのご褒美。逆位置では得ても満たされない、飽くなき欲望、内面の空虚に傾きます',
  },
  45: {
    zh: '• 元素为水，灵数 10 象征情感领域的圆满归宿，主家庭与归属\n\n• 正位核心是家庭和睦、情感世界的彩虹终点；逆位则偏向家庭龃龉、理想家庭幻灭或情感疏离',
    en: '• Element: Water; number 10 symbolizes the fulfilling destination of emotion, governing family and belonging\n\n• Upright core: domestic harmony, rainbow ending of the emotional world; reversed leans into family friction, disillusioned ideals, or emotional estrangement',
    ja: '• 元素は水、数10は感情領域の円満な帰着を象徴し、家庭と帰属を司ります\n\n• 正位置の核心は家庭の睦み合い、感情世界の虹の終点。逆位置では家庭の不和、理想家族の幻滅、感情の疎遠に傾きます',
  },
  46: {
    zh: '• 宫廷牌·侍从级，元素为水，象征水元素的初潮涟漪，主浪漫与敏感\n\n• 正位核心是心动的萌芽、创意涌现或爱的讯息；逆位则偏向情绪起伏、矫情脆弱或沉溺白日梦',
    en: '• Court card, Page rank, Element: Water — first ripples of water energy, governing romance and sensitivity\n\n• Upright core: stirrings of attraction, creative flow, messages of love; reversed leans into mood swings, fragile drama, or drowning in daydreams',
    ja: '• 宮廷カードのペイジ、元素は水、水の元素の最初のさざ波を象徴し、ロマンと敏感さを司ります\n\n• 正位置の核心はときめきの芽生え、創意の湧き出し、愛の便り。逆位置では情緒の起伏、か弱いドラマ、白昼夢への耽溺に傾きます',
  },
  47: {
    zh: '• 宫廷牌·骑士级，元素为水，象征水元素的缓慢优雅前行，主浪漫与邀约\n\n• 正位核心是捧杯骑士的理想主义追求与温柔示爱；逆位则偏向华而不实的承诺、情绪反复或幻想大于行动',
    en: '• Court card, Knight rank, Element: Water — water energy advancing slowly and gracefully, governing romance and invitation\n\n• Upright core: idealistic courtship and gentle advances bearing the cup; reversed leans into empty promises, emotional swings, or fantasy outweighing action',
    ja: '• 宮廷カードのナイト、元素は水、水の元素の緩やかで優雅な前進を象徴し、ロマンと招待を司ります\n\n• 正位置の核心は杯を掲げる騎士の理想的な追求と優しい愛の示し。逆位置では華やかだが中身のない約束、情緒の反復、空想が行動を上回る傾向に傾きます',
  },
  48: {
    zh: '• 宫廷牌·王后级，元素为水，象征水元素的深邃包容，主共情与滋养\n\n• 正位核心是以直觉和同理心托举他人情绪；逆位则偏向情绪决堤、过度卷入或依赖他人认可',
    en: '• Court card, Queen rank, Element: Water — deep containment of water energy, governing empathy and nurture\n\n• Upright core: holding others\u2019 emotions with intuition and compassion; reversed leans into emotional overflow, over-involvement, or leaning on others\u2019 approval',
    ja: '• 宮廷カードのクイーン、元素は水、水の元素の深く包み込む包容を象徴し、共感と滋養を司ります\n\n• 正位置の核心は直観と共感で他者の感情を支えること。逆位置では感情の決壊、過度の巻き込み、他者の承認への依存に傾きます',
  },
  49: {
    zh: '• 宫廷牌·国王级，元素为水，象征水元素的沉稳容器，主情商与抚慰\n\n• 正位核心是以成熟稳重涵养波涛、成为他人的定海针；逆位则偏向以情感操纵人心、冷漠压抑或情绪内溃',
    en: '• Court card, King rank, Element: Water — the steady vessel of water energy, governing emotional intelligence and soothing\n\n• Upright core: containing waves with maturity, others\u2019 anchor; reversed leans into emotional manipulation, cold suppression, or inner collapse of feeling',
    ja: '• 宮廷カードのキング、元素は水、水の元素の落ち着いた器を象徴し、情緒知能と鎮めを司ります\n\n• 正位置の核心は成熟した落ち着きで波を涵養し、他者の錨となること。逆位置では感情による人心操作、冷徹な抑圧、感情の内側での崩壊に傾きます',
  },

  // ══════════ 宝剑（风）50-63 ══════════
  50: {
    zh: '• 宝剑首牌，元素为风，数字 1 象征思维之剑的破空而出，主真理与突破\n\n• 正位核心是思路豁然清晰、真相劈开迷障；逆位则偏向思绪混乱、判断失误或言辞伤人',
    en: '• First Swords card, Element: Air; Ace symbolizes the sword of thought breaking through, governing truth and breakthrough\n\n• Upright core: sudden clarity, truth cutting through fog; reversed leans into muddled thinking, faulty judgment, or hurtful words',
    ja: '• ソードの最初のカード、元素は風、エースは思考の剣が突き破ることを象徴し、真実と突破を司ります\n\n• 正位置の核心は考えがぱっと明晰になり、真実が迷いを断ち切ること。逆位置では思考の混乱、判断ミス、言葉の傷に傾きます',
  },
  51: {
    zh: '• 元素为风，灵数 2 象征蒙眼的双刃僵局，主抉择困境\n\n• 正位核心是被蒙住双眼、两手各执一剑的进退维谷；逆位则偏向摘下眼罩做出决定、直面真相',
    en: '• Element: Air; number 2 symbolizes the blindfolded double-blade stalemate, governing dilemmas\n\n• Upright core: blindfolded with a blade in each hand, caught between; reversed leans into removing the blindfold, deciding, facing truth',
    ja: '• 元素は風、数2は目隠しした双刃の膠着を象徴し、択一の困難を司ります\n\n• 正位置の核心は目隠しをして両手に剣を持ち、進退きわまること。逆位置では目隠しを外して決断し、真実と向き合う傾向に傾きます',
  },
  52: {
    zh: '• 元素为风，灵数 3 象征三剑穿心的至痛时刻，主心碎与净化\n\n• 正位核心是背叛或失去带来的锥心之痛；逆位则偏向伤痛开始愈合、拔剑释怀与复原',
    en: '• Element: Air; number 3 symbolizes the piercing heartbreak moment, governing heartbreak and purification\n\n• Upright core: searing pain from betrayal or loss; reversed leans into healing begun, withdrawing the blades, releasing and recovering',
    ja: '• 元素は風、数3は三剣が心を貫く至痛の時を象徴し、失恋と浄化を司ります\n\n• 正位置の核心は裏切りや喪失による胸を刺す痛み。逆位置では傷の癒え始め、剣を抜いて手放し、回復へ向かう傾向に傾きます',
  },
  53: {
    zh: '• 元素为风，灵数 4 象征战场间歇的休整，主休息与蓄力\n\n• 正位核心是主动按暂停键、身心修复期；逆位则偏向无法真正休息、过劳倦怠或休整被打断',
    en: '• Element: Air; number 4 symbolizes rest between battles, governing recuperation and recharging\n\n• Upright core: deliberately pressing pause, mind-body repair period; reversed leans into inability to truly rest, burnout, or interrupted recovery',
    ja: '• 元素は風、数4は戦場の合間の休整を象徴し、休息と充電を司ります\n\n• 正位置の核心は意図的にポーズを押し、心身の修復期間に入ること。逆位置では本当に休めない、過労と燃え尽き、休整の中断に傾きます',
  },
  54: {
    zh: '• 元素为风，灵数 5 象征胜负已分的萧瑟战后，主冲突与代价\n\n• 正位核心是赢了争斗却输掉了人心与体面；逆位则偏向放下胜负、承认损失、寻求和解',
    en: '• Element: Air; number 5 symbolizes the bleak aftermath of a decided fight, governing conflict and cost\n\n• Upright core: winning the fight but losing goodwill and honor; reversed leans into laying down the fight, acknowledging losses, seeking reconciliation',
    ja: '• 元素は風、数5は勝敗が決した戦後の荒涼を象徴し、紛争と代価を司ります\n\n• 正位置の核心は争いには勝ったが人心と体面を失うこと。逆位置では勝敗を捨て、損失を認め、和解を求める傾向に傾きます',
  },
  55: {
    zh: '• 元素为风，灵数 6 象征渡向平静彼岸的摆渡之旅，主过渡与疏解\n\n• 正位核心是渐别风波、驶向更平顺的水域；逆位则偏向滞留此岸、旧模式拉扯或行程反复',
    en: '• Element: Air; number 6 symbolizes ferrying toward calmer shores, governing transition and relief\n\n• Upright core: leaving turbulence behind, sailing to smoother waters; reversed leans into stuck on this shore, pulled by old patterns, or back-and-forth journeys',
    ja: '• 元素は風、数6は静かな彼岸への渡し船の旅を象徴し、過渡と緩和を司ります\n\n• 正位置の核心は波乱を後にして、より穏やかな水域へ向かうこと。逆位置では此岸への足止め、旧パターンの引っ張り、行程の往復に傾きます',
  },
  56: {
    zh: '• 元素为风，灵数 7 象征策略与暗中行事的双刃性，主机谋与隐瞒\n\n• 正位核心是灵活周旋、有所隐瞒的策略行动；逆位则偏向骗局暴露、坦白从宽或放弃伎俩',
    en: '• Element: Air; number 7 symbolizes the double edge of strategy and covert moves, governing tactics and concealment\n\n• Upright core: nimble maneuvering, strategic withholding; reversed leans into schemes exposed, coming clean, or dropping the tricks',
    ja: '• 元素は風、数7は策略と暗中活動の両刃を象徴し、機略と隠蔽を司ります\n\n• 正位置の核心は柔軟に立ち回り、一部を隠す戦略的行動。逆位置では工作の露見、白状、手管の放棄に傾きます',
  },
  57: {
    zh: '• 元素为风，灵数 8 象征作茧自缚的心理牢笼，主束缚与自囿\n\n• 正位核心是束缚多源于内心的受害者剧本；逆位则偏向挣脱眼罩与绳索、发现出路一直在',
    en: '• Element: Air; number 8 symbolizes the self-woven psychological cage, governing restriction and self-confinement\n\n• Upright core: bonds mostly stemming from an inner victim script; reversed leans into shedding blindfold and ropes, finding the way out was always there',
    ja: '• 元素は風、数8は自ら織った心理の檻を象徴し、束縛と自閉を司ります\n\n• 正位置の核心は束縛の多くが内面の被害者シナリオに由来すること。逆位置では目隠しと縄を脱ぎ捨て、出口がずっとそこにあったと気づく傾向に傾きます',
  },
  58: {
    zh: '• 元素为风，灵数 9 象征深夜惊醒的焦虑之刃，主忧虑与煎熬\n\n• 正位核心是午夜梦回的担忧放大了恐惧本身；逆位则偏向晨光到来、敢于直面并卸下焦虑',
    en: '• Element: Air; number 9 symbolizes the blade of anxiety waking at midnight, governing worry and torment\n\n• Upright core: fears magnified in sleepless rumination; reversed leans into dawn arriving, daring to face and set down the anxiety',
    ja: '• 元素は風、数9は深夜に目覚める不安の剣を象徴し、憂慮と苦渋を司ります\n\n• 正位置の核心は眠れぬ夜の反芻が恐怖そのものを拡大すること。逆位置では朝の光が訪れ、不安と正面から向き合い降ろす傾向に傾きます',
  },
  59: {
    zh: '• 元素为风，灵数 10 象征触底即转机的终结时刻，主谷底与终结\n\n• 正位核心是最坏已经发生、背后正是升起的黎明；逆位则偏向从谷底复苏、黑暗期步入尾声',
    en: '• Element: Air; number 10 symbolizes rock bottom doubling as turning point, governing the nadir and endings\n\n• Upright core: the worst has happened, dawn rising right behind; reversed leans into recovering from the depths, the dark chapter nearing its end',
    ja: '• 元素は風、数10はどん底が転機でもある終焉の時を象徴し、谷底と終結を司ります\n\n• 正位置の核心は最悪は既に起き、背後には昇る夜明けがあること。逆位置では谷底からの復活、暗黒期の終わりに近づく傾向に傾きます',
  },
  60: {
    zh: '• 宫廷牌·侍从级，元素为风，象征风元素的机警目光，主观察与警觉\n\n• 正位核心是敏锐收集信息、保持好奇观望；逆位则偏向流言八卦、多疑猜忌或言语带刺',
    en: '• Court card, Page rank, Element: Air — the vigilant gaze of air energy, governing observation and alertness\n\n• Upright core: keenly gathering information, curious watching; reversed leans into gossip, suspiciousness, or barbed words',
    ja: '• 宮廷カードのペイジ、元素は風、風の元素の機敏な眼差しを象徴し、観察と警戒を司ります\n\n• 正位置の核心は鋭く情報を収集し、好奇心を持って眺めること。逆位置では噂話、疑い深さ、棘のある言葉に傾きます',
  },
  61: {
    zh: '• 宫廷牌·骑士级，元素为风，象征风元素的闪电突进，主迅捷与锋芒\n\n• 正位核心是思维与行动都极快的果断冲锋；逆位则偏向横冲直撞、言语伤人或阵脚大乱',
    en: '• Court card, Knight rank, Element: Air — lightning thrust of air energy, governing swiftness and edge\n\n• Upright core: decisive charges of fast thought and fast action; reversed leans into reckless charging, wounding words, or thrown-into-chaos ranks',
    ja: '• 宮廷カードのナイト、元素は風、風の元素の電光の突進を象徴し、迅速と切れ味を司ります\n\n• 正位置の核心は思考も行動も素早い果断な突進。逆位置では当て所のない疾走、言葉の傷、陣形の大乱に傾きます',
  },
  62: {
    zh: '• 宫廷牌·王后级，元素为风，象征风元素的清明切割，主理智与界限\n\n• 正位核心是冷静客观、敢下判断且界限分明；逆位则偏向尖刻冷酷、情感隔离或评判过度',
    en: '• Court card, Queen rank, Element: Air — clear-cutting clarity of air energy, governing reason and boundaries\n\n• Upright core: calm objectivity, daring judgment, firm boundaries; reversed leans into cold sharpness, emotional isolation, or over-judging',
    ja: '• 宮廷カードのクイーン、元素は風、風の元素の清明な切断を象徴し、理性と境界を司ります\n\n• 正位置の核心は冷静で客観的、判断を恐れず境界も明確なこと。逆位置では冷淡な鋭さ、感情の遮断、裁きすぎに傾きます',
  },
  63: {
    zh: '• 宫廷牌·国王级，元素为风，象征风元素的理性权威，主裁决与谋略\n\n• 正位核心是以智识与原则主持大局的决断者；逆位则偏向冷酷专制、巧言令色或权力滥用',
    en: '• Court card, King rank, Element: Air — rational authority of air energy, governing judgment and strategy\n\n• Upright core: a decider who rules by intellect and principle; reversed leans into cold tyranny, glib charm, or abuse of power',
    ja: '• 宮廷カードのキング、元素は風、風の元素の理性的権威を象徴し、裁きと謀略を司ります\n\n• 正位置の核心は知識と原則で大局を宰領する決断者であること。逆位置では冷酷な専制、弁舌の巧みな誘い、権力の濫用に傾きます',
  },

  // ══════════ 星币（土）64-77 ══════════
  64: {
    zh: '• 星币首牌，元素为土，数字 1 象征物质之种的落地生根，主机遇与实务\n\n• 正位核心是看得见摸得着的新机会、务实起步；逆位则偏向机会溜走、财务隐忧或启动延迟',
    en: '• First Pentacles card, Element: Earth; Ace symbolizes material seed taking root, governing opportunity and practicality\n\n• Upright core: tangible new opportunity, grounded start; reversed leans into slipping chances, financial worries, or delayed launch',
    ja: '• ペンタクルの最初のカード、元素は土、エースは物質の種の芽生えを象徴し、機会と実務を司ります\n\n• 正位置の核心は手に取れる新しい機会と地に足のついた出発。逆位置では機会の逸失、財務の懸念、開始の遅延に傾きます',
  },
  65: {
    zh: '• 元素为土，灵数 2 象征抛接两枚钱币的动态平衡，主变通与兼顾\n\n• 正位核心是多线并行、灵活兼顾的适应力；逆位则偏向顾此失彼、超载失衡或安排混乱',
    en: '• Element: Earth; number 2 symbolizes dynamic balance juggling two coins, governing adaptability and multitasking\n\n• Upright core: parallel tracks handled with flexible agility; reversed leans into dropping balls, overload imbalance, or chaotic scheduling',
    ja: '• 元素は土、数2は二枚のコインを投げ合う動的均衡を象徴し、応変と兼務を司ります\n\n• 正位置の核心は複数の線を柔軟にさばく適応力。逆位置では取りこぼし、過積載の不均衡、予定の混乱に傾きます',
  },
  66: {
    zh: '• 元素为土，灵数 3 象征众人协作的营造现场，主协作与匠艺\n\n• 正位核心是各展所长、共同搭建出实绩；逆位则偏向配合失调、质量滑坡或各自为政',
    en: '• Element: Earth; number 3 symbolizes collaborative building on site, governing teamwork and craftsmanship\n\n• Upright core: each playing their part, tangible results built together; reversed leans into poor coordination, sliding quality, or siloed effort',
    ja: '• 元素は土、数3は多くの人が協働する建設現場を象徴し、協力と匠の技を司ります\n\n• 正位置の核心は各自が力を発揮し、共に実績を築くこと。逆位置では連携の不調、品質の低下、各々勝手な動きに傾きます',
  },
  67: {
    zh: '• 元素为土，灵数 4 象征紧抱钱币的守成姿态，主掌控与保守\n\n• 正位核心是稳稳握住已有的资源与安全感；逆位则偏向攥得太紧变成吝啬，或防线松动失去掌控',
    en: '• Element: Earth; number 4 symbolizes a conservative stance clutching coins, governing control and prudence\n\n• Upright core: securely holding resources and a sense of safety; reversed leans into gripping too tight into miserliness, or loosened defenses losing control',
    ja: '• 元素は土、数4はコインを抱きしめる守勢の姿勢を象徴し、掌握と保守を司ります\n\n• 正位置の核心は既存の資源と安全感をしっかり握ること。逆位置では握りすぎてケチになり、または防線が緩んで制御を失う傾向に傾きます',
  },
  68: {
    zh: '• 元素为土，灵数 5 象征风雪中门外的匮乏处境，主困顿与求助\n\n• 正位核心是物质或精神上的匮乏感、被排除在温暖之外；逆位则偏向寒冬将尽、援手出现或境遇回暖',
    en: '• Element: Earth; number 5 symbolizes scarcity outside in the snow, governing hardship and asking for help\n\n• Upright core: material or spiritual lack, shut out of warmth; reversed leans into winter easing, helping hands appearing, circumstances warming',
    ja: '• 元素は土、数5は吹雪の中門の外にある欠乏の状況を象徴し、困窮と救援要請を司ります\n\n• 正位置の核心は物質的・精神的な乏しさと、温もりから締め出されること。逆位置では冬の終わり、救いの手の出現、境遇の回暖に傾きます',
  },
  69: {
    zh: '• 元素为土，灵数 6 象征天平两端给予与接受的交换，主慷慨与互惠\n\n• 正位核心是资源流动中的给予或受助、互惠互利；逆位则偏向债务纠葛、施受失衡或被人利用',
    en: '• Element: Earth; number 6 symbolizes the exchange of giving and receiving on scales, governing generosity and reciprocity\n\n• Upright core: resource flow of giving or receiving aid, mutual benefit; reversed leans into debt entanglement, lopsided giving, or being used',
    ja: '• 元素は土、数6は天秤の両端にある与えることと受けることの交換を象徴し、寛容と互恵を司ります\n\n• 正位置の核心は資源の流れの中の援助や恩恵の授受、互恵互利。逆位置では債務のもつれ、施しの不均衡、利用されることに傾きます',
  },
  70: {
    zh: '• 元素为土，灵数 7 象征收获前的驻苗评估，主耐心与盘点\n\n• 正位核心是耕耘已毕、静待结果的关键窗口期；逆位则偏向急于收割、投入失当或怀疑回报',
    en: '• Element: Earth; number 7 symbolizes pausing to assess before harvest, governing patience and review\n\n• Upright core: work done, key window of waiting for fruit; reversed leans into harvesting too early, misdirected investment, or doubting returns',
    ja: '• 元素は土、数7は収穫前の立ち止まり評価を象徴し、忍耐と棚卸しを司ります\n\n• 正位置の核心は耕し終え、結果を静かに待つ重要な窓期。逆位置では刈り取りを急ぐ、投資先の誤り、リターンへの疑念に傾きます',
  },
  71: {
    zh: '• 元素为土，灵数 8 象征日复一日锤炼的手艺，主精进与专注\n\n• 正位核心是埋头打磨技艺、量变逼近质变；逆位则偏向机械重复、热情耗竭或完美主义内耗',
    en: '• Element: Earth; number 8 symbolizes craft honed day after day, governing diligence and focus\n\n• Upright core: heads-down skill polishing, quantity nearing quality shift; reversed leans into mechanical repetition, drained passion, or perfectionist attrition',
    ja: '• 元素は土、数8は日々重ねる技の鍛錬を象徴し、勤勉と集中を司ります\n\n• 正位置の核心は頭を下げて技を磨き、量変化が質変化に迫ること。逆位置では機械的な反復、情熱の枯渇、完璧主義による消耗に傾きます',
  },
  72: {
    zh: '• 元素为土，灵数 9 象征自给自足的丰裕庭园，主独立与享有\n\n• 正位核心是靠自律换来从容、优雅享受成果；逆位则偏向财务根基不稳、过度消费或依赖外力',
    en: '• Element: Earth; number 9 symbolizes the self-sufficient garden of plenty, governing independence and enjoyment\n\n• Upright core: discipline earned ease, savoring fruits gracefully; reversed leans into shaky financial footing, overspending, or reliance on others',
    ja: '• 元素は土、数9は自給自足の豊かな庭園を象徴し、独立と享有を司ります\n\n• 正位置の核心は自律がもたらす余裕と、成果を優雅に味わうこと。逆位置では財務基盤の不安、過剰消費、他力への依存に傾きます',
  },
  73: {
    zh: '• 元素为土，灵数 10 象征财富跨越世代的传承拱门，主家业与长久\n\n• 正位核心是积累化为体系、家族或事业的长期稳固；逆位则偏向家产纠纷、根基动摇或传承断层',
    en: '• Element: Earth; number 10 symbolizes wealth passed through generational arches, governing legacy and durability\n\n• Upright core: accumulation turned system, long-term stability of family or enterprise; reversed leans into estate disputes, shaken foundations, or broken succession',
    ja: '• 元素は土、数10は富が世代を越えて渡されるアーチを象徴し、家業と永続を司ります\n\n• 正位置の核心は蓄積が体系となり、家や事業の長期的安定を得ること。逆位置では遺産のもつれ、基盤の動揺、継承の断絶に傾きます',
  },
  74: {
    zh: '• 宫廷牌·侍从级，元素为土，象征土元素的求知幼苗，主学习与务实\n\n• 正位核心是踏实吸收新知识、练基本功；逆位则偏向懒散拖延、缺乏专注或好高骛远',
    en: '• Court card, Page rank, Element: Earth — the studious sprout of earth energy, governing learning and practicality\n\n• Upright core: steadily absorbing knowledge, drilling fundamentals; reversed leans into lazy procrastination, lack of focus, or aiming above one\u2019s reach',
    ja: '• 宮廷カードのペイジ、元素は土、土の元素の学習する芽を象徴し、学習と実務を司ります\n\n• 正位置の核心は着実に新しい知識を吸収し、基本を鍛えること。逆位置では怠惰な先延ばし、集中力の欠如、身の丈を超えた望みに傾きます',
  },
  75: {
    zh: '• 宫廷牌·骑士级，元素为土，象征土元素的稳步缓行，主可靠与耐力\n\n• 正位核心是慢而稳的长途行军、值得托付；逆位则偏向迟钝拖沓、顽固不变或进取心缺失',
    en: '• Court card, Knight rank, Element: Earth — steady slow march of earth energy, governing reliability and stamina\n\n• Upright core: slow-but-steady long march, worthy of trust; reversed leans into sluggish drag, stubborn immovability, or lacking drive',
    ja: '• 宮廷カードのナイト、元素は土、土の元素の着実な緩行を象徴し、信頼と持久力を司ります\n\n• 正位置の核心は遅くとも確実な長距離の行軍、任せられる存在であること。逆位置では鈍重な遅延、頑固な不動、向上心の欠如に傾きます',
  },
  76: {
    zh: '• 宫廷牌·王后级，元素为土，象征土元素的丰饶怀抱，主滋养与安全\n\n• 正位核心是以务实的关怀营造安全感与富足日常；逆位则偏向以物质代替关爱、控制家人或过度节俭',
    en: '• Court card, Queen rank, Element: Earth — the fertile embrace of earth energy, governing nurture and security\n\n• Upright core: practical care creating safety and abundant daily life; reversed leans into substituting money for love, controlling family, or excessive thrift',
    ja: '• 宮廷カードのクイーン、元素は土、土の元素の豊饒な懐を象徴し、滋養と安全を司ります\n\n• 正位置の核心は実務的な思いやりで安全感と豊かな日常を作ること。逆位置では物質で愛に代える、家族を支配する、過度の倹約に傾きます',
  },
  77: {
    zh: '• 宫廷牌·国王级，元素为土，象征土元素的财富王座，主实业与稳健\n\n• 正位核心是以商业头脑与恒心坐镇大局、慷慨而有度；逆位则偏向唯利是图、物质至上或固执吝啬',
    en: '• Court card, King rank, Element: Earth — the wealth throne of earth energy, governing enterprise and steadiness\n\n• Upright core: presiding with business acumen and perseverance, generous in measure; reversed leans into profit-only thinking, materialism, or stubborn stinginess',
    ja: '• 宮廷カードのキング、元素は土、土の元素の富の玉座を象徴し、事業と堅実を司ります\n\n• 正位置の核心は商才と忍耐で大局に座し、ほどよい寛容を持つこと。逆位置では利益一辺倒、物質至上主義、頑固なけちに傾きます',
  },
};

/** 取某张牌的三语 traits（找不到时返回 null，由调用方决定兜底策略） */
export function getCardTraits(id: number): CardTraits | null {
  return CARD_TRAITS[id] ?? null;
}
