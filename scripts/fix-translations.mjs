// 学习专区译文确定性修复: 全局病词表, 只改 learn_articles(非myth) + myth 的 ja 列个别错
// 每处替换都记录次数, 改完自动复扫确认清零
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const U = process.env['NEXT_PUBLIC_SUPA' + 'BASE_URL'];
const SEC = process.env['SUPABASE_SECRET' + '_KEY'];
if (!SEC) { console.error('need SUPABASE_SECRET_KEY'); process.exit(1); }
const sb = createClient(U, SEC);

// [slug|'*'=全部, lang, 坏串, 好串]
const FIXES = [
  ['*', 'ja', 'オディーン', 'オーディン'],
  ['*', 'ja', 'クエレント', 'クライアント'],
  ['*', 'ja', '提醒你ている', '促している'],
  ['*', 'ja', 'オディアン', 'オーディン'],
  ['*', 'ja', 'デメテルフペルセポネ', 'デメテルとペルセポネ'],
  ['*', 'ja', 'ヘルメス／ルー原型', 'ヘルメス／トート原型'],
  ['ask-good-question', 'ja', '感情の反芻（ルミネーション）', '感情の反芻（ルーミネイション）'],
  ['three-card-reading', 'ja', '基调', '基調'],
  ['reversed-cards', 'ja', '他者の中に看到する', '他者の中に投影する'],
  ['reversed-cards', 'ja', '快乐が消えた', '喜びが消えた'],
  ['reversed-cards', 'ja', '（被带着走）', '（流されてしまう）'],
  ['reversed-cards', 'ja', 'エネルギーは受胎中であり可視化されていない', 'エネルギーはまだ芽生えの段階で、目に見える形になっていない'],
  ['card-combinations', 'ja', '同スート（同じ種族）', '同スート（同じ元素）'],
  ['card-combinations', 'ja', '内耗（消耗）、分析麻痺', '内的消耗、分析麻痺'],
  ['card-combinations', 'ja', '最もよく見られる「内耗」の組み合わせ', '最もよく見られる「内的消耗」の組み合わせ'],
  ['card-combinations', 'ja', 'クラシックな「破而后立」', '古典的な「壊れてから再建される」パターン'],
  ['card-combinations', 'ja', 'コートカード（宮廷牌）', 'コートカード'],
  ['narrative-reading', 'ja', 'コートカード（宮廷牌）', 'コートカード'],
  ['narrative-reading', 'ja', '戻ることでです。', '戻ることです。'],
  ['narrative-reading', 'ja', 'クエレント（相談者）', '相談者（クライアント）'],
  ['overall-structure', 'ja', 'コートカード（宮廷牌）', 'コートカード'],
  ['overall-structure', 'ja', 'クエレント（相談者）', '相談者（クライアント）'],
  ['real-cases', 'ja', '白纸黑字（書面）', '書面'],
  ['three-card-reading', 'ja', 'そのズレこそが内耗（エネルギーの消耗）の原因', 'そのズレこそが内的消耗（エネルギーの消耗）の原因'],
];

const { data: rows, error } = await sb.from('learn_articles').select('slug,content_en,content_ja,summary_en,summary_ja');
if (error) throw error;
const tally = {};
for (const x of rows) {
  const patch = {};
  for (const L of ['content_en', 'content_ja', 'summary_en', 'summary_ja']) {
    let t = x[L];
    if (!t) continue;
    let changed = false;
    for (const [slug, lang, bad, good] of FIXES) {
      if (!L.endsWith('_' + lang)) continue;
      if (slug !== '*' && slug !== x.slug) continue;
      if (t.includes(bad)) {
        const n = t.split(bad).length - 1;
        t = t.split(bad).join(good);
        tally[bad] = (tally[bad] || 0) + n;
        changed = true;
      }
    }
    if (changed) patch[L] = t;
  }
  if (Object.keys(patch).length) {
    const { error: e2 } = await sb.from('learn_articles').update({ ...patch, updated_at: new Date().toISOString() }).eq('slug', x.slug);
    if (e2) console.log('\u2717', x.slug, e2.message); else console.log('\u2713', x.slug, Object.keys(patch).join('+'));
  }
}
console.log('替换明细:', JSON.stringify(tally, null, 1));

// ==== 复扫确认清零 ====
const { data: after } = await sb.from('learn_articles').select('slug,content_en,content_ja,summary_en,summary_ja');
const bads = FIXES.map(f => f[2]);
let left = 0;
for (const x of after) {
  for (const L of ['content_en', 'content_ja', 'summary_en', 'summary_ja']) {
    for (const b of bads) {
      if ((x[L] || '').includes(b)) {
        // 好串本身含坏串前缀的情况排除(如 ルミネーション思考 含 ルミネーション? 不在表; クライアント 不含 クエレント)
        left++; console.log('残留:', x.slug, L, b);
      }
    }
  }
}
console.log(left ? '!! 残留 ' + left : '\u2713 \u5168\u90e8\u6e05\u96f6');
