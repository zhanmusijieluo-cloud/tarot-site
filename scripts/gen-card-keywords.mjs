// 从 public/data/card-details.json 抽取三语关键词，产出 src/lib/card-keywords.ts
// 用途：解读室/牌义页在 en/ja 语境下替代 tarot.ts 里中文写死的 upright 短串。
// card-details.json 有 2.2MB，不能直接进客户端包，所以抽成这张小表。
import { readFileSync, writeFileSync } from 'fs';

const SOURCE = 'public/data/card-details.json';
const TARGET = 'src/lib/card-keywords.ts';
const SEPARATOR = { zh: '、', en: ' · ', ja: '・' };

const raw = JSON.parse(readFileSync(SOURCE, 'utf8'));
const cards = Array.isArray(raw) ? raw : raw.cards;

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const rows = [];
const skipped = [];
for (const c of cards) {
  if (!Number.isInteger(c.id) || c.id < 0 || c.id > 77) continue;
  const langs = ['zh', 'en', 'ja'];
  if (!langs.every((l) => Array.isArray(c[l]?.keywords) && c[l].keywords.length)) {
    skipped.push(c.id);
    continue;
  }
  const cells = langs.map((l) => `${l}: '${c[l].keywords.map(esc).join(SEPARATOR[l])}'`);
  rows.push(`  ${c.id}: { ${cells.join(', ')} },`);
}

const file = `/**
 * 78 张韦特塔罗牌关键词（三语，单行短串）
 * 本文件由 scripts/gen-card-keywords.mjs 从 ${SOURCE} 生成，请勿手改。
 * 重新生成：node scripts/gen-card-keywords.mjs
 */

export const CARD_KEYWORDS: Record<number, { zh: string; en: string; ja: string }> = {
${rows.join('\n')}
};
`;

writeFileSync(TARGET, file);
console.log(`写入 ${TARGET}：${rows.length} 张牌`);
if (skipped.length) console.log(`缺三语 keywords 已跳过：id ${skipped.join(', ')}`);
