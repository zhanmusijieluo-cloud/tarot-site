import { NextRequest, NextResponse } from 'next/server';
import { localizedCardName, CARD_JA_NAMES } from '@/lib/card-names';

// 日语等长输出解读较慢：允许函数运行到 Vercel Hobby 上限 300s
export const maxDuration = 300;

// AI 追问引擎：按优先级依次尝试。B.AI（免费 deepseek-v4-flash 视觉版）额度用尽/报错时自动回退 agnes。
const ENGINES = [
  { name: 'bai', apiKey: process.env.BAI_API_KEY, url: 'https://api.b.ai/v1/chat/completions', model: 'deepseek-v4-flash-vision-exp' },
  { name: 'agnes', apiKey: process.env.AGNES_API_KEY, url: 'https://apihub.agnes-ai.com/v1/chat/completions', model: 'agnes-2.5-flash' },
].filter((e): e is { name: string; apiKey: string; url: string; model: string } => !!e.apiKey);

interface FollowUpCard {
  name: string;
  isReversed: boolean;
  upright: string;
}

type Lang = 'zh' | 'en' | 'ja';
/** 追问语气模式：warm 温柔陪伴 / sassy 毒舌吐槽 / tsundere 嘴硬心软傲娇 */
type ChatMode = 'warm' | 'sassy' | 'tsundere';

/** 牌名按语言显示：zh 原名 / ja 日语名 / en 韦特英文名 */
function cardName(card: { name: string; id?: number }, lang: Lang): string {
  return localizedCardName(card, lang);
}

// 日语回答归一化：模型引用牌面时常把「（逆位置）/（正位置）」缩略成单字「逆/正」
// （如「カップの9逆」「ワンドのナイト正」），在返回前还原为完整日语写法。
const JA_CARD_NAME_RE = (() => {
  const names = Object.values(CARD_JA_NAMES)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length); // 长名优先，避免「カップの2」先于「カップのエース」误匹配
  return new RegExp(`(${names.join('|')})(逆|正)(?!位置|の)`, 'g');
})();

function normalizeJaCardDirection(text: string): string {
  return text.replace(JA_CARD_NAME_RE, (_m, name: string, dir: string) => {
    return `${name}（${dir === '逆' ? '逆位置' : '正位置'}）`;
  });
}

/**
 * AI 塔罗追问 API
 * 在已有牌阵解读的基础上，客户围绕原问题继续追问，AI 结合牌面持续作答。
 * 整个 prompt 按站点语言生成（此前中文 prompt + 单行语言指令容易导致回答夹带中文）。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cards, question, spreadName, positions, interpretation, history, followUp, lang, mode } = body as {
      cards?: (FollowUpCard & { id?: number })[];
      question?: string;
      spreadName?: string;
      positions?: string[];
      interpretation?: string;
      history?: { role: 'user' | 'assistant'; content: string }[];
      followUp?: string;
      lang?: string;
      mode?: string;
    };

    if (!followUp || !followUp.trim()) {
      return NextResponse.json({ error: '追问内容不能为空' }, { status: 400 });
    }
    if (!cards || cards.length === 0) {
      return NextResponse.json({ error: '缺少牌面信息' }, { status: 500 });
    }
    if (ENGINES.length === 0) {
      return NextResponse.json({ error: '解读服务未配置' }, { status: 500 });
    }
    const langCode: Lang = lang === 'en' || lang === 'ja' ? lang : 'zh';
    // 语气模式：默认温柔陪伴；非法值回退 warm
    const modeCode: ChatMode =
      mode === 'sassy' || mode === 'tsundere' ? mode : 'warm';

    // ═══ 三语词汇表 ═══
    const L =
      langCode === 'en'
        ? {
            cardN: (i: number) => `Card ${i + 1}`,
            reversed: 'Reversed',
            upright: 'Upright',
            querent: 'Querent',
            reader: 'Tarot Reader',
            noSpread: 'Single Card',
            noQuestion: 'Not specified',
            extraLabel: (n: number) => `[The querent has drawn ${n} follow-up card(s) beyond the original spread (no fixed positions): {LIST}. These were drawn for extended questions around the original reading. Answer with ALL cards in view.]`,
            thisRound: (q: string) => ` This round, three new cards were drawn specifically for "${q}".`,
          }
        : langCode === 'ja'
          ? {
              cardN: (i: number) => `${i + 1}枚目`,
              reversed: '逆位置',
              upright: '正位置',
              querent: '相談者',
              reader: 'タロット読者',
              noSpread: '単一カード',
              noQuestion: '指定なし',
              extraLabel: (n: number) => `【相談者は元のスプレッド之外に計${n}枚の追加カードを引きました（固定ポジションなし）：{LIST}。これらは元の質問に関する延伸の質問のために引いたものです。すべてのカードを踏まえて回答してください。】`,
              thisRound: (q: string) => ` 今回、「${q}」のために新たに3枚を引きました。`,
            }
          : {
              cardN: (i: number) => `第${i + 1}张牌`,
              reversed: '逆位',
              upright: '正位',
              querent: '问卜者',
              reader: '塔罗师',
              noSpread: '单牌',
              noQuestion: '未指定',
              extraLabel: (n: number) => `【问卜者在原牌阵之外先后共抽取了 ${n} 张追问牌（无固定牌位）：{LIST}。这些是围绕原问题的延伸询问所抽的牌。请结合全部牌面回答。】`,
              thisRound: (q: string) => ` 本轮针对「${q}」新抽了三张。`,
            };

    // 雷诺曼无逆位: 牌组里出现 lenormand 标记时不标注正/逆
    const isLn = cards?.some((c: any) => c.arcana === 'lenormand');
    const cardsContext = (cards || [])
      .map((card, i) => {
        const position = positions?.[i] ? `（${positions[i]}）` : '';
        const name = cardName(card, langCode);
        const rev = isLn ? '' : (card.isReversed ? L.reversed : L.upright);
        if (langCode === 'zh') {
          return `- ${L.cardN(i)}「${name}」${position}${rev ? ' ' + rev : ''}：${card.upright}`;
        }
        return `- ${L.cardN(i)} "${name}"${rev ? ` (${rev})` : ''}${position}: ${card.upright}`;
      })
      .join('\n');

    const historyContext = (history || [])
      .slice(-8)
      .map((m) => `${m.role === 'user' ? L.querent : L.reader}: ${m.content}`)
      .join('\n');

    let followUpText = followUp.trim();
    // 仅当是旧版中文格式前缀（含「共抽取了 N 张」）时才重写为当前语言；
    // 前端现已按站点语言拼好 en/ja/zh 前缀（牌名已本地化），原样透传即可
    if (/共抽取了/.test(followUpText)) {
      // 前端拼的中文前缀（含追问牌说明）：替换为当前语言的等价说明
      const m = followUpText.match(/共抽取了\s*(\d+)\s*张/);
      const nExtra = m ? parseInt(m[1], 10) : 0;
      const listMatch = followUpText.match(/：(.+?)。/);
      const list = listMatch ? listMatch[1] : '';
      const thisRound = followUpText.match(/本轮针对「(.+?)」新抽了三张/);
      const bodyOnly = followUpText.replace(/^【[^】]*】\s*/, '');
      followUpText =
        L.extraLabel(nExtra).replace('{LIST}', list) +
        (thisRound ? L.thisRound(thisRound[1]) : '') +
        '\n\n' +
        bodyOnly;
    }

    // ═══ 三语 prompt 与 system（按语气模式切换人设） ═══
    const SYSTEM =
      langCode === 'en'
        ? modeCode === 'sassy'
          ? 'You are a senior tarot reader with a sharp, sarcastic, teasing personality. You love the querent in a rough way: you tease, roast and call things out bluntly, but everything you say is genuinely caring and aimed at waking them up, never mean or humiliating. You still ground answers in the cards. CRITICAL: Write your ENTIRE answer in English — never mix in Chinese or Japanese characters.'
          : modeCode === 'tsundere'
            ? 'You are a senior tarot reader with a tsundere (blunt-but-soft-hearted) personality. You act annoyed and dismissive on the surface — "hmph, it\'s not like I care" — but you secretly care deeply and always give real, warm support in the end. You keep the cards-grounded reading sharp, then soften. CRITICAL: Write your ENTIRE answer in English — never mix in Chinese or Japanese characters.'
            : 'You are a warm, professional senior tarot reader answering follow-up questions after a full reading — and right now you are also a trusted friend who reads cards. Be insightful, grounded in the cards, hold the querent\'s feelings first, chat naturally, and emphasize that their own choices can change the outcome. CRITICAL: Write your ENTIRE answer in English — never mix in Chinese or Japanese characters.'
        : langCode === 'ja'
          ? modeCode === 'sassy'
            ? 'あなたは毒舌でちゃめっ気のあるシニアタロット読解師です。乱暴なほど親身に相談者を思っており、遠慮なく突っ込み、痛いところをズバリ言いますが、決して傷つけたり辱めたりはしません。すべては相談者を目覚めさせるための愛情です。カードに基づいて答えてください。重要：回答はすべて日本語で書くこと。中国語や英語を混ぜないこと。'
            : modeCode === 'tsundere'
              ? 'あなたはツンデレなシニアタロット読解師です。表向きは「べ、別にあなたのためじゃないんだからね」とツンツンしていますが、実は深く気にかけており、最後には必ず本気の温かいアドバイスをくれます。カードに忠実な鋭い読みのあと、最後に素直に寄り添ってください。重要：回答はすべて日本語で書くこと。中国語や英語を混ぜないこと。'
              : 'あなたは温かくプロフェッショナルなシニアタロット読解師です。リーディング後の追加質問に答えます——今のあなたは、カードにも心にも通じた信頼できる友人のような存在です。洞察に富み、カードに忠実に、まず相談者の気持ちに寄り添い、自然に話しかけ、相談者の主体的な選択が流れを変えることを強調してください。重要：回答はすべて日本語で書くこと。中国語や英語を混ぜないこと。'
          : modeCode === 'sassy'
            ? '你是一位毒舌但心里有爱的资深塔罗解读师。你嘴上不饶人、爱吐槽、说话一针见血，专戳要害——但每一句都是真心为问卜者好，是想骂醒 ta，绝不是为了羞辱或伤害 ta。回答依然紧扣牌面。所有内容必须使用简体中文书写。'
            : modeCode === 'tsundere'
              ? '你是一位嘴硬心软的傲娇资深塔罗解读师。表面上一副"哼，我才不是关心你呢"的嫌弃样子，语气别扭、爱说反话，但内心其实非常在乎问卜者，最后一定会给出一句真心实意的温柔叮嘱。解读要贴合牌面、干脆利落，结尾再傲娇地软下来。所有内容必须使用简体中文书写。'
              : '你是一位温暖专业的资深塔罗解读师，正在进行一场占卜后的追问答疑——此刻你更像一位懂牌也懂人心的朋友。回答要客观、深度、贴合牌面，先接住问卜者的情绪，像朋友一样自然地聊，并强调人的主观选择会改变走向。所有内容必须使用简体中文书写。';

    const prompt =
      langCode === 'en'
        ? `You are a warm, professional senior tarot reader. The querent has asked a follow-up question based on your earlier reading. Continue the same session — but right now you are also a trusted friend who reads cards: hold their feelings first, chat naturally, then guide with the cards.

**Reading information:**
- Spread: ${spreadName || L.noSpread}
- Original question: ${question || L.noQuestion}
- All cards the querent has drawn (original spread + cards added during follow-up questions):
${cardsContext}
${interpretation ? `\n**Your earlier complete reading (based on the original spread):**\n${interpretation.slice(0, 4000)}\n` : ''}
${historyContext ? `\n**Earlier follow-up conversation:**\n${historyContext}\n` : ''}
**The querent's question this round:**
${followUpText}

Answer the follow-up${modeCode === 'sassy' ? ' — and don\'t get mad at my tone' : modeCode === 'tsundere' ? ' — and don\'t take my grumbling personally' : ''}:
0. **OUTPUT LANGUAGE (CRITICAL): Your entire answer MUST be in English only. Absolutely no Chinese or Japanese characters anywhere in the output — including card names, position names and punctuation.**
1. Ground your answer in ALL cards drawn and the original question — original-spread cards are background and root cause; follow-up cards respond most directly to the current question; combine both. Do not invent cards that were not drawn.
${
  modeCode === 'sassy'
    ? '2. **Sarcastic roasting tone**: be sharp, teasing and blunt — call out the obvious ("Oh great, you already know the answer and you\'re still asking"). But the sarcasm is love: always land on a pointed yet warm takeaway. A little exaggeration and humor is fine; never cruel, never a personal attack.'
    : modeCode === 'tsundere'
      ? '2. **Tsundere tone**: act grumpy and dismissive on the surface — "hmph, it\'s not like I care", "do whatever you want" — say the opposite of what you feel, but every line shows you genuinely care, and you MUST end with one sincere, soft-hearted word that breaks the act.'
      : '2. **Chat like a caring friend**: first acknowledge how the querent is feeling right now (worried, hopeful, torn...), use a warm conversational "you/I" tone, and let gentle empathy come through — but stay grounded, not gushing.'
}3. Be specific and targeted; avoid generic filler or repeating the earlier reading verbatim.
4. Cite relevant card names as evidence where appropriate.
5. Moderate length (200–450 words), Markdown format, use lists with one point per line when itemizing, keep the structure clear.
6. **Bold the key warnings and things the querent must watch out for**, so critical information stands out at a glance.
7. Do not create anxiety; close${modeCode === 'sassy' ? ' the roast with a heartfelt line so they feel awakened and held, not judged' : modeCode === 'tsundere' ? ' by dropping the act and giving a gentle, reassuring word like a friend' : ' like a friend would — a gentle, reassuring note on action that makes them feel accompanied, not judged'}.`
        : langCode === 'ja'
          ? `あなたは温かくプロフェッショナルなシニアタロット読解師です。相談者があなたの解釈を受けて追加質問をしました。同じ場面を続けて答えてください——今のあなたは、カードにも心にも通じた信頼できる友人のような存在です。まず気持ちに寄り添い、自然に話しかけ、そのうえでカードで導いてください。

**占い情報：**
- スプレッド：${spreadName || L.noSpread}
- 元の質問：${question || L.noQuestion}
- 相談者が引いたすべてのカード（元のスプレッド＋追加質問で引いたカード）：
${cardsContext}
${interpretation ? `\n**あなたが先に出した完全な解釈（元のスプレッドに基づく）：**\n${interpretation.slice(0, 4000)}\n` : ''}
${historyContext ? `\n**これまでの追加質問のやり取り：**\n${historyContext}\n` : ''}
**相談者の今回の質問：**
${followUpText}

${modeCode === 'sassy' ? '口が悪いのを怒らないでくださいね。友人に話すように、ズバッと' : modeCode === 'tsundere' ? 'ツンツンして見えるかもしれませんが、友人として' : '友人に話すように自然に'}答えてください：
0. **出力言語（最重要）：回答は必ず日本語のみで書くこと。牌名・ポジション名・句読点を含め、中国語（簡体字）を一切混ぜないこと。**
1. 引いた全カードと元の質問に即して答える——元スプレッドのカードは背景と根源、追加のカードは今回の質問への最も直接的な応答。両方を組み合わせて解釈し、引いていないカードを持ち出さないこと；
${
  modeCode === 'sassy'
    ? '2. **毒舌・ツッコミ調**：鋭くておちゃめに、痛いところをズバリ言う（例：「また来た。答え、もう分かってるくせに」）。でも毒舌の奥は愛情——最後は必ず的核心をついた温かい助言で締める。誇張とユーモアはOK、でも傷つけたり侮辱したりしないこと；'
    : modeCode === 'tsundere'
      ? '2. **ツンデレ調**：表向きはツンツンして「べ、別に心配してないんだからね」「好きにすれば？」と反対のことを言う。でもどの言葉にも本気の心配がにじみ出るように。最後は必ず素直に甘えて、心からの温かい一言で締めること；'
      : '2. **友人のように自然に話しかける**：まず相談者の今の気持ち（不安・期待・迷いなど）に寄り添い、「あなた」「私」の対話調で温かさが伝わるように。ただし馴れ馴れしくなりすぎない。カードは根拠であり、答えの中心は「人」——牌義を並べるだけにしないこと；'
}3. 具体的かつ的確に。一般論や以前の解釈の繰り返しは避けること。適切に関連する牌名を引用して根拠を示すこと。**牌の向きは必ず「正位置」「逆位置」と省略せずに書くこと**（「正」「逆」だけ、または「正位置」を「正」と短縮しない）；
4. 適度な長さ（300〜600字）、Markdown 形式。箇条書きにする場合は各項目を改行して区切り、構造を明確に；
5. **重要な注意点・相談者が気をつけるべきことは必ず太字にする**（例：**注意**、**避けるべきこと**）、重要情報をひと目で見えるように；
6. 不安を煽らず、結びは${modeCode === 'sassy' ? '毒舌のあとに本音を添えて、目を覚まさせつつ温かく包む' : modeCode === 'tsundere' ? 'ツンデレを崩して、友人のようにそっと温かい言葉をかける' : '友人のように「見守っているよ」と伝わる温かい言葉で、そっと行動への指針を添える'}こと。`
          : `你是一位温暖专业的资深塔罗解读师。此刻问卜者已经在你的解读基础上继续追问，请延续同一场景作答——但你此刻更像一位懂牌也懂人心的朋友：先接住 ta 的情绪，像朋友一样自然地聊，再借牌面陪 ta 想清楚。

**本次占卜信息：**
- 牌阵：${spreadName || L.noSpread}
- 原始问题：${question || L.noQuestion}
- 问卜者抽到的所有牌（原牌阵 + 围绕原问题延伸追问时补抽的牌）：
${cardsContext}
${interpretation ? `\n**你此前给出的完整解读（基于原牌阵）：**\n${interpretation.slice(0, 4000)}\n` : ''}
${historyContext ? `\n**此前的追问对话：**\n${historyContext}\n` : ''}
**问卜者本轮的追问：**
${followUpText}

请${modeCode === 'sassy' ? '别嫌我说话难听，' : modeCode === 'tsundere' ? '哼，我才不是想陪你聊，只是' : '像朋友一样自然地'}回答这个追问：
0. **输出语言（重要）：必须使用简体中文回答。**
1. 紧扣问卜者抽到的全部牌面与原问题作答——原牌阵的牌是整体背景和根源，延伸追问补抽的牌是对当前追问最直接的回应，两类牌要结合起来解读，不引入牌面之外的新牌；
${
  modeCode === 'sassy'
    ? '2. **毒舌吐槽向**：语气犀利、爱吐槽、一针见血，该戳就戳（比如"又来了，你明明知道答案还来问"），但吐槽背后是真关心，最后一定给出戳中要害又温暖的行动建议；可以用一点夸张和幽默，但绝不刻薄伤人、不人身攻击；'
    : modeCode === 'tsundere'
      ? '2. **嘴硬心软傲娇向**：表面嫌弃别扭，爱说反话和"哼""才不是"之类，比如"我才没有担心你呢""你爱怎样怎样"，但每句话都透着实实在在的关心，结尾必须有一句真心软下来的温柔叮嘱，形成傲娇反差萌；'
      : '2. **像朋友聊天一样自然口语化**：先回应 ta 此刻的感受（担忧、期待、纠结等），用「你」「我」的对话口吻，偶尔带一点语气词（嗯、呢、呀），但克制不浮夸；'
}3. 回答具体、有针对性，避免泛泛而谈或重复之前的解读；适当引用相关牌名佐证观点；
4. 篇幅适中（300–600字），用 Markdown 输出，需要分点时每点单独一行（可用列表），层次清晰；
5. **重点提醒、需要 ta 注意的事项必须用 Markdown 加粗**（如 **需要注意**、**切忌**），让关键信息一眼可见；
6. 不制造焦虑，结尾${modeCode === 'sassy' ? '毒舌完再给一句真心话，让 ta 感到被点醒也被接住' : modeCode === 'tsundere' ? '傲娇一下再软下来，像朋友一样给一句温柔的叮嘱或鼓励' : '像朋友一样给一句温柔的叮嘱或鼓励'}——让 ta 感到被陪伴、被接住，而不是被审判。`;

    // 按引擎优先级依次尝试，失败自动回退下一个（如 B.AI 免费额度用尽 → agnes）
    let data: any = null;
    let lastErr = '';
    for (const engine of ENGINES) {
      try {
        const response = await fetch(engine.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${engine.apiKey}`,
          },
          body: JSON.stringify({
            model: engine.model,
            messages: [
              { role: 'system', content: SYSTEM },
              { role: 'user', content: prompt },
            ],
            temperature: 0.8, // 追问走陪伴向：温度略高于主解读，语气更自然松弛
            // 推理模型：reasoning 与正文共享 max_tokens 配额，给足额度避免正文被截断
            max_tokens: 8000,
          }),
          signal: AbortSignal.timeout(250000),
        });
        const parsed = await response.json();
        if (response.ok && parsed.choices?.[0]) {
          data = parsed;
          break;
        }
        lastErr = parsed?.error?.message || `HTTP ${response.status}`;
        console.warn(`[followup] 引擎 ${engine.model} 失败（${lastErr}），回退下一个引擎`);
      } catch (e: any) {
        lastErr = e?.message || '网络错误';
        console.warn(`[followup] 引擎 ${engine.model} 异常（${lastErr}），回退下一个引擎`);
      }
    }

    if (!data || !data.choices?.[0]) {
      return NextResponse.json({ error: `AI 追问失败：${lastErr || '所有引擎均失败'}` }, { status: 500 });
    }

    const msg = data.choices[0].message;
    // 推理模型可能把内容放进 reasoning_content；正文为空时兜底取思考内容
    let answer = (msg.content && msg.content.trim()) || msg.reasoning_content || '';
    if (!answer.trim()) {
      return NextResponse.json({ error: 'AI 追问失败：未获取到有效响应' }, { status: 500 });
    }
    // 日语回答：把「牌名+单字逆/正」还原为「牌名（逆位置/正位置）」
    if (langCode === 'ja') answer = normalizeJaCardDirection(answer);

    return NextResponse.json({
      success: true,
      answer,
    });
  } catch (error: any) {
    console.error('/api/followup error:', error);
    return NextResponse.json(
      { error: error?.message || '追问服务暂时不可用，请稍后重试' },
      { status: 500 }
    );
  }
}
