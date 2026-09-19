import { NextRequest } from 'next/server';
import { TarotMcpServer, TarotStreamEvent } from '@/mcp/server';
import { aiGuard, readJsonLimited, AI_LIMITS } from '@/lib/rate-limit';

// 流式解读：允许函数运行到 Vercel Hobby 上限 300s（含一次重试预算）
export const maxDuration = 300;

/**
 * AI 塔罗解读 SSE 流式 API
 * POST /api/interpret/stream —— 请求体与 /api/interpret 相同
 * 响应 text/event-stream，每行 data: <JSON 事件>
 *   {type:'delta',text}   增量 Markdown（已按最终版式拼装）
 *   {type:'retry'}        首次校验失败重试，前端清空已显示文本
 *   {type:'done',narrative} 完整规范全文（覆盖显示）
 *   {type:'fallback',text}  两次失败后的纯文本兜底
 *   {type:'error',message}  不可恢复错误
 */
export async function POST(request: NextRequest) {
  const jsonErr = (msg: string, status: number, extra?: Record<string, string>) =>
    new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { 'Content-Type': 'application/json', ...(extra || {}) },
    });

  // 防刷：请求体体积上限
  const limited = await readJsonLimited(request, AI_LIMITS.maxBodyBytes);
  if (!limited.ok) {
    return limited.reason === 'too_large'
      ? jsonErr('请求体过大', 413)
      : jsonErr('请求体解析失败', 400);
  }
  // 流式解读与非流式共用同一档限流；先读体才能按 lang 出撞限文案
  const rl = await aiGuard('interpret', request, typeof limited.body?.lang === 'string' ? limited.body.lang : 'zh');
  if (!rl.ok) {
    return jsonErr(rl.message, 429, { 'Retry-After': String(rl.retryAfter) });
  }

  const body = limited.body;
  const { cards, question, background, spreadName, positions, lang, deck, spreadKey } = body || {};
  if (!cards || cards.length === 0) {
    return jsonErr('需要至少一张牌', 400);
  }
  if (cards.length > AI_LIMITS.maxCards) {
    return jsonErr(`牌数超出上限（最多 ${AI_LIMITS.maxCards} 张）`, 400);
  }

  const server = new TarotMcpServer();
  const args = {
    cards,
    question: question || '',
    background: background || '',
    spreadName: spreadName || '单牌',
    positions: positions || [],
    lang: typeof lang === 'string' ? lang : 'zh',
    deck: deck === 'lenormand' ? ('lenormand' as const) : ('tarot' as const),
    spreadKey: typeof spreadKey === 'string' ? spreadKey : null,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: TarotStreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const event of server.streamTarotReading(args)) {
          send(event);
        }
      } catch (e: any) {
        send({ type: 'error', message: e?.message || '解读服务暂时不可用' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
