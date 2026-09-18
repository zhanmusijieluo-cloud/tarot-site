'use client';

/**
 * 我的牌阵（账户中心）
 * 列出云端 / 本机保存的自定义牌阵，支持：直接开始占卜、删除、导出、导入、登录后迁移到云端。
 * 面向专业塔罗师：牌阵是重要资产，必须能带走（导出）和长期留存（云端）。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import AccountNav from '@/components/account/AccountNav';
import { useI18n } from '@/i18n';
import {
  buildSpreadExport,
  deleteSpreadSmart,
  loadSpreadsSmart,
  migrateSpreadsToCloud,
  parseSpreadImport,
  saveSpreadSmart,
  type Deck,
  type SavedSpread,
} from '@/lib/account/spreads';
import { supabaseBrowser } from '@/lib/supabase';

export default function MySpreadsPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const ja = lang === 'ja';
  const en = lang === 'en';
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [deck, setDeck] = useState<Deck>('tarot');
  const [list, setList] = useState<SavedSpread[]>([]);
  const [mode, setMode] = useState<'cloud' | 'local'>('local');
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');

  const copy = {
    label: en ? 'ACCOUNT' : ja ? 'アカウント' : '账户中心',
    title: en ? 'My spreads' : ja ? 'マイスプレッド' : '我的牌阵',
    intro: en
      ? 'Custom spreads you built. Sign in to keep them across devices.'
      : ja
        ? '自分で作ったスプレッド。ログインすると端末間で同期されます。'
        : '你摆放的自定义牌阵。登录后会同步到云端，换设备也不丢。',
    tarot: en ? 'Tarot' : ja ? 'タロット' : '塔罗',
    lenormand: en ? 'Lenormand' : ja ? 'ルノルマン' : '雷诺曼',
    cloud: en ? 'Cloud' : ja ? 'クラウド' : '云端',
    local: en ? 'This device' : ja ? 'この端末' : '本机',
    use: en ? 'Start reading' : ja ? '占いを始める' : '开始占卜',
    del: en ? 'Delete' : ja ? '削除' : '删除',
    exportAll: en ? 'Export' : ja ? 'エクスポート' : '导出',
    importBtn: en ? 'Import' : ja ? 'インポート' : '导入',
    migrate: en ? 'Move local spreads to cloud' : ja ? 'ローカルをクラウドへ移行' : '把本机牌阵迁移到云端',
    empty: en ? 'No custom spreads yet.' : ja ? 'カスタムスプレッドはまだありません。' : '还没有自定义牌阵。',
    emptyHint: en
      ? 'Build one in the custom spread workspace.'
      : ja
        ? 'カスタムスプレッド作成画面で作れます。'
        : '去布阵器里摆一个吧。',
    goBuild: en ? 'Open builder' : ja ? '作成画面へ' : '去布阵器',
    cards: en ? 'cards' : ja ? '枚' : '张',
    confirmDel: en ? 'Delete this spread?' : ja ? 'このスプレッドを削除しますか？' : '确定删除这个牌阵？',
    importing: en ? 'Importing…' : ja ? 'インポート中…' : '导入中…',
    migrating: en ? 'Migrating…' : ja ? '移行中…' : '迁移中…',
    noLocal: en ? 'Nothing to move.' : ja ? '移行対象がありません。' : '本机没有可迁移的牌阵。',
    noCloud: en ? 'Sign in first.' : ja ? '先にログインしてください。' : '请先登录。',
  };

  const reload = useCallback(async (d: Deck) => {
    setLoading(true);
    const r = await loadSpreadsSmart(d);
    setList(r.list);
    setMode(r.mode);
    setLoading(false);
  }, []);

  useEffect(() => {
    const sb = supabaseBrowser();
    let alive = true;
    if (sb) {
      sb.auth.getSession().then(({ data }) => {
        if (alive) setSignedIn(!!data.session);
      });
    }
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(deck); }, 0);
    return () => window.clearTimeout(timer);
  }, [deck, reload]);

  // 直接进入抽牌：把格位编码进 URL（与布阵器的 startReading 同一格式）
  const startReading = (s: SavedSpread) => {
    const payload = encodeURIComponent(JSON.stringify(s.cells));
    const href = s.deck === 'lenormand' ? '/lenormand/draw' : '/online';
    router.push(`${href}?spread=custom&count=${s.cells.length}&layout=${payload}`);
  };

  const remove = async (s: SavedSpread) => {
    if (!window.confirm(copy.confirmDel)) return;
    setBusy(s.id);
    await deleteSpreadSmart(s);
    await reload(deck);
    setBusy('');
  };

  const exportAll = () => {
    if (!list.length) return;
    const text = buildSpreadExport(list);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mustar-spreads-${deck}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (file: File) => {
    setBusy('import');
    setNote(copy.importing);
    try {
      const text = await file.text();
      const items = parseSpreadImport(text);
      let ok = 0;
      for (const it of items) {
        const r = await saveSpreadSmart(it.deck, it.name, it.cells, { description: it.description });
        if (r.spread) ok += 1;
      }
      setNote(
        en ? `Imported ${ok} spreads.` : ja ? `${ok} 件をインポートしました。` : `已导入 ${ok} 个牌阵。`
      );
      await reload(deck);
    } catch {
      setNote(en ? 'Import failed.' : ja ? 'インポートに失敗しました。' : '导入失败。');
    }
    setBusy('');
  };

  const migrate = async () => {
    if (!signedIn) {
      setNote(copy.noCloud);
      return;
    }
    setBusy('migrate');
    setNote(copy.migrating);
    const a = await migrateSpreadsToCloud('tarot');
    const b = await migrateSpreadsToCloud('lenormand');
    const moved = a.moved + b.moved;
    setNote(
      moved
        ? en
          ? `Moved ${moved} spreads to cloud.`
          : ja
            ? `${moved} 件をクラウドへ移行しました。`
            : `已迁移 ${moved} 个牌阵到云端。`
        : copy.noLocal
    );
    await reload(deck);
    setBusy('');
  };

  return (
    <PageShell label={copy.label} title={copy.title}>
      <div className="mx-auto w-full max-w-3xl pb-10">
        <AccountNav />
        <p className="mb-5 text-[12px] leading-relaxed text-muted/70">{copy.intro}</p>

        {/* 牌组切换 + 操作 */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(['tarot', 'lenormand'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDeck(d)}
              className={`rounded-full border px-3.5 py-1.5 text-[11px] transition-colors ${
                deck === d
                  ? 'border-accent/50 bg-accent/[0.08] text-accent'
                  : 'border-white/[0.1] text-muted hover:border-white/25'
              }`}
            >
              {d === 'tarot' ? copy.tarot : copy.lenormand}
            </button>
          ))}

          <span className="ml-1 rounded-full border border-white/[0.1] px-2.5 py-0.5 text-[10.5px] text-muted/70">
            {mode === 'cloud' ? copy.cloud : copy.local}
          </span>

          <div className="ml-auto flex flex-wrap gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy === 'import'}
              className="rounded-full border border-white/[0.14] px-3 py-1.5 text-[11px] text-muted transition-colors hover:border-white/30 hover:text-frost/80 disabled:opacity-50"
            >
              {copy.importBtn}
            </button>
            <button
              onClick={exportAll}
              disabled={!list.length}
              className="rounded-full border border-white/[0.14] px-3 py-1.5 text-[11px] text-muted transition-colors hover:border-white/30 hover:text-frost/80 disabled:opacity-40"
            >
              {copy.exportAll}
            </button>
            <button
              onClick={() => router.push(deck === 'lenormand' ? '/lenormand/custom' : '/online/custom')}
              className="rounded-full border border-accent/40 bg-accent/[0.06] px-3 py-1.5 text-[11px] text-accent transition-colors hover:bg-accent/[0.12]"
            >
              {copy.goBuild}
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImportFile(f);
            e.target.value = '';
          }}
        />

        {note && <p className="mb-3 text-[11.5px] text-accent/80">{note}</p>}

        {/* 迁移入口：登录后且本机有数据时提示 */}
        {signedIn && mode === 'cloud' && (
          <button
            onClick={migrate}
            disabled={busy === 'migrate'}
            className="mb-4 rounded-xl border border-white/[0.1] bg-white/[0.02] px-4 py-2 text-[11.5px] text-muted transition-colors hover:border-accent/35 hover:text-frost/80 disabled:opacity-50"
          >
            {busy === 'migrate' ? copy.migrating : copy.migrate}
          </button>
        )}

        {/* 列表 */}
        {loading ? (
          <p className="py-14 text-center text-[12px] text-muted/60">…</p>
        ) : list.length ? (
          <div className="space-y-2">
            {list.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] text-frost">{s.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted/60">
                    {s.cells.length} {copy.cards} · {new Date(s.savedAt).toLocaleDateString()}
                    {s.cloud ? ` · ${copy.cloud}` : ''}
                  </p>
                  {s.description && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted/50">
                      {s.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => startReading(s)}
                    className="rounded-full border border-accent/40 px-3 py-1 text-[11px] text-accent transition-colors hover:bg-accent/[0.1]"
                  >
                    {copy.use}
                  </button>
                  <button
                    onClick={() => void remove(s)}
                    disabled={busy === s.id}
                    className="text-[11px] text-muted/50 transition-colors hover:text-[#e8a08a] disabled:opacity-40"
                  >
                    {copy.del}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/[0.12] px-6 py-12 text-center">
            <p className="text-[12.5px] text-muted/70">{copy.empty}</p>
            <p className="mt-1.5 text-[11px] text-muted/50">{copy.emptyHint}</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
