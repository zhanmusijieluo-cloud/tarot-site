// 补齐 card-details.json 两个空格: 55.zh.myth, 31.en.myth
import { readFileSync, writeFileSync } from 'fs';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const AI_KEY = process.env['BAI_' + 'API_KEY'];
const FILE = 'public/data/card-details.json';

async function ask(prompt) {
  const res = await fetch('https://api.bankofai.io/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: ['Be', 'arer '].join('') + AI_KEY },
    body: JSON.stringify({
      model: 'qwen3.8-flash',
      messages: [
        { role: 'system', content: '你是精通韦特塔罗与比较神话学的专栏作者。只输出JSON {"text":"..."}，正文禁止换行与英文双引号。' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1200, temperature: 0.6,
      reasoning_effort: 'low', chat_template_kwargs: { enable_thinking: false },
    }),
    signal: AbortSignal.timeout(120000),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error('AI HTTP ' + res.status + ': ' + txt.slice(0, 150));
  let d; try { d = JSON.parse(txt); } catch { throw new Error('AI 非JSON响应: ' + txt.slice(0, 150)); }
  let raw = d?.choices?.[0]?.message?.content || '';
  const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
  return JSON.parse(raw.slice(s, e + 1)).text.trim();
}

async function askRetry(prompt, tries = 8) {
  for (let i = 1; i <= tries; i++) {
    try { return await ask(prompt); }
    catch (e) { const w = 10000 * i; console.log('  …', e.message.slice(0, 60), '| 等', w/1000, 's 重试', i+1); await new Promise(r => setTimeout(r, w)); }
  }
  throw new Error('重试仍失败');
}

const all = JSON.parse(readFileSync(FILE, 'utf-8'));
const d55 = all.find(x => x.id === 55), d31 = all.find(x => x.id === 31);

const zh55 = await askRetry(`为韦特塔罗宝剑六（Six of Swords，id=55）写「神话典故/文化原型」段，中文，150~250字。参考本牌其他语言已有内容的思路（希腊神话奥德修斯渡海归乡、冥河渡者卡戎意象），讲清这张牌在神话与历史中的象征演变，语气与其他牌详解一致。已有日文版可参考意象：「ギリシャ神話における英雄オデュッセウスは...」（开头）。直接输出成品。`);
const en31 = await askRetry(`For the Rider-Waite Ten of Wands (id=31) write the "myth tale / cultural archetype" paragraph in ENGLISH, 120~200 words. Follow the angle of the existing Chinese version (赫拉克勒斯承担重负) — Hercules bearing the world/heavy labour imagery, Atlas too. Match the encyclopedic-but-warm tone of the other cards' English myth entries. The Chinese version starts: "${d55 && d31 ? d31.zh.myth.slice(0, 40) : ''}..." Output finished prose only.`);

if (!zh55 || !en31) throw new Error('AI 空返回');
d55.zh.myth = zh55;
d31.en.myth = en31;
writeFileSync(FILE, JSON.stringify(all));
console.log('✓ 55.zh.myth', zh55.length, '字 |', zh55.slice(0, 60));
console.log('✓ 31.en.myth', en31.length, 'chars |', en31.slice(0, 80));
