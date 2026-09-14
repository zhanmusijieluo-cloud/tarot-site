import { castNatalChart } from './src/lib/astro/chart.ts'
const c = castNatalChart({ year: 1995, month: 6, day: 15, hour: 14, minute: 30, timezone: 8, latitude: 39.9042, longitude: 116.4074, houseSystem: 'whole-sign' })
const sunShown = c.receptions.filter(r => (r.a === 'Sun' || r.b === 'Sun') && (r.aspected || r.mutual))
console.log('太阳显示接纳:', sunShown.length)
for (const r of sunShown) console.log(' ', r.a, '居', r.bySign, '↔被', r.b, 'kind='+r.kind, 'mutual:'+r.mutual)
console.log('太阳相位:', c.aspects.filter(a=>a.a==='Sun'||a.b==='Sun').map(a=>a.a+' '+a.typeZh+' '+a.b+' '+a.orb+'°').join(' | '))
console.log('太阳宫位:', c.planets.find(p=>p.name==='Sun')?.house, '昼/夜:', c.planets.find(p=>p.name==='Sun')?.triplicity?.active)
