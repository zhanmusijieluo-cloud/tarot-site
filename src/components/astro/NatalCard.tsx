'use client';

// ============================================================
// 出生资料卡 (盘左上角内嵌; 本命盘/次限盘等盘共用)
// 从 ChartResult 抽出 — 爸爸: 次限等盘进入时也要这张卡
// ============================================================
import type { VChart } from '@/components/astro/ChartWheel';
import { HOUSE_SYSTEM_ZH } from '@/lib/astro/chart';

export default function NatalCard({ chart, zhMode }: { chart: VChart; zhMode: boolean }) {
  const fmtDeg = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`;
  const hr = chart.hourRuler ? chart.planets.find((x) => x.name === chart.hourRuler) : null;
  const infoRows: [string, React.ReactNode][] = [
    [zhMode ? '日期' : 'Date', `${chart.input.year}-${String(chart.input.month).padStart(2, '0')}-${String(chart.input.day).padStart(2, '0')} ${chart.timeKnown ? `${String(chart.input.hour).padStart(2, '0')}:${String(chart.input.minute).padStart(2, '0')}` : (zhMode ? '时间未知' : 'unknown')}`],
  ];
  const placeName = chart.input.cnCode ? chart.input.cnCode.split('~').join(' ') : chart.input.city;
  if (placeName) infoRows.push([zhMode ? '地点' : 'Place', placeName]);
  if (chart.input.latitude !== undefined && chart.input.longitude !== undefined)
    infoRows.push([zhMode ? '经纬' : 'Lat/Lon', (
      <>{fmtDeg(chart.input.latitude!, zhMode ? '北' : 'N', zhMode ? '南' : 'S')} {fmtDeg(chart.input.longitude!, zhMode ? '东' : 'E', zhMode ? '西' : 'W')}</>
    )]);
  if (chart.input.timezone !== undefined) infoRows.push(['时区' + (zhMode ? '' : '/TZ'), `GMT ${chart.input.timezone >= 0 ? '+' : ''}${chart.input.timezone.toFixed(2)}`]);
  infoRows.push([zhMode ? '黄道' : 'Zodiac', zhMode ? '回归黄道' : 'Tropical']);
  infoRows.push([zhMode ? '宫制' : 'Houses', `${zhMode ? (HOUSE_SYSTEM_ZH[chart.houseSystemUsed] ?? chart.houseSystemUsed) : chart.houseSystemUsed}`]);
  if (hr) infoRows.push([zhMode ? '时主星' : 'Hour ruler', <span key="hr" title={zhMode ? `时主星: ${hr.zh} — 零点起算, 加尔迪亚序 (流派众多, 此为通行法)` : `Hour ruler: ${hr.name} (Chaldean, from midnight)`}>{hr.symbol}</span>]);

  return (
    <div className="w-full rounded-2xl border border-white/[0.1] bg-[#0a0e19]/90 px-3.5 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-sm">
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
  );
}
