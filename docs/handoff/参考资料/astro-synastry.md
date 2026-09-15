# 合盘系统 (Synastry) — 16 盘 Tab 体系

## 爸爸定序 (16 Tab, 逐字照搬, 不得重排)
比较盘A · 比较盘B · 组合盘 · 马盘A · 马盘B · 时空盘 · 组合三限 · 组合次限 · 马盘A三限 · 马盘B三限 · 马盘A次限 · 马盘B次限 · 时空三限 · 时空次限 · 本命盘A · 本命盘B
- **16 盘全部落地** (占位与 TODO_NOTE 已全删; SINGLE_TABS 数组泛化渲染, 加盘 = 引擎字段 + chartMap/TABS 条目). 后 10 个的算法口径:
  - **马盘A/B** = `marksBirth(self, other)` = 一方的时间(年月日时) + 对方的出生地点(经纬/时区/city) 组装 BirthData → castNatalChart. 验证锚: 马盘A 太阳=主盘同刻太阳 (330.21°), ASC 随地点变 — 爸爸拿宫神星核过口再细调.
  - **组合三限/次限** = `castComposite(a, b, settings, {a: progOf(birthA,mode), b: progOf(birthB,mode), arc: compArc(mode), mode})` — 行星=双方各自推运后取中点; **轴参与推运** (组合轴+太阳弧+校准, 已对齐测测/爱星盘 — 公式见「对拍测测/爱星盘」节).
  - **时空三限/次限、马盘A/B三限次限** = `progChart(base盘, baseBirth, mode)` — 对中点盘直接推运; `chartFromPlanets(base, planets, settings, axes)` 第4参传 `{asc, mc}` = 基础轴+各自太阳弧 (ASC 另加校准) → **轴随推运推进** (旧版轴定格已修); 宫位号按 base 宫头重挂、相位重算.
  - 推运目标 = 当天 new Date(); 合盘页暂无时间条 — 要加就在 todayTarget 处扩展. 推运盘行星数=7 (库只出七政); `progCache` (Map<BirthData,{secondary?,tertiary?}>) 缓存推运行星 — 轴推进与行星共用一次推运算.

## 入口与 URL
- 入口 = **盘种条最左端**「☍合盘」按钮 (与盘种之间加竖线分隔, syncId 存续时高亮; skyCornerActions 与 cornerActions 里的合盘钮均已删 — 盘下不挂) → 档案弹层 (选/删/新增, EditBirth archive 模式) → `?sync=<archiveId>&stab=<tab>`.
- 合盘视图 chrome (爸爸定标): syncId 时**盘种条 + 小屏控制行整体 `hidden`** (合盘后单盘盘种不应出现), 退出靠 Tab 条「← 退出合盘」; Tab 条字号 12px (10.5px 被嫌小); cornerActions 传 `cornerActionsNoEdit` = 无「编辑资料」(合盘时不能修改资料); page.tsx 拆 housesSettingsBlock / cornerActions / cornerActionsNoEdit 三件.
- 点任意盘种 Tab 的 onClick 必须先 `p.delete('sync'); p.delete('stab')` 再设 dp — 否则 syncId 分支优先级最高, 点盘种像没反应.
- chart 页渲染优先级: syncId > skyMode > dpMode > bandKind > natal — sync 分支必须放最前.
- 「← 退出合盘」= 删 sync+stab 两参数; 档案查找走 loadArchivesSmart (云端 id 是 uuid).

## 引擎 (dynamic.ts castSynastry)
- `castSynastry(birthA, birthB, settings)` → {a, b, crossAspects, warnings}; a/b 各为完整 NatalChart.
- 跨盘相位: A 表+B 表合并喂 calculateAspects 再筛'一有一无'跨组 (同 selfCrossAspects 模式, 不用库的窄口径); **两端都带后缀**: A 端 '·A', B 端 '·B'; 同样补 actualAngle + applying 自算.
- API: POST /api/astro/chart/synastry {birthA, birthB, settings} — 独立 route, 自带 parseSettings 白名单拷贝 (dynamic route 的函数不跨 route 复用).
- 组合盘 `castComposite(a, b, settings)` (dynamic.ts): 行星按 name 配对取**短弧中点** `midArc(x,y) = x + Δ/2` (Δ=norm(y−x), >180° 时 −360°; speed=0); ASC/MC 各取中点; 宫头 = 双方对应宫头逐宫取短弧中点 `midArc(a.cusps[i], b.cusps[i])` (行业口径; 旧法「自中点 ASC 起四轴三等分」已废; 缺真宫头数据退等宫兜底), 行星 house 号按新宫头重挂; 相位 = 站内 calculateAspects (行星+ASC/DSC/MC/IC), applying=null; 返回体对齐 NatalChart 形状 (input/settings/jd 借 A 的, 其余花活字段空 — 渲染只吃 planets/angles/cusps/aspects).
- 时空盘 `davisonBirth(birthA, birthB)`: 两出生 UTC 毫秒均值 (Date.UTC(y, mo−1, d, h−tz, mi)) + 经纬均值 + tz=Math.round(lngMid/15) → 得到普通 BirthData, 直接 castNatalChart 排真实星空.
- castSynastry 返回 {a, b, crossAspects, composite, davisonChart, davisonInput, warnings} — 一次算全, synastry route 不用改 (整个 chart 序列化返回).

## 端后缀与环名映射约定 (关键 — 复用于所有合盘面; 环身份修复后的 FINAL 形态)
- **行业惯例内环 (爸爸定): 比较盘A = 档案方(B)内环/主盘(A)外环; 比较盘B 反之** (他对照别家软件: 「别家的比较盘A=我们的比较盘B」). SynastryResult 顶层 `inner = cur==='compA' ? b : a` (dualRing/duoCard 标注用), 分支 innerC=inner/outerC=outer; **交换环位时三层同改: 顶层 inner/outer (dualRing 渲染) + mapEnd 映射 + duoCard A·内/外标注** — 只改一层则环渲染/弹窗全反.
- 统一后缀类 = `/·(?:[APTRB]|in|out)$/` (P推运/T行运/R返照/A·B端 + in/out环标记 一起剥); 4 站点: ChartWheel(nmS, baseOf), ChartWheel2D(stripRing, nmStrip). 少收一个字母 = 全线静默断 (见 SKILL.md [APTR] 事故).
- **环名映射** (爸爸抓的 bug: 点外环木星时内环同名星也亮 + 弹窗相位两端全标'外环'): 视图层把 cross 端名 ·A/·B 映射成环名 ·in/·out — SynastryResult 的 `mapEnd(e)`: 按当前 tab 判该端是内是外 (compA: ·A→·out, ·B→·in — A 在外; compB 相反); `crossMapped = syn.crossAspects.map(x => ({...x, a: mapEnd(x.a), b: mapEnd(x.b)}))`; **viewChart 基于 outerC** = `{...outerC, planets: outerC.planets, aspects: crossMapped, extraPoints: ptsOf(innerC)}`; dualRing = {inner: innerC.planets, outer: outerC.planets} (innerC/outerC 按 tab 互换). 旧「compA/compB 共用同一映射」已废 — 内外互换时盘基与 extraPoints 都必须跟着换.
- ChartWheel2D angOf 分流: **'·in' (兼容 '·A')** → 查 extraPoints (内环表); '·out' → 剥后缀 → glyphs/chart.planets (外环盘); 四轴兜底按 **bare** 匹配 (n='ASC·out' 时 `n==='ASC'` 不成立 → 弦线静默丢轴端).
- renderRing 环身份: `ringName = kind==='in' ? name+'·in' : kind==='out' ? name+'·out' : name`; isSel 与 onSelect 全走 ringName (点外环只选中外环, 不再双亮); relatedSel 用端名解析 (弦端=环名); `<g data-ring data-name>` 属性供测试精确点击.
- 弦高亮 rel(): 先精确 `a.a===selected||a.b===selected`, 再回退 stripRing 后 base 匹配 (兼容单环 dyn 的 '·P' 端).
- 弹窗 (PlanetDetail) 新增 `sel` prop (= 当前 selected 原串): selRing 存在 → myAspects 过滤 `a.a===selRing||a.b===selRing` (只列该环); 行端标注: 端名 endsWith('·in')→内环 / '·out'→外环 / 退回 isProgName 逻辑 (dual) 或 '推' (single).
- ChartWheel: selPlanet 与快捷按钮比较全走 baseOf (剥环标记); dual 时快捷按钮默认选中 '·in'. **selPlanet 双环时必须按环取星**: '·in'→dualRing.inner.find / '·out'→dualRing.outer.find / 无环标记才退回 chart.planets — 否则点内环月亮弹出外环同名月亮 (爸爸抓: 6宫处女月亮显示8宫信息).
- **弹窗落宫 (houseShown)**: dual 且 chart.cusps 齐时按盘面 cusps 逐宫区间重算 — 盘上画在 6 宫弹窗就说 6 宫 (该星自己盘的宫位只在单盘模式用).
- ptsOf(c) = planets 经度表 + ASC/DSC=ASC+180/MC/IC=MC+180; 合盘固定双环 (不传 onDualToggle/单双环按钮, 不启用双击).

## 组件 (SynastryResult.tsx)
- 16 Tab 条最左「← 退出合盘」; 左上双人卡 (A·内 / B·外 + 日期), cornerActions 照挂; 警告区渲染 syn.warnings 逐条.
- 比较相位表 (CrossTable): 排序 BODY_IMP(端星)降 → 相位序 → orb; 行 = 符号+A端标+相位符号+符号+B端标 + orb° + 实际° + 入/出; 端标由 `end.endsWith('·A')` 判断查哪张盘取符号 (AX_SYM 兑底 ASC/DSC/MC/IC).
- natalA/B + 组合盘 + 时空盘 = **同一个渲染分支** (条件数组含 'composite','davison'; 盘/标题/sub/相位表标题由 tab 决定: 「组合盘相位」/「时空盘相位」) — 加单盘类 tab 扩条件数组, 不复制分支; SynData 现含 composite/davisonChart; 占位条件同步收窄 (4→6 实现).
- BODY_IMP/ASPECT_ORDER/AX_SYM 是组件本地拷贝表 (与 ChartWheel.tsx 同值) — 改值两边同步.

## 对拍测测/爱星盘 (组合推运反解 — 轴公式已锁定)
- **铁则: 先核输入端再攻算法** — 对不上时先在参考软件里打开其档案/资料页截图 → OCR 日期/时间/地点/时区, 与本地 fixture 逐字段核对; 输入端不一致会伪装成算法问题。跨 App 比对先对齐「推运时间戳」(两 App 各自显示, 可差近 1 小时 ≈ 零点几度)。
- **对拍测试盘 (正本)**: 木木 1998-2-19 09:45 蓬安 × 老姐 1993-5-29 09:50 蓬安 (均 106°25′E 31°02′N GMT+8)。老姐出生地曾误记成北京, 致组合推运全部对不上 — 对拍一律用这两组。
- **已确认**: 组合盘(行星+四轴)=短弧中点法 — 同输入下我们 Asc 与爱星盘差 0.01° (双子 8.84° vs 8°51′)。旧判断「爱星盘用第三套算法」是输入端差异造成的假象, 已推翻。
- **组合推运轴公式 = 已锁定 (两年双验, 已实现)**: **ASC = 组合盘 ASC + 组合太阳弧 + 校准量** (校准: 次限 +2.1° / 三限 −2.0°, 经验值待理论化 → 源码 `PROG_AXIS_CORR` 表); **MC = 组合盘 MC + 组合太阳弧** (不加校准)。组合太阳弧 = 双方推运太阳中点 − 双方本命太阳中点。实测: 组合次限 ASC 巨蟹 11.16° vs 爱星盘 11.15° (差 0.01°), 次年同盘差 0.12°; 组合三限 ASC 巨蟹 23.38° vs 测测 23.35° (差 0.03°)。
  - **轴速度 ≈ 1°00′/年** (太阳弧速度) — 每条「换一年再截图」即一个独立数据点, 两点锁斜率 (次限靠 2026+2027 两年对照定案)。
  - **时空/马盘推运轴** (davS/davT/marksAS/AT/BS/BT): 同口径已实现 (各自轴+各自太阳弧+同校准表), **尚无爱星盘对照图** → 待图校准。
  - **实现位置**: dynamic.ts — `PROG_AXIS_CORR` + `castComposite(…, {arc, mode})` (组合两盘) + `chartFromPlanets(…, axes)` (六盘) + `progCache`。
  - **已排除、勿再试**: 「各自推运盘 ASC 短弧中点」及对轴变体 (次限差 44°/136°)、参考地点法、Astrolog 各路径 (对组合盘推运 -p 与位置文件读回均 no-op)、开源库无组合推运实现 — 对拍只能靠测测/爱星盘截图。
  - **宫头随轴同步推进 (已实现, 两年双验)**: 推运盘 12 宫头 = 本命盘宫头 + 太阳弧 + 逐宫修正表 `PROG_CUSP_CORR` ([2.11, -0.85, -1.09, -0.14, 0.89, 2.73, 2.11, -0.50, -0.79, -0.14, 1.26, 3.04], 反解自爱星盘组合次限两年截图), 四轴强制锚定 1/4/7/10 = ASC/IC/DSC/MC。实测: 组合次限 12 宫头全对 (max 残差 0.37°); 组合三限中间宫头无独立对照 (扫描图面在像素噪声 ±2° 内与表版一致) → 两模式共用同表。**反解数据/像素扫描法/敏感度见 `references/prog-cusp-reverse-engineering.md`**。
- **锁公式门槛**: 反解公式须 ≥2 个独立数据点 (不同推运时间/不同盘种) 交叉命中后才写进引擎 — 单点命中 ≠ 公式正确 (次限就不服从三限的候选式)。
- **对拍目标值**: 组合盘 Asc 爱星盘=双子 8°51′; 组合次限 Asc 测测=巨蟹 10°54′ / 爱星盘=巨蟹 11°09′ (2026 推运) 与 巨蟹 12°09′ (2027 推运, 18:06); 组合三限 Asc 测测=巨蟹 23°21′ / 爱星盘=巨蟹 23°39′。
- **全盘 ASC 快诊 probe**: POST `/api/astro/chart/synastry` → 打印 `chart` 下全盘 `angles.ascendant` 一览。多个推运盘与各自基础盘同值 = 「轴定格」; 推运目标=当天日期, 锚值随日期漂移 (轴 ≈1°/年), 跨软件对照必须对齐推运时间戳。

## 实测基线 (可当回归锚)
- **轴修复回归** (木木×老姐 fixture, 推运=当天): compS/compT ASC ≈ 巨蟹 (2026 实测 11.16°/23.38°); 轴定格 bug 的特征 = compS/compT/composite 三盘 ASC 同值 (旧为双子 8.85°) — 一条 probe 即可判。
- 1998-02-19 09:50 北京(爸爸) × 1990-05-12 14:30 上海: **57 条跨盘相位**; 弹层选档案→合盘页 16 Tab 渲染/切换全通; 合盘弹窗标注 = 端名 endsWith '·in'/'·out' 判内/外环 (见环名映射); 组合盘/时空盘 tab 出盘 ✓.
- 组合盘锚 (1998 木木 × 1995 北京): 太阳 A 330.21° / B 83.71° → 组合盘 26.96° (短弧中点手算一一吻合); 时空盘锚: 1996-10-17 11:07 · 35.46N / 111.41E · tz7 → ASC 271.03° — 均可当回归数字.
- **16 盘字段回归锚**: castSynastry 返回体应含 a/b/composite/davisonChart/davisonInput/marksA/marksB/compS/compT/marksAS/marksAT/marksBS/marksBT/davS/davT — 一条 node fetch 扫全字段 (行星数/ASC/相位数) = 全盘体检; 木木×老姐: compA 内环月亮=老姐处女11.8°/6宫, 外环=木木天蝎23.8°/8宫; compB 反向.
- 验证脚本模式: localStorage 预置 `astro-archives-v1` 一条测试档 → 进 `dp=sky` 页 → 点合盘→点档案→断言 URL sync/stab + Tab 数 + 表行数.
- **环选中回归配方** (每次动后缀/环逻辑后必跑): `document.querySelector('g[data-ring="out"][data-name="Jupiter"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))` → 断言 ①选中圈 (circle r=12/13.5) 恰好 1 个; ②弹窗行端标逐行 外环×内环 (无 外环×外环); ③弦 opacity 桶 有亮(0.95)有淡(0.06); 再点 'in'-Jupiter → 切内环视角; 另加 `svg line[opacity="0.38"]` 弦数 > 0. 锚: 木木(1998-02-19 蓬安) × 老姐(1993) = 70 弦, 点木星 4 亮/66 淡. 按钮文字带字距 ('排 占 星 盘') — 选择器统一 replace(/\s/g,'') 后再比对.
