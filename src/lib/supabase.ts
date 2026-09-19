// 浏览器端 Supabase 客户端（anon key + RLS 公开读策略，仅用于读取内容库）
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: ReturnType<typeof createClient> | null = null;

export function supabaseBrowser() {
  if (_client) return _client;
  if (!url || !key) return null;
  try {
    _client = createClient(url, key);
  } catch {
    _client = null;
  }
  return _client;
}

/**
 * 调 AI 接口时的请求头：登录了就带 access token。
 * 服务端据此把限流额度记在账号上（更宽），而不是记在出口 IP 上——
 * 同一公司/家庭出口下的陌生客户才不会互相挤占。getSession() 会顺手刷新过期 token。
 */
export async function aiAuthHeaders(): Promise<Record<string, string>> {
  const base = { 'Content-Type': 'application/json' };
  const sb = supabaseBrowser();
  if (!sb) return base;
  try {
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    return token ? { ...base, Authorization: `Bearer ${token}` } : base;
  } catch {
    return base;
  }
}
