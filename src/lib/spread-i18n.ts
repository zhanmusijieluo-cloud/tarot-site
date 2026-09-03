import type { Lang } from '@/i18n';

type TFn = (key: string, vars?: Record<string, string | number>) => string;

/**
 * 牌阵库三语化辅助：tarot.ts 中的中文文案作为 zh 默认值与回退值，
 * en/ja 通过 i18n 键读取，缺键时回退中文原文。
 */

/** 牌阵副标题：zh 用原文；en/ja 读 spreadSub.<key>，缺键回退中文 */
export function spreadSubtitle(key: string, zhVal: string, lang: Lang, t: TFn): string {
  if (lang === 'zh') return zhVal;
  const v = t(`spreadSub.${key}`);
  return v === `spreadSub.${key}` ? zhVal : v;
}

/** 牌阵描述（适用场景）：zh 用原文；en/ja 读 spreadDesc.<key>，缺键回退中文 */
export function spreadDescription(key: string, zhVal: string, lang: Lang, t: TFn): string {
  if (lang === 'zh') return zhVal;
  const v = t(`spreadDesc.${key}`);
  return v === `spreadDesc.${key}` ? zhVal : v;
}

/**
 * 牌位名跟随站点语言：从既有 i18n 的 spreadPos.<key>.<i> 描述中提取牌位名。
 * ja 格式「1号位对应「过去」——……」→ 提取「」内文本；
 * en 格式 "Position 1 (Past Situation) — ..." → 提取括号内文本。
 * zh 直接用 tarot.ts 原文，缺键回退原文。key 为空（quick/custom 牌阵）时原样返回。
 */
export function spreadPositions(
  key: string | null | undefined,
  zhPositions: readonly string[],
  lang: Lang,
  t: TFn
): string[] {
  if (lang === 'zh' || !key || !zhPositions.length) return [...zhPositions];
  return zhPositions.map((p, i) => {
    const k = `spreadPos.${key}.${i}`;
    const desc = t(k);
    if (!desc || desc === k) return p; // i18n 缺键时回退原文
    const m = lang === 'ja' ? desc.match(/「([^」]+)」/) : desc.match(/\(([^)]+)\)/);
    return m ? m[1] : p;
  });
}
