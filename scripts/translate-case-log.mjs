// 案例库中文补译：tarot_case_log 的 5769 条 reading_en → reading_zh
// 逐条翻译（保留解读师对客户说话的口语共情语气 + 塔罗术语标准中文译法），PATCH 回写。
//
// 用法（必须传 service key，写 tarot_case_log 要绕过 RLS）：
//   KEY=$(grep -o "sb_secret_[A-Za-z0-9_-]*" scripts/enrich-card-meanings.mjs | head -1)
//   SUPABASE_SECRET_KEY=$KEY node scripts/translate-case-log.mjs --mode=dry --limit=5
//   SUPABASE_SECRET_KEY=$KEY node scripts/translate-case-log.mjs --mode=upsert --conc=4
//
// 续跑：scripts/translate-case-progress.json 记录已完成的 id，重跑自动跳过。
// dry 模式不写库、不存进度。
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// 本项目未安装 dotenv（scripts/translate-learn-articles.mjs 的 import 会 ERR_MODULE_NOT_FOUND），
// 这里自己解析 .env.local，只补未设置的键。
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const AI_URL = 'https://api.bankofai.io/v1/chat/completions';
const AI_KEY = process.env.BAI_API_KEY;
const MODEL = 'qwen3.8-flash';

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
const MODE = arg('mode') || 'dry';
const LIMIT = Number(arg('limit') || 0);
const CONC = Math.max(1, Number(arg('conc') || 3));
const PROGRESS = 'scripts/translate-case-progress.json';

if (!URL) { console.error('缺 NEXT_PUBLIC_SUPABASE_URL'); process.exit(1); }
if (!AI_KEY) { console.error('缺 BAI_API_KEY'); process.exit(1); }
if (MODE === 'upsert' && !SECRET) {
  console.error('upsert 模式需要 SUPABASE_SECRET_KEY（写入 tarot_case_log 要绕过 RLS）。取值方式见本文件顶部注释。');
  process.exit(1);
}

const DONE = existsSync(PROGRESS) ? JSON.parse(readFileSync(PROGRESS, 'utf-8')) : {};
const saveProgress = () => writeFileSync(PROGRESS, JSON.stringify(DONE));

const GLOSSARY = `塔罗术语用中文标准译法：大阿卡纳/小阿卡纳、牌阵、正位/逆位、问卜者、
愚者 魔术师 女祭司 皇后 皇帝 教皇 恋人 战车 力量 隐者 命运之轮 正义 倒吊人 死神 节制 恶魔 塔 星星 月亮 太阳 审判 世界、
权杖 圣杯 宝剑 星币、侍从 骑士 王后 国王、本垣 曜升 三分 界 面、接纳 互容。`;

const SYSTEM =
  '你是资深塔罗解读师兼中文写手。把英文解读改写成中文时，要像中文母语解读师直接对客户说出来的话 —— 有共情、有口语节奏，不是翻译腔，也不是学术论文。' +
  GLOSSARY +
  ' 只输出译文正文，不要任何说明、标题或引号包裹。';

const PROMPT = (en) => `把下面这段英文塔罗解读翻译成中文。

要求：
1. 保持原文的口语化与共情语气 —— 这是解读师对问卜者说的话，不是学术文本
2. 不要逐字直译，要读起来像中文母语者原创的
3. 保留原有的段落结构（空行分段）
4. 牌名与术语按标准中文译法
5. 只输出译文，不要任何前缀说明

英文原文：
${en}`;

async function translate(en) {
  let lastErr = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + AI_KEY },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: PROMPT(en) },
          ],
          max_tokens: 3000,
          temperature: 0.4,
          reasoning_effort: 'low',
          chat_template_kwargs: { enable_thinking: false },
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (res.status === 429 || res.status >= 500) {
        const wait = 8000 * attempt;
        console.log(`   …HTTP ${res.status} 限流，等 ${wait / 1000}s 后重试（${attempt}/6）`);
        await new Promise((r) => setTimeout(r, wait));
        lastErr = new Error(`AI HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
      const data = await res.json();
      const zh = (data?.choices?.[0]?.message?.content || '').trim();
      if (!zh) throw new Error('空译文');
      return zh;
    } catch (e) {
      lastErr = e;
      if (attempt === 6) break;
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
  throw lastErr;
}

// ---- 主流程 ----
const sb = createClient(URL, SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

console.log(`模式: ${MODE} | 并发: ${CONC} | 进度文件已有: ${Object.keys(DONE).length} 条`);

const PAGE = 500;
let rows = [];
for (let from = 0; ; from += PAGE) {
  const { data, error } = await sb
    .from('tarot_case_log')
    .select('id,card1,card2,card3,reading_en')
    .is('reading_zh', null)
    .order('id')
    .range(from, from + PAGE - 1);
  if (error) { console.error('查询失败:', error.message); process.exit(1); }
  if (!data?.length) break;
  rows.push(...data);
  if (data.length < PAGE) break;
}
rows = rows.filter((r) => !DONE[r.id] && r.reading_en?.trim());
console.log(`库里待译: ${rows.length} 条${LIMIT ? `（本次只处理前 ${LIMIT} 条）` : ''}`);
if (LIMIT) rows = rows.slice(0, LIMIT);
if (!rows.length) { console.log('没有待译条目。'); process.exit(0); }

const t0 = Date.now();
let ok = 0, fail = 0;
const queue = [...rows];

async function worker(wid) {
  while (queue.length) {
    const row = queue.shift();
    if (!row) break;
    try {
      const zh = await translate(row.reading_en);
      if (MODE === 'upsert') {
        const { error } = await sb.from('tarot_case_log').update({ reading_zh: zh }).eq('id', row.id);
        if (error) throw new Error('写库失败: ' + error.message);
      }
      DONE[row.id] = 1;
      ok++;
      if (MODE === 'upsert' && ok % 20 === 0) saveProgress();
      const rate = ok / ((Date.now() - t0) / 1000);
      if (MODE === 'dry' && ok <= 3) {
        console.log(`\n───── #${row.id}  ${row.card1} / ${row.card2} / ${row.card3} ─────`);
        console.log('EN:', row.reading_en.slice(0, 160).replace(/\s+/g, ' ') + '…');
        console.log('ZH:', zh);
      } else if (ok % 20 === 0) {
        console.log(`  …已 ${ok} 条 | ${rate.toFixed(2)} 条/秒 | 预计剩余 ${(queue.length / rate / 60).toFixed(1)} 分钟`);
      }
    } catch (e) {
      fail++;
      console.error(`  ✗ #${row.id} 失败: ${e.message}`);
    }
  }
}

process.on('SIGINT', () => { if (MODE === 'upsert') saveProgress(); console.log('\n已保存进度，退出。'); process.exit(0); });

await Promise.all(Array.from({ length: CONC }, (_, i) => worker(i + 1)));
if (MODE === 'upsert') saveProgress();

const mins = (Date.now() - t0) / 60000;
console.log(`\n完成: 成功 ${ok} / 失败 ${fail} | 耗时 ${mins.toFixed(1)} 分钟 | ${(ok / Math.max(mins, 0.01)).toFixed(1)} 条/分钟`);
if (MODE === 'dry') console.log('（dry 模式：未写库、未存进度）');
else console.log(`进度已存 ${PROGRESS}（累计 ${Object.keys(DONE).length} 条）`);
