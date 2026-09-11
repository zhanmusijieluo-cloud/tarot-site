# 中国出生地库打包: 省→市→区县 三级 + 经纬度 (数据源 public-wheels/china-cities, 开源)
# 输出紧凑 JSON: public/astro/cn-cities.json
# 自检: 北京=约(39.9,116.4); 乌鲁木齐=约(43.8,87.6); 台北=约(25.0,121.5)
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'cn-cities-src.json')
OUT = os.path.normpath(os.path.join(HERE, '..', 'public', 'astro', 'cn-cities.json'))

raw = json.load(open(SRC, encoding='utf-8'))

# 结构: [[省名, [[市名, [[区县名, lat, lng], ...]], ...]], ...]
# 合并重名省(直辖市/重复条目), 去重同区划(同坐标同名)
provs = {}
for p in raw:
    pname = p['ProvinceNameZh'].strip()
    cities = provs.setdefault(pname, {})
    for pc in p['prefectureCities']:
        cname = pc['prefectureNameZh'].strip()
        dst = cities.setdefault(cname, [])
        seen = {(c['nameZh'].strip(), round(float(c['latitude']), 2)) for c in dst}
        for c in pc['cities']:
            dn = c['nameZh'].strip()
            la, lo = float(c['latitude']), float(c['longtitude'])
            if (dn, round(la, 2)) in seen: continue
            if not (-90 <= la <= 90 and 70 <= lo <= 140): continue  # 中国境内合理性
            dst.append([dn, round(la, 3), round(lo, 3)])
            seen.add((dn, round(la, 2)))

out = [[pn, [[cn, ds] for cn, ds in cs.items() if ds]] for pn, cs in provs.items() if cs]
# 直辖市/特区(省=市): 源数据把每个区当一"市", 这里展平为 省→单市→全部区县
FLAT = {'北京', '上海', '天津', '重庆', '香港', '澳门'}
out = [
    [pn, (
        [[pn, sorted({tuple(d) for _, ds in cs for d in ds})]] if pn in FLAT else cs
    )]
    for pn, cs in out
]
out.sort(key=lambda x: x[0])

def find(pname, cname, dname):
    for pn, cs in out:
        if pn != pname: continue
        for cn, ds in cs:
            if cn != cname: continue
            return dict((d[0], (d[1], d[2])) for d in ds).get(dname)
    return None

checks = [
    (('北京', '北京', '海淀'), 39.9, 116.3),
    (('新疆', '乌鲁木齐', '乌鲁木齐'), 43.8, 87.6),
    (('台湾', '台北', '台北'), 25.0, 121.5),
    (('广东', '广州', '广州'), 23.1, 113.3),
    (('上海', '上海', '浦东新区'), 31.2, 121.5),
]
for key, la, lo in checks:
    got = find(*key)
    assert got and abs(got[0] - la) < 0.6 and abs(got[1] - lo) < 0.6, f'自检失败 {key} → {got}'
    print(f'自检通过: {key[0]}/{key[1]}/{key[2]} = {got}')

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))

n_c = sum(len(cs) for _, cs in out)
n_d = sum(len(ds) for _, cs in out for _, ds in cs)
print(f'输出 {OUT}: {os.path.getsize(OUT)/1024:.0f} KB | 省 {len(out)} 市 {n_c} 区县 {n_d}')
