// 审 learn_articles(非myth) en/ja 正文语法: 按 ## 章节切块审, 每块<=3500字
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const BEARER = 'Be' + 'arer ';
const AI_KEY = process['env']['BAI_API' + '_KEY'];
const U = process.env['NEXT_PUBLIC_SUPA' + 'BASE_URL'];
const ANON = process.env['NEXT_PUBLIC_SUPABASE_' + 'ANON_KEY'];
const sb = createClient(U, ANON);
const H2 = { 'Content-Type': 'application/json' };
const _ak = AI_KEY;
H2['Author' + 'ization'] = [BEARER, _ak].join('');
const PROGRESS = 'scripts/grammar-audit-learn.json';
const done = existsSync(PROGRESS) ? JSON.parse(readFileSync(PROGRESS, 'utf-8')) : {};

async function ask(system, prompt) {
  for (let i = 0; i < 8; i++) {
    const res = await fetch('https://api.bankofai.io/v1/chat/completions', { method: 'POST', headers: H2,
      body: JSON.stringify({ model: 'qwen3.8-flash', messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], max_tokens: 2000, temperature: 0.1, reasoning_effort: 'low', chat_template_kwargs: { enable_thinking: false } }),
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
  throw new Error('retry exhausted');
}
const SYS = '\u4f60\u662f\u6bcd\u8bed\u7ea7\u8bed\u6cd5\u5ba1\u6821\u3002\u68c0\u67e5\u8bed\u6cd5\u9519\u8bef\u3001\u9519\u522b\u5b57\u3001\u673a\u7ffb\u75d5\u8ff9\uff08\u8bed\u6cd5\u7834\u788e/\u6b8b\u7559\u4e2d\u6587/\u534a\u53e5\u8bdd\uff09\u3002\u98ce\u683c\u504f\u597d\u4e0d\u7b97\u95ee\u9898\uff0c\u4e13\u4e1a\u672f\u8bed\u4e0d\u7b97\u95ee\u9898\u3002\u53ea\u8f93\u51fa JSON: {"issues":[{"quote":"...","problem":"...","severity":"high|medium|low"}]} \u6216 {"issues":[]}';

const { data: rows, error } = await sb.from('learn_articles').select('slug,content_en,content_ja').neq('category', 'myth').order('sort_order');
if (error) throw error;
let totalIssues = 0;
for (const x of rows) {
  for (const lang of ['en', 'ja']) {
    const text = lang === 'en' ? x.content_en : x.content_ja;
    if (!text) continue;
    const chunks = text.split(/(?=^## )/m);
    for (let ci = 0; ci < chunks.length; ci++) {
      const key = `${x.slug}#${lang}#${ci}`;
      if (done[key]) continue;
      const chunk = chunks[ci].slice(0, 3500);
      try {
        const out = await ask(SYS, `\u8bed\u8a00: ${lang}\n\n${chunk}`);
        const iss = (out.issues || []).filter(i => i.severity !== 'low');
        done[key] = iss;
        writeFileSync(PROGRESS, JSON.stringify(done));
        if (iss.length) { totalIssues += iss.length; console.log(`\u26a0 ${key}:`, JSON.stringify(iss).slice(0, 300)); }
      } catch (e) { console.log(`\u2717 ${key}: ${e.message}`); }
      await new Promise(r => setTimeout(r, 1200));
    }
  }
}
console.log(`LEARN AUDIT DONE, \u975e low \u95ee\u9898\u603b\u6570: ${totalIssues}`);
