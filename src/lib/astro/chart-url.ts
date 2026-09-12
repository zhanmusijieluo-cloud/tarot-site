// 星盘页 URL 编解码 — 生辰全在 query 里, URL 即盘面身份
// 地点三模式: cn=省/市/区(中国) | cid=海外城市id | lat+lng+tz(手填) ; n=档案名
import { ALL_CITIES, findCity } from '@/lib/astro/cities';
import type { BirthData, CastSettings, HouseSystem } from '@/lib/astro/chart';

const SYS: HouseSystem[] = ['placidus', 'koch', 'equal', 'whole-sign', 'porphyry', 'regiomontanus', 'campanus', 'morinus', 'vettius'];

// settings 的 URL 编码: bd=小行星.凯龙.交点.福点.莉莉丝(0/1) | as=追加的次要相位 | ob=合,冲,拱,刑,六合容许度
const MINOR_ASPECTS = ['quincunx', 'semi-sextile', 'semi-square', 'sesquiquadrate', 'quintile', 'biquintile', 'septile', 'novile', 'decile'] as const;
const MAJOR_ORDER = ['conjunction', 'opposition', 'trine', 'square', 'sextile'] as const;
export const DEFAULT_ORBS: Record<string, number> = { conjunction: 8, opposition: 8, trine: 8, square: 7, sextile: 6 };

export function settingsFromParams(sp: URLSearchParams): CastSettings | undefined {
  const s: CastSettings = {};
  const bd = sp.get('bd');
  if (bd) {
    const flags = bd.split('.');
    const groups = ['asteroids', 'chiron', 'nodes', 'lots', 'lilith'] as const;
    s.bodies = {};
    groups.forEach((g, i) => { if (flags[i] === '1') (s.bodies as Record<string, boolean>)[g] = true; });
  }
  if (sp.get('nd') === 'mean') s.nodeType = 'mean';
  const lil = sp.get('lil');
  if (lil === 'true' || lil === 'both') s.lilithType = lil;
  const as = sp.get('as');
  const types = ['conjunction', 'sextile', 'square', 'trine', 'opposition'];
  if (as) types.push(...as.split('.').filter((x): x is string => (MINOR_ASPECTS as readonly string[]).includes(x)));
  if (as !== null || sp.get('ob')) s.aspectTypes = types;
  const ob = sp.get('ob');
  if (ob) {
    const vals = ob.split('.').map(Number);
    s.orbs = {};
    MAJOR_ORDER.forEach((k, i) => { if (Number.isFinite(vals[i]) && vals[i] >= 0.5 && vals[i] <= 15) (s.orbs as Record<string, number>)[k] = vals[i]; });
  }
  if (sp.get('oos') === '0') s.outOfSign = false;
  const pen = Number(sp.get('pen'));
  if (Number.isFinite(pen) && pen > 0 && pen <= 1) s.oosPenalty = pen;
  const min = Number(sp.get('min'));
  if (Number.isFinite(min) && min > 0 && min <= 100) s.minStrength = min;
  const sc = sp.get('sc');
  if (sc === 'core' || sc === 'planets' || sc === 'asteroids') s.aspectScope = sc;
  if (sp.get('ts') === '1') s.trueSolar = true;
  const dp = sp.get('dp'); // 显示偏好: dir.cw / asc.top / 关掉的图层(逗号)
  if (dp) {
    const d: NonNullable<CastSettings['display']> = {};
    for (const tok of dp.split('.')) {
      if (tok === 'cw') d.dir = 'cw';
      else if (tok === 'top') d.ascPos = 'top';
      else if (tok === 'noasp') d.aspects = false;
      else if (tok === 'nofoot') d.feet = false;
      else if (tok === 'foot') d.feetAlways = true;
      else if (tok === 'nonum') d.nums = false;
      else if (tok === 'notick') d.ticks = false;
    }
    if (Object.keys(d).length) s.display = d;
  }
  return Object.keys(s).length ? s : undefined;
}

export function settingsToParams(s: CastSettings | undefined, p: URLSearchParams) {
  if (!s) return;
  if (s.bodies) {
    const b = s.bodies as Record<string, boolean>;
    const flags = ['asteroids', 'chiron', 'nodes', 'lots', 'lilith'].map((g) => (b[g] ? '1' : '0')).join('.');
    if (flags !== '0.0.0.0.0') p.set('bd', flags);
  }
  if (s.nodeType === 'mean') p.set('nd', 'mean');
  if (s.lilithType && s.lilithType !== 'mean') p.set('lil', s.lilithType);
  if (s.aspectTypes?.length) {
    const minor = s.aspectTypes.filter((x) => (MINOR_ASPECTS as readonly string[]).includes(x));
    if (minor.length) p.set('as', minor.join('.'));
  }
  if (s.orbs && Object.keys(s.orbs).length) {
    const vals = MAJOR_ORDER.map((k) => s.orbs?.[k] ?? DEFAULT_ORBS[k]).join('.');
    if (vals !== Object.values(DEFAULT_ORBS).join('.')) p.set('ob', vals);
  }
  if (s.outOfSign === false) p.set('oos', '0');
  if (s.oosPenalty) p.set('pen', String(s.oosPenalty));
  if (s.minStrength) p.set('min', String(s.minStrength));
  if (s.aspectScope && s.aspectScope !== 'all') p.set('sc', s.aspectScope);
  if (s.trueSolar) p.set('ts', '1');
  if (s.display) {
    const toks: string[] = [];
    if (s.display.dir === 'cw') toks.push('cw');
    if (s.display.ascPos === 'top') toks.push('top');
    if (s.display.aspects === false) toks.push('noasp');
    if (s.display.feet === false) toks.push('nofoot');
    if (s.display.feetAlways) toks.push('foot');
    if (s.display.nums === false) toks.push('nonum');
    if (s.display.ticks === false) toks.push('notick');
    if (toks.length) p.set('dp', toks.join('.'));
  }
}

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

export function paramsFromBirth(b: BirthData, settings?: CastSettings): string {
  const p = new URLSearchParams();
  settingsToParams(settings, p);
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
