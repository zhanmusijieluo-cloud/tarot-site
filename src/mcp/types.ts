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
  spreadName?: string | any[];
  positions?: readonly string[];
  mode?: 'auto' | 'manual';
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
