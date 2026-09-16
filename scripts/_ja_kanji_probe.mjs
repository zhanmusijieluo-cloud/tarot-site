// 日文模式「中日共有汉字术语」探针 —— 专打简体独有字扫描器的盲区
// 用法: node scripts/_ja_kanji_probe.mjs
// 原理: 日文界面出现「冲/阳/鸟/书/马/禄/头」等简体字形 (或中文特有占星术语
// 如 合冲刑拱六合/入相/出相/本垣/曜昇/十度/陷/落/分数/焦身/燃烧之路) = 残留。
// 注意: 平均/逆行/星体/宮/主/次/現在/開始日/太陽/鳥(旧字体OK?) 等是合法日文, 不列。
import puppeteer from 'puppeteer-core';

const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:3000/astrology/chart';
const BIRTH = 'y=1990&mo=6&d=15&h=12&mi=0&lat=39.90&lng=116.41&tz=8&city=Beijing&n=Sample';

// 简体字形 + 中文特有词组 的判定在 scanEval 内 (page.evaluate 无法引用外部常量)

const TABS = [
  ['natal', ''], ['sky', 'sky'], ['transit', 'tr'], ['tertiary', 't'], ['secondary', 's'],
  ['lunar-return', 'lr'], ['solar-return', 'sr'], ['firdaria', 'fir'], ['solar-arc', 'arc'], ['profection', 'prof'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function scanEval() {
  // 只列真正简体字形/中文特有字；「阳/鸟/书/马」已在 ja.ts 与 UI 统一为日文旧字体，保留作为回归护栏
  const re1 = new RegExp('[冲阳鸟书马长门间东风飞头云电画运动还这们过应该实对题实现线节项显领选开关盘设进]');
  // 注意: 東出/西入/順時/逆行/太陽下 等是日本占星圈通用汉字词, 不列入黑名单
  const re2 = /(六合|梅花|入相|出相|本垣|曜昇|曜升|十度|陷落|焦身|燃烧|互容|接纳|游走|失势|得时|失时|宫神星|命宫|财帛|官禄|迁移|交友|疾厄|田宅|夫妻|子女|兄弟|玄秘)/;
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let n;
  while ((n = walker.nextNode())) {
    const txt = (n.nodeValue || '').trim();
    if (!txt) continue;
    let p = n.parentElement, inHead = false;
    while (p) { if (p.tagName === 'SCRIPT' || p.tagName === 'STYLE') { inHead = true; break; } p = p.parentElement; }
    if (inHead) continue;
    if (re1.test(txt) || re2.test(txt)) {
      let el = n.parentElement, sel = '';
      while (el && !sel) {
        if (el.id) { sel = '#' + el.id; break; }
        if (el.className && typeof el.className === 'string') {
          const cls = el.className.trim().split(/\s+/).slice(0, 2).join('.');
          if (cls) { sel = el.tagName.toLowerCase() + '.' + cls; break; }
        }
        el = el.parentElement;
      }
      out.push({ text: txt, loc: sel || 'body' });
    }
  }
  // 也扫 title 属性 (tooltip)
  for (const el of document.querySelectorAll('[title]')) {
    const t = el.getAttribute('title') || '';
    if (re1.test(t) || re2.test(t)) out.push({ text: t, loc: 'title@' + el.tagName.toLowerCase() });
  }
  return out;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EXE, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  const findings = [];
  const seen = new Set();
  const push = (scope, hits) => {
    for (const h of hits) {
      const k = h.loc + '|' + h.text;
      if (seen.has(k)) continue;
      seen.add(k);
      findings.push({ tab: scope, ...h });
    }
  };

  for (const [name, dp] of TABS) {
    const url = `${BASE}?${BIRTH}${dp ? `&dp=${dp}` : ''}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate(() => localStorage.setItem('oracle-lang', 'ja'));
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1500);
    push(name, await page.evaluate(scanEval));
  }

  // 点行星弹窗
  await page.goto(`${BASE}?${BIRTH}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => localStorage.setItem('oracle-lang', 'ja'));
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);
  await page.evaluate(() => {
    const SYMS = ['☉', '☽', '☿', '♀', '♂', '♃', '♄', '♅', '♆', '♇'];
    const hit = Array.from(document.querySelectorAll('button')).find((b) => SYMS.includes((b.textContent || '').trim()));
    if (hit) hit.click();
  });
  await sleep(900);
  push('planet-popup', await page.evaluate(scanEval));

  await browser.close();
  console.log(`\n===== 日文模式「共有汉字术语」探针 (共 ${findings.length} 处) =====`);
  if (!findings.length) console.log('✅ 0 残留 — 通过');
  else for (const f of findings) console.log(`[${f.tab}] <${f.loc}>  "${f.text.slice(0, 90)}"`);
})().catch((e) => { console.error('ERROR:', e); process.exit(1); });
