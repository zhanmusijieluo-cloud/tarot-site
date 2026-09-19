/**
 * AI 接口防刷守卫：限流 + 请求体体积上限 + 牌数上限。
 *
 * 计数落在 Supabase 表 ai_rate_bucket（见 supabase/rate-bucket.sql），跨实例精确。
 * 身份优先用登录账号，未登录退回出口 IP。数据库不可用或未跑迁移时，
 * 自动降级为本实例内存桶（原实现的局限：Vercel 多实例各算各的，实际放行量偏大），
 * 也就是说基础设施抖动只会少拦、不会把正常客户挡在门外。
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
 *
 * 分「未登录按出口 IP」和「登录按账号」两档：登录档更高，既避免 NAT 后几个陌生
 * 客户共用一个 IP 互相挤爆，也把「想多问」变成注册动力。
 */
export const AI_LIMITS = {
  interpret: {
    anon: { limit: 25, windowMs: 5 * 60_000 },
    user: { limit: 40, windowMs: 5 * 60_000 },
  },
  followup: {
    anon: { limit: 60, windowMs: 5 * 60_000 },
    user: { limit: 100, windowMs: 5 * 60_000 },
  },
  /** 请求体上限：正常 body < 50KB（78 张牌 + 长问题也远小于此） */
  maxBodyBytes: 100_000,
  /** 单次最多牌数（塔罗 78 张为上限，雷诺曼 36 张更少） */
  maxCards: 78,
} as const;

export type AiScope = 'interpret' | 'followup';

export interface GuardResult extends RateLimitResult {
  /** 撞限时该说的那句话：按站点语言出，登录与否措辞不同 */
  message: string;
}

const MSG: Record<'zh' | 'en' | 'ja', { anon: string; user: (s: number) => string }> = {
  zh: {
    anon: '今天问得有点多啦，明天再来更灵。登录可以解锁更多次深入追问。',
    user: (s) => `刚才问得太快了，歇 ${s} 秒再问，牌也需要沉淀一下。`,
  },
  en: {
    anon: 'That is quite a lot for today — come back tomorrow for a clearer read, or sign in for more follow-ups.',
    user: (s) => `You are asking faster than the cards can settle — wait ${s} seconds and try again.`,
  },
  ja: {
    anon: '今日はだいぶ訊かれました。明日また訊けば、もっとすっきり読めます。ログインすれば追加で質問できます。',
    user: (s) => `少しテンポが速いですね。${s} 秒おいてから、もう一度。`,
  },
};

function messageFor(scope: AiScope, lang: string, isUser: boolean, retryAfter: number): string {
  const pack = MSG[lang as 'zh' | 'en' | 'ja'] || MSG.zh;
  if (isUser) return pack.user(retryAfter);
  return scope === 'interpret' ? pack.anon : pack.user(retryAfter);
}

/** 服务端 Supabase 客户端（anon key 足够：只调用 security definer 的计数函数） */
let _sb: SupabaseClient | null = null;
function supabaseServer(): SupabaseClient | null {
  if (_sb) return _sb;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    _sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  } catch {
    _sb = null;
  }
  return _sb;
}

/** 带 token 就认账号，认不出来（未登录/token 过期或伪造）退回 IP */
async function resolveIdentity(req: Request): Promise<string> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const sb = supabaseServer();
  if (token && sb) {
    try {
      const { data } = await withTimeout(sb.auth.getUser(token), 1200);
      const id = data.user?.id;
      if (id) return `u:${id}`;
    } catch { /* 超时/网络抖动：当未登录处理，不误伤 */ }
  }
  return `ip:${clientKey(req)}`;
}

/** ai_take_bucket 的一行返回 */
interface BucketRow {
  allowed: boolean;
  retry_after: number;
  remaining: number;
}

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('supabase_timeout')), ms)),
  ]);
}

/**
 * AI 接口的全局限流。计数落在 Supabase（见 supabase/rate-bucket.sql），
 * 数据库不可用/未配置时降级为本实例内存桶——宁可少拦，也不因为基础设施抖动把客户挡在门外。
 */
export async function aiGuard(scope: AiScope, req: Request, lang = 'zh'): Promise<GuardResult> {
  const identity = await resolveIdentity(req);
  const isUser = identity.startsWith('u:');
  const tier = AI_LIMITS[scope][isUser ? 'user' : 'anon'];
  const key = `${scope}:${identity}`;
  const sb = supabaseServer();
  if (sb) {
    try {
      const res: { data: unknown; error: unknown } = await withTimeout(
        sb.rpc('ai_take_bucket', { p_key: key, p_limit: tier.limit, p_window_ms: tier.windowMs }),
        1500
      );
      const rows = Array.isArray(res.data) ? (res.data as BucketRow[]) : null;
      if (!res.error && rows?.length) {
        const r = rows[0];
        return {
          ok: !!r.allowed,
          retryAfter: r.allowed ? 0 : Math.max(1, Number(r.retry_after) || 1),
          remaining: Math.max(0, Number(r.remaining) || 0),
          message: messageFor(scope, lang, isUser, Math.max(1, Number(r.retry_after) || 1)),
        };
      }
    } catch { /* 落到内存桶 */ }
  }
  const local = rateLimit(key, tier.limit, tier.windowMs);
  return { ...local, message: messageFor(scope, lang, isUser, local.retryAfter) };
}
