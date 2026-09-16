'use client';

// ============================================================
// 排盘设置面板 (设置即盘面身份: 改动 → URL → 重排盘)
// 五区: 时间 / 天体 / 宫制扩展 / 相位(类型+容许度+规则) / 显示
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n';
import { L } from '@/lib/astro/i18n';
import type { BodyGroup, CastSettings } from '@/lib/astro/chart';
import { HOUSE_SYSTEM_LIST } from '@/lib/astro/chart';
import { DEFAULT_ORBS } from '@/lib/astro/chart-url';

const HOUSE_LIST = HOUSE_SYSTEM_LIST;

const GROUPS: { key: BodyGroup; zh: string; en: string; ja: string; hintZh: string; hintEn: string; hintJa: string }[] = [
  { key: 'asteroids', zh: '小行星', en: 'Asteroids', ja: '小惑星', hintZh: '谷神⚳ 智神⚴ 婚神⚵ 灶神⚶', hintEn: 'Ceres⚳ Pallas⚴ Juno⚵ Vesta⚶', hintJa: 'ケレス⚳ パラス⚴ ユノ⚵ ウェスタ⚶' },
  { key: 'chiron', zh: '凯龙星', en: 'Chiron', ja: 'キロン', hintZh: '⚷ 疗愈者', hintEn: '⚷ Chiron', hintJa: '⚷ キロン' },
  { key: 'nodes', zh: '月亮交点', en: 'Lunar Nodes', ja: 'ノード', hintZh: '☊☋ 南北交', hintEn: '☊☋ Lunar Nodes', hintJa: '☊☋ ノード' },
  { key: 'lilith', zh: '莉莉丝', en: 'Lilith', ja: 'リリス', hintZh: '⚸ 暗月', hintEn: '⚸ Lilith', hintJa: '⚸ リリス' },
  { key: 'lots', zh: '阿拉伯点位', en: 'Arabic Lots', ja: 'アラビックパーツ', hintZh: '⊕福点 ⊖精神点', hintEn: '⊕Fortune ⊖Spirit', hintJa: '⊕フォーチュン ⊖スピリット' },
];

const MAJOR = [
  { key: 'conjunction', sym: '☌', zh: '合', en: 'Conjunction', ja: 'コンジャンクション', deg: '0°' },
  { key: 'opposition', sym: '☍', zh: '冲', en: 'Opposition', ja: 'オポジション', deg: '180°' },
  { key: 'trine', sym: '△', zh: '三合', en: 'Trine', ja: 'トライン', deg: '120°' },
  { key: 'square', sym: '□', zh: '刑', en: 'Square', ja: 'スクエア', deg: '90°' },
  { key: 'sextile', sym: '⚹', zh: '六合', en: 'Sextile', ja: 'セクスタイル', deg: '60°' },
];
const MINOR = [
  { key: 'quincunx', sym: '⚻', zh: '梅花', en: 'Quincunx', ja: 'クインカンクス', deg: '150°' },
  { key: 'semi-sextile', sym: '⚶', zh: '半六合', en: 'Semi-sextile', ja: 'セミセクスタイル', deg: '30°' },
  { key: 'semi-square', sym: '∠', zh: '半刑', en: 'Semi-square', ja: 'セミスクエア', deg: '45°' },
  { key: 'sesquiquadrate', sym: '⚼', zh: '倍半刑', en: 'Sesqui-quad.', ja: 'セスキクアドレート', deg: '135°' },
  { key: 'quintile', sym: 'Q', zh: '五分相', en: 'Quintile', ja: 'クインタイル', deg: '72°' },
  { key: 'biquintile', sym: 'Q²', zh: '倍五分相', en: 'Biquintile', ja: 'バイクインタイル', deg: '144°' },
  { key: 'septile', sym: 'S', zh: '七分相', en: 'Septile', ja: 'セプタイル', deg: '51.4°' },
  { key: 'novile', sym: 'N', zh: '九分相', en: 'Novile', ja: 'ノヴァイル', deg: '40°' },
  { key: 'decile', sym: 'Y', zh: '十分相', en: 'Decile', ja: 'デカイル', deg: '36°' },
];

type Tab = 'time' | 'bodies' | 'houses' | 'aspects' | 'display';

const BLOCK_BTN = 'flex w-full items-center gap-2 rounded-xl border border-white/[0.1] bg-[#0a0e19]/90 px-3.5 py-[9px] text-left text-[11.5px] text-frost/75 shadow-[0_6px_18px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-colors hover:border-accent/40 hover:text-accent';

export default function ChartSettings({ value, onChange, sys, onSysChange, tabSignal, variant = 'pill' }: {
  value: CastSettings;
  onChange: (s: CastSettings) => void;
  sys?: string;
  onSysChange?: (s: string) => void;
  /** 父级请求直接打开某 Tab (nonce 变化触发) */
  tabSignal?: { tab: string; nonce: number };
  /** pill=顶部小按钮(默认); block=资料卡下方通栏按钮 */
  variant?: 'pill' | 'block';
}) {
  const { t, lang } = useI18n();
  const zhMode = lang !== 'en';
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('bodies');
  const seenNonce = useRef(-1);

  useEffect(() => {
    if (!tabSignal || tabSignal.nonce === undefined || tabSignal.nonce === seenNonce.current) return;
    seenNonce.current = tabSignal.nonce;
    setTab(tabSignal.tab as Tab);
    setOpen(true);
  }, [tabSignal?.nonce, tabSignal?.tab]);

  const set = (patch: Partial<CastSettings>) => onChange({ ...value, ...patch });
  const bodies = value.bodies ?? {};
  const aspectTypes = value.aspectTypes ?? MAJOR.map((m) => m.key);
  const orbs = value.orbs ?? {};
  const disp = value.display ?? {};

  const toggleGroup = (g: BodyGroup) => set({ bodies: { ...bodies, [g]: !bodies[g] } });
  const toggleAspect = (k: string) => {
    const has = aspectTypes.includes(k);
    set({ aspectTypes: has ? aspectTypes.filter((x) => x !== k) : [...aspectTypes, k] });
  };
  const setOrb = (k: string, v: number) => set({ orbs: { ...orbs, [k]: v } });
  const reset = () => onChange({});

  const activeCount =
    Object.values(bodies).filter(Boolean).length +
    Math.max(0, aspectTypes.length - 5) +
    Object.keys(orbs).length +
    (value.outOfSign === false ? 1 : 0) + (value.oosPenalty ? 1 : 0) + (value.minStrength ? 1 : 0) +
    (value.aspectScope && value.aspectScope !== 'all' ? 1 : 0) +
    (value.nodeType === 'mean' ? 1 : 0) + (value.lilithType && value.lilithType !== 'mean' ? 1 : 0) +
    (value.trueSolar ? 1 : 0) + Object.keys(disp).length;

  const TABS: { id: Tab; icon: string; zh: string; en: string; ja: string }[] = [
    { id: 'time', icon: '🕐', zh: '时间', en: 'Time', ja: '時間' },
    { id: 'bodies', icon: '☉', zh: '天体', en: 'Bodies', ja: '天体' },
    { id: 'houses', icon: '⬡', zh: '宫制', en: 'Houses', ja: 'ハウスシステム' },
    { id: 'aspects', icon: '△', zh: '相位', en: 'Aspects', ja: 'アスペクト' },
    { id: 'display', icon: '👁', zh: '显示', en: 'Display', ja: '表示' },
  ];

  // 小组件: 开关行
  const Toggle = ({ on, label, hint, onClick }: { on: boolean; label: string; hint?: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
        on ? 'border-accent/45 bg-accent/[0.07]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
      }`}
    >
      <span className="text-[12.5px] text-frost/90">
        {label}
        {hint && <span className="ml-2 text-[10px] text-muted/70">{hint}</span>}
      </span>
      <span className={`text-[10px] ${on ? 'text-accent' : 'text-muted/40'}`}>{on ? '●' : '○'}</span>
    </button>
  );
  // 小组件: 单选段
  const Seg = ({ opts, val, onPick }: { opts: { v: string; label: string }[]; val: string; onPick: (v: string) => void }) => (
    <div className="flex gap-1.5">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onPick(o.v)}
          className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] transition-colors ${
            val === o.v ? 'border-accent/45 bg-accent/[0.07] text-accent' : 'border-white/[0.08] text-muted hover:border-white/20'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <p className="mb-1.5 text-[11px] text-frost/80">{label}</p>
      {children}
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={variant === 'block' ? BLOCK_BTN : 'flex items-center gap-1.5 rounded-full border border-white/[0.12] px-3.5 py-1.5 text-[11px] tracking-[0.15em] text-muted transition-colors hover:border-accent/40 hover:text-frost'}
      >
        ⚙ {t('astro.set.title')}
        {activeCount > 0 && <span className={`${variant === 'block' ? 'ml-auto ' : ''}rounded-full bg-accent/20 px-1.5 text-[10px] text-accent`}>{activeCount}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative flex h-full w-full max-w-sm flex-col border-l border-white/[0.08] bg-[#0b0e17]/95"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'rise-in 0.35s cubic-bezier(0.16,1,0.3,1)' }}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <p className="font-display text-sm tracking-[0.2em] text-frost">⚙ {t('astro.set.title')}</p>
              <button onClick={() => setOpen(false)} className="glass-btn px-3 py-1 text-[10px] tracking-[0.2em]">✕</button>
            </div>

            {/* 分区 Tab */}
            <div className="flex border-b border-white/[0.06]">
              {TABS.map((tb) => (
                <button
                  key={tb.id}
                  onClick={() => setTab(tb.id)}
                  className={`flex-1 py-2.5 text-center text-[11px] tracking-[0.1em] transition-colors ${
                    tab === tb.id ? 'border-b-2 border-accent text-accent' : 'text-muted hover:text-frost'
                  }`}
                >
                  <span className="mr-1">{tb.icon}</span>{L(lang, tb.zh, tb.en, tb.ja)}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {/* ---- 时间 ---- */}
              {tab === 'time' && (
                <>
                  <Row label={t('astro.set.trueSolar')}>
                    <Toggle
                      on={!!value.trueSolar}
                      label={L(lang, '真太阳时校正', 'True solar time', '真太陽時補正')}
                      hint={lang === 'ja' ? '時計時→視太陽時' : zhMode ? '钟表时→视太阳时 (经度差+均时差)' : ''}
                      onClick={() => set({ trueSolar: !value.trueSolar })}
                    />
                    <p className="mt-1.5 text-[10px] leading-relaxed text-muted/60">{t('astro.set.trueSolarHint')}</p>
                  </Row>
                  <Row label={L(lang, '出生时间未知模式', 'Unknown-time mode', '出生時刻不明モード')}>
                    <p className="text-[11px] leading-relaxed text-muted/70">
                      {lang === 'ja' ? 'フォームの「出生時刻不明」を使用 — ASC/ハウス非表示、月は正午で近似。' : zhMode ? '在排盘表单点「我不知道出生时间」即可 — 上升/宫位不显示，月亮按正午近似并全程声明。' : 'Use the "no birth time" toggle on the form — ASC/houses hidden with a moon disclaimer.'}
                    </p>
                  </Row>
                </>
              )}

              {/* ---- 天体 ---- */}
              {tab === 'bodies' && (
                <>
                  <div className="space-y-1.5">
                    {GROUPS.map((g) => (
                      <Toggle key={g.key} on={!!bodies[g.key]} label={L(lang, g.zh, g.en, g.ja)} hint={lang === 'ja' ? g.hintJa : zhMode ? g.hintZh : g.hintEn} onClick={() => toggleGroup(g.key)} />
                    ))}
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted/60">{t('astro.set.bodiesHint')}</p>
                  {bodies.nodes && (
                    <Row label={L(lang, '交点类型', 'Node type', 'ノードの種類')}>
                      <Seg
                        opts={[{ v: 'true', label: L(lang, '真交点(默认)', 'True', 'トゥルーノード（既定）') }, { v: 'mean', label: L(lang, '平交点', 'Mean', 'ミーンノード') }]}
                        val={value.nodeType ?? 'true'}
                        onPick={(v) => set({ nodeType: v as 'true' | 'mean' })}
                      />
                    </Row>
                  )}
                  {bodies.lilith && (
                    <Row label={L(lang, '莉莉丝类型', 'Lilith type', 'リリス種別')}>
                      <Seg
                        opts={[{ v: 'mean', label: L(lang, '平均(默认)', 'Mean', 'ミーン（既定）') }, { v: 'true', label: L(lang, '真', 'True', 'トゥルー') }, { v: 'both', label: L(lang, '两者', 'Both', '両方') }]}
                        val={value.lilithType ?? 'mean'}
                        onPick={(v) => set({ lilithType: v as 'mean' | 'true' | 'both' })}
                      />
                    </Row>
                  )}
                </>
              )}

              {/* ---- 宫制 ---- */}
              {tab === 'houses' && (
                <>
                  <p className="text-[11px] leading-relaxed text-muted/70">{t('astro.set.houseHint')}</p>
                  {onSysChange && sys && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {HOUSE_LIST.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => onSysChange(h.id)}
                          className={`rounded-lg border px-2 py-2 text-center text-[11px] transition-colors ${
                            sys === h.id ? 'border-accent/45 bg-accent/[0.07] text-accent' : 'border-white/[0.08] bg-white/[0.02] text-muted hover:border-white/20'
                          }`}
                        >
                          <span className="block">{L(lang, h.zh, h.en, h.ja)}</span>
                          <span className="block text-[8.5px] text-muted/60">{h.id}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <Row label={L(lang, '整宫制起点', 'Whole-sign basis', 'ホールサインの起点')}>
                    <p className="text-[11px] leading-relaxed text-muted/70">
                      {lang === 'ja' ? 'ホールサインはASCのサインを1室とする（業界標準）。' : zhMode ? '本盘整宫制以上升星座为首宫（行业默认）。宫头制间差异属流派问题，无对错。' : 'Whole sign starts at the ASC sign (industry default).'}
                    </p>
                  </Row>
                </>
              )}

              {/* ---- 相位 ---- */}
              {tab === 'aspects' && (
                <>
                  <Row label={L(lang, '参与相位的天体范围', 'Aspect bodies', 'アスペクト対象')}>
                    <Seg
                      opts={[
                        { v: 'core', label: L(lang, '十主星', 'Core', '主要10天体') },
                        { v: 'planets', label: L(lang, '主星+虚点', '+Points', '＋ポイント') },
                        { v: 'asteroids', label: L(lang, '+小行星', '+Astr', '＋小惑星') },
                        { v: 'all', label: L(lang, '全部', 'All', 'すべて') },
                      ]}
                      val={value.aspectScope ?? 'all'}
                      onPick={(v) => set({ aspectScope: v as CastSettings['aspectScope'] })}
                    />
                  </Row>
                  <Row label={L(lang, '跨星座相位', 'Out-of-sign aspects', 'サイン外アスペクト')}>
                    <Toggle
                      on={value.outOfSign !== false}
                      label={L(lang, '允许跨星座成相', 'Allow out-of-sign', 'サイン外を許可')}
                      onClick={() => set({ outOfSign: value.outOfSign === false })}
                    />
                    {value.outOfSign !== false && (
                      <div className="mt-2.5">
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span className="text-frost/85">{L(lang, '跨星座强度惩罚', 'OOS penalty', 'サイン外の強度ペナルティ')}</span>
                          <span className={value.oosPenalty ? 'text-accent' : 'text-muted/60'}>
                            {((value.oosPenalty ?? 0) * 100).toFixed(0)}%
                            {!!value.oosPenalty && (
                              <button onClick={() => set({ oosPenalty: undefined })} className="ml-1.5 underline decoration-dotted">↺</button>
                            )}
                          </span>
                        </div>
                        <input type="range" min={0} max={1} step={0.1} value={value.oosPenalty ?? 0}
                          onChange={(e) => set({ oosPenalty: Number(e.target.value) || undefined })}
                          className="w-full accent-[var(--accent,#c9a86c)]" />
                      </div>
                    )}
                  </Row>
                  <Row label={L(lang, '相位最低强度 (0=全显示)', 'Min aspect strength', 'アスペクト最低強度（0=全表示）')}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="text-frost/85">{L(lang, '过滤松散相位', 'Filter loose', '緩いアスペクトを除外')}</span>
                      <span className={value.minStrength ? 'text-accent' : 'text-muted/60'}>
                        {value.minStrength ?? 0}
                        {!!value.minStrength && <button onClick={() => set({ minStrength: undefined })} className="ml-1.5 underline decoration-dotted">↺</button>}
                      </span>
                    </div>
                    <input type="range" min={0} max={80} step={5} value={value.minStrength ?? 0}
                      onChange={(e) => set({ minStrength: Number(e.target.value) || undefined })}
                      className="w-full accent-[var(--accent,#c9a86c)]" />
                  </Row>
                  <Row label={L(lang, '相位类型', 'Aspect types', 'アスペクト種別')}>
                    <div className="grid grid-cols-2 gap-1.5">
                      {MAJOR.map((a) => (
                        <div key={a.key} className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                          <span className="w-5 text-center text-[13px] text-accent/80">{a.sym}</span>
                          <span className="flex-1 text-[12px] text-frost/90">{L(lang, a.zh, a.en, a.ja)}<span className="ml-1 text-[9px] text-muted/60">{a.deg}</span></span>
                          <span className="text-[9px] text-muted/50">{t('astro.set.alwaysOn')}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mb-1.5 mt-3 text-[10px] tracking-[0.2em] text-muted/70 uppercase">{t('astro.set.minor')}</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {MINOR.map((a) => {
                        const on = aspectTypes.includes(a.key);
                        return (
                          <button
                            key={a.key}
                            onClick={() => toggleAspect(a.key)}
                            className={`rounded-lg border px-2 py-1.5 text-center transition-colors ${
                              on ? 'border-accent/45 bg-accent/[0.07] text-accent' : 'border-white/[0.08] bg-white/[0.02] text-muted hover:border-white/20'
                            }`}
                          >
                            <span className="block text-[13px]">{a.sym}</span>
                            <span className="block text-[10px]">{L(lang, a.zh, a.en, a.ja)}</span>
                            <span className="block text-[8.5px] text-muted/60">{a.deg}</span>
                          </button>
                        );
                      })}
                    </div>
                  </Row>
                  <Row label={t('astro.set.orbs')}>
                    <div className="space-y-3">
                      {MAJOR.map((a) => {
                        const v = orbs[a.key] ?? DEFAULT_ORBS[a.key];
                        const changed = orbs[a.key] !== undefined;
                        return (
                          <div key={a.key}>
                            <div className="mb-1 flex items-center justify-between text-[11px]">
                              <span className="text-frost/85">{a.sym} {L(lang, a.zh, a.en, a.ja)}</span>
                              <span className={changed ? 'text-accent' : 'text-muted/60'}>
                                {v.toFixed(1)}°{changed && (
                                  <button onClick={() => { const n = { ...orbs }; delete n[a.key]; set({ orbs: n }); }} className="ml-1.5 underline decoration-dotted">↺</button>
                                )}
                              </span>
                            </div>
                            <input type="range" min={0.5} max={15} step={0.5} value={v}
                              onChange={(e) => setOrb(a.key, Number(e.target.value))}
                              className="w-full accent-[var(--accent,#c9a86c)]" />
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-[10px] leading-relaxed text-muted/60">{t('astro.set.orbsHint')}</p>
                  </Row>
                </>
              )}

              {/* ---- 显示 ---- */}
              {tab === 'display' && (
                <>
                  <Row label={L(lang, '盘向', 'Wheel direction', 'ホイールの向き')}>
                    <Seg
                      opts={[{ v: 'ccw', label: L(lang, '逆时针(标准)', 'CCW (standard)', '反時計回り（標準）') }, { v: 'cw', label: L(lang, '顺时针', 'CW', '時計回り') }]}
                      val={disp.dir ?? 'ccw'}
                      onPick={(v) => set({ display: { ...disp, dir: v === 'cw' ? 'cw' : undefined } })}
                    />
                    <p className="mt-1.5 text-[10px] leading-relaxed text-muted/60">{t('astro.set.dirHint')}</p>
                  </Row>
                  <Row label={L(lang, '上升点位置', 'ASC position', 'アセンダントの位置')}>
                    <Seg
                      opts={[{ v: 'left', label: L(lang, '左(9点·标准)', 'Left (9h)', '左（9時・標準）') }, { v: 'top', label: L(lang, '上(12点)', 'Top (12h)', '上（12時）') }]}
                      val={disp.ascPos ?? 'left'}
                      onPick={(v) => set({ display: { ...disp, ascPos: v === 'top' ? 'top' : undefined } })}
                    />
                  </Row>
                  <Row label={L(lang, '图层', 'Layers', 'レイヤー')}>
                    <div className="space-y-1.5">
                      <Toggle on={disp.aspects !== false} label={L(lang, '相位线', 'Aspect lines', 'アスペクト線')} onClick={() => set({ display: { ...disp, aspects: disp.aspects === false ? undefined : false } })} />
                      <Toggle on={!!disp.feetAlways} label={L(lang, '脚线刻度点', 'Foot lines', 'フットライン')} hint={lang === 'ja' ? 'オフ → 選択時のみ → 常時表示' : zhMode ? '关 → 仅选中星 → 常显 三态循环' : 'off → selected-only → always'} onClick={() => {
                        const n = { ...disp }; const cur = n.feet === false ? 0 : n.feetAlways ? 1 : 2; // 0关 1常显 2仅选中(默认)
                        delete n.feetAlways; delete n.feet
                        if (cur === 0) n.feetAlways = true        // 关 → 常显
                        else if (cur === 1) { /* 常显 → 仅选中 = 两删 */ }
                        else n.feet = false                        // 仅选中 → 关
                        set({ display: n })
                      }} />
                      <Toggle on={disp.nums !== false} label={L(lang, '宫号', 'House numbers', 'ハウス番号')} onClick={() => set({ display: { ...disp, nums: disp.nums === false ? undefined : false } })} />
                      <Toggle on={disp.ticks !== false} label={L(lang, '刻度针脚', 'Degree ticks', '度数ティック')} onClick={() => set({ display: { ...disp, ticks: disp.ticks === false ? undefined : false } })} />
                    </div>
                  </Row>
                </>
              )}
            </div>

            <div className="flex gap-2 border-t border-white/[0.06] px-5 py-4">
              <button onClick={reset} className="glass-btn flex-1 py-2.5 text-[11px] tracking-[0.25em]">
                {t('astro.set.reset')}
              </button>
              <button onClick={() => setOpen(false)} className="glass-btn-primary flex-1 py-2.5 text-[11px] tracking-[0.25em]">
                {t('astro.set.done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
