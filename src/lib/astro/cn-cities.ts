// 中国出生地库 (public/astro/cn-cities.json): 省 → 市 → [区县, lat, lng]
// 懒加载 + 内存缓存; 结构由 scripts/build-cn-cities.py 自检保证
export interface CnDistrict { name: string; py: string; ja: string; lat: number; lng: number }
export interface CnCity { name: string; py: string; ja: string; districts: CnDistrict[] }
export interface CnProvince { name: string; py: string; ja: string; cities: CnCity[] }

interface CnI18nName { py: string; ja: string }

type CnCitiesRaw = [string, [string, [string, number, number][]][]][];
type CnCitiesI18n = Record<string, CnI18nName>;

let _cache: CnProvince[] | null = null;
let _promise: Promise<CnProvince[]> | null = null;

export function loadCnCities(): Promise<CnProvince[]> {
  if (_cache) return Promise.resolve(_cache);
  if (_promise) return _promise;
  _promise = Promise.all([
    fetch('/astro/cn-cities.json').then((r) => r.json() as Promise<CnCitiesRaw>),
    fetch('/astro/cn-cities-i18n.json').then((r) => r.json() as Promise<CnCitiesI18n>),
  ]).then(([raw, i18n]) => {
    const localized = (name: string): CnI18nName => i18n[name] ?? { py: name, ja: name };
    const list: CnProvince[] = raw.map(([pname, cities]) => {
      const pNames = localized(pname);
      return {
        name: pname,
        py: pNames.py,
        ja: pNames.ja,
        cities: cities.map(([cname, ds]) => {
          const cNames = localized(cname);
          return {
            name: cname,
            py: cNames.py,
            ja: cNames.ja,
            districts: ds.map(([dname, lat, lng]) => {
              const dNames = localized(dname);
              return { name: dname, py: dNames.py, ja: dNames.ja, lat, lng };
            }),
          };
        }),
      };
    });
    _cache = list;
    return list;
  });
  return _promise;
}
