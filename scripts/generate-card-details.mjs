/**
 * 生成 78 张牌终极豪华版三语详解数据
 * 用法：node scripts/generate-card-details.mjs <BATCH_START> <BATCH_END>
 * 例：node scripts/generate-card-details.mjs 0 2  (生成 id 0-2 三张牌)
 * 默认：node scripts/generate-card-details.mjs  (从上次断点继续)
 */

import fs from 'fs';
import { execSync } from 'child_process';

const BAI_KEY = 'sk-1jaoqbdcy88nb6syhu89jclzz7z24cvf';
const MODEL = 'deepseek-v4-flash-vision-exp';
const API = 'https://api.b.ai/v1/chat/completions';
const OUTPUT = 'src/lib/card-details.data.ts';
const CHECKPOINT = 'scripts/_detail_checkpoint.json';

// 牌名表
const NAMES = JSON.parse(fs.readFileSync('scripts/_card_names.json', 'utf8'));

// 内容模板：每张牌的三语完整定义
const PROMPT_TEMPLATE = (cardId, cardName) => `你是一位塔罗研究专家，知识渊博，深谙韦特塔罗体系。现在为塔罗牌「${cardName}」(id=${cardId}) 生成一份终极豪华版详解。

要求用中文生成，但其中 en 和 ja 字段要用英文/日文给出对应内容。

严格按照以下 JSON 格式输出，不要包含任何其他文字，只输出 JSON 对象：

{
  "id": ${cardId},
  "zh": {
    "symbolism": "牌面描述 - 详细描写画面中的每个元素、人物姿态、颜色、符号、背景，以及这些象征的深层含义。至少 200-300 字，仿佛在描述一幅画。",
    "core": "核心含义概述 - 用 1-2 段话概括这张牌最本质的含义。",
    "upright": "正位详解 - 3-5 段话，每段一个角度：基本含义、心理层面、行动指引、精神层面。深入展开，每段 80-150 字。",
    "reversed": "逆位详解 - 3-5 段话，同样深度。说明逆位时的含义变化、心理阴影面、警示信号。",
    "love": "感情解读 - 对单身者、恋爱中、关系困难三种情况分别给 2-3 句指引。",
    "career": "事业解读 - 对求职/工作中/需要转型三种情况给指引。",
    "wealth": "财运解读 - 收入/支出/投资三种视角。",
    "health": "健康/心灵解读 - 身心健康建议。",
    "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5", "关键词6"],
    "advice": "一句话提醒 - 朋友式的、直击要害的核心建议。",
    "myth": "神话典故/文化原型 - 大阿卡纳关联希腊罗马神话或文化原型。小阿卡纳可写此牌在历史中的象征演变。不少于 100 字。",
    "journey": "愚人之旅 - 如果为大阿卡纳，写此牌在愚人之旅中的位置、与前后牌的关系递进。如果为小阿卡纳，写此牌在所属花色中的位置与递进关系。",
    "colorSymbolism": "颜色象征 - 分析牌面主要的颜色及象征意义。",
    "numerology": "数字学含义 - 此牌的数字（0-10 或宫廷牌）在数字学中的含义。",
    "yesno": "Yes/No 速查 - 占卜时问是非题，此牌正位和逆位分别代表 Yes 还是 No，以及原因。",
    "meditation": "冥想指引 - 凝视此牌时的冥想练习建议，引导观者与牌建立连接。",
    "correspondences": "对应关系 - 与此牌对应的水晶、植物、星期、方位等神秘学对应物。"
  },
  "en": {
    "symbolism": "English: Full scene description of the card imagery...",
    "core": "English: Core meaning...",
    "upright": "English: Upright meaning...",
    "reversed": "English: Reversed meaning...",
    "love": "English: Love reading...",
    "career": "English: Career reading...",
    "wealth": "English: Wealth reading...",
    "health": "English: Health reading...",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"],
    "advice": "English: One-sentence advice...",
    "myth": "English: Mythological associations...",
    "journey": "English: Journey context...",
    "colorSymbolism": "English: Color symbolism...",
    "numerology": "English: Numerological meaning...",
    "yesno": "English: Yes/No divination...",
    "meditation": "English: Meditation guide...",
    "correspondences": "English: Correspondences..."
  },
  "ja": {
    "symbolism": "日本語：カードの詳細な描写...",
    "core": "日本語：コアな意味...",
    "upright": "日本語：正位置の意味...",
    "reversed": "日本語：逆位置の意味...",
    "love": "日本語：恋愛の読み解き...",
    "career": "日本語：仕事の読み解き...",
    "wealth": "日本語：金運の読み解き...",
    "health": "日本語：健康の読み解き...",
    "keywords": ["キーワード1", "キーワード2", "キーワード3", "キーワード4", "キーワード5", "キーワード6"],
    "advice": "日本語：一言アドバイス...",
    "myth": "日本語：神話的関連...",
    "journey": "日本語：旅程の文脈...",
    "colorSymbolism": "日本語：色彩象徴...",
    "numerology": "日本語：数秘術的意味...",
    "yesno": "日本語：Yes/No 占い...",
    "meditation": "日本語：瞑想ガイド...",
    "correspondences": "日本語：対応関係..."
  }
}

重要规则：
1. 内容要丰富、深入、专业，不要敷衍！
2. symbolism(牌面描述) 至少 200-300 字，每个元素都要覆盖
3. upright/reversed 各 3-5 段，每段不同角度
4. 三语都要有实质内容，不要留空
5. kewords 精确 6 个
6. 只输出 JSON，不要注释，不要 markdown 代码块`;

// 读取已生成的数据
function loadExisting() {
  try {
    const raw = fs.readFileSync(OUTPUT, 'utf8');
    // 清理：去掉所有 '];' 闭合符（无论是文件尾还是误插入的中间），使数据回到"未闭合"状态
    const cleaned = raw
      .split('\n')
      .filter((l) => !l.trim().startsWith('];') && !l.trim().startsWith('[') && !l.trim().startsWith(']'))
      .join('\n')
      .replace(/,\s*$/, ''); // 去掉末尾残留逗号
    // 提取已生成的 id 列表
    const ids = [...cleaned.matchAll(/"id"\s*:\s*(\d+)/g)].map((m) => parseInt(m[1]));
    // 保证以换行结尾
    const data = cleaned.endsWith('\n') ? cleaned : cleaned + '\n';
    return { data, done: new Set(ids) };
  } catch {
    return {
      data: '// 自动生成，勿手动修改\nimport type { CardDetails } from \'./card-details\';\n\nexport const CARD_DETAILS: CardDetails[] = [\n',
      done: new Set(),
    };
  }
}

// 调用 B.AI 生成单张牌
async function genOne(cardId, cardName) {
  const prompt = PROMPT_TEMPLATE(cardId, cardName);
  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: '你是一位塔罗研究专家和神秘学学者，Output only valid JSON, no markdown, no comments.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 12000,
    temperature: 0.7,
  });

  // curl 走系统代理更稳定
  const curlCmd = `curl -s --max-time 120 -X POST "${API}" -H "Authorization: Bearer ${BAI_KEY}" -H "Content-Type: application/json" -d ${JSON.stringify(body)}`;
  const output = execSync(curlCmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  const json = JSON.parse(output);
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Empty response for card ${cardId}: ${output.slice(0, 200)}`);
  
  // 尝试解析返回的 JSON（可能包在 markdown 代码块里）
  let clean = content.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/```(?:json)?\n?/g, '').trim();
  }
  const parsed = JSON.parse(clean);
  if (parsed.id !== cardId) {
    console.warn(`  ⚠ id mismatch: expected ${cardId}, got ${parsed.id}. Fixing.`);
    parsed.id = cardId;
  }
  return parsed;
}

async function main() {
  const startArg = parseInt(process.argv[2]);
  const endArg = parseInt(process.argv[3]);

  const { data: existingData, done: doneIds } = loadExisting();
  let data = existingData;

  // 确定要生成的牌范围
  const allCards = NAMES;
  let batch = allCards;
  if (!isNaN(startArg) && !isNaN(endArg)) {
    batch = allCards.filter(c => c.id >= startArg && c.id <= endArg);
  } else {
    batch = allCards.filter(c => !doneIds.has(c.id));
  }

  if (batch.length === 0) {
    console.log('所有牌已生成完毕！');
    // 关闭数组
    if (!data.trim().endsWith('];')) {
      fs.writeFileSync(OUTPUT, data + '];\n', 'utf8');
    }
    console.log(`最终文件：${OUTPUT}`);
    return;
  }

  console.log(`待生成: ${batch.length} 张牌 (id: ${batch.map(c => c.id).join(',')})`);

  for (const card of batch) {
    console.log(`\n正在生成 [${card.id}] ${card.name}...`);
    try {
      const result = await genOne(card.id, card.name);
      // 追加到文件
      const entry = `  ${JSON.stringify(result, null, 2)},\n`;
      data = data + entry;
      fs.writeFileSync(OUTPUT, data, 'utf8');
      console.log(`  ✓ [${card.id}] ${card.name} 完成！`);
    } catch (e) {
      console.error(`  ✗ [${card.id}] ${card.name} 失败:`, e.message);
      // 写 checkpoint
      fs.writeFileSync(CHECKPOINT, JSON.stringify({ failed: card.id, name: card.name, time: new Date().toISOString() }, null, 2), 'utf8');
    }
  }

  // 关闭数组（数据始终处于"未闭合"状态，直接补上闭合符）
  const finalData = data.endsWith('];\n') ? data : data + '];\n';
  fs.writeFileSync(OUTPUT, finalData, 'utf8');
  console.log(`\n生成完毕。已保存到 ${OUTPUT}`);
  console.log(`已完成: ${doneIds.size + batch.filter((c) => !doneIds.has(c.id)).length} / 78 张`);
  try { fs.unlinkSync(CHECKPOINT); } catch { /* ignore */ }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});