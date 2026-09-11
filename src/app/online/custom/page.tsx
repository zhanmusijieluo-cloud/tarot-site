'use client';

/**
 * 自定义牌阵 · 满铺网格布阵
 * 页面入口: 塔罗线上自定义牌阵。
 * 画布竖向固定 8 行、横向按需扩展，点哪个格子哪张牌背出现，
 * 按点击顺序编号；点击牌背在旁边弹出该牌位内容面板（命名/定位/移除）；
 * 牌阵可命名保存到本地，下次一键载入复用。
 * 确定牌阵后直接进抽牌系统（不强制填问题），抽完直接进解牌室。
 */
import CustomSpreadBuilder from '@/components/CustomSpreadBuilder';

export default function CustomPage() {
  return <CustomSpreadBuilder deck="tarot" />;
}
