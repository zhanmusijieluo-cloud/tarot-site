'use client';

/**
 * 出生档案选择行（塔罗 / 雷诺曼抽牌页共用）
 * 选中后由调用方把档案信息并入解读背景（见 lib/astro/birth-context.ts）。
 */
import type { Archive } from '@/lib/astro/archives';
import { useI18n } from '@/i18n';

export default function ArchiveSelect({ archives, value, onChange }: {
  archives: Archive[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = useI18n();
  if (!archives.length) return null;

  const pill = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-[11.5px] transition-colors ${
      active
        ? 'border-accent/50 bg-accent/[0.08] text-accent'
        : 'border-white/[0.12] text-muted hover:border-white/30'
    }`;

  return (
    <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
      <label className="font-display mb-3 block text-sm tracking-[0.2em] text-frost">
        {t('quick.archiveLabel')}
      </label>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onChange('')} className={pill(!value)}>
          {t('quick.archiveNone')}
        </button>
        {archives.map((a) => (
          <button key={a.id} onClick={() => onChange(a.id)} className={pill(value === a.id)}>
            {a.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted/60">{t('quick.archiveHint')}</p>
    </div>
  );
}
