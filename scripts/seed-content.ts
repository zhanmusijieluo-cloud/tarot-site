// @ts-nocheck
// 一次性灌库脚本：从现有真货模块生成数据行，用 supabase-js 直接写入 Supabase
// 运行：node --experimental-strip-types scripts/seed-content.ts
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { TAROT_DECK, CARD_EN_NAMES } from '../src/lib/tarot.ts';
import { CARD_TRAITS } from '../src/lib/card-traits.ts';
import { CARD_MYSTIC } from '../src/lib/card-mystic.ts';

// Ja 牌名（内联，card-names.ts 有 @/ 别名不便直接导入）
const CARD_JA_NAMES: Record<number, string> = {
  0:'愚者',1:'魔術師',2:'女教皇',3:'女帝',4:'皇帝',5:'教皇',6:'恋人たち',7:'戦車',
  8:'力',9:'隠者',10:'運命の輪',11:'正義',12:'吊るされた男',13:'死神',14:'節制',
  15:'悪魔',16:'塔',17:'星',18:'月',19:'太陽',20:'審判',21:'世界',
  22:'ワンドのエース',23:'ワンドの2',24:'ワンドの3',25:'ワンドの4',
  26:'ワンドの5',27:'ワンドの6',28:'ワンドの7',29:'ワンドの8',
  30:'ワンドの9',31:'ワンドの10',32:'ワンドのペイジ',33:'ワンドのナイト',
  34:'ワンドのクイーン',35:'ワンドのキング',
  36:'カップのエース',37:'カップの2',38:'カップの3',39:'カップの4',
  40:'カップの5',41:'カップの6',42:'カップの7',43:'カップの8',
  44:'カップの9',45:'カップの10',46:'カップのペイジ',47:'カップのナイト',
  48:'カップのクイーン',49:'カップのキング',
  50:'ソードのエース',51:'ソードの2',52:'ソードの3',53:'ソードの4',
  54:'ソードの5',55:'ソードの6',56:'ソードの7',57:'ソードの8',
  58:'ソードの9',59:'ソードの10',60:'ソードのペイジ',61:'ソードのナイト',
  62:'ソードのクイーン',63:'ソードのキング',
  64:'ペンタクルのエース',65:'ペンタクルの2',66:'ペンタクルの3',67:'ペンタクルの4',
  68:'ペンタクルの5',69:'ペンタクルの6',70:'ペンタクルの7',71:'ペンタクルの8',
  72:'ペンタクルの9',73:'ペンタクルの10',74:'ペンタクルのペイジ',75:'ペンタクルのナイト',
  76:'ペンタクルのクイーン',77:'ペンタクルのキング',
};

const arcanaOf = (id: number): string => (id < 22 ? 'major' : 'minor');
const suitOf = (id: number): string | null => {
  if (id < 22) return null;
  if (id <= 35) return 'wands';
  if (id <= 49) return 'cups';
  if (id <= 63) return 'swords';
  return 'pentacles';
};
const rankOf = (id: number): string | null => {
  if (id < 22) return null;
  const base = id <= 35 ? 22 : id <= 49 ? 36 : id <= 63 ? 50 : 64;
  const o = id - base;
  if (o === 0) return 'ace';
  if (o === 10) return 'page';
  if (o === 11) return 'knight';
  if (o === 12) return 'queen';
  if (o === 13) return 'king';
  return String(o + 1);
};

// 读 .env.local
const envRaw = readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
for (const line of envRaw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error('Missing SUPABASE url/anon in .env.local');
const supabase = createClient(url, anon);

const cards: any[] = [];
const meanings: any[] = [];
const langs = ['zh', 'en', 'ja'];

for (const card of TAROT_DECK) {
  const id = card.id;
  cards.push({
    id,
    arcana: arcanaOf(id),
    suit: suitOf(id),
    rank: rankOf(id),
    title: id < 22 ? card.name : null,
    element: card.element,
  });
  for (const lang of langs) {
    const name = lang === 'zh' ? card.name : lang === 'en' ? CARD_EN_NAMES[id] || card.name : CARD_JA_NAMES[id] || card.name;
    const traits = CARD_TRAITS[id]?.[lang] || '';
    const mystic = id < 22 ? CARD_MYSTIC[id] : undefined;
    meanings.push({
      card_id: id,
      lang,
      name,
      meaning_upright: lang === 'zh' ? card.upright : '',
      meaning_reversed: lang === 'zh' ? card.reversedMeaning : '',
      keywords_upright: lang === 'zh' ? card.keywords || [] : [],
      keywords_reversed: [],
      traits,
      mystic_image: mystic ? mystic.image : null,
      mystic_items: mystic ? mystic.items : null,
      mystic_deep: mystic ? mystic.deep : null,
    });
  }
}

console.log('cards:', cards.length, 'meanings:', meanings.length);
console.log('Inserting cards...');
const r1 = await supabase.from('cards').upsert(cards, { onConflict: 'id' });
if (r1.error) { console.error('cards error:', r1.error); process.exit(1); }
console.log('cards inserted. Inserting meanings (bulk)...');
const r2 = await supabase.from('card_meanings').upsert(meanings, { onConflict: 'card_id,lang' });
if (r2.error) { console.error('meanings error:', r2.error); process.exit(1); }
console.log('meanings inserted. count:', meanings.length);
