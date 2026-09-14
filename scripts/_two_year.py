# -*- coding: utf-8 -*-
"""两年联合(2026+2027): 锁定组合次限 ASC 公式
观测(爱星盘): 2026 -> 巨蟹11°09′=101.15 ; 2027 -> 巨蟹12°09′=102.15 (差+1.00°/年)
图上读: 2027太阳=金牛20°16′=50.27, MC=白羊2°25′=2.42"""
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
A = dict(year=1998, month=2, day=19, hour=9, minute=45, timezone=8, latitude=31.028, longitude=106.413)
B = dict(year=1993, month=5, day=29, hour=9, minute=50, timezone=8, latitude=31.028, longitude=106.413)
def progdate(b, per_day, T):
    bt = datetime.datetime(b['year'], b['month'], b['day'], b['hour'], b['minute']) - datetime.timedelta(hours=b['timezone'])
    age = (T - bt).total_seconds()/86400/365.25
    d = bt + datetime.timedelta(days=age*(365.25/per_day)) + datetime.timedelta(hours=b['timezone'])
    return dict(year=d.year, month=d.month, day=d.day, hour=d.hour, minute=d.minute, timezone=b['timezone'], latitude=b['latitude'], longitude=b['longitude'])

pA0, aA0, mA0 = chart_of(A); pB0, aB0, mB0 = chart_of(B)
ASC0 = midarc(aA0, aB0); MC0 = midarc(mA0, mB0)
YT = {2026: (datetime.datetime(2026,9,14,18,6), 101.15), 2027: (datetime.datetime(2027,9,14,18,6), 102.15)}
print(f'组合盘ASC={fmt(ASC0)} MC={fmt(MC0)}')
for yr, (T, tgt) in YT.items():
    pA1, aA1, mA1 = chart_of(progdate(A, 365.25, T)); pB1, aB1, mB1 = chart_of(progdate(B, 365.25, T))
    sunC = midarc(pA1['Sun'], pB1['Sun']); mcC = midarc(mA1, mB1)
    arcC = norm(sunC - midarc(pA0['Sun'], pB0['Sun']))
    midP = midarc(aA1, aB1)
    print(f'\n== {yr} (目标 {tgt}) ==')
    print(f'  A推运ASC={fmt(aA1)}({aA1:.2f}) B推运ASC={fmt(aB1)}({aB1:.2f})')
    print(f'  midP={fmt(midP)}({midP:.2f}) midP+180={fmt(norm(midP+180))}')
    print(f'  组合太阳={fmt(sunC)}({sunC:.2f}) [图: {"金牛20.27" if yr==2027 else "-"}] arcC={arcC:.2f}')
    print(f'  组合推运MC={fmt(mcC)} [图2027: 白羊2.42]')
    for nm, v in {
        'ASC0+arcC': norm(ASC0+arcC),
        'midP': midP, 'midP+180': norm(midP+180),
        'midP-135.94': norm(midP-135.94),
        'ASC0+arcC+2': norm(ASC0+arcC+2),
        'mcC+90': norm(mcC+90), 'mcC-90': norm(mcC-90),
        'midP+245.17': None,  # placeholder
    }.items():
        if v is None: continue
        print(f'    {nm} = {fmt(v)} ({v:.2f}) 差{diff(v,tgt):.3f}')
    # 解"如果 = midP + k"的 k
    k = norm(tgt - midP)
    print(f'  >>> 目标相对midP的偏移 k = {k:.2f} (= {norm(k+180):.2f}-180)')
    k2 = norm(tgt - (ASC0 + arcC))
    print(f'  >>> 目标相对(ASC0+arcC)的偏移 = {k2:.2f}')
