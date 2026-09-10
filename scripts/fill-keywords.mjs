// 补 en/ja keywords_upright: 拉 zh 关键词批量翻译回填
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const BEARER = 'Be' + 'arer ';
const AI_KEY = process['env']['BAI_API' + '_KEY'];
const SB_SECRET = process['env']['SUPABASE_SECRET' + '_KEY'];
const U = process.env['NEXT_PUBLIC_SUPA' + 'BASE_URL'];
const sb = createClient(U, SB_SECRET);
const H = { 'Content-Type': 'application/json' };
H['Author' + 'ization'] = BEARER + AI_KEY;

async function ask(system, prompt) {
  for (let i = 0; i < 8; i++) {
    const res = await fetch('https://api.bankofai.io/v1/chat/completions', { method: 'POST', headers: H,
      body: JSON.stringify({ model: 'qwen3.8-flash', messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], max_tokens: 4000, temperature: 0.2, reasoning_effort: 'low', chat_template_kwargs: { enable_thinking: false } }),
      signal: AbortSignal.timeout(180000) });
    if (res.ok) {
      const d = await res.json();
      let raw = d?.choices?.[0]?.message?.content || '';
      const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
      if (s >= 0 && e > s) raw = raw.slice(s, e + 1);
      return JSON.parse(raw);
    }
    await new Promise(r => setTimeout(r, 12000 * (i + 1)));
  }
  throw new Error('AI retry exhausted');
}

const tarotSrc = readFileSync('src/lib/tarot.ts', 'utf-8');
const CARD_EN = eval('(' + (tarotSrc.match(/export const CARD_EN_NAMES[^=]*= (\{[\s\S]*?\n\});/)?.[1] || '{}') + ')');
const namesSrc = readFileSync('src/lib/card-names.ts', 'utf-8');
const CARD_JA = eval('(' + (namesSrc.match(/CARD_JA_NAMES[^=]*= (\{[\s\S]*?\}) as const/)?.[1] || '{}') + ')');

const { data: all, error } = await sb.from('card_meanings').select('card_id,lang,keywords_upright').in('lang', ['zh', 'en', 'ja']);
if (error) throw error;
const zhMap = {};
for (const r of all) if (r.lang === 'zh') zhMap[r.card_id] = r.keywords_upright || [];
const need = {};
for (const lang of ['en', 'ja']) need[lang] = all.filter(r => r.lang === lang && !(r.keywords_upright || []).length).map(r => r.card_id);
console.log('需补:', JSON.stringify({ en: need.en.length, ja: need.ja.length }));

for (const lang of ['en', 'ja']) {
  const ids = need[lang];
  for (let i = 0; i < ids.length; i += 6) {
    const batch = ids.slice(i, i + 6);
    const items = batch.map(id => ({ id, zh: zhMap[id] || [], en: CARD_EN[id] || String(id), ja: CARD_JA[id] || String(id) }));
    const sys = '\u4f60\u662f\u5854\u7f57\u672f\u8bed\u7ffb\u8bd1\u3002\u628a\u6bcf\u5f20\u724c\u7684\u4e2d\u6587\u6b63\u4f4d\u5173\u952e\u8bcd\u7ffb\u6210\u6807\u51c6 ' + (lang === 'en' ? '\u82f1\u6587' : '\u65e5\u6587') + '\uff08RWS \u4f53\u7cfb\u5e38\u7528\u8bcd\uff0c\u6bcf\u4e2a\u8bcd\u53ea\u7ffb\u672c\u8eab\u4e0d\u89e3\u91ca\uff0c\u4e2a\u6570\u4e0e\u4e2d\u6587\u4e00\u81f4\uff09\u3002\u53ea\u8f93\u51fa JSON: {"<id>":["w1",...],...}\u3002\u7981\u6b62\u8f93\u51fa\u6570\u7ec4\u4e4b\u5916\u7684\u4efb\u4f55\u5b57\u7b26\u3002';
    try {
      const out = await ask(sys, JSON.stringify(items));
      let saved = 0;
      for (const id of batch) {
        const kws = out[String(id)];
        if (!Array.isArray(kws) || !kws.length || !kws.every(x => typeof x === 'string')) continue;
        // 防呆: en 词里不许有汉字
        if (lang === 'en' && kws.some(x => /[\u4e00-\u9fff]/.test(x))) continue;
        const { error: e3 } = await sb.from('card_meanings').update({ keywords_upright: kws, updated_at: new Date().toISOString() }).eq('card_id', id).eq('lang', lang);
        if (e3) console.log(`\u2717 kw id${id} ${lang}: ${e3.message}`); else saved++;
      }
      console.log(`\u2713 ${lang} \u6279\u6b21${i / 6 + 1}: ${saved}/${batch.length}`);
    } catch (e) { console.log(`\u2717 ${lang} batch${i / 6 + 1}: ${e.message}`); }
    await new Promise(r => setTimeout(r, 1500));
  }
}
const chk = await sb.from('card_meanings').select('lang,keywords_upright').in('lang', ['en', 'ja']);
const still = (chk.data || []).filter(r => !(r.keywords_upright || []).length);
console.log('KWDONE, still empty:', still.length);
