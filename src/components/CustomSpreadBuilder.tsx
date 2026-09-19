'use client';

/**
 * 自定义牌阵 · 满铺网格布阵（塔罗/雷诺曼共用）
 * 画布竖向固定 8 行、横向按需扩展，点哪个格子哪张牌背出现，
 * 按点击顺序编号；点击牌背会在该牌所在行的正下方嵌出牌位内容面板（命名/定位/移除）；
 * 牌阵可命名保存（登录 → 云端同步，未登录 → 本机浏览器），下次一键载入复用。
 * 确定牌阵后直接进对应牌组的抽牌系统；「线下抽牌」切到同页填牌解读。
 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookmarkPlus, RotateCcw, Trash2, Undo2, X } from 'lucide-react';
import PageShell, { Reveal } from '@/components/PageShell';
import OfflineInterpretSection from '@/components/OfflineInterpretSection';
import { useI18n } from '@/i18n';
import {
  deleteSpreadSmart,
  loadSpreadsSmart,
  saveSpreadSmart,
  type SavedSpread,
} from '@/lib/account/spreads';

/** 自定义牌阵格位（布阵页与解读室共用的数据结构） */
export interface CustomCell {
  row: number; // 0~7（自上而下）
  col: number; // 0~cols-1（自左而右）
  cols: number; // 画布总列数
  name?: string; // 客户命名的牌位名（可空）
  hint?: string; // 牌位解读提示：专业师自定的读法要点，解读时显示在牌位旁（可空）
}

/** 布阵阶段上限：8 行 × 12 列 = 96 格；单次解读最多 12 张 */
const MAX_COLS = 12;
const MAX_CARDS = 12;
const CELL_W = 52;
const CELL_H = 82;
const CARD_BACK = '/cards/card-back-new.webp';

export default function CustomSpreadBuilder({ deck }: { deck: 'tarot' | 'lenormand' }) {
  const isLn = deck === 'lenormand';
  const DRAW_HREF = isLn ? '/lenormand/draw' : '/online';
  const router = useRouter();
  const { t } = useI18n();
  const [count, setCount] = useState(5);
  const [cells, setCells] = useState<CustomCell[]>([]);
  const [question, setQuestion] = useState('');
  const [background, setBackground] = useState('');
  const [activeIdx, setActiveIdx] = useState<number | null>(null); // 弹窗对应的牌序号
  const [nameDraft, setNameDraft] = useState('');
  const [hintDraft, setHintDraft] = useState('');
  // 牌阵保存与复用
  const [spreadName, setSpreadName] = useState('');
  const [spreadDesc, setSpreadDesc] = useState('');
  const [savedSpreads, setSavedSpreads] = useState<SavedSpread[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [step, setStep] = useState<'build' | 'offline'>('build');

  // 载入牌阵列表：登录 → 云端；未登录 → 本机（老 localStorage 数据无缝读取）
  useEffect(() => {
    let alive = true;
    loadSpreadsSmart(deck).then((r) => {
      if (alive) setSavedSpreads(r.list);
    });
    return () => {
      alive = false;
    };
  }, [deck]);

  // 点选一个空格 → 翻出牌背并编号
  const pick = (row: number, col: number) => {
    if (cells.length >= count) return;
    if (cells.some((c) => c.row === row && c.col === col)) return;
    setCells([...cells, { row, col, cols: MAX_COLS }]);
  };

  // 撤销最后一张
  const undo = () => {
    setCells(cells.slice(0, -1));
    if (activeIdx !== null && activeIdx >= cells.length - 1) setActiveIdx(null);
  };

  // 清空重摆
  const reset = () => {
    setCells([]);
    setActiveIdx(null);
  };

  // 打开某张牌的内容面板（旁边弹出）
  const openPanel = (idx: number) => {
    setActiveIdx(idx);
    setNameDraft(cells[idx]?.name ?? '');
    setHintDraft(cells[idx]?.hint ?? '');
  };

  // 保存牌位名与解读提示（保存后自动关闭面板）
  const saveName = () => {
    if (activeIdx === null) return;
    const next = [...cells];
    next[activeIdx] = {
      ...next[activeIdx],
      name: nameDraft.trim() || undefined,
      hint: hintDraft.trim() || undefined,
    };
    setCells(next);
    setActiveIdx(null);
  };

  // 移除某一张（其余自动重新编号）
  const removeCell = (idx: number) => {
    setCells(cells.filter((_, i) => i !== idx));
    setActiveIdx(null);
  };

  // 保存当前布阵为具名牌阵（同名覆盖；登录走云端，未登录存本机）
  const saveSpread = async () => {
    const name = spreadName.trim();
    if (!name || !cells.length) return;
    const r = await saveSpreadSmart(deck, name, cells.map((c) => ({ ...c })), {
      description: spreadDesc.trim(),
    });
    setSavedSpreads((prev) => [r.spread, ...prev.filter((s) => s.name !== name)]);
    setShowSave(false);
  };

  // 载入一套已存牌阵（同时带出名称与说明，便于改完直接覆盖保存）
  const loadSpread = (s: SavedSpread) => {
    setCells(s.cells.map((c) => ({ ...c, cols: MAX_COLS })));
    setCount(Math.min(Math.max(s.cells.length, 1), MAX_CARDS));
    setSpreadName(s.name);
    setSpreadDesc(s.description ?? '');
    setActiveIdx(null);
  };

  const deleteSpread = async (s: SavedSpread) => {
    await deleteSpreadSmart(s);
    setSavedSpreads((prev) => prev.filter((x) => x.id !== s.id));
  };

  // 开始占卜：直接进抽牌系统（问题/背景可不填）
  const startReading = () => {
    if (!cells.length) return;
    const payload = encodeURIComponent(JSON.stringify(cells));
    router.push(`${DRAW_HREF}?spread=custom&count=${count}&layout=${payload}&q=${encodeURIComponent(question)}&bg=${encodeURIComponent(background)}`);
  };

  // 我已抽牌：同页切到线下填牌（保留已布好的格子/问题背景，返回不丢）
  const startOffline = () => {
    if (!cells.length) return;
    setStep('offline');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const gridRows = Array.from({ length: 8 }, (_, i) => i);
  const gridCols = Array.from({ length: MAX_COLS }, (_, i) => i);

  const cellKey = (row: number, col: number) => `${row}:${col}`;
  const pickedMap = useMemo(() => {
    const m = new Map<string, number>();
    cells.forEach((c, i) => m.set(cellKey(c.row, c.col), i));
    return m;
  }, [cells]);

  const full = cells.length >= count;
  const active = activeIdx !== null ? cells[activeIdx] : undefined;
  const panelRef = useRef<HTMLDivElement>(null);

  // 面板出现在画布下方 → 每次换一张牌都把它滚进视野，不然小屏上键盘一挡就看不见改的是哪张
  useEffect(() => {
    if (activeIdx !== null) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeIdx]);

  if (step === 'offline') {
    return (
      <PageShell
        label={isLn ? 'Lenormand · Custom' : 'Custom Spread'}
        title={spreadName || (isLn ? t('lnflow.customTitle') : t('custom.title'))}
        subtitle={t('custom.offlineSubtitle')}
      >
        <OfflineInterpretSection
          deck={deck}
          presetCustomCount={count}
          presetCustomPositions={cells.map((c, i) => c.name || `第${i + 1}张`).join(',')}
          presetCustomCells={cells}
          customName={spreadName || undefined}
          presetQuestion={question}
          presetBackground={background}
          hideCustomSettings
          hideQuestionInput
          onBack={() => { setStep('build'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        />
      </PageShell>
    );
  }

  /**
   * 牌位内容面板：嵌进网格，插在所点那张牌所在行的正下方。
   * 画布是 12 列 ≈720px 的横向滚动区，屏幕只有 393px，所以面板用 sticky left-0 钉在滚动区左沿：
   * 纵向紧跟那张牌（不用把视角挪到底部再滑回来），横向无论画布滚到哪都完整在屏幕里。
   * 以前是绝对定位贴在牌的右侧 —— 实测点到第 4 张时面板落在 256~492，右半 99px 在屏幕外。
   */
  const panelEl =
    active !== undefined && activeIdx !== null ? (
      <div
        ref={panelRef}
        className="sticky left-0 z-20 mt-1.5 w-[min(360px,calc(100vw-2.5rem))] rounded-xl border border-accent/25 bg-[#14121f]/95 p-3.5 backdrop-blur-sm"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-display text-xs tracking-[0.1em] text-frost">
            <span className="mr-1.5 text-accent">{String(activeIdx + 1).padStart(2, '0')}</span>
            {t('custom.cellPos', { row: active.row + 1, col: active.col + 1 })}
          </p>
          <button
            onClick={() => setActiveIdx(null)}
            aria-label={t('common.close')}
            className="rounded p-0.5 text-muted transition-colors hover:text-frost"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveName(); }}
          maxLength={16}
          placeholder={t('custom.namePlaceholder')}
          className="w-full rounded-lg border border-white/[0.1] bg-black/25 px-2.5 py-1.5 text-xs text-frost placeholder:text-muted/40 focus:border-accent/40 focus:outline-none"
        />
        {/* 牌位解读提示：专业师自定的读法要点，解读时随牌位显示 */}
        <textarea
          value={hintDraft}
          onChange={(e) => setHintDraft(e.target.value)}
          rows={2}
          maxLength={120}
          placeholder={t('custom.cellHintPlaceholder')}
          className="mt-1.5 w-full resize-none rounded-lg border border-white/[0.1] bg-black/25 px-2.5 py-1.5 text-[11px] leading-relaxed text-frost placeholder:text-muted/40 focus:border-accent/40 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            onClick={saveName}
            className="inline-flex h-7 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-full border border-accent/40 bg-accent/15 px-3 text-[11px] font-medium leading-none text-frost transition-colors hover:bg-accent/25"
          >
            {t('custom.nameSave')}
          </button>
          <button
            onClick={() => removeCell(activeIdx)}
            aria-label={t('custom.removeCard')}
            className="inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-red-500/25 bg-transparent px-2.5 text-[11px] leading-none text-red-400 transition-colors hover:bg-red-500/10"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
            {t('custom.removeCard')}
          </button>
        </div>
      </div>
    ) : null;

  return (
    <PageShell
      label={t('custom.label')}
      title={t('custom.title')}
      subtitle={t('custom.gridSubtitle')}
    >
      <Reveal className="mt-8 space-y-6">
        {/* 选牌数量 */}
        <div>
          <label className="mb-3 block text-xs tracking-[0.2em] text-muted uppercase">
            {t('custom.countLabel2')}
          </label>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: MAX_CARDS }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`h-10 w-10 rounded-full text-sm transition-all duration-200 ${
                  count === n
                    ? 'border-accent/50 bg-accent/15 text-frost'
                    : 'border-white/[0.08] bg-white/[0.03] text-muted hover:border-white/[0.18]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* 我的牌阵：已保存的布阵一键载入 */}
        {savedSpreads.length > 0 && (
          <div>
            <label className="mb-3 block text-xs tracking-[0.2em] text-muted uppercase">
              {t('custom.mySpreads')}
            </label>
            <div className="flex flex-wrap gap-2">
              {savedSpreads.map((s) => (
                <span
                  key={s.name}
                  className="group inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/[0.06] pl-3 pr-1.5 py-1.5 text-xs"
                >
                  <button onClick={() => loadSpread(s)} className="text-accent transition-colors hover:text-frost">
                    {s.name}
                    <span className="ml-1.5 text-[10px] text-muted">{s.cells.length}</span>
                  </button>
                  <button
                    onClick={() => void deleteSpread(s)}
                    aria-label={`${t('custom.deleteSpread')} ${s.name}`}
                    className="rounded-full p-0.5 text-muted/50 transition-colors hover:bg-red-500/15 hover:text-red-400"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 满铺网格布阵画布：竖 8 行 × 横 12 列，横向滚动 */}
        <div>
          <label className="mb-3 block text-xs tracking-[0.2em] text-muted uppercase">
            {t('custom.canvasLabel')}
            <span className={`ml-3 font-display tracking-normal ${full ? 'text-accent' : ''}`}>
              {cells.length} / {count}
            </span>
          </label>

          <div className="overflow-x-auto pb-2">
            <div className="relative mx-auto w-max">
              {gridRows.map((row) => (
                <Fragment key={row}>
                  <div className="flex gap-1.5 sm:gap-2" style={{ paddingBottom: '0.375rem' }}>
                  {gridCols.map((col) => {
                    const idx = pickedMap.get(cellKey(row, col));
                    const picked = idx !== undefined;
                    return picked ? (
                      /* 已选格：牌背 + 顺序编号徽章 + 点击在旁边弹内容面板 */
                      <button
                        key={col}
                        onClick={() => openPanel(idx)}
                        className={`relative shrink-0 rounded-md shadow-md shadow-black/40 transition-transform hover:scale-[1.05] ${
                          activeIdx === idx ? 'ring-1 ring-accent/60' : ''
                        }`}
                        style={{ width: CELL_W, height: CELL_H }}
                        aria-label={`${t('custom.cardN', { n: idx + 1 })}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={CARD_BACK}
                          alt=""
                          draggable={false}
                          className="h-full w-full rounded-md object-cover"
                        />
                        <span className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent/85 text-[9px] font-medium leading-none text-black shadow-[0_0_0_1px_rgba(0,0,0,0.5)] ring-1 ring-black/40">
                          {idx + 1}
                        </span>
                        {(cells[idx]?.name) && (
                          <span className="absolute inset-x-0 bottom-1 truncate px-1 text-center text-[8px] leading-tight text-accent/80">
                            {cells[idx]!.name}
                          </span>
                        )}
                      </button>
                    ) : (
                      /* 空格：虚线框，hover 高亮提示可点 */
                      <button
                        key={col}
                        onClick={() => pick(row, col)}
                        disabled={full}
                        aria-label={`slot ${row + 1}-${col + 1}`}
                        className={`shrink-0 rounded-md border border-dashed transition-all duration-150 ${
                          full
                            ? 'cursor-not-allowed border-white/[0.04]'
                            : 'border-white/[0.1] hover:border-accent/50 hover:bg-accent/[0.06]'
                        }`}
                        style={{ width: CELL_W, height: CELL_H }}
                      >
                        {!picked && !full && (
                          <span className="block text-center text-xs text-muted/30">＋</span>
                        )}
                      </button>
                    );
                  })}
                  </div>
                  {/* 面板嵌在这一行的下面：紧跟刚点的那张牌，不用把视角挪到画布底部再滑回来 */}
                  {active?.row === row && panelEl}
                </Fragment>
              ))}
            </div>
          </div>

          {/* 控制栏：撤销 / 清空 / 保存牌阵。
              padding 与字号必须用 ! 强制：.glass-btn 是不在任何 @layer 里的裸 CSS（padding 12px 32px、
              font-size .875rem），Tailwind v4 的 utility 在 @layer utilities 里，未分层的规则优先级更高，
              所以不加强制就会顶着 32px 左右内边距 + 14px 字号，三个按钮挤不进 362px → 文字折成竖排穿出按钮。 */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={undo} disabled={!cells.length} className={`glass-btn inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap px-3! text-[11px]! ${!cells.length ? 'opacity-40' : ''}`}>
              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />{t('custom.undo')}
            </button>
            <button onClick={reset} disabled={!cells.length} className={`glass-btn inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap px-3! text-[11px]! ${!cells.length ? 'opacity-40' : ''}`}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />{t('custom.reset')}
            </button>
            <button
              onClick={() => setShowSave(true)}
              disabled={!cells.length}
              className={`glass-btn ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap px-3! text-[11px]! ${!cells.length ? 'opacity-40' : ''}`}
            >
              <BookmarkPlus className="h-3.5 w-3.5 text-accent" aria-hidden="true" />{t('custom.saveSpreadBtn')}
            </button>
          </div>

          {/* 保存牌阵命名窗口 */}
          {showSave && (
            <div className="mt-3 rounded-xl border border-accent/20 bg-accent/[0.05] p-4">
              <p className="mb-2 text-xs text-frost">{t('custom.saveSpreadTitle')}</p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={spreadName}
                  onChange={(e) => setSpreadName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void saveSpread(); }}
                  maxLength={20}
                  placeholder={t('custom.spreadNamePlaceholder')}
                  className="min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-black/20 px-3 py-2 text-sm text-frost placeholder:text-muted/40 focus:border-accent/40 focus:outline-none"
                />
                <button
                  onClick={() => void saveSpread()}
                  disabled={!spreadName.trim()}
                  className={`inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-accent/40 bg-accent/15 px-4 text-xs font-medium leading-none text-frost transition-colors hover:bg-accent/25 ${!spreadName.trim() ? 'opacity-40' : ''}`}
                >
                  {t('custom.nameSave')}
                </button>
                <button onClick={() => setShowSave(false)} className="glass-btn h-9 px-4 text-xs">
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              {/* 牌阵说明：专业师会写这套牌阵怎么读、有什么讲究 */}
              <label className="mb-1.5 mt-3 block text-[11px] text-muted/70">
                {t('custom.spreadDescLabel')}
              </label>
              <textarea
                value={spreadDesc}
                onChange={(e) => setSpreadDesc(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder={t('custom.spreadDescPlaceholder')}
                className="w-full resize-none rounded-lg border border-white/[0.1] bg-black/20 px-3 py-2 text-[12.5px] leading-relaxed text-frost placeholder:text-muted/40 focus:border-accent/40 focus:outline-none"
              />
            </div>
          )}

          <p className="mt-2 text-right text-xs text-muted">{t('custom.canvasHint')}</p>
        </div>

        {/* 所问问题 + 背景：紧邻开始按钮，均可留空 */}
        <div className="space-y-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
          <div>
            <label className="mb-2 block text-xs tracking-[0.2em] text-muted uppercase">
              {t('custom.questionLabel')}
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={60}
              placeholder={t('online.question')}
              rows={2}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-frost placeholder:text-muted/40 focus:border-accent/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs tracking-[0.2em] text-muted uppercase">
              {t('quick.bgLabel')}
            </label>
            <textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              maxLength={200}
              placeholder={t('quick.bgPlaceholder')}
              rows={2}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-frost placeholder:text-muted/40 focus:border-accent/40 focus:outline-none"
            />
          </div>
        </div>

        {/* 开始占卜 / 我已抽牌 并排 */}
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <button
            onClick={startReading}
            disabled={!cells.length}
            className={`glass-btn-primary flex-1 text-center text-sm tracking-[0.2em] ${!cells.length ? 'opacity-40' : ''}`}
          >
            {t('online.start')} →
          </button>
          <button
            onClick={startOffline}
            disabled={!cells.length}
            className={`liquid-glass flex-1 rounded-full px-6 py-4 text-sm tracking-[0.2em] text-frost transition-all hover:bg-white/[0.04] ${!cells.length ? 'opacity-40' : ''}`}
          >
            {t('custom.offlineBtn')}
          </button>
        </div>
      </Reveal>
    </PageShell>
  );
}
