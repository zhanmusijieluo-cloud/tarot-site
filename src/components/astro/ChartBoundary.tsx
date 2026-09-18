'use client';

// ============================================================
// 盘面级错误边界
//
// 为什么需要它:
//   路由级 error.tsx 只能兜住"整页崩"。但星盘页里真正容易抛错的是
//   绘图组件 (ChartWheel / ChartWheel2D / DynResult / SynastryResult / BandResult) —
//   它们吃的是排盘数据, 遇到极端纬度/罕见宫制/缺数据的行星时可能在
//   render 里 throw。一旦 throw 且没有边界, React 会卸载整棵树 → 整页白屏,
//   用户看到的正是"切个盘/点个星体突然就崩了"。
//
// 有了这层: 崩掉的只是那块盘, 外面的切换条/设置/按钮全都还活着,
// 用户可以直接切到别的盘种继续用, 不用刷新。
//
// resetKey: 盘种/宫制/生辰变化时自动清错, 避免"崩过一次就再也恢复不了"。
// ============================================================

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** 变化即清空错误状态 (通常传盘种+宫制+生辰拼成的 key) */
  resetKey?: string;
  /** 崩溃时展示的简短标题, 不传用默认 */
  label?: string;
};

type State = { hasError: boolean; message: string };

export default class ChartBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 留现场: 线上可据此定位是哪个盘种/哪段组件树炸的
    try {
      console.error('[chart-boundary]', error?.message, error?.stack, info?.componentStack);
    } catch {
      /* 忽略 */
    }
  }

  componentDidUpdate(prev: Props) {
    // 切盘/改宫制后自动恢复, 否则用户会卡在错误页上出不来
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, message: '' });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#0c101c]/[0.85] px-6 py-10 text-center backdrop-blur-sm">
        <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-full border border-accent/40 text-accent">
          <span className="text-base leading-none">✦</span>
        </div>
        <p className="font-serif text-[15px] text-frost">
          {this.props.label ?? '这张盘没能画出来'}
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          换一个盘种或宫制通常就能恢复；也可以刷新本页重试。
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="rounded-full border border-accent/50 bg-accent/[0.08] px-4 py-1.5 text-[11px] tracking-[0.15em] text-accent transition-colors hover:border-accent"
          >
            重试
          </button>
          <a
            href="/astrology"
            className="rounded-full border border-white/[0.12] px-4 py-1.5 text-[11px] tracking-[0.15em] text-muted transition-colors hover:border-white/30 hover:text-frost"
          >
            重新排盘
          </a>
        </div>
      </div>
    );
  }
}
