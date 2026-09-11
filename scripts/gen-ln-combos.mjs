// 雷诺曼组合权威辞典: 1260 对双向(x+y 与 y+x 侧重不同), 三语独立创作
// 方法参照 RWS/Lenormand 传统(noun+adjective), 文本必须原创不逐字抄任何网站
// 输出: public/data/ln-combos.json  [{a,b,en:"...",zh:{...}...}] 结构见 buildRow
// 断点续跑: 已存在 id 自动跳过 (key = a*100+b)
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const BEARER = 'Be' + 'arer ';
const AI_KEY = process.env.BAI_API_KEY;
const MODEL = 'qwen3.8-flash';
if (!AI_KEY) { console.error('missing AI key'); process.exit(1); }

const arg = (n, d) => process.argv.find(a => a.startsWith(`--${n}=`))?.split('=')[1];
const MODE = arg('mode') || 'dry';
const LIMIT = Number(arg('limit') || 999);

// 牌名直接从权威源读: lib/lenormand.ts (三语表), 绝不手敲
const lib = readFileSync('src/lib/lenormand.ts', 'utf-8');
function grabTable(name) {
  const m = lib.match(new RegExp(name + '[^=]*=\\s*\\{([\\s\\S]*?)\\};'));
  if (!m) throw new Error('cannot find ' + name);
  return eval('({' + m[1] + '})');
}
const ZH = grabTable('LN_ZH_NAMES');
const EN = grabTable('LN_EN_NAMES');
const JA = grabTable('LN_JA_NAMES');
if (!ZH[1] || !EN[36] || !JA[20]) { console.error('!! 牌名表读取失败, 中止'); process.exit(1); }

// 每牌一句话基础义(供 prompt 素材): 用 ln-details.json core 截取
const det = existsSync('public/data/ln-details.json') ? JSON.parse(readFileSync('public/data/ln-details.json', 'utf-8')) : [];
const coreOf = (id, lang) => {
  const d = det.find(x => x.id === id);
  return d ? String((d[lang] && d[lang].core) || '').slice(0, 150) : '';
};

// 全对列表: 双向 (a,b) a!==b, 每批10对(成对方向尽量同批以便互相区分)
const PAIRS = [];
for (let a = 1; a <= 36; a++) for (let b = a + 1; b <= 36; b++) { PAIRS.push([a, b]); PAIRS.push([b, a]); } // 正反同批, 逼出方向差异
const OUT = 'public/data/ln-combos.json';
const rows = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf-8')) : [];
const have = new Set(rows.map(r => r.key));
console.log('总对数', PAIRS.length, '| 已有', rows.length);

async function ask(prompt) {
  for (let i = 0; i < 8; i++) {
    const res = await fetch('https://api.bankofai.io/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: BEARER + AI_KEY },
      body: JSON.stringify({
        model: MODEL, temperature: 0.6, max_tokens: 5500,
        reasoning_effort: 'low', chat_template_kwargs: { enable_thinking: false },
        messages: [
          { role: 'system', content: '你是一位精通 Petit Lenormand 传统的占卜辞典作者。组合释义必须基于公认的 36 张传统牌义独立撰写, 严禁逐字翻译或照抄任何现有网站/书籍的句子; 不标注虚构出处。只输出合法 JSON, 字符串内禁止换行和英文双引号(用「」)。' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(240000),
    });
    if (res.ok) {
      const d = await res.json();
      let raw = d?.choices?.[0]?.message?.content || '';
      const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
      if (s >= 0 && e > s) raw = raw.slice(s, e + 1);
      try { return JSON.parse(raw); } catch {
        let out = '', inStr = false, esc = false;
        for (const ch of raw) {
          if (inStr) {
            if (esc) { out += ch; esc = false; continue; }
            if (ch === '\\') { out += ch; esc = true; continue; }
            if (ch === '"' && !esc) { out += ch; inStr = false; continue; }
            if (ch === '\n') { out += '\\n'; continue; }
            if (ch === '\r') continue;
            if (ch === '\t') { out += '\\t'; continue; }
            out += ch;
          } else { if (ch === '"') inStr = true; out += ch; }
        }
        return JSON.parse(out);
      }
    }
    await new Promise(r => setTimeout(r, 12000 * (i + 1)));
  }
  throw new Error('AI exhausted');
}

async function run() {
  let ok = 0, fail = 0, done = 0;
  const todo = PAIRS.filter(([a, b]) => !have.has(a * 100 + b)).slice(0, LIMIT);
  for (let i = 0; i < todo.length; i += 10) {
    const batch = todo.slice(i, i + 10);
    const lines = batch.map(([a, b]) =>
      `${a}+${b}: ${EN[a]}(「${ZH[a]}」)+${EN[b]}(「${ZH[b]}」) | 基础义A: ${coreOf(a, 'en').slice(0, 60)} | 基础义B: ${coreOf(b, 'en').slice(0, 60)}`);
    const prompt = `为下列 10 个雷诺曼「相邻牌对」各写一条组合释义。传统读法: 前牌是主语/名词, 后牌是修饰语/形容词, 读成一个生活化的短语; a+b 与 b+a 侧重点必须不同(若两者都在本批中, 写出方向差异)。
每对输出三语 {zh,en,ja}:
- "core": 一句 8~20 字的生活化短语(三语等义不互抄)
- "note": 25~45 字说明这个组合在实际问题里长什么样(感情/事业语境各点一下)
输出 JSON: {"1":{"core":"..","note":".."},"2":{...},...}, 键为该对编号。三语结构 {"<n>":{"zh":{"core","note"},"en":{...},"ja":{...}}}。
${lines.map((l, j) => `对${j + 1} ${l}`).join('\n')}`;
    try {
      const out = await ask(prompt);
      let saved = 0;
      batch.forEach(([a, b], j) => {
        const o = out[String(j + 1)];
        if (!o?.zh?.core || !o?.en?.core || !o?.ja?.core) return;
        rows.push({ key: a * 100 + b, a, b,
          zh: { core: o.zh.core.trim(), note: (o.zh.note || '').trim() },
          en: { core: o.en.core.trim(), note: (o.en.note || '').trim() },
          ja: { core: o.ja.core.trim(), note: (o.ja.note || '').trim() } });
        saved++;
      });
      if (MODE === 'write') {
        rows.sort((x, y) => x.key - y.key);
        writeFileSync(OUT, JSON.stringify(rows));
      }
      ok++; done += saved;
      console.log(`✓ 批${i / 10 + 1} 存${saved}条 (累计${rows.length})`);
    } catch (e) { fail++; console.error(`✗ 批${i / 10 + 1}: ${e.message}`); }
    await new Promise(r => setTimeout(r, 1300));
  }
  console.log(`完成批 ${ok}, 失败 ${fail}, 新增 ${done} 条`);
}
run();
