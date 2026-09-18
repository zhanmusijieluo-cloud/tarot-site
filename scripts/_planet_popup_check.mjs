// 行星弹窗 (PlanetDetail) 三语残留检查
// 用法: node scripts/_planet_popup_check.mjs   (SCAN_LANG=en|ja)
// 通过 localhost:3000, 点击"星球快捷跳转"里的行星按钮打开 PlanetDetail, 再抓文本节点残留。
import puppeteer from 'puppeteer-core';

const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:3000/astrology/chart';
const BIRTH = 'y=1990&mo=6&d=15&h=12&mi=0&lat=39.90&lng=116.41&tz=8&city=Beijing&n=Sample';

const MODE = process.env.SCAN_LANG || 'en';
const RE = MODE === 'en'
  ? /[㐀-鿿぀-ヿ]/
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

function clickPlanetButton() {
  const SYMS = ['☉', '☽', '☿', '♀', '♂', '♃', '♄', '♅', '♆', '♇', '⚷', '⚸', '☊', '☋', 'ASC', 'MC', 'IC', 'DES'];
  const btns = Array.from(document.querySelectorAll('button'));
  const hit = btns.find((b) => SYMS.includes((b.textContent || '').trim()));
  if (hit) { hit.click(); return (hit.getAttribute('title') || hit.textContent || '').trim(); }
  return null;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EXE, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });

  await page.goto(`${BASE}?${BIRTH}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate((l) => localStorage.setItem('oracle-lang', l), MODE);
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1800);

  const clicked = await page.evaluate(clickPlanetButton);
  await sleep(900);

  // ⚠️ 假绿陷阱 (2026-09-18): 本脚本扫的是 document.body 文本 —— 弹窗根本没开时就没有中文残留,
  //    会「✅ 0 残留」静默通过。而弹窗开不出来正是真实发生过的 BUG (空心描边符号没有命中面积,
  //    点盘面星体穿透 → 不弹窗)。所以必须先断言弹窗真的存在, 否则这次扫描毫无意义。
  const popup = await page.evaluate(() => {
    const el = document.querySelector('[data-planet-detail]')
    return el ? el.getAttribute('data-planet-detail') : null
  });
  if (!popup) {
    console.error(`\n❌ 弹窗没打开 (点了行星按钮: ${clicked || '(未找到)'}) — 本次三语扫描无效, 不能算通过。`);
    console.error('   先跑 scripts/_repro_dyn_hit.mjs 查命中层 (真鼠标), scripts/_repro_dyn_popup.mjs 查逻辑层。');
    await browser.close();
    process.exit(1);
  }

  const hits = await page.evaluate(scanEval, RE.source);

  // 去重
  const seen = new Set(); const uniq = [];
  for (const h of hits) { const k = h.loc + '|' + h.text; if (!seen.has(k)) { seen.add(k); uniq.push(h); } }

  await browser.close();

  console.log(`\n===== PlanetDetail 弹窗三语残留 (${MODE} 模式) =====`);
  console.log(`点击行星按钮: ${clicked || '(未找到)'}`);
  if (uniq.length === 0) {
    console.log('✅ 0 残留 — 弹窗通过');
  } else {
    console.log(`❌ 共 ${uniq.length} 处残留:`);
    for (const h of uniq) console.log(`  <${h.loc}>  "${h.text}"`);
  }
})().catch((e) => { console.error('SCAN ERROR:', e); process.exit(1); });
