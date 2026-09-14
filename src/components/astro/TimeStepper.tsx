'use client';

// ============================================================
// 时间步进器 (爸爸: 除本命外盘都可变动, 要时间窗口, 速度=年/月/日/时/分)
// ◀ 2026-09-14 15:30 ▶  +  单位切换 (年/月/日/时/分, 按盘种给)
// 供 推运盘 (次限/三限/行运/日返/月返/日弧) 与 天象盘 共用
// ============================================================
import React, { useState } from 'react';

export type StepUnit = 'y' | 'mo' | 'd' | 'h' | 'mi';
export interface TimeParts { y: number; m: number; d: number; h: number; mi: number }

const UNIT_ZH: Record<StepUnit, string> = { y: '年', mo: '月', d: '日', h: '时', mi: '分' };
const UNIT_EN: Record<StepUnit, string> = { y: 'Y', mo: 'M', d: 'D', h: 'h', mi: 'm' };

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** 步进 (日/时/分走 Date 归一; 年/月做月末钳制防 1/31→3/3) */
export function stepTime(t: TimeParts, dir: 1 | -1, unit: StepUnit): TimeParts {
  let { y, m, d, h, mi } = t;
  if (unit === 'y') {
    y += dir;
    d = Math.min(d, daysInMonth(y, m));
  } else if (unit === 'mo') {
    m += dir;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    d = Math.min(d, daysInMonth(y, m));
  } else {
    const dt = new Date(Date.UTC(y, m - 1, d, h, mi));
    if (unit === 'd') dt.setUTCDate(dt.getUTCDate() + dir);
    else if (unit === 'h') dt.setUTCHours(dt.getUTCHours() + dir);
    else dt.setUTCMinutes(dt.getUTCMinutes() + dir);
    y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate(); h = dt.getUTCHours(); mi = dt.getUTCMinutes();
  }
  // 年边界保护 (1900-2100)
  if (y < 1900) return { ...t };
  if (y > 2100) return { ...t };
  return { y, m, d, h, mi };
}

export default function TimeStepper({ value, units, zhMode, onChange, onNow }: {
  value: TimeParts;
  units: StepUnit[];
  zhMode: boolean;
  onChange: (t: TimeParts) => void;
  /** "今": 回到访客当下 (爸爸: 别人进来=当下时间) */
  onNow?: () => void;
}) {
  const [unit, setUnit] = useState<StepUnit>(units[0] ?? 'd');
  const active = units.includes(unit) ? unit : units[0];
  const showTime = units.includes('h') || units.includes('mi');
  const pad = (x: number) => String(x).padStart(2, '0');
  const btnCls = 'flex size-7 shrink-0 select-none items-center justify-center rounded-full border border-white/[0.14] text-[12px] text-muted transition-colors hover:border-accent/40 hover:text-accent';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button className={btnCls} aria-label="prev" onClick={() => onChange(stepTime(value, -1, active))}>◀</button>
        <div className="text-center">
          <p className="font-display text-[14px] leading-tight tracking-[0.08em] text-frost tabular-nums">
            {value.y}-{pad(value.m)}-{pad(value.d)}{showTime ? ` ${pad(value.h)}:${pad(value.mi)}` : ''}
          </p>
          {!showTime && <p className="text-[9px] text-muted/45">{zhMode ? '盘面按日推进' : 'date-level'}</p>}
        </div>
        <button className={btnCls} aria-label="next" onClick={() => onChange(stepTime(value, 1, active))}>▶</button>
      </div>
      <div className="flex justify-center gap-1">
        {units.map((u) => (
          <button
            key={u}
            onClick={() => setUnit(u)}
            className={`rounded-full border px-2.5 py-0.5 text-[10.5px] transition-colors ${active === u ? 'border-accent/50 bg-accent/[0.08] text-accent' : 'border-white/[0.08] text-muted/70 hover:border-white/25'}`}
          >
            {zhMode ? UNIT_ZH[u] : UNIT_EN[u]}
          </button>
        ))}
        {onNow && (
          <button
            onClick={onNow}
            title={zhMode ? '回到现在' : 'Back to now'}
            className="rounded-full border border-white/[0.08] px-2.5 py-0.5 text-[10.5px] text-muted/70 transition-colors hover:border-accent/40 hover:text-accent"
          >
            {zhMode ? '今' : 'Now'}
          </button>
        )}
      </div>
    </div>
  );
}
