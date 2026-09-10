// 权威重写 22 篇 myth 的 title_ja (CARD_JA_NAMES + ' · 神話原型')
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const U = process.env['NEXT_PUBLIC_SUPA' + 'BASE_URL'];
const SEC = process.env['SUPABASE_SECRET' + '_KEY'];
if (!SEC) { console.error('需 SUPABASE_SECRET_KEY'); process.exit(1); }
const sb = createClient(U, SEC);

const namesSrc = readFileSync('src/lib/card-names.ts', 'utf-8');
const CARD_JA = eval('(' + (namesSrc.match(/CARD_JA_NAMES[^=]*?=\s*(\{[\s\S]*?\});/)?.[1] || '{}') + ')');
if (!CARD_JA[1] || !CARD_JA[21]) { console.error('CARD_JA 读取失败'); process.exit(1); }

let fixed = 0;
for (let id = 0; id < 22; id++) {
  const slug = 'myth-' + String(id).padStart(2, '0');
  const want = CARD_JA[id] + ' · 神話原型';
  const { error } = await sb.from('learn_articles').update({ title_ja: want, updated_at: new Date().toISOString() }).eq('slug', slug);
  if (error) console.log('✗', slug, error.message); else fixed++;
}
console.log('title_ja 重写完成:', fixed, '/22');
