'use client';

// ============================================================
// 从我的档案选择 (排盘表单用) — 云端/本机双通道
// 爸爸: 排盘页可以直接选档案带入出生资料
// 2026-09-16 改版 v2(方案C 就地展开·加强): v1 的 320px 面板被嫌"太小不醒目" →
//   加宽到 520px、列表项改卡片式(首字圆标 + 更大行高)、头部加重、入口按钮加大
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
  const initial = (label: string) => (label?.trim()?.[0] ?? '档').toUpperCase();

  return (
    <div ref={boxRef} className="relative block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center gap-2.5 rounded-full border border-accent/50 bg-accent/[0.1] px-5 py-2.5 text-[12.5px] tracking-[0.08em] text-accent transition-colors hover:border-accent/80 hover:bg-accent/[0.18]"
      >
        <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-[4px] border border-[#c9a961]/70 bg-[#c9a961]/10" aria-hidden />
        {zhMode ? '从我的档案选择' : 'Pick from archives'}
        <span className={`ml-auto text-[10px] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+10px)] z-[70] w-[520px] overflow-hidden rounded-2xl border border-accent/30 bg-[#11141d] shadow-[0_24px_60px_rgba(0,0,0,0.65)]"
        >
          <div className="flex items-baseline gap-2.5 border-b border-accent/15 px-5 py-3.5">
            <span className="font-display text-[15px] tracking-[0.14em] text-[#c9a961]">
              {zhMode ? '选择档案' : 'Pick archive'}
            </span>
            <span className="text-[11.5px] text-muted/65">
              {zhMode ? (mode === 'cloud' ? '已登录 · 云端档案' : '本机档案（登录后跨设备）') : 'Stored locally'}
            </span>
          </div>

          <div className="max-h-[340px] overflow-y-auto p-2.5">
            {loading ? (
              <p className="py-8 text-center text-[12.5px] text-muted/60">…</p>
            ) : list.length === 0 ? (
              <p className="px-2 py-7 text-center text-[12.5px] text-muted/60">
                {zhMode ? '还没有档案' : 'No archives yet'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {list.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onPick(x);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-3.5 rounded-xl border border-white/[0.07] px-4 py-3 text-left transition-colors hover:border-accent/45 hover:bg-accent/[0.09]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/[0.12] text-[13px] text-accent">
                      {initial(x.label)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-frost/95">{x.label}</span>
                      <span className="mt-0.5 block text-[11.5px] text-muted/70">
                        {x.birth.year}-{pad(x.birth.month)}-{pad(x.birth.day)} {pad(x.birth.hour)}:{pad(x.birth.minute)} · {x.birth.city ?? ''}
                      </span>
                    </span>
                    {x.cloud && (
                      <span className="shrink-0 rounded-full border border-[#84e89e]/30 px-2 py-0.5 text-[10.5px] text-[#84e89e]/80">
                        {zhMode ? '云端' : 'Cloud'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <a
            href="/archives"
            className="block border-t border-accent/15 px-5 py-3 text-center text-[12px] text-accent/85 transition-colors hover:bg-accent/[0.08]"
          >
            {zhMode ? '没有想要的？去「我的档案」新建' : 'Manage archives'}
          </a>
        </div>
      )}
    </div>
  );
}
