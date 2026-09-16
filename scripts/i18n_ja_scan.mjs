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

// 在 page.evaluate 里抓取当前文档所有文本节点中命中正则的内容
function scanEval(reSrc) {
  const re = new RegExp(reSrc);
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let n;
  while ((n = walker.nextNode())) {
    const txt = n.nodeValue || '';
    let p = n.parentElement;
    let inHead = false;
    while (p) { if (p.tagName === 'SCRIPT' || p.tagName === 'STYLE') { inHead = true; break; } p = p.parentElement; }
    if (inHead) continue;
    if (re.test(txt)) {
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
}

// 点击匹配标题/文本的按钮 (返回是否点到)
function clickByText(text) {
  const btns = Array.from(document.querySelectorAll('button'));
  const hit = btns.find((b) => {
    const t = (b.getAttribute('title') || '') + ' ' + (b.textContent || '');
    return t.includes(text);
  });
  if (hit) { hit.click(); return true; }
  return false;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });

  const findings = [];
  const pushHits = (scope, hits) => {
    const seen = new Set();
    for (const h of hits) {
      const key = h.loc + '|' + h.text;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({ tab: scope, ...h });
    }
  };

  for (const [name, dp] of TABS) {
    const url = `${BASE}?${BIRTH}${dp ? `&dp=${dp}` : ''}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate((l) => localStorage.setItem('oracle-lang', l), MODE);
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1800); // 等排盘 API + 渲染
    pushHits(name, await page.evaluate(scanEval, RE.source));
  }

  // ---- StatusTabs 子表覆盖: 法达/小限/福点·精神点 Aphesis (默认 ecliptic 已在主循环覆盖) ----
  const STATUS_TABS = [
    ['firdaria', ['法达星限', 'Firdaria', 'ファルダリア']],
    ['profection', ['小限法', 'Profections', 'プロフェクション']],
    ['aphesisF', ['福点 Aphesis', 'Fortune Aphesis', 'フォーチュン・アフェシス']],
    ['aphesisS', ['精神点 Aphesis', 'Spirit Aphesis', 'スピリット・アフェシス']],
  ];
  function clickTabByText(cands) {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const c of cands) {
      const hit = btns.find((b) => (b.textContent || '').includes(c));
      if (hit) { hit.click(); return c; }
    }
    return null;
  }
  await page.goto(`${BASE}?${BIRTH}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate((l) => localStorage.setItem('oracle-lang', l), MODE);
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1800);
  for (const [id, cands] of STATUS_TABS) {
    const clicked = await page.evaluate(clickTabByText, cands);
    await sleep(700);
    pushHits('status-' + id + (clicked ? '' : '(未点击)'), await page.evaluate(scanEval, RE.source));
  }

  // ---- 弹层覆盖: 合盘窗口 + 排盘设置抽屉 (仅本命盘视图) ----
  if (process.env.POPUP) {
    await page.goto(`${BASE}?${BIRTH}`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate((l) => localStorage.setItem('oracle-lang', l), MODE);
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1800);

    // 合盘窗口 (☍ 按钮 — 用图标匹配, 跨语言稳定)
    const openedSyn = await page.evaluate(clickByText, '☍');
    if (openedSyn) {
      await sleep(900);
      pushHits('popup-synastry', await page.evaluate(scanEval, RE.source));
      await page.keyboard.press('Escape');
      await sleep(400);
    } else {
      findings.push({ tab: 'popup-synastry', loc: 'button', text: '(未找到合盘按钮)' });
    }

    // 排盘设置抽屉 (⚙ 按钮 — 用图标匹配, 跨语言稳定)
    const openedSet = await page.evaluate(clickByText, '⚙');
    if (openedSet) {
      await sleep(900);
      pushHits('popup-settings', await page.evaluate(scanEval, RE.source));
      await page.keyboard.press('Escape');
      await sleep(400);
    } else {
      findings.push({ tab: 'popup-settings', loc: 'button', text: '(未找到设置按钮)' });
    }
  }

  await browser.close();

  console.log(`\n===== 三语残留扫描 (${MODE} 模式, 共 ${findings.length} 处) =====`);
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
