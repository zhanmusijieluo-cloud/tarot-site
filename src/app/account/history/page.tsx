'use client';

/**
 * 解读记录（账户中心）
 * 按时间倒序列出过往解读，展开可看牌面与完整解读；支持按客户筛选（专业塔罗师按客户回看）。
 * 登录 → 云端 reading_sessions；未登录 → 本机。
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import AccountNav from '@/components/account/AccountNav';
import { useI18n } from '@/i18n';
import {
  collectClients,
  deleteSessionSmart,
  loadSessionsSmart,
  type ReadingRecord,
} from '@/lib/account/sessions';
import { supabaseBrowser } from '@/lib/supabase';

function fmtTime(t: number) {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function ReadingHistoryPage() {
  const { lang } = useI18n();
  const ja = lang === 'ja';
  const en = lang === 'en';

  const [list, setList] = useState<ReadingRecord[]>([]);
  const [mode, setMode] = useState<'cloud' | 'local'>('local');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [client, setClient] = useState<string>('');
  const [busy, setBusy] = useState('');

  const copy = {
    label: en ? 'ACCOUNT' : ja ? 'アカウント' : '账户中心',
    title: en ? 'Reading history' : ja ? 'リーディング履歴' : '解读记录',
    intro: en
      ? 'Every reading you have done, with the cards and the full text.'
      : ja
        ? 'これまでのリーディング。カードと全文をあとから確認できます。'
        : '你解过的每一次盘，牌面和解读全文都留在这里。',
    cloud: en ? 'Cloud' : ja ? 'クラウド' : '云端',
    local: en ? 'This device' : ja ? 'この端末' : '本机',
    allClients: en ? 'All clients' : ja ? 'すべて' : '全部',
    clientFilter: en ? 'Filter by client' : ja ? '相談者で絞り込み' : '按客户筛选',
    cards: en ? 'Cards' : ja ? 'カード' : '牌面',
    fullText: en ? 'Full reading' : ja ? 'リーディング全文' : '解读全文',
    followups: en ? 'Follow-ups' : ja ? '追加質問' : '追问记录',
    noText: en ? 'No text saved.' : ja ? '本文が保存されていません。' : '没有保存解读全文。',
    del: en ? 'Delete' : ja ? '削除' : '删除',
    confirmDel: en ? 'Delete this record?' : ja ? 'この記録を削除しますか？' : '确定删除这条记录？',
    empty: en ? 'No readings yet.' : ja ? 'まだ記録がありません。' : '还没有解读记录。',
    emptyHint: en
      ? 'Finish a reading and it will be saved here automatically.'
      : ja
        ? 'リーディングを完了すると自動的に保存されます。'
        : '完成一次解读后会自动保存在这里。',
    goRead: en ? 'Start a reading' : ja ? '占いを始める' : '去抽牌',
    reversed: en ? 'rev' : ja ? '逆' : '逆',
    loading: '…',
  };

  const load = useCallback(async () => {
    setLoading(true);
    const r = await loadSessionsSmart(100);
    setList(r.list);
    setMode(r.mode);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const remove = async (r: ReadingRecord) => {
    if (!window.confirm(copy.confirmDel)) return;
    setBusy(r.id);
    await deleteSessionSmart(r);
    await load();
    setBusy('');
  };

  const clients = collectClients(list);
  const shown = client ? list.filter((r) => r.clientLabel.trim() === client) : list;

  return (
    <PageShell label={copy.label} title={copy.title}>
      <div className="mx-auto w-full max-w-3xl pb-10">
        <AccountNav />
        <p className="mb-5 text-[12px] leading-relaxed text-muted/70">{copy.intro}</p>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/[0.1] px-2.5 py-0.5 text-[10.5px] text-muted/70">
            {mode === 'cloud' ? copy.cloud : copy.local}
          </span>

          {clients.length > 0 && (
            <select
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-[11px] text-frost/85 [color-scheme:dark]"
            >
              <option value="">{copy.allClients}</option>
              {clients.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          <Link
            href="/online"
            className="ml-auto rounded-full border border-accent/40 bg-accent/[0.06] px-3 py-1.5 text-[11px] text-accent transition-colors hover:bg-accent/[0.12]"
          >
            {copy.goRead}
          </Link>
        </div>

        {loading ? (
          <p className="py-14 text-center text-[12px] text-muted/60">{copy.loading}</p>
        ) : shown.length ? (
          <div className="space-y-2">
            {shown.map((r) => {
              const open = openId === r.id;
              return (
                <div key={r.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                  <button
                    onClick={() => setOpenId(open ? null : r.id)}
                    className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] text-frost">
                        {r.spreadName || (r.deck === 'lenormand' ? 'Lenormand' : 'Tarot')}
                        {r.clientLabel && (
                          <span className="ml-2 rounded-full border border-accent/30 px-2 py-0.5 text-[10px] text-accent/80">
                            {r.clientLabel}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted/60">
                        {fmtTime(r.createdAt)} · {r.cards.length} {en ? 'cards' : ja ? '枚' : '张'}
                        {r.question ? ` · ${r.question}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted/50">{open ? '−' : '+'}</span>
                  </button>

                  {open && (
                    <div className="border-t border-white/[0.06] px-4 py-4">
                      {/* 牌面 */}
                      <p className="mb-2 text-[10.5px] tracking-[0.18em] text-muted/60 uppercase">{copy.cards}</p>
                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {r.cards.map((c, i) => (
                          <span
                            key={`${c.id}-${i}`}
                            className="rounded-lg border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-[11.5px] text-frost/85"
                          >
                            {c.name}
                            {c.reversed && <span className="ml-1 text-[10px] text-[#e8a08a]">{copy.reversed}</span>}
                          </span>
                        ))}
                      </div>

                      {r.background && (
                        <>
                          <p className="mb-2 text-[10.5px] tracking-[0.18em] text-muted/60 uppercase">
                            {en ? 'Background' : ja ? '背景' : '背景'}
                          </p>
                          <p className="mb-4 text-[12px] leading-relaxed text-muted/75">{r.background}</p>
                        </>
                      )}

                      {/* 解读全文 */}
                      <p className="mb-2 text-[10.5px] tracking-[0.18em] text-muted/60 uppercase">{copy.fullText}</p>
                      {r.interpretation ? (
                        <div className="max-h-[420px] overflow-y-auto rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3">
                          <p className="whitespace-pre-wrap text-[12.5px] leading-[1.85] text-frost/85">
                            {r.interpretation}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11.5px] text-muted/50">{copy.noText}</p>
                      )}

                      {/* 追问 */}
                      {r.chat.length > 0 && (
                        <>
                          <p className="mt-4 mb-2 text-[10.5px] tracking-[0.18em] text-muted/60 uppercase">{copy.followups}</p>
                          <div className="space-y-2">
                            {r.chat.map((m, i) => (
                              <div
                                key={i}
                                className={`rounded-xl border px-3 py-2 text-[12px] leading-relaxed ${
                                  m.role === 'user'
                                    ? 'border-white/[0.08] bg-white/[0.02] text-frost/75'
                                    : 'border-accent/20 bg-accent/[0.03] text-frost/85'
                                }`}
                              >
                                <span className="mr-1.5 text-[10px] text-muted/50">
                                  {m.role === 'user' ? (en ? 'You' : ja ? 'あなた' : '你') : 'AI'}
                                </span>
                                <span className="whitespace-pre-wrap">{m.content}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      <button
                        onClick={() => void remove(r)}
                        disabled={busy === r.id}
                        className="mt-4 text-[11px] text-muted/50 transition-colors hover:text-[#e8a08a] disabled:opacity-40"
                      >
                        {copy.del}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
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
