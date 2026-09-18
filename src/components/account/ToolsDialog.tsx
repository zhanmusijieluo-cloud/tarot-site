'use client';

/**
 * 排盘工具选择弹窗（账户中心）
 * 以「人」为中心：可以先从出生档案选人，也可以直接进工具。
 * 四张工具卡点击后跳转并关闭弹窗；支持 ESC 与点遮罩关闭。
 */
import { useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n';

interface ToolItem {
  href: string;
  zh: string;
  en: string;
  ja: string;
  zhDesc: string;
  enDesc: string;
  jaDesc: string;
  /** 装饰符号（不用 emoji，用几何字形） */
  glyph: string;
}

const TOOLS: ToolItem[] = [
  {
    href: '/astrology',
    zh: '占星盘', en: 'Astrology', ja: '占星盤',
    zhDesc: '本命盘 · 合盘 · 行运',
    enDesc: 'Natal · synastry · transits',
    jaDesc: 'ネイタル・シナストリー・トランジット',
    glyph: '☉',
  },
  {
    href: '/bazi',
    zh: '八字', en: 'BaZi', ja: '八字',
    zhDesc: '四柱干支与五行',
    enDesc: 'Four pillars & elements',
    jaDesc: '四柱と五行',
    glyph: '干',
  },
  {
    href: '/ziwei',
    zh: '紫微', en: 'ZiWei', ja: '紫微',
    zhDesc: '紫微斗数与十二宫',
    enDesc: 'Zi Wei Dou Shu palaces',
    jaDesc: '紫微斗数と十二宮',
    glyph: '紫',
  },
  {
    href: '/online',
    zh: '塔罗', en: 'Tarot', ja: 'タロット',
    zhDesc: '抽牌与解读',
    enDesc: 'Draw & reading',
    jaDesc: 'ドローとリーディング',
    glyph: '☾',
  },
];

export default function ToolsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copy = {
    title: lang === 'en' ? 'Casting tools' : lang === 'ja' ? '鑑定ツール' : '排盘工具',
    intro:
      lang === 'en'
        ? 'Pick a tool to start. To cast for a specific person, choose a profile first.'
        : lang === 'ja'
          ? 'ツールを選んでください。人物ごとに鑑定する場合は、先にプロフィールを選びます。'
          : '选一个工具开始。想按人排盘，先去「出生档案」选档案，再从那里进入。',
    fromArchive: lang === 'en' ? 'Pick a profile first' : lang === 'ja' ? 'プロフィールから選ぶ' : '先从档案选人',
    close: lang === 'en' ? 'Close' : lang === 'ja' ? '閉じる' : '关闭',
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/[0.1] p-5"
        style={{ background: 'rgba(11,14,23,0.97)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-display text-[15px] tracking-[0.15em] text-accent">{copy.title}</p>
        <p className="mt-1.5 mb-4 text-[11.5px] leading-relaxed text-muted/70">{copy.intro}</p>

        <div className="grid grid-cols-2 gap-2.5">
          {TOOLS.map((tl) => {
            const label = lang === 'en' ? tl.en : lang === 'ja' ? tl.ja : tl.zh;
            const desc = lang === 'en' ? tl.enDesc : lang === 'ja' ? tl.jaDesc : tl.zhDesc;
            return (
              <Link
                key={tl.href}
                href={tl.href}
                onClick={onClose}
                className="group rounded-xl border border-white/[0.1] bg-white/[0.02] p-3.5 transition-colors hover:border-accent/40 hover:bg-white/[0.05]"
              >
                <span
                  className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-accent/25 bg-accent/[0.08] text-[15px] text-accent/85"
                  aria-hidden="true"
                >
                  {tl.glyph}
                </span>
                <p className="text-[13.5px] text-frost">{label}</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted/60">{desc}</p>
              </Link>
            );
          })}
        </div>

        <Link
          href="/archives"
          onClick={onClose}
          className="mt-3 block rounded-xl border border-dashed border-white/[0.12] px-4 py-2.5 text-center text-[11.5px] text-muted/75 transition-colors hover:border-accent/35 hover:text-frost/85"
        >
          {copy.fromArchive} →
        </Link>

        <button
          onClick={onClose}
          className="mt-3 w-full rounded-xl border border-white/[0.12] py-2 text-[11.5px] text-muted transition-colors hover:border-white/30 hover:text-frost/80"
        >
          {copy.close}
        </button>
      </div>
    </div>
  );
}
