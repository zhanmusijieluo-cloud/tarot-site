'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageShell from '@/components/PageShell';
import OfflineInterpretSection from '@/components/OfflineInterpretSection';
import { LN_SPREADS } from '@/lib/lenormand';
import { useI18n } from '@/i18n';

// 雷诺曼 · 线下抽牌解读（对牌塔 /offline 的镜像, 牌组固定 lenormand）
// ① 无参数进入：从四内置牌阵/自定义里挑 → 填牌 → 解读
// ② 带 ?spread=lnX：预选该牌阵直接填牌
// ③ 带 ?spread=custom&cells=...：布阵页预设直填
function LnOfflineInner() {
  const s = useSearchParams();
  const { t } = useI18n();
  const spread = s.get('spread') || undefined;
  const count = Number(s.get('count')) || undefined;
  const positions = s.get('positions') || undefined;
  const q = s.get('q') || '';
  const bg = s.get('bg') || '';
  const name = s.get('name') || '';
  let cells: { row: number; col: number; cols: number; name?: string }[] | undefined;
  const cellsRaw = s.get('cells');
  if (cellsRaw) {
    try { cells = JSON.parse(cellsRaw) as typeof cells; } catch { cells = undefined; }
  }
  const isCustomPreset = s.get('spread') === 'custom' || !!cells;
  const presetOk = !!spread && spread in LN_SPREADS && spread !== 'custom';

  return (
    <PageShell
      label={t('lnflow.customTitle')}
      title={isCustomPreset ? (name || t('lnflow.customTitle')) : t('lnflow.offlineTitle')}
      subtitle={
        isCustomPreset
          ? t('custom.offlineSubtitle')
          : t('lnflow.offlineSubtitle')
      }
    >
      <OfflineInterpretSection
        deck="lenormand"
        presetSpread={!isCustomPreset && presetOk ? spread : undefined}
        presetCustomCount={isCustomPreset ? (cells?.length ?? count) : undefined}
        presetCustomPositions={isCustomPreset ? positions : undefined}
        presetCustomCells={isCustomPreset ? cells : undefined}
        customName={isCustomPreset ? name : undefined}
        presetQuestion={isCustomPreset ? q : undefined}
        presetBackground={isCustomPreset ? bg : undefined}
        hideQuestionInput={isCustomPreset}
        hideCustomSettings={isCustomPreset}
      />
    </PageShell>
  );
}

export default function LenormandOfflinePage() {
  return (
    <Suspense fallback={<div className="min-h-[56.25rem] w-full" />}>
      <LnOfflineInner />
    </Suspense>
  );
}
