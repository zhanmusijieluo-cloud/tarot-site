// 神话原型内容批量生成脚本
// 目标：为 22 张大阿卡纳 × 3 语言生成「神话原型」专栏文章（截图五段结构）
// 存入：Supabase learn_articles 表，category='myth'，slug=myth-00..myth-21（一行一篇，三语列并存）
// AI：bai qwen3.8-flash（thinking 关，快且够好）
// 断点续跑：进度存 scripts/myth-progress.json
// 用法：
//   node scripts/gen-myth-articles.mjs --mode=dry --start=0 --limit=1   # 试跑1张，不写库
//   SUPABASE_SECRET_KEY=*** node scripts/gen-myth-articles.mjs --mode=upsert  # 正式写
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const AI_URL = 'https://api.bankofai.io/v1/chat/completions';
const AI_KEY = process.env.BAI_API_KEY;
const MODEL = 'qwen3.8-flash';

if (!URL || !AI_KEY) { console.error('缺环境变量 URL/BAI_API_KEY'); process.exit(1); }

// 权威牌名+英文名（直接读源码常量，绝不手敲牌表）
const tarotSrc = readFileSync('src/lib/tarot.ts', 'utf-8');
const TAROT_DECK = eval('(' + tarotSrc.match(/export const TAROT_DECK[^=]*= (\[[\s\S]*?\n\]);/)[1] + ')');
const CARD_EN = eval('(' + (tarotSrc.match(/export const CARD_EN_NAMES[^=]*= (\{[\s\S]*?\n\});/)?.[1] || '{}') + ')');
const namesSrc = readFileSync('src/lib/card-names.ts', 'utf-8');
const CARD_JA = eval('(' + (namesSrc.match(/CARD_JA_NAMES[^=]*= (\{[\s\S]*?\}) as const/)?.[1] || '{}') + ')');

// 已有的 myth 段落素材（card-details.json 的 myth 段）作为写作参考注入
let DETAILS = [];
try { DETAILS = JSON.parse(readFileSync('public/data/card-details.json', 'utf-8')); } catch { /* 缺文件就空跑 */ }

// 只处理大阿卡纳 22 张（0~21）
const MAJOR = TAROT_DECK.filter(c => c.id < 22);

const arg = (n, d) => process.argv.find(a => a.startsWith(`--${n}=`))?.split('=')[1];
const START = Number(arg('start') || 0);
const LIMIT = Number(arg('limit') || 22);
const MODE = arg('mode') || 'dry';

const PROGRESS = 'scripts/myth-progress.json';
let doneSet = existsSync(PROGRESS) ? new Set(JSON.parse(readFileSync(PROGRESS, 'utf-8'))) : new Set();
const save = () => writeFileSync(PROGRESS, JSON.stringify([...doneSet]));

async function askAI(prompt) {
  const res = await fetch(AI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + AI_KEY },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是精通比较神话学、荣格原型心理学与韦特塔罗体系的 tarot 学者与专栏写手。只输出一个合法 JSON，禁止额外文字/代码块。所有内容基于公认学术资源（Waite 原书、Golden Dawn、希腊/埃及/北欧/凯尔特神话、荣格著作），不虚构引证。' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 8000,
      temperature: 0.7,
      reasoning_effort: 'low',
      chat_template_kwargs: { enable_thinking: false },
    }),
    signal: AbortSignal.timeout(300000),
  });
  if (!res.ok) throw new Error(`AI HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  let raw = data?.choices?.[0]?.message?.content || '';
  const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
  if (s >= 0 && e > s) raw = raw.slice(s, e + 1);
  try {
    return JSON.parse(raw);
  } catch {
    // 模型常见毛病：字符串值里塞裸换行/制表符 → 逐字符扫描，把字符串内部的裸控制符转义后重试
    let out = '', inStr = false, esc = false;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (inStr) {
        if (esc) { out += ch; esc = false; continue; }
        if (ch === '\\') { out += ch; esc = true; continue; }
        if (ch === '"') { out += ch; inStr = false; continue; }
        if (ch === '\n') { out += '\\n'; continue; }
        if (ch === '\r') { continue; }
        if (ch === '\t') { out += '\\t'; continue; }
        out += ch;
      } else {
        if (ch === '"') inStr = true;
        out += ch;
      }
    }
    return JSON.parse(out);
  }
}

const SECTION_ORDER = ['myth_tale', 'imagery', 'history', 'jungian', 'in_reading'];
const HEADINGS = {
  zh: ['神话典故', '神话意象解读', '历史文化脉络', '原型心理学解读', '占卜实战运用'],
  en: ['Mythic Tale', 'Symbolic Imagery', 'Historical Lineage', 'Jungian Prototype', 'Practical Application'],
  ja: ['神話典故', '神話的イメージ解読', '歴史と文化の流れ', 'ユング原型心理学的解釈', '占卜での実践活用'],
};

async function genMyth(card) {
  const id = card.id;
  const en = CARD_EN[id] || `Card ${id}`;
  const detail = DETAILS.find(d => d.id === id);
  const ref = detail?.zh?.myth ? `\n\n【已有素材参考（可借鉴不可照抄，需扩写成完整故事）】\n${detail.zh.myth}` : '';
  const prompt = `为韦特塔罗大阿卡纳第 ${id} 号牌「${card.name}」（英文名 ${en}）撰写一篇「神话原型」专栏文章。

严格按以下五段落结构（每段独立完整、可直接发表），三种语言（zh/en/ja）各写一份：

1. **myth_tale 神话典故**（200~300字）：讲这张牌对应的核心神话原型故事——从希腊/埃及/北欧/凯尔特/两河神话中选取最贴合的一支（写明出处文化），讲清起承转合与核心教训，有故事感不堆砌。
2. **imagery 神话意象解读**（200~300字）：把韦特牌面上 3~5 个核心符号逐一与神话中的对应物连接（形如「符号=神话对应物」），说明每个符号的神话学含义与画面叙事功能。
3. **history 历史文化脉络**（200~300字）：从 15 世纪意大利 Visconti-Sforza / 马赛塔罗，到 18~19 世纪神秘学复兴（Levi、Golden Dawn），再到 1910 韦特-史密斯定稿——讲清这张牌形象与含义的历史流变。
4. **jungian 原型心理学解读**（200~300字）：荣格原型视角——对应什么集体无意识主题？现代人处在什么状态时会抽到这张牌？这个阶段的心理任务是什么？用上阴影/个体化/原型人物等概念，落到真实心理需求。
5. **in_reading 占卜实战运用**（200~300字）：结合现实问题给解读提示——感情、事业、财务、健康/身心 4 领域各自典型断法（含正逆位差异），每条 1~2 句具体建议。

输出 JSON schema（zh/en/ja 三个键，每个含五段+title+summary）：
{
  "zh": { "title": "${card.name} · 神话原型", "summary": "一句话摘要(40字内，点出神话原型与核心教训)", "myth_tale": "……", "imagery": "……", "history": "……", "jungian": "……", "in_reading": "……" },
  "en": { "title": "${en} · Mythic Archetype", "summary": "...", "myth_tale": "...", "imagery": "...", "history": "...", "jungian": "...", "in_reading": "..." },
  "ja": { "title": "${CARD_JA[id] || en} · 神話原型", "summary": "...", "myth_tale": "...", "imagery": "...", "history": "...", "jungian": "...", "in_reading": "..." }
}
每段落要具体、有故事感、避开空话套话；三语言内容等值。正文内可用 **加粗** 强调关键句。每个字符串的值必须是单段连续文本：内部禁止出现换行、禁止出现英文双引号 " （引用请用「」）。${ref}`;

  const out = await askAI(prompt);
  const bodyOf = (lang) => SECTION_ORDER
    .map((key, i) => `## ${i + 1}. ${HEADINGS[lang][i]}\n\n${(out?.[lang]?.[key] || '').trim()}`)
    .join('\n\n---\n\n');
  const zh = out?.zh || {}, eno = out?.en || {}, ja = out?.ja || {};
  if (!zh.myth_tale || !eno.myth_tale || !ja.myth_tale) throw new Error('AI 返回缺语言段或缺字段');
  return {
    slug: `myth-${String(id).padStart(2, '0')}`,
    category: 'myth',
    sort_order: id + 1,
    published: true,
    title_zh: zh.title || `${card.name} · 神话原型`,
    title_en: eno.title || `${en} · Mythic Archetype`,
    title_ja: ja.title || `${CARD_JA[id] || en} · 神話原型`,
    summary_zh: zh.summary || '',
    summary_en: eno.summary || '',
    summary_ja: ja.summary || '',
    content_zh: bodyOf('zh'),
    content_en: bodyOf('en'),
    content_ja: bodyOf('ja'),
    updated_at: new Date().toISOString(),
  };
}

async function run() {
  if (MODE === 'upsert' && !SECRET) { console.error('写库模式必须提供 SUPABASE_SECRET_KEY 环境变量（脚本里不再内置密钥，防误提交）'); process.exit(1); }
  const sb = SECRET ? createClient(URL, SECRET) : null;
  let ok = 0, fail = 0;
  for (const card of MAJOR.slice(START, START + LIMIT)) {
    if (doneSet.has(String(card.id))) { console.log(`- 牌${card.id} 已完成, 跳过`); continue; }
    let row = null, lastErr = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try { row = await genMyth(card); break; }
      catch (e) { lastErr = e; console.error(`  牌${card.id} 第${attempt}次失败: ${e.message}`); await new Promise(r => setTimeout(r, 3000)); }
    }
    try {
      if (!row) throw lastErr || new Error('生成失败');
      if (MODE === 'upsert') {
        const { error } = await sb.from('learn_articles').upsert(row, { onConflict: 'slug' });
        if (error) throw new Error(`${row.slug}: ${error.message}`);
      } else {
        console.log(`[dry] 牌${card.id} ${card.name}: ${row.summary_zh.slice(0, 40)} | zh正文${row.content_zh.length}字`);
        if (MODE === 'peek') writeFileSync(`scripts/myth-peek-${card.id}.json`, JSON.stringify(row, null, 2));
      }
      doneSet.add(String(card.id)); save();
      ok++; console.log(`✓ 牌${card.id} ${card.name}`);
    } catch (e) { fail++; console.error(`✗ 牌${card.id}: ${e.message}`); }
  }
  console.log(`完成 ${ok}, 失败 ${fail}`);
}

run();
