// 中国出生地库 (public/astro/cn-cities.json): 省 → 市 → [区县, lat, lng]
// 懒加载 + 内存缓存; 结构由 scripts/build-cn-cities.py 自检保证
export interface CnDistrict { name: string; lat: number; lng: number }
export interface CnCity { name: string; districts: CnDistrict[] }
export interface CnProvince { name: string; cities: CnCity[] }

let _cache: CnProvince[] | null = null;
let _promise: Promise<CnProvince[]> | null = null;

export function loadCnCities(): Promise<CnProvince[]> {
  if (_cache) return Promise.resolve(_cache);
  if (_promise) return _promise;
  _promise = fetch('/astro/cn-cities.json')
    .then((r) => r.json())
    .then((raw: [string, [string, [string, number, number][]][]][]) => {
      const list: CnProvince[] = raw.map(([pname, cities]) => ({
        name: pname,
        cities: cities.map(([cname, ds]) => ({
          name: cname,
          districts: ds.map(([dname, lat, lng]) => ({ name: dname, lat, lng })),
        })),
      }));
      _cache = list;
      return list;
    });
  return _promise;
}
