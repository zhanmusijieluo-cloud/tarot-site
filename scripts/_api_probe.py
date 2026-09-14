# -*- coding: utf-8 -*-
"""实测网站 API: 组合盘/组合次限/组合三限的真实 ASC 输出"""
import json, urllib.request
A = dict(year=1998, month=2, day=19, hour=9, minute=45, timezone=8, latitude=31.028, longitude=106.413)
B = dict(year=1993, month=5, day=29, hour=9, minute=50, timezone=8, latitude=31.028, longitude=106.413)
body = json.dumps({'birthA': {**A, 'timeKnown': True}, 'birthB': {**B, 'timeKnown': True}, 'settings': {}}).encode()
req = urllib.request.Request('http://localhost:3000/api/astro/chart/synastry', data=body, headers={'Content-Type': 'application/json'})
j = json.loads(urllib.request.urlopen(req, timeout=60).read())
SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼']
fmt = lambda l: f'{SIGNS[int((l%360)//30)]}{(l%360)%30:.2f}'
def asc_of(ch):
    if not ch: return 'N/A'
    a = ch.get('angles', {}).get('ascendant')
    return fmt(a['longitude']) if a else 'None'
print('keys:', [k for k in j.keys()][:30])
print()
print('组合盘 composite ASC      :', asc_of(j.get('composite')), ' (爱星盘: 双子8.85)')
print('组合次限 compS     ASC      :', asc_of(j.get('compS')), ' (测测: 巨蟹10.90 / 爱星盘: 巨蟹11.15)')
print('组合三限 compT     ASC      :', asc_of(j.get('compT')), ' (测测: 巨蟹23.35 / 爱星盘: 巨蟹23.65)')
print()
print('（参考）时空盘 davisonChart ASC:', asc_of(j.get('davisonChart')))
print('（参考）马盘A marksA ASC    :', asc_of(j.get('marksA')))
print('（参考）马盘B marksB ASC    :', asc_of(j.get('marksB')))
