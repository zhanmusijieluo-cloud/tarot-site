# -*- coding: utf-8 -*-
"""组合数字搜索: 找"组合次限/三限 ASC"的生成公式(用简单系数组合所有相关量)"""
import json, urllib.request, datetime, itertools
def chart_of(b):
    body = json.dumps({'birth': {**b, 'timeKnown': True, 'houseSystem': 'placidus'}, 'settings': {}}).encode()
    req = urllib.request.Request('http://localhost:3000/api/astro/chart', data=body, headers={'Content-Type': 'application/json'})
    j = json.loads(urllib.request.urlopen(req, timeout=30).read())['chart']
    pl = {p['name']: p['longitude'] for p in j['planets']}
    return pl, j['angles']['ascendant']['longitude'], j['angles']['midheaven']['longitude']
norm = lambda x: x % 360
def midarc(a, b):
    d = (b - a) % 360
    if d > 180: d -= 360
    return (a + d/2) % 360
SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼']
fmt = lambda l: f'{SIGNS[int(norm(l)//30)]}{(norm(l)%30):.2f}'
diff = lambda a, b: min(abs(norm(a-b)), 360-abs(norm(a-b)))
T = datetime.datetime(2026, 9, 14, 18, 6)
A = dict(year=1998, month=2, day=19, hour=9, minute=45, timezone=8, latitude=31.028, longitude=106.413)
B = dict(year=1993, month=5, day=29, hour=9, minute=50, timezone=8, latitude=31.028, longitude=106.413)
def progdate(b, per_day):
    bt = datetime.datetime(b['year'], b['month'], b['day'], b['hour'], b['minute']) - datetime.timedelta(hours=b['timezone'])
    age = (T - bt).total_seconds()/86400/365.25
    d = bt + datetime.timedelta(days=age*(365.25/per_day)) + datetime.timedelta(hours=b['timezone'])
    return dict(year=d.year, month=d.month, day=d.day, hour=d.hour, minute=d.minute, timezone=b['timezone'], latitude=b['latitude'], longitude=b['longitude'])

pA0, aA0, mA0 = chart_of(A); pB0, aB0, mB0 = chart_of(B)
ASC0 = midarc(aA0, aB0)
print(f'基础: 木木ASC={fmt(aA0)} 老姐ASC={fmt(aB0)} 组合ASC={fmt(ASC0)}')
for per_day, lbl, tgts in [(365.25, '次限', [100.90, 101.15]), (27.321582, '三限', [113.35, 113.65])]:
    pA1, aA1, mA1 = chart_of(progdate(A, per_day))
    pB1, aB1, mB1 = chart_of(progdate(B, per_day))
    # 收集所有相关量
    V = {
        'ASC0': ASC0, 'aA0': aA0, 'aB0': aB0, 'mA0': mA0, 'mB0': mB0,
        'aA1': aA1, 'aB1': aB1, 'mA1': mA1, 'mB1': mB1,
        'midASC1': midarc(aA1, aB1), 'midMC1': midarc(mA1, mB1),
        'sunA0': pA0['Sun'], 'sunB0': pB0['Sun'], 'sunA1': pA1['Sun'], 'sunB1': pB1['Sun'],
        'moonA1': pA1['Moon'], 'moonB1': pB1['Moon'],
    }
    arcA = norm(pA1['Sun']-pA0['Sun']); arcB = norm(pB1['Sun']-pB0['Sun'])
    V['arcA'] = arcA; V['arcB'] = arcB; V['arcMid'] = (arcA+arcB)/2
    # 变体: 每个量 ±180
    vals = []
    for nm, v in V.items():
        vals.append((nm, v)); vals.append((nm+'+180', norm(v+180))); vals.append((nm+'-180', norm(v-180)))
    print(f'\n===== {lbl} 目标 {tgts} =====')
    found = []
    # 1) 单量 + 弧
    for nm, v in vals:
        for an, an2 in [('arcA',arcA),('arcB',arcB),('arcMid',(arcA+arcB)/2)]:
            r = norm(v+an2)
            for t in tgts:
                if diff(r, t) < 0.4: found.append((f'{nm}+{an}', r, diff(r,t), t))
    # 2) 双量中点 (系数1/2,1/2)
    for (n1,v1),(n2,v2) in itertools.combinations(vals, 2):
        if n1.split('+')[0]==n2.split('+')[0] or n1.split('-')[0]==n2.split('-')[0]: continue
        r = midarc(v1, v2)
        for t in tgts:
            if diff(r, t) < 0.35: found.append((f'mid({n1},{n2})', r, diff(r,t), t))
    found = sorted(set(found), key=lambda x: x[2])[:25]
    for f in found: print(f'  ✓ {f[0]} = {fmt(f[1])} ({f[1]:.2f})  差{f[2]:.3f} (目标{f[1+0] if False else f[3]})')
    if not found: print('  (无命中<0.35)')
