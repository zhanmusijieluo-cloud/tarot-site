// 星盘页 URL 编解码 — 生辰全在 query 里, URL 即盘面身份
// 地点三模式: cn=省/市/区(中国) | cid=海外城市id | lat+lng+tz(手填) ; n=档案名
import { ALL_CITIES, findCity } from '@/lib/astro/cities';
import type { BirthData, HouseSystem } from '@/lib/astro/chart';

const SYS: HouseSystem[] = ['placidus', 'koch', 'equal', 'whole-sign', 'porphyry', 'regiomontanus', 'campanus'];

export function birthFromParams(sp: URLSearchParams): BirthData | null {
  const num = (k: string, d: number) => { const v = Number(sp.get(k)); return Number.isFinite(v) ? v : d; };
  const y = sp.get('y'), mo = sp.get('mo'), d = sp.get('d');
  if (!y || !mo || !d) return null;
  const houseSystem = SYS.includes(sp.get('sys') as HouseSystem) ? (sp.get('sys') as HouseSystem) : 'placidus';
  const cn = sp.get('cn');       // 省/市/区 名称拼接 ('|'分隔无法上URL, 用 '~')
  const cid = sp.get('cid');
  const city = cid ? findCity(cid) : undefined;
  const b: BirthData = {
    year: Number(y), month: Number(mo), day: Number(d),
    hour: num('h', 12), minute: num('mi', 0),
    timezone: cn ? 8 : city ? city.tz : num('tz', 8),
    latitude: cn ? num('lat', NaN) : city ? city.lat : num('lat', NaN),
    longitude: cn ? num('lng', NaN) : city ? city.lng : num('lng', NaN),
    city: cn ? decodeCn(cn) : city ? city.zh : sp.get('city') ?? undefined,
    label: sp.get('n')?.slice(0, 30) || undefined,
    houseSystem,
    timeKnown: sp.get('nt') !== '1',
  };
  if (!Number.isFinite(b.latitude) || !Number.isFinite(b.longitude)) return null;
  return b;
}

// "北京~北京~海淀" → "北京·海淀" (直辖市/同名不重复)
function decodeCn(cn: string): string {
  const parts = cn.split('~').filter(Boolean);
  const [prov, , dist] = parts;
  const last = parts[parts.length - 1];
  if (!prov) return '';
  return prov === last ? prov : `${prov}·${last}`;
}

export function paramsFromBirth(b: BirthData): string {
  const p = new URLSearchParams();
  p.set('y', String(b.year)); p.set('mo', String(b.month)); p.set('d', String(b.day));
  p.set('h', String(b.hour)); p.set('mi', String(b.minute));
  if (b.label) p.set('n', b.label);
  // 地点编码优先级: 中国三级(cn) → 海外城市(cid) → 裸坐标
  if (b.cnCode) {
    p.set('cn', b.cnCode); p.set('lat', String(b.latitude)); p.set('lng', String(b.longitude));
  } else {
    const city = ALL_CITIES.find((c) => Math.abs(c.lat - b.latitude) < 1e-4 && Math.abs(c.lng - b.longitude) < 1e-4);
    if (city) {
      p.set('cid', city.id);
    } else {
      p.set('lat', String(b.latitude)); p.set('lng', String(b.longitude)); p.set('tz', String(b.timezone));
      if (b.city) p.set('city', b.city);
    }
  }
  p.set('sys', b.houseSystem ?? 'placidus');
  if (!b.timeKnown) p.set('nt', '1');
  return p.toString();
}
