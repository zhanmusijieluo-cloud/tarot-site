// ============================================================
// 出生档案 → 解读背景文本
// 塔罗解读时把「给谁解」的基本信息一并交给 AI，让解读贴合本人；
// 只做轻量转换（出生时间地点 + 太阳星座），不引入占星引擎以免拖大解读室体积。
// ============================================================
import type { Archive } from '@/lib/astro/archives';

/** 各月星座切换日：日期 <= 该值属本月星座，否则属下个月星座 */
const SIGN_CUT = [19, 18, 20, 19, 20, 21, 22, 22, 22, 23, 22, 21];
const SUN_SIGNS = [
  '摩羯座', '水瓶座', '双鱼座', '白羊座', '金牛座', '双子座',
  '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座',
];

/** 按公历月日推太阳星座（够用即可，不追求节气精度） */
export function sunSignOf(month: number, day: number): string {
  if (!Number.isFinite(month) || !Number.isFinite(day)) return '';
  const m = Math.min(Math.max(Math.trunc(month), 1), 12);
  return SUN_SIGNS[day <= SIGN_CUT[m - 1] ? m - 1 : m % 12];
}

/**
 * 把一份出生档案转成简短背景文本，供塔罗解读参考。
 * 例：`本人出生：1995年6月15日 14:30 生于北京，太阳双子座`
 */
export function archiveContext(a: Archive | null | undefined): string {
  if (!a?.birth) return '';
  const b = a.birth;
  const parts: string[] = [];
  if (Number.isFinite(b.year)) {
    parts.push(`${b.year}年${b.month}月${b.day}日`);
  }
  if (Number.isFinite(b.hour)) {
    const hh = String(Math.trunc(b.hour as number)).padStart(2, '0');
    const mi = String(Math.trunc((b.minute ?? 0) as number)).padStart(2, '0');
    parts.push(`${hh}:${mi}`);
  }
  const place = (b.city ?? '').trim();
  if (place) parts.push(`生于${place}`);

  const sun = Number.isFinite(b.month) && Number.isFinite(b.day) ? sunSignOf(b.month, b.day) : '';
  const who = a.label && a.label !== '未命名' ? a.label : '本人';

  const head = parts.length ? `${who}出生：${parts.join(' ')}` : `${who}`;
  return sun ? `${head}，太阳${sun}` : head;
}
