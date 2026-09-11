// 雷诺曼 36 张三语详解批量生成
// 结构(雷诺曼无逆位, 主打组合): core核心象意 / domains四领域 / pairing组合读法 / playing扑克对应 / story牌面解说 / timing时间线索
// 输出: public/data/ln-details.json  (构建期 fetch 静态文件, 同塔罗 card-details 模式)
// 用法: node scripts/gen-ln-details.mjs [--mode=dry|write] [--start=0] [--limit=36]
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const BEARER = 'Be' + 'arer ';
const AI_KEY = process['env']['BAI_API_KEY'];
const MODEL = 'qwen3.8-flash';
if (!AI_KEY) { console.error('缺 BAI_API_KEY'); process.exit(1); }

const arg = (n, d) => process.argv.find(a => a.startsWith(`--${n}=`))?.split('=')[1];
const START = Number(arg('start') || 0);
const LIMIT = Number(arg('limit') || 36);
const MODE = arg('mode') || 'dry';

// 权威名单从 i18n 读(绝不手敲)
const zhSrc = readFileSync('src/i18n/zh.ts', 'utf-8');
const enSrc = readFileSync('src/i18n/en.ts', 'utf-8');
const jaSrc = readFileSync('src/i18n/ja.ts', 'utf-8');
const grab = (src, i, k) => (src.match(new RegExp(`'ln\\.${i}\\.${k}': '([^']*)'`)) || [])[1] || '';
const CARDS = [];
for (let i = 0; i < 36; i++) {
  CARDS.push({ id: i + 1, zh: grab(zhSrc, i, 'name'), en: grab(enSrc, i, 'name'), ja: grab(jaSrc, i, 'name'), kw: grab(zhSrc, i, 'kw') });
}
if (!CARDS[0].zh || !CARDS[35].ja) { console.error('!! 名牌读取失败, 中止'); process.exit(1); }
console.log('名牌装载:', CARDS[0].zh, '...', CARDS[35].zh, '共', CARDS.length, '张');

// 每张牌的扑克对应 (标准 Petit Lenormand 表, 源自 Game of Hope)
const PLAYING = [
  '♥8', '6♥', '8♣', 10 + '♦', 'A♠', 'K♥', 'Q♣', '9♠', '6♦', '10♣',
  '8♦', 'Q♦', '9♦', 7 + '♠', '2♠', '9♥', 'Q♠', 'K♣', 'J♣', 'A♦',
  '7♥', '4♣', 5 + '♣', 'A♥', '9♣', '7♦', '7♣', '8♠', 'K♦', '4♠',
  'J♦', 'J♥', 'A♣', 'K♠', 'Q♥', 'J♠',
];

async function ask(prompt, maxTok = 6000) {
  for (let i = 0; i < 8; i++) {
    const res = await fetch('https://api.bankofai.io/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: BEARER + AI_KEY },
      body: JSON.stringify({
        model: MODEL, temperature: 0.5, max_tokens: maxTok,
        reasoning_effort: 'low', chat_template_kwargs: { enable_thinking: false },
        messages: [
          { role: 'system', content: '你是精通雷诺曼(Rider-Waite Lenormand/Petit Lenormand)体系的占卜专栏作家。雷诺曼传统没有逆位概念, 读牌靠"组合造句"。只输出合法JSON, 字符串内禁止换行/双引号(用「」代替)。' },
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
        // 兜底: 转义字符串内裸控制符
        let out = '', inStr = false, esc = false;
        for (const ch of raw) {
          if (inStr) {
            if (esc) { out += ch; esc = false; continue; }
            if (ch === '\\') { out += ch; esc = true; continue; }
            if (ch === '"') { out += ch; inStr = false; continue; }
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
  throw new Error('AI 耗尽');
}

async function gen(card) {
  const prompt = `为雷诺曼(36张)第 ${card.id} 号牌「${card.zh}」(EN: ${card.en}, JA: ${card.ja}) 写三语详解。中文关键词参照: ${card.kw}。它对应的扑克牌是 ${PLAYING[card.id - 1]}。

输出 JSON(zh/en/ja 各一份):
{
 "zh": {
  "core": "核心象意, 80~120字: 这张牌最本质指什么, 生活里长什么样",
  "domains": {"love": "感情30~60字", "career": "事业30~60字", "wealth": "财务30~60字", "health": "身心30~60字"},
  "pairing": "组合读法120~180字: 挑2~3个经典搭配示范造句, 格式如「X+${card.zh}=……」, 雷诺曼精髓是牌挨着读成一个词组",
  "playing": "扑克关联50~80字: 对应${PLAYING[card.id - 1]}这张扑克, 由此延伸出的传统辅助读法",
  "timing": "时间线索40~70字: 雷诺曼判断快慢的象意(如骑手=快, 山=迟滞, 熊=缓慢厚重)",
  "shadow": "提醒阴影40~70字: 这张牌容易误读/被忽略的一面"
 },
 "en": { 同结构英文 },
 "ja": { 同结构日文, 术语用大アルカナ体系外的「ルノルマンカード」标准日语 }
}
内容必须基于公认雷诺曼传统(Golden Dawn以来通行象意), 不发明新含义。三语等值。`;
  const out = await ask(prompt);
  for (const L of ['zh', 'en', 'ja']) {
    const x = out?.[L];
    if (!x?.core || !x?.domains?.love || !x?.pairing || !x?.playing || !x?.timing || !x?.shadow) throw new Error(`AI 缺字段(${L})`);
  }
  return { id: card.id, ...out };
}

async function run() {
  const OUTFILE = 'public/data/ln-details.json';
  const all = existsSync(OUTFILE) ? JSON.parse(readFileSync(OUTFILE, 'utf-8')) : [];
  const doneIds = new Set(all.map(x => x.id));
  let ok = 0, fail = 0;
  const batch = CARDS.slice(START, START + LIMIT);
  for (const card of batch) {
    if (doneIds.has(card.id)) continue;
    try {
      const row = await gen(card);
      console.log(`✓ ${card.id} ${card.zh}`);
      if (MODE === 'write') {
        all.push(row);
        all.sort((a, b) => a.id - b.id);
        writeFileSync(OUTFILE, JSON.stringify(all));
        console.log(`  已落盘 (${all.length}/36)`);
      }
      ok++;
    } catch (e) { fail++; console.error(`✗ ${card.id} ${card.zh}: ${e.message}`); }
    await new Promise(r => setTimeout(r, 1200));
  }
  console.log(`完成 ${ok}, 失败 ${fail}, 文件现有 ${MODE === 'write' ? all.length : '(dry未写)'} 条`);
}
run();
