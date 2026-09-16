'use client';

// ============================================================
// 本命盘结果展示 — 严格照宫神星信息分布 (暗金皮肤)
// 左上资料卡 · 左列行星竖列 · 左下相位网格(可切列表)
// 中央=星盘(绝对主角) · 右侧=特征面板(格局/尊贵/互容接纳)
// 底部=黄道状态大表
// ============================================================
import React, { useState } from 'react';
import { useI18n } from '@/i18n';
import { L, PLANET_JA } from '@/lib/astro/i18n';
import ChartWheel, { type VChart, type VPlanet } from '@/components/astro/ChartWheel';
import AspectGrid, { AspectLegend, ASPECT_COLOR, fmtOrbDms, aspectMatrixPoints } from '@/components/astro/AspectGrid';
import NatalCard from '@/components/astro/NatalCard';
import StatusTabs from '@/components/astro/StatusTabs';

const RECEPTION_KIND_ZH: Record<string, string> = {
  domicile: '本垣', exaltation: '曜升', triplicity: '三分', detriment: '失势', fall: '落陷',
};
// 日文星座名（日文模式下替代中文）
const SIGNS_JA: Record<string, string> = {
  Aries: '牡羊座', Taurus: '牡牛座', Gemini: '双子座', Cancer: '蟹座', Leo: '獅子座', Virgo: '乙女座',
  Libra: '天秤座', Scorpio: '蠍座', Scorpius: '蠍座', Sagittarius: '射手座', Capricorn: '山羊座',
  Capricornus: '山羊座', Aquarius: '水瓶座', Pisces: '魚座', Ophiuchus: '蛇遣い',
};
// 日文接纳等级
const RECEPTION_KIND_JA: Record<string, string> = {
  domicile: 'ドミサイル', exaltation: 'エグザルテーション', triplicity: 'トリプリシティ',
  detriment: 'デトリメント', fall: 'フォール', term: 'ターム', face: 'フェイス',
};
const SIGNS_ZH_MINI: Record<string, string> = {
  Aries: '白羊', Taurus: '金牛', Gemini: '双子', Cancer: '巨蟹', Leo: '狮子', Virgo: '处女',
  Libra: '天秤', Scorpio: '天蝎', Scorpius: '天蝎', Sagittarius: '射手', Capricorn: '摩羯',
  Capricornus: '摩羯', Aquarius: '水瓶', Pisces: '双鱼',
};

// 度°分′ 显示 (学宫神星: 精确到分)
const dms = (degInSign: number) => {
  const d = Math.floor(degInSign);
  const m = Math.round((degInSign - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}′`;
};

function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-white/[0.07] bg-black/20 ${className}`}>
      <p className="border-b border-white/[0.06] px-3 py-2 text-[10px] tracking-[0.25em] text-muted uppercase">{title}</p>
      {children}
    </section>
  );
}

export default function ChartResult({ chart, zhMode, aspectMode: modeProp, onAspectMode, cornerActions, hideStatus }: {
  chart: VChart; zhMode: boolean;
  /** 相位区模式受控于页面 URL (ag=grid); 不传则内部自管 */
  aspectMode?: 'list' | 'grid';
  onAspectMode?: (m: 'list' | 'grid') => void;
  /** 资料卡下方竖排操作 (爸爸: 编辑资料/宫位设置/排盘设置 嵌入卡下) */
  cornerActions?: React.ReactNode;
  /** 天象盘模式: 隐藏底部状态区 (法达/小限等时序对本命才有意义) */
  hideStatus?: boolean;
}) {
  const { t, lang } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  void modeProp; void onAspectMode; // 矩阵与清单同屏后不再需要切换 (URL ag 参数保留兼容旧链接)
  const zhOf = (name: string) =>
    lang === 'ja'
      ? (PLANET_JA[name]
         ?? chart.planets.find((p) => p.name === name)?.zh
         ?? name)
      : zhMode
      ? (chart.planets.find((p) => p.name === name)?.zh
         ?? ({ Ascendant: '上升', Descendant: '下降', Midheaven: '中天', IC: '天底' } as Record<string, string>)[name]
         ?? name)
      : name;
  const sSym = (name: string) =>
      chart.planets.find((x) => x.name === name)?.symbol
      ?? ({ Ascendant: 'ASC', Descendant: 'DSC', Midheaven: 'MC', IC: 'IC' } as Record<string, string>)[name]
      ?? name[0]
    const firstChar = (n: string) => chart.planets.find((x) => x.name === n)?.symbol ?? ({ Ascendant: 'ASC', Descendant: 'DSC', Midheaven: 'MC', IC: 'IC' } as Record<string, string>)[n] ?? n[0]
    const sz = (s: string) => (lang === 'ja' ? (SIGNS_JA[s] ?? s) : zhMode ? (SIGNS_ZH_MINI[s] ?? s) : s);

  const sun = chart.planets.find((p) => p.name === 'Sun');
  const moon = chart.planets.find((p) => p.name === 'Moon');
  const asc = chart.angles.ascendant, mc = chart.angles.midheaven;

  // ---- 左列行星竖列 ----
  // ---- 右侧特征面板 (宫神星格式: 判词全保留, 行星/星座用符号) ----
  type Feat = { el: React.ReactNode; tone: 'gold' | 'soft' | 'warn' | 'hot'; tip?: string; main?: number; rank?: number }
  // 星体重要度 (爸爸定标同弹窗: 七大行星→三王星→4轴→其他) — 与 ChartWheel 的 BODY_IMP 同口径
  const IMP: Record<string, number> = {
    Sun: 70, Moon: 65, Mercury: 60, Venus: 55, Mars: 50, Jupiter: 45, Saturn: 40,
    Uranus: 30, Neptune: 25, Pluto: 20,
    Ascendant: 15, Descendant: 13, Midheaven: 12, IC: 10, ASC: 15, DSC: 13, MC: 12,
  }
  const impOf = (n: string) => IMP[n] ?? 0
  const features: Feat[] = []
  const psym = (name: string) => chart.planets.find((x) => x.name === name)?.symbol ?? name
  // 落座行: ☉ 双子 23°42′ · 9宫 (判词汉字在, 行星星座用符号)
  const placeLine = (p: VPlanet, label: string) => (
    <span>
      <b className="font-normal text-frost">{p.symbol}</b>
      <span className="ml-1.5 text-accent/95">{lang === 'ja' ? (SIGNS_JA[p.sign] ?? p.sign) : zhMode ? p.signZh : p.sign}</span>
      <span className="mx-1.5 text-frost">{dms(p.degInSign)}</span>
      {p.house ? <span className="text-muted/80">{lang === 'ja' ? `· ${p.house}ハウス` : zhMode ? `· 第${p.house}宫` : `· H${p.house}`}</span> : null}
      {p.retrograde ? <span className="ml-1.5 text-[#e8a08a]">{lang === 'ja' ? '逆行' : zhMode ? '逆行' : 'Rx'}</span> : null}
      {label ? <span className="ml-1.5 text-muted/50">{label}</span> : null}
    </span>
  )
  if (sun) features.push({ el: placeLine(sun, ''), tone: 'gold' })
  if (moon) features.push({ el: placeLine(moon, ''), tone: 'gold' })
  if (asc) features.push({ el: placeLine(asc, lang === 'ja' ? 'アセンダント' : zhMode ? '上升' : ''), tone: 'gold' })
  if (mc) features.push({ el: placeLine(mc, lang === 'ja' ? 'MC' : zhMode ? '中天' : ''), tone: 'gold' })
  // 互容 · 接纳 (宫神星判词句式): ☉ 被 ♀ 接纳 (本垣♉) / ♀ 与 ♂ 互容 (♎/♈ 本垣)
  const recepFeats: Feat[] = []
  // 爸爸定标: 尊贵档 — 本垣/曜升对技法权重最高, 三分/界/面次之 (特征面板判词排序用)
  const DIGNITY_RANK: Record<string, number> = { domicile: 0, exaltation: 0, triplicity: 1, term: 1, face: 1 }
  {
    const seen = new Set<string>();
    for (const r of chart.receptions) {
      // 木木体系定标(4讲P29-30): 接纳须成相位(单向,房东给房客); 互容=双向同住, 无论有无相位都成立
      if (!r.aspected && !r.mutual) continue;
      const key = [r.a, r.b].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const impMax = Math.max(impOf(r.a), impOf(r.b));
      const kind = lang === 'ja' ? (RECEPTION_KIND_JA[r.kind] ?? r.kind) : zhMode ? (RECEPTION_KIND_ZH[r.kind] ?? r.kind) : r.kind
      const pa = chart.planets.find((x) => x.name === r.a), pb = chart.planets.find((x) => x.name === r.b)
      if (r.mutual) {
        const rev = chart.receptions.find((x) => x.a === r.b && x.b === r.a)
        recepFeats.push({
          tone: 'soft',
          main: impMax,
          rank: Math.min(DIGNITY_RANK[r.kind] ?? 2, rev ? DIGNITY_RANK[rev.kind] ?? 2 : 2),
          tip: zhMode
            ? `${pa?.zh ?? r.a} 与 ${pb?.zh ?? r.b} 互容${r.aspected ? '+接纳（有相位，能量互通）' : '（无相位仍成立，能量共享）'}: 互居对方${kind}之座 ${sz(r.bySign)}/${sz(rev?.bySign ?? '')}`
            : `${r.a} & ${r.b} mutual reception${r.aspected ? ' + reception' : ''}: ${sz(r.bySign)} / ${sz(rev?.bySign ?? '')}`,
          el: (
            <span>
              <b className="font-normal text-frost">{psym(r.a)}</b><span className="mx-1">{lang === 'ja' ? 'と' : zhMode ? '与' : '&'}</span><b className="font-normal text-frost">{psym(r.b)}</b>
              <span className="ml-1 text-[#cdb88a]">{r.aspected ? (lang === 'ja' ? 'MR＋レセプション' : zhMode ? '互容·接纳' : 'MR + reception') : (lang === 'ja' ? 'MR' : zhMode ? '互容' : 'MR')}</span>
              <span className="ml-1 text-muted/80">(</span>
              <span className="text-frost/90">{psym(r.a)}{lang === 'ja' ? 'の' : zhMode ? '居' : ' in '}{sz(r.bySign)}=</span><span className="text-accent/95">{zhMode ? (pb?.zh ?? r.b) : r.b}{kind}</span>
              {rev && <>
                <span className="mx-1 text-muted/60">·</span>
                <span className="text-frost/90">{psym(r.b)}{lang === 'ja' ? 'の' : zhMode ? '居' : ' in '}{sz(rev.bySign)}=</span><span className="text-accent/95">{zhMode ? (pa?.zh ?? r.a) : r.a}{zhMode ? (RECEPTION_KIND_ZH[rev.kind] ?? rev.kind) : rev.kind}</span>
              </>}
              <span className="text-muted/80">)</span>
            </span>
          ),
        })
      } else {
        recepFeats.push({
          tone: 'soft',
          main: impMax,
          rank: DIGNITY_RANK[r.kind] ?? 2,
          tip: zhMode
            ? `${pa?.zh ?? r.a} 被 ${pb?.zh ?? r.b} 接纳（居其${kind}·${sz(r.bySign)}）`
            : `${r.a} received by ${r.b} (in its ${kind} · ${sz(r.bySign)})`,
          el: (
            <span>
              <b className="font-normal text-frost">{psym(r.a)}</b><span className="mx-1.5">{lang === 'ja' ? 'に' : zhMode ? '被' : ' by '}</span><b className="font-normal text-frost">{psym(r.b)}</b><span className="ml-1">{lang === 'ja' ? '受容' : zhMode ? '接纳' : 'received'}</span>
              <span className="ml-1 text-muted/80">({kind} </span>
              <span className="text-accent/95">{sz(r.bySign)}</span>
              <span className="text-muted/80">)</span>
            </span>
          ),
        })
      }
    }
  }
  recepFeats.sort((a, b) => (a.rank ?? 2) - (b.rank ?? 2) || (b.main ?? 0) - (a.main ?? 0))
  features.push(...recepFeats)
  // 接近太阳三段 (木木PPT33): 日核Cazimi反强 / 燃烧·焦身难发挥 / 日光下轻+近贵
  {
    const sunP = chart.planets.find((x) => x.name === 'Sun')
    const near = [...(chart.Cazimi ?? []), ...(chart.combust ?? [])] // 仅≤8°30′进特征卡; 17°内只进底部大表+AI证据(防刷屏)
    for (const cn of near) {
      const p = chart.planets.find((x) => x.name === cn)
      const dist = p && sunP ? Math.abs(((p.longitude - sunP.longitude + 540) % 360) - 180) : 0
      const caz = (chart.Cazimi ?? []).includes(cn)
      const beams = (chart.underBeams ?? []).includes(cn)
      const label = caz
        ? (lang === 'ja' ? 'カジミ' : '日核Cazimi')
        : beams
        ? (lang === 'ja' ? '太陽下' : '在日光下')
        : (lang === 'ja' ? '燃焼' : '焦身·燃烧')
      const tone = caz ? 'gold' : beams ? 'soft' : 'warn'
      const pname = zhOf(cn)
      features.push({
        tone,
        tip: caz
          ? `${pname} ${lang === 'ja' ? 'カジミ' : '日核Cazimi'} (距日≤0°17′, ${lang === 'ja' ? '帝王の内臣の如く、逆に強し' : '如皇帝内臣, 反强'})`
          : beams
          ? `${pname} ${lang === 'ja' ? '太陽下' : '在日光下'} (距日8°30′~17°, ${lang === 'ja' ? '影響軽く、貴人に近し' : '影响轻, 兼近贵'})`
          : `${pname} ${lang === 'ja' ? '燃焼' : '焦身·燃烧'} (距日17′~8°30′, ${lang === 'ja' ? '星の性質が発揮され難い' : '星性难发挥'})`,
        el: (
          <span>
            <b className="font-normal text-frost">{psym(cn)}</b><span className={`ml-1.5 ${caz ? 'text-[#cdb88a]' : beams ? 'text-muted' : 'text-[#e07f7f]'}`}>{label}</span>
            <span className="ml-1 text-muted/80">(距日 {dist < 1 ? dist.toFixed(3).replace(/0+$/, '').replace(/\.$/, '0') : dist.toFixed(1)}°)</span>
          </span>
        ),
      })
    }
  }
  // 燃烧之路 (窄版): ☽♏ 在燃烧之路 — 逐星一行
  for (const n of chart.viaCombusta ?? []) {
    const p2 = chart.planets.find((x) => x.name === n)
    if (!p2) continue
    features.push({
      tone: 'warn',
      tip: lang === 'ja' ? `${zhOf(n)} 燃焼の道 (天秤14°55′—天蝎14°55′, 秋分点の暗域)` : zhMode ? `${p2.zh} 位于燃烧之路 (天秤14°55′—天蝎14°55′, 秋分点之暗区)` : undefined,
      el: (
        <span>
          <b className="font-normal text-frost">{p2.symbol}</b>
          <span className="mx-1 text-accent/95">{lang === 'ja' ? (SIGNS_JA[p2.sign] ?? p2.sign) : zhMode ? p2.signZh : p2.sign}</span>
          <span className="text-[#e8a08a]">{lang === 'ja' ? '燃焼の道' : zhMode ? '在燃烧之路' : 'Via Combusta'}</span>
        </span>
      ),
    })
  }
  // 月亮空亡 (VOC): 月出座前不再与其他七政精确成相
  if (chart.moonVoid) {
    features.push({
      tone: 'warn',
      tip: lang === 'ja' ? 'ムーン・ヴォイド (Void of Course): 出生位置からサイン移動まで、他の七政と正確なアスペクトを結ばず — 事項は宙吊り、推進系は空回りしやすい (古典の凶兆の一つ)' : zhMode ? '月亮空亡 (Void of Course): 从出生位到出座前, 不再与任何七政精确成相 — 事项悬置、推进类易空转 (古典凶兆之一)' : undefined,
      el: (
        <span>
          <b className="font-normal text-frost">☽</b>
          <span className="ml-1 text-[#e8a08a]">{lang === 'ja' ? 'ムーン・ヴォイド' : zhMode ? '月亮空亡' : 'Moon void of course'}</span>
          <span className="ml-1 text-muted/70 text-[10px]">{lang === 'ja' ? '（サイン移動までアスペクトなし）' : zhMode ? '(出座前不再成相)' : ''}</span>
        </span>
      ),
    })
  }
  // 映点 Antiscia: ♀♊ 与 ☿♊ 成映点 (对宫合相)
  {
    const antiKey = (lon: number) => (((180 - lon) % 360) + 360) % 360
    const seenA = new Set<string>()
    for (let i = 0; i < chart.planets.length; i++) {
      for (let j = i + 1; j < chart.planets.length; j++) {
        const pa = chart.planets[i], pb = chart.planets[j]
        const d = Math.abs(antiKey(pa.longitude) - pb.longitude)
        const sep = Math.min(d, 360 - d)
        if (sep <= 1) { // 木木PPT32: 映点/反映点容许度1°
          const key = `${pa.name}|${pb.name}`
          if (seenA.has(key)) continue
          seenA.add(key)
          features.push({
            tone: 'soft',
            tip: lang === 'ja' ? `${zhOf(pa.name)} と ${zhOf(pb.name)} 成映点 (Antiscia, 蟹座-山羊座軸に関する鏡像一致)` : zhMode ? `${pa.zh} 与 ${pb.zh} 成映点 (Antiscia, 关于巨蟹-摩羯轴镜像重合)` : undefined,
            el: (
              <span>
                <b className="font-normal text-frost">{pa.symbol}</b>
                <span className="mx-1 text-accent/95">{lang === 'ja' ? (SIGNS_JA[pa.sign] ?? pa.sign) : zhMode ? pa.signZh : pa.sign}</span>
                <span className="mx-1">与</span>
                <b className="font-normal text-frost">{pb.symbol}</b>
                <span className="mx-1 text-accent/95">{lang === 'ja' ? (SIGNS_JA[pb.sign] ?? pb.sign) : zhMode ? pb.signZh : pb.sign}</span>
                <span className="text-[#8aa8d8]">成映点</span>
                {sep < 0.5 ? <span className="ml-1 text-muted/70">0°</span> : <span className="ml-1 text-muted/70">{sep.toFixed(1)}°</span>}
              </span>
            ),
          })
        }
      }
    }
  }



  return (
    <div className="space-y-4">
      {/* 精度声明 (有则必显, 不许悄悄换) */}
      {chart.warnings.length > 0 && (
        <div className="space-y-1.5">
          {chart.warnings.map((w, i) => (
            <p key={i} className="rounded-xl border border-[#e8a08a]/25 bg-[#e8a08a]/[0.05] px-4 py-2 text-center text-[11px] leading-relaxed text-[#e8a08a]">
              {w}
            </p>
          ))}
        </div>
      )}

      {/* 两栏: 星盘(主区) | 特征 */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_236px]">
        {/* ---- 中央: 星盘主区 ---- */}
        <div className="min-w-0">
          <ChartWheel chart={chart} zhMode={zhMode} selected={selected} onSelect={setSelected} cornerSlot={
      <div className="pointer-events-auto flex w-[248px] flex-col gap-1.5">
      <NatalCard chart={chart} zhMode={zhMode} />
      {cornerActions}
      </div>
          } />
        </div>

        {/* ---- 右侧: 特征 (宫神星同款: 落座/尊贵/接纳/互容 判词全在这一张卡) ---- */}
        <div className="space-y-4">
          <Panel title={lang === 'ja' ? '特徴' : zhMode ? '特征' : 'Features'}>
            <ul className="divide-y divide-white/[0.04]">
              {features.map((f, i) => (
                <li key={i} title={f.tip} className={`cursor-default px-3 py-[6.5px] text-[12px] leading-snug ${f.tone === 'warn' ? '' : 'text-muted'}`}>
                  {f.el}
                </li>
              ))}
              {features.length === 0 && <li className="px-3 py-3 text-[12px] text-muted/60">—</li>}
            </ul>
          </Panel>
        </div>
      </div>

      {/* 相位区: 左=下三角矩阵, 右=相位清单 (填满宽, 不留大白; 爸爸: 对称满铺乱 → 用右侧列表补白) */}
      <Panel title={t('astro.res.aspects')}>
        <div className="flex items-center gap-3 border-b border-white/[0.05] px-3 py-2">
          <AspectLegend zhMode={zhMode} />
        </div>
        <div className="grid gap-4 p-3 lg:grid-cols-[minmax(0,max-content)_minmax(0,1fr)]">
          <div className="overflow-x-auto">
            <AspectGrid chart={chart} zhMode={zhMode} selected={selected} onPick={setSelected} bare hideLegend />
          </div>
          {/* 右列: 相位清单 — 与网格严格同源(十大+四轴); CSS 多列原生排版:
              列高硬锁=网格高(爸爸: 写不下就换右边去写, 列数可增加, 不靠估算) */}
          {(() => {
            const TYPE_ORDER: Record<string, number> = { conjunction: 1, sextile: 2, square: 3, trine: 4, opposition: 5, quincunx: 6 };
            const impMax = (a: { a: string; b: string }) => Math.max(impOf(a.a), impOf(a.b));
            const otherOf = (a: { a: string; b: string }, sel: string) => (a.a === sel ? a.b : a.a);
            // 同源过滤: 只列"网格参与点"(十大+四轴)之间的相位 — 小行星/虚点不画格也不列行
            const matPts = new Set(aspectMatrixPoints(chart))
            const sorted = chart.aspects
              .filter((x) => matPts.has(x.a) && matPts.has(x.b))
              .sort((x, y) => {
              const dImp = impMax(y) - impMax(x);
              if (dImp) return dImp;
              const dType = (TYPE_ORDER[x.type] ?? 9) - (TYPE_ORDER[y.type] ?? 9);
              if (dType) return dType;
              const xMain = otherOf(x, impOf(x.a) >= impOf(x.b) ? x.a : x.b);
              const yMain = otherOf(y, impOf(y.a) >= impOf(y.b) ? y.a : y.b);
              return impOf(yMain) - impOf(xMain);
            });
            // 按主星切组 (一组 = 组头 + 若干条相位; 整组不断列)
            const groups: { main: string; items: typeof sorted }[] = [];
            for (const a2 of sorted) {
              const main = impOf(a2.a) >= impOf(a2.b) ? a2.a : a2.b;
              const g = groups.find((x) => x.main === main);
              if (g) g.items.push(a2); else groups.push({ main, items: [a2] });
            }
            // 列高=网格真实高; 行高实测=按钮30+间距3, 组开销=标题20+组距4 → 按此精确分列 (flex, 列数不限)
            const nGrid = Math.min(chart.planets.length, 10) + (chart.angles.ascendant ? 4 : 0)
            const COL_H = nGrid * 42
            const gh = (g: { items: unknown[] }) => g.items.length * 33 + 24
            const jsCols: typeof groups[] = []
            for (const g of groups) {
              const cur = jsCols[jsCols.length - 1]
              const curH = cur ? cur.reduce((s, x) => s + gh(x), 0) : 0
              if (!cur || curH + gh(g) > COL_H) jsCols.push([g]); else cur.push(g)
            }
            return (
              <div className="flex w-full items-start gap-4 overflow-x-auto pb-1" data-testid="aspect-list">
                {jsCols.map((colG, ci) => (
                  <div key={ci} className="w-[218px] shrink-0">
                    {colG.map((g, gi) => (
                      <div key={g.main + gi} className="mb-1">
                        <div className="mb-0.5 flex items-center gap-1.5 pt-1 text-[10px] tracking-[0.18em] text-muted/60 uppercase">
                          <span className="w-4 text-center text-[11px]">{firstChar(g.main)}</span>
                          <span>{lang === 'ja' ? `${zhOf(g.main)}のアスペクト` : zhMode ? `${zhOf(g.main)} 相关相位` : `${g.main} aspects`}</span>
                        </div>
                        {g.items.map((a2, i) => {
                          const col = ASPECT_COLOR[a2.type] ?? '#9aa3b5'
                          return (
                            <div key={i} className="mb-[3px]">
                              <button
                                onClick={() => setSelected(selected === a2.a ? null : a2.a)}
                                className={`flex w-fit items-center gap-1.5 rounded-lg border-l-2 px-2 py-[5px] text-left text-[11.5px] transition-colors hover:bg-white/[0.04] ${selected === a2.a || selected === a2.b ? 'bg-white/[0.05]' : ''}`}
                                style={{ borderColor: col }}
                              >
                                <span className="w-4 shrink-0 text-center text-[12px]" style={{ color: col }}>{a2.symbol}</span>
                                <span className="shrink-0 text-[13px] text-frost/90" title={zhMode ? `${zhOf(a2.a)}–${zhOf(a2.b)}` : undefined}>{sSym(a2.a)}<span className="mx-0.5 text-muted/50">–</span>{sSym(a2.b)}</span>
                                <span className="shrink-0 text-[10px]" style={{ color: col }}>{lang === 'ja' ? a2.type : zhMode ? a2.typeZh : a2.type}</span>
                                {/* 实际夹角 + 偏差°′ (爸爸: 数字紧跟相位名, 不再推到行尾留大空档) */}
                                <span className="shrink-0 tabular-nums" style={{ color: col }}>
                                  {a2.actualAngle !== undefined && Math.abs(a2.actualAngle - a2.orb) > 0.01 && <span className="text-frost/80">{fmtOrbDms(a2.actualAngle)}</span>}
                                  {' '}±{fmtOrbDms(a2.orb)}{a2.applying === true ? 'A' : a2.applying === false ? 'S' : ''}
                                </span>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </Panel>

      {/* ---- 底部: 状态区 Tab (宫神星同款: 黄道状态/法达星限/小限法/福点·精神点 Aphesis; 天象盘 hideStatus 整块不渲染) ---- */}
      {!hideStatus && (
        <Panel title={lang === 'ja' ? '黄道ステータス' : zhMode ? '黄道状态' : 'Ecliptic Status'}>
          <div className="p-3">
            <StatusTabs chart={chart} zhMode={zhMode} selected={selected} onSelect={setSelected} />
          </div>
        </Panel>
      )}

      <p className="pt-1 text-center text-[11px] tracking-[0.15em] text-muted/60">
        {t('astro.res.nextHint')}
      </p>
    </div>
  );
}
