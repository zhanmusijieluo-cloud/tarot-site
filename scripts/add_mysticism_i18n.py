# -*- coding: utf-8 -*-
"""向 zh/en/ja 三个 i18n 文件注入 bazi/ziwei/lenormand 页面术语数据的三语键。"""
import io, re, sys

ZH = {}; EN = {}; JA = {}

def add(d, k, v):
    if k in d: sys.exit(f"DUP KEY: {k}")
    d[k] = v

# ============ 八字 bazi ============
add(ZH,'bazi.pillar.year.name','年柱');   add(EN,'bazi.pillar.year.name','Year Pillar');  add(JA,'bazi.pillar.year.name','年柱')
add(ZH,'bazi.pillar.month.name','月柱');  add(EN,'bazi.pillar.month.name','Month Pillar');add(JA,'bazi.pillar.month.name','月柱')
add(ZH,'bazi.pillar.day.name','日柱');    add(EN,'bazi.pillar.day.name','Day Pillar');    add(JA,'bazi.pillar.day.name','日柱')
add(ZH,'bazi.pillar.hour.name','时柱');   add(EN,'bazi.pillar.hour.name','Hour Pillar');  add(JA,'bazi.pillar.hour.name','時柱')
add(ZH,'bazi.pillar.year.subject','祖辈荫德 · 早年根基'); add(EN,'bazi.pillar.year.subject','Ancestral roots · Early life foundation'); add(JA,'bazi.pillar.year.subject','祖先の加護・若年期の土台')
add(ZH,'bazi.pillar.month.subject','父母手足 · 青年运势'); add(EN,'bazi.pillar.month.subject','Parents & siblings · Young adulthood'); add(JA,'bazi.pillar.month.subject','父母きょうだい・青年期の運')
add(ZH,'bazi.pillar.day.subject','日主本我 · 婚姻宫');     add(EN,'bazi.pillar.day.subject','True self · Marriage palace');            add(JA,'bazi.pillar.day.subject','自分自身・結婚の座')
add(ZH,'bazi.pillar.hour.subject','子女晚年 · 归宿');      add(EN,'bazi.pillar.hour.subject','Children & later years · Final home');   add(JA,'bazi.pillar.hour.subject','子供と晩年・帰る場所')
add(ZH,'bazi.pillar.year.scope','社会格局'); add(EN,'bazi.pillar.year.scope','Social pattern');  add(JA,'bazi.pillar.year.scope','社会的格局')
add(ZH,'bazi.pillar.month.scope','事业提纲'); add(EN,'bazi.pillar.month.scope','Career outline'); add(JA,'bazi.pillar.month.scope','事業の骨格')
add(ZH,'bazi.pillar.day.scope','核心自我');   add(EN,'bazi.pillar.day.scope','Core self');       add(JA,'bazi.pillar.day.scope','核となる自我')
add(ZH,'bazi.pillar.hour.scope','人生归宿');   add(EN,'bazi.pillar.hour.scope','Life destination'); add(JA,'bazi.pillar.hour.scope','人生の行き着く先')

TG = [
 ('甲','Jiǎ','阳木','Tall tree · Growing upward','陽木','天に伸びる大樹・上を目指して成長'),
 ('乙','Yǐ','阴木','Vine & flowers · Soft and clinging','陰木','つる草や花・しなやかに寄り添う'),
 ('丙','Bǐng','阳火','Blazing sun · Illuminating all','陽火','太陽の炎・万物を照らす'),
 ('丁','Dīng','阴火','Candle flame · Gentle and enduring','陰火','ろうそくの火・優しく長く灯る'),
 ('戊','Wù','阳土','Mountain earth · Steady support','陽土','山の厚い土・安定して支える'),
 ('己','Jǐ','阴土','Garden soil · Nurturing growth','陰土','畑の柔らかな土・育み潤す'),
 ('庚','Gēng','阳金','Sword steel · Resolute','陽金','刀剣の鋼・剛毅で果敢'),
 ('辛','Xīn','阴金','Fine jade · Refined and delicate','陰金','珠玉の輝き・繊細で精緻'),
 ('壬','Rén','阳水','Ocean current · Ever flowing','陽水','大海の流れ・絶えず奔る'),
 ('癸','Guǐ','阴水','Rain & dew · Silent nourishing','陰水','雨露霜雪・静かに潤す'),
]
for i,(ch,py,yy,en_nature,ja_yy,ja_nature) in enumerate(TG):
    k=f'bazi.tg.{i}.yinyang'; add(ZH,k,yy[:1]); add(EN,k,'Yang' if yy.startswith('阳') else 'Yin'); add(JA,k,ja_yy)
    k=f'bazi.tg.{i}.nature'; add(ZH,k,yy[1:]); add(EN,k,en_nature); add(JA,k,ja_nature)

DZ_ANIMAL = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']
DZ_EN = ['Rat','Ox','Tiger','Rabbit','Dragon','Snake','Horse','Goat','Monkey','Rooster','Dog','Pig']
DZ_JA = ['ねずみ','うし','とら','うさぎ','たつ','へび','うま','ひつじ','さる','とり','いぬ','いのしし']
for i in range(12):
    k=f'bazi.dz.{i}.animal'
    add(ZH,k,DZ_ANIMAL[i]); add(EN,k,DZ_EN[i]); add(JA,k,DZ_JA[i])

WX = [('木','Wood','木'),('火','Fire','火'),('土','Earth','土'),('金','Metal','金'),('水','Water','水')]
for zh_w,en_w,ja_w in WX:
    add(ZH,f'bazi.wx.{zh_w}',zh_w); add(EN,f'bazi.wx.{en_w.lower()}',en_w); add(JA,f'bazi.wx.{"wood fire earth metal water".split()[WX.index((zh_w,en_w,ja_w))]}',ja_w)
# 简化：五行键统一 wood/fire/earth/metal/water
for i,name in enumerate(['木','火','土','金','水']):
    pass

SHENG=[('木燃生火','Wood feeds fire','木が燃えて火を生む'),
       ('灰烬成土','Ash becomes earth','灰が土となる'),
       ('土中藏金','Metal is mined from earth','土の中に金を蔵す'),
       ('金凝生水','Metal condenses into water','金属が凝って水を生む'),
       ('水润木生','Water nourishes wood','水が木を潤して生やす')]
KE=[('木根固土','Roots hold the earth','根が土を固める'),
    ('水来土掩','Earth dams the water','土が水をせき止める'),
    ('水能灭火','Water extinguishes fire','水が火を消す'),
    ('火可熔金','Fire melts metal','火が金を溶かす'),
    ('金可伐木','Metal carves wood','金が木を伐る')]
for i,(z,e,j) in enumerate(SHENG):
    k=f'bazi.sheng.{i}'; add(ZH,k,z); add(EN,k,e); add(JA,k,j)
for i,(z,e,j) in enumerate(KE):
    k=f'bazi.ke.{i}'; add(ZH,k,z); add(EN,k,e); add(JA,k,j)

SS=[('正印','Direct Seal','Mother · Learning · Protection','母親・学問・保護','吉','Auspicious','吉'),
    ('偏印','Indirect Seal','Unconventional wisdom · Alternative paths','偏った知恵・型破りな道','中性','Neutral','中'),
    ('正官','Direct Officer','Career · Rules · Responsibility','仕事・規則・責任','吉','Auspicious','吉'),
    ('七杀','Seven Killings','Pressure · Breakthrough · Boldness','圧力・突破・胆力','警示','Cautionary','注意'),
    ('正财','Direct Wealth','Stable income · Pragmatic','安定した収入・実務的','吉','Auspicious','吉'),
    ('偏财','Indirect Wealth','Windfalls · Generosity','意外な財・気前の良さ','中性','Neutral','中'),
    ('食神','Eating God','Talent · Enjoyment · Appetite','才能・享受・食福','吉','Auspicious','吉'),
    ('伤官','Hurting Officer','Creativity · Expressiveness','創造力・個性の発揮','警示','Cautionary','注意'),
    ('比肩','Shoulder to Shoulder','Siblings · Self-reliance','きょうだい・自立','中性','Neutral','中'),
    ('劫财','Rob Wealth','Competition · Bold spending','競争・豪快な出費','警示','Cautionary','注意')]
SS_DESC={'正印':('生我者','What generates me','我を生む者'),'偏印':('同性相生','Same-polarity generation','同じ陰陽で生ずる'),
         '正官':('克我者','What controls me','我を制する者'),'七杀':('同性相克','Same-polarity control','同じ陰陽で制す'),
         '正财':('我克者','What I control','我が制する者'),'偏财':('同性相克*','Same-polarity control','同じ陰陽で制す'),
         '食神':('我生者','What I generate','我が生む者'),'伤官':('异性相生','Cross-polarity generation','異なる陰陽で生ずる'),
         '比肩':('同我者','Same as me','我と同じ者'),'劫财':('异性同我','Cross-polarity same','陰陽違いの同類')}
for i,(nm,en_nm,en_role,ja_role,tp_zh,tp_en,tp_ja) in enumerate(SS):
    d=SS_DESC[nm][0].replace('*','')
    add(ZH,f'bazi.ss.{i}.name',nm); add(EN,f'bazi.ss.{i}.name',en_nm); add(JA,f'bazi.ss.{i}.name',nm)
    add(ZH,f'bazi.ss.{i}.desc',d);  add(EN,f'bazi.ss.{i}.desc',SS_DESC[nm][1]); add(JA,f'bazi.ss.{i}.desc',SS_DESC[nm][2])
    add(ZH,f'bazi.ss.{i}.role',en_role if False else dict(zip([s[0] for s in SS],[s[2] for s in SS]))[nm])
    # role 中文需要单独写，见下方 ROLE_ZH
ROLE_ZH=['母亲 · 学识 · 庇护','偏门智慧 · 非常规','事业 · 规则 · 责任','压力 · 突破 · 魄力',
         '稳定收入 · 务实','意外之财 · 大方','才华 · 口福 · 享受','创造力 · 张扬',
         '兄弟姐妹 · 自我','竞争 · 豪爽']
ROLE_JA=['母親・学識・守護','異端の知恵・型破り','仕事・規律・責任','圧力・突破・胆力',
         '安定収入・実直','臨時収入・気前の良さ','才能・美食・享楽','創造力・表現力',
         'きょうだい・自我','競争・豪快さ']
for i,nm in enumerate(['正印','偏印','正官','七杀','正财','偏财','食神','伤官','比肩','劫财']):
    ZH[f'bazi.ss.{i}.role']=ROLE_ZH[i]; JA[f'bazi.ss.{i}.role']=ROLE_JA[i]
    add(ZH,f'bazi.ss.{i}.type',['吉','中性','吉','警示','吉','中性','吉','警示','中性','警示'][i])
    add(EN,f'bazi.ss.{i}.type',['Auspicious','Neutral','Auspicious','Cautionary','Auspicious','Neutral','Auspicious','Cautionary','Neutral','Cautionary'][i])
    add(JA,f'bazi.ss.{i}.type',['吉','中','吉','注意','吉','中','吉','注意','中','注意'][i])

# ============ 紫微 ziwei ============
STARS=[('紫微','Ziwei','帝王气度，掌控大局，稳重尊贵','Regal presence, commands the big picture, steady and noble','王者の風格。大局を掌握し、重々しく気高い'),
 ('天机','Tianji','聪慧灵活，思虑深远，善谋略而多变动','Quick-witted, far-sighted, strategic yet restless','聡明で機転が利き、深く考え、策略に長ける'),
 ('太阳','Taiyang','光明磊落，乐于助人，精力充沛','Open-hearted, helpful, full of energy','公正明朗。人助けを好み、精力旺盛'),
 ('武曲','Wuqu','坚毅果敢，精于理财，实干型人才','Resolute and decisive, good with money, hands-on','意志堅固で決断力があり、財管理に長けた実務家'),
 ('天同','Tiantong','乐天知命，性情温和，善享福泽','Optimistic, gentle, knows how to enjoy blessings','楽天的で穏やか、福を味わうのが上手い'),
 ('廉贞','Lianzhen','魅力四射，感情丰富，兼具创造与冲动','Charismatic, passionate, creative yet impulsive','魅力あふれ、感情豊か。創造性と衝動を併せ持つ'),
 ('天府','Tianfu','宽厚稳健，善于理财，稳中求胜','Generous and steady, financially savvy, wins by stability','寛容で着実。財を蓄え、安定の中に勝機を見る'),
 ('太阴','Taiyin','心思细腻，情感丰富，善察人心','Sensitive, emotionally rich, perceptive of hearts','心が繊細で情感豊か。人の心を見抜く'),
 ('贪狼','Tanlang','多才多艺，长袖善舞，欲望旺盛','Versatile, socially adept, strong desires','多才多芸で社交的、欲も強い'),
 ('巨门','Jumen','心思缜密，善辩善察，适合研究分析','Meticulous, eloquent and observant, born analyst','綿密で弁舌さわやか、分析・研究に向く'),
 ('天相','Tianxiang','公正无私，善于协调，人缘佳','Fair-minded, a natural mediator, well liked','公正無私。調整力があり人望が厚い'),
 ('天梁','Tianliang','正直清高，乐于助人，坚守原则','Upright and principled, glad to help others','正直で気高い。助人を喜び、原則を守る'),
 ('七杀','Qisha','敢闯敢拼，行事果断，一生多波折','Bold and daring, decisive, a life of many turns','果敢に行動し決断力があるが、波乱の人生'),
 ('破军','Pojun','敢于创新，不畏改变，破旧立新','Innovative, unafraid of change, breaks to build','革新を恐れず、旧を破って新を立てる')]
for i,(pinyin,en_t,ja_t) in enumerate([(s[1],s[2],s[3]) for s in STARS]):
    pass  # trait 在下方统一注入
for i,s in enumerate(STARS):
    add(ZH,f'ziwei.star.{i}.trait',s[2]); add(EN,f'ziwei.star.{i}.trait',s[3]); add(JA,f'ziwei.star.{i}.trait',s[4])
STAR_ROLE_ZH=['帝王 · 领导 · 权威','智慧 · 谋略 · 变动','光明 · 博爱 · 付出','财星 · 刚毅 · 决断',
 '福星 · 温和 · 享受','桃花 · 刚烈 · 创造','财库 · 包容 · 守成','温柔 · 细腻 · 内敛',
 '欲望 · 交际 · 多元','口舌 · 洞察 · 研究','辅佐 · 协调 · 贵气','荫护 · 清高 · 原则',
 '魄力 · 决断 · 风险','革新 · 破旧 · 变动']
STAR_ROLE_EN=['Authority · Leadership · Power','Wisdom · Strategy · Change','Light · Generosity · Devotion','Wealth · Grit · Decision',
 'Fortune · Gentleness · Ease','Charm · Intensity · Creation','Treasury · Tolerance · Preservation','Tenderness · Subtlety · Depth',
 'Desire · Charm · Variety','Debate · Insight · Research','Support · Mediation · Grace','Shelter · Integrity · Principle',
 'Boldness · Decision · Risk','Reform · Disruption · Change']
STAR_ROLE_JA=['帝王・指導・権威','知恵・謀略・変動','光明・博愛・奉仕','財星・剛毅・決断',
 '福星・温和・享受','桃花・剛烈・創造','財庫・包容・守成','温柔・繊細・内敛',
 '欲望・交際・多元','口舌・洞察・研究','補佐・協調・気品','蔭護・清高・原則',
 '胆力・決断・冒険','革新・破旧・変動']
for i in range(14):
    add(ZH,f'ziwei.star.{i}.role',STAR_ROLE_ZH[i]); add(EN,f'ziwei.star.{i}.role',STAR_ROLE_EN[i]); add(JA,f'ziwei.star.{i}.role',STAR_ROLE_JA[i])

PAL=[('命宫','Self · Nature · Life direction','自己・本性・人生の方向'),
 ('兄弟宫','Siblings · Peers · Cooperation','兄弟姉妹・同輩・協力'),
 ('夫妻宫','Partner · Marriage · Love','配偶者・結婚・愛情'),
 ('子女宫','Children · Juniors · Creativity','子供・部下・創造'),
 ('财帛宫','Wealth · How you earn','財運・稼ぎ方'),
 ('疾厄宫','Health · Constitution','健康・体質・内面'),
 ('迁移宫','Travel · Opportunities · Networks','外出・機会・人間関係'),
 ('交友宫','Friends · Teams · Social life','友人・部下・社交'),
 ('官禄宫','Career · Achievement · Duty','仕事・成就・責任'),
 ('田宅宫','Home · Property · Savings','家宅・不動産・貯え'),
 ('福德宫','Spirit · Fortune · Enjoyment','精神・福報・享受'),
 ('父母宫','Elders · Mentors · Origins','長上・貴人・根源')]
for i,(zh_n,en_d,ja_d) in enumerate(PAL):
    en_names=['Life Palace','Sibling Palace','Spouse Palace','Children Palace','Wealth Palace','Health Palace',
              'Travel Palace','Friend Palace','Career Palace','Property Palace','Fortune Palace','Parent Palace']
    ja_names=['命宮','兄弟宮','夫妻宮','子女性','病厄宮','移遷宮','友交宮','官禄宮','田宅宮','福徳宮','父母宮']
    ja_names=['命宮','兄弟宮','夫妻宮','子女宮','財帛宮','病厄宮','遷移宮','交友宮','官祿宮','田宅宮','福徳宮','父母宮']
    add(ZH,f'ziwei.palace.{i}.name',zh_n); add(EN,f'ziwei.palace.{i}.name',en_names[i]); add(JA,f'ziwei.palace.{i}.name',ja_names[i])
    add(ZH,f'ziwei.palace.{i}.desc',PAL[i][1].replace('How you earn','赚钱方式') if False else {'命宫':'自我 · 本性 · 人生方向','兄弟宫':'手足 · 同辈 · 协作','夫妻宫':'伴侣 · 婚姻 · 感情','子女宫':'子女 · 下属 · 创造','财帛宫':'财富 · 赚钱方式','疾厄宫':'健康 · 体质 · 内在','迁移宫':'外出 · 机遇 · 人际','交友宫':'朋友 · 部属 · 社交','官禄宫':'事业 · 成就 · 责任','田宅宫':'家宅 · 不动产 · 财库','福德宫':'精神 · 福报 · 享受','父母宫':'长辈 · 贵人 · 源头'}[zh_n])
    add(EN,f'ziwei.palace.{i}.desc',en_d); add(JA,f'ziwei.palace.{i}.desc',ja_d)

SH=[('化禄','Prosperity · Flow · Resources flow in','財禄・順風・資源の流入'),
 ('化权','Power · Control · Take charge','権力・支配・主導権'),
 ('化科','Renown · Benefactors · Support','名声・貴人・助力'),
 ('化忌','Obstruction · Trial · Restraint','阻害・試練・抑制')]
SH_ZH_NATURE=['财禄 · 顺遂 · 资源流入','权力 · 掌控 · 主导','名声 · 贵人 · 助力','阻滞 · 考验 · 收敛']
SH_ZH_GUIDE=['能量进入上升期，抓住机遇，顺势而为','需要你站出来，承担更大的主动与责任','有人帮、被看见、获得外部加持','出现卡点，需修正、补短板、沉淀功课']
SH_EN_GUIDE=['Energy rises — seize opportunities and ride the momentum','Step up and take greater initiative and responsibility','Helpers appear; your work gets seen and boosted','Blockages emerge — refine, shore up weaknesses, consolidate lessons']
SH_JA_GUIDE=['運気が上昇。好機をつかみ流れに乗る','自ら進んで主体的な責任を担うとき','助けが現れ、評価され外部から後押しされる','滞りが出る。修正し弱点を補い学びを沈殿させる']
for i,(nm,en_n,ja_n) in enumerate(SH):
    add(ZH,f'ziwei.hua.{i}.nature',SH_ZH_NATURE[i]); add(EN,f'ziwei.hua.{i}.nature',en_n); add(JA,f'ziwei.hua.{i}.nature',ja_n)
    add(ZH,f'ziwei.hua.{i}.guide',SH_ZH_GUIDE[i]); add(EN,f'ziwei.hua.{i}.guide',SH_EN_GUIDE[i]); add(JA,f'ziwei.hua.{i}.guide',SH_JA_GUIDE[i])

JUGE=[('紫府同宫','Purple Star meets Treasury: wealth and honor together — a stable, noble chart','紫微と天府が同宮：富と貴を兼ねた安定した気高き格'),
 ('机月同梁','Wisdom-Moon beams: suited to public service, education and stable professions','機月同梁：公務・教育など安定した職業に適する'),
 ('杀破狼','Killer-Rebel-Wolf trio: entrepreneurial drive, thriving on change','殺破狼：起業や開拓、変革の中で力を発揮する'),
 ('阳梁昌禄','Sun-Beam-Literature-Luck: success through scholarship and official career','陽梁昌禄：学問と官途に栄える格'),
 ('火贪格','Fire meets Wolf: sudden windfalls and explosive opportunities','火貪格：思いがけない横財と爆発的な好機'),
 ('马头带箭','Horse bearing the arrow: distinction in martial or competitive fields','馬頭帯箭：武職や競争分野で名を上げる')]
JUGE_DESC_ZH=['紫微与天府同守命宫，富贵双全，稳重尊贵之格','天机、太阴、天同、天梁组合，适合公职、教育、稳定行业','七杀、破军、贪狼三曜，创业闯荡、变动开创新格局','太阳、天梁、文昌、化禄相会，文书官运亨通之格','火星与贪狼同宫，意外横财、爆发性机遇','天马逢箭，武职显贵，能征善战之象']
JUGE_NAME_EN=['Purple-Treasury Conjunction','Wisdom-Moon Quartet','Killer-Rebel-Wolf','Sun-Beam-Literature','Fire-Wolf Pattern','Arrow-Bearing Horse']
for i,(en_d,ja_d) in enumerate([(j[1],j[2]) for j in JUGE]):
    add(ZH,f'ziwei.juge.{i}.name',JUGE[i][0]); add(EN,f'ziwei.juge.{i}.name',JUGE_NAME_EN[i]); add(JA,f'ziwei.juge.{i}.name',JUGE[i][0])
    add(ZH,f'ziwei.juge.{i}.desc',JUGE_DESC_ZH[i]); add(EN,f'ziwei.juge.{i}.desc',en_d); add(JA,f'ziwei.juge.{i}.desc',ja_d)

# ============ 雷诺曼 lenormand ============
LN=[('骑手','Rider','消息 · 访客 · 新动向','News · Visitors · New moves','便り・来客・新しい動き'),
 ('三叶草','Clover','小幸运 · 短暂机会','Small luck · Fleeting chance','小さな幸運・一瞬のチャンス'),
 ('船','Ship','旅行 · 远方 · 贸易','Travel · Distance · Trade','旅・遠方・貿易'),
 ('房子','House','家庭 · 稳定 · 根基','Family · Stability · Foundations','家庭・安定・土台'),
 ('树','Tree','健康 · 成长 · 生命力','Health · Growth · Vitality','健康・成長・生命力'),
 ('云','Clouds','困惑 · 不确定 · 迷雾','Confusion · Doubt · Fog','困惑・不確実・霧'),
 ('蛇','Snake','诱惑 · 复杂 · 智慧','Temptation · Complexity · Wisdom','誘惑・複雑さ・知恵'),
 ('棺材','Coffin','结束 · 停滞 · 转化','Endings · Stagnation · Transformation','終わり・停滞・転換'),
 ('花束','Bouquet','礼物 · 欣赏 · 美好','Gifts · Appreciation · Beauty','贈り物・感謝・美しさ'),
 ('镰刀','Scythe','切割 · 决断 · 突袭','Cutting · Decision · Sudden strikes','切断・決断・不意打ち'),
 ('鞭子','Whip','争执 · 重复 · 竞争','Conflict · Repetition · Rivalry','争い・反復・競争'),
 ('鸟','Birds','交谈 · 忧虑 · 沟通','Talk · Worry · Communication','会話・不安・コミュニケーション'),
 ('孩子','Child','纯真 · 新的开始 · 小事','Innocence · New starts · Small matters','純真・新しい始まり・小さな事'),
 ('狐狸','Fox','职场 · 机敏 · 防骗','Work · Cunning · Self-protection','職場・機転・欺きへの警戒'),
 ('熊','Bear','力量 · 财富 · 守护者','Strength · Wealth · Protector','力・富・守護者'),
 ('星','Star','希望 · 指引 · 灵感','Hope · Guidance · Inspiration','希望・導き・インスピレーション'),
 ('鹳','Stork','转变 · 搬迁 · 更新','Change · Relocation · Renewal','転機・引っ越し・更新'),
 ('狗','Dog','忠诚 · 朋友 · 信任','Loyalty · Friendship · Trust','忠誠・友情・信頼'),
 ('塔','Tower','机构 · 孤立 · 界限','Institutions · Isolation · Boundaries','組織・孤立・境界'),
 ('公园','Park','社交 · 公共 · 聚会','Society · Public · Gatherings','社交・公共・集まり'),
 ('山','Mountain','阻碍 · 挑战 · 考验','Obstacles · Challenges · Trials','障害・挑戦・試練'),
 ('十字路口','Crossroad','选择 · 分岔 · 抉择','Choices · Forks · Decisions','選択・分岐・意思決定'),
 ('老鼠','Mice','损耗 · 焦虑 · 侵蚀','Loss · Anxiety · Erosion','損失・不安・蝕み'),
 ('心','Heart','爱情 · 情感 · 亲密','Love · Emotion · Intimacy','愛・感情・親密さ'),
 ('戒指','Ring','承诺 · 契约 · 循环','Commitment · Contracts · Cycles','約束・契約・循環'),
 ('书','Book','知识 · 秘密 · 学习','Knowledge · Secrets · Learning','知識・秘密・学び'),
 ('信','Letter','文件 · 消息 · 沟通','Documents · Messages · Contact','書類・メッセージ・連絡'),
 ('男人','Man','男性 · 当事人 · 行动者','A man · The seeker · Doer','男性・当事者・行動者'),
 ('女人','Woman','女性 · 当事人 · 感知者','A woman · The seeker · Perceiver','女性・当事者・感受者'),
 ('百合','Lily','成熟 · 平和 · 美德','Maturity · Peace · Virtue','成熟・平和・美徳'),
 ('太阳','Sun','成功 · 活力 · 光明','Success · Energy · Light','成功・活力・光'),
 ('月亮','Moon','情绪 · 直觉 · 声誉','Emotion · Intuition · Recognition','感情・直観・評判'),
 ('钥匙','Key','解决 · 关键 · 开启','Solution · Answer · Opening','解決・鍵・開花'),
 ('鱼','Fish','财富 · 生意 · 流动','Wealth · Business · Flow','富・商売・流れ'),
 ('锚','Anchor','稳定 · 坚持 · 归宿','Stability · Persistence · Home','安定・持続・安住の地'),
 ('十字','Cross','考验 · 使命 · 负担','Trials · Destiny · Burden','試練・使命・負担')]
for i,(nm,en_nm,zh_kw,en_kw,ja_kw) in enumerate(LN):
    add(ZH,f'ln.{i}.name',nm); add(EN,f'ln.{i}.name',en_nm); add(JA,f'ln.{i}.name',nm)
    add(ZH,f'ln.{i}.kw',zh_kw); add(EN,f'ln.{i}.kw',en_kw); add(JA,f'ln.{i}.kw',ja_kw)

# ===== 注入到文件 =====
def inject(path, d, varname):
    with io.open(path,'r',encoding='utf-8') as f:
        src=f.read()
    lines=''.join(f"  {k!r}: {v!r},\n" for k,v in sorted(d.items()))
    marker=f"}};\n\nexport default {varname};"
    assert marker in src, f"marker not found in {path}"
    src=src.replace(marker, lines+marker)
    with io.open(path,'w',encoding='utf-8',newline='\n') as f:
        f.write(src)
    print(f"{path}: +{len(d)} keys")

inject('src/i18n/zh.ts', ZH, 'zh')
inject('src/i18n/en.ts', EN, 'en')
inject('src/i18n/ja.ts', JA, 'ja')
print(f"counts: zh={len(ZH)} en={len(EN)} ja={len(JA)}")
