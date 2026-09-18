'use client';

// 路由级错误边界 — 兜住页面渲染期抛错, 避免整棵树被卸载成白屏。
// ⚠️ 这里刻意不使用 useI18n(): 它无 Provider 时会 throw, 而错误页自己再抛错就彻底白屏。
// 语言直接从 localStorage / <html lang> 探测, 任何一步失败都回落到中文。

import { useEffect, useState } from 'react';

type Lang = 'zh' | 'en' | 'ja';

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem('oracle-lang');
    if (saved === 'en' || saved === 'ja' || saved === 'zh') return saved;
    const html = document.documentElement.lang;
    if (html === 'en' || html === 'ja') return html;
  } catch {
    /* 忽略: 探测失败就用中文 */
  }
  return 'zh';
}

const TEXT: Record<Lang, { title: string; desc: string; retry: string; home: string }> = {
  zh: {
    title: '页面出了点问题',
    desc: '不是你的操作有问题，重新加载一下通常就能恢复。',
    retry: '重新加载',
    home: '回首页',
  },
  en: {
    title: 'Something went wrong',
    desc: 'Nothing you did — reloading usually fixes it.',
    retry: 'Reload',
    home: 'Home',
  },
  ja: {
    title: 'ページで問題が発生しました',
    desc: '操作の問題ではありません。再読み込みで通常は復帰します。',
    retry: '再読み込み',
    home: 'ホーム',
  },
};

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [lang, setLang] = useState<Lang>('zh');

  useEffect(() => {
    setLang(detectLang());
  }, []);

  useEffect(() => {
    // 留一份现场, 便于线上定位
    console.error('[route-error]', error?.message, error?.digest, error?.stack);
  }, [error]);

  const s = TEXT[lang];

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#0c101c]/[0.97] p-8 text-center backdrop-blur-md">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full border border-accent/40 text-accent">
          <span className="text-xl leading-none">✦</span>
        </div>
        <h1 className="font-serif text-xl text-frost">{s.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{s.desc}</p>
        {error?.digest ? (
          <p className="mt-3 font-mono text-[10px] tracking-wider text-muted/50">#{error.digest}</p>
        ) : null}
        <div className="mt-7 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-full border border-accent/50 bg-accent/[0.08] px-5 py-2 text-xs tracking-[0.15em] text-accent transition-colors hover:border-accent"
          >
            {s.retry}
          </button>
          <a
            href="/"
            className="rounded-full border border-white/[0.12] px-5 py-2 text-xs tracking-[0.15em] text-muted transition-colors hover:border-white/30 hover:text-frost"
          >
            {s.home}
          </a>
        </div>
      </div>
    </main>
  );
}
