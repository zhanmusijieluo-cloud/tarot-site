'use client';

// 路由级错误边界 — 兜住页面渲染期抛错, 避免整棵树被卸载成白屏。
// ⚠️ 这里刻意不使用 useI18n(): 它无 Provider 时会 throw, 而错误页自己再抛错就彻底白屏。
// 语言直接从 localStorage / <html lang> 探测, 任何一步失败都回落到中文。
//
// ⚠️ 2026-09-18: 为定位木木截图里的错误页, 这里把真实报错**显示出来** (原来只打 console)。
//    一行 message + 可展开的堆栈。排查完可以收回 console-only。
//
// ✅ 2026-09-18 晚: 根因已实测复现 —— 部署切换瞬间, 旧客户端懒加载 chunk 会
//    ChunkLoadError (见 lib/chunk-recovery.ts)。这类错误刷新即好, 故自动恢复一次,
//    用户看到的是「正在恢复…」而不是错误页。真故障 (第二次仍失败) 才显示错误页。

import { useEffect, useState } from 'react';
import { shouldStaleAssetRecover, reloadForStaleAsset } from '@/lib/chunk-recovery';

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

const TEXT: Record<Lang, { title: string; desc: string; retry: string; home: string; detail: string; healing: string; healingDesc: string }> = {
  zh: {
    title: '页面出了点问题',
    desc: '不是你的操作有问题，重新加载一下通常就能恢复。',
    retry: '重新加载',
    home: '回首页',
    detail: '错误详情',
    healing: '正在恢复…',
    healingDesc: '刚刚发布过新版本，正在载入最新内容。',
  },
  en: {
    title: 'Something went wrong',
    desc: 'Nothing you did — reloading usually fixes it.',
    retry: 'Reload',
    home: 'Home',
    detail: 'Error detail',
    healing: 'Restoring…',
    healingDesc: 'A new version just shipped — loading the latest.',
  },
  ja: {
    title: 'ページで問題が発生しました',
    desc: '操作の問題ではありません。再読み込みで通常は復帰します。',
    retry: '再読み込み',
    home: 'ホーム',
    detail: 'エラー詳細',
    healing: '復帰中…',
    healingDesc: '新バージョンが公開されたため、最新の内容を読み込んでいます。',
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
  const [showDetail, setShowDetail] = useState(false);
  const [healing, setHealing] = useState(false);

  useEffect(() => {
    setLang(detectLang());
  }, []);

  useEffect(() => {
    // 留一份现场, 便于线上定位
    console.error('[route-error]', error?.name, error?.message, error?.digest, error?.stack);
    // 部署切换类错误 → 自动硬刷新一次 (冷却窗口内不再重复, 真故障会落到错误页)
    if (shouldStaleAssetRecover(error)) setHealing(true);
  }, [error]);

  // 先让「正在恢复…」渲染出来, 再硬刷新 —— 直接 reload 会变成白屏一闪
  useEffect(() => {
    if (healing) reloadForStaleAsset();
  }, [healing]);

  const s = TEXT[lang];
  const msg = (() => {
    try {
      const name = error?.name || 'Error';
      const m = error?.message || '';
      return m ? `${name}: ${m}` : name;
    } catch {
      return 'Error';
    }
  })();
  const stack = (() => {
    try {
      return String(error?.stack || '').split('\n').slice(0, 8).join('\n');
    } catch {
      return '';
    }
  })();

  // 部署切换类错误: 正在自动重载, 给一个安静的过渡态, 不吓用户
  if (healing) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-accent/25 border-t-accent" />
          <p className="font-serif text-base text-frost">{s.healing}</p>
          <p className="mt-2 text-xs text-muted/70">{s.healingDesc}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#0c101c]/[0.97] p-8 text-center backdrop-blur-md">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full border border-accent/40 text-accent">
          <span className="text-xl leading-none">✦</span>
        </div>
        <h1 className="font-serif text-xl text-frost">{s.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{s.desc}</p>

        {/* 报错摘要: 一行, 便于截图反馈。[route]=页面级边界, [root]=根级边界 */}
        <p className="mt-4 break-words rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-[10.5px] leading-relaxed text-[#e8a08a]">
          [route] {msg}
          {error?.digest ? <span className="block text-muted/50">#{error.digest}</span> : null}
        </p>
        {stack ? (
          <button
            onClick={() => setShowDetail((v) => !v)}
            className="mt-2 text-[10px] tracking-[0.15em] text-muted/50 underline transition-colors hover:text-muted"
          >
            {s.detail}
          </button>
        ) : null}
        {showDetail && stack ? (
          <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-white/[0.08] bg-black/40 p-2 text-left font-mono text-[9.5px] leading-relaxed whitespace-pre-wrap text-muted/70">
            {stack}
          </pre>
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
