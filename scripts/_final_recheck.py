# -*- coding: utf-8 -*-
"""终极重算: 老姐改为"蓬安"！对比全部目标值"""
import json, urllib.request, datetime
def chart_of(b):
    body = json.dumps({'birth': {**b, 'timeKnown': True, 'houseSystem': 'placidus'}, 'settings': {}}).encode()
    req = urllib.request.Request('http://localhost:3000/api/astro/chart', data=body, headers={'Content-Type': 'application/json'})
    j = json.loads(urllib.request.urlopen(req, timeout=30).read())['chart']
    a = j['angles']['ascendant']['longitude']; mc = j['angles']['midheaven']['longitude']
    pl = {p['name']: p['longitude'] for p in j['planets']}
    return a, mc, pl
SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼']
fmt = lambda l: f'{SIGNS[int((l%360)//30)]}{(l%360)%30:.2f}'
def midarc(a, b):
    d = (b - a) % 360
    if d > 180: d -= 360
    return (a + d/2) % 360

# A=木木(蓬安)  B=老姐(蓬安！！！)
A = dict(year=1998, month=2, day=19, hour=9, minute=45, timezone=8, latitude=31.028, longitude=106.413)
B = dict(year=1993, month=5, day=29, hour=9, minute=50, timezone=8, latitude=31.028, longitude=106.413)  # 蓬安!

aA, mA, pA = chart_of(A)
aB, mB, pB = chart_of(B)
print('木木(蓬安) ASC:', fmt(aA), '| 老姐(蓬安) ASC:', fmt(aB))
print('组合盘 mid(ASC):', fmt(midarc(aA, aB)), ' [爱星盘目标: 双子8°51=68.85]')
print('组合盘 mid(MC):', fmt(midarc(mA, mB)))
print('行星mid抽查: 太阳', fmt(midarc(pA['Sun'], pB['Sun'])), '月亮', fmt(midarc(pA['Moon'], pB['Moon'])), '木星', fmt(midarc(pA['Jupiter'], pB['Jupiter'])))
print()

# 推运（各自推运后组合）
T = datetime.datetime(2026, 9, 14, 18, 6)  # 爱星盘推运时间 18:06
def progdate(b, per_day, target=T):
    bt = datetime.datetime(b['year'], b['month'], b['day'], b['hour'], b['minute']) - datetime.timedelta(hours=b['timezone'])
    age = (target - bt).total_seconds()/86400/365.25
    d = bt + datetime.timedelta(days=age*(365.25/per_day)) + datetime.timedelta(hours=b['timezone'])
    return dict(year=d.year, month=d.month, day=d.day, hour=d.hour, minute=d.minute, timezone=b['timezone'], latitude=b['latitude'], longitude=b['longitude'])

for per_day, lbl, tgt_asc, tgt_moon in [
    (365.25, '次限', '巨蟹10.9-11.15 (测测10°54/爱11°09)', None),
    (27.321582, '三限', '巨蟹23.21-23.65 (测测23°21/爱23°39)', '射手11'),
]:
    pa, pb = progdate(A, per_day), progdate(B, per_day)
    a2, m2, p2 = chart_of(pa)
    a3, m3, p3 = chart_of(pb)
    mid_a = midarc(a2, a3); mid_m = midarc(m2, m3); mid_mo = midarc(p2['Moon'], p3['Moon'])
    print(f'== 组合{lbl} ==')
    print(f'  木木推运盘 ASC={fmt(a2)} 月={fmt(p2["Moon"])}')
    print(f'  老姐推运盘 ASC={fmt(a3)} 月={fmt(p3["Moon"])}')
    print(f'  -> mid(ASC)={fmt(mid_a)}  [目标{tgt_asc}]')
    print(f'  -> mid(MC)={fmt(mid_m)}')
    print(f'  -> mid(月亮)={fmt(mid_mo)}')
    print()
