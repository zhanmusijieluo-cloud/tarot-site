// 星盘页 URL 编解码 — 生辰全在 query 里, URL 即盘面身份
import { ALL_CITIES, findCity } from '@/lib/astro/cities';
import type { BirthData, HouseSystem } from '@/lib/astro/chart';

const SYS: HouseSystem[] = ['placidus', 'koch', 'equal', 'whole-sign', 'porphyry', 'regiomontanus', 'campanus'];

export function birthFromParams(sp: URLSearchParams): BirthData | null {
  const num = (k: string, d: number) => { const v = Number(sp.get(k)); return Number.isFinite(v) ? v : d; };
  const y = sp.get('y'), mo = sp.get('mo'), d = sp.get('d');
  if (!y || !mo || !d) return null;
  const cid = sp.get('cid');
  const city = cid ? findCity(cid) : undefined;
  const houseSystem = SYS.includes(sp.get('sys') as HouseSystem) ? (sp.get('sys') as HouseSystem) : 'placidus';
  const b: BirthData = {
    year: Number(y), month: Number(mo), day: Number(d),
    hour: num('h', 12), minute: num('mi', 0),
    timezone: city ? city.tz : num('tz', 8),
    latitude: city ? city.lat : num('lat', NaN),
    longitude: city ? city.lng : num('lng', NaN),
    city: city ? city.zh : sp.get('city') ?? undefined,
    houseSystem,
    timeKnown: sp.get('nt') !== '1',
  };
  if (!Number.isFinite(b.latitude) || !Number.isFinite(b.longitude)) return null;
  return b;
}

export function paramsFromBirth(b: BirthData): string {
  const p = new URLSearchParams();
  p.set('y', String(b.year)); p.set('mo', String(b.month)); p.set('d', String(b.day));
  p.set('h', String(b.hour)); p.set('mi', String(b.minute));
  // 城市优先 (短URL); 无城市则裸坐标+时区
  const city = ALL_CITIES.find((c) => Math.abs(c.lat - b.latitude) < 1e-4 && Math.abs(c.lng - b.longitude) < 1e-4);
  if (city) {
    p.set('cid', city.id);
  } else {
    p.set('lat', String(b.latitude)); p.set('lng', String(b.longitude)); p.set('tz', String(b.timezone));
    if (b.city) p.set('city', b.city);
  }
  p.set('sys', b.houseSystem ?? 'placidus');
  if (!b.timeKnown) p.set('nt', '1');
  return p.toString();
}
