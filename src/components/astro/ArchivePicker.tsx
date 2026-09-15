'use client';

// ============================================================
// 从我的档案选择 (排盘表单用) — 云端/本机双通道
// 爸爸: 排盘页可以直接选档案带入出生资料
// 2026-09-16 改版(方案C 就地展开): 原来是居中遮罩弹窗(448px 灰扑扑),
//   改成按钮下方就地展开的面板 + 品牌色(玫瑰粉描边/鎏金标题), 点外部或 Esc 关闭
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { loadArchivesSmart, type Archive } from '@/lib/astro/archives';
import { useI18n } from '@/i18n';

export default function ArchivePicker({ onPick }: { onPick: (a: Archive) => void }) {
  const { lang } = useI18n();
  const zhMode = lang !== 'en';
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Archive[]>([]);
  const [mode, setMode] = useState<'cloud' | 'local'>('local');
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadArchivesSmart().then((r) => {
      setList(r.list);
      setMode(r.mode);
      setLoading(false);
    });
  }, [open]);

  // 点外部 / Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pad = (x: number) => String(x).padStart(2, '0');

  return (
    <div ref={boxRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent/[0.06] px-4 py-2 text-[11.5px] tracking-[0.08em] text-accent/90 transition-colors hover:border-accent/60 hover:bg-accent/[0.12]"
      >
        <span className="inline-block h-3 w-3 shrink-0 rounded-[3px] border border-[#c9a961]/60" aria-hidden />
        {zhMode ? '从我的档案选择' : 'Pick from archives'}
        <span className={`text-[9px] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+8px)] z-[70] w-[320px] overflow-hidden rounded-xl border border-accent/25 bg-[#11141d] shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
        >
          <div className="flex items-baseline gap-2 border-b border-white/[0.07] px-3.5 py-2.5">
            <span className="font-display text-[12.5px] tracking-[0.12em] text-[#c9a961]">
              {zhMode ? '选择档案' : 'Pick archive'}
            </span>
            <span className="text-[10.5px] text-muted/60">
              {zhMode ? (mode === 'cloud' ? '云端' : '本机') : 'Local'}
            </span>
          </div>

          <div className="max-h-[300px] overflow-y-auto p-1.5">
            {loading ? (
              <p className="py-6 text-center text-[11.5px] text-muted/60">…</p>
            ) : list.length === 0 ? (
              <p className="px-2 py-5 text-center text-[11.5px] text-muted/60">
                {zhMode ? '还没有档案' : 'No archives yet'}
              </p>
            ) : (
              list.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    onPick(x);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent/[0.12]"
                >
                  <span className="min-w-0 truncate text-[12.5px] text-frost/90">{x.label}</span>
                  <span className="shrink-0 text-[11px] text-muted/70">
                    {x.birth.year}-{pad(x.birth.month)}-{pad(x.birth.day)} · {x.birth.city ?? ''}
                  </span>
                </button>
              ))
            )}
          </div>

          <a
            href="/archives"
            className="block border-t border-white/[0.07] px-3.5 py-2 text-center text-[11px] text-accent/80 transition-colors hover:bg-accent/[0.08]"
          >
            {zhMode ? '没有想要的？去「我的档案」新建' : 'Manage archives'}
          </a>
        </div>
      )}
    </div>
  );
}
