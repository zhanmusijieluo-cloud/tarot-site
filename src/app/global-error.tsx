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
// ============================================================

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 留现场, 便于线上定位 (Vercel 日志里能按 digest 捞)
    try {
      console.error('[global-error]', error?.message, error?.digest, error?.stack);
    } catch {
      /* 忽略 */
    }
  }, [error]);

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

  return (
    <html lang="zh">
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
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 12px' }}>页面出了点问题</h1>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'rgba(232,230,240,0.62)', margin: 0 }}>
            不是你的操作有问题，重新加载一下通常就能恢复。
          </p>
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
              重新加载
            </button>
            <a href="/" style={{ ...btn, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: 'rgba(232,230,240,0.62)' }}>
              回首页
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
