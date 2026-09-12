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
import AspectGrid from '@/components/astro/AspectGrid';

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
  const [modeInner, setModeInner] = useState<'list' | 'grid'>('grid');
  const aspectMode = modeProp ?? modeInner;
  const setAspectMode = onAspectMode ?? setModeInner;
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

  // ---- 顶部资料卡 (宫神星式多行) ----
  const info: [string, string][] = [];
  if (chart.input.label) info.push([zhMode ? '档案' : 'Label', chart.input.label]);
  info.push([zhMode ? '日期' : 'Date', `${chart.input.year}-${String(chart.input.month).padStart(2, '0')}-${String(chart.input.day).padStart(2, '0')} ${chart.timeKnown ? `${String(chart.input.hour).padStart(2, '0')}:${String(chart.input.minute).padStart(2, '0')}` : '—'}`]);
  if (chart.input.city) info.push([zhMode ? '地点' : 'Place', chart.input.city]);
  if (chart.input.latitude !== undefined && chart.input.longitude !== undefined)
    info.push([zhMode ? '经纬' : 'Lat/Lon', `${chart.input.latitude.toFixed(2)}, ${chart.input.longitude.toFixed(2)}`]);
  if (chart.input.timezone !== undefined) info.push(['UTC', `GMT ${chart.input.timezone >= 0 ? '+' : ''}${chart.input.timezone.toFixed(2)}`]);
  info.push([zhMode ? '黄道' : 'Zodiac', zhMode ? '回归黄道' : 'Tropical']);
  info.push([zhMode ? '宫制' : 'Houses', chart.houseSystemUsed]);

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

      {/* 三栏: 左资料+行星列+网格 | 中盘 | 右特征 */}
      <div className="grid items-start gap-4 lg:grid-cols-[236px_minmax(0,1fr)_236px]">
        {/* ---- 左列 ---- */}
        <div className="space-y-4">
          <Panel title={zhMode ? '出生资料' : 'Birth Data'}>
            <dl className="divide-y divide-white/[0.04]">
              {info.map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-2 px-3 py-[7px]">
                  <dt className="w-[3.2em] shrink-0 text-[10px] tracking-[0.12em] text-muted/70 uppercase">{k}</dt>
                  <dd className="flex-1 text-[12px] text-frost/90">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title={`${zhMode ? '星体' : 'Bodies'} · ${rows.length}`}>
            <div className="max-h-[380px] overflow-y-auto">
              {rows.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setSelected(selected === p.name ? null : p.name)}
                  className={`flex w-full items-baseline gap-2 border-b border-white/[0.04] px-3 py-[6px] text-left text-[12px] transition-colors last:border-0 ${
                    selected === p.name ? 'bg-accent/[0.09]' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <span className={`w-[1.9em] shrink-0 text-[13px] ${selected === p.name ? 'text-accent' : 'text-accent/75'}`}>
                    {p.symbol}{p.retrograde && <sup className="text-[7.5px] text-[#e8a08a]">R</sup>}
                  </span>
                  <span className={`w-[3.4em] shrink-0 truncate ${selected === p.name ? 'text-frost' : 'text-frost/85'}`}>{p.zh}</span>
                  <span className="flex-1 truncate text-muted">{sz(p.sign)} {dms(p.degInSign)}</span>
                  <span className="w-[2.1em] shrink-0 text-right text-[11.5px] text-muted/80">{p.house ? `${p.house}宫` : '—'}</span>
                </button>
              ))}
            </div>
          </Panel>

          {/* 相位网格 (宫神星: 左列下方) */}
          <Panel title={t('astro.res.aspects')}>
            <div className="flex gap-1 border-b border-white/[0.05] px-2.5 py-2 text-[10.5px]">
              {(['list', 'grid'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setAspectMode(m)}
                  className={`rounded-full px-2.5 py-0.5 tracking-[0.12em] transition-colors ${aspectMode === m ? 'bg-accent/[0.12] text-accent' : 'text-muted hover:text-frost'}`}
                >
                  {m === 'list' ? t('astro.res.modeList') : t('astro.res.modeGrid')}
                </button>
              ))}
            </div>
            {aspectMode === 'grid' ? (
              <div className="p-2">
                <AspectGrid chart={chart} zhMode={zhMode} selected={selected} onPick={setSelected} bare />
              </div>
            ) : (
              <div className="max-h-[420px] space-y-1 overflow-y-auto px-2.5 py-2.5">
                {[...chart.aspects].sort((x, y) => x.orb - y.orb).map((a, i) => (
                  <p key={i} className="text-[11.5px] leading-snug text-muted">
                    {a.symbol} {zhMode ? `${zhOf(a.a)}–${zhOf(a.b)}` : `${a.a}–${a.b}`}{' '}
                    <span className="text-accent/70">{a.orb.toFixed(1)}°</span>
                    {a.applying === true && <span className="ml-0.5 text-[#8aa8d8]">→</span>}
                  </p>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* ---- 中央: 星盘 ---- */}
        <div className="min-w-0">
          <ChartWheel chart={chart} zhMode={zhMode} selected={selected} onSelect={setSelected} />
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
