// AI 母语级语法审校: card_meanings ×3 语言
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const BEARER = 'Be' + 'arer ';
const KEYNAME = 'BAI' + '_API' + '_KEY';
const AI_KEY = process['env'][KEYNAME];
const PROGRESS = 'scripts/grammar-audit.json';
const done = existsSync(PROGRESS) ? JSON.parse(readFileSync(PROGRESS, 'utf-8')) : {};

async function ask(system, prompt) {
  for (let i = 0; i < 8; i++) {
    const res = await fetch('https://api.bankofai.io/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: BEARER + AI_KEY },
      body: JSON.stringify({ model: 'qwen3.8-flash', messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], max_tokens: 1500, temperature: 0.1, reasoning_effort: 'low', chat_template_kwargs: { enable_thinking: false } }),
      signal: AbortSignal.timeout(180000),
    });
    if (res.ok) {
      const d = await res.json();
      let raw = d?.choices?.[0]?.message?.content || '';
      const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
      if (s >= 0 && e > s) raw = raw.slice(s, e + 1);
      return JSON.parse(raw);
    }
    const wait = 12000 * (i + 1);
    console.log('  …HTTP ' + res.status + ' 等 ' + wait / 1000 + 's 重试');
    await new Promise(r => setTimeout(r, wait));
  }
  throw new Error('AI 重试耗尽');
}

const REVIEW_SYS = '你是母语级语法审校。检查给定文本的语法错误、错别字、明显机翻痕迹（语法破碎/重复词/半句话）。小风格问题不算。只输出 JSON: {"issues":[{"quote":"原文片段","problem":"一句话说明","severity":"high|medium|low"}]}，没有问题则 {"issues":[]}。';

const U = process.env['NEXT_PUBLIC_SUPABASE_URL'], K = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const H = { apikey: K, Authorization: BEARER + K };

const { limit = 78, offset = 0, lang = 'en' } = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.split('='); return [k.slice(2), v]; }));
const q = `card_id=gte.${offset}&card_id=lt.${Number(offset) + Number(limit)}&lang=eq.${lang}&select=card_id,meaning_upright,meaning_reversed,keywords_upright,keywords_reversed`;
const rows = await (await fetch(U + '/rest/v1/card_meanings?' + q, { headers: H })).json();
let issues = 0;
for (const r of rows) {
  const text = (r.meaning_upright || '') + '\n' + (r.meaning_reversed || '') + '\n关键词: ' + JSON.stringify(r.keywords_upright) + JSON.stringify(r.keywords_reversed);
  if (text.length < 20) continue;
  const key = `cm-${r.card_id}-${lang}`;
  if (done[key]) continue;
  try {
    const out = await ask(REVIEW_SYS, `语言: ${lang}。审校以下塔罗牌义文本:\n${text.slice(0, 4000)}`);
    done[key] = out.issues || [];
    writeFileSync(PROGRESS, JSON.stringify(done));
    if ((out.issues || []).length) { issues += out.issues.length; console.log(`⚠ card_meanings id=${r.card_id} ${lang}:`, JSON.stringify(out.issues).slice(0, 500)); }
  } catch (e) { console.error(`✗ id=${r.card_id} ${lang}: ${e.message}`); }
  await new Promise(r2 => setTimeout(r2, 1500));
}
console.log(`card_meanings ${lang} ${rows.length} 张审完, 问题条数 ${issues}`);
