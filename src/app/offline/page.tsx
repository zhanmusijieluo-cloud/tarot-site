'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageShell from '@/components/PageShell';
import OfflineInterpretSection from '@/components/OfflineInterpretSection';
import { SPREADS } from '@/lib/tarot';

// 我已抽牌 · 线下解读（落地页）
// ① 无参数进入：从选择器挑任意牌阵（含全部内置牌阵 + 自定义牌阵）→ 填牌 → 解读
// ② 带 ?spread=xxx 进入：预选该内置牌阵，直接填牌
// ③ 带 ?spread=custom&count=&positions=&cells=&name=&q=&bg= 进入：
//    自定义牌阵预设（从布阵页带入真实格子位置/牌名/问题背景），直接填牌
function OfflineInner() {
  const s = useSearchParams();
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

  return (
    <PageShell
      label="Manual Reading"
      title={isCustomPreset ? (name || '自定义牌阵') : '线下抽牌 · 解读'}
      subtitle={
        isCustomPreset
          ? (name ? `「${name}」· ` : '') + '已从布阵页带入真实位置与问题背景，逐张填入你的牌即可。'
          : '你已经在现实中摆好了牌？选择牌阵，把每张牌填进对应的真实位置，AI 为你展开深度解读。'
      }
    >
      <OfflineInterpretSection
        presetSpread={!isCustomPreset && spread && SPREADS[spread] ? spread : undefined}
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

export default function OfflinePage() {
  return (
    <Suspense fallback={<div className="min-h-[56.25rem] w-full" />}>
      <OfflineInner />
    </Suspense>
  );
}
