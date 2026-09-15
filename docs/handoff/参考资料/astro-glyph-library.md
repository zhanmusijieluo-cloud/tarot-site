# 线条盘矢量符号库 (glyph-paths.ts)

## 为什么有这个文件

线条盘符号彻底告别 Unicode 系统字体字符（每个字形由不同字厂设计，笔画粗细天然参差，穷尽调参也无法收敛）。爸爸定案「像宫神星网站符号那样」→ 自建手绘矢量路径库。**禁止回退到逐符号字号/描边调参（SYM_TUNE 已删）。**

## 数据源

- **AstroChart** (MIT, https://github.com/AstroDraw/AstroChart, `project/src/svg.ts`): 15 个天体手绘路径 — sun/moon/mercury/venus/mars/jupiter/saturn/uranus/neptune/pluto/chiron/lilith/nnode/snode/fortune + 12 星座 (aries..pisces)。
- **手绘补 5 个** (AstroChart 没有): ceres(镰刀)/pallas(菱形十字)/juno(星芒十字)/vesta(火焰炉)/spirit(圆横线) — 简单几何线稿同风格。

## 提取方法 (改符号时用)

1. 每个方法体: `xShift/yShift` 是设计中点偏移; `d` 值由 `'m' + x + ', ' + y + '…'` 字符串拼接（**行星是 `'m'`，星座是 `'m '` 带空格** — 两个不同的正则）。多段符号 (uranus/pluto/chiron) 有 `bodyXShift`/`headXShift` 之类的二次偏移段，**shift 可能是小数** (uranus bodyYShift=14.5, pluto headXShift=-2.3) — `-?\d+` 正则会截断成整数，必须用 `-?\d+(?:\.\d+)?`。
2. fortune 是**绝对坐标** (M15.97,8 …，中心在 (8,8) 附近) — 与拼接格式不同，单独处理，且绝对坐标路径**不能**用替换 `8→x-8` 平移（负号会被正则吃掉），用 transform 平移。
3. 方法分隔: 文件行尾是 `\r` (CRLF)，`^  \}` 逐行正则匹配不到 — 用「找下一个方法签名行」切块。
4. 提取后**必须用浏览器 getBBox() 量包围盒**：每个符号在裸 SVG 里单独渲染 → `{x,y,w,h}`，中心 `cx=x+w/2, cy=y+h/2`。
5. 包围盒(boxes)是「原始坐标下墨迹框」；渲染时 `translate(锚点) scale(S) translate(-cx,-cy)`，S=目标尺寸/max(w,h)。

## 数据格式 (src/lib/astro/glyph-paths.ts)

```ts
interface GlyphDef { ds: string[]; cx: number; cy: number; w: number; h: number }
// ds: 每段一个路径字符串; (cx,cy,w,h): 原始坐标墨迹包围盒
// 渲染: transform="translate(x,y) scale(size/max(w,h)) translate(-g.cx,-g.cy)"
// fill="none" stroke=color strokeWidth=GLYPH_STROKE/s strokeLinecap=round
```

- `SYMBOL_TO_GLYPH`: 引擎符号字符 (☉☽♀…) → 库键名。
- `ZODIAC_GLYPH_NAMES`: 0=白羊 … 11=双鱼 → 库键名。

## 渲染参数 (ChartWheel2D.tsx GlyphPath)

- 统一笔画 `GLYPH_STROKE = 1.5`、行星 `GLYPH_SIZE = 24`、星座 `size=21`。
- 双层: 白底防粘 `strokeWidth=4.2/s` + 彩色层 1.5/s — **行星有白底，星座不带**（白底会吃掉淡彩扇区底色）。
- ℞ 逆行标: 独立小 text 放 `gx+14/gy+4`（路径不含 ℞）。
- 符号带边界两条参考环线已删 (R_PLANET±33/15) — 爸爸: 碍事。

## 回归锁

- 六盘 (1998京/1985沪koch/2000穗/1998京10星/整宫/等宫) × 20星全开: 跨星文字+路径重叠=0, 锚点半径Δ=0.00, 最近距≈50px (MIN_G=50)。
- 半径锚点测量: GlyphPath 外层 `<g>` 无 transform — 取 `querySelector(':scope > g > g')` 的 translate 或遍历子树找 translate；固定 -6.5 基线偏移在新字号/新路径下是错的。

## 视觉验收

- 看图服务对当前模型不可用 (vision_analyze 400 text-only) — 用墨迹像素直方图 (sharp 数非白像素/bbox 或隔离页逐符号 getBBox) 代替; 最终观感交爸爸 (MEDIA: 截图)。
- 墨迹数必须在**隔离裸 SVG 页**做，不能在合成盘上切 — 组内引线/选中圈/度分/℞ 上标污染 bbox 并集。
