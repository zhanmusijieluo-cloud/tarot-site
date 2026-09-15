# -*- coding: utf-8 -*-
"""像素自检: 相位网格新样式 (对角符号+网格线+三角分布)"""
from PIL import Image
import numpy as np

img = Image.open('scripts/_grid_new.png').convert('RGB')
W, H = img.size
print('截图尺寸:', W, H)
a = np.asarray(img).astype(int)
gray = a.mean(axis=2)
bg = np.median(gray)
light_rows = sum(1 for y in range(H) if ((gray[y] > bg + 8) & (gray[y] < bg + 40)).mean() > 0.8)
light_cols = sum(1 for x in range(W) if ((gray[:, x] > bg + 8) & (gray[:, x] < bg + 40)).mean() > 0.8)
print('浅色网格线: 横%d条 纵%d条 (背景亮度%.0f) — 应≈15/16' % (light_rows, light_cols, bg))
mx = a.max(axis=2); mn = a.min(axis=2)
sat = (mx - mn) > 40
h2, w2 = H // 2, W // 2
lower_left = sat[h2:, :w2].mean()
upper_right = sat[:h2, w2:].mean()
print('彩色相位块占比: 左下三角=%.3f 右上三角=%.3f (应左下>>右上)' % (lower_left, upper_right))
# 对角斜线: 135° 方向亮像素 (每个对角格一条)
diag = 0
for d in range(0, min(W, H) - 10, 4):
    cnt = 0
    for t in range(0, min(W, H) - abs(d) - 4, 4):
        x = t if d >= 0 else t - d
        y = t + (d if d >= 0 else 0)
        if 0 <= x < W and 0 <= y < H:
            px = gray[y, x]
            if bg + 8 < px < bg + 45:
                cnt += 1
    if cnt > 8:
        diag += 1
print('135°方向斜线检测带: %d (有斜线则 >0)' % diag)
