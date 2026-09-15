# 动态盘系统实现要点 (推运/返照/天象/法达/小限)

## 盘种与 URL (chart 页)
- 盘种条 10 项: dp=''(本命)/t(三限)/s(次限)/tr(行运)/sr(日返)/lr(月返)/arc(日弧)/sky(天象)/fir(法达)/prof(小限)
- 目标日期 dpy/dpm/dpd; 天象另加 dph/dpmi (缺省=今天/当前时刻)
- 推运/返照类: POST /api/astro/chart/dynamic {birth, settings, type, target}
- 法达/小限**不走动态 API**: 本命 data 纯前端加外环; 天象=以时刻为重排一张本命盘(POST /api/astro/chart) + ChartResult `hideStatus`(藏状态区整块 Panel, 只藏内层组件会留标题)

## celestine 库坑 (dynamic.ts)
- **跨盘相位必须自算**: 库 calculateTransits / pr.aspectsToNatal 口径窄 (行运只出13条/次限1-7条)。正确法 `selfCrossAspects()`: 合并 [本命点+ASC/DSC/MC/IC] 与 [外盘名+后缀] 喂 calculateAspects, 再筛"一有一无"跨组条目 → 与本命盘同 orb 同口径 (行运→42, 次限→27/46条)
- **getPlanetaryDignity 的 Sign 枚举=数字** (Aries=0..Pisces=11): 传字符串 'Cancer' **静默返回 Peregrine**; 正确 `getPlanetaryDignity(name, si, deg)` (si=floor(lon/30))
- DignityState 枚举值 = 'Exaltation' (非 'Exalted') — 中文映射表要覆盖
- posToPlanet(raw, natal.cusps): 外盘行星按本命宫位分宫
- 推运 `castProgressionChart(birth, settings, target, mode)`: mode='secondary'|'tertiary'|'solar-arc' — **三限(tertiary)=自算分支: 1天=1 月亮月 27.321582天 (该值实为分点月 tropical month, 非恒星月 27.321661 — 勿按"恒星月"改数) (每年≈13.368天), 勿用 celestine 内置 12天/年 (差11%)**; 次限=1天=1年; 日弧=solar-arc
- 月返 `castLunarReturnChart`: 月亮回归扫描 (0.5天步长扫35天 + 二分40次)
- 日返/月返 cross 后缀 '·R', 推运 '·P', 行运 '·T'

## 视图 (DynResult / ChartWheel2D)
- 单环=外盘行星画在本命宫位圈; `viewChart = {...natal, planets: outer.planets, aspects: crossAspects, extraPoints}`
- **extraPoints 机制** (VChart.extraPoints → ChartWheel2D): 弦线 angOf(n): 原名先查 extraPoints(本命点), 带 '·P'/·T'/·R' 后缀剥后查盘上符号(外盘星); 双环时自然跨内外环
- 双环 dualRing: renderRing kind='in'(256)/'out'(300), layoutRing 环形松弛共用(弦距50px); 外环不画引线(穿内环难看)
- **四轴不与中心交叉**: 辐条两段 391→R_ASPECT(228), 内圆里不画 (爸爸: 穿心轴遮相位)
- 相位名标注: 双环 '内环/外环', 单环 '·推/本命'; 弹窗 PlanetDetail props dual 同规则
- 行星名匹配/显示一律先剥后缀 nmS() 再比较 — 否则 'Moon·P' 相关相位全漏/英文裸奔
- 弹窗相位行定稿 (爸爸: 行星用符号表示 + 要实际数据): `□ ☽内环 刑 ♀外环 5.2° 实际95.2° 入相` — 行星=符号(p.symbol / 对端 otherSym), 相位名=typeZh, 再跟实际角距+入/出相; otherSym 兜底链 = chart.planets.find → `ASPECT_SYMBOL_OF` (PLANET_SYMBOL 全表: ⊕福点 ⊖精神点 ⚷⚳⚵⚶⚸ + ASC/MC/IC — 缺兜底即英文裸奔 'Part of Spirit'); en 模式同行保留 ' (P)'/Outer/Inner
- 实际角距/入出相: `actualAngle` = 两星真实角距 0-180° (本命 chart.ts lonMap + 跨盘 dynamic.ts 都补); cross 的 applying 无库数据 → 自算 (sdiff=有符号差, rate=sign(sdiff)·(s2−s1) 度/天近似, 偏差变化方向<0=入相); 自检恒等式: 实际≈理论±orb (刑90+5.2=95.2)
- 弹窗字号档 (爸爸嫌小后放大的一档, 以后改弹窗别缩回): 标题20px/三格值14.5/相位行13.5/行星符号17/内外环标签10.5/实际·入出相11/互容行13.5

## 时间步进器 (TimeStepper) 与左上设置卡
- 爸爸定稿: 非本命盘**不挂本命资料卡** (出生信息单属本命盘) — DynResult 左上 248px 的 NatalCard 换成该盘"设置卡" = 盘种标题 + TimeStepper + 跳转 date input + 说明 + 太阳弧 + 盘面时间 + 下方三按钮(cornerActions); 原右侧列取消 → 盘区全宽; 本命盘零影响
- TimeStepper (src/components/astro/TimeStepper.tsx): ◀ yyyy-mm-dd ▶ + 单位按钮组; 单位集按盘种: transit/天象 = 年/月/日/时/分, 推运类(次限/三限/日返/月返/日弧) = 年/月/日 (时分不改推运盘, 显示纯日期); 天象页与 DynResult 共用同一组件
- 步进算法 (stepTime): 年/月步进做**月末钳制** daysInMonth (1/31+1月→2/28, 不许 Date overflow 跳到 3/3); 日/时/分用 Date.UTC setUTC*() 自动归一; 结果钳 1900-2100
- URL: dph/dpmi (缺省=当前时分); dynamic API target 收 hour/minute — **仅 castTransitChart 消费** (toJD target.hour??12), 推运类自然忽略
- page.tsx 变量声明顺序坑: dpHour/dpMin 引用 nowD → nowD 必须排在前面 (TS2448 block-scoped used before declaration); hook 区新增变量按依赖拓扑顺序插入
- **时间=访客本地** (爸爸: 别人进来就是当下时间, 可往后看也可往前看): 默认时间取浏览器本地 `new Date()` (client 端, 各访客各是各的当下); 单位行右端「今」按钮 (onNow 回调) = 清空 dpy/dpm/dpd/dph/dpmi 回当下. **跨时区正确性**: dynamic target 加 `tzOffset` (=-getTimezoneOffset()/60); castTransitChart 的 toJD 用 `target.tzOffset ?? birth.timezone`; 天象盘在 page 端先换算 (访客本地时刻 → UTC 瞬 → birth 时区钟面时间, Date.UTC 算法) 再 POST, 否则不同时区访客的"此刻天象"差几小时. 验证: puppeteer `page.emulateTimezone('America/New_York')` 进站 = 纽约当下 (与北京差 12h 分毫不差), 「今」按钮点后 URL 时间参数被删、显示回当下

## 外圈信息带 (outerBand)
- 法达环: yearA(age)=π/2−(age/75)·2π (12点=0岁顺时针); `firdariaTable(dayChart,y,m,d,1)` 主段行= sub===lord||sub===null; 子段符号=日/夜盘序从主星起轮转; 交点不细分; startAge 浮点显示要 Math.round
- 小限环: 每宫一段(cusps 实际跨度), 段内=宫头星座 SIGN_RULER 庙主单字(日月水金火木土); curAge%12+1 当前年宫高亮
- R_BAND_IN/OUT=395/444; 年龄文字放环带内缘(+14)防外缘裁切

## 福点/精神点 Aphesis (zodiacalReleasing, timing.ts)
- 已按宫神星截图逐日校准: L1=小年×360天年; L2=小年×30天"月"; 走满12座后 LB 跳 L1 对宫; L1 精确天数截断(L2末段被切)
- 6栏 主|次|起始日期; 段首(subSign===lordSign)合并单符号+元素色底; LB 金褐标记

## 验证方法
- `node scripts/astro-ui-check.mjs` (--zh / 无参=英语) 15项; 引擎 astro-chart.test.mjs / astro-reception.test.mjs
- DOM 断言优于截图(vision 不可用时): 半径集合(单环284/双环256+300)、stroke 分色计数与相位表条数对账、bbox 对齐、colSpan 中心点重合
- puppeteer-core + 本机 Edge headless; localStorage 'oracle-lang'='zh' 定语言; 临时脚本 scripts/_*.mjs 用完即删
- puppeteer toggle 陷阱: 同一颗星的快捷按钮点第二次=取消选中→弹窗关闭; 想断言弹窗的脚本要循环点击直到弹窗出现(或先清 selected), 单次点击会假报 '无弹窗'
- puppeteer 同名按钮陷阱: 导航栏与表单可能同时存在同文本按钮 (「登录/注册」在 Navbar 与登录页表单各一份) — 按 text+class 模糊匹配会先命中 Navbar 那个, 点击=跳转新页, 表单根本不提交 (表现为'点了没反应、无任何网络请求'). 提交按钮选择器要附加表单专属 class (如同时含 .w-full); 排查依据: 监听目标 API 的网络响应, 零请求 = 点错了按钮
