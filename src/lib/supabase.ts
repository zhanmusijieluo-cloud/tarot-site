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
