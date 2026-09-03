import { redirect } from 'next/navigation';

// 大阿卡纳详解已并入学习专区牌库速查，此路由保留重定向避免旧链接 404
export default function TarotPage() {
  redirect('/learn');
}
