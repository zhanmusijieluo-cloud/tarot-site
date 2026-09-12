'use client';

// ============================================================
// 本命盘结果展示 — 严格照宫神星信息分布 (暗金皮肤)
// 左上资料卡 · 左列行星竖列 · 左下相位网格(可切列表)
// 中央=星盘(绝对主角) · 右侧=特征面板(格局/尊贵/互溶接纳)
// 底部=黄道状态大表
// ============================================================
import { useState } from 'react';
import { useI18n } from '@/i18n';
import ChartWheel, { type VChart, type VPlanet } from '@/components/astro/ChartWheel';
import { HOUSE_SYSTEM_ZH } from '@/lib/astro/chart';
import AspectGrid, { AspectLegend, ASPECT_COLOR } from '@/components/astro/AspectGrid';

const DIGNITY_ZH: Record<string, string> = {
  Domicile: '入庙', Exalted: '耀升', Detriment: '失势', Fall: '落陷', Peregrine: '游走',
};
const RECEPTION_KIND_ZH: Record<string, string> = {
  domicile: '本垣', exaltation: '曜升', detriment: '失势', fall: '落陷',
};
const SIGNS_ZH_MINI: Record<string, string> = {
  Aries: '白羊', Taurus: '金牛', Gemini: '双子', Cancer: '巨蟹', Leo: '狮子', Virgo: '处女',
  Libra: '天秤', Scorpio: '天蝎', Scorpius: '天蝎', Sagittarius: '射手', Capricorn: '摩羯',
  Capricornus: '摩羯', Aquarius: '水瓶', Pisces: '双鱼',
};
const ELEMENT_ZH: Record<string, string> = { 火: '火象', 土: '土象', 风: '风象', 水: '水象' };
const signElement = (sign: string): string => {
  const i = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'].indexOf(sign);
  return ['火', '土', '风', '水'][i < 0 ? 0 : i % 4];
};

// 度°分′ 显示 (学宫神星: 精确到分)
const dms = (degInSign: number) => {
  const d = Math.floor(degInSign);
  const m = Math.round((degInSign - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}′`;
};

function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-white/[0.07] bg-black/20 ${className}`}>
      <p className="border-b border-white/[0.06] px-3 py-2 text-[10px] tracking-[0.25em] text-muted uppercase">{title}</p>
      {children}
    </section>
  );
}

export default function ChartResult({ chart, zhMode, aspectMode: modeProp, onAspectMode }: {
  chart: VChart; zhMode: boolean;
  /** 相位区模式受控于页面 URL (ag=grid); 不传则内部自管 */
  aspectMode?: 'list' | 'grid';
  onAspectMode?: (m: 'list' | 'grid') => void;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  void modeProp; void onAspectMode; // 矩阵与清单同屏后不再需要切换 (URL ag 参数保留兼容旧链接)
  const zhOf = (name: string) => chart.planets.find((p) => p.name === name)?.zh ?? name;
  const sz = (s: string) => SIGNS_ZH_MINI[s] ?? s;

  const sun = chart.planets.find((p) => p.name === 'Sun');
  const moon = chart.planets.find((p) => p.name === 'Moon');
  const asc = chart.angles.ascendant, mc = chart.angles.midheaven;

  // ---- 左列行星竖列 ----
  const rows: VPlanet[] = [...chart.planets, asc, mc].filter(Boolean) as VPlanet[];

  // ---- 右侧特征面板 ----
  const features: { icon: string; text: string; tone: 'gold' | 'soft' | 'warn' }[] = [];
  if (sun) features.push({ icon: '☉', text: zhMode ? `太阳 ${sz(sun.sign)} ${dms(sun.degInSign)}${sun.house ? ` · 第${sun.house}宫` : ''}` : `Sun in ${sun.sign}`, tone: 'gold' });
  if (moon) features.push({ icon: '☽', text: zhMode ? `月亮 ${sz(moon.sign)} ${dms(moon.degInSign)}${moon.house ? ` · 第${moon.house}宫` : ''}` : `Moon in ${moon.sign}`, tone: 'gold' });
  if (asc) features.push({ icon: 'AC', text: zhMode ? `上升 ${sz(asc.sign)} ${dms(asc.degInSign)}` : `ASC ${asc.sign}`, tone: 'gold' });
  if (mc) features.push({ icon: 'MC', text: zhMode ? `中天 ${sz(mc.sign)} ${dms(mc.degInSign)}` : `MC ${mc.sign}`, tone: 'gold' });
  // 尊贵要点
  for (const p of chart.planets) {
    if (p.dignity && p.dignity.state !== 'Peregrine') {
      features.push({
        icon: p.symbol, tone: p.dignity.strength > 0 ? 'soft' : 'warn',
        text: zhMode ? `${p.zh} ${DIGNITY_ZH[p.dignity.state] ?? p.dignity.state}${p.retrograde ? ' · 逆行' : ''}` : `${p.name} ${p.dignity.state}`,
      });
    }
  }
  // 互溶 · 接纳 (互溶对只列一次)
  const recepLines: string[] = [];
  {
    const seen = new Set<string>();
    for (const r of chart.receptions) {
      const key = [r.a, r.b].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const kind = RECEPTION_KIND_ZH[r.kind] ?? r.kind;
      if (r.mutual) {
        const rev = chart.receptions.find((x) => x.a === r.b && x.b === r.a);
        recepLines.push(zhMode ? `${zhOf(r.a)} 与 ${zhOf(r.b)} 互容接纳（${sz(r.bySign)}/${sz(rev?.bySign ?? '')}）` : `${r.a} ↔ ${r.b} mutual`);
      } else {
        recepLines.push(zhMode ? `${zhOf(r.a)} 被 ${zhOf(r.b)} 接纳（${kind} · ${sz(r.bySign)}）` : `${r.a} received by ${r.b}`);
      }
    }
  }
  for (const l of recepLines) features.push({ icon: '⇄', text: l, tone: 'soft' });

  // ---- 出生资料卡 (宫神星左上卡同款行式) ----
  const fmtDeg = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`
  const hr = chart.hourRuler ? chart.planets.find((x) => x.name === chart.hourRuler) : null
  const infoRows: [string, React.ReactNode][] = [
    [zhMode ? '日期' : 'Date', `${chart.input.year}-${String(chart.input.month).padStart(2, '0')}-${String(chart.input.day).padStart(2, '0')} ${chart.timeKnown ? `${String(chart.input.hour).padStart(2, '0')}:${String(chart.input.minute).padStart(2, '0')}` : (zhMode ? '时间未知' : 'unknown')}`],
  ]
  const placeName = chart.input.cnCode ? chart.input.cnCode.split('~').join(' ') : chart.input.city
  if (placeName) infoRows.push([zhMode ? '地点' : 'Place', placeName])
  if (chart.input.latitude !== undefined && chart.input.longitude !== undefined)
    infoRows.push([zhMode ? '经纬' : 'Lat/Lon', (
      <>{fmtDeg(chart.input.latitude!, zhMode ? '北' : 'N', zhMode ? '南' : 'S')} {fmtDeg(chart.input.longitude!, zhMode ? '东' : 'E', zhMode ? '西' : 'W')}</>
    )])
  if (chart.input.timezone !== undefined) infoRows.push(['时区' + (zhMode ? '' : '/TZ'), `GMT ${chart.input.timezone >= 0 ? '+' : ''}${chart.input.timezone.toFixed(2)}`])
  infoRows.push([zhMode ? '黄道' : 'Zodiac', zhMode ? `回归黄道${asc ? ` · ${asc.signZh} ${dms(asc.degInSign)}` : ''}` : `Tropical${asc ? ` · ${asc.sign} ${dms(asc.degInSign)}` : ''}`])
  infoRows.push([zhMode ? '宫制' : 'Houses', `${zhMode ? (HOUSE_SYSTEM_ZH[chart.houseSystemUsed] ?? chart.houseSystemUsed) : chart.houseSystemUsed}`])
  if (hr) infoRows.push([zhMode ? '时主星' : 'Hour ruler', <span title={zhMode ? '零点起算, 加尔迪亚序 (时主星流派众多, 此为通行法)' : 'Chaldean order from midnight'}>{hr.symbol} {hr.zh}</span>])

  return (
    <div className="space-y-4">
      {/* 精度声明 (有则必显, 不许悄悄换) */}
      {chart.warnings.length > 0 && (
        <div className="space-y-1.5">
          {chart.warnings.map((w, i) => (
            <p key={i} className="rounded-xl border border-[#e8a08a]/25 bg-[#e8a08a]/[0.05] px-4 py-2 text-center text-[11px] leading-relaxed text-[#e8a08a]">
              {w}
            </p>
          ))}
        </div>
      )}

      {/* 两栏: 星盘(主区) | 特征 */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_236px]">
        {/* ---- 中央: 星盘主区 ---- */}
        <div className="min-w-0">
          <ChartWheel chart={chart} zhMode={zhMode} selected={selected} onSelect={setSelected} cornerSlot={
      <div className="pointer-events-auto w-[248px] rounded-2xl border border-white/[0.1] bg-[#0a0e19]/90 px-3.5 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <p className="mb-1 flex items-baseline gap-2">
          <span className="font-display text-[14px] tracking-[0.12em] text-accent">{chart.input.label || (zhMode ? '本命盘' : 'Natal Chart')}</span>
          <span className="text-[9px] tracking-[0.2em] text-muted/60 uppercase">{zhMode ? '本命图' : 'Natal'}</span>
        </p>
        <dl className="space-y-[2px]">
          {infoRows.map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-2.5 text-[11.5px] leading-snug">
              <dt className="w-[3.2em] shrink-0 text-[10px] tracking-[0.08em] text-muted/70">{k}</dt>
              <dd className="truncate text-frost/90">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
          } />
        </div>

        {/* ---- 右侧: 特征 (宫神星同款: 落座/尊贵/接纳/互容 判词全在这一张卡) ---- */}
        <div className="space-y-4">
          <Panel title={zhMode ? '特征' : 'Features'}>
            <ul className="divide-y divide-white/[0.04]">
              {features.map((f, i) => (
                <li key={i} className="flex items-baseline gap-2 px-3 py-[7px] text-[12px] leading-snug">
                  <span className={`w-[2em] shrink-0 text-[11px] ${f.tone === 'gold' ? 'text-accent' : f.tone === 'warn' ? 'text-[#e8a08a]' : 'text-frost/70'}`}>{f.icon}</span>
                  <span className={f.tone === 'gold' ? 'flex-1 text-frost/95' : 'flex-1 text-muted'}>{f.text}</span>
                </li>
              ))}
              {features.length === 0 && <li className="px-3 py-3 text-[12px] text-muted/60">—</li>}
            </ul>
          </Panel>
        </div>
      </div>

      {/* 相位区: 左=下三角矩阵, 右=相位清单 (填满宽, 不留大白; 爸爸: 对称满铺乱 → 用右侧列表补白) */}
      <Panel title={t('astro.res.aspects')}>
        <div className="flex items-center gap-3 border-b border-white/[0.05] px-3 py-2">
          <AspectLegend zhMode={zhMode} />
        </div>
        <div className="grid gap-4 p-3 lg:grid-cols-[minmax(0,max-content)_minmax(0,1fr)]">
          <div className="overflow-x-auto">
            <AspectGrid chart={chart} zhMode={zhMode} selected={selected} onPick={setSelected} bare hideLegend />
          </div>
          {/* 右列: 紧密相位排行 (双列铺开填满矩阵旁空间, 行内紧凑不留大缝) */}
          <ul className="grid grid-cols-1 gap-x-4 gap-y-[3px] sm:grid-cols-2">
            {[...chart.aspects].sort((x, y) => x.orb - y.orb).map((a2, i) => {
              const col = ASPECT_COLOR[a2.type] ?? '#9aa3b5'
              return (
                <li key={i}>
                  <button
                    onClick={() => setSelected(selected === a2.a ? null : a2.a)}
                    className={`flex w-full items-center gap-1.5 rounded-lg border-l-2 px-2 py-[5px] text-left text-[11.5px] transition-colors hover:bg-white/[0.04] ${selected === a2.a || selected === a2.b ? 'bg-white/[0.05]' : ''}`}
                    style={{ borderColor: col }}
                  >
                    <span className="w-4 shrink-0 text-center text-[12px]" style={{ color: col }}>{a2.symbol}</span>
                    <span className="min-w-0 flex-1 truncate text-frost/85">{zhMode ? `${zhOf(a2.a)}–${zhOf(a2.b)}` : `${a2.a}–${a2.b}`}</span>
                    <span className="shrink-0 text-[10px]" style={{ color: col }}>{a2.typeZh}</span>
                    <span className="w-[3.6em] shrink-0 text-right tabular-nums" style={{ color: col }}>{a2.orb.toFixed(1)}°{a2.applying === true ? 'A' : a2.applying === false ? 'S' : ''}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </Panel>

      {/* ---- 底部: 黄道状态大表 (宫神星同款横向铺开) ---- */}
      <Panel title={zhMode ? '黄道状态' : 'Ecliptic Status'}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] tracking-[0.18em] text-muted uppercase">
                <th className="px-3 py-2 font-normal">{zhMode ? '星体' : 'Body'}</th>
                <th className="px-3 py-2 font-normal">{zhMode ? '黄经度数' : 'Longitude'}</th>
                <th className="px-3 py-2 font-normal">{zhMode ? '元素' : 'Elem'}</th>
                <th className="px-3 py-2 font-normal">{zhMode ? '落宫' : 'House'}</th>
                <th className="px-3 py-2 font-normal">{zhMode ? '先天尊贵' : 'Dignity'}</th>
                <th className="px-3 py-2 font-normal">{zhMode ? '运动' : 'Motion'}</th>
                <th className="px-3 py-2 font-normal">{zhMode ? '成相数' : 'Aspects'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const cnt = chart.aspects.filter((a) => a.a === p.name || a.b === p.name).length;
                return (
                  <tr
                    key={p.name}
                    onClick={() => setSelected(selected === p.name ? null : p.name)}
                    className={`cursor-pointer border-b border-white/[0.04] transition-colors last:border-0 ${
                      selected === p.name ? 'bg-accent/[0.07]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <td className="px-3 py-1.5 whitespace-nowrap text-frost/90">
                      <span className="mr-1.5 text-accent/80">{p.symbol}</span>{p.zh}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-muted">{sz(p.sign)} {dms(p.degInSign)} <span className="text-muted/50">({p.longitude.toFixed(2)}°)</span></td>
                    <td className="px-3 py-1.5 text-muted/80">{ELEMENT_ZH[signElement(p.sign)] ?? ''}</td>
                    <td className="px-3 py-1.5 text-muted">{p.house ?? '—'}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {p.dignity && p.dignity.state !== 'Peregrine' ? (
                        <span className={p.dignity.strength > 0 ? 'text-[#cdb88a]' : 'text-[#e8a08a]'}>
                          {DIGNITY_ZH[p.dignity.state] ?? p.dignity.state}
                          <span className="ml-1 text-[10px] opacity-60">{p.dignity.strength > 0 ? `+${p.dignity.strength}` : p.dignity.strength}</span>
                        </span>
                      ) : <span className="text-muted/40">{zhMode ? '游走' : '—'}</span>}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-muted">
                      {p.retrograde ? <span className="text-[#e8a08a]">{zhMode ? '逆行' : 'R'} </span> : ''}
                      <span className="text-muted/70">{Math.abs(p.speed ?? 0).toFixed(3)}°/日</span>
                    </td>
                    <td className="px-3 py-1.5 text-muted">{cnt || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="pt-1 text-center text-[11px] tracking-[0.15em] text-muted/60">
        {t('astro.res.nextHint')}
      </p>
    </div>
  );
}
