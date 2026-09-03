'use client';

import { useMemo } from 'react';
import { Spread } from '@/lib/tarot';

interface Props {
  spread: Spread;
}

/**
 * 简化牌阵示意图：按牌数画卡背小方块，标注序号。
 * 1: 居中 · 3: 一行 · 4: 2x2 · 5: 十字 · 6: 2x3 · 7: 3+4 · 10: 经典十字布局
 */
export default function SpreadDiagram({ spread }: Props) {
  const count = spread.count;

  const blocks = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  const cardSize = count >= 7 ? 28 : count >= 4 ? 34 : 42;

  const layout = useMemo(() => {
    switch (count) {
      case 1:
        return [{ x: 100, y: 100 }];
      case 3:
        return [
          { x: 40, y: 100 },
          { x: 100, y: 100 },
          { x: 160, y: 100 },
        ];
      case 4:
        return [
          { x: 60, y: 60 },
          { x: 140, y: 60 },
          { x: 60, y: 140 },
          { x: 140, y: 140 },
        ];
      case 5:
        return [
          { x: 100, y: 50 }, // 上
          { x: 50, y: 100 }, // 左
          { x: 100, y: 100 }, // 中心
          { x: 150, y: 100 }, // 右
          { x: 100, y: 150 }, // 下
        ];
      case 6:
        return [
          { x: 50, y: 70 }, { x: 100, y: 70 }, { x: 150, y: 70 },
          { x: 50, y: 140 }, { x: 100, y: 140 }, { x: 150, y: 140 },
        ];
      case 7:
        // 上3 下4
        return [
          { x: 50, y: 55 }, { x: 100, y: 55 }, { x: 150, y: 55 },
          { x: 38, y: 140 }, { x: 88, y: 140 }, { x: 138, y: 140 }, { x: 188, y: 140 },
        ];
      case 10:
        // 十字简化：左列4 中列5(十字) 右列1
        return [
          { x: 35, y: 50 }, { x: 35, y: 110 }, { x: 35, y: 170 }, { x: 35, y: 230 },
          { x: 105, y: 80 }, { x: 105, y: 130 }, { x: 105, y: 180 }, // 中心横竖（十字）
          { x: 85, y: 110 }, { x: 125, y: 150 }, // 十字交叉
          { x: 180, y: 140 },
        ];
      default:
        // 横排
        const w = 180;
        const startX = (200 - (cardSize * count) - (count - 1) * 6) / 2;
        return Array.from({ length: count }, (_, i) => ({ x: startX + i * (cardSize + 6), y: 100 }));
    }
  }, [count, cardSize]);

  return (
    <div className="w-full max-w-md mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-auto" aria-label="牌阵示意图">
        {/* 背景圆形 */}
        <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />

        {/* 卡牌方块 */}
        {layout.map((pos, i) => {
          const half = cardSize / 2;
          return (
            <g key={i}>
              <rect
                x={pos.x - half}
                y={pos.y - half * 1.5}
                width={cardSize}
                height={cardSize * 1.5}
                rx={3}
                fill="rgba(15,10,30,0.9)"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="0.8"
              />
              <rect
                x={pos.x - half + 2}
                y={pos.y - half * 1.5 + 2}
                width={cardSize - 4}
                height={cardSize * 1.5 - 4}
                rx={2}
                fill="url(#diag-pattern)"
              />
              <text
                x={pos.x}
                y={pos.y + 3}
                textAnchor="middle"
                fill="#d9d9d9"
                fontSize={count >= 7 ? 10 : 13}
                fontFamily="serif"
              >
                {i + 1}
              </text>
            </g>
          );
        })}

        <defs>
          <pattern id="diag-pattern" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="rgba(255,255,255,0.04)" />
            <circle cx="3" cy="3" r="0.5" fill="rgba(255,255,255,0.18)" />
          </pattern>
        </defs>
      </svg>
    </div>
  );
}