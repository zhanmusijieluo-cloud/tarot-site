'use client';

// 本命盘结果展示 (从 NatalForm 抽出, 供 /astrology/chart 独立星盘页复用)
// 内容: 精度声明 → Big Three → 3D 星盘轮盘 → 行星落座落宫表 → 相位 → 接纳一览
import { useI18n } from '@/i18n';
import ChartWheel, { type VChart } from '@/components/astro/ChartWheel';

const DIGNITY_ZH: Record<string, string> = {
  Domicile: '入庙', Exalted: '耀升', Detriment: '失势', Fall: '落陷', Peregrine: '游走',
};
const RECEPTION_KIND_ZH: Record<string, string> = {
  domicile: '庙座', exaltation: '耀升', detriment: '失势', fall: '落陷',
};
const SIGNS_ZH_MINI: Record<string, string> = {
  Aries: '白羊', Taurus: '金牛', Gemini: '双子', Cancer: '巨蟹', Leo: '狮子', Virgo: '处女',
  Libra: '天秤', Scorpio: '天蝎', Scorpius: '天蝎', Sagittarius: '射手', Capricorn: '摩羯',
  Capricornus: '摩羯', Aquarius: '水瓶', Pisces: '双鱼',
};
const PLANET_ZH_MINI: Record<string, string> = {
  Sun: '太阳', Moon: '月亮', Mercury: '水星', Venus: '金星', Mars: '火星',
  Jupiter: '木星', Saturn: '土星', Uranus: '天王星', Neptune: '海王星', Pluto: '冥王星',
};

export default function ChartResult({ chart, zhMode }: { chart: VChart; zhMode: boolean }) {
  const { t } = useI18n();
  // 接纳一览归并: 互溶对只列一次
  const recepLines: string[] = [];
  {
    const seen = new Set<string>();
    for (const r of chart.receptions) {
      const key = [r.a, r.b].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const kind = RECEPTION_KIND_ZH[r.kind] ?? r.kind;
      const sz = (s: string) => SIGNS_ZH_MINI[s] ?? s;
      if (r.mutual) {
        const rev = chart.receptions.find((x) => x.a === r.b && x.b === r.a);
        recepLines.push(zhMode
          ? `⇄ ${PLANET_ZH_MINI[r.a] ?? r.a} 与 ${PLANET_ZH_MINI[r.b] ?? r.b} 互溶（互居对方${kind}之座 · ${sz(r.bySign)}/${sz(rev?.bySign ?? '')}）`
          : `⇄ ${r.a} ↔ ${r.b} mutual reception`);
      } else {
        recepLines.push(zhMode
          ? `↦ ${PLANET_ZH_MINI[r.b] ?? r.b} 接纳 ${PLANET_ZH_MINI[r.a] ?? r.a}（居其${kind} · ${sz(r.bySign)}）`
          : `↦ ${r.a} received by ${r.b} (${r.kind} · ${sz(r.bySign)})`);
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* 出生资料回显 */}
      <p className="text-center text-[11px] tracking-[0.12em] text-muted/80">
        {zhMode
          ? `${chart.input.year}-${chart.input.month}-${chart.input.day} ${chart.timeKnown ? `${String(chart.input.hour).padStart(2, '0')}:${String(chart.input.minute).padStart(2, '0')}` : '时间未知'} · ${chart.input.city ?? ''}`
          : `${chart.input.year}-${chart.input.month}-${chart.input.day} ${chart.timeKnown ? `${String(chart.input.hour).padStart(2, '0')}:${String(chart.input.minute).padStart(2, '0')}` : 'time unknown'} · ${chart.input.city ?? ''}`}
        <span className="ml-2 text-accent/70">
          {chart.houseSystemUsed}{chart.timeKnown ? '' : ` · ${t('astro.res.noTime')}`}
        </span>
      </p>

      {/* 精度声明(有则必显, 不许悄悄换) */}
      {chart.warnings.map((w, i) => (
        <p key={i} className="rounded-xl border border-[#e8a08a]/25 bg-[#e8a08a]/[0.05] px-4 py-2.5 text-center text-[11px] leading-relaxed text-[#e8a08a]">
          {w}
        </p>
      ))}

      {/* Big Three */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('astro.res.sun'), p: chart.planets.find((x) => x.name === 'Sun') },
          { label: t('astro.res.moon'), p: chart.planets.find((x) => x.name === 'Moon') },
          { label: t('astro.res.rising'), p: chart.angles.ascendant },
        ].map((x, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
            <p className="text-[10px] tracking-[0.25em] text-muted uppercase">{x.label}</p>
            <p className="mt-2 text-lg text-frost">
              {x.p ? (
                <>{x.p.symbol} <span className="font-display tracking-[0.08em]">
                  {zhMode ? `${x.p.signZh}座 ${x.p.degInSign.toFixed(1)}°` : `${x.p.sign} ${x.p.degInSign.toFixed(1)}°`}
                </span></>
              ) : (
                <span className="text-[11px] text-muted/50">{t('astro.res.noTime')}</span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* 3D 星盘轮盘 */}
      <ChartWheel chart={chart} zhMode={zhMode} />

      {/* 行星落座落宫表 */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] tracking-[0.2em] text-muted uppercase">
              <th className="px-4 py-2.5 font-normal">{t('astro.res.planet')}</th>
              <th className="px-4 py-2.5 font-normal">{t('astro.res.signDeg')}</th>
              <th className="px-4 py-2.5 font-normal">{t('astro.res.house')}</th>
              <th className="px-4 py-2.5 font-normal">{t('astro.res.state')}</th>
            </tr>
          </thead>
          <tbody>
            {chart.planets.map((p) => (
              <tr key={p.name} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-2 text-frost/90">
                  <span className="mr-2 text-accent/80">{p.symbol}</span>
                  {zhMode ? p.zh : p.name}
                  {p.retrograde && <span className="ml-1.5 text-[10px] text-[#e8a08a]">℞</span>}
                </td>
                <td className="px-4 py-2 text-muted">
                  {zhMode ? `${p.signZh} ${p.degInSign.toFixed(1)}°` : `${p.sign} ${p.degInSign.toFixed(1)}°`}
                </td>
                <td className="px-4 py-2 text-muted">{p.house ?? '—'}</td>
                <td className="px-4 py-2 text-[11px]">
                  {p.dignity && p.dignity.state !== 'Peregrine' ? (
                    <span className={p.dignity.strength > 0 ? 'text-[#cdb88a]' : 'text-[#e8a08a]'}>
                      {DIGNITY_ZH[p.dignity.state] ?? p.dignity.state}
                    </span>
                  ) : (
                    <span className="text-muted/40">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 主要相位 */}
      <div>
        <p className="mb-2.5 text-[10px] tracking-[0.25em] text-muted uppercase">{t('astro.res.aspects')}</p>
        <div className="flex flex-wrap gap-2">
          {[...chart.aspects].sort((x, y) => x.orb - y.orb).slice(0, 14).map((a, i) => (
            <span key={i} className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[11px] text-muted">
              {a.symbol} {zhMode ? `${PLANET_ZH_MINI[a.a] ?? a.a}–${PLANET_ZH_MINI[a.b] ?? a.b}` : `${a.a}–${a.b}`}{' '}
              <span className="text-accent/70">{a.orb.toFixed(1)}°</span>
              {a.applying === true && <span className="ml-1 text-[#8aa8d8]">→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* 互溶 · 接纳 */}
      {recepLines.length > 0 && (
        <div>
          <p className="mb-2.5 text-[10px] tracking-[0.25em] text-muted uppercase">{t('astro.res.reception')}</p>
          <div className="space-y-1.5">
            {recepLines.map((l, i) => (
              <p key={i} className="text-[12.5px] text-muted">{l}</p>
            ))}
          </div>
        </div>
      )}

      <p className="pt-2 text-center text-[11px] tracking-[0.15em] text-muted/60">
        {t('astro.res.nextHint')}
      </p>
    </div>
  );
}
