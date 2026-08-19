'use client';

import { useRouter } from 'next/navigation';
import PageShell, { Reveal } from '@/components/PageShell';

const ENTRIES = [
  { icon: '🔮', title: '在线占卜', desc: '线上抽牌 · 即时解读', route: '/online' },
  { icon: '✦', title: '推荐牌阵', desc: '多种牌阵 · 按场景选择', route: '/spreads' },
  { icon: '🌙', title: '每日运势', desc: '今日指引 · 星象解读', route: '/daily' },
  { icon: '📚', title: '学习专区', desc: '塔罗知识 · 入门进阶', route: '/learn' },
  { icon: '🔍', title: '牌面解读', desc: '22 张大阿卡纳牌义速查', route: '/tarot' },
];

export default function ReadingPage() {
  const router = useRouter();

  return (
    <PageShell
      label="Reading · Home"
      title="命运之镜"
      subtitle="探索你的命运 · 选择你的探索方式，开启与宇宙的对话"
      footer={
        <p className="text-[11px] leading-relaxed text-muted/90">
          「塔罗不是预言，而是反映你内心深处的镜子」
        </p>
      }
    >
      <Reveal className="mt-12">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ENTRIES.map((e, i) => (
            <Reveal key={e.title} delay={i * 100}>
              <button
                onClick={() => router.push(e.route)}
                className="group h-full w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-left transition-all duration-300 hover:border-accent/30 hover:bg-accent/[0.05]"
              >
                <span className="text-2xl opacity-80 transition-transform duration-300 group-hover:scale-110">
                  {e.icon}
                </span>
                <h3 className="font-display mt-4 text-base tracking-[0.12em] text-frost">
                  {e.title}
                </h3>
                <p className="mt-2 text-sm text-muted">{e.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs tracking-[0.1em] text-accent/80 transition-all group-hover:gap-2">
                  进入 →
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </PageShell>
  );
}
