// 实战技巧文章三语补齐：learn_articles 非 myth 的 9 篇，正文 zh → en/ja 全文翻译
// 按 ## 章节切块翻译（防超长截断），AI 保留 markdown 结构；断点续跑 translate-progress.json
// 用法: node scripts/translate-learn-articles.mjs --mode=dry|upsert [--only=slug]
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const AI_URL = 'https://api.bankofai.io/v1/chat/completions';
const AI_KEY = process.env.BAI_API_KEY;
const MODEL = 'qwen3.8-flash';
if (!URL || !AI_KEY) { console.error('缺环境变量'); process.exit(1); }

const arg = (n, d) => process.argv.find(a => a.startsWith(`--${n}=`))?.split('=')[1];
const MODE = arg('mode') || 'dry';
const ONLY = arg('only');
const PROGRESS = 'scripts/translate-progress.json';
let done = existsSync(PROGRESS) ? JSON.parse(readFileSync(PROGRESS, 'utf-8')) : {};
const save = () => writeFileSync(PROGRESS, JSON.stringify(done));

const GLOSSARY = `塔罗术语必须用标准译法（英文）：大阿卡纳=Major Arcana，小阿卡纳=Minor Arcana，牌阵=spread，正位=upright，逆位=reversed，问卜者=querent，愚者=The Fool，魔术师=The Magician，女祭司=The High Priestess，皇后=The Empress，皇帝=The Emperor，教皇=The Hierophant，恋人=The Lovers，战车=The Chariot，力量=Strength，隐者=The Hermit，命运之轮=Wheel of Fortune，正义=Justice，倒吊人=The Hanged Man，死神=Death，节制=Temperance，恶魔=The Devil，塔=The Tower，星星=The Star，月亮=The Moon，太阳=The Sun，审判=Judgement，世界=The World；权杖=Wands，圣杯=Cups，宝剑=Swords，星币=Pentacles；宫廷牌 Page/Knight/Queen/King。
日文术语：大アルカナ、小アルカナ、スプレッド（牌阵）、正位置、逆位置、相談者（クライアント）、ワンド、カップ、ソード、ペンタクル、ペイジ、ナイト、クイーン、キング。`;

async function askAI(prompt, maxTok = 8000) {
  let lastErr = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + AI_KEY },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: '你是专业的塔罗/神秘学内容翻译，译文要像母语专栏作者直接写的，不是翻译腔。' + GLOSSARY + ' 只输出 JSON，禁止额外文字。' },
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTok,
          temperature: 0.3,
          reasoning_effort: 'low',
          chat_template_kwargs: { enable_thinking: false },
        }),
        signal: AbortSignal.timeout(240000),
      });
      if (res.status === 429 || res.status >= 500) {
        const wait = 15000 * attempt; // 限流：逐次多等 (15/30/45/60/75s)
        console.log(`  …HTTP ${res.status} 限流, 等 ${wait / 1000}s 后第${attempt + 1}次重试`);
        await new Promise(r => setTimeout(r, wait));
        lastErr = new Error(`AI HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
      const data = await res.json();
      let raw = data?.choices?.[0]?.message?.content || '';
      const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
      if (s >= 0 && e > s) raw = raw.slice(s, e + 1);
      return JSON.parse(raw);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (!/HTTP/.test(lastErr.message)) { // JSON 解析类错误：短暂等待重试一次即可
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
  throw lastErr || new Error('AI 调用失败');
}

function splitBlocks(content) {
  // 以 ## 标题为切点；返回 [{head, body}]，首块 head 可为 ''（引言）
  const parts = content.split(/(?=^## )/m);
  return parts.map((p) => {
    const nl = p.indexOf('\n');
    return { head: nl === -1 ? p.trim() : p.slice(0, nl).trim(), body: nl === -1 ? '' : p.slice(nl + 1) };
  });
}
function joinBlocks(blocks) {
  return blocks.map((b) => (b.head ? (b.body ? `${b.head}\n${b.body}` : b.head) : b.body)).join('\n').trim();
}

async function translateArticle(row) {
  const out = { en: '', ja: '' };
  for (const lang of ['en', 'ja']) {
    const blocks = splitBlocks(row.content_zh);
    const doneLang = done[row.slug]?.[lang];
    if (doneLang) { out[lang] = doneLang; continue; }
    const translated = [];
    for (const b of blocks) {
      const prompt = `把下面这段塔罗专栏内容翻译成${lang === 'en' ? '英文' : '日文'}。
要求：1) 保留全部 markdown 结构（## ### 标题层级、- 列表、1. 编号、**加粗**、换行）；2) 标题行与正文一起翻，语气专业自然，例子里的问句译成${lang === 'en' ? '英语母语者会问的样子' : '日本語ネイティブが占い師に聞く自然な言い回し'}；3) 不要增删内容。
${lang === 'en' ? '' : '注意：牌名首次出现时可在括号内附英文。'}
只输出 JSON：{"text":"译文"}
---
${b.head ? b.head + '\n' : ''}${b.body}`;
      const r = await askAI(prompt, 6000);
      let t = String(r?.text || '').trim();
      if (!t) throw new Error(`${row.slug}/${lang} 译文为空`);
      // 结构兜底：标题行必须由 AI 翻译且保持 ## 前缀
      if (b.head && !/^#{1,4} /.test(t.split('\n')[0])) {
        // AI 把标题弄丢了 → 至少保证标题存在
        const headMap = await askAI(`只把这一行标题翻译${lang === 'en' ? '成英文' : '成日文'}，保留 ## 前缀，输出JSON {"text":"..."}：\n${b.head}`, 200);
        t = `${String(headMap?.text || b.head).trim()}\n${t}`;
      }
      // 塞回 blocks 结构：首行是 head，其余是 body
      const nl = t.indexOf('\n');
      translated.push({ head: b.head ? (nl === -1 ? t : t.slice(0, nl)) : '', body: b.head ? (nl === -1 ? '' : t.slice(nl + 1)) : t });
      await new Promise(r => setTimeout(r, 2000)); // 段间节流防 429
    }
    out[lang] = joinBlocks(translated);
    done[row.slug] = { ...(done[row.slug] || {}), [lang]: out[lang] }; save();
  }
  return out;
}

async function run() {
  const sb = MODE === 'upsert' ? createClient(URL, SECRET) : null;
  if (MODE === 'upsert' && !SECRET) { console.error('upsert 需 SUPABASE_SECRET_KEY'); process.exit(1); }
  const { data: rows, error } = await sb2(sb).from('learn_articles')
    .select('slug,category,title_zh,content_zh').neq('category', 'myth').order('sort_order');
  if (error) throw error;
  let ok = 0, fail = 0;
  for (const row of rows) {
    if (ONLY && row.slug !== ONLY) continue;
    try {
      const t = await translateArticle(row);
      const zhLen = row.content_zh.length;
      if (MODE === 'upsert') {
        const { error: e2 } = await sb.from('learn_articles').update({ content_en: t.en, content_ja: t.ja, updated_at: new Date().toISOString() }).eq('slug', row.slug);
        if (e2) throw new Error(e2.message);
      }
      ok++; console.log(`✓ ${row.slug} zh${zhLen}字 → en${t.en.length}/ja${t.ja.length}${MODE === 'dry' ? ' [dry]' : ' 已写库'}`);
    } catch (e) { fail++; console.error(`✗ ${row.slug}: ${e.message}`); }
  }
  console.log(`完成 ${ok}, 失败 ${fail}`);
}
// 读用 anon（RLS 只读开放），写用 secret
function sb2(secret) {
  return secret || createClient(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
run().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
