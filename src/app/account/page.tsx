'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import AccountNav from '@/components/account/AccountNav';
import ToolsDialog from '@/components/account/ToolsDialog';
import { supabaseBrowser } from '@/lib/supabase';
import { loadArchivesSmart } from '@/lib/astro/archives';
import { loadSpreadsSmart } from '@/lib/account/spreads';
import { loadSessionsSmart } from '@/lib/account/sessions';
import { useI18n } from '@/i18n';

interface Stats {
  archives: number;
  spreads: number;
  sessions: number;
}

export default function AccountPage() {
  const { lang } = useI18n();
  const ja = lang === 'ja';
  const en = lang === 'en';
  const [email, setEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);

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

  // 概览统计：档案 / 牌阵（塔罗 + 雷诺曼）/ 解读记录
  useEffect(() => {
    let alive = true;
    (async () => {
      const [arc, tarot, ln, sess] = await Promise.all([
        loadArchivesSmart(),
        loadSpreadsSmart('tarot'),
        loadSpreadsSmart('lenormand'),
        loadSessionsSmart(100),
      ]);
      if (!alive) return;
      setStats({
        archives: arc.list.length,
        spreads: tarot.list.length + ln.list.length,
        sessions: sess.list.length,
      });
    })();
    return () => {
      alive = false;
    };
  }, [email]);

  const copy = {
    label: en ? 'ACCOUNT' : ja ? 'アカウント' : '账户中心',
    title: en ? 'My account' : ja ? 'マイアカウント' : '我的账户',
    signedIn: en ? 'Signed in' : ja ? 'ログイン中' : '已登录',
    signedOut: en ? 'Not signed in' : ja ? '未ログイン' : '未登录',
    signIn: en ? 'Sign in' : ja ? 'ログイン' : '登录',
    signOut: en ? 'Sign out' : ja ? 'ログアウト' : '退出登录',
    localNote: en
      ? 'Without signing in, data stays in this browser only.'
      : ja
        ? 'ログインしない場合、データはこのブラウザにのみ保存されます。'
        : '不登录时，数据只保存在这台设备的浏览器里。',
    cloudNote: en
      ? 'Signed in: data syncs across devices.'
      : ja
        ? 'ログイン中：データは端末間で同期されます。'
        : '已登录：数据会同步到云端，换设备也能看到。',
    archives: en ? 'Birth archives' : ja ? '出生アーカイブ' : '出生档案',
    spreads: en ? 'Custom spreads' : ja ? 'カスタムスプレッド' : '自定义牌阵',
    sessions: en ? 'Readings' : ja ? 'リーディング' : '解读记录',
    archivesDesc: en ? 'Profiles used by your charts.' : ja ? 'チャートで使うプロフィール。' : '星盘与合盘使用的出生资料。',
    spreadsDesc: en ? 'Your own spread layouts, reusable anytime.' : ja ? '自分で作ったスプレッド。何度でも使えます。' : '自己摆放的牌阵，可反复使用。',
    sessionsDesc: en ? 'Past readings and follow-ups.' : ja ? '過去のリーディングと追加質問。' : '过往解读与追问记录。',
    openArchives: en ? 'Manage archives' : ja ? 'アーカイブ管理' : '管理出生档案',
    openSpreads: en ? 'Manage spreads' : ja ? 'スプレッド管理' : '管理我的牌阵',
    openHistory: en ? 'View history' : ja ? '履歴を見る' : '查看解读记录',
    charts: en ? 'Casting tools' : ja ? '鑑定ツール' : '排盘工具',
    chartsDesc: en
      ? 'Astrology · BaZi · ZiWei · Tarot'
      : ja
        ? '占星 · 八字 · 紫微 · タロット'
        : '占星 · 八字 · 紫微 · 塔罗',
    chartsOpen: en ? 'Choose a tool' : ja ? 'ツールを選ぶ' : '选择工具',
    points: en ? 'Points' : ja ? 'ポイント' : '积分',
    pointsDesc: en ? 'Balance and top-up will appear here.' : ja ? '残高とチャージはここに表示されます。' : '余额与充值功能正在建设中。',
    soon: en ? 'Coming soon' : ja ? '準備中' : '建设中',
    settings: en ? 'Account settings' : ja ? 'アカウント設定' : '账户设置',
    settingsDesc: en ? 'Security and language preferences.' : ja ? 'セキュリティと言語設定。' : '后续在这里管理安全和语言偏好。',
    admin: en ? 'Admin console' : ja ? '管理コンソール' : '管理后台',
    adminDesc: en ? 'For authorized operators only.' : ja ? '権限を持つ運営者向けです。' : '仅限授权运营人员进入。',
  };

  const statItems = [
    { label: copy.archives, value: stats?.archives, href: '/archives' },
    { label: copy.spreads, value: stats?.spreads, href: '/account/spreads' },
    { label: copy.sessions, value: stats?.sessions, href: '/account/history' },
  ];

  return (
    <PageShell label={copy.label} title={copy.title}>
      <div className="mx-auto w-full max-w-3xl pb-10">
        {/* 登录状态 */}
        <div className="mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5">
          {email ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#84e89e]/35 bg-[#84e89e]/[0.06] px-2.5 py-0.5 text-[10.5px] text-[#84e89e]">{copy.signedIn}</span>
              <span className="text-[12px] text-frost/80">{email}</span>
              <button onClick={() => supabaseBrowser()?.auth.signOut()} className="ml-auto text-[11px] text-muted/60 transition-colors hover:text-[#e8a08a]">
                {copy.signOut}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/[0.14] px-2.5 py-0.5 text-[10.5px] text-muted">{copy.signedOut}</span>
              <span className="text-[11.5px] text-muted/70">{copy.localNote}</span>
              <Link href="/login" className="ml-auto rounded-full border border-accent/40 px-3.5 py-1 text-[11px] text-accent transition-colors hover:bg-accent/[0.08]">{copy.signIn}</Link>
            </div>
          )}
          {email && <p className="mt-2 text-[11px] text-muted/60">{copy.cloudNote}</p>}
        </div>

        <AccountNav />

        {/* 概览统计 */}
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {statItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors hover:border-accent/35 hover:bg-white/[0.04]"
            >
              <p className="text-[11px] text-muted/70">{item.label}</p>
              <p className="mt-1.5 font-display text-2xl text-frost tabular-nums">
                {item.value === undefined ? '—' : item.value}
              </p>
            </Link>
          ))}
        </div>

        {/* 功能入口 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/archives" className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-accent/35 hover:bg-white/[0.04]">
            <p className="text-[14px] text-frost">{copy.archives}</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted/70">{copy.archivesDesc}</p>
            <p className="mt-4 text-[11px] text-accent">{copy.openArchives} →</p>
          </Link>

          <Link href="/account/spreads" className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-accent/35 hover:bg-white/[0.04]">
            <p className="text-[14px] text-frost">{copy.spreads}</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted/70">{copy.spreadsDesc}</p>
            <p className="mt-4 text-[11px] text-accent">{copy.openSpreads} →</p>
          </Link>

          <Link href="/account/history" className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-accent/35 hover:bg-white/[0.04]">
            <p className="text-[14px] text-frost">{copy.sessions}</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted/70">{copy.sessionsDesc}</p>
            <p className="mt-4 text-[11px] text-accent">{copy.openHistory} →</p>
          </Link>

          {/* 排盘工具：点击弹出选择窗口（不再单独立「星盘」入口——主路径是「档案 → 选工具」） */}
          <button
            onClick={() => setToolsOpen(true)}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-left transition-colors hover:border-accent/35 hover:bg-white/[0.04]"
          >
            <p className="text-[14px] text-frost">{copy.charts}</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted/70">{copy.chartsDesc}</p>
            <p className="mt-4 text-[11px] text-accent">{copy.chartsOpen} →</p>
          </button>

          {/* 积分：占位，规则定下来后再接入 credit_ledger */}
          <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015] p-5">
            <div className="flex items-center gap-2">
              <p className="text-[14px] text-frost/70">{copy.points}</p>
              <span className="rounded-full border border-white/[0.14] px-2 py-0.5 text-[10px] text-muted/70">{copy.soon}</span>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted/60">{copy.pointsDesc}</p>
          </div>

          {/* 账户设置：占位 */}
          <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015] p-5">
            <div className="flex items-center gap-2">
              <p className="text-[14px] text-frost/70">{copy.settings}</p>
              <span className="rounded-full border border-white/[0.14] px-2 py-0.5 text-[10px] text-muted/70">{copy.soon}</span>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted/60">{copy.settingsDesc}</p>
          </div>

          <Link href="/admin" className="rounded-2xl border border-[#d9a8b8]/25 bg-[#d9a8b8]/[0.04] p-5 transition-colors hover:border-[#d9a8b8]/50 hover:bg-[#d9a8b8]/[0.08]">
            <p className="text-[14px] text-frost">{copy.admin}</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted/70">{copy.adminDesc}</p>
            <p className="mt-4 text-[11px] text-[#d9a8b8]">→</p>
          </Link>
        </div>
      </div>

      <ToolsDialog open={toolsOpen} onClose={() => setToolsOpen(false)} />
    </PageShell>
  );
}
