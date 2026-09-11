# 占星星空数据打包: 依巴谷星表/星座连线/IAU边界 (d3-celestial, 公有领域数据)
# 赤道坐标(RA/Dec) → 黄道坐标(λ/β), 输出紧凑 JSON 供 3D 星空轮盘使用
# 自检: Spica(角宿一) 应约 λ≈205° β≈+2.4°; Sirius 应约 λ≈203° β≈-39.7°
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'package', 'data')
OUT = os.path.normpath(os.path.join(HERE, '..', 'public', 'astro', 'starfield.json'))
EPS = math.radians(23.43928)  # J2000 黄赤交角
D2R = math.pi / 180

def radec_to_ecl(ra_deg, dec_deg):
    a, d = ra_deg * D2R, dec_deg * D2R
    x, y, z = math.cos(d) * math.cos(a), math.cos(d) * math.sin(a), math.sin(d)
    xe, ye = x, y * math.cos(EPS) + z * math.sin(EPS)
    ze = -y * math.sin(EPS) + z * math.cos(EPS)
    lam = math.degrees(math.atan2(ye, xe)) % 360
    beta = math.degrees(math.asin(max(-1, min(1, ze))))
    return round(lam, 2), round(beta, 2)

# 自检 (SIMBAD J2000 黄道坐标): Spica λ=204.00 β=-2.13 | Sirius λ=103.96 β=-39.73
sl, sb = radec_to_ecl(201.298, -11.161)   # Spica
vl, vb = radec_to_ecl(101.287, -16.716)   # Sirius
assert abs(sl - 204.0) < 1.0 and abs(sb + 2.13) < 0.5, f'Spica自检失败: {sl},{sb}'
assert abs(vl - 104.0) < 1.0 and abs(vb + 39.73) < 0.5, f'Sirius自检失败: {vl},{vb}'
print(f'坐标转换自检通过: Spica λ={sl} β={sb} | Sirius λ={vl} β={vb}')

ZODIAC = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Scorpius',
          'Sagittarius','Capricorn','Capricornus','Aquarius','Pisces','Ophiuchus']

# --- 星座连线: 黄道带内的星座骨架全留, 其余按 rank=1 主骨架留 ---
lines_src = json.load(open(f'{SRC}/constellations.lines.json'))
names_src = json.load(open(f'{SRC}/constellations.json'))
# lines 文件与主文件按 index 对齐(d3-celestial 89 顺序一致)
by_name = {f['properties']['name']: i for i, f in enumerate(names_src['features'])}
lines = []
for feat in lines_src['features']:
    segs = []
    for seg in feat['geometry']['coordinates']:
        pts = [radec_to_ecl(r, d) for r, d in seg]
        if any(abs(b) < 45 for _, b in pts):  # 带内可见才留
            segs.append(pts)
    if segs:
        lines.append(segs)

# --- IAU 星座边界: 只留 |β|<30 的段 ---
borders_src = json.load(open(f'{SRC}/constellations.borders.json'))
borders = []
for feat in borders_src['features']:
    for seg in feat['geometry']['coordinates']:
        cur = []
        for r, d in seg:
            p = radec_to_ecl(r, d)
            if abs(p[1]) < 30:
                cur.append(p)
            else:
                if len(cur) >= 2: borders.append(cur)
                cur = []
        if len(cur) >= 2: borders.append(cur)

# --- 亮星: 带内密 + 稍外圈疏 ---
stars_src = json.load(open(f'{SRC}/stars.8.json'))
stars = []
for f in stars_src['features']:
    lam, beta = radec_to_ecl(f['geometry']['coordinates'][0], f['geometry']['coordinates'][1])
    m = f['properties']['mag']
    bv = f['properties'].get('bv')
    ab = abs(beta)
    keep = (m <= 5.0 and ab < 40) or (m <= 6.5 and ab < 18) or (m <= 2.0)  # 一等亮星全留(猎户/天蝎心宿二等辨识度)
    if keep:
        stars.append([lam, beta, round(m, 1), round(float(bv), 2) if bv not in (None, '') else 0.0])

# 黄道带内星座名(带标注): 取 label 位置
labels = []
for feat in names_src['features']:
    nm = feat['properties']['name']
    r, d = feat['geometry']['coordinates']
    lam, beta = radec_to_ecl(r, d)
    if abs(beta) < 18:
        labels.append({'n': nm, 'z': nm in ZODIAC, 'l': lam, 'b': beta})

data = {'lines': lines, 'borders': borders, 'stars': stars, 'labels': labels}
with open(OUT, 'w') as fp:
    json.dump(data, fp, separators=(',', ':'))

import os
print(f'输出 {OUT}: {os.path.getsize(OUT)/1024:.0f} KB')
print(f'星座连线组 {len(lines)} | 边界段 {len(borders)} | 星点 {len(stars)} | 带内标注 {len(labels)}')
