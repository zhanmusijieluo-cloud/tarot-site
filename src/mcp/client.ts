import { TarotReadingRequest, TarotReadingResponse } from './types';

/** 流式解读事件 */
export interface TarotStreamEvent {
  type: 'delta' | 'retry' | 'done' | 'fallback' | 'error';
  text?: string;
  narrative?: string;
  message?: string;
}

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
          background: params.background || '',
          spreadName: params.spreadName,
          positions: params.positions || [],
          lang: params.lang || 'zh'
        }),
        // 日语等长输出可达 130s+，前端等待需覆盖服务端单次调用（250s）
        signal: AbortSignal.timeout(260000)
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

  /**
   * 流式塔罗解读（SSE）：onDelta 收到增量 Markdown（打字机渲染），
   * onRetry 时应清空已显示文本；resolve 值为最终完整解读。
   */
  async readTarotStream(
    params: TarotReadingRequest,
    handlers: { onDelta: (text: string) => void; onRetry?: () => void; signal?: AbortSignal }
  ): Promise<TarotReadingResponse> {
    try {
      const response = await fetch('/api/interpret/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cards: params.cards,
          question: params.question || '',
          background: params.background || '',
          spreadName: params.spreadName,
          positions: params.positions || [],
          lang: params.lang || 'zh'
        }),
        signal: handlers.signal ?? AbortSignal.timeout(260000),
      });

      if (!response.ok || !response.body) {
        return { success: false, error: '智能体服务暂时不可用，请稍后重试' };
      }

      const reader = response.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let finalText = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        // SSE 事件以空行分隔
        let sep: number;
        while ((sep = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, sep);
          buf = buf.slice(sep + 2);
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data:')) continue;
            try {
              const ev: TarotStreamEvent = JSON.parse(line.slice(5).trim());
              if (ev.type === 'delta' && ev.text) {
                finalText += ev.text;
                handlers.onDelta(ev.text);
              } else if (ev.type === 'retry') {
                finalText = '';
                handlers.onRetry?.();
              } else if (ev.type === 'fallback' && ev.text) {
                finalText = ev.text;
              } else if (ev.type === 'error') {
                return { success: false, error: ev.message || 'AI 解读失败' };
              }
            } catch { /* 忽略残块 */ }
          }
        }
      }

      if (!finalText.trim()) {
        return { success: false, error: 'AI 解读失败：未获取到有效响应' };
      }
      return {
        success: true,
        narrative: finalText,
        interpretation: finalText,
        advice: [],
        cardInsights: [],
      };
    } catch (error) {
      console.error('AI流式解读 error:', error);
      return { success: false, error: '智能体服务暂时不可用，请稍后重试' };
    }
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
