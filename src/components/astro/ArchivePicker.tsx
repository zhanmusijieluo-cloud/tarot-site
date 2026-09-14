'use client';

// ============================================================
// 从我的档案选择 (排盘表单用) — 云端/本机双通道
// 爸爸: 排盘页可以直接选档案带入出生资料
// ============================================================
import { useEffect, useState } from 'react';
import { loadArchivesSmart, type Archive } from '@/lib/astro/archives';
import { useI18n } from '@/i18n';

export default function ArchivePicker({ onPick }: { onPick: (a: Archive) => void }) {
  const { lang } = useI18n();
  const zhMode = lang !== 'en';
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Archive[]>([]);
  const [mode, setMode] = useState<'cloud' | 'local'>('local');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadArchivesSmart().then((r) => {
      setList(r.list);
      setMode(r.mode);
      setLoading(false);
    });
  }, [open]);

  const pad = (x: number) => String(x).padStart(2, '0');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-4 py-2 text-[11.5px] tracking-[0.08em] text-frost/80 transition-colors hover:border-accent/40 hover:text-accent"
      >
        📁 {zhMode ? '从我的档案选择' : 'Pick from archives'}
      </button>
      {open && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative max-h-[75vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#0b0e17]/[0.97] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 font-display text-[15px] tracking-[0.15em] text-accent">{zhMode ? '选择档案' : 'Pick archive'}</p>
            <p className="mb-3 text-[11px] text-muted/65">
              {zhMode ? (mode === 'cloud' ? '已登录 · 云端档案' : '本机档案 (登录后可跨设备)') : 'Stored locally'}
            </p>
            {loading ? (
              <p className="py-8 text-center text-[12px] text-muted/60">…</p>
            ) : (
              <div className="space-y-1.5">
                {list.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => { onPick(x); setOpen(false); }}
                    className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] px-3.5 py-2.5 text-left transition-colors hover:border-accent/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-frost/90">{x.label}</span>
                      <span className="block text-[10.5px] text-muted/70">
                        {x.birth.year}-{pad(x.birth.month)}-{pad(x.birth.day)} {pad(x.birth.hour)}:{pad(x.birth.minute)} · {x.birth.city ?? ''}
                      </span>
                    </span>
                    {x.cloud && <span className="ml-2 shrink-0 text-[9.5px] text-[#84e89e]/70">{zhMode ? '云端' : 'Cloud'}</span>}
                  </button>
                ))}
                {list.length === 0 && (
                  <p className="py-6 text-center text-[11.5px] text-muted/60">
                    {zhMode ? '还没有档案 — 先去「我的档案」新增' : 'No archives yet'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
