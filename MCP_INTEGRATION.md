# MCP 智能体对接指南

> ⚠️ **本文多数内容与当前代码不符（2026-09-15 逐项核实）**，读前先看这张对照表：
>
> | 本文写的 | 实际情况 |
> |---|---|
> | `POST /api/mcp`（对外 MCP HTTP 端点） | **不存在**。站内 AI 接口是 `/api/interpret`、`/api/interpret/stream`、`/api/followup` |
> | `src/app/api/mcp/route.ts` | **不存在** |
> | `new McpClient()` + `client.connect()` | 无 `connect()`；用 `getMcpClient()`（`src/mcp/client.ts`） |
> | `client.callTarotReading(...)` / `mcpClient.readTarot(...)` | **均不存在**；实际是 `readTarotStream(params, handlers)` |
> | `DEEPSEEK_API_KEY` | 实际用 `BAI_API_KEY`（api.bankofai.io），备用 `AGNES_API_KEY` |
> | `MCP_SERVER_URL` | 代码中**未被使用** |
> | `https://tarot-site-tan.vercel.app` | 线上域名是 **mustar.vip** |
> | 解读引擎 = DeepSeek | 实际是 **qwen3.8-flash**（备用 agnes-2.5-flash） |
>
> **仍然准确的部分**：`src/mcp/server.ts` 里确实实现了 4 个工具（`tarot.reading` / `tarot.draw` / `tarot.spreads` / `tarot.daily_fortune`），但**只有 `tarot.reading` 通过站内 API 暴露**（`/api/interpret` 与 `/api/interpret/stream`）。**对外 MCP 端点从未实现** —— 若日后需要，属未完成事项。
>
> 🚫 **重要决策（站主 2026-09-16 拍板）：禁止免费开放对外端点。**
> 本站解读能力**是要收费的**，任何对外开放**必须先做「密钥 + 计量」**：
> - 无 key 直接拒绝；每个 key 独立统计调用量（据此计费）
> - **绝不允许**"匿名 / 免 key 就能调"的形态 —— 那等于把 AI 额度白送（对外端点消耗的是同一个 qwen 额度）
> - **现状：暂不实现。** 要做时先出计费方案，站主点头再动代码
> - 商业模式参考：**网站**卖给终端用户（人直接来占卜）；**对外 API** 卖给开发者/AI 平台（按调用量收）

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
                                     │  qwen3.8-flash  │
                                     │  (解读引擎;     │
                                     │   备用 agnes)   │
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
在 Vercel Dashboard 中添加（**必须与本地 `.env.local` 同名同值**，改完要重新部署）：
- `BAI_API_KEY` = 主解读引擎密钥（api.bankofai.io）
- `AGNES_API_KEY`、`AGNES_BASE_URL` = 备用引擎
- `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY` = 内容库
- （`DEEPSEEK_API_KEY`、`MCP_SERVER_URL` 代码里均未使用，勿再配置）

### 本地开发
```bash
cp .env.local.example .env.local
# 编辑 .env.local 填入 API Key
npm run dev
```

## 调用示例

### 从站内代码调用
```typescript
import { getMcpClient } from '@/mcp/client';

// 流式解读（推荐，前端用的就是这个）
const result = await getMcpClient().readTarotStream(
  {
    cards,
    question: '我和他未来的感情走向如何？',
    spreadName: '三牌阵',
    positions,
    lang: 'zh',
    deck: 'tarot',
  },
  { onDelta: (text) => { /* 把增量追加到界面 */ } }
);
```
（注：`McpClient` 没有 `connect()` / `callTarotReading()` —— 那是本文早期设计的写法，从未实现）

### HTTP 调用（实际可用的接口）
```bash
# 流式解读（前端实际使用的方式，SSE 逐段返回）
curl -N -X POST https://mustar.vip/api/interpret/stream \
  -H "Content-Type: application/json" \
  -d '{
    "cards": [{"id":0,"name":"The Fool","isReversed":false,"upright":"新的开始","element":"风","arcana":"major"}],
    "question": "我和他未来的感情走向如何？",
    "spreadName": "三牌阵",
    "positions": ["过去","现在","未来"],
    "lang": "zh",
    "deck": "tarot"
  }'

# 非流式：POST /api/interpret（请求体相同，返回 JSON）
# 追问：  POST /api/followup
# 雷诺曼：同上，deck 传 "lenormand" + spreadKey（如 ln3a）
# 注意：三个接口都有 IP 限流（见 src/lib/rate-limit.ts），超限返回 429
```

## 文件结构（实际）
```
tarot-site/src/mcp/
├── types.ts        # 类型定义（TarotReadingRequest / TarotReadingResponse 等）
├── client.ts       # 前端调用层：McpClient.readTarotStream() + getMcpClient()
└── server.ts       # 工具实现：tarot.reading / draw / spreads / daily_fortune

tarot-site/src/app/api/
├── interpret/route.ts         # POST 非流式解读
├── interpret/stream/route.ts  # POST 流式解读（SSE，前端实际使用）
└── followup/route.ts          # POST 追问
```
（**对外 MCP 端点 `/api/mcp` 从未实现**）

## 前端集成示例

### 在在线占卜页面调用 AI 解读

```typescript
import { getMcpClient } from '@/mcp/client';

const handleAIAutoReveal = async () => {
  if (drawnCards.length === 0) return;
  try {
    // 流式：onDelta 收到增量 Markdown，resolve 值为完整解读
    const result = await getMcpClient().readTarotStream(
      {
        cards: drawnCards.map((c) => ({
          id: c.id, name: c.name, isReversed: c.isReversed,
          upright: c.upright, element: c.element, arcana: c.arcana,
        })),
        question,
        spreadName: SPREADS[selectedSpread].name,
        positions: SPREADS[selectedSpread].positions,
        lang: 'zh',
        deck: 'tarot',
      },
      { onDelta: (text) => setStreamText((prev) => prev + text) }
    );
    if (result.success) setInterpretation(result.interpretation ?? '');
  } catch (error) {
    // 处理错误
  }
};
```
（真实调用点见 `src/app/reading/session/page.tsx`）

### 按钮样式（已内置）
- ✨ 开始抽牌 - 触发随机抽牌
- 🌊 左右滑动抽牌 - 动画抽牌
- 👁️ 全部翻开 - 一次性翻开所有牌
- 🔮 AI 智能解读 - 调用 AI 进行六大板块深度解读
