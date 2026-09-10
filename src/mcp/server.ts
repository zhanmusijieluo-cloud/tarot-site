import { TarotReadingRequest } from './types';
import { shuffleDraw, SPREADS } from '@/lib/tarot';
import { getCardTraits, CARD_TRAITS } from '@/lib/card-traits';
import { CARD_MYSTIC } from '@/lib/card-mystic';
import { localizedCardName } from '@/lib/card-names';
import { createClient } from '@supabase/supabase-js';

// AI 解读引擎：按优先级依次尝试。B.A.I（qwen3.8-flash，经 api.bankofai.io）额度用尽/报错时自动回退 agnes。
const ENGINES = [
  { name: 'bai', apiKey: process.env.BAI_API_KEY, url: 'https://api.bankofai.io/v1/chat/completions', model: 'qwen3.8-flash' },
  { name: 'agnes', apiKey: process.env.AGNES_API_KEY, url: 'https://apihub.agnes-ai.com/v1/chat/completions', model: 'agnes-2.5-flash' },
].filter((e): e is { name: string; apiKey: string; url: string; model: string } => !!e.apiKey);

// ══════════════════ 共享构建逻辑（非流式与流式共用） ══════════════════

const ELEMENT_EN: Record<string, string> = { '风':'Air','火':'Fire','水':'Water','土':'Earth','未知':'Unknown' };

interface StructuredReading {
  cards: { position: string; traits?: string; summary: string }[];
  elementEnergy: string; links: string; rootCause: string; trend: string; conclusion: string; advice: string;
}

/** 「• 」分点转标准 Markdown 列表行 */
function toListMd(s: string): string {
  return s
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.startsWith('•') ? '- ' + line.replace(/^•\s*/, '') : line))
    .join('\n\n');
}

/**
 * 把整段总结按句子切分为多个段落（每句一段，保证前端逐句提行显示）。
 * 支持中/英/日句末标点；已有换行或列表标记的文本原样保留分点结构。
 */
function toParagraphMd(s: string): string {
  const text = s.trim();
  if (!text) return '';
  // 真正的分点结构（•/-/* 开头的列表行）才保留列表；正文中的零散换行一律抹平后按句切分，
  // 避免模型随手输出的单个换行导致整段不再逐句提行
  if (/^[•*-]\s/m.test(text)) return toListMd(text);
  // 抹平所有换行（含首尾空白），按句末标点切句（保留标点），过滤空段
  const flat = text.replace(/\s*\n+\s*/g, '');
  // 去掉模型照抄 prompt 的字段说明前缀（如「针对问卜者的总结：」），避免和已渲染的标签重复
  const noPrefix = flat.replace(/^(?:针对问卜者的总结|总结|Summary (?:for the Querent|for the querent)|依頼者へのまとめ)[：:\s]*/, '');
  const sentences = noPrefix.split(/(?<=[。！？；.!?;])\s*/).map((x) => x.trim()).filter(Boolean);
  return sentences.join('\n\n');
}

/** 兼容 ```json 包裹 / 前后杂文的宽松 JSON 提取 */
function parseLooseJSON(raw: string): any | null {
  if (!raw) return null;
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function validateStructured(obj: any, n: number): obj is StructuredReading {
  return !!obj &&
    Array.isArray(obj.cards) && obj.cards.length === n &&
    obj.cards.every((c: any) => c && typeof c.position === 'string' && typeof c.summary === 'string') &&
    ['elementEnergy', 'links', 'rootCause', 'trend', 'conclusion', 'advice'].every((k) => typeof obj[k] === 'string' && obj[k].trim());
}

/** 宽松结构化：AI 输出偶有不完整/缺字段时，仍尽力装成可渲染的解读，避免直接暴露原始 JSON */
function normalizeStructured(obj: any, n: number): StructuredReading | null {
  if (!obj || !Array.isArray(obj.cards) || obj.cards.length === 0) return null;
  const cards = obj.cards.slice(0, n).map((c: any) => ({
    position: typeof c?.position === 'string' ? c.position : '',
    traits: typeof c?.traits === 'string' ? c.traits : undefined,
    summary: typeof c?.summary === 'string' ? c.summary : '',
  }));
  while (cards.length < n) cards.push({ position: '', summary: '' });
  const pick = (k: string) => (typeof obj[k] === 'string' ? obj[k] : '');
  return {
    cards,
    elementEnergy: pick('elementEnergy'),
    links: pick('links'),
    rootCause: pick('rootCause'),
    trend: pick('trend'),
    conclusion: pick('conclusion'),
    advice: pick('advice'),
  };
}

/** 宽松兜底：AI 输出无法解析为严格 JSON 时，把原始 JSON 转成干净的 Markdown 段落，避免暴露 position/summary 代码块或结构符 */
function humanizeRaw(raw: string): string {
  let s = (raw || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  if (!s) return s;
  const labels: Record<string, string> = {
    position: '**位置**：', summary: '**摘要**：', cards: '',
    elementEnergy: '**元素能量**：', links: '**牌阵联动**：', rootCause: '**深层根源**：',
    trend: '**趋势推演**：', conclusion: '**综合总结**：', advice: '**落地建议**：',
  };
  // 字段名 + 冒号 + 开引号 → 中文标签（去掉引号冒号）
  s = s.replace(/"(position|summary|cards|elementEnergy|links|rootCause|trend|conclusion|advice)"\s*:\s*"/g, (_, k) => labels[k] ?? '');
  // 去掉结构符：花括号、方括号、尖括号
  s = s.replace(/[\[\]{}<>]/g, '');
  // 值结尾的孤立引号（后跟逗号/结束括号/行尾）去掉
  s = s.replace(/"(?=\s*[,}\]]|$)/g, '');
  // 行首孤立逗号去掉
  s = s.replace(/^[，,]\s*/gm, '');
  // 去转义 + 压缩连续换行
  s = s.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

/** 内容数据库读取结果（存活内容） */
interface DbMeaning {
  name: string;
  traits: string;
  mystic_image: string;
  mystic_items: string[];
  mystic_deep: string;
}

let _supabaseClient: any = null;
/** 惰性创建 Supabase 客户端（用 NEXT_PUBLIC 公钥读取即可，公开读取策略已放行）。无环境变量时返回 null。 */
function getSupabaseClient(): any {
  if (_supabaseClient) return _supabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try { _supabaseClient = createClient(url, key); } catch { _supabaseClient = null; }
  return _supabaseClient;
}

/** 从内容数据库读取指定牌 + 语言的牌意/牌性/象征。读不到（无环境变量/无表/网络错）返回空 map，调用方回退代码库。 */
async function loadDbMeanings(ids: number[], lang: string): Promise<Map<number, DbMeaning>> {
  const map = new Map<number, DbMeaning>();
  const client = getSupabaseClient();
  if (!client || ids.length === 0) return map;
  try {
    const { data, error } = await client
      .from('card_meanings')
      .select('card_id,lang,name,traits,mystic_image,mystic_items,mystic_deep')
      .in('card_id', ids)
      .eq('lang', lang);
    if (error || !data) return map;
    for (const row of data) {
      map.set(row.card_id, {
        name: row.name || '',
        traits: row.traits || '',
        mystic_image: row.mystic_image || '',
        mystic_items: Array.isArray(row.mystic_items) ? row.mystic_items : [],
        mystic_deep: row.mystic_deep || '',
      });
    }
  } catch {
    return map;
  }
  return map;
}

/** 取某张牌的静态牌性文本：优先数据库（存活内容），其次代码库，再回退 AI 生成值 */
function traitsFor(card: any, ctx: ReadingCtx): string {
  const lang = ctx.lang;
  const id = typeof card?.id === 'number' ? card.id : -1;
  const db = id >= 0 ? ctx.dbMeanings.get(id) : undefined;
  const staticTraits = db?.traits || (id >= 0 ? getCardTraits(id)?.[lang] : undefined);
  return staticTraits || (typeof card?.traitsFallback === 'string' ? card.traitsFallback : '');
}

interface ReadingCtx {
  positions: readonly string[];
  lang: 'zh' | 'en' | 'ja';
  n: number;
  prompt: string;
  system: string;
  SECTION_TITLES: Record<string, string>;
  dbMeanings: Map<number, DbMeaning>;
}

/** 构建 cardsContext + 三语 prompt + system 指令（读牌与流式共用） */
async function buildReadingInputs(args: TarotReadingRequest): Promise<ReadingCtx> {
  const positions = args.positions ?? [];
  const lang = (args.lang === 'en' || args.lang === 'ja' ? args.lang : 'zh') as 'zh' | 'en' | 'ja';
  const useEn = lang !== 'zh';
  const n = args.cards.length;
  // 从内容数据库读取本次抽到的牌意/牌性/象征（存活内容），读不到回退代码库
  const ids = args.cards.map((c: any) => (typeof c?.id === 'number' ? c.id : -1)).filter((i: number) => i >= 0);
  const dbMeanings = await loadDbMeanings(ids, lang);

  const cardsContext = args.cards.map((card: any, index: number) => {
    const position = positions[index] || card.position || (useEn ? '(No fixed position)' : '（无固定牌位）');
    const cardId = typeof card.id === 'number' ? card.id : -1;
    // 牌名按语言本地化：ja 用日语名、en 用英文名、zh 用原名（此前 ja 误用英文名导致混杂）
    const cardName = localizedCardName(card, lang);
    const elem = ELEMENT_EN[card.element] || card.element || 'Unknown';
    const rev = card.isReversed;
    const db = dbMeanings.get(cardId);
    const staticTraits = db?.traits || getCardTraits(cardId)?.[lang] || '';
    // 大阿卡纳象征深度解读：优先数据库（存活内容），其次 waite 手稿代码库
    const dbMystic = db && (db.mystic_image || db.mystic_deep)
      ? { image: db.mystic_image, items: db.mystic_items, deep: db.mystic_deep }
      : null;
    const mystic = dbMystic || (cardId >= 0 && cardId < 22 ? CARD_MYSTIC[cardId] : undefined);
    const mysticText = mystic
      ? `\n  象征深度解构（权威资料，解读时请融入画面象征与深层哲理）：画面：${mystic.image}；意象：${mystic.items.join('；')}；深层：${mystic.deep.replace(/-{2,}/g, ' ').replace(/\s+/g, ' ')}`
      : '';
    if (useEn) {
      return `- Card ${index + 1} "${cardName}" (${rev ? 'Reversed' : 'Upright'}, Element: ${elem}) —— Position【${position}】${staticTraits ? '\n  Known card nature (authoritative, cite freely): ' + staticTraits.replace(/\n+/g, ' ') : ''}${mysticText}`;
    } else {
      const zhElem = card.element || '未知';
      return `- 第${index + 1}张牌「${cardName}」(${rev ? '逆位' : '正位'}，元素：${zhElem}) —— 牌位【${position}】：${card.upright}${staticTraits ? '\n  该牌牌性（权威资料，可直接引用）：' + staticTraits.replace(/\n+/g, ' ') : ''}${mysticText}`;
    }
  }).join('\n');

  const LANG_INSTRUCTION =
    lang === 'en'
      ? '**OUTPUT LANGUAGE (CRITICAL): Write EVERY field of the JSON in English. All card readings, analyses and advice must be entirely in English.**'
      : lang === 'ja'
        ? '**出力言語（最重要）：JSON の全フィールドを日本語で書いてください。カード解釈・分析・アドバイスはすべて日本語で出力すること。**'
        : '**输出语言（重要）：所有字段必须使用简体中文书写。**';
  const SECTION_TITLES: Record<string, string> =
    lang === 'en'
      ? {
          s1: 'Part 1: Card-by-Card Breakdown',
          posLabel: 'Position',
          traitsLabel: 'Card Nature & Traits',
          summaryLabel: 'Summary for the Querent',
          s2: 'Part 2: Elemental Energy & Orientation',
          s3: 'Part 3: Interplay Between Cards',
          s4: 'Part 4: Deep Root Cause Analysis',
          s5: 'Part 5: Trend Forecast',
          s6: 'Part 6: Overall Conclusion',
          s7: 'Part 7: Actionable Advice',
        }
      : lang === 'ja'
        ? {
            s1: 'セクション1：カード別解読',
            posLabel: 'ポジション',
            traitsLabel: 'カードの性質',
            summaryLabel: '依頼者へのまとめ',
            s2: 'セクション2：元素エネルギーと方向性',
            s3: 'セクション3：カード間の連動関係',
            s4: 'セクション4：現状の深層原因分析',
            s5: 'セクション5：情勢の推移予測',
            s6: 'セクション6：総合まとめ',
            s7: 'セクション7：行動アドバイス',
          }
        : {
            s1: '板块1：基础卡牌拆解',
            posLabel: '牌位',
            traitsLabel: '牌性特质',
            summaryLabel: '针对问卜者的总结',
            s2: '板块2：整体元素与朝向能量',
            s3: '板块3：牌阵联动关系',
            s4: '板块4：现状深层根源分析',
            s5: '板块5：局势发展趋势推演',
            s6: '板块6：综合全局总结',
            s7: '板块7：落地行动建议',
          };

  const spreadDisplay = typeof args.spreadName === 'string'
    ? args.spreadName
    : (args.spreadName as any)?.name || (lang === 'en' ? 'Single Card' : lang === 'ja' ? '単一カード' : '单牌');

  const prompt = lang === 'en'
    ? `You are a professional senior tarot reader, well-versed in the Rider-Waite and Thoth tarot systems.

**Reading information:**
- Question: ${args.question || 'Not specified'}
- Querent background: ${args.background || '(Not provided)'}
- Spread: ${spreadDisplay}
- Drawn cards (each card is labeled with its position — interpret strictly according to this correspondence, do not mix them up):
${cardsContext}

Based on the above, provide a complete in-depth reading covering ALL seven parts in one pass. **You must output ONLY a single valid JSON object, no text other than JSON, no Markdown code fences**:
{
  "cards": [
    {
      "position": "Position explanation: this card sits at 【position name】, addressing the aspect of the client's question about XX, 2-3 sentences",
      "summary": "Summary for the querent: combine the client's question and background, explain what this card means in the client's specific situation, 3-4 sentences"
    }
  ],
  "elementEnergy": "Overall elemental energy and orientation: tally the distribution of the four elements and their meaning (e.g. much Fire suggests action-prone and conflict-prone), upright/reversed ratio and how smoothly the energy flows, how the elements generate/overcome each other and affect the situation",
  "links": "Interplay between cards: where energies support or clash, and the logical links between positions",
  "rootCause": "Deep root cause analysis: the internal reasons behind the current situation, hidden emotions, past influences",
  "trend": "Trend forecast: short-term and medium/long-term direction, distinguishing controllable factors from uncontrollable external ones",
  "conclusion": "Overall conclusion: overall fortune, core contradiction, core opportunity",
  "advice": "Actionable advice: what to do short-term and how to adjust long-term. MUST be listed as separate points, each starting with 「• 」 and separated by \\n"
}

Hard requirements:
0. ${LANG_INSTRUCTION}
0.5. Each drawn card comes with "Known card nature" (authoritative card traits: element, numerology, planetary correspondence, upright/reversed difference). Treat it as established fact — cite it when analyzing links, root causes and trends, do NOT re-derive or contradict it. Do not output the card nature itself in any JSON field (it is added to the final report separately).
1. The "cards" array must have exactly ${n} elements (one-to-one with the drawn cards), the Nth element interprets the Nth card; the other six fields must all be non-empty strings;
2. Every field value must be a string; when a field contains multiple points, each point must start with 「• 」 and be separated by \\n;
3. When you reference a card position in your writing, TRANSLATE the position name into English (e.g. 「过去」→ "Past", 「现在」→ "Present") instead of quoting it verbatim;
4. Bold the concrete signal details themselves (**specific manifestations/numbers/times/behaviors/signs**, not generic labels), 1-2 in each card summary, 1-3 in other fields;
5. The reading must show insight, engage with card details and the querent's specific question, no generic filler; do not manufacture anxiety, emphasize that the person's own choices can change the direction.
6. **JSON escaping (CRITICAL): Within every string value, newlines must be written as literal \n and double quotes as \"; never output a raw newline or an unescaped " inside a JSON string, or the JSON becomes invalid and the reading fails.**`
    : lang === 'ja'
      ? `あなたはプロのシニアタロット読解師で、ライダー・ウェイトとトートのタロット体系に精通しています。

**占い情報：**
- 質問：${args.question || '指定なし'}
- 相談者の背景：${args.background || '（提供なし）'}
- スプレッド：${spreadDisplay}
- 引いたカード（各カードにポジションが明記されています。この対応関係に厳密に従って解釈し、混同しないこと）：
${cardsContext}

上記の情報に基づき、全7セクションを一度にまとめて深く解釈してください。**有効な JSON オブジェクトのみを出力すること。JSON 以外の文字・Markdown のコードブロックは禁止**：
{
  "cards": [
    {
      "position": "ポジション説明：このカードは【ポジション名】に位置し、相談者の質問のうちXXの側面に答えるものです、2〜3文",
      "summary": "相談者へのまとめ：相談者の質問と背景を踏まえ、このカードが相談者の具体的な問題において意味することを説明、3〜4文"
    }
  ],
  "elementEnergy": "全体の元素エネルギーと方向性：風火水土の分布とその意味（例：火が多いと行動的で衝突しやすい）、正逆の割合とエネルギーの流れの良さ、元素の相生相剋が状況に与える影響",
  "links": "カード間の連動：カード同士のエネルギーの相生・相剋、ポジション間の論理的関連",
  "rootCause": "現状の深層原因分析：今の状況が生まれた内的理由、隠れた感情、過去の影響",
  "trend": "情勢の推移予測：短期・中期・長期の行方、コントロール可能な要素と不可避な外部要因の区別",
  "conclusion": "総合まとめ：全体の吉凶、核心的な矛盾、核心的なチャンス",
  "advice": "実行可能なアドバイス：短期的にどうするか、長期的にどう調整するか。必ず箇条書きにし、各項目を「• 」で始め、\\n で改行して区切ること"
}

必須要件：
0. ${LANG_INSTRUCTION}
0.5. 各カードには「該当カードの性質」（権威ある資料：元素・数秘・惑星対応・正逆位の違い）が付与されています。これを既知の事実として扱い、連動・深層原因・趨勢の分析で自由に引用すること。再導出したり矛盾させたりしないこと。カードの性質そのものは JSON のどのフィールドにも出力しないこと（最終レポートには別途反映されます）。
1. "cards" 配列の長さは ${n} ちょうど（引いたカードと一対一対応）、N番目の要素はN番目のカードを解釈すること。他の6つのフィールドはすべて空でない文字列であること；
2. 各フィールドの値は文字列であること。フィールド内に複数の要点がある場合は、各要点を「• 」で始め、\\n で改行して区切ること；
3. カードのポジションを文中で引用する際は、日本語に翻訳して書くこと（例：「过去」→「過去」、「现在」→「現在」）。そのまま引用しないこと；
4. 具体的なシグナルそのものを太字にする（**具体的な兆候・数字・時間・行動・サイン**、抽象的なラベルではなく）、各カードのsummaryに1〜2箇所、他のフィールドに1〜3箇所；
5. 洞察のある深い解釈を心がけ、カードの細部と相談者の具体的な質問に結びつけること。紋切り型の空論は禁止。不安を煽らず、人の主体的な選択で流れは変わると強調すること。
6. **JSONエスケープ（重要）**：すべての文字列値内の改行はリテラル \n、引用符は \" と書くこと。文字列値内に実際の改行やエスケープされていない引用符を出力しないこと。JSONが無効になり、解釈が失敗します。`
      : `你是一位专业资深塔罗解读师，精通韦特塔罗、透特塔罗体系。

**占卜信息：**
- 问题：${args.question || '未指定'}
- 问卜者背景：${args.background || '（未提供）'}
- 牌阵：${spreadDisplay}
- 抽牌结果（每张牌已标注其所在牌位，必须严格按此对应关系解读，不得混淆）：
${cardsContext}

请基于以上信息做完整深度解读，一次性输出全部七大板块。**必须只输出一个合法的 JSON 对象，禁止输出 JSON 以外的任何文字，禁止用 Markdown 代码块包裹**：
{
  "cards": [
    {
      "position": "牌位说明：这张牌位于【某牌位】，回答的是客户问题中关于XX的层面，2-3句",
      "summary": "针对问卜者的总结：结合客户所问的问题与背景，说明这张牌在客户的具体问题中表达的意思，3-4句"
    }
  ],
  "elementEnergy": "整体元素与朝向能量：统计风火水土四元素分布及其含义（如火多主行动易冲突）、正逆位比例与能量顺畅度、元素相生相克对局势的影响",
  "links": "牌阵联动关系：牌与牌之间能量相生/相冲、位置之间的逻辑关联",
  "rootCause": "现状深层根源分析：当下局面产生的内在原因、隐藏情绪、过往影响",
  "trend": "局势发展趋势推演：短期与中长期走向，区分可控因素与不可控外部因素",
  "conclusion": "综合全局总结：整体吉凶、核心矛盾、核心机遇",
  "advice": "落地行动建议：短期怎么做、长期调整方向。必须分条列出，每条以「• 」开头、用\\n换行分隔"
}

硬性要求：
0. ${LANG_INSTRUCTION}
0.5. 每张牌附有「该牌牌性」（权威资料：元素、灵数、行星星座对应、正逆位差异）。将其视为既定事实，在联动、深层原因、趋势分析中直接引用，不要重新推导，也不要与之矛盾。牌性本身不要输出到 JSON 的任何字段中（最终报告会单独拼入）。
1. "cards" 数组长度必须等于 ${n}（与抽牌结果一一对应），第 N 个元素解读第 N 张牌；其余六个字段的值都必须是非空字符串；
2. 每个字段的值必须是字符串；字段内部需要分点时，每一点必须以「• 」开头并用 \\n 分隔换行；
3. 关键语句加粗：把**具体的信号内容本身**用加粗标出（具体表现/数字/时间/行为/征兆，不是概括性标签），每张牌 summary 1-2 处，其余字段 1-3 处；
4. 解读要有洞察层次，结合牌面细节与问卜者的具体问题展开，禁止空泛套话；不制造焦虑，强调人的主观选择会改变走向。
5. **JSON 转义（关键）**：所有字符串值内的换行必须写成字面 \n、双引号写成 \"；禁止在字符串值内输出真实的换行符或未转义的双引号，否则 JSON 无效并导致解读失败。`;

  const system =
    lang === 'en'
      ? 'You are a professional tarot reader. You must output ONLY valid JSON, no other text. Be concise and direct; skip lengthy deliberation. CRITICAL: Write ALL content in English — card readings, analysis and advice must be entirely in English. Never use Chinese or Japanese in your output.'
      : lang === 'ja'
        ? 'あなたはプロのタロット読解師です。有効な JSON のみを出力してください。簡潔に、無駄な長考をせず直接答えること。重要：すべての内容を日本語で出力すること。中国語や英語は使用しないこと。'
        : '你是一位专业塔罗解读师。你必须只输出合法 JSON，不输出任何其他文字。所有解读内容必须使用简体中文书写。';

  return { positions, lang, n, prompt, system, SECTION_TITLES, dbMeanings };
}

/** 结构化结果 → 固定模板 Markdown（格式由代码保证，标题随站点语言切换） */
/** 最终规范版式：骨架锚点不进最终全文（前端已实时渲染过卡面） */
function assembleNarrative(
  structured: StructuredReading,
  cards: any[],
  ctx: ReadingCtx
): string {
  const { positions, lang, SECTION_TITLES: T } = ctx;
  const sections: string[] = [];
  sections.push(`## ${T.s1}`);
  structured.cards.forEach((c, i) => {
    const card = cards[i];
    const positionLabel = positions[i] || '—';
    const reversedLabel = lang === 'en' ? (card.isReversed ? 'Reversed' : 'Upright') : lang === 'ja' ? (card.isReversed ? '逆位置' : '正位置') : (card.isReversed ? '逆位' : '正位');
    const displayName = localizedCardName(card, lang);
    sections.push(`### ${i + 1}. ${displayName}（${reversedLabel}）`);
    sections.push(`**${T.posLabel}**：${positionLabel}\n`);
    sections.push(c.position.trim() + '\n');
    sections.push(`#### ${T.traitsLabel}\n\n`);
    sections.push(toListMd(traitsFor(card, ctx) || c.traits || '') + '\n');
    sections.push(`#### ${T.summaryLabel}\n\n`);
    sections.push(toParagraphMd(c.summary.trim()));
    if (i < structured.cards.length - 1) sections.push('\n---\n');
  });
  const sectionMeta: [string, string][] = [
    [T.s2, structured.elementEnergy],
    [T.s3, structured.links],
    [T.s4, structured.rootCause],
    [T.s5, structured.trend],
    [T.s6, structured.conclusion],
    [T.s7, structured.advice],
  ];
  for (const [title, body] of sectionMeta) {
    sections.push(`\n## ${title}\n`);
    sections.push(toListMd(body));
  }
  return sections.join('\n\n');
}

/** 上游 OpenAI 风格 SSE → 正文增量异步迭代 */
async function* upstreamContentDeltas(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const j = JSON.parse(data);
        const d = j?.choices?.[0]?.delta;
        if (typeof d?.content === 'string' && d.content) yield d.content;
      } catch { /* 忽略心跳/残块 */ }
    }
  }
}

/**
 * 增量 Markdown 提取器：随原始文本累积，从已完成的 JSON 字符串字段中
 * 实时提取内容并按最终版式拼成 Markdown 增量下发。
 * 依赖模型按 schema 顺序输出（prompt 已强约束），最终仍以完整校验后的
 * 规范全文为准（done 事件覆盖前端显示）。
 */
function createIncrementalEmitter(ctx: ReadingCtx, cards: any[]) {
  const { SECTION_TITLES: T, positions, n } = ctx;
  const state = { idx: 0, card: -1, phase: 'wait-cards' as 'wait-cards' | 'fields' | 'tail', queue: [] as string[] };
  const TAIL_KEYS = ['elementEnergy', 'links', 'rootCause', 'trend', 'conclusion', 'advice'];
  const TAIL_TITLE: Record<string, string> = { elementEnergy: T.s2, links: T.s3, rootCause: T.s4, trend: T.s5, conclusion: T.s6, advice: T.s7 };
  const reversedLabelOf = (card: any) =>
    ctx.lang === 'en' ? (card.isReversed ? 'Reversed' : 'Upright')
      : ctx.lang === 'ja' ? (card.isReversed ? '逆位置' : '正位置')
      : (card.isReversed ? '逆位' : '正位');

  /** 从 from 开始找 `"key":"`，返回字符串内容起始下标 */
  const findStringStart = (raw: string, from: number, key: string): number => {
    const re = new RegExp(`"${key}"\\s*:\\s*"`, 'g');
    re.lastIndex = from;
    const m = re.exec(raw);
    return m ? m.index + m[0].length : -1;
  };
  /** 扫描到未转义的收尾引号 */
  const findStringEnd = (raw: string, start: number): number => {
    let i = start;
    while (i < raw.length) {
      const c = raw[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '"') return i;
      i++;
    }
    return -1;
  };
  const decode = (v: string): string => { try { return JSON.parse('"' + v.replace(/"/g, '\\"') + '"'); } catch { return v; } };
  /** 已输出过卡头/牌性的卡（骨架先行后 feed 不再重复输出） */
  const emittedHeaders = new Set<number>();
  /**
   * 单卡骨架段（纯文字，不含图片!）：
   * 图片由前端按 isReversed 旋转渲染——Markdown img 无法套 CSS transform，
   * 所以骨架只发 HTML 注释锚点，前端 strip 后自行绘制卡面组件。
   */
  const cardSkeleton = (i: number, withDivider: boolean): string => {
    const card = cards[i];
    const name = localizedCardName(card, ctx.lang);
    const parts: string[] = [];
    if (withDivider) parts.push('---\n\n');
    parts.push(`<!--card:${card.id}:${card.isReversed ? 1 : 0}-->`);
    parts.push(`### ${i + 1}. ${name}（${reversedLabelOf(card)}）`);
    parts.push(`**${T.posLabel}**：${positions[i] || '—'}\n`);
    parts.push(`#### ${T.traitsLabel}\n\n` + toListMd(traitsFor(card, ctx) || '') + '\n');
    return parts.join('\n');
  };

  return {
    /** 骨架先行：请求 AI 前即可推出的完整框架（板块1 标题 + 各卡完整段），图片/牌性全部来自数据库，零 AI 依赖 */
    skeleton(): string {
      const parts: string[] = [`## ${T.s1}\n\n`];
      for (let i = 0; i < n; i++) {
        parts.push(cardSkeleton(i, i > 0) + '\n');
        emittedHeaders.add(i);
      }
      return parts.join('').replace(/\n{3,}/g, '\n\n');
    },
    /** 重试前重置解析状态并重发全骨架（前端收到 retry 会清空旧文本） */
    resetForRetry(): string {
      state.idx = 0;
      state.card = -1;
      state.phase = 'wait-cards';
      state.queue = [];
      emittedHeaders.clear();
      return this.skeleton();
    },
    /** 传入累积原文，返回新增可显示的 Markdown 文本（可能为空串） */
    feed(raw: string): string {
      const out: string[] = [];
      let progressed = true;
      while (progressed) {
        progressed = false;
        if (state.phase === 'wait-cards') {
          const re = /"cards"\s*:\s*\[\s*\{/g;
          re.lastIndex = state.idx;
          const m = re.exec(raw);
          if (!m) break;
          state.idx = m.index + m[0].length;
          state.card = 0;
          state.phase = 'fields';
          state.queue = ['position', 'summary'];
          // 骨架已输出过卡头+牌性：feed 只推 AI 新写的 position 字段内容
          if (!emittedHeaders.has(0)) {
            out.push(cardSkeleton(0, false));
            emittedHeaders.add(0);
          }
          progressed = true;
        } else if (state.queue.length === 0) {
          // 当前卡完成 / 卡组结束 → 推进
          if (state.phase === 'fields') {
            state.card++;
            if (state.card < n) {
              state.queue = ['position', 'summary'];
              if (!emittedHeaders.has(state.card)) {
                out.push('\n\n' + cardSkeleton(state.card, true));
                emittedHeaders.add(state.card);
              }
            } else {
              state.phase = 'tail';
              state.queue = [...TAIL_KEYS];
            }
            progressed = true;
          } else break; // tail 全部完成
        } else {
          const key = state.queue[0];
          const start = findStringStart(raw, state.idx, key);
          if (start < 0) break;
          const end = findStringEnd(raw, start);
          if (end < 0) break; // 字段还没写完
          const value = decode(raw.slice(start, end));
          state.idx = end + 1;
          state.queue.shift();
          if (state.phase === 'fields') {
            if (key === 'position') out.push(value.trim() + '\n');
            else out.push(`#### ${T.summaryLabel}\n\n` + toParagraphMd(value));
          } else {
            out.push(`\n## ${TAIL_TITLE[key]}\n` + toListMd(value));
          }
          progressed = true;
        }
      }
      return out.length ? out.join('\n\n').replace(/\n{3,}/g, '\n\n') : '';
    },
  };
}

// ══════════════════ 流式事件类型 ══════════════════

export type TarotStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'retry' }
  | { type: 'done'; narrative: string }
  | { type: 'fallback'; text: string }
  | { type: 'error'; message: string };

/**
 * MCP 服务端 - 塔罗解读服务
 */
export class TarotMcpServer {
  /**
   * 处理 MCP 消息
   */
  async handleMessage(message: any): Promise<any> {
    const { method, params } = message;

    switch (method) {
      case 'tools/call':
        return this.handleToolCall(params);
      case 'tools/list':
        return { result: this.getTools() };
      default:
        return { error: { code: -32601, message: `Method not found: ${method}` } };
    }
  }

  /**
   * 处理工具调用
   */
  private async handleToolCall(params: any): Promise<any> {
    const { name, arguments: args } = params;

    switch (name) {
      case 'tarot.reading':
        return this.handleTarotReading(args);
      case 'tarot.draw':
        return this.handleDrawCards(args);
      case 'tarot.spreads':
        return this.handleGetSpreads();
      case 'tarot.daily_fortune':
        return this.handleDailyFortune(args);
      default:
        return { error: { code: -32601, message: `Unknown tool: ${name}` } };
    }
  }

  /** 单次 AI 调用（stream 决定是否开上游 SSE 流式）；按引擎优先级依次尝试，失败自动回退下一个 */
  private async callAI(system: string, prompt: string, stream: boolean): Promise<Response> {
    let lastError = '';
    for (const engine of ENGINES) {
      try {
        const response = await fetch(engine.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${engine.apiKey}`,
          },
          body: JSON.stringify({
            model: engine.model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            ...(stream ? { stream: true } : {}),
            // 推理模型：reasoning 与正文共享 max_tokens 配额。
            // 质量优先：给足配额让模型充分思考与展开，避免深度被压缩。
            max_tokens: 10000,
            // 思考降档：塔罗解读重文采与结构，深度思考链收益低、耗时长。
            // qwen3.8 实测：thinking on 约 11~37s，off 后 4.2s（教育测试同任务）。
            // aggregator 兼容两种参数：chat_template_kwargs 关 thinking，reasoning_effort 兜底非 qwen 模型
            chat_template_kwargs: { enable_thinking: false },
            reasoning_effort: 'low',
          }),
          // 单次 AI 调用上限 250s：日语大牌阵实测 138s，需留足余量；Vercel Hobby 函数上限 300s
          signal: AbortSignal.timeout(250000),
        });
        if (response.ok) return response;
        const errBody = await response.json().catch(() => null);
        lastError = errBody?.error?.message || `HTTP ${response.status}`;
        console.warn(`[AI] 引擎 ${engine.model} 失败（${lastError}），回退下一个引擎`);
      } catch (e: any) {
        lastError = e?.message || '网络错误';
        console.warn(`[AI] 引擎 ${engine.model} 异常（${lastError}），回退下一个引擎`);
      }
    }
    throw new Error('所有 AI 引擎均失败' + (lastError ? '：' + lastError : '（未配置任何引擎）'));
  }

  /**
   * 流式塔罗解读：SSE 事件生成器
   * - delta：增量 Markdown（已按最终版式拼装）
   * - retry：首次 JSON 校验失败，前端应清空已显示文本后继续接收
   * - done：完整规范全文（前端以此覆盖显示）
   * - fallback：两次均失败时的纯文本兜底
   * - error：不可恢复错误
   */
  async *streamTarotReading(args: TarotReadingRequest): AsyncGenerator<TarotStreamEvent> {
    if (!args.cards || args.cards.length === 0) {
      yield { type: 'error', message: '需要至少一张牌' };
      return;
    }
    const startedAt = Date.now();
    try {
      const ctx = await buildReadingInputs(args);
      const emitter = createIncrementalEmitter(ctx, args.cards);
      let lastRaw = '';
      /** 骨架先行标记：AI 首个 delta 到达前是否已推送过预拼装框架 */
      let skeletonSent = false;

      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
          // 重试预算保护：总耗时接近函数上限时不再重试
          if (Date.now() - startedAt > 230000) break;
          yield { type: 'retry' };
          // 重试时重置解析器并重发全骨架（前端收到 retry 会清空旧文本）
          skeletonSent = true;
          const sk = emitter.resetForRetry();
          if (sk) yield { type: 'delta', text: sk };
        } else {
          // 骨架先行：立刻推送板块1框架（标题+卡头+图片+牌性），用户0等待看到所有牌面
          // feed 内部用 emittedHeaders 保证不重复输出骨架已有的卡头/牌性
          skeletonSent = true;
          const sk = emitter.skeleton();
          if (sk) yield { type: 'delta', text: sk };
        }
        const response = await this.callAI(ctx.system, ctx.prompt, true);
        if (!response.ok || !response.body) {
          const msg = await response.json().catch(() => null);
          yield { type: 'error', message: 'AI 解读失败：' + (msg?.error?.message || '服务暂不可用') };
          return;
        }
        let raw = '';
        for await (const delta of upstreamContentDeltas(response.body)) {
          raw += delta;
          let md = emitter.feed(raw);
          // 骨架先行模式：feed 输出的卡头/牌性已由骨架推送，这里直接下发 AI 增量（无需去重拼接）
          if (md) yield { type: 'delta', text: md };
        }
        lastRaw = raw;
        const parsed = parseLooseJSON(raw);
        if (parsed && validateStructured(parsed, ctx.n)) {
          yield { type: 'done', narrative: assembleNarrative(parsed, args.cards, ctx) };
          return;
        }
      }

      // 两次均失败：有原文则纯文本兜底，否则报错
      if (lastRaw.trim()) yield { type: 'fallback', text: lastRaw.trim() };
      else yield { type: 'error', message: 'AI 解读失败：未获取到有效响应' };
    } catch (error: any) {
      yield { type: 'error', message: error?.message || 'AI 解读失败' };
    }
  }

  /**
   * 塔罗解读（非流式）
   */
  private async handleTarotReading(args: TarotReadingRequest): Promise<any> {
    if (!args.cards || args.cards.length === 0) {
      return { error: { code: -32602, message: '需要至少一张牌' } };
    }

    try {
      const ctx = await buildReadingInputs(args);

      // 串行重试：最多尝试 2 次，均失败则降级为纯文本兜底
      let structured: StructuredReading | null = null;
      let lastRaw = '';
      for (let attempt = 0; attempt < 2 && !structured; attempt++) {
        const response = await this.callAI(ctx.system, ctx.prompt, false);
        const data = await response.json();
        if (!response.ok) return { error: { code: -32001, message: 'AI 解读失败：' + (data?.error?.message || '服务暂不可用') } };
        const msg = data?.choices?.[0]?.message;
        if (!msg) continue;
        lastRaw = (msg.content && msg.content.trim()) || msg.reasoning_content || '';
        const parsed = parseLooseJSON(lastRaw);
        if (parsed) {
          const norm = normalizeStructured(parsed, ctx.n);
          if (norm) structured = norm;
        }
      }
      if (!structured) {
        if (lastRaw.trim()) return { result: { content: humanizeRaw(lastRaw), cards: args.cards, question: args.question, spreadName: args.spreadName } };
        return { error: { code: -32001, message: 'AI 解读失败：未获取到有效响应' } };
      }

      return {
        result: {
          content: assembleNarrative(structured, args.cards, ctx),
          cards: args.cards,
          question: args.question,
          spreadName: args.spreadName
        }
      };
    } catch (error: any) {
      return { error: { code: -32001, message: error.message } };
    }
  }

  /**
   * 随机抽牌
   */
  private handleDrawCards(args: { count?: number; spread?: string }): any {
    const count = args.count || 1;
    const cards = shuffleDraw(count);
    return { result: { cards } };
  }

  /**
   * 获取牌阵列表
   */
  private handleGetSpreads(): any {
    const spreads = Object.entries(SPREADS).map(([key, value]) => ({
      id: key,
      name: value.name,
      positions: value.positions,
      count: value.count
    }));
    return { result: { spreads } };
  }

  /**
   * 每日运势
   */
  private handleDailyFortune(args: { zodiac?: string }): any {
    // 这里可以调用每日运势逻辑
    return { result: { message: '每日运势功能待实现' } };
  }

  /**
   * 获取可用工具列表
   */
  private getTools(): any {
    return {
      tools: [
        {
          name: 'tarot.reading',
          description: '塔罗牌深度解读（结构化七大板块）'
        },
        {
          name: 'tarot.draw',
          description: '随机抽牌'
        },
        {
          name: 'tarot.spreads',
          description: '获取牌阵列表'
        },
        {
          name: 'tarot.daily_fortune',
          description: '每日运势'
        }
      ]
    };
  }
}

// 全局实例
const server = new TarotMcpServer();

export async function handleMcpMessage(message: any): Promise<any> {
  return server.handleMessage(message);
}
