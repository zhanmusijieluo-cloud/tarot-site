# -*- coding: utf-8 -*-
"""法达环加浓后像素验证: 环带彩色占比 + 色相分布"""
from PIL import Image
import numpy as np
import collections

img = Image.open('scripts/_firdaria_colored.png').convert('RGB')
a = np.asarray(img).astype(int)
H, W = a.shape[:2]
mx = a.max(axis=2); mn = a.min(axis=2); sat = mx - mn
cx = cy = W / 2
s = W / 920
yy, xx = np.mgrid[0:H, 0:W]
rr = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
band = np.logical_and(rr > 395 * s, rr < 444 * s)
ring_sat = sat[band]
color_pct = 100 * (ring_sat > 15).mean()
print('环带有彩色像素占比: %.0f%% | 均值饱和=%.0f' % (color_pct, ring_sat.mean()))
ys, xs = np.nonzero(np.logical_and(band, sat > 15))
cols = a[ys, xs]

def hue_name(px):
    r, g, b = int(px[0]), int(px[1]), int(px[2])
    if b > r and b > g: return '蓝'
    if g >= r and g > b and r > 150: return '金'
    if g > b and g >= r: return '绿青'
    if r > 200 and g < 180: return '红粉'
    if r > g and g > b: return '暖橙'
    return '其他'

cnt = collections.Counter(hue_name(px) for px in cols[::37])
print('色相分布:', dict(cnt))
