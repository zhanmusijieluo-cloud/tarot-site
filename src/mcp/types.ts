// MCP 类型定义
export interface McpMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: { code: number; message: string };
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
  };
}

export interface TarotReadingRequest {
  cards: any[];
  question?: string;
  background?: string;
  spreadName?: string | any[];
  positions?: readonly string[];
  mode?: 'auto' | 'manual';
  /** 输出语言（跟随站点语言）：en/zh/ja，缺省 zh */
  lang?: string;
  /** 牌组: 缺省塔罗; 'lenormand' 走36张雷诺曼链路 */
  deck?: 'tarot' | 'lenormand';
  /** 牌阵键(ln3a/ln3b/ln5/ln9/three/...): 雷诺曼据此取相邻对组合辞典 */
  spreadKey?: string | null;
}

export interface TarotReadingResponse {
  success: boolean;
  interpretation?: string;
  narrative?: string;
  advice?: string[];
  cardInsights?: { position?: string; insight?: string }[];
  error?: string;
}

export interface ToolCallResult {
  success: boolean;
  result?: any;
  error?: string;
}
