// 日文模式残留简体中文扫描器
// 用法: node scripts/i18n_ja_scan.mjs
// 通过 localhost:3000 开发服务器, 用 Edge 无头浏览器遍历 10 个盘种,
// 抓取所有文本节点中含"简体中文独有字符"(日文不使用)的内容并上报。
import puppeteer from 'puppeteer-core';

const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:3000/astrology/chart';
const BIRTH = 'y=1990&mo=6&d=15&h=12&mi=0&lat=39.90&lng=116.41&tz=8&city=Beijing&n=Sample';

// 简体中文独有、日文不使用的字符（避免与日文汉字/假名误判）
// 注意: 体/来 在日文里也用(体=體的日本新字体, 来=日文常用), 勿纳入, 否则误报
// 英文模式用全 CJK 正则 (英文界面不应有任何中日韩字符)
const MODE = process.env.SCAN_LANG || 'ja';
const RE = MODE === 'en'
  ? /[㐀-鿿぀-ヿ]/ // 任意汉字/假名 = 英文界面残留
  : /[盘设选开关进时发应该这们说来过还对错题问实现专业线声阳阴节项显领韩顺颜飞长门间闻东车马鸟风该为庙辖头]/;

const TABS = [
  ['natal', ''],
  ['sky', 'sky'],
  ['transit', 'tr'],
  ['tertiary', 't'],
  ['secondary', 's'],
  ['lunar-return', 'lr'],
  ['solar-return', 'sr'],
  ['firdaria', 'fir'],
  ['solar-arc', 'arc'],
  ['profection', 'prof'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });

  const findings = [];
  for (const [name, dp] of TABS) {
    const url = `${BASE}?${BIRTH}${dp ? `&dp=${dp}` : ''}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate((l) => localStorage.setItem('oracle-lang', l), MODE);
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1800); // 等排盘 API + 渲染

    const hits = await page.evaluate((reSrc) => {
      const re = new RegExp(reSrc);
      const out = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let n;
      while ((n = walker.nextNode())) {
        const txt = n.nodeValue || '';
        // 跳过 <script>/<style> 内文本 (如 Next.js __next_f RSC 载荷)
        let p = n.parentElement;
        let inHead = false;
        while (p) { if (p.tagName === 'SCRIPT' || p.tagName === 'STYLE') { inHead = true; break; } p = p.parentElement; }
        if (inHead) continue;
        if (re.test(txt)) {
          // 向上找一个可定位的祖先标签
          let el = n.parentElement;
          let sel = '';
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
    }, RE.source);

    // 去重（同标签同文本只报一次）
    const seen = new Set();
    for (const h of hits) {
      const key = h.loc + '|' + h.text;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({ tab: name, ...h });
    }
  }

  await browser.close();

  console.log(`\n===== 日文模式简体中文残留扫描 (共 ${findings.length} 处) =====`);
  if (findings.length === 0) {
    console.log('✅ 0 残留 — 通过');
  } else {
    for (const f of findings) {
      console.log(`[${f.tab}] <${f.loc}>  "${f.text}"`);
    }
  }
})().catch((e) => {
  console.error('SCAN ERROR:', e);
  process.exit(1);
});
