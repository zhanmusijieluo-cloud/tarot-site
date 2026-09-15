# 宫制引擎对拍与扩容 (2026-09-15, 提交 fa563e5)

## 现有 16 宫制全景 (chart.ts HOUSE_SYSTEM_LIST)
- celestine 原生 7 制: placidus/koch/equal/whole-sign/porphyry/regiomontanus/campanus (对拍 SE ≤0.004°)
- 自算 9 制 (译自 SE 官方 swehouse.c): morinus(赤经等分!非黄道)/vettius(卦限三分,SE无)/alcabitiuses/sripati/pullen(SD)/polich-page(topocentric同款 Asc1公式)/krusinski/carter/vehlow

## 对拍方法 (裁判 = Swiss Ephemeris, 行业公器非某网站私货)
1. `uv pip install --system pyswisseph` + `swe.houses(jd, lat, lng, b'B')` 字母码: A=equal B=alcabitius C=campanus F=carter K=koch L=pullen M=morinus O=porphyry P=placidus R=regiomontanus S=sripati T=topocentric U=krusinski V=vehlow W=whole
2. 源码: raw.githubusercontent.com/aloistr/swisseph/master/swehouse.c (Asc1/Asc2=极高度大圆交点; 4-9宫=10-3宫+180 通用尾处理; swe_cotrans 在 swephlib.c: x[2]强制=1, y'=y·c+z·s; z'=-y·s+z·c)
3. 对拍脚本: Temp/cmp_houses.py(celestine原生) + Temp/cmp_new.py(自算) — 3出生数据×全宫制, >0.05°即乱排

## 血泪坑 (每条都实际踩过)
- **Morinus 不是黄道等分**: 官方=赤经等分投影(cusp[i]=ecl(RAMC+(i+3)·30)), 用黄道等分会错 7.7°
- **swe_cotrans 链条丢纬度分量 = 错 5.6°**: Krusinski A3 必须传 A1 的纬度(6.59°), B3 必须传 B1 的 lat(-30°) — 每个变换都是 3D 旋转不是平面映射
- **卡特 C10 ≠ MC**: 官方循环含 i=10, C10=ASC赤经+270°的投影点 (赤经圈投影 atand(tand(ra)/cos ε))
- **Pullen SD 极圈**: acmc<0 时返回 null → 主流程降级波菲里+警告 (SE 同款行为)
- 阿卡比特高纬(69.6°)仍可算(宫宽 18°~44° 非 30° 但序列合法), 与 SE 一致, 不需降级

## 接入点清单 (加新宫制必改 6 处)
chart.ts(类型+LIST+cuspsFor+selfHouseCusps+主流程 SELF_SET+celestine 传参白名单) / chart-url.ts(SYS) / api/chart/route.ts / api/chart/synastry/route.ts / api/chart/dynamic/route.ts / NatalForm.tsx(HOUSE_SYSTEMS 下拉)

# 相位网格/列表 UI 铁律 (爸爸 2026-09-15 反馈)

- 网格: 右上三角空白格不渲染(阶梯形, 连边框都不画); 对角格符号**居中正立**(不旋转字形/不画斜线)。
- **列表与网格严格同源**: 用 aspectMatrixPoints(chart) (十大+四轴) 过滤相位 — 开多星体(小行星/虚点)时列表不得多出网格没画的分组; 重要度表 ASPECT_IMP 单一来源导出。
- 列表: 一行紧凑 — 按钮 w-fit (非 w-full), 数字紧跟相位名 (**禁 ml-auto 推到行尾**); 分组顺序=网格行序, **flex 列式分列(禁 CSS multi-column: height 锁定下 column-fill:auto 会溢出裁切、balance 会摊成半高两列)**, 行高实测 33px+组开销 24px 精算, 列高≤网格高(nGrid×42), 排满自动开新列不限列数, 组不切断。
- 行格式: `⚹ ☽–♀ 六合 57°53′ ±2°07′S` (实际夹角+偏差精确到分+入/出相; 合相 actualAngle≈orb 时不重复显示夹角)。
- 稳定选择器: 矩阵 `table[data-testid="aspect-matrix"]`、列表 `[data-testid="aspect-list"]` (UI 检查脚本依赖; 结构变了要同步 astro-ui-check.mjs)。
- 截图小符号易误读(♂读成"南纬"), 布局问题优先用 puppeteer DOM 几何断言, 勿依赖 vision。

# 相位清单行格式铁律 (爸爸 2026-09-15, 提交 228ef14)

- **合盘清单 (SynastryResult AspectList)**: 行序=本方星符号(A/B) → 相位符号 → **实际夹角(紧跟, 间距≈4px)** → ±容许度 → 入/出 → · → 对方星符号(A/B)。**度数与相位符号之间禁插任何元素、禁 ml-auto 推远** (旧版夹角被对方星挤到43px外+数字堆行尾=爸爸批评)。
- **本命清单 (ChartResult)**: 相位符号 → ☉–☿对名 → 相位名 → 实际夹角  ±偏差 A/S (数字紧跟相位名, 已是定稿勿动)。
- 验收脚本: scripts/_syn_rows_test.mjs (localStorage 塞 test-laosh 档案→ sync=test-laosh&stab=compA, 逐 span 量 x 间距断言「相位符号右缘→度数」<10px)。

# 盘面相位线铁律 (爸爸 2026-09-15 定稿, 上单 ed3b6e9 误删2D已由 dbe0e5c 还原)

- **只有 3D 盘(俯视 Top/侧视 Side)不画相位线; 所有 2D 线条盘(classic)必须保留四色相位弦线+选中高亮联动** — 爸爸原话「我的所有线条盘相位要有，只是不要3D盘中的相位线」。删线条类 UI 需求先问清只删哪个视图, 别扩大化。
- 3D 删改点: ChartWheel 场景 `for (const asp of aspects)` 建线块已删 (高亮循环保留=遍历空数组零开销); 随之孤立的 AXIS_ANCHOR/ASP_Y/aspectNum 已清。相位信息另有: 行星弹窗「与它相关的相位」、清单、网格。
- 弦线断言: classic 盘 transition 样式 line≈19(默认档案)>0; 选中 Sun → 高亮(opacity>0.9)=3 条、压暗(<0.1)=16。测试无中文 cookie 弹窗显英文 ITS ASPECTS, 别误判丢失。

# Tailwind v4 扫描铁坑 (爸爸2026-09-15反馈的重复按钮根因)

- **类名必须是被空格隔开的完整字面量**: 模板串里 `lg:hidden${x ? ' hidden' : ''}` 因 lg:hidden 紧贴 `${` → Tailwind 扫描器当未知词跳过 → 该工具类根本没生成 → 大屏该隐藏的顶栏按钮组永不消失(和卡下方一组重复)。改成 `${x ? 'hidden' : 'lg:hidden'}` 完整独立 token 即修好。
- 排查手法: 别只信页面 DOM class 列表在不在(它在), 要在浏览器 evaluate 遍历 document.styleSheets 找 @media (min-width:64rem) 里 `.lg\:hidden` 规则**是否真的生成了**; 现场注入 div.className='lg:hidden' 读 getComputedStyle().display 最快确诊(=none 才对)。
- dev 改了 class 后浏览器仍拿旧 CSS = Tailwind 扫描缓存: 需 `rm -rf .next` + 重启 npm run dev 才重扫。
- 控制行(编辑资料/宫位设置/排盘设置)设计: 大屏=嵌进盘内资料卡下方竖排(cornerActions); 小屏=顶部横排兜底(`lg:hidden` + 合盘时 `hidden`)。两处是同一组按钮的响应式两形态, 不是 bug。

# 法达外环交互规格 (爸爸 2026-09-15 对标爱星盘, 提交 93a8661; 双环终版 921b47f; **v2 测测同款 56b2384 覆盖配色/符号/年纪/角标**)

- **v2 配色/角标定稿 (仍生效)**: ① 配色**只保持一种**: 已走过=无色(淡灰), 未走过=主题玫红(#d9a8b8/paper #c25d84), 当前段再深一档+描边 — 禁多色(LORD_HEX 逐段上色废弃); ④ 四轴角标移出缩放组: 普通盘 R_OUT+15/29 不变, bandOn 盘挂 R_SUB_OUT+24/38 最外缘。
- **年纪定位法 (爸爸 v4 方案, 提交 0698efa)**: 大运环年纪不放段中央(与符号重叠), 而放**外环同主星首个小运段的中心角度**(=段头起 1/7 处, 与段中央符号天然错 14.9°–26.1°); **南北交点段不标年纪**(无子段)。断言: 逐段量 符号↔text 角距≥3°、总数=7(9−2交点)。
- **v3 符号设计修正 (爸爸点破「看不清是符号设计问题」, 提交 1e6add7)**: GlyphPath 笔画**固定1.5px是设计缺陷** — 缩到13px时笔画占身高11%+白halo=糊成一团; 改 strokePx=max(0.95, 1.5*size/24) 随尺寸等比缩, halo 同比例 2.8×笔画。环上符号**正立不旋转**(rotAt 方案废弃: 旋转后对角占宽变大斜出环界)且放大: 大运 20px/hov23, 小运 13.5px/hov16, 居环中线; 年纪「N岁」正立在环内下缘(R_MAIN_IN+12)。带宽: 小运 346–392 / 大运 306–342, kDisk=0.78 贴合。越界断言: scripts/_check_fir_overflow.py 扫环带外半径亮像素占比≈0。
- **终版布局**: 从外到里 = 小运环 → 大运环 → 盘体(缩80%) ; 总外径仍 920 viewBox 内。
- **点击只弹窗不跳转**: setBandPin 钉住浮层(浮层色也用主题单色); 浮层「跳转此时起排盘」按钮才 onBandDate; ✕/点空白关。dp=fir / dp=prof。
- 像素验证脚本: scripts/_check_fir_px.py; 双环几何/点击/弹窗断言 scripts/_fir_dual.mjs (920 SVG 要按 viewBox 选, 页面上有 icon svg 会选错; SVG 段无 .click(), 用 getPointAtLength+getScreenCTM 真鼠标坐标; React onMouseEnter 靠派发 mouseover bubbles=true 触发)。

# 旧规格 (已被上面覆盖, 留档)

- 配色单一来源: `lib/astro/lord-colors.ts` LORD_HEX (StatusTabs 表格与 ChartWheel2D 外环共用, 禁两处自定义)。
- 外环=**61 子段逐个上色** (firdariaTable 行直出, 非主段整体): fill=LORD_HEX 透明度 静0.22/当前0.45/悬停0.5~0.62; 主段界粗描边(1px)子段界细(0.5px); 跨度<1.2岁的窄段省略符号(防粘连)。
- 交互: 段 hover→高亮+盘顶浮层「主星大运·子段 起日→止日 岁数范围 点击→跳转」; 点击段→jumpToDate(page.tsx) 切行运盘 dp=tr+dpy/dpm/dpd=段起始日正午 (爱星盘同款)。
- 环上禁堆年龄小字/度数(爱星盘式密集文字=糊); 年龄只标主段界(带描边)。
- 像素验证脚本: scripts/_check_fir_px.py (环带彩色占比%, 改色前后对比 0%→62%); 悬停/点击断言 scripts/_fir_shot.mjs + _fir_click_test.mjs (SVG 段无 .click(), 真鼠标取 path.getPointAtLength+getScreenCTM 坐标; 悬停派发 mouseover bubbles=true 才触发 React onMouseEnter)。

# 推运盘宫头反解 (测测/爱星盘口径)

## 突破结论 (2026-09-14, 提交 7068941 终版) — 旧"修正表"方案已废弃!

**真盘(时空盘/马盘A/B)的推运宫头 = 「Naibod 率 RAMC 推进 + 重新起 Placidus 盘」, 不是宫头平移!** 旧公式(下文)只对组合盘家族成立。

- 公式: `新RAMC = 基础盘RAMC + 推进天数 × 0.9856473°/天 (Naibod 平均太阳赤经率)`, 然后在**原地点纬度**重新起 Placidus 盘 (MC=ecl(RAMC), ASC 由 RAMC+纬度定, 11/12/2/3 半弧迭代, 其余镜像)。推进天数: 次限=年龄岁数, 三限=岁数×13.368。
- 落码: `dynamic.ts` `recastAxes(chart, arcDeg)`; `castSynastry.advAxes` 真盘六张全走此法。
- 验证: 时空三限残差 ≤0.11° / 马盘B三限 ≤0.44° (残差 180° 成对对称 = 截图校准噪声, 非模型误差), 零校准量。
- **关键教训: 推角度要用 Naibod 平均率, 不能用太阳真位置赤经弧** — 三限长弧(28年≈380天推进)上太阳不等速, 真位置弧与平均弧差达 4.5°。马盘B三限曾因此差 4.6°, 换 Naibod 后 0.44°; 时空三限恰逢近匀速段两者皆合, 差点漏掉此坑。
- **组合盘家族 (compS/compT) 例外**: 组合盘是中点盘无真 RAMC, 仍用下方 PROG_AXIS_CORR/PROG_CUSP_CORR 修正表。
- 马盘B基础盘已验证无问题 (爱星盘 fe075d 图扫描 12 宫头全合, MC 双鱼25°23′ vs 我方 25°10′)。
- 遗留小项: 马盘B基础 ASC 我方 巨蟹9°35′ vs 爱星盘 9°46′ (差0.2°, 图面读数噪声级); 待爱星盘「马盘B基础盘」数字表截图可精确裁决。

## 旧结论 (仅组合盘家族仍用)

推运盘(组合) 12 宫头公式:

```
推运宫头[i] = 本命盘宫头[i] + 太阳弧 + PROG_CUSP_CORR[i]
```

- `PROG_CUSP_CORR = [2.11, -0.85, -1.09, -0.14, 0.89, 2.73, 2.11, -0.50, -0.79, -0.14, 1.26, 3.04]`
- 四轴强制锚定: 1/4/7/10 宫头 = ASC/IC/DSC/MC (progCusps(..., {asc, mc}))
- 轴修正 PROG_AXIS_CORR: secondary +2.1 / tertiary -2.0 (仅 ASC; MC 不加)
- 验证: 组合次限 2026+2027 两年 12 宫头 max 残差 0.37° (爱星盘截图反解)
- 次限"表版"跨年验证完胜"无表版" (0.37° vs 1.26°) — 同一软件先验=两模式同公式

## 反解方法 (从截图提取 12 宫头)

1. 宫界线颜色 = RGB(34,121,171) (爱星盘, 容差 ±35); 测测图格式不同(彩色填充), 未攻破
2. 圆心: 网格搜索使 12 簇角度直方图最锐 (2026 图 (400.5,353), 2027 图 (444.5,371), 三限图 (425,359))
3. 验证圆心: 12 簇以 180° 成对对称
4. 映射 θ→黄经: k≈1 分段线性 (相邻四轴锚点间); OCR 四轴文字校准 (RapidOCR 裁区域精读)
5. θ 定义: atan2(x-cx, -(y-cy)), 上=0 顺时针 (左=270 右=90)
6. 已知值: 组合盘 ASC 双子8.85; 次限 ASC 巨蟹11.16(2026); 三限 ASC 巨蟹23.38(2026)

## 敏感度/陷阱

- 圆心误差 ±9px → 远端宫头角度误差 ±2° (半径 ~250px) — 三限图区分不了"表/无表" (真值噪声内)
- API 序列化舍入: cusps 与 angles 独立 round 造成 0.005° 伪差异, 属正常
- 三限图 (image_91a925, 837x713) 是界面截图非纯圆盘, 圆心搜索锐度 0.031 低于次限图
- 三限图 (爱星盘) 已扫: 12 线映射 k≈1 通过; 中间宫头与表版的差异落在图面噪声 (±2°) 内 — 表版/无表版不可判定, 维持两模式共用同表; 测测三限图 (手机长图+彩色填充) 圆心搜索不出 12 簇, 不适用本扫描法 — 交叉裁决需更干净的圆盘截图
