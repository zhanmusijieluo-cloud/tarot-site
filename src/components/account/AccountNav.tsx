'use client';

/**
 * 账户中心导航条（概览 / 我的牌阵 / 解读记录 共用）
 * 三语标签；当前页高亮由 pathname 判定。
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/i18n';

const TABS: { href: string; zh: string; en: string; ja: string }[] = [
  { href: '/account', zh: '概览', en: 'Overview', ja: '概要' },
  { href: '/account/spreads', zh: '我的牌阵', en: 'My spreads', ja: 'マイスプレッド' },
  { href: '/account/history', zh: '解读记录', en: 'History', ja: 'リーディング履歴' },
];

export default function AccountNav() {
  const { lang } = useI18n();
  const pathname = usePathname();

  return (
    <nav className="mb-5 flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const label = lang === 'ja' ? tab.ja : lang === 'en' ? tab.en : tab.zh;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full border px-3.5 py-1.5 text-[11px] tracking-[0.08em] transition-colors ${
              active
                ? 'border-accent/50 bg-accent/[0.08] text-accent'
                : 'border-white/[0.1] text-muted hover:border-white/25 hover:text-frost/80'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
