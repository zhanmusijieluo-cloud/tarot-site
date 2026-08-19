import { TarotReadingRequest, TarotReadingResponse } from './types';
import { shuffleDraw, SPREADS, DrawnCard } from '@/lib/tarot';

const API_KEY = process.env.AGNES_API_KEY;
const API_URL = 'https://apihub.agnes-ai.com/v1/chat/completions';

/**
 * MCP 服务端 - 塔罗解读服务
 */
export class TarotMcpServer {
  /**
   * 处理 MCP 消息
   */
  async handleMessage(message: any): Promise<any> {
    const { method, params } = message;

    switch (method) {
      case 'tools/call':
        return this.handleToolCall(params);
      case 'tools/list':
        return { result: this.getTools() };
      default:
        return { error: { code: -32601, message: `Method not found: ${method}` } };
    }
  }

  /**
   * 处理工具调用
   */
  private async handleToolCall(params: any): Promise<any> {
    const { name, arguments: args } = params;

    switch (name) {
      case 'tarot.reading':
        return this.handleTarotReading(args);
      case 'tarot.draw':
        return this.handleDrawCards(args);
      case 'tarot.spreads':
        return this.handleGetSpreads();
      case 'tarot.daily_fortune':
        return this.handleDailyFortune(args);
      default:
        return { error: { code: -32601, message: `Unknown tool: ${name}` } };
    }
  }

  /**
   * 塔罗解读
   */
  private async handleTarotReading(args: TarotReadingRequest): Promise<any> {
    if (!args.cards || args.cards.length === 0) {
      return { error: { code: -32602, message: '需要至少一张牌' } };
    }

    try {
      const cardsContext = args.cards.map((card: any, index: number) => {
        const position = typeof args.spreadName === 'object'
          ? (args.spreadName as any[])[index]
          : card.position || '';
        return `- ${card.name} (${card.isReversed ? '逆位' : '正位'}) - ${position}: ${card.upright}`;
      }).join('\n');

      const prompt = `你是一位专业资深塔罗解读师，精通韦特塔罗、透特塔罗体系。

**占卜信息：**
- 问题：${args.question || '未指定'}
- 牌阵：${typeof args.spreadName === 'string' ? args.spreadName : (args.spreadName as any)?.name || '单牌'}
- 抽牌结果：
${cardsContext}

请严格按照以下六大板块进行深度解读：

## 板块1：基础卡牌拆解
逐张解析单张牌含义，标注对应元素（风火水土）、灵数寓意、对应行星/星座、正逆位核心差异。

## 板块2：牌阵联动关系
分析牌与牌之间能量相生/相冲，位置之间逻辑关联。

## 板块3：现状深层根源分析
挖掘当下局面产生的内在原因、隐藏情绪、过往影响。

## 板块4：局势发展趋势推演
客观推演事情短期、中长期走向，区分可控因素与不可控外部因素。

## 板块5：综合全局总结
精简汇总整体吉凶、核心矛盾、核心机遇。

## 板块6：落地行动建议
给出具体可执行的实操方案，分短期怎么做、长期调整方向。`;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: 'agnes-2.5-flash',
          messages: [
            { role: 'system', content: '你是一位专业塔罗解读师，擅长深度解读塔罗牌，结合占星、元素、神话等多维度分析。解读要客观、深度、完整，不制造焦虑，强调人的主观选择会改变走向。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errMsg = data?.error?.message || response.statusText;
        return { error: { code: -32001, message: `API 调用失败: ${errMsg}` } };
      }

      if (data.choices && data.choices[0]) {
        return {
          result: {
            content: data.choices[0].message.content,
            cards: args.cards,
            question: args.question,
            spreadName: args.spreadName
          }
        };
      }

      return { error: { code: -32001, message: 'AI 解读失败：未获取到有效响应' } };
    } catch (error: any) {
      return { error: { code: -32001, message: error.message } };
    }
  }

  /**
   * 随机抽牌
   */
  private handleDrawCards(args: { count?: number; spread?: string }): any {
    const count = args.count || 1;
    const cards = shuffleDraw(count);
    return { result: { cards } };
  }

  /**
   * 获取牌阵列表
   */
  private handleGetSpreads(): any {
    const spreads = Object.entries(SPREADS).map(([key, value]) => ({
      id: key,
      name: value.name,
      positions: value.positions,
      count: value.count
    }));
    return { result: { spreads } };
  }

  /**
   * 每日运势
   */
  private handleDailyFortune(args: { zodiac?: string }): any {
    // 这里可以调用每日运势逻辑
    return { result: { message: '每日运势功能待实现' } };
  }

  /**
   * 获取可用工具列表
   */
  private getTools(): any {
    return {
      tools: [
        {
          name: 'tarot.reading',
          description: '塔罗牌深度解读（六大板块）'
        },
        {
          name: 'tarot.draw',
          description: '随机抽牌'
        },
        {
          name: 'tarot.spreads',
          description: '获取牌阵列表'
        },
        {
          name: 'tarot.daily_fortune',
          description: '每日运势'
        }
      ]
    };
  }
}

// 全局实例
const server = new TarotMcpServer();

export async function handleMcpMessage(message: any): Promise<any> {
  return server.handleMessage(message);
}
