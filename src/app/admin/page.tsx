'use client';

import { useCallback, useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { supabaseBrowser } from '@/lib/supabase';
import { useI18n } from '@/i18n';

type Section = 'overview' | 'users' | 'feedback';

type AdminData = {
  role?: string;
  stats?: { users: number; archives: number; feedback: number };
  users?: Array<{ id: string; email?: string; display_name?: string; created_at?: string }>;
  feedback?: Array<{ id: string; deck?: string; vote?: boolean; note?: string; created_at?: string }>;
  error?: string;
  warnings?: string[];
};

export default function AdminPage() {
  const { lang } = useI18n();
  const ja = lang === 'ja';
  const en = lang === 'en';
  const [data, setData] = useState<AdminData | null>(null);
  const [section, setSection] = useState<Section>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const text = {
    label: en ? 'ADMIN' : ja ? '管理' : '管理后台',
    title: en ? 'Admin console' : ja ? '管理コンソール' : '管理后台',
    intro: en ? 'MVP console for authorized operators.' : ja ? '権限を持つ運営者向けの MVP 管理画面です。' : '授权运营人员使用的第一版管理后台。',
    overview: en ? 'Overview' : ja ? '概要' : '总览',
    users: en ? 'Users' : ja ? 'ユーザー' : '用户',
    feedback: en ? 'Feedback' : ja ? 'フィードバック' : '反馈',
    userCount: en ? 'Users' : ja ? 'ユーザー数' : '用户数',
    archiveCount: en ? 'Archives' : ja ? 'アーカイブ数' : '档案数',
    feedbackCount: en ? 'Feedback' : ja ? '反馈数' : '反馈数',
    noAccess: en ? 'You do not have admin permission.' : ja ? '管理権限がありません。' : '你没有管理后台权限。',
    signIn: en ? 'Please sign in first.' : ja ? '先にログインしてください。' : '请先登录。',
    setup: en ? 'The server admin environment or role table is not configured yet.' : ja ? 'サーバー管理環境またはロール設定がまだ完了していません。' : '服务器管理环境或角色表还没有配置。',
    retry: en ? 'Retry' : ja ? '再試行' : '重试',
    empty: en ? 'No records.' : ja ? 'データがありません。' : '暂无数据。',
  };

  const load = useCallback(async (nextSection: Section = 'overview') => {
    setLoading(true);
    setError('');
    const sb = supabaseBrowser();
    if (!sb) {
      setError(text.setup);
      setLoading(false);
      return;
    }
    const { data: sessionData } = await sb.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError(text.signIn);
      setLoading(false);
      return;
    }
    const response = await fetch(`/api/admin?section=${nextSection}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error ?? text.noAccess);
    else setData(body);
    setLoading(false);
  }, [text.noAccess, text.setup, text.signIn]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const choose = (next: Section) => {
    setSection(next);
    void load(next);
  };

  return (
    <PageShell label={text.label} title={text.title}>
      <div className="mx-auto w-full max-w-4xl pb-10">
        <p className="mb-5 text-[12px] leading-relaxed text-muted/70">{text.intro}</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {(['overview', 'users', 'feedback'] as const).map((item) => (
            <button key={item} onClick={() => choose(item)} className={`rounded-full border px-3.5 py-1.5 text-[11px] transition-colors ${section === item ? 'border-accent/50 bg-accent/[0.08] text-accent' : 'border-white/[0.1] text-muted hover:border-white/25'}`}>
              {text[item]}
            </button>
          ))}
        </div>

        {loading ? <p className="py-14 text-center text-[12px] text-muted/60">…</p> : error ? (
          <div className="rounded-2xl border border-[#e8a08a]/25 bg-[#e8a08a]/[0.05] p-5">
            <p className="text-[13px] text-[#e8a08a]">{error}</p>
            <button onClick={() => void load()} className="mt-4 rounded-full border border-[#e8a08a]/40 px-3.5 py-1.5 text-[11px] text-[#e8a08a]">{text.retry}</button>
          </div>
        ) : section === 'overview' ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label={text.userCount} value={data?.stats?.users ?? 0} />
            <Metric label={text.archiveCount} value={data?.stats?.archives ?? 0} />
            <Metric label={text.feedbackCount} value={data?.stats?.feedback ?? 0} />
          </div>
        ) : section === 'users' ? (
          <div className="space-y-2">{data?.users?.length ? data.users.map((user) => <div key={user.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3"><p className="text-[13px] text-frost">{user.display_name || user.email || user.id}</p><p className="mt-1 text-[11px] text-muted/60">{user.email ?? user.id}</p></div>) : <Empty text={text.empty} />}</div>
        ) : (
          <div className="space-y-2">{data?.feedback?.length ? data.feedback.map((item) => <div key={item.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3"><div className="flex items-center justify-between"><p className="text-[13px] text-frost">{item.deck ?? '—'}</p><span className="text-[11px] text-muted">{item.vote === true ? '✓' : item.vote === false ? '×' : '—'}</span></div>{item.note && <p className="mt-1 text-[11.5px] leading-relaxed text-muted/70">{item.note}</p>}</div>) : <Empty text={text.empty} />}</div>
        )}
      </div>
    </PageShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5"><p className="text-[11px] text-muted/70">{label}</p><p className="mt-2 text-2xl text-frost">{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/[0.12] px-6 py-12 text-center text-[12px] text-muted/60">{text}</div>;
}
