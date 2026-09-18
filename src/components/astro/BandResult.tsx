'use client';

// ============================================================
// 法达盘 / 小限盘 (爸爸: 盘外圈挂环, 像测测那样)
// 法达环: 12点=0岁 顺时针 75年=360°, 段=大运(年龄标注), 段内=子段主星符号
// 小限环: 每宫一段(按宫位实际跨度), 段内=宫头星座庙主星单字, 当前年宫高亮
// ============================================================
import React from 'react';
import { useI18n } from '@/i18n';
import ChartWheel, { type VChart } from '@/components/astro/ChartWheel';
import NatalCard from '@/components/astro/NatalCard';
import { firdariaTable, SIGN_RULER } from '@/lib/astro/timing';

const LORD_ZH: Record<string, string> = { Sun: '太阳', Moon: '月亮', Mercury: '水星', Venus: '金星', Mars: '火星', Jupiter: '木星', Saturn: '土星', NorthNode: '北交', SouthNode: '南交' };
const LORD_JA: Record<string, string> = { Sun: '太陽', Moon: '月', Mercury: '水星', Venus: '金星', Mars: '火星', Jupiter: '木星', Saturn: '土星', NorthNode: 'ドラゴンヘッド', SouthNode: 'ドラゴンテイル' };
const LORD_SYM: Record<string, string> = { Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄', NorthNode: '☊', SouthNode: '☋' };
const SIGN_ZH: Record<string, string> = { Aries: '白羊', Taurus: '金牛', Gemini: '双子', Cancer: '巨蟹', Leo: '狮子', Virgo: '处女', Libra: '天秤', Scorpio: '天蝎', Sagittarius: '射手', Capricorn: '摩羯', Aquarius: '水瓶', Pisces: '双鱼' };
const SIGN_JA: Record<string, string> = { Aries: '牡羊座', Taurus: '牡牛座', Gemini: '双子座', Cancer: '蟹座', Leo: '獅子座', Virgo: '乙女座', Libra: '天秤座', Scorpio: '蠍座', Sagittarius: '射手座', Capricorn: '山羊座', Aquarius: '水瓶座', Pisces: '魚座' };

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-black/20">
      <p className="border-b border-white/[0.06] px-3 py-2 text-[10px] tracking-[0.25em] text-muted uppercase">{title}</p>
      {children}
    </section>
  );
}

export default function BandResult({ chart, zhMode, kind, cornerActions, onBandDate }: {
  chart: VChart; zhMode: boolean; kind: 'firdaria' | 'profection';
  cornerActions?: React.ReactNode;
  /** 外环分段点击 → 跳转排盘到该段起始日 (爱星盘同款交互) */
  onBandDate?: (year: number, month: number, day: number) => void;
}) {
  const { lang } = useI18n();
  const curAgeD = (Date.now() - Date.UTC(chart.input.year, chart.input.month - 1, chart.input.day)) / (365.2425 * 86400000);
  const curAge = Math.max(0, Math.floor(curAgeD));

  let body: React.ReactNode = null;
  let note = '';
  if (kind === 'firdaria') {
    const sun = chart.planets.find((p) => p.name === 'Sun');
    const dayChart = !!sun?.house && sun.house >= 7;
    const all = firdariaTable(dayChart, chart.input.year, chart.input.month, chart.input.day, 1);
    const mains = all.filter((r) => r.sub === r.lord || r.sub === null);
    const curMain = mains.find((m) => curAgeD >= m.startAge && curAgeD < m.endAge);
    const curSub = all.find((r) => curAgeD >= r.startAge && curAgeD < r.endAge);
    note = lang === 'ja'
      ? `ファルダリア（${dayChart ? '昼生盤' : '夜生盤'}序）— 外環: 12時=0歳から時計回り, 75年で1周; 各区=1大運 (開始年併記), 区内記号=7つの子期主星 (第1子期=主星自身, カルデアン順で輪転); 交点区は細分せず`
      : zhMode
      ? `法达星限 (${dayChart ? '昼生盘' : '夜生盘'}序) — 外环: 12点=0岁起顺时针, 75 年一周; 每段=一个大运 (标注起年), 段内符号=7 个子段主星 (第1子段=主星自己, 迦勒底序轮转); 交点段不细分`
      : `Firdaria (${dayChart ? 'diurnal' : 'nocturnal'}) — outer ring: 0 at 12 o'clock, clockwise, 75-year cycle; each arc = one period (with start age), glyphs = 7 sub-periods`;
    body = (
      <div className="grid gap-2 p-3 text-[12.5px] sm:grid-cols-2">
        <div className="flex items-center gap-2 text-frost/85">
          <span className="text-muted/70">{lang === 'ja' ? '現在の大運' : zhMode ? '当前大运' : 'Period'}</span>
          <span className="text-[15px] text-accent">{LORD_SYM[curMain?.lord ?? ''] ?? ''}</span>
          {lang === 'ja' ? (LORD_JA[curMain?.lord ?? ''] ?? '—') : zhMode ? (LORD_ZH[curMain?.lord ?? ''] ?? '—') : (curMain?.lord ?? '—')}
          <span className="text-muted">{curMain ? `${curMain.startAge}–${curMain.endAge} ${lang === 'ja' ? '歳' : zhMode ? '岁' : 'y'}` : ''}</span>
        </div>
        <div className="flex items-center gap-2 text-frost/85">
          <span className="text-muted/70">{lang === 'ja' ? '現在のサブ' : zhMode ? '当前子段' : 'Sub'}</span>
          <span className="text-[15px] text-accent">{LORD_SYM[curSub?.lord ?? ''] ?? ''}</span>
          {curSub?.sub && curSub.sub !== curSub.lord && <span className="text-[15px] text-frost/70">{LORD_SYM[curSub.sub] ?? ''}</span>}
          <span className="text-muted">{curSub ? `${String(curSub.y)}-${String(curSub.m).padStart(2, '0')}-${String(curSub.d).padStart(2, '0')} ${lang === 'ja' ? '〜' : zhMode ? '起' : ''}` : ''}</span>
        </div>
      </div>
    );
  } else {
    const ascSignIdx = chart.angles.ascendant ? Math.floor((((chart.angles.ascendant.longitude % 360) + 360) % 360) / 30) : 0;
    const house = (curAge % 12) + 1;
    const signIdx = (ascSignIdx + curAge) % 12;
    const lord = SIGN_RULER[signIdx];
    const signName = Object.keys(SIGN_ZH)[signIdx];
    note = lang === 'ja'
      ? `プロフェクション — 外環: 各区=1ハウス (実際のハウス幅), 区内1文字=そのハウス頭サインのドミサイル主星; 出生年=1ハウス, 毎年誕生日に1ハウス進む; 現在の年ハウスを強調`
      : zhMode
      ? `小限法 — 外环: 每段=一宫 (按宫位实际跨度), 段内单字=该宫宫头星座的庙主星; 出生年=1宫, 每年生日推一宫; 当前年宫位高亮`
      : `Annual profections — outer ring: one arc per house; single character = domicile ruler of the house sign; current year highlighted`;
    body = (
      <div className="grid gap-2 p-3 text-[12.5px] sm:grid-cols-2">
        <div className="flex items-center gap-2 text-frost/85">
          <span className="text-muted/70">{lang === 'ja' ? '現在の年齢' : zhMode ? '当前年龄' : 'Age'}</span>
          <span className="tabular-nums">{curAge} {lang === 'ja' ? '歳' : zhMode ? '岁' : 'y'}</span>
        </div>
        <div className="flex items-center gap-2 text-frost/85">
          <span className="text-muted/70">{lang === 'ja' ? '年のハウス' : zhMode ? '当前年宫' : 'House'}</span>
          <span className="tabular-nums text-accent">{house} {lang === 'ja' ? 'ハウス' : zhMode ? '宫' : ''} · {lang === 'ja' ? (SIGN_JA[signName] ?? signName) : zhMode ? (SIGN_ZH[signName] ?? signName) : signName} · {LORD_SYM[lord] ?? ''} {lang === 'ja' ? (LORD_JA[lord] ?? lord) : zhMode ? (LORD_ZH[lord] ?? lord) : lord}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ChartWheel
        chart={chart}
        zhMode={zhMode}
        viewModes={['classic'] as const}
        outerBand={kind}
        onBandDate={onBandDate}
        cornerSlot={
          <div className="pointer-events-auto flex w-[248px] flex-col gap-1.5">
            <NatalCard chart={chart} zhMode={zhMode} />
            {cornerActions}
          </div>
        }
      />
      <Panel title={kind === 'firdaria' ? (lang === 'ja' ? 'ファルダリア' : zhMode ? '法达盘' : 'Firdaria') : (lang === 'ja' ? 'プロフェクション' : zhMode ? '小限盘' : 'Profection')}>
        <p className="border-b border-white/[0.04] px-3 py-2 text-[10.5px] leading-relaxed text-muted/70">{note}</p>
        {body}
      </Panel>
    </div>
  );
}
