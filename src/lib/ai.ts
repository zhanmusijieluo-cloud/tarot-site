import { DrawnCard } from '@/lib/tarot';

/**
 * AI 解读接口封装
 * ---------------------------------------------------------------
 * 预留后端智能体接口位置：
 * 当前通过 Next.js API 路由 /api/interpret 转发到 agnes-ai 大模型。
 * 后续如接入独立后端智能体（如企业微信/自建 Agent），
 * 只需替换下方 requestInterpret 的 fetch 目标与请求格式。
 * ---------------------------------------------------------------
 */

export interface InterpretPayload {
  cards: Array<{
    id?: number;
    name: string;
    isReversed?: boolean;
    upright?: string;
    element?: string;
  }>;
  question: string;
  spreadName?: string;
  positions?: string[];
  /** 输出语言（跟随站点语言）：en/zh/ja */
  lang?: string;
}

export interface InterpretResult {
  narrative: string;
}

/** 调用 AI 解读 */
export async function requestInterpret(payload: InterpretPayload): Promise<InterpretResult> {
  // TODO(后端接入点): 替换为自建智能体接口，例如
  // const res = await fetch('https://your-agent.example.com/v1/tarot/reading', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload),
  // });
  const res = await fetch('/api/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cards: payload.cards,
      question: payload.question,
      spreadName: payload.spreadName,
      positions: payload.positions,
      lang: payload.lang,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || `解读失败（${res.status}）`);
  }

  const data = await res.json();
  return { narrative: data.narrative || data.interpretation || '' };
}

/** 抽牌结果转 AI 载荷 */
export function toPayload(
  cards: DrawnCard[],
  question: string,
  spreadName?: string,
  positions?: readonly string[],
  lang?: string
): InterpretPayload {
  return {
    cards: cards.map((c) => ({
      id: c.id,
      name: c.name,
      isReversed: c.isReversed,
      upright: c.isReversed ? c.reversedMeaning : c.upright,
      element: c.element,
    })),
    question,
    spreadName,
    positions: positions ? [...positions] : undefined,
    lang,
  };
}
