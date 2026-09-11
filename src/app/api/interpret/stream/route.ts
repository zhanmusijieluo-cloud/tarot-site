import { NextRequest } from 'next/server';
import { TarotMcpServer, TarotStreamEvent } from '@/mcp/server';

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
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: '请求体解析失败' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { cards, question, background, spreadName, positions, lang, deck, spreadKey } = body || {};
  if (!cards || cards.length === 0) {
    return new Response(JSON.stringify({ error: '需要至少一张牌' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
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
