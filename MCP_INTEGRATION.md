# MCP 智能体对接指南

## 概览

塔罗网站通过 MCP (Model Context Protocol) 协议暴露塔罗解读能力，可以让 WorkBuddy 或其他智能体调用。

## 架构

```
┌─────────────────┐      MCP 协议      ┌─────────────────┐
│  WorkBuddy      │ ◄──────────────►  │  塔罗网站 MCP   │
│  智能体         │   HTTP/JSON-RPC   │  Server         │
└─────────────────┘                   └─────────────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │  DeepSeek AI    │
                                     │  (解读引擎)     │
                                     └─────────────────┘
```

## 可用工具

### 1. tarot.reading - 塔罗解读
调用方式：
```json
{
  "name": "tarot.reading",
  "arguments": {
    "cards": [...],
    "question": "问题内容",
    "spreadName": "三牌阵",
    "mode": "auto"
  }
}
```

### 2. tarot.draw - 随机抽牌
```json
{
  "name": "tarot.draw",
  "arguments": {
    "count": 3,
    "spread": "triplet"
  }
}
```

### 3. tarot.spreads - 获取牌阵列表
```json
{
  "name": "tarot.spreads",
  "arguments": {}
}
```

### 4. tarot.daily_fortune - 每日运势
```json
{
  "name": "tarot.daily_fortune",
  "arguments": {
    "zodiac": "白羊座"
  }
}
```

## 部署配置

### Vercel 环境变量
在 Vercel Dashboard 中添加：
- `DEEPSEEK_API_KEY` = 你的 API Key
- `MCP_SERVER_URL` = https://tarot-site-tan.vercel.app/api/mcp (可选)

### 本地开发
```bash
cp .env.local.example .env.local
# 编辑 .env.local 填入 API Key
npm run dev
```

## 调用示例

### 从智能体调用
```typescript
import { McpClient } from '@/mcp/client';

const client = new McpClient();
await client.connect();

const result = await client.callTarotReading({
  cards: [...],
  question: '我和他未来的感情走向如何？',
  spreadName: '三牌阵'
});
```

### HTTP 调用
```bash
curl -X POST https://tarot-site-tan.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "tarot.reading",
      "arguments": {
        "cards": [{"name":"愚者","numeral":"0","element":"风","isReversed":false,"upright":"新的开始"}]
      }
    }
  }'
```

## 文件结构
```
tarot-site/src/mcp/
├── types.ts        # TypeScript 类型定义
├── client.ts       # MCP 客户端（供网站前端使用）
└── server.ts       # MCP 服务端（暴露塔罗工具）

tarot-site/src/app/api/mcp/
└── route.ts        # HTTP API 路由
```

## 前端集成示例

### 在在线占卜页面调用 AI 解读

```typescript
import { McpClient } from '@/mcp/client';

const mcpClient = new McpClient();

const handleAIAutoReveal = async () => {
  if (drawnCards.length === 0) return;
  
  try {
    const result = await mcpClient.readTarot({
      cards: drawnCards,
      question,
      spreadName: SPREADS[selectedSpread].name
    });

    if (result.success && result.interpretation) {
      setInterpretation(result.interpretation);
    }
  } catch (error) {
    // 处理错误
  }
};
```

### 按钮样式（已内置）
- ✨ 开始抽牌 - 触发随机抽牌
- 🌊 左右滑动抽牌 - 动画抽牌
- 👁️ 全部翻开 - 一次性翻开所有牌
- 🔮 AI 智能解读 - 调用 AI 进行六大板块深度解读
