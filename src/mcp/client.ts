import { TarotReadingRequest, TarotReadingResponse } from './types';

/**
 * AI 解读客户端 - 直接调用 interpret API
 */
export class McpClient {
  private interpretUrl: string;

  constructor(interpretUrl: string = '/api/interpret') {
    this.interpretUrl = interpretUrl;
  }

  /**
   * 调用塔罗解读
   */
  async readTarot(params: TarotReadingRequest): Promise<TarotReadingResponse> {
    try {
      const response = await fetch(this.interpretUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cards: params.cards,
          question: params.question || '',
          spreadName: params.spreadName,
          positions: params.positions || []
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.narrative || data.interpretation) {
          return {
            success: true,
            interpretation: data.interpretation,
            narrative: data.narrative,
            advice: data.advice || [],
            cardInsights: data.cardInsights || [],
          };
        }
        if (data.error) {
          return {
            success: false,
            error: data.error
          };
        }
      }
    } catch (error) {
      console.error('AI解读 error:', error);
    }

    return {
      success: false,
      error: '智能体服务暂时不可用，请稍后重试'
    };
  }
}

// 全局单例
let mcpClient: McpClient | null = null;

export function getMcpClient(): McpClient {
  if (!mcpClient) {
    mcpClient = new McpClient();
  }
  return mcpClient;
}
