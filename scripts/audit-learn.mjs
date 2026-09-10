// 学习专区全面体检：拉全 learn_articles + card-details.json，跑结构审计
import { writeFileSync } from 'fs';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });

const U = process['env']['NEXT_PUBLIC_SUPABASE_URL'];
const K = process['env']['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const H = { apikey: K, Authorization: '***' + K };

const arts = await (await fetch(U + '/rest/v1/learn_articles?select=*', { headers: H })).json();
writeFileSync('scripts/audit-articles.json', JSON.stringify(arts));

const isBlank = (s) => !s || !String(s).trim();
const CJK = /[\u4e00-\u9fff]/;
const kana = /[\u3040-\u30ff]/;
const headings = (t) => ((t || '').match(/^#{1,4} .*/gm) || []);

console.log('== learn_articles 总行数:', arts.length);
const cats = {};
for (const a of arts) (cats[a.category] = cats[a.category] || []).push(a);

for (const [cat, list] of Object.entries(cats)) {
  console.log('\n[' + cat + '] ' + list.length + ' 行, sort_order=' + list.map(x => x.sort_order).sort((a,b)=>a-b).join(','));
  // 无正文的可疑行
  const noBody = list.filter(x => isBlank(x.content_zh) && isBlank(x.content_en) && isBlank(x.content_ja));
  if (noBody.length) console.log('  ⚠ 三语正文全空的行:', noBody.map(x => x.slug + '/' + (x.title_zh || '(无题)')).join(', '));
  // published 状态
  const unpub = list.filter(x => !x.published);
  if (unpub.length) console.log('  ⚠ 未发布行:', unpub.map(x => x.slug).join(', '));
}

// myth 22 覆盖检查
const myth = (cats.myth || []).slice().sort((a, b) => a.sort_order - b.sort_order);
const mythIds = new Set(myth.map(x => (x.slug.match(/myth-(\d+)/) || [])[1]));
const missingMyth = [...Array(22).keys()].filter(i => !mythIds.has(String(i)));
console.log('\nmyth 覆盖 0..21 缺:', missingMyth.length ? missingMyth.join(',') : '无 ✓');
for (let i = 0; i < 22; i++) if (!mythIds.has(String(i).padStart(2,'0')) && !mythIds.has(String(i))) missingMyth.push(i);

// 章节对齐 + 残留问题
const structIssues = [];
for (const x of arts) {
  const hz = headings(x.content_zh).length, he = headings(x.content_en).length, hj = headings(x.content_ja).length;
  if (hz && (hz !== he || hz !== hj)) structIssues.push(`${x.slug} 标题数 zh${hz}/en${he}/ja${hj}`);
  if (x.content_en && CJK.test(x.content_en.replace(/[\u3400-\u4dbf]/g,''))) {
    // en 里出现汉字(排除日文) — 只报 myth/practice/foundation/advanced 的 en 列
    const cnt = (x.content_en.match(new RegExp('[\\u4e00-\\u9fff]', 'g')) || []).length;
    if (cnt > 2) structIssues.push(`${x.slug} content_en 含${cnt}个汉字 样例: ${(x.content_en.match(new RegExp('.{0,15}[\\u4e00-\\u9fff]+.{0,10}', 'g')) || []).slice(0,2).join(' ~~ ')}`);
  }
  if (x.content_ja && !kana.test(x.content_ja) && (x.content_ja || '').length > 300) structIssues.push(`${x.slug} content_ja 疑似非日文(无假名)`);
  // markdown 结构粗查：未闭合加粗
  for (const L of ['content_zh','content_en','content_ja']) {
    const t = x[L] || '';
    const stars = (t.match(/\*\*/g) || []).length;
    if (stars % 2) structIssues.push(`${x.slug} ${L} **不配对(${stars}个)`);
  }
}
console.log('\n== 结构/残留问题:', structIssues.length ? '\n  ' + structIssues.join('\n  ') : '无 ✓');

// card-details 检查
const det = JSON.parse((await import('fs')).readFileSync('public/data/card-details.json', 'utf-8'));
const blocks = Object.keys(det[0].zh);
let dIssue = [];
for (const d of det) {
  for (const L of ['zh','en','ja']) {
    if (!d[L]) { dIssue.push(`id${d.id} 整语言缺${L}`); continue; }
    for (const b of blocks) {
      const v = String(d[L][b] ?? '').trim();
      if (!v) dIssue.push(`id${d.id}.${L}.${b} 空`);
      else if (b !== 'keywords' && v.length < 10) dIssue.push(`id${d.id}.${L}.${b} 过短(${v.length}): ${v.slice(0,20)}`);
    }
    if (!Array.isArray(d[L].keywords) || !d[L].keywords.length) dIssue.push(`id${d.id}.${L}.keywords 空`);
    if (L === 'en') {
      const bad = ['zh','ja'].filter(x => d[x] === undefined);
      if (bad.length) dIssue.push(`id${d.id} en检查旁证:缺${bad}`);
    }
  }
  if (!d.zh || !d.en || !d.ja) dIssue.push(`id${d.id} 语言对象缺失`);
}
// en 混入中文、ja 混入纯中文段
for (const d of det) {
  if (d.en) for (const b of blocks) {
    const v = String(d.en[b] || '');
    const cnt = (v.match(/[\u4e00-\u9fff]/g) || []).length;
    if (cnt > 3) dIssue.push(`det id${d.id}.en.${b} 含${cnt}汉字`);
  }
}
console.log('\n== card-details.json 问题:', dIssue.length ? '\n  ' + dIssue.slice(0, 40).join('\n  ') + (dIssue.length > 40 ? `\n  …共${dIssue.length}条` : '') : '无 ✓');
