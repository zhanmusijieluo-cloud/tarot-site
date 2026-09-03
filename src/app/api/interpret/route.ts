import { NextRequest, NextResponse } from 'next/server';
import { TarotMcpServer } from '@/mcp/server';

// 日语等长输出解读较慢：允许函数运行到 Vercel Hobby 上限 300s
export const maxDuration = 300;

/**
 * AI 塔罗解读 API 路由
 * 前端 McpClient 通过 POST /api/interpret 调用
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cards, question, background, spreadName, positions, lang } = body;

    if (!cards || cards.length === 0) {
      return NextResponse.json(
        { error: '需要至少一张牌' },
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
