// 输入模式三语残留检查: /astrology 页 (NatalForm + BirthplacePicker + ArchivePicker + 宫制按钮)
// 用法: node scripts/_input_mode_check.mjs   (SCAN_LANG=en|ja)
import puppeteer from 'puppeteer-core';

const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:3000/astrology'; // 无参数 = 输入表单模式

const MODE = process.env.SCAN_LANG || 'en';
const RE = MODE === 'en'
  ? /[㐀-鿿぀-ヿ]/ // 英文界面: 任意汉字/假名 = 残留
  : /[盘设选开关进时发应该这们说来过还对错题问实现专业线声阳阴节项显领韩顺颜飞长门间闻东车马鸟风该为庙辖头]/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function scanEval(reSrc) {
  const re = new RegExp(reSrc);
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let n;
  while ((n = walker.nextNode())) {
    const txt = n.nodeValue || '';
    let p = n.parentElement, inHead = false;
    while (p) { if (p.tagName === 'SCRIPT' || p.tagName === 'STYLE') { inHead = true; break; } p = p.parentElement; }
    if (inHead) continue;
    if (re.test(txt)) {
      let el = n.parentElement, sel = '';
      while (el && !sel) {
        if (el.id) { sel = '#' + el.id; break; }
        if (el.className && typeof el.className === 'string') {
          const cls = el.className.trim().split(/\s+/).slice(0, 2).join('.');
          if (cls) { sel = el.tagName.toLowerCase() + '.' + cls; break; }
        }
        el = el.parentElement;
      }
      out.push({ text: txt.trim(), loc: sel || 'body' });
    }
  }
  return out;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EXE, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1200 });

  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate((l) => localStorage.setItem('oracle-lang', l), MODE);
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1600);

  const hits = await page.evaluate(scanEval, RE.source);
  // 额外抓 select/option 与 button title (表单控件文本不在 Text 节点里)
  const controlHits = await page.evaluate((reSrc) => {
    const re = new RegExp(reSrc);
    const out = [];
    for (const el of document.querySelectorAll('option')) {
      if (re.test(el.textContent || '')) out.push({ text: el.textContent.trim(), loc: 'option' });
    }
    for (const el of document.querySelectorAll('button,input,select')) {
      const t = el.getAttribute('title') || el.getAttribute('placeholder') || '';
      if (re.test(t)) out.push({ text: t, loc: (el.tagName || '').toLowerCase() + '[title/placeholder]' });
    }
    return out;
  }, RE.source);

  const all = [...hits, ...controlHits];
  const seen = new Set(); const uniq = [];
  for (const h of all) { const k = h.loc + '|' + h.text; if (!seen.has(k)) { seen.add(k); uniq.push(h); } }

  await browser.close();

  console.log(`\n===== 输入模式 /astrology 三语残留 (${MODE} 模式) =====`);
  if (uniq.length === 0) {
    console.log('✅ 0 残留 — 输入表单通过');
  } else {
    console.log(`❌ 共 ${uniq.length} 处残留:`);
    for (const h of uniq) console.log(`  <${h.loc}>  "${h.text}"`);
  }
})().catch((e) => { console.error('SCAN ERROR:', e); process.exit(1); });
