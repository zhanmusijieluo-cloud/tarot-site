import { NextRequest, NextResponse } from 'next/server';
import { TarotMcpServer } from '@/mcp/server';
import { aiGuard, readJsonLimited, AI_LIMITS } from '@/lib/rate-limit';

// 日语等长输出解读较慢：允许函数运行到 Vercel Hobby 上限 300s
export const maxDuration = 300;

/**
 * AI 塔罗解读 API 路由
 * 前端 McpClient 通过 POST /api/interpret 调用
 */
export async function POST(request: NextRequest) {
  // 防刷：请求体体积上限（不信 content-length，读出来量长度）
  const limited = await readJsonLimited(request, AI_LIMITS.maxBodyBytes);
  if (!limited.ok) {
    return NextResponse.json(
      { error: limited.reason === 'too_large' ? '请求体过大' : '请求体解析失败' },
      { status: limited.reason === 'too_large' ? 413 : 400 }
    );
  }
  // 先读体再限流：撞限文案要按客户站点语言出，lang 在 body 里
  const rl = await aiGuard('interpret', request, typeof limited.body?.lang === 'string' ? limited.body.lang : 'zh');
  if (!rl.ok) {
    return NextResponse.json(
      { error: rl.message },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
  try {
    const body = limited.body;
    const { cards, question, background, spreadName, positions, lang } = body;

    if (!cards || cards.length === 0) {
      return NextResponse.json(
        { error: '需要至少一张牌' },
        { status: 400 }
      );
    }
    if (cards.length > AI_LIMITS.maxCards) {
      return NextResponse.json(
        { error: `牌数超出上限（最多 ${AI_LIMITS.maxCards} 张）` },
        { status: 400 }
      );
    }

    const server = new TarotMcpServer();
    const result = await server.handleMessage({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'tarot.reading',
        arguments: {
          cards,
          question: question || '',
          background: background || '',
          spreadName: spreadName || '单牌',
          positions: positions || [],
          lang: typeof lang === 'string' ? lang : 'zh',
        },
      },
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'AI 解读失败' },
        { status: 500 }
      );
    }

    const content = result.result?.content || '';
    return NextResponse.json({
      success: true,
      narrative: content,
      interpretation: content,
      cards: result.result?.cards || cards,
      question: result.result?.question || question,
      spreadName: result.result?.spreadName || spreadName,
    });
  } catch (error: any) {
    console.error('/api/interpret error:', error);
    return NextResponse.json(
      { error: error?.message || '解读服务暂时不可用，请稍后重试' },
      { status: 500 }
    );
  }
}
