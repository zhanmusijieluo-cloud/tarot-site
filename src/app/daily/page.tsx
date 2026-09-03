import { redirect } from 'next/navigation';

// 每日运势：直接对接抽牌系统（固定 1 张牌 + 固定问题），不再经过星座选择子页面
// 保留此路由以便旧链接 / 书签自动跳转，避免 404
export default function DailyPage() {
  redirect('/online?spread=daily');
}
