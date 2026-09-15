/**
 * AI 接口的防刷守卫：IP 限流 + 请求体体积上限 + 牌数上限。
 *
 * ⚠️ 已知局限：Vercel serverless 的多个实例各有独立内存，本模块只能做到
 * 「单实例内」限流。它能挡住简单的循环脚本（同一实例短时间内的密集请求会被拦），
 * 但无法保证全局精确计数。若日后需要全局限流，把 buckets 的读写换成
 * Upstash Redis / Vercel KV 即可，调用方无需改动。
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
/** 防内存膨胀：桶数超限时先清掉已过期的 */
const MAX_KEYS = 5000;

export interface RateLimitResult {
  ok: boolean;
  /** 被限流时建议等待的秒数 */
  retryAfter: number;
  remaining: number;
}

/** 固定窗口计数。key 建议用 `${scope}:${ip}`，各接口互不干扰。 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0, remaining: limit - 1 };
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)), remaining: 0 };
  }
  return { ok: true, retryAfter: 0, remaining: limit - b.count };
}

/** 取客户端标识：Vercel 会在 x-forwarded-for 带上真实来源，取第一段 */
export function clientKey(req: { headers: Headers }): string {
  const h = req.headers;
  const xff = h.get('x-forwarded-for');
  const ip = (xff ? xff.split(',')[0] : h.get('x-real-ip') || '').trim();
  return ip || 'unknown';
}

type ReadResult = { ok: true; body: any } | { ok: false; reason: 'too_large' | 'bad_json' };

/**
 * 读请求体并校验体积上限。
 * 用 text() 后量长度，而不是信 content-length —— 后者可被省略或伪造（chunked）。
 */
export async function readJsonLimited(req: Request, maxBytes: number): Promise<ReadResult> {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return { ok: false, reason: 'bad_json' };
  }
  if (raw.length > maxBytes) return { ok: false, reason: 'too_large' };
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, reason: 'bad_json' };
  }
}

/**
 * 各 AI 接口的限流档位（集中一处便于调整）。
 * 取值原则：宽松到不误伤正常用户（含同一公司/家庭共享出口 IP 的情况），
 * 但足以掐死「每秒几十次」的循环脚本。解读一次要生成 ~30s，正常人不会连发。
 */
export const AI_LIMITS = {
  /** 解读（含流式）：5 分钟 12 次 */
  interpret: { limit: 12, windowMs: 5 * 60_000 },
  /** 追问：更轻量，5 分钟 30 次 */
  followup: { limit: 30, windowMs: 5 * 60_000 },
  /** 请求体上限：正常 body < 50KB（78 张牌 + 长问题也远小于此） */
  maxBodyBytes: 100_000,
  /** 单次最多牌数（塔罗 78 张为上限，雷诺曼 36 张更少） */
  maxCards: 78,
} as const;
