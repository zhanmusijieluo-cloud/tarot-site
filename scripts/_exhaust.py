# -*- coding: utf-8 -*-
"""穷举: 把次限(目标100.90/101.15)和三限(目标113.35/113.65)一起命中的公式"""
import json, urllib.request, datetime
def chart_of(b):
    body = json.dumps({'birth': {**b, 'timeKnown': True, 'houseSystem': 'placidus'}, 'settings': {}}).encode()
    req = urllib.request.Request('http://localhost:3000/api/astro/chart', data=body, headers={'Content-Type': 'application/json'})
    j = json.loads(urllib.request.urlopen(req, timeout=30).read())['chart']
    pl = {p['name']: p['longitude'] for p in j['planets']}
    return pl['Sun'], pl['Moon'], j['angles']['ascendant']['longitude'], j['angles']['midheaven']['longitude']
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

sA0, mA0, aA0, mcA0 = chart_of(A)
sB0, mB0, aB0, mcB0 = chart_of(B)
ASC0 = midarc(aA0, aB0); MC0 = midarc(mcA0, mcB0)

print('=== 穷举: 候选公式 x 目标 ===')
print(f'基准: 组合ASC={fmt(ASC0)} 组合MC={fmt(MC0)}')
for per_day, lbl, tgts in [
    (365.25, '次限', {'测测':100.90,'爱星盘':101.15}),
    (27.321582, '三限', {'测测':113.35,'爱星盘':113.65}),
]:
    sA1, mA1, aA1, mcA1 = chart_of(progdate(A, per_day))
    sB1, mB1, aB1, mcB1 = chart_of(progdate(B, per_day))
    arcA = norm(sA1-sA0); arcB = norm(sB1-sB0)
    arcMid = (arcA+arcB)/2; arcC = norm(midarc(sA1,sB1) - midarc(sA0,sB0))
    # 推运ASC的两个中点变体
    midP = midarc(aA1, aB1); midP2 = norm(midP+180)
    print(f'\n== {lbl} ==  arcA={arcA:.2f} arcB={arcB:.2f} arcMid={arcMid:.2f} arcC={arcC:.2f}')
    print(f'  推运ASC: A={fmt(aA1)}({aA1:.2f}) B={fmt(aB1)}({aB1:.2f}) -> 中点={fmt(midP)}({midP:.2f}) 对轴={fmt(midP2)}({midP2:.2f})')
    print(f'  推运MC: A={fmt(mcA1)} B={fmt(mcB1)} 中点={fmt(midarc(mcA1,mcB1))}')
    cands = {
        'midP': midP, 'midP+180': midP2,
        'ASC0+arcA': norm(ASC0+arcA), 'ASC0+arcB': norm(ASC0+arcB),
        'ASC0+arcMid': norm(ASC0+arcMid), 'ASC0+arcC': norm(ASC0+arcC),
        'MC0+arcC': norm(MC0+arcC), 'MC0+arcMid': norm(MC0+arcMid),
        'MC0+arcC+90': norm(MC0+arcC+90), 'MC0+arcC-90': norm(MC0+arcC-90),
    }
    for nm, v in cands.items():
        for tn, t in tgts.items():
            d = diff(v, t)
            if d < 2.5:
                print(f'  ** {nm} = {fmt(v)} ({v:.2f}) vs {tn} {t} 差{d:.3f} **')
    print('  (全部候选:)')
    for nm, v in cands.items():
        ds = ' '.join(f'{tn}:{diff(v,t):.2f}' for tn, t in tgts.items())
        print(f'    {nm} = {fmt(v)} ({v:.2f}) | {ds}')
