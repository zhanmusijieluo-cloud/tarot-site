'use client';

// ============================================================
// 根级错误边界 — 兜住「连根布局都渲染失败」的极端情况。
//
// ⚠️ 与 error.tsx 的关键差异:
//   1. global-error 会【替换掉根布局】, 所以 globals.css / 字体 / I18nProvider 全部不可用。
//      → 这里刻意全部用 inline style, 不依赖任何 className / CSS 变量 / Provider。
//   2. 必须自己输出 <html> / <body>。
//   3. 任何 throw 都会让整站彻底白屏, 所以这里逻辑必须"不可能再抛错":
//      不用 localStorage、不用 window、不读 document。
//      (唯一例外是 chunk-recovery 的 sessionStorage 探测 —— 它整体包在 try/catch 里,
//       且带冷却窗口, 失败即静默降级。2026-09-18 加: 部署切换会触发 ChunkLoadError。)
// ============================================================

import { useEffect, useState } from 'react';
import { shouldStaleAssetRecover, reloadForStaleAsset } from '@/lib/chunk-recovery';

type Lang = 'zh' | 'en' | 'ja';

/** 与 app/error.tsx 同一套路：语言只能从 localStorage / <html lang> 探，探测失败回中文 */
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

const TEXT: Record<Lang, {
  title: string; desc: string; retry: string; home: string; detail: string;
  healing: string; healingDesc: string;
}> = {
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

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [healing, setHealing] = useState(false);
  const [lang, setLang] = useState<Lang>('zh');

  useEffect(() => {
    // 渲染期读 localStorage 会与 SSR 结果不一致，只能放 effect；读失败仍停在中文，不会二次抛错
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(detectLang());
  }, []);

  useEffect(() => {
    // 留现场, 便于线上定位 (Vercel 日志里能按 digest 捞)
    try {
      console.error('[global-error]', error?.message, error?.digest, error?.stack);
    } catch {
      /* 忽略 */
    }
    // 部署切换类错误 → 自动硬刷新一次 (冷却窗口内不再重复)
    // 冷却窗口要读 sessionStorage, 渲染期做会和 SSR 不一致, 只能在 effect 里判。
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (shouldStaleAssetRecover(error)) setHealing(true);
    } catch {
      /* 忽略: 兜底逻辑自身绝不能把白屏搞得更白 */
    }
  }, [error]);

  // 先渲染过渡态再刷新
  useEffect(() => {
    if (healing) reloadForStaleAsset();
  }, [healing]);

  const btn: React.CSSProperties = {
    display: 'inline-block',
    borderRadius: 999,
    border: '1px solid rgba(217,168,184,0.5)',
    background: 'rgba(217,168,184,0.08)',
    color: '#d9a8b8',
    padding: '8px 20px',
    fontSize: 12,
    letterSpacing: '0.15em',
    cursor: 'pointer',
    textDecoration: 'none',
  };

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

  const shell: React.CSSProperties = {
    margin: 0,
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#080709',
    color: '#e8e6f0',
    fontFamily: '"Noto Serif SC", "Songti SC", "PingFang SC", system-ui, -apple-system, sans-serif',
    padding: 24,
  };

  // 部署切换类错误: 正在自动重载, 给一个安静的过渡态
  if (healing) {
    return (
      <html lang={lang === 'zh' ? 'zh-CN' : lang}>
        <body style={shell}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                margin: '0 auto 16px',
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '1px solid rgba(217,168,184,0.35)',
                borderTopColor: '#d9a8b8',
                animation: 'oracle-spin 0.9s linear infinite',
              }}
            />
            <style>{'@keyframes oracle-spin{to{transform:rotate(360deg)}}'}</style>
            <p style={{ fontSize: 15, margin: 0, color: '#e8e6f0' }}>{TEXT[lang].healing}</p>
            <p style={{ marginTop: 8, fontSize: 12, margin: '8px 0 0', color: 'rgba(232,230,240,0.55)' }}>
              {TEXT[lang].healingDesc}
            </p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang={lang === 'zh' ? 'zh-CN' : lang}>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#080709',
          color: '#e8e6f0',
          fontFamily:
            '"Noto Serif SC", "Songti SC", "PingFang SC", system-ui, -apple-system, sans-serif',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div
            style={{
              margin: '0 auto 20px',
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: '1px solid rgba(217,168,184,0.4)',
              color: '#d9a8b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              lineHeight: 1,
            }}
          >
            ✦
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 12px' }}>{TEXT[lang].title}</h1>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'rgba(232,230,240,0.62)', margin: 0 }}>
            {TEXT[lang].desc}
          </p>

          {/* 报错摘要 (排查用): 一行, 便于截图反馈 */}
          <p
            style={{
              marginTop: 16,
              marginBottom: 0,
              wordBreak: 'break-word',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              padding: '8px 12px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 10.5,
              lineHeight: 1.6,
              color: '#e8a08a',
            }}
          >
            [root] {msg}
            {error?.digest ? (
              <span style={{ display: 'block', color: 'rgba(232,230,240,0.32)' }}>#{error.digest}</span>
            ) : null}
          </p>
          {stack ? (
            <details style={{ marginTop: 8 }}>
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  color: 'rgba(232,230,240,0.32)',
                }}
              >
                {TEXT[lang].detail}
              </summary>
              <pre
                style={{
                  marginTop: 8,
                  maxHeight: 160,
                  overflow: 'auto',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(0,0,0,0.4)',
                  padding: 8,
                  textAlign: 'left',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 9.5,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  color: 'rgba(232,230,240,0.5)',
                }}
              >
                {stack}
              </pre>
            </details>
          ) : null}

          {error?.digest ? (
            <p
              style={{
                marginTop: 12,
                fontSize: 10,
                letterSpacing: '0.1em',
                color: 'rgba(232,230,240,0.32)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              #{error.digest}
            </p>
          ) : null}
          <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => reset()} style={btn}>
              {TEXT[lang].retry}
            </button>
            {/* global-error 替换了根布局, 没有 router context, 只能用 <a> 硬导航 */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ ...btn, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: 'rgba(232,230,240,0.62)' }}>
              {TEXT[lang].home}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
