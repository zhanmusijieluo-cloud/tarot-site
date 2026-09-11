'use client';

/** 雷诺曼 · 自定义牌阵布阵页（与塔罗 /online/custom 共用组件, deck='lenormand'） */
import CustomSpreadBuilder from '@/components/CustomSpreadBuilder';

export default function LenormandCustomPage() {
  return <CustomSpreadBuilder deck="lenormand" />;
}
