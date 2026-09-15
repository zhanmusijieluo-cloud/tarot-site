# 星盘页 DOM 验证 / puppeteer 驱动 (tarot-site)

何时用: 爸爸报「盘面显示不对」(星座/宫头/符号/位置) 而 API 数据实测无误时 — 验证「页面实际渲染了什么」; 或要给爸爸发盘面截图; 或合盘/推运页交互回归。
注: `scripts/astro-ui-check.mjs` 只覆盖本命盘页 15 条断言, 不含合盘/推运页 — 合盘页按本文件自己驱动。

## 版本排查 (报「不对」第一步)
- 线上 mustar.vip = 推送→Vercel 部署; 推送常积压几十个提交未推 → 线上可能停得很旧, 甚至没有合盘/推运功能。
- 命令: `git log --oneline -1 origin/master` (线上对应提交) 对比本地 HEAD; `git rev-list --count origin/master..master` 看积压数。
- 线上实测: puppeteer 打开线上目标 URL 查关键按钮/功能在不在 (如「☍ 合盘」按钮); 线上 API 路由也可能 404 (`/api/astro/chart/synastry`)。
- **旧版页面上的「不对」与本地修复无关 — 先问清他「在哪个网址/哪一页看的」, 别埋头改代码。**

## 分层验证铁则
① API 数据实测 (打印全盘数值) → ② 组件源码通读 (数据→绘制映射) → ③ dump 页面实际 DOM 逐项核角度/数值。三层全对而他还说不对 → 请他**截图圈点 + 确认网址**再动手。

## 组件地图 (哪个组件画哪个视图)
- **经典线条盘 (默认)** = `src/components/astro/ChartWheel2D.tsx` — `<svg viewBox="0 0 920 920">`, SIZE=920, 圆心 (460,460)。常量: R_OUT=392 / R_SIGN_IN=348 / R_GLYPH=376 / R_HOUSE_IN=314 / R_HOUSE_NUM=331 / R_PLANET=284 / R_ASPECT=228。
  - 星座淡彩扇区 = R_SIGN_IN~R_OUT (真实星座边界, 30° 倍数); 星座符号在每座中点 `la(si*30+15)`; 宫头线 (非四轴 8 条) = R_HOUSE_IN~R_SIGN_IN; 四轴 = 更长深色辐条 (ASC 左向); 四轴角标 (ASC/IC/DSC/MC + 度分) 在盘沿外 R_OUT+15/+29。
- **3D 视图 (俯视/侧视)** = `src/components/astro/ChartWheel.tsx` (THREE canvas); 其星座带/宫头线同样过 `la()`。
- **合盘页** = `src/components/astro/SynastryResult.tsx` 包壳 (16 Tab); 单盘类 tab 直接 `<ChartWheel chart=...>` (不是 ChartWheel2D)。
- **角度映射** `lonToAngle(lon, ascLon, dir, ascPos)`(la): 黄经→屏幕角; 全盘元素 (扇区/边界/符号/宫头线/宫号) 全过同一 `la()` — 相对关系恒自洽, 「线相对星座错位」只能是数据或索引错误。

## URL 参数与 localStorage
- 本命页: `/astrology/chart?y&mo&d&h&mi&tz&lat&lng&city=` (地点三模式: `cn=省~市~区` | `cid=海外城市id` | 裸 lat+lng+tz)。
- 合盘: 加 `sync=<档案id>&stab=<tab>` — tab key: compA/compB/composite/marksA/marksB/davison/compT/compS/marksAT/marksBT/marksAS/marksBS/davT/davS/natalA/natalB。
- 动态盘: `dp=t(三限)|s(次限)|tr(行运)|sr|lr|arc` + `dpy/dpm/dpd`。
- 档案注入: localStorage `astro-archives-v1` = JSON 数组 [{id,label,birth:{year,month,day,hour,minute,timezone,latitude,longitude,city,timeKnown},note,contact,savedAt}]。
- 语言: `oracle-lang`='zh' (headless 默认英文 — 先设再 reload)。
- **顺序**: 先 goto 同源首页 → evaluate setItem → 再 goto 目标 URL (直接开目标页时 localStorage 未注入, 合盘取不到档案)。

## 驱动 / 判定
- 现成脚本: 本技能 `scripts/chart-page-probe.mjs` → 复制到项目 `scripts/` 跑 (`node scripts/chart-page-probe.mjs compS [out.png]`; 需 dev server 3000 已起)。
- 等待渲染: `svg[viewBox="0 0 920 920"]` 且 text≥10、line≥10, 再 sleep 1-2s (合盘计算需等)。
- **坑**: `<g transform>` 内的 path (符号) `getBBox()` 返回本地坐标、不含平移 — 直接对它们算半径/角度得假值 (会全「挤」到圆心附近); 要读祖先 `<g>` 的 transform 或换算。
- 角度判定 (实测通过): 线中点 θ = atan2(x−460, −(y−460)) (上=0, 顺时针; 左=270 右=90); 相邻四轴锚点间 θ 差 ×k 应=黄经差, k≈1。工作锚: compS 12 宫头线全部 k=1.000; 星座边界线落在黄经 0/30/60…。
- 截图发爸爸: `page.screenshot({path:'D:/网站/塔罗/xx.png', clip: SVG boundingRect 外扩 8px})`, 消息里 `MEDIA:` 引用。

## 排错阶梯
1. 版本 (上「版本排查」) → 2. API 数据 (python POST `localhost:3000/api/astro/chart/synastry` {birthA,birthB,settings} → `j['chart']`; 响应是 {chart:{...}} 包装) → 3. 源码通读 → 4. dump DOM 断言 → 5. 全对 → 请爸爸截图圈点+确认网址, 停止盲猜。
