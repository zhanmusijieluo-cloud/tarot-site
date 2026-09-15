# -*- coding: utf-8 -*-
"""验证法达v2配色: 沿环采色 — 1998生人现在~28.6岁; 0-28岁段应无色(灰), 28岁后段应主题玫红"""
from PIL import Image
import numpy as np, math

img = Image.open('D:/网站/塔罗/tarot-site/scripts/_fir_v2_dark.png').convert('RGB')
a = np.asarray(img).astype(int)
H, W = a.shape[:2]
print('png size', W, H)
# 找盘心: 图是 svg 截图, viewBox 920 → 缩放 s=W/920; 心=(460s,460s)
s = W / 920.0
cx, cy = 460 * s, 460 * s
R = 368 * s   # 小运环中线

def sample_age(age):
    """法达 12点=0岁 顺时针"""
    th = math.pi / 2 - (age / 75) * 2 * math.pi
    x = int(cx + R * math.cos(th)); y = int(cy - R * math.sin(th))
    # 3x3 均值
    win = a[max(0,y-2):y+3, max(0,x-2):x+3].reshape(-1, 3).mean(axis=0)
    return tuple(int(v) for v in win)

for age in [3, 8, 14, 20, 26, 35, 45, 60, 72]:
    tag = '已走过(应灰)' if age < 28.6 else '未走过(应玫红)'
    print(f'{age:3d}岁: {sample_age(age)} {tag}')
