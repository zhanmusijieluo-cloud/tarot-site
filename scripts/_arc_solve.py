# -*- coding: utf-8 -*-
"""老姐=蓬安版: 精确算"组合盘ASC+太阳弧"系列 -> 找次限101.15/三限113.35的公式"""
import json, urllib.request, datetime
def chart_of(b):
    body = json.dumps({'birth': {**b, 'timeKnown': True, 'houseSystem': 'placidus'}, 'settings': {}}).encode()
    req = urllib.request.Request('http://localhost:3000/api/astro/chart', data=body, headers={'Content-Type': 'application/json'})
    j = json.loads(urllib.request.urlopen(req, timeout=30).read())['chart']
    pl = {p['name']: p['longitude'] for p in j['planets']}
    return pl['Sun'], pl['Moon'], j['angles']['ascendant']['longitude']
norm = lambda x: x % 360
def midarc(a, b):
    d = (b - a) % 360
    if d > 180: d -= 360
    return (a + d/2) % 360
SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼']
fmt = lambda l: f'{SIGNS[int(norm(l)//30)]}{(norm(l)%30):.2f}'
T = datetime.datetime(2026, 9, 14, 18, 6)
A = dict(year=1998, month=2, day=19, hour=9, minute=45, timezone=8, latitude=31.028, longitude=106.413)
B = dict(year=1993, month=5, day=29, hour=9, minute=50, timezone=8, latitude=31.028, longitude=106.413)

def progdate(b, per_day):
    bt = datetime.datetime(b['year'], b['month'], b['day'], b['hour'], b['minute']) - datetime.timedelta(hours=b['timezone'])
    age = (T - bt).total_seconds()/86400/365.25
    d = bt + datetime.timedelta(days=age*(365.25/per_day)) + datetime.timedelta(hours=b['timezone'])
    return dict(year=d.year, month=d.month, day=d.day, hour=d.hour, minute=d.minute, timezone=b['timezone'], latitude=b['latitude'], longitude=b['longitude'])

sA0, mA0, aA0 = chart_of(A)
sB0, mB0, aB0 = chart_of(B)
ASC_comp = midarc(aA0, aB0)          # 68.84
SUN_comp = midarc(sA0, sB0)          # 18.96
print(f'组合盘: ASC={fmt(ASC_comp)} 太阳={fmt(SUN_comp)}')
print()

for per_day, lbl, tgt in [(365.25, '次限', 100.9), (27.321582, '三限', 113.35)]:
    sA1, mA1, aA1 = chart_of(progdate(A, per_day))
    sB1, mB1, aB1 = chart_of(progdate(B, per_day))
    arcA = norm(sA1 - sA0); arcB = norm(sB1 - sB0)
    SUN_comp_p = midarc(sA1, sB1)
    arcC = norm(SUN_comp_p - SUN_comp)
    print(f'== {lbl} (目标ASC {tgt}) ==')
    print(f'  arcA(木木)={arcA:.2f} arcB(老姐)={arcB:.2f} mid={ (arcA+arcB)/2:.2f} arcC(组合太阳弧)={arcC:.2f}')
    for name, arc in [('arcA', arcA), ('arcB', arcB), ('arcMid', (arcA+arcB)/2), ('arcC', arcC)]:
        v = norm(ASC_comp + arc)
        print(f'  组合ASC+{name}: {fmt(v)} (差{min(abs(v-tgt),360-abs(v-tgt)):.2f})')
    print(f'  mid(推运ASC)={fmt(midarc(aA1,aB1))}  [参考]')
    print()
