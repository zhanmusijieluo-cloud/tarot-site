# -*- coding: utf-8 -*-
"""测设法达盘外环像素采样: 找圆心/半径, 沿角度扫色 → 判定 已走/当前/未走 配色规则"""
from PIL import Image
import numpy as np, math

p = 'C:/Users/99192/AppData/Roaming/Hermes/composer-images/0d0a0ff3038cfb789f0555e30a6eec0a_00a199.jpg'
im = Image.open(p).convert('RGB')
a = np.asarray(im).astype(int)
H, W = a.shape[:2]
print('size', W, H)

# 假设圆心 x≈540 (图宽一半), y 待扫; 先粗扫: 在 x=540 垂直线上找盘的深色区边界
# 更稳: 找图中最大圆形盘 — 扫描 y=1100 附近, 用亮色(环底色)定位
# 输出几行像素概览: 每 100px 采一个点的 RGB
for y in range(500, 2000, 100):
    row = [tuple(a[y, x]) for x in range(60, W, 120)]
    print(y, row)
