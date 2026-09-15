# -*- coding: utf-8 -*-
"""扫图: 大运环带(306-342)与外边界(342-346缝)上的亮色像素分布 → 符号是否越界"""
from PIL import Image
import numpy as np, math

img = Image.open('D:/网站/塔罗/tarot-site/scripts/_fir_v2_dark.png').convert('RGB')
a = np.asarray(img).astype(int)
W, H = a.shape[:2]
s = W / 920.0
cx = cy = 460 * s

def bright_frac(r0, r1, steps=720):
    """半径带 [r0,r1] 内亮于背景的像素占比 (符号笔画=亮)"""
    hit = tot = 0
    for i in range(steps):
        th = 2 * math.pi * i / steps
        for rr in np.linspace(r0, r1, 9) * s:
            x = int(cx + rr * math.cos(th)); y = int(cy - rr * math.sin(th))
            if 0 <= x < W and 0 <= y < H:
                px = a[y, x]
                tot += 1
                if px.sum() > 250:   # 深色底上亮像素 (背景≈(18,18,21) sum=57)
                    hit += 1
    return hit / tot

print('大运环带内 306-342  亮占比: %.3f' % bright_frac(306, 342))
print('缝界外 343-352      亮占比: %.3f  ← 若≈0 说明大运符号没越界' % bright_frac(343, 352))
print('小运环带内 346-392  亮占比: %.3f' % bright_frac(346, 392))
print('小运外 393-405      亮占比: %.3f  ← 若≈0 小运符号没越界' % bright_frac(393, 405))
