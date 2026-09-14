'use client';

// ============================================================
// 底部状态区 Tab 排 (宫神星同款结构): 黄道状态 / 法达星限 / 小限法 / 福点·精神点 Aphesis
// 爸爸: 把下面也做成这样 (红箭头指 Tab 排)
// ============================================================
import { useState } from 'react';
import type { VChart, VPlanet } from '@/components/astro/ChartWheel';
import { SIGN_RULER, SIGN_EXALT, firdaria, profections, aphesisL1 } from '@/lib/astro/timing';

const SIGNS_ZH: Record<string, string> = {
  Aries: '白羊', Taurus: '金牛', Gemini: '双子', Cancer: '巨蟹', Leo: '狮子', Virgo: '处女',
  Libra: '天秤', Scorpio: '天蝎', Scorpius: '天蝎', Sagittarius: '射手', Capricorn: '摩羯',
  Aquarius: '水瓶', Pisces: '双鱼',
};
const SIGN_SYM = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const SIGN_ZH_BY_IDX = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
const PLANET_ZH: Record<string, string> = {
  Sun: '太阳', Moon: '月亮', Mercury: '水星', Venus: '金星', Mars: '火星', Jupiter: '木星', Saturn: '土星',
  NorthNode: '北交', SouthNode: '南交', Uranus: '天王星', Neptune: '海王星', Pluto: '冥王星',
};
const FALLBACK_SYM: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄',
  Uranus: '♅', Neptune: '♆', Pluto: '♇', NorthNode: '☊', SouthNode: '☋',
};
// 平均日行速度 (度/日, 通行值) — 附属状态"平均/快/慢"判定用
const AVG_SPEED: Record<string, number> = {
  Sun: 0.9856, Moon: 13.176, Mercury: 1.383, Venus: 1.602, Mars: 0.524,
  Jupiter: 0.0831, Saturn: 0.0335, Uranus: 0.0117, Neptune: 0.006, Pluto: 0.0039,
};
const norm = (d: number) => ((d % 360) + 360) % 360;
const signIdxOf = (lon: number) => Math.floor(norm(lon) / 30);
const dms = (deg: number) => `${Math.floor(deg)}°${String(Math.round((deg % 1) * 60)).padStart(2, '0')}′`;

export interface StatusTabsProps {
  chart: VChart;
  zhMode: boolean;
  selected: string | null;
  onSelect: (n: string | null) => void;
}

export default function StatusTabs({ chart, zhMode, selected, onSelect }: StatusTabsProps) {
  const [tab, setTab] = useState<'ecliptic' | 'firdaria' | 'profection' | 'aphesisF' | 'aphesisS'>('ecliptic');
  const T = (zh: string, en: string) => (zhMode ? zh : en);

  const symOf = (name: string | null | undefined): string => {
    if (!name) return '—';
    const p = chart.planets.find((x) => x.name === name);
    return p?.symbol ?? FALLBACK_SYM[name] ?? name.slice(0, 2);
  };
  const zhOf = (name: string): string => PLANET_ZH[name] ?? name;

  // 昼盘判定: 太阳落 7~12 宫 = 昼盘 (与引擎同口径)
  const sun = chart.planets.find((x) => x.name === 'Sun');
  const dayChart = !!sun?.house && sun.house >= 7;
  // 当前年龄 (近似: 未过生日差一岁)
  const curAge = Math.max(0, new Date().getFullYear() - chart.input.year);

  const cusps = chart.cusps;
  const hasHouses = chart.timeKnown && !!cusps;
  // 该星作为(庙/曜升)主星所管辖的宫位列表
  const rulingHouses = (name: string, table: (string | null)[]): number[] => {
    if (!hasHouses || !cusps) return [];
    const out: number[] = [];
    cusps.forEach((c, i) => { if (table[signIdxOf(c)] === name) out.push(i + 1); });
    return out;
  };
  // 尊贵总分 (庙5 旺4 三分3 界2 面1; 失势-5 落陷-4)
  const scoreOf = (p: VPlanet): number | null => {
    const si = signIdxOf(p.longitude);
    let s = 0;
    if (SIGN_RULER[si] === p.name) s += 5;
    if (SIGN_EXALT[si] === p.name) s += 4;
    if (p.triplicity?.active === p.name) s += 3;
    if (p.term === p.name) s += 2;
    if (p.face === p.name) s += 1;
    if (p.dignity?.state === 'Detriment') s -= 5;
    if (p.dignity?.state === 'Fall') s -= 4;
    return s;
  };
  const statusBits = (p: VPlanet): string[] => {
    const bits: string[] = [];
    if (p.kind === 'planet' || AVG_SPEED[p.name]) {
      const avg = AVG_SPEED[p.name];
      if (avg && p.speed !== undefined) {
        const r = Math.abs(p.speed) / avg;
        if (r > 1.2) bits.push(T('快行', 'fast'));
        else if (r < 0.8) bits.push(T('慢行', 'slow'));
        else bits.push(T('平均', 'avg'));
      }
    }
    // 得时/失时 (简化: 星派 × 盘 × 地平线上)
    const above = !!p.house && p.house >= 7;
    const nightParty = p.name === 'Moon' || p.name === 'Venus' || p.name === 'Mars';
    const dayParty = p.name === 'Sun' || p.name === 'Jupiter' || p.name === 'Saturn';
    if (p.house) {
      if (p.name === 'Mercury') { if (above) bits.push(T('得时', 'hayz')); else bits.push(T('失时', 'out')); }
      else if (dayParty) { if (dayChart === above) bits.push(T('得时', 'hayz')); else bits.push(T('失时', 'out')); }
      else if (nightParty) { if (dayChart !== above) bits.push(T('得时', 'hayz')); else bits.push(T('失时', 'out')); }
    }
    // 东出(晨星, 黄经落后太阳) / 西入(昏星); 太阳自身不标
    if (sun && p.name !== 'Sun' && (p.kind === 'planet' || AVG_SPEED[p.name])) {
      const d = norm(sun.longitude - p.longitude);
      if (d < 180) bits.push(T('东出', 'E')); else bits.push(T('西入', 'W'));
    }
    if ((chart.underBeams ?? []).includes(p.name)) bits.push(T('在日光下', 'beams'));
    if (p.retrograde) bits.push(T('逆行', 'Rx'));
    return bits;
  };

  const rows: VPlanet[] = [...chart.planets, chart.angles.ascendant, chart.angles.midheaven].filter(Boolean) as VPlanet[];

  // ---- 法达星限 ----
  const fird = firdaria(dayChart);
  // ---- 小限法 ----
  const ascSignIdx = chart.angles.ascendant ? signIdxOf(chart.angles.ascendant.longitude) : 0;
  const profs = profections(ascSignIdx, 75);
  // ---- Aphesis ----
  // 福点/精神点在 chart.planets 中 (引擎将 lots 并入天体列表, 开启「点位」后有)
  const lotF = chart.planets.find((l) => l.name === 'Part of Fortune');
  const lotS = chart.planets.find((l) => l.name === 'Part of Spirit');
  const aphF = lotF ? aphesisL1(signIdxOf(lotF.longitude)) : null;
  const aphS = lotS ? aphesisL1(signIdxOf(lotS.longitude)) : null;

  const tabBtn = (id: typeof tab, label: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className={`rounded-full px-3.5 py-1.5 text-[11px] tracking-[0.12em] transition-colors ${tab === id ? 'border border-accent/50 bg-accent/[0.08] text-accent' : 'border border-white/[0.1] text-muted hover:border-white/25'}`}
    >
      {label}
    </button>
  );

  const thCls = 'px-2.5 py-2 font-normal';
  const tdCls = 'px-2.5 py-1.5 whitespace-nowrap';

  return (
    <div>
      {/* Tab 排 */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {tabBtn('ecliptic', T('黄道状态', 'Ecliptic Status'))}
        {tabBtn('firdaria', T('法达星限', 'Firdaria'))}
        {tabBtn('profection', T('小限法', 'Profections'))}
        {tabBtn('aphesisF', T('福点 Aphesis', 'Fortune Aphesis'))}
        {tabBtn('aphesisS', T('精神点 Aphesis', 'Spirit Aphesis'))}
      </div>

      {/* ============ 黄道状态 ============ */}
      {tab === 'ecliptic' && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] tracking-[0.15em] text-muted uppercase">
                <th className={thCls}>{T('星体', 'Body')}</th>
                <th className={thCls}>{T('黄经度数', 'Longitude')}</th>
                <th className={thCls}>{T('落宫', 'House')}</th>
                <th className={thCls}>{T('守护宫', 'Rules')}</th>
                <th className={thCls}>{T('曜升宫', 'Exalts')}</th>
                <th className={`${thCls} text-center`} colSpan={8}>{T('先天黄道状态', 'Essential Dignities')}</th>
                <th className={thCls}>{T('附属状态', 'Accidental')}</th>
              </tr>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] tracking-[0.12em] text-muted/80 uppercase">
                <th className={thCls} colSpan={5} />
                <th className={`${thCls} text-center`}>{T('本垣', 'Dom')}</th>
                <th className={`${thCls} text-center`}>{T('曜升', 'Exa')}</th>
                <th className={`${thCls} text-center`}>{T('三分', 'Tri')}</th>
                <th className={`${thCls} text-center`}>{T('界', 'Bnd')}</th>
                <th className={`${thCls} text-center`}>{T('十度', 'Dec')}</th>
                <th className={`${thCls} text-center`}>{T('陷', 'Det')}</th>
                <th className={`${thCls} text-center`}>{T('落', 'Fal')}</th>
                <th className={`${thCls} text-center`}>{T('分数', 'Score')}</th>
                <th className={thCls} />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const si = signIdxOf(p.longitude);
                const isAxis = p.name === 'Ascendant' || p.name === 'Midheaven';
                const sc = isAxis ? null : scoreOf(p);
                const bits = isAxis ? [] : statusBits(p);
                const isSel = selected === p.name;
                return (
                  <tr
                    key={p.name}
                    onClick={() => onSelect(isSel ? null : p.name)}
                    className={`cursor-pointer border-b border-white/[0.04] transition-colors last:border-0 ${isSel ? 'bg-accent/[0.07]' : 'hover:bg-white/[0.03]'}`}
                  >
                    <td className={`${tdCls} text-frost/90`}><span className="mr-1.5 text-accent/80">{p.symbol}</span>{p.zh}</td>
                    <td className={`${tdCls} text-muted tabular-nums`}>{dms(p.degInSign)} <span className="text-accent/70">{SIGN_SYM[si]}</span></td>
                    <td className={`${tdCls} text-muted`}>{p.house ?? '—'}</td>
                    <td className={`${tdCls} text-muted`}>{(() => { const h = rulingHouses(p.name, SIGN_RULER); return h.length ? h.join(' ') : '—' })()}</td>
                    <td className={`${tdCls} text-muted`}>{(() => { const h = rulingHouses(p.name, SIGN_EXALT); return h.length ? h.join(' ') : '—' })()}</td>
                    <td className={`${tdCls} text-center text-frost/85`}>{symOf(SIGN_RULER[si])}</td>
                    <td className={`${tdCls} text-center text-frost/75`}>{symOf(SIGN_EXALT[si])}</td>
                    <td className={`${tdCls} text-center text-frost/75`}>{p.triplicity ? symOf(p.triplicity.active) : '—'}</td>
                    <td className={`${tdCls} text-center text-frost/75`}>{p.term ? symOf(p.term) : '—'}</td>
                    <td className={`${tdCls} text-center text-frost/75`}>{p.face ? symOf(p.face) : '—'}</td>
                    <td className={`${tdCls} text-center`}>{p.dignity?.state === 'Detriment' ? <span className="text-[#e8a08a]">{p.symbol}</span> : <span className="text-muted/30">—</span>}</td>
                    <td className={`${tdCls} text-center`}>{p.dignity?.state === 'Fall' ? <span className="text-[#e8a08a]">{p.symbol}</span> : <span className="text-muted/30">—</span>}</td>
                    <td className={`${tdCls} text-center tabular-nums ${sc === null ? 'text-muted/50' : sc > 0 ? 'text-[#cdb88a]' : sc < 0 ? 'text-[#e8a08a]' : 'text-muted'}`}>
                      {sc === null ? 'N/A' : sc === 0 && (p.dignity?.state === 'Peregrine' || !p.dignity) ? '0 P' : `${sc > 0 ? '+' : ''}${sc}`}
                    </td>
                    <td className={`${tdCls} text-[11px] text-muted/80`}>
                      {isAxis ? <span className="text-muted/50">N/A</span> : (bits.length ? bits.join(' · ') : '—')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-1.5 text-[10px] text-muted/50">
            {T('守护宫/曜升宫=该星作为(庙/曜升)主星管辖的宫头宫位; 分数: 庙+5 旺+4 三分+3 界+2 面+1, 失势-5 落陷-4, 0分游走=0 P; 得时/失时=简化判定(星派×半球)', 'Rules/Exalted=house cusps this planet rules; Score: dom+5 exa+4 tri+3 bnd+2 dec+1, detr-5 fall-4; 0 P=peregrine')}
          </p>
        </div>
      )}

      {/* ============ 法达星限 ============ */}
      {tab === 'firdaria' && (
        <div>
          <p className="mb-2 text-[11px] text-muted/70">
            {T(`法达星限 (${dayChart ? '昼生盘' : '夜生盘'}序) — 每段掌限主星与年龄段, 总 75 年`, `Firdaria (${dayChart ? 'day' : 'night'} chart) — 75-year planetary periods`)}
          </p>
          <table className="w-full max-w-[560px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] tracking-[0.15em] text-muted uppercase">
                <th className={thCls}>{T('序', 'No.')}</th>
                <th className={thCls}>{T('主星', 'Lord')}</th>
                <th className={thCls}>{T('年数', 'Years')}</th>
                <th className={thCls}>{T('年龄', 'Age')}</th>
              </tr>
            </thead>
            <tbody>
              {fird.map((f, i) => {
                const cur = curAge >= f.startAge && curAge < f.endAge;
                return (
                  <tr key={i} className={`border-b border-white/[0.04] last:border-0 ${cur ? 'bg-accent/[0.07]' : ''}`}>
                    <td className={`${tdCls} text-muted/60`}>{i + 1}</td>
                    <td className={`${tdCls} text-frost/90`}>
                      <span className="mr-1.5 text-accent/80">{symOf(f.lord)}</span>{zhOf(f.lord)}
                      {cur ? <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">{T('当前', 'now')}</span> : null}
                    </td>
                    <td className={`${tdCls} text-muted tabular-nums`}>{f.years}</td>
                    <td className={`${tdCls} text-muted tabular-nums`}>{f.startAge}–{f.endAge} {T('岁', 'y')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ============ 小限法 ============ */}
      {tab === 'profection' && (
        <div>
          <p className="mb-2 text-[11px] text-muted/70">
            {T('小限法 — 出生 ASC 所在宫为起点, 每岁推进一宫 (0 岁=1 宫)', 'Profections — annual house from ASC, advancing one house per year')}
          </p>
          <div className="max-h-[420px] overflow-y-auto rounded border border-white/[0.06]">
            <table className="w-full max-w-[560px] text-left text-[12px]">
              <thead className="sticky top-0 bg-[#0c101c]">
                <tr className="border-b border-white/[0.06] text-[10px] tracking-[0.15em] text-muted uppercase">
                  <th className={thCls}>{T('年龄', 'Age')}</th>
                  <th className={thCls}>{T('宫位', 'House')}</th>
                  <th className={thCls}>{T('星座', 'Sign')}</th>
                  <th className={thCls}>{T('年主星', 'Lord of Year')}</th>
                </tr>
              </thead>
              <tbody>
                {profs.map((x) => {
                  const cur = x.age === curAge;
                  return (
                    <tr key={x.age} className={`border-b border-white/[0.04] last:border-0 ${cur ? 'bg-accent/[0.07]' : ''}`}>
                      <td className={`${tdCls} text-muted tabular-nums`}>{x.age}</td>
                      <td className={`${tdCls} text-muted tabular-nums`}>{T(`${x.house} 宫`, `H${x.house}`)}</td>
                      <td className={`${tdCls} text-frost/80`}><span className="mr-1 text-accent/70">{SIGN_SYM[x.signIdx]}</span>{SIGN_ZH_BY_IDX[x.signIdx]}</td>
                      <td className={`${tdCls} text-frost/80`}><span className="mr-1.5 text-accent/80">{symOf(x.lord)}</span>{zhOf(x.lord)}{cur ? <span className="ml-2 text-[10px] text-accent">{T('当前', 'now')}</span> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ 福点 / 精神点 Aphesis ============ */}
      {(tab === 'aphesisF' || tab === 'aphesisS') && (() => {
        const lot = tab === 'aphesisF' ? lotF : lotS;
        const segs = tab === 'aphesisF' ? aphF : aphS;
        const lotName = tab === 'aphesisF' ? T('福点', 'Fortune') : T('精神点', 'Spirit');
        if (!lot || !segs) {
          return <p className="py-4 text-center text-[12px] text-muted/70">{T('此盘未包含点位 — 请在排盘设置「天体」中开启「点位」后重排', 'Lots not included in this chart — enable "Lots" in settings to cast')}</p>;
        }
        return (
          <div>
            <p className="mb-2 text-[11px] text-muted/70">
              {T(`${lotName} Aphesis (黄道释放) — 从${lotName}所在星座起按黄道推进, 每座年数=其主星小年 (日19/月25/水20/金8/火15/木12/土27-30)`, `${lotName} Aphesis (zodiacal releasing) — periods by sign rulership minor years`)}
              <span className="ml-2 text-muted/50">
                {T('起点', 'Start')}: <span className="text-accent/70">{SIGN_SYM[signIdxOf(lot.longitude)]}</span> {SIGN_ZH_BY_IDX[signIdxOf(lot.longitude)]}
              </span>
            </p>
            <table className="w-full max-w-[620px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] tracking-[0.15em] text-muted uppercase">
                  <th className={thCls}>{T('序', 'No.')}</th>
                  <th className={thCls}>{T('星座', 'Sign')}</th>
                  <th className={thCls}>{T('主星', 'Lord')}</th>
                  <th className={thCls}>{T('年数', 'Years')}</th>
                  <th className={thCls}>{T('年龄', 'Age')}</th>
                  <th className={thCls}>{T('起止年份', 'Years')}</th>
                </tr>
              </thead>
              <tbody>
                {segs.map((sg, i) => {
                  const cur = curAge >= sg.startAge && curAge < sg.endAge;
                  return (
                    <tr key={i} className={`border-b border-white/[0.04] last:border-0 ${cur ? 'bg-accent/[0.07]' : ''}`}>
                      <td className={`${tdCls} text-muted/60`}>{i + 1}</td>
                      <td className={`${tdCls} text-frost/85`}><span className="mr-1 text-accent/70">{SIGN_SYM[sg.signIdx]}</span>{SIGN_ZH_BY_IDX[sg.signIdx]}</td>
                      <td className={`${tdCls} text-frost/85`}><span className="mr-1.5 text-accent/80">{symOf(sg.lord)}</span>{zhOf(sg.lord)}</td>
                      <td className={`${tdCls} text-muted tabular-nums`}>{sg.years}</td>
                      <td className={`${tdCls} text-muted tabular-nums`}>{sg.startAge}–{sg.endAge} {T('岁', 'y')}</td>
                      <td className={`${tdCls} text-muted/80 tabular-nums`}>{chart.input.year + sg.startAge}–{chart.input.year + sg.endAge}{cur ? <span className="ml-2 text-[10px] text-accent">{T('当前', 'now')}</span> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}
