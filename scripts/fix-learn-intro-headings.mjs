// 修复译文结构：learn_articles 非 myth 的 9 篇，en/ja 首块引言被 AI 误加 ## 前缀 → 降回正文
// 判定：zh 正文不以 ## 开头 而 en/ja 以 ## 开头 → 仅去掉第一个 ## 标记（保留文字）
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const MODE = process.argv.includes('--mode=upsert') ? 'upsert' : 'dry';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, MODE === 'upsert' ? process.env.SUPABASE_SECRET_KEY : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
if (MODE === 'upsert' && !process.env.SUPABASE_SECRET_KEY) { console.error('upsert 需 SUPABASE_SECRET_KEY'); process.exit(1); }

const { data: rows, error } = await sb.from('learn_articles')
  .select('slug,content_zh,content_en,content_ja').neq('category', 'myth').order('sort_order');
if (error) throw error;

const demoteFirst = (t) => {
  const nl = t.indexOf('\n');
  const first = nl === -1 ? t : t.slice(0, nl);
  if (!first.startsWith('## ')) return t; // 不是标题问题,不动
  return first.replace(/^##+\s*/, '') + (nl === -1 ? '' : t.slice(nl));
};

for (const x of rows) {
  const patch = {};
  const zhIsIntro = !x.content_zh.trimStart().startsWith('##');
  if (zhIsIntro && x.content_en.trimStart().startsWith('##')) patch.content_en = demoteFirst(x.content_en.trimStart());
  if (zhIsIntro && x.content_ja.trimStart().startsWith('##')) patch.content_ja = demoteFirst(x.content_ja.trimStart());
  const keys = Object.keys(patch);
  if (!keys.length) { console.log('跳过(结构已一致):', x.slug); continue; }
  const count = (s) => ((s || '').match(/^##+ /gm) || []).length;
  console.log(`${MODE === 'dry' ? '[dry]' : '修复'} ${x.slug}:`, keys.map(k => `${k.slice(-2)}标题${count(x[k])}→${count(patch[k])}`).join(' '));
  if (MODE === 'upsert') {
    const { error: e2 } = await sb.from('learn_articles').update({ ...patch, updated_at: new Date().toISOString() }).eq('slug', x.slug);
    if (e2) throw new Error(x.slug + ': ' + e2.message);
  }
}
console.log(MODE === 'dry' ? '干跑完成' : '全部写库完成');
