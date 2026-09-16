'use client';

// ============================================================
// 底部状态区 Tab 排 (宫神星同款结构): 黄道状态 / 法达星限 / 小限法 / 福点·精神点 Aphesis
// 爸爸: 把下面也做成这样 (红箭头指 Tab 排)
// ============================================================
import React, { useState } from 'react';
import { useI18n } from '@/i18n';
import type { VChart, VPlanet } from '@/components/astro/ChartWheel';
import { SIGN_RULER, SIGN_EXALT, firdariaTable, profections, zodiacalReleasing } from '@/lib/astro/timing';
import { FIXED_STARS, starConjunctions, starLonAt } from '@/lib/astro/fixed-stars';
import SignGlyph, { signColor } from '@/components/astro/SignGlyph';
// 法达大运主星色 (段首行上色; 单一来源 lib/astro/lord-colors.ts, 外环共用)
import { LORD_HEX } from '@/lib/astro/lord-colors'
import { PLANET_JA } from '@/lib/astro/i18n';

const SIGN_ZH_BY_IDX = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];

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
  const [tab, setTab] = useState<'ecliptic' | 'ecliptic2' | 'firdaria' | 'profection' | 'aphesisF' | 'aphesisS'>('ecliptic');
  const { lang } = useI18n();
  // 三语: 传了第三参数才用日文, 否则维持原两分支行为(未翻译处日文回退中文)
  const T = (zh: string, en: string, ja?: string) => (lang === 'ja' && ja ? ja : zhMode ? zh : en);

  const symOf = (name: string | null | undefined): string => {
    if (!name) return '—';
    const p = chart.planets.find((x) => x.name === name);
    return p?.symbol ?? FALLBACK_SYM[name] ?? ({ Ascendant: 'ASC', Descendant: 'DSC', Midheaven: 'MC', IC: 'IC' } as Record<string, string>)[name] ?? name.slice(0, 2);
  };

  // 昼盘判定: 太阳落 7~12 宫 = 昼盘 (与引擎同口径)
  const sun = chart.planets.find((x) => x.name === 'Sun');
  const dayChart = !!sun?.house && sun.house >= 7;
  // 当前年龄: 精确浮点 (含月日) + 整数版 (小限按岁)
  const curAgeExact = Math.max(0, (Date.now() - Date.UTC(chart.input.year, chart.input.month - 1, chart.input.day)) / (365.2425 * 86400000));
  const curAge = Math.floor(curAgeExact);

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
        if (r > 1.2) bits.push(T('快行', 'fast', '速い'));
        else if (r < 0.8) bits.push(T('慢行', 'slow', '遅い'));
        else bits.push(T('平均', 'avg', '平均'));
      }
    }
    // 得时/失时 (简化: 星派 × 盘 × 地平线上)
    const above = !!p.house && p.house >= 7;
    const nightParty = p.name === 'Moon' || p.name === 'Venus' || p.name === 'Mars';
    const dayParty = p.name === 'Sun' || p.name === 'Jupiter' || p.name === 'Saturn';
    if (p.house) {
      if (p.name === 'Mercury') { if (above) bits.push(T('得时', 'hayz', '順時')); else bits.push(T('失时', 'out', '逆時')); }
      else if (dayParty) { if (dayChart === above) bits.push(T('得时', 'hayz', '順時')); else bits.push(T('失时', 'out', '逆時')); }
      else if (nightParty) { if (dayChart !== above) bits.push(T('得时', 'hayz', '順時')); else bits.push(T('失时', 'out', '逆時')); }
    }
    // 东出(晨星, 黄经落后太阳) / 西入(昏星); 太阳自身不标
    if (sun && p.name !== 'Sun' && (p.kind === 'planet' || AVG_SPEED[p.name])) {
      const d = norm(sun.longitude - p.longitude);
      if (d < 180) bits.push(T('东出', 'E', '東出')); else bits.push(T('西入', 'W', '西入'));
    }
    if ((chart.underBeams ?? []).includes(p.name)) bits.push(T('在日光下', 'beams', '太陽下'));
    if (p.retrograde) bits.push(T('逆行', 'Rx', '逆行'));
    return bits;
  };

  const rows: VPlanet[] = [...chart.planets, chart.angles.ascendant, chart.angles.midheaven].filter(Boolean) as VPlanet[];

  // ---- 黄道状态-2: 宫位表 / 阿拉伯点表 / 恒星表 ----
  const lots = chart.arabicLots ?? [];
  const almuten = chart.cuspAlmuten ?? [];
  const cuspRows = hasHouses && cusps ? cusps.map((c, i) => {
    const cn = norm(c); const si = signIdxOf(cn);
    return { house: i + 1, lon: cn, si, dom: SIGN_RULER[si], exa: SIGN_EXALT[si], alm: almuten[i] ?? null };
  }) : [];
  const starBodies = [...chart.planets, chart.angles.ascendant, chart.angles.midheaven].filter(Boolean) as VPlanet[];
  const starRows = FIXED_STARS.map((s) => ({
    s, lon: starLonAt(s, chart.input.year), conj: starConjunctions(s, chart.input.year, starBodies),
  })).filter((x) => x.conj.length > 0);

  // ---- 法达星限 (Abu Ma'shar 二级: 每主段7子段+交点不细分, 循环2轮=150年) ----
  const firdRows = firdariaTable(dayChart, chart.input.year, chart.input.month, chart.input.day, 2);
  const FIRD_COLS = 6;
  const firdPerCol = Math.ceil(firdRows.length / FIRD_COLS);
  // ---- 小限法 (宫神星同款: 6栏 年|宫|主星, 自出生年起 101 年) ----
  const ascSignIdx = chart.angles.ascendant ? signIdxOf(chart.angles.ascendant.longitude) : 0;
  const profs = profections(ascSignIdx, 100);
  const PROF_COLS = 6;
  const profPerCol = Math.ceil(profs.length / PROF_COLS);
  // ---- Aphesis ----
  // 福点/精神点在 chart.planets 中 (引擎将 lots 并入天体列表, 开启「点位」后有)
  const lotF = chart.planets.find((l) => l.name === 'Part of Fortune');
  const lotS = chart.planets.find((l) => l.name === 'Part of Spirit');
  // ---- Aphesis / 黄道释放 (宫神星同款二级表: 360天年 30天月, 走满12座解链跳对宫) ----
  const zrF = lotF ? zodiacalReleasing(signIdxOf(lotF.longitude), chart.input.year, chart.input.month, chart.input.day, 100) : null;
  const zrS = lotS ? zodiacalReleasing(signIdxOf(lotS.longitude), chart.input.year, chart.input.month, chart.input.day, 100) : null;
  const ZR_COLS = 6;
  const curDays = (Date.now() - Date.UTC(chart.input.year, chart.input.month - 1, chart.input.day)) / 86400000;

  const tabBtn = (id: typeof tab, label: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className={`rounded-full px-3.5 py-1.5 text-[11px] tracking-[0.12em] transition-colors ${tab === id ? 'border border-accent/50 bg-accent/[0.08] text-accent' : 'border border-white/[0.1] text-muted hover:border-white/25'}`}
    >
      {label}
    </button>
  );

  const thCls = 'px-3 py-2.5 font-normal';
  const tdCls = 'px-3 py-2 whitespace-nowrap';

  return (
    <div>
      {/* Tab 排 */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {tabBtn('ecliptic', T('黄道状态', 'Ecliptic Status', '黄道ステータス'))}
        {tabBtn('ecliptic2', T('黄道状态-2', 'Ecliptic Status 2', '黄道ステータス2'))}
        {tabBtn('firdaria', T('法达星限', 'Firdaria', 'ファルダリア'))}
        {tabBtn('profection', T('小限法', 'Profections', 'プロフェクション'))}
        {tabBtn('aphesisF', T('福点 Aphesis', 'Fortune Aphesis', 'フォーチュン・アフェシス'))}
        {tabBtn('aphesisS', T('精神点 Aphesis', 'Spirit Aphesis', 'スピリット・アフェシス'))}
      </div>

      {/* ============ 黄道状态 ============ */}
      {tab === 'ecliptic' && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] tracking-[0.15em] text-muted uppercase">
                <th className={thCls}>{T('星体', 'Body', '星体')}</th>
                <th className={thCls}>{T('黄经度数', 'Longitude', '黄経度数')}</th>
                <th className={thCls}>{T('落宫', 'House', 'ハウス')}</th>
                <th className={thCls}>{T('守护宫', 'Rules', '支配宮')}</th>
                <th className={thCls}>{T('曜升宫', 'Exalts', 'エグザルテーション宮')}</th>
                <th className={`${thCls} text-center`} colSpan={8}>{T('先天黄道状态', 'Essential Dignities', '先天ディグニティ')}</th>
                <th className={thCls}>{T('附属状态', 'Accidental', 'アクシデンタル')}</th>
              </tr>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] tracking-[0.12em] text-muted/80 uppercase">
                <th className={thCls} colSpan={5} />
                <th className={`${thCls} text-center`}>{T('本垣', 'Dom', '本垣')}</th>
                <th className={`${thCls} text-center`}>{T('曜昇', 'Exa', '曜昇')}</th>
                <th className={`${thCls} text-center`}>{T('三分', 'Tri', '三分')}</th>
                <th className={`${thCls} text-center`}>{T('界', 'Bnd', '界')}</th>
                <th className={`${thCls} text-center`}>{T('十度', 'Dec', '十度')}</th>
                <th className={`${thCls} text-center`}>{T('陷', 'Det', '陷')}</th>
                <th className={`${thCls} text-center`}>{T('落', 'Fal', '落')}</th>
                <th className={`${thCls} text-center`}>{T('分数', 'Score', '分数')}</th>
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
                    <td className={`${tdCls} text-frost/90`}><span className="mr-1.5 text-accent/80">{p.symbol}</span>{lang === 'ja' ? (PLANET_JA[p.name] ?? p.zh) : zhMode ? p.zh : p.name}</td>
                    <td className={`${tdCls} text-muted tabular-nums`}><span className="inline-block w-[3.5em] text-right">{dms(p.degInSign)}</span><SignGlyph si={si} color={signColor(si)} className="ml-1.5" /></td>
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
            {T('守护宫/曜升宫=该星作为(庙/曜升)主星管辖的宫头宫位; 分数: 庙+5 旺+4 三分+3 界+2 面+1, 失势-5 落陷-4, 0分游走=0 P; 得时/失时=简化判定(星派×半球)', 'Rules/Exalted=house cusps this planet rules; Score: dom+5 exa+4 tri+3 bnd+2 dec+1, detr-5 fall-4; 0 P=peregrine', 'ルーラー/エグザルト=その星が(ドミサイル/エグザルテーションとして)支配するハウスのカスプ; スコア: ドミサイル+5 エグザルテーション+4 トリプリシティ+3 ターム+2 フェイス+1, デトリメント-5 フォール-4, 0点=ペレグリン; 順時/逆時=簡易判定(星派×半球)')}
          </p>
        </div>
      )}

      {/* ============ 黄道状态-2 (宫位表/阿拉伯点/恒星, 宫神星同款) ============ */}
      {tab === 'ecliptic2' && (
        <div className="grid items-start gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          {/* 宫位表 */}
          <div>
            <p className="mb-1.5 text-[11px] tracking-[0.2em] text-muted/75">{T('宫位表', 'HOUSES', '宮位表')}</p>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] tracking-[0.15em] text-muted uppercase">
                  <th className={thCls}>{T('宮', 'House', '宮')}</th>
                  <th className={thCls}>{T('黄经度数', 'Longitude', '黄経度数')}</th>
                  <th className={`${thCls} text-center`}>{T('本垣', 'Dom', '本垣')}</th>
                  <th className={`${thCls} text-center`}>{T('曜昇', 'Exa', '曜昇')}</th>
                  <th className={`${thCls} text-center`}>{T('宫神星', 'Almuten', '宮神星')}</th>
                </tr>
              </thead>
              <tbody>
                {cuspRows.length === 0 ? (
                  <tr><td className={`${tdCls} text-muted/60`} colSpan={5}>{T('时间未知, 无宫位', 'No houses (unknown time)', '時間不明、ハウスなし')}</td></tr>
                ) : cuspRows.map((r) => (
                  <tr key={r.house} className="border-b border-white/[0.04] last:border-0">
                    <td className={`${tdCls} text-muted`}>{r.house}</td>
                    <td className={`${tdCls} text-muted tabular-nums`}><span className="inline-block w-[3.5em] text-right">{dms(r.lon % 30)}</span><SignGlyph si={r.si} color={signColor(r.si)} className="ml-1.5" /></td>
                    <td className={`${tdCls} text-center text-frost/85`}>{symOf(r.dom)}</td>
                    <td className={`${tdCls} text-center text-frost/75`}>{r.exa ? symOf(r.exa) : <span className="text-muted/30">—</span>}</td>
                    <td className={`${tdCls} text-center text-frost/85`}>{r.alm ? symOf(r.alm) : <span className="text-muted/30">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1.5 max-w-[380px] text-[10px] text-muted/50">
              {T('宫神星 = 宫头度数的尊贵计分最强主星 (庙5 旺4 三分3 界2 面1, 平分取高类别)', 'Almuten = strongest essential-dignity ruler of the cusp degree (5/4/3/2/1)', 'アルムテン = カスプ度数の本質的尊貴で最も強い主星（ドミサイル5 エグザルテーション4 トリプリシティ3 ターム2 フェイス1、同点は上位カテゴリを採用）')}
            </p>
          </div>
          {/* 阿拉伯点表 */}
          <div>
            <p className="mb-1.5 text-[11px] tracking-[0.2em] text-muted/75">{T('阿拉伯点', 'ARABIC LOTS', 'アラビック・ロッツ')}</p>
            <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] tracking-[0.15em] text-muted uppercase">
                    <th className={thCls}>{T('阿拉伯点', 'Arabic Lot', 'アラビック・ロット')}</th>
                    <th className={thCls}>{T('黄经度数', 'Longitude', '黄経度数')}</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.length === 0 ? (
                    <tr><td className={`${tdCls} text-muted/60`} colSpan={2}>{T('时间未知, 无法计算', 'Requires birth time', '時間不明、計算不可')}</td></tr>
                  ) : lots.map((l) => (
                    <tr key={l.key} className="border-b border-white/[0.04] last:border-0">
                      <td className={`${tdCls} text-frost/85`}>{lang === 'ja' ? (l.ja ?? l.en) : zhMode ? l.zh : l.en}</td>
                      <td className={`${tdCls} text-muted tabular-nums`}><span className="inline-block w-[3.5em] text-right">{dms(l.longitude % 30)}</span><SignGlyph si={signIdxOf(l.longitude)} color={signColor(signIdxOf(l.longitude))} className="ml-1.5" /><span className="ml-2 text-muted/50">({l.longitude.toFixed(2)}°)</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          {/* 恒星表 */}
          <div>
            <p className="mb-1.5 text-[11px] tracking-[0.2em] text-muted/75">{T('恒星', 'FIXED STARS', '恒星')}</p>
            <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] tracking-[0.15em] text-muted uppercase">
                    <th className={thCls}>{T('恒星', 'Fixed Star', '恒星')}</th>
                    <th className={thCls}>{T('黄经度数', 'Longitude', '黄経度数')}</th>
                    <th className={thCls}>{T('合相', 'Conj', '合')}</th>
                  </tr>
                </thead>
                <tbody>
                  {starRows.length === 0 ? (
                    <tr><td className={`${tdCls} text-muted/60`} colSpan={3}>{T('本盘无明显恒星合相 (±2°)', 'No notable star conjunctions (±2°)', '本図に顕著な恒星合（±2°）なし')}</td></tr>
                  ) : starRows.map(({ s, lon, conj }) => (
                    <tr key={s.en} className="border-b border-white/[0.04] last:border-0">
                      <td className={`${tdCls} text-frost/85`} title={s.en}>{lang === 'ja' ? s.ja : zhMode ? s.zh : s.en}</td>
                      <td className={`${tdCls} text-muted tabular-nums`}><span className="inline-block w-[3.5em] text-right">{dms(lon % 30)}</span><SignGlyph si={signIdxOf(lon)} color={signColor(signIdxOf(lon))} className="ml-1.5" /></td>
                      <td className={`${tdCls} text-frost/85`}>{conj.map((n) => symOf(n)).join(' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1.5 max-w-[420px] text-[10px] text-muted/50">
                {T('恒星黄经含出生年岁差; 列出与星体/四轴合相 ≤2° 的传统亮星 (共 17 颗库)', 'Star longitudes include precession to birth year; conjunctions within 2° with bodies/axes', '恒星の黄経は出生年の歳差を含む; 星体・4軸と2°以内に合する伝統的亮星を列挙（計17星）')}
              </p>
          </div>
        </div>
      )}

      {/* ============ 法达星限 (宫神星同款: 6栏二级表 主|次|起始日期, Abu Ma'shar 细分) ============ */}
      {tab === 'firdaria' && (
        <div>
          <p className="mb-2 text-[11px] text-muted/70">
            {T(`法达星限 (${dayChart ? '昼生盘' : '夜生盘'}序) — 每主段平分 7 个子段, 第 1 子段=主星自己, 之后按迦勒底序轮转; 交点不细分; 75 年一轮, 循环 2 轮`, `Firdaria (${dayChart ? 'diurnal' : 'nocturnal'}) — each period splits into 7 equal sub-periods starting from the lord itself; nodes do not subdivide; 75-year cycle repeated`, `ファルダリア（${dayChart ? '昼生盤' : '夜生盤'}序）— 各主期は7つの等しい子期に分割, 第1子期=主星自身, 以降はカルデアン順で輪転; 交点は細分せず; 75年で1巡, 2巡繰り返し`)}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] tracking-[0.15em] text-muted uppercase">
                  {Array.from({ length: FIRD_COLS }, (_, c) => (
                    <React.Fragment key={c}>
                      <th className={`${thCls} text-center ${c > 0 ? 'border-l border-dashed border-white/[0.12]' : ''}`}>{T('主', 'Lord', '主')}</th>
                      <th className={`${thCls} text-center`}>{T('次', 'Sub', '次')}</th>
                      <th className={thCls}>{T('起始日期', 'Start', '開始日')}</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: firdPerCol }, (_, r) => (
                  <tr key={r} className="border-b border-white/[0.04] last:border-0">
                    {Array.from({ length: FIRD_COLS }, (_, c) => {
                      const item = firdRows[c * firdPerCol + r];
                      if (!item) return <td key={c} colSpan={3} />;
                      const isNow = curAgeExact >= item.startAge && curAgeExact < item.endAge;
                      // 大运起点 (主=次, 或交点整段): 次列不再重复符号, 行按大运主星上色 — 爸爸: 同大运同小运用一个符号, 上点色区分大运阶段
                      const isStart = !item.sub || item.sub === item.lord;
                      const lordColor = LORD_HEX[item.lord] ?? '#9aa3b5';
                      const cellStyle = isNow
                        ? { background: 'rgba(217,168,184,0.13)' }
                        : isStart ? { background: lordColor + '14' } : undefined;
                      const dateStyle = isNow
                        ? { background: 'rgba(217,168,184,0.13)', color: '#d9a8b8' }
                        : isStart ? { background: lordColor + '14', color: lordColor } : undefined;
                      const dateStr = `${item.y}-${String(item.m).padStart(2, '0')}-${String(item.d).padStart(2, '0')}`;
                      return (
                        <React.Fragment key={c}>
                          <td colSpan={isStart ? 2 : undefined} style={cellStyle} className={`${tdCls} text-center text-[15px] ${isNow ? 'text-accent' : isStart ? 'font-semibold text-frost' : 'text-frost/90'} ${c > 0 ? 'border-l border-dashed border-white/[0.12]' : ''}`}>{symOf(item.lord)}</td>
                          {!isStart && <td style={cellStyle} className={`${tdCls} text-center text-[15px] text-frost/75`}>{symOf(item.sub!)}</td>}
                          <td style={dateStyle} className={`${tdCls} tabular-nums ${isNow ? 'text-accent' : isStart ? '' : 'text-muted'}`}>
                            {dateStr}{isNow ? <span className="ml-1.5 text-[10px] text-accent">{T('当前', 'now', '現在')}</span> : null}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[10px] text-muted/50">
            {T('「主」=一级掌限 75 年序; 「次」=主段内 7 等分子段 (Abu Ma\'shar 法: 第 1 子段=主星自己, 其余按迦勒底序); 日期按真实年 365.2425 天自出生推算; 每栏自上往下、栏间自左往右顺序阅读', 'Lord=level-1 period lord (75-year cycle); Sub=equal seventh sub-period (Abu Ma\'shar: first sub = lord itself, then Chaldean order); dates at real years 365.2425 days', '「主」=第1級の期主（75年周期）; 「次」=主期を7等分した子期（Abu Ma\'shar 法: 第1子期=主星自身, 以降はカルデアン順）; 日付は実年365.2425日で出生から推算; 各欄は上から下へ、欄間は左から右へ読む')}
          </p>
        </div>
      )}

      {/* ============ 小限法 (宫神星同款: 6栏 年|宫|主星) ============ */}
      {tab === 'profection' && (
        <div>
          <p className="mb-2 text-[11px] text-muted/70">
            {T('小限法（该年生日起限）— 出生年为 1 宫, 每年生日推进一宫, 12 年一循环; 「主星」=该宫宫头星座的庙主星', 'Annual profections — 1st house at birth, advancing one house each birthday; Lord = domicile ruler of the profected sign', 'プロフェクション（生年誕生日から起算）— 出生年を1ハウスとし, 毎年誕生日に1ハウス進む, 12年で1巡; 「主星」=そのハウス頭サインのドミサイル主星')}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] tracking-[0.15em] text-muted uppercase">
                  {Array.from({ length: PROF_COLS }, (_, c) => (
                    <React.Fragment key={c}>
                      <th className={`${thCls} ${c > 0 ? 'border-l border-dashed border-white/[0.12]' : ''}`}>{T('年', 'Year', '年')}</th>
                      <th className={`${thCls} text-center`}>{T('宮', 'House', '宮')}</th>
                      <th className={`${thCls} text-center`}>{T('主星', 'Lord', '主星')}</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: profPerCol }, (_, r) => (
                  <tr key={r} className="border-b border-white/[0.04] last:border-0">
                    {Array.from({ length: PROF_COLS }, (_, c) => {
                      const item = profs[c * profPerCol + r];
                      if (!item) return <td key={c} colSpan={3} />;
                      const isNow = item.age === curAge;
                      const bg = isNow ? { background: 'rgba(217,168,184,0.13)' } : undefined;
                      const yearStr = chart.input.year + item.age;
                      return (
                        <React.Fragment key={c}>
                          <td style={bg} className={`${tdCls} tabular-nums ${isNow ? 'text-accent' : 'text-muted'} ${c > 0 ? 'border-l border-dashed border-white/[0.12]' : ''}`}>
                            {yearStr}{isNow ? <span className="ml-1.5 text-[10px] text-accent">{T('当前', 'now', '現在')}</span> : null}
                          </td>
                          <td style={bg} className={`${tdCls} text-center tabular-nums ${isNow ? 'text-accent' : 'text-frost/85'}`}>{item.house}</td>
                          <td style={bg} className={`${tdCls} text-center text-[15px] ${isNow ? 'text-accent' : 'text-frost/90'}`}>{symOf(item.lord)}</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ 福点 / 精神点 Aphesis (宫神星同款: 6栏 主|次|起始日期) ============ */}
      {(tab === 'aphesisF' || tab === 'aphesisS') && (() => {
        const lot = tab === 'aphesisF' ? lotF : lotS;
        const segs = tab === 'aphesisF' ? zrF : zrS;
        const lotName = tab === 'aphesisF' ? T('福点', 'Fortune', 'フォーチュン') : T('精神点', 'Spirit', 'スピリット');
        if (!lot || !segs) {
          return <p className="py-4 text-center text-[12px] text-muted/70">{T('此盘未包含点位 — 请在排盘设置「天体」中开启「点位」后重排', 'Lots not included in this chart — enable "Lots" in settings to cast', '本図はロットを含まず — 設定の「天体」で「ロット」を有効にして再作成してください')}</p>;
        }
        const perCol = Math.ceil(segs.length / ZR_COLS);
        return (
          <div>
            <p className="mb-2 text-[11px] text-muted/70">
              {T(`${lotName} Aphesis（黄道释放）— 主段自${lotName}星座起按黄道推进, 每段=主星小年(360天年); 子段按「月」推进(30天), 走满12星座后解链 LB 跳对宫`, `${lotName} Aphesis (zodiacal releasing) — L1 by minor years (360-day), L2 in months; LB after 12 signs`, `${lotName} アフェシス（黄道解放）— 主段は${lotName}の星座から黄道に沿って進行, 各段=主星の小年（360日年）; 子段は「月」で進行（30日）, 12星座を満たした後は解鎖 LB で向かい宮へ跳ぶ`)}
              <span className="ml-2 text-muted/60">
                {T('起点', 'Start', '起点')}: <SignGlyph si={signIdxOf(lot.longitude)} color={signColor(signIdxOf(lot.longitude))} /> {SIGN_ZH_BY_IDX[signIdxOf(lot.longitude)]}
              </span>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] tracking-[0.15em] text-muted uppercase">
                    {Array.from({ length: ZR_COLS }, (_, c) => (
                      <React.Fragment key={c}>
                        <th className={`${thCls} text-center ${c > 0 ? 'border-l border-dashed border-white/[0.12]' : ''}`}>{T('主', 'L1', '主')}</th>
                        <th className={`${thCls} text-center`}>{T('次', 'L2', '次')}</th>
                        <th className={thCls}>{T('起始日期', 'Date', '開始日')}</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: perCol }, (_, r) => (
                    <tr key={r} className="border-b border-white/[0.04] last:border-0">
                      {Array.from({ length: ZR_COLS }, (_, c) => {
                        const idx = c * perCol + r;
                        const item = segs[idx];
                        if (!item) return <td key={c} colSpan={3} />;
                        const next = segs[idx + 1];
                        const endDays = next ? next.startDays : item.startDays + 1e5;
                        const isNow = curDays >= item.startDays && curDays < endDays;
                        const isStart = item.subSign === item.lordSign;
                        const lordC = signColor(item.lordSign);
                        const bg = isNow ? { background: 'rgba(217,168,184,0.13)' } : isStart ? { background: lordC + '14' } : undefined;
                        const dateStr = `${item.y}-${String(item.m).padStart(2, '0')}-${String(item.d).padStart(2, '0')}`;
                        return (
                          <React.Fragment key={c}>
                            <td style={bg} colSpan={isStart ? 2 : undefined} className={`${tdCls} text-center ${c > 0 ? 'border-l border-dashed border-white/[0.12]' : ''}`}>
                              <SignGlyph si={item.lordSign} color={lordC} size={15} />
                            </td>
                            {!isStart && (
                              <td style={bg} className={`${tdCls} text-center`}>
                                <SignGlyph si={item.subSign} color={signColor(item.subSign)} size={15} />
                              </td>
                            )}
                            <td style={isNow ? { background: 'rgba(217,168,184,0.13)', color: '#d9a8b8' } : isStart ? { background: lordC + '14', color: lordC } : undefined} className={`${tdCls} tabular-nums ${isNow ? 'text-accent' : isStart ? '' : 'text-muted'}`}>
                              {dateStr}
                              {item.lb ? <span className="ml-1.5 text-[10px] text-[#cdb88a]">LB</span> : null}
                              {isNow ? <span className="ml-1.5 text-[10px] text-accent">{T('当前', 'now', '現在')}</span> : null}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
