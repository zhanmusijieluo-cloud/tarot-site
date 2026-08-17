'use client';

import { useState } from 'react';
import { SPREADS, type SpreadType, shuffleDraw, generateOverallReading, type DrawnCard } from '@/lib/tarot';
import TarotCard from '@/components/TarotCard';
import StarsCanvas from '@/components/StarsCanvas';

export default function TarotApp() {
  const [page, setPage] = useState<'hero' | 'question' | 'reading'>('hero');
  const [selectedSpread, setSelectedSpread] = useState<SpreadType>('single');
  const [question, setQuestion] = useState('');
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());

  const currentSpread = SPREADS[selectedSpread];

  const handleStartReading = () => {
    const cards = shuffleDraw(currentSpread.count);
    setDrawnCards(cards);
    setRevealedIndices(new Set());
    setPage('reading');
  };

  const handleRevealCard = (index: number) => {
    if (!revealedIndices.has(index)) {
      const newSet = new Set(revealedIndices);
      newSet.add(index);
      setRevealedIndices(newSet);
    }
  };

  const handleRevealAll = () => {
    const allIndices = Array.from({ length: drawnCards.length }, (_, i) => i);
    allIndices.forEach((idx, i) => {
      setTimeout(() => handleRevealCard(idx), i * 200);
    });
  };

  const allRevealed = drawnCards.length > 0 && revealedIndices.size === drawnCards.length;

  const overallReading = drawnCards.length > 0 
    ? generateOverallReading(drawnCards, currentSpread.positions as readonly string[])
    : '';

  return (
    <div className="min-h-screen bg-[#0d0618] text-[#e8e0f0] font-serif relative overflow-x-hidden">
      <StarsCanvas />
      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center px-10 py-5 bg-gradient-to-b from-[#0d0618]/95 to-transparent">
        <div className="font-[Cinzel] text-[1.6rem] font-bold text-[#d4a843] tracking-[4px] drop-shadow-[0_0_20px_rgba(212,168,67,0.3)]">
          TAROT <span className="font-normal text-[#e8e0f0]">· 塔罗</span>
        </div>
        <ul className="flex gap-6 list-none">
          <li>
            <button 
              onClick={() => setPage('hero')}
              className="text-[#a89bbf] hover:text-[#d4a843] text-[0.9rem] tracking-[1px] transition-colors"
            >
              首页
            </button>
          </li>
          <li>
            <button 
              onClick={() => setPage('hero')}
              className="text-[#a89bbf] hover:text-[#d4a843] text-[0.9rem] tracking-[1px] transition-colors"
            >
              关于
            </button>
          </li>
        </ul>
      </nav>

      <div className="relative z-5 max-w-[1100px] mx-auto px-6">
        {/* Hero Section */}
        {page === 'hero' && (
          <section id="hero" className="min-h-[85vh] flex flex-col items-center justify-center text-center py-15 px-6">
            <div className="w-[120px] h-[120px] rounded-full bg-radial-gradient(circle at 35% 35%, #fff8dc, #d4a843 60%, #8b6914) shadow-[0_0_60px_rgba(212,168,67,0.3),0_0_120px_rgba(212,168,67,0.15)] mb-8 animate-[moonGlow_4s_ease-in-out_infinite]"></div>
            
            <h1 className="font-[Cinzel] text-[3.2rem] font-bold text-[#d4a843] tracking-[8px] mb-4 drop-shadow-[0_0_40px_rgba(212,168,67,0.3)] animate-[shimmer_3s_linear_infinite] bg-[linear-gradient(90deg,#d4a843,#f0d078,#d4a843)] bg-[length:200%_auto] bg-clip-text text-transparent">
              塔罗指引
            </h1>
            <p className="text-[1.15rem] text-[#a89bbf] tracking-[3px] mb-12">
              聆听宇宙的低语 · 洞见命运的轨迹
            </p>
            
            <button 
              onClick={() => setPage('question')}
              className="inline-block px-12 py-4 bg-gradient-to-r from-[#d4a843] to-[#b8860b] text-[#1a0a2e] font-[Cinzel] text-[1rem] font-bold tracking-[3px] border-none rounded-[50px] cursor-pointer transition-all hover:-translate-y-0.5 shadow-[0_4px_30px_rgba(212,168,67,0.4)]"
            >
              开始占卜
            </button>

            <div className="flex gap-10 mt-20 flex-wrap justify-center">
              {(Object.keys(SPREADS) as SpreadType[]).map((type) => (
                <div 
                  key={type}
                  onClick={() => { setSelectedSpread(type); setPage('question'); }}
                  className="text-center cursor-pointer transition-transform hover:-translate-y-2"
                >
                  <div className="w-[80px] h-[110px] bg-gradient-to-br from-[#2d1b4e] to-[#4a2c6e] border border-[rgba(212,168,67,0.3)] rounded-[8px] mx-auto mb-3 flex items-center justify-center text-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    {type === 'single' ? '🃏' : type === 'three' ? '✦' : '☽'}
                  </div>
                  <div className="text-[#f0d078] text-[0.95rem] tracking-[2px]">{SPREADS[type].name}</div>
                  <div className="text-[#a89bbf] text-[0.8rem] mt-1">
                    {type === 'single' ? '每日一句话' : type === 'three' ? '过去 · 现在 · 未来' : '深度全面解读'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Question Section */}
        {page === 'question' && (
          <section id="question-section" className="py-15 text-center">
            <h2 className="font-[Cinzel] text-[1.8rem] text-[#d4a843] tracking-[4px] mb-3">{currentSpread.name}</h2>
            <p className="text-[#a89bbf] mb-8">在心中默念你的问题，然后在下方输入（可留空直接抽牌）</p>
            
            <div className="max-w-[600px] mx-auto relative">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="例如：我最近的财运如何？这段感情会如何发展？"
                maxLength={100}
                className="w-full px-6 py-4 bg-[rgba(30,18,53,0.8)] border border-[rgba(212,168,67,0.3)] rounded-[12px] text-[#e8e0f0] text-[1rem] outline-none transition-all focus:border-[#d4a843] shadow-[0_0_20px_rgba(212,168,67,0.1)] placeholder:text-[#a89bbf]"
                onKeyDown={(e) => e.key === 'Enter' && handleStartReading()}
              />
            </div>
            
            <div className="mt-8 flex justify-center gap-4">
              <button 
                onClick={handleStartReading}
                className="px-10 py-3.5 bg-transparent border border-[#d4a843] text-[#d4a843] font-[Cinzel] text-[0.95rem] tracking-[3px] rounded-[50px] cursor-pointer transition-all hover:bg-[#d4a843] hover:text-[#1a0a2e] shadow-[0_0_30px_rgba(212,168,67,0.2)]"
              >
                ✨ 抽牌开始 ✨
              </button>
              <button 
                onClick={() => setPage('hero')}
                className="bg-none border-none text-[#a89bbf] cursor-pointer text-[0.85rem] mt-4"
              >
                ← 返回
              </button>
            </div>
          </section>
        )}

        {/* Reading Section */}
        {page === 'reading' && (
          <section id="reading-section" className="py-10 pb-20">
            <div className="section-header text-center mb-10">
              <h2 className="font-[Cinzel] text-[1.6rem] text-[#d4a843] tracking-[4px] mb-2">{currentSpread.name}</h2>
              <p className="text-[#a89bbf] italic text-[0.95rem]">
                {question ? `"${question}"` : '静待命运指引'}
              </p>
            </div>

            <div className="flex justify-center gap-6 flex-wrap mb-10 min-h-[200px] items-center">
              {drawnCards.map((card, i) => (
                <TarotCard
                  key={card.id}
                  card={card}
                  position={currentSpread.positions[i]}
                  isReversed={card.isReversed}
                  isFlipped={revealedIndices.has(i)}
                  onClick={() => handleRevealCard(i)}
                />
              ))}
            </div>

            <div className="text-center mb-8">
              <button
                onClick={handleRevealAll}
                disabled={allRevealed}
                className="px-10 py-3.5 bg-transparent border border-[#d4a843] text-[#d4a843] font-[Cinzel] text-[0.9rem] tracking-[3px] rounded-[50px] cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#d4a843] hover:text-[#1a0a2e] shadow-[0_0_30px_rgba(212,168,67,0.2)]"
              >
                {allRevealed ? '已全部翻开' : '翻开所有牌'}
              </button>
            </div>

            {allRevealed && (
              <div id="interpretation" className="mt-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {drawnCards.map((card, i) => (
                    <div 
                      key={card.id} 
                      className="fade-in p-7 bg-gradient-to-br from-[rgba(30,18,53,0.9)] to-[rgba(20,12,40,0.95)] border border-[rgba(212,168,67,0.2)] rounded-[16px] transition-all hover:border-[rgba(212,168,67,0.5)] shadow-[0_8px_40px_rgba(212,168,67,0.05)] hover:-translate-y-1"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-[56px] h-[72px] bg-gradient-to-br from-[#2d1b4e] to-[#4a2c6e] border border-[rgba(212,168,67,0.4)] rounded-[6px] flex items-center justify-center text-[1.8rem] flex-shrink-0">
                          {card.emoji}
                        </div>
                        <div>
                          <div className="font-[Cinzel] text-[#d4a843] text-[1rem] tracking-[2px]">
                            {card.name}
                            {card.isReversed && <span className="ml-2 px-2 py-0.5 bg-[rgba(255,107,107,0.15)] border border-[rgba(255,107,107,0.4)] rounded-[20px] text-[#ff6b6b] text-[0.7rem]">逆位</span>}
                          </div>
                          <div className="text-[#a89bbf] text-[0.75rem] mt-1">
                            {currentSpread.positions[i]} · {card.element}元素
                            {card.zodiac ? ` · ${card.zodiac}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-[0.9rem] leading-[1.8] text-[#e8e0f0]">
                        <div className="mb-3">
                          {card.keywords.map(k => (
                            <span key={k} className="inline-block px-3 py-1 bg-[rgba(212,168,67,0.15)] border border-[rgba(212,168,67,0.3)] rounded-[20px] text-[#f0d078] text-[0.7rem] mr-2 mb-2">
                              {k}
                            </span>
                          ))}
                        </div>
                        <p>{card.isReversed ? card.isReversed : card.upright}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-8 bg-gradient-to-br from-[rgba(45,27,78,0.6)] to-[rgba(20,12,40,0.8)] border border-[rgba(212,168,67,0.25)] rounded-[16px]">
                  <h3 className="font-[Cinzel] text-[#d4a843] text-[1.2rem] tracking-[3px] mb-4">✦ 整体解读 ✦</h3>
                  <p className="text-[0.95rem] leading-[1.9] text-[#e8e0f0]" dangerouslySetInnerHTML={{ __html: overallReading }} />
                </div>

                <button
                  onClick={() => setPage('hero')}
                  className="block mx-auto mt-8 px-9 py-3.5 bg-transparent border border-[rgba(212,168,67,0.5)] text-[#d4a843] font-[Cinzel] text-[0.9rem] tracking-[2px] rounded-[50px] cursor-pointer transition-all hover:bg-[#d4a843] hover:text-[#1a0a2e]"
                >
                  ✦ 重新占卜 ✦
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      <footer className="relative z-5 text-center py-10 text-[#a89bbf] text-[0.8rem] border-t border-[rgba(212,168,67,0.1)] mt-15">
        <p>TAROT · 塔罗 — 神秘指引 | 本工具仅供娱乐与自我探索使用</p>
        <p className="mt-2 opacity-60">命运掌握在你手中，塔罗只是镜子，照见你内心已有的答案。</p>
      </footer>
    </div>
  );
}
