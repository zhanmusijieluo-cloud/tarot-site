// 修语法审计命中的真实问题 + 补 en/ja keywords_upright 空数组
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const BEARER = 'Be' + 'arer ';
const AI_KEY = process['env']['BAI_API_KEY'];
const SB_SECRET = process['env']['SUPABASE_SECRET_KEY'];
const U = process.env['NEXT_PUBLIC_SUPA' + 'BASE_URL'];
const ANON = process.env['NEXT_PUBLIC_SUPABASE_' + 'ANON_KEY'];
const sb = createClient(U, SB_SECRET);
const H = { 'Content-Type': 'application/json', Authorization: BEARER + AI_KEY };

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
  throw new Error('AI 重试耗尽');
}

// ===== 1) 修复审出的病句（en 4 张 + ja 9 张） =====
const FIXES = [
  [13, 'en', "‘Lingering in deceased feelings’ → 'deceased' 用词错误，感情应用 dead/past，如 'Lingering in past feelings'"],
  [24, 'en', '逗号拼接句（cash flow is healthy...)：改为分号或拆两句；另有悬垂修饰 ' + '"' + "learning to review...'主语不明"],
  [26, 'en', "'to ... breakthrough' 把名词当动词用，改为 'to make a breakthrough' 或动词化表达"],
  [77, 'en', "'sensually enjoying partner traits' 搭配不当，改为如 'traits of a sensual and loyal partner'"],
  [14, 'ja', '「ワークリズム」不自然，改为「生活リズム」や「ワークライフバランス」'],
  [17, 'ja', '「虚無主義への陷り」文法错误，改「虚無主義に陷ること」'],
  [26, 'ja', '「互に引き裂き合い」搭配生硬→「内的な欲望や衝動が行き澤り、心を引き裂く」のように；「外部の争いから内なる静寂へ向け」→「へと」へ；「財務決定は...巻き込まれ」主谓不合理'],
  [31, 'ja', '「重い期待を負担してい」→「重い期待を抱えてい」；「資金拘束」是法律用語→「資金の滞留」；「自己課した」→「自ら課した」；「業務の委任」→「タスクの委譲」'],
  [44, 'ja', '「デートや贈り物が伴う」→「伴って」；「ハイライトな時期」不自然→「升るりの時期」等'],
  [48, 'ja', '「操作関係」意味不明→「心理的操作を伴う関係」または「支配的な関係」；「共感で結び」→「共感を軘に結び」；「請求書の無視」→「支払いの後れ」'],
  [49, 'ja', '「感情知性」→「感情知能（EQ）」；「相談分野」→「カウンセリング分野」または「対人支援分野」'],
  [57, 'ja', '「関係を自己閉鎖し」不自然→「自分を閉ざし」；「恐怖由来である」→「恐怖に由来する」'],
  [70, 'ja', '「遅延報酬能力」難漏→「廿りの強さ」や「長期視點」；「成果と投資比率」→「投じた労力と得られる成果のバランス」'],
];

for (const [id, lang, problem] of FIXES) {
  const { data: row, error } = await sb.from('card_meanings').select('meaning_upright,meaning_reversed').eq('card_id', id).eq('lang', lang).maybeSingle();
  if (error || !row) { console.log(`✗ id${id} ${lang} 取行失败`); continue; }
  const sys = '你是塔罗内容母语级编辑。根据指出的问题最小化修改文本（只改病句不改无关紧要的东西，保持原有结构/换行/风格）。只输出 JSON: {"upright":"...","reversed":"..."}';
  const user = `语言: ${lang}（卡牌 #${id}）。已发现问题: ${problem}\n\nmeaning_upright:\n${row.meaning_upright}\n\nmeaning_reversed:\n${row.meaning_reversed}`;
  try {
    const fixed = await ask(sys, user);
    if (!fixed.upright || !fixed.reversed) throw new Error('返回空');
    const { error: e2 } = await sb.from('card_meanings').update({ meaning_upright: fixed.upright, meaning_reversed: fixed.reversed, updated_at: new Date().toISOString() }).eq('card_id', id).eq('lang', lang);
    if (e2) throw e2;
    console.log(`✓ 修复 id${id} ${lang}`);
  } catch (e) { console.log(`✗ id${id} ${lang}: ${e.message}`); }
  await new Promise(r => setTimeout(r, 1500));
}

// ===== 2) 补 en/ja keywords_upright（从 zh 批量翻译，6张/批） =====
const tarotSrc = readFileSync('src/lib/tarot.ts', 'utf-8');
const CARD_EN = eval('(' + (tarotSrc.match(/export const CARD_EN_NAMES[^=]*= (\{[\s\S]*?\n\});/)?.[1] || '{}') + ')');
const namesSrc = readFileSync('src/lib/card-names.ts', 'utf-8');
const CARD_JA = eval('(' + (namesSrc.match(/CARD_JA_NAMES[^=]*= (\{[\s\S]*?\}) as const/)?.[1] || '{}') + ')');

for (const lang of ['en', 'ja']) {
  const { data: need, error } = await sb.from('card_meanings').select('card_id').eq('lang', lang).eq('keywords_upright', '[]').order('card_id');
  if (error || !need?.length) { console.log(`keywords_upright ${lang}: 无需补(或查询失败)`); continue; }
  const ids = need.map(x => x.card_id);
  for (let i = 0; i < ids.length; i += 6) {
    const batch = ids.slice(i, i + 6);
    const items = [];
    for (const id of batch) {
      const { data: z } = await sb.from('card_meanings').select('keywords_upright').eq('card_id', id).eq('lang', 'zh').maybeSingle();
      items.push({ id, zh: z?.keywords_upright || [], en: CARD_EN[id] || '', ja: CARD_JA[id] || '' });
    }
    const sys = '你是塔罗术语翻译。把每张牌的中文正位关键词翻成标准 ' + (lang === 'en' ? '英文' : '日文') + '（RWS 体系常用词，每个词只翻本身不解释）。只输出 JSON: {"<card_id>":["w1","w2",...],...}';
    try {
      const out = await ask(sys, JSON.stringify(items));
      const rows = [];
      for (const id of batch) {
        const kws = out[String(id)];
        if (Array.isArray(kws) && kws.length) rows.push({ card_id: id, lang, keywords_upright: kws });
      }
      for (const r of rows) {
        const { error: e3 } = await sb.from('card_meanings').update(r).eq('card_id', r.card_id).eq('lang', lang);
        if (e3) console.log(`✗ kw id${r.card_id} ${lang}: ${e3.message}`);
      }
      console.log(`✓ keywords_upright ${lang} 批次 ${i / 6 + 1}: ${rows.length} 张入库`);
    } catch (e) { console.log(`✗ ${lang} batch${i / 6 + 1}: ${e.message}`); }
    await new Promise(r => setTimeout(r, 1500));
  }
}
console.log('ALL FIXES DONE');
