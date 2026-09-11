# -*- coding: utf-8 -*-
"""把 The Game of Hope 全扫描切成 36 张独立牌图
方法: 灰度阈值(卡片米黄比白背景暗) -> 形态学闭运算粘一起 -> 连通域 -> 按行优先排序 -> 裁切缩放
"""
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "scripts/ln-src/hope-full.png"
OUT = "scripts/ln-src/cards"
import os
os.makedirs(OUT, exist_ok=True)

img = Image.open(SRC).convert("L")
a = np.array(img)
print("image size:", img.size)

# 1) 阈值: 非白背景即前景
fg = a < 235
# 2) 闭运算: 把每格卡片内部空洞(白色插画留白)填上, 但不粘连邻居
fg = ndimage.binary_closing(fg, structure=np.ones((25, 25)))
fg = ndimage.binary_opening(fg, structure=np.ones((5, 5)))

# 3) 连通域
lab, n = ndimage.label(fg)
print("components:", n)
objs = ndimage.find_objects(lab)
cands = []
for sl in objs:
    h = sl[0].stop - sl[0].start
    w = sl[1].stop - sl[1].start
    area = h * w
    if area < 50000:  # 太小的是噪点
        continue
    cands.append((sl[0].start, sl[1].start, h, w))
print("card candidates:", len(cands))

if len(cands) != 36:
    # 打印尺寸分布帮助调参
    hs = sorted(set((h, w) for _, _, h, w in cands))
    print("size samples:", hs[:10])
    raise SystemExit("期望36格, 实际%d — 调阈值/形态学参数后重跑" % len(cands))

# 4) 行优先排序: 先按 y 分行(6行), 行内按 x
cands.sort(key=lambda c: c[0])
rows = []
for c in cands:
    placed = False
    for row in rows:
        if abs(row[0][0] - c[0]) < 100:
            row.append(c); placed = True; break
    if not placed:
        rows.append([c])
assert len(rows) == 6, "行数=%d 应为6" % len(rows)
ordered = []
for row in rows:
    row.sort(key=lambda c: c[1])
    assert len(row) == 6, "行宽=%d 应为6" % len(row)
    ordered.extend(row)

# 5) 裁切导出
rgb = Image.open(SRC).convert("RGB")
W = 640
for idx, (y, x, h, w) in enumerate(ordered, start=1):
    pad = 6
    y0, x0 = max(0, y - pad), max(0, x - pad)
    y1, x1 = min(a.shape[0], y + h + pad), min(a.shape[1], x + w + pad)
    crop = rgb.crop((x0, y0, x1, y1))
    crop = crop.resize((W, int(W * crop.height / crop.width)), Image.LANCZOS)
    crop.save(f"{OUT}/ln_{idx:02d}.png")
print("exported 36 cards ->", OUT)
