# -*- coding: utf-8 -*-
"""读测设法达参考图: OCR文字环布局 + 外环弧段颜色采样 (已走/未走配色规则)"""
from rapidocr_onnxruntime import RapidOCR
from PIL import Image
import numpy as np, math

p = 'C:/Users/99192/AppData/Roaming/Hermes/composer-images/0d0a0ff3038cfb789f0555e30a6eec0a_00a199.jpg'
im = Image.open(p).convert('RGB')
W, H = im.size
print('图片尺寸:', W, H)
ocr = RapidOCR(intra_op_num_threads=4, inter_op_num_threads=1)
res, _ = ocr(p)
items = []
for box, txt, conf in (res or []):
    if float(conf) > 0.55:
        x = int(box[0][0]); y = int(box[0][1])
        items.append((y, x, txt))
items.sort()
for y, x, t in items:
    print(f'{y:4d} {x:4d} {t}')
