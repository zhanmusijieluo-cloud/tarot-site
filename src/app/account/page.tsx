'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import { supabaseBrowser } from '@/lib/supabase';
import { useI18n } from '@/i18n';

export default function AccountPage() {
  const { lang } = useI18n();
  const ja = lang === 'ja';
  const en = lang === 'en';
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;
    let alive = true;
    sb.auth.getSession().then(({ data }) => {
      if (alive) setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (alive) setEmail(session?.user.email ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const copy = {
    label: en ? 'ACCOUNT' : ja ? 'アカウント' : '账户中心',
    title: en ? 'My account' : ja ? 'マイアカウント' : '我的账户',
    signedIn: en ? 'Signed in' : ja ? 'ログイン中' : '已登录',
    signedOut: en ? 'Not signed in' : ja ? '未ログイン' : '未登录',
    signIn: en ? 'Sign in' : ja ? 'ログイン' : '登录',
    archives: en ? 'Birth archives' : ja ? '出生アーカイブ' : '出生档案',
    archivesDesc: en ? 'Manage profiles used by your charts.' : ja ? 'チャートで使うプロフィールを管理します。' : '管理星盘和合盘使用的出生资料。',
    charts: en ? 'Charts' : ja ? 'チャート' : '星盘',
    chartsDesc: en ? 'Open the astrology workspace.' : ja ? '占星ワークスペースを開きます。' : '进入占星排盘工作区。',
    settings: en ? 'Account settings' : ja ? 'アカウント設定' : '账户设置',
    settingsDesc: en ? 'Security and language preferences will live here.' : ja ? 'セキュリティと言語設定をここで管理します。' : '后续在这里管理安全和语言偏好。',
    admin: en ? 'Admin console' : ja ? '管理コンソール' : '管理后台',
    adminDesc: en ? 'For authorized operators only.' : ja ? '権限を持つ運営者向けです。' : '仅限授权运营人员进入。',
    local: en ? 'You can still use local archives without signing in.' : ja ? 'ログインしなくてもローカル保存を使えます。' : '不登录也可以继续使用本机档案。',
  };

  return (
    <PageShell label={copy.label} title={copy.title}>
      <div className="mx-auto w-full max-w-3xl pb-10">
        <div className="mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5">
          {email ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#84e89e]/35 bg-[#84e89e]/[0.06] px-2.5 py-0.5 text-[10.5px] text-[#84e89e]">{copy.signedIn}</span>
              <span className="text-[12px] text-frost/80">{email}</span>
              <button onClick={() => supabaseBrowser()?.auth.signOut()} className="ml-auto text-[11px] text-muted/60 transition-colors hover:text-[#e8a08a]">
                {en ? 'Sign out' : ja ? 'ログアウト' : '退出登录'}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/[0.14] px-2.5 py-0.5 text-[10.5px] text-muted">{copy.signedOut}</span>
              <span className="text-[11.5px] text-muted/70">{copy.local}</span>
              <Link href="/login" className="ml-auto rounded-full border border-accent/40 px-3.5 py-1 text-[11px] text-accent transition-colors hover:bg-accent/[0.08]">{copy.signIn}</Link>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/archives" className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-accent/35 hover:bg-white/[0.04]">
            <p className="text-[14px] text-frost">{copy.archives}</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted/70">{copy.archivesDesc}</p>
            <p className="mt-4 text-[11px] text-accent">→</p>
          </Link>
          <Link href="/astrology" className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-accent/35 hover:bg-white/[0.04]">
            <p className="text-[14px] text-frost">{copy.charts}</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted/70">{copy.chartsDesc}</p>
            <p className="mt-4 text-[11px] text-accent">→</p>
          </Link>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 opacity-75">
            <p className="text-[14px] text-frost">{copy.settings}</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted/70">{copy.settingsDesc}</p>
          </div>
          <Link href="/admin" className="rounded-2xl border border-[#d9a8b8]/25 bg-[#d9a8b8]/[0.04] p-5 transition-colors hover:border-[#d9a8b8]/50 hover:bg-[#d9a8b8]/[0.08]">
            <p className="text-[14px] text-frost">{copy.admin}</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted/70">{copy.adminDesc}</p>
            <p className="mt-4 text-[11px] text-[#d9a8b8]">→</p>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
