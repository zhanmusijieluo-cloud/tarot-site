'use client';

import { useEffect, useRef } from 'react';
import { TAROT_DECK } from '@/lib/tarot';

const TAP_SLOP = 6;
const MAX_ZOOM = 1.22;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

interface CardSpec {
  id: number; // 打乱后的真实牌 id（0-77）
  layer: 'back' | 'mid' | 'front';
  t: number;
  yBase: number;
  amp: number;
  width: number;
  alpha: number;
  scale: number;
  z: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  phase: number;
  floatX: number;
  floatY: number;
  speed: number;
}

interface TarotSceneProps {
  maxSelect: number;
  selectedIds: number[];
  onToggleCard: (id: number) => void;
  disabled?: boolean;
}

function shuffleIds(totalCards: number): number[] {
  return [...TAROT_DECK].sort(() => Math.random() - 0.5).slice(0, totalCards).map(c => c.id);
}

function buildCards(totalCards: number, isMobile: boolean, ids: number[]): CardSpec[] {
  const random = seeded(0x79657969);
  const cards: CardSpec[] = [];
  const yNudge: Record<string, number[]> = {
    back: [-0.038, 0.018, -0.026, 0.038, -0.046, 0.006, 0.03, -0.018],
    mid: [0.024, -0.034, 0.006, 0.044, -0.018, 0.032, -0.042, 0.012],
    front: [-0.026, 0.042, -0.012, 0.028, -0.038, 0.016],
  };
  const bands = [
    { count: 32, layer: 'back' as const, y: 0.04, amp: 0.042, width: 40, alpha: 0.68, scale: 0.94, z: -190, speed: 0.24, offset: 0.012 },
    { count: 30, layer: 'mid' as const, y: 0.28, amp: 0.058, width: 44, alpha: 0.84, scale: 0.96, z: -36, speed: 0.31, offset: 0.055 },
    { count: 16, layer: 'front' as const, y: 0.5, amp: 0.038, width: 49, alpha: 0.96, scale: 0.99, z: 76, speed: 0.36, offset: 0.115 },
  ];
  let deckIndex = 0;

  for (const band of bands) {
    for (let i = 0; i < band.count; i += 1) {
      const t = ((i + 0.5 + random() * 0.1) / band.count + band.offset) % 1;
      const stagger = yNudge[band.layer][i % yNudge[band.layer].length];
      const sideBias = band.layer === 'front' ? (i % 3 - 1) * 0.014 : 0;
      const width = band.width + (random() - 0.5) * (band.layer === 'front' ? 4 : 3);
      const tilt = (random() - 0.5) * (band.layer === 'back' ? 7 : 9);
      const side = random() < 0.16 ? (random() < 0.5 ? -1 : 1) : 0;
      cards.push({
        id: ids[deckIndex % totalCards],
        layer: band.layer,
        t,
        yBase: band.y + stagger + sideBias,
        amp: band.amp * (0.82 + random() * 0.28),
        width: Math.max(28, width),
        alpha: band.alpha,
        scale: band.scale + (random() - 0.5) * 0.05,
        z: band.z + (random() - 0.5) * (band.layer === 'front' ? 46 : 70),
        rotateX: (random() - 0.5) * 3,
        rotateY: side ? side * (12 + random() * 10) : (random() - 0.5) * 10,
        rotateZ: tilt,
        phase: random() * Math.PI * 2,
        floatX: (random() - 0.5) * (isMobile ? 10 : 14),
        floatY: 4 + random() * 5,
        speed: band.speed * (0.86 + random() * 0.22),
      });
      deckIndex += 1;
    }
  }

  return cards;
}

class TarotSceneEngine {
  container: HTMLElement;
  totalCards: number;
  maxSelect: number;
  selectedIds: Set<number>;
  onToggleCard: (id: number) => void;
  disabled: boolean;
  isMobile: boolean;
  destroyed = false;
  frame = 0;
  startedAt = performance.now();
  pointer: { id: number; startX: number; startY: number; lastX: number; lastY: number; moved: boolean } | null = null;
  activePointers = new Map<number, { x: number; y: number }>();
  pinch: { distance: number; zoom: number } | null = null;
  // 最近一次被识别为"拖动"的时间戳，用于 click 兜底时过滤掉拖动后误触发的 click
  lastDragAt = 0;
  offset = { x: 0, y: 0 };
  targetOffset = { x: 0, y: 0 };
  zoom = 1;
  targetZoom = 1;
  cards: CardSpec[];
  root: HTMLDivElement;
  field: HTMLDivElement;
  nodes: HTMLButtonElement[] = [];

  constructor(opts: { container: HTMLElement; totalCards: number; maxSelect: number; selectedIds: number[]; onToggleCard: (id: number) => void }) {
    this.container = opts.container;
    this.totalCards = opts.totalCards;
    this.maxSelect = opts.maxSelect;
    this.selectedIds = new Set(opts.selectedIds);
    this.onToggleCard = opts.onToggleCard;
    this.disabled = false;
    this.isMobile = window.matchMedia('(max-width: 767px)').matches;
    this.cards = buildCards(opts.totalCards, this.isMobile, shuffleIds(opts.totalCards));

    this.root = document.createElement('div');
    this.root.className = 'tarot-scene-root';
    this.field = document.createElement('div');
    this.field.className = 'tarot-scene-field';
    this.root.appendChild(this.field);
    this.container.appendChild(this.root);

    this.nodes = this.cards.map(card => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tarot-scene-card';
      button.style.setProperty('--card-w', `${card.width}px`);
      button.style.setProperty('--card-alpha', String(card.alpha));
      // 鎏金流光相位：每张卡错开，避免全体同步闪烁
      button.style.setProperty('--gilt-phase', `${(card.id % 12) * -0.55}s`);
      button.setAttribute('aria-label', `第 ${card.id + 1} 张牌背`);
      button.dataset.deckId = String(card.id);
      // 鎏金卡背图层
      const giltImg = document.createElement('img');
      giltImg.src = '/cards/card-back-new.webp';
      giltImg.alt = '';
      giltImg.draggable = false;
      giltImg.className = 'tarot-scene-card-img';
      button.appendChild(giltImg);
      // 鎏金流光特效层（扫过的高光）
      const giltSheen = document.createElement('span');
      giltSheen.className = 'tarot-scene-card-sheen';
      giltSheen.setAttribute('aria-hidden', 'true');
      button.appendChild(giltSheen);
      // 在 button 上直接绑定 click（最稳，不依赖冒泡与事件代理）
      button.addEventListener('click', (e) => this.onCardClick(e as MouseEvent, card.id));
      this.field.appendChild(button);
      return button;
    });

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onCardClick = this.onCardClick.bind(this);
    this.onRootClick = this.onRootClick.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onResize = this.onResize.bind(this);
    this.animate = this.animate.bind(this);

    this.root.addEventListener('pointerdown', this.onPointerDown);
    this.root.addEventListener('pointermove', this.onPointerMove);
    this.root.addEventListener('pointerup', this.onPointerUp);
    this.root.addEventListener('pointercancel', this.onPointerUp);
    // 兜底：root 上也监听 click（处理 button 子元素外包了其他元素的情况）
    this.root.addEventListener('click', this.onRootClick, true);
    this.root.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('resize', this.onResize);
  }

  init() {
    this.setSelected(Array.from(this.selectedIds));
    this.layout(0, 1);
    this.frame = requestAnimationFrame(this.animate);
    return this;
  }

  getBounds() {
    return {
      width: Math.max(1, this.root.clientWidth),
      height: Math.max(1, this.root.clientHeight),
    };
  }

  layout(elapsed: number, damping: number) {
    const { width, height } = this.getBounds();
    this.offset.x += (this.targetOffset.x - this.offset.x) * damping;
    this.offset.y += (this.targetOffset.y - this.offset.y) * damping;
    this.zoom += (this.targetZoom - this.zoom) * damping;

    const left = -width * 1.92;
    const span = width * 4.85;
    const safeTop = this.isMobile ? 18 : 14;
    const safeBottom = height - (this.isMobile ? 18 : 16);
    // 随场景高度自动放大牌尺寸（高度 745px 时约 1.69 倍，让放大后的场景不显稀疏）
    const sizeScale = clamp(height / 440, 0.85, 2.1);
    this.cards.forEach((card, index) => {
      const node = this.nodes[index];
      const flow = (card.t - elapsed * 0.0021 + 1) % 1;
      const float = Math.sin(elapsed * card.speed * 0.2 + card.phase) * 0.006;
      const path = (flow + float + 1) % 1;
      const x = left + path * span + this.offset.x;
      const curve = Math.sin(path * Math.PI * 2.04 + card.phase * 0.18);
      let y = clamp(
        card.yBase * height + curve * card.amp * height +
          Math.sin(elapsed * 0.32 + card.phase) * card.floatY +
          this.offset.y,
        safeTop,
        safeBottom
      );
      const lift = this.selectedIds.has(card.id) ? -10 : 0;
      const selectedScale = this.selectedIds.has(card.id) ? 1.06 : 1;
      const zoomDelta = this.zoom - 1;
      const zoomWeight = card.layer === 'back' ? 1.62 : card.layer === 'mid' ? 1.18 : 0.72;
      const layerZoom = clamp(1 + zoomDelta * zoomWeight, 0.76, card.layer === 'front' ? 1.18 : 1.58);
      const widthZoom = clamp(
        1 + Math.max(0, zoomDelta) * (card.layer === 'back' ? 0.7 : card.layer === 'mid' ? 0.22 : 0),
        1,
        card.layer === 'back' ? 1.32 : card.layer === 'mid' ? 1.1 : 1
      );
      const s = card.scale * layerZoom * selectedScale;
      const z = card.z + zoomDelta * (card.layer === 'back' ? 230 : card.layer === 'mid' ? 150 : 76);
      const alphaLift = Math.max(0, zoomDelta) * (card.layer === 'back' ? 0.34 : card.layer === 'mid' ? 0.16 : 0.04);
      const visualH = card.width * sizeScale * widthZoom * s * 1.5;
      y = clamp(y, safeTop, safeBottom - visualH * 0.72);
      node.style.setProperty('--x', `${x}px`);
      node.style.setProperty('--y', `${y + lift}px`);
      node.style.setProperty('--z', `${z}px`);
      node.style.setProperty('--s', String(s));
      node.style.setProperty('--card-w', `${card.width * sizeScale * widthZoom}px`);
      node.style.setProperty('--card-alpha', String(clamp(card.alpha + alphaLift, card.alpha, 0.98)));
      node.style.setProperty('--rx', `${card.rotateX + Math.sin(elapsed * 0.38 + card.phase) * 1.4}deg`);
      node.style.setProperty('--ry', `${card.rotateY + Math.cos(elapsed * 0.31 + card.phase) * 2.2}deg`);
      node.style.setProperty('--rz', `${card.rotateZ + Math.sin(elapsed * 0.27 + card.phase) * 1.8}deg`);
      node.style.zIndex = String(Math.round(1000 + z));
      node.style.pointerEvents = node.disabled ? 'none' : 'auto';
    });
  }

  animate(now: number) {
    if (this.destroyed) return;
    this.frame = requestAnimationFrame(this.animate);
    const elapsed = (now - this.startedAt) / 1000;
    this.layout(elapsed, 0.09);
  }

  onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    // 注意：触屏（touch）这里【不要】调用 event.preventDefault()，
    // 否则浏览器会抑制后续 click 事件生成，导致点牌失灵。
    // 触屏的滚动/双指缩放已由 CSS touch-action:none 阻止，无需 JS 干预。
    if (event.pointerType === 'mouse') {
      event.preventDefault(); // 仅鼠标需要阻止原生拖拽/选字
    }
    this.root.setPointerCapture?.(event.pointerId);
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.activePointers.size === 2) {
      const points = Array.from(this.activePointers.values());
      this.pinch = {
        distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
        zoom: this.targetZoom,
      };
      this.pointer = null;
      return;
    }
    if (event.isPrimary) {
      this.pointer = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        moved: false,
      };
    }
  }

  onPointerMove(event: PointerEvent) {
    if (this.activePointers.has(event.pointerId)) {
      this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (this.pinch && this.activePointers.size >= 2) {
      event.preventDefault();
      const points = Array.from(this.activePointers.values()).slice(0, 2);
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (this.pinch.distance > 1) {
        this.targetZoom = clamp(this.pinch.zoom * (distance / this.pinch.distance), 0.78, MAX_ZOOM);
      }
      return;
    }
    if (!this.pointer || this.pointer.id !== event.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - this.pointer.lastX;
    const dy = event.clientY - this.pointer.lastY;
    this.pointer.lastX = event.clientX;
    this.pointer.lastY = event.clientY;
    if (Math.hypot(event.clientX - this.pointer.startX, event.clientY - this.pointer.startY) > TAP_SLOP) {
      this.pointer.moved = true;
    }
    if (!this.pointer.moved) return;
    const { width } = this.getBounds();
    this.targetOffset.x = clamp(this.targetOffset.x + dx * 1.35, -width * 1.7, width * 1.7);
    this.targetOffset.y = clamp(this.targetOffset.y + dy * 0.45, -58, 58);
  }

  onPointerUp(event: PointerEvent) {
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size < 2) this.pinch = null;
    if (!this.pointer || this.pointer.id !== event.pointerId) return;
    const wasDrag = this.pointer.moved;
    this.root.releasePointerCapture?.(event.pointerId);
    this.pointer = null;
    // 拖动后标记一下时间戳，click 兜底时跳过（防止浏览器在 drag-end 仍派发 click）
    if (wasDrag) this.lastDragAt = performance.now();
  }

  // click 兜底：处理真实点击/触屏 tap/自动化工具派发的 click
  onCardClick(event: MouseEvent, cardId: number) {
    if (this.disabled) return;
    // 拖动刚结束（80ms 内）→ 视为 drag 末端，忽略
    if (performance.now() - this.lastDragAt < 80) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.onToggleCard(cardId);
  }

  // root 上的兜底（处理 button 被包一层的情况）：根据事件坐标找最近牌背
  onRootClick(event: MouseEvent) {
    if (this.disabled) return;
    if (performance.now() - this.lastDragAt < 80) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    // 优先用 DOM closest；触屏上 setPointerCapture 会把 click 目标重定向到 root，
    // 此时 closest 找不到牌背，改用坐标拾取兜底。
    const target = (event.target as Element)?.closest?.('.tarot-scene-card') as HTMLElement | null;
    const deckId = target
      ? Number(target.dataset.deckId)
      : Number(this.pickCardAt(event.clientX, event.clientY)?.dataset.deckId);
    if (!Number.isFinite(deckId) || deckId < 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.onToggleCard(deckId);
  }

  pickCardAt(clientX: number, clientY: number): HTMLButtonElement | null {
    let best: HTMLButtonElement | null = null;
    let bestZ = -Infinity;
    for (const node of this.nodes) {
      if (node.disabled || node.style.pointerEvents === 'none') continue;
      const rect = node.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) continue;
      const z = Number(node.style.zIndex || 0);
      if (z > bestZ) {
        bestZ = z;
        best = node;
      }
    }
    return best;
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    this.targetZoom = clamp(this.targetZoom + (event.deltaY > 0 ? -0.07 : 0.07), 0.78, MAX_ZOOM);
  }

  onResize() {
    this.layout((performance.now() - this.startedAt) / 1000, 1);
  }

  setSelected(selectedIds: number[]) {
    this.selectedIds = new Set(selectedIds || []);
    this.nodes.forEach(node => {
      const deckId = Number(node.dataset.deckId);
      const selected = this.selectedIds.has(deckId);
      node.classList.toggle('selected', selected);
      node.disabled = (this.selectedIds.size >= this.maxSelect && !selected) || this.disabled;
    });
  }

  setMaxSelect(n: number) {
    this.maxSelect = n;
    this.nodes.forEach(node => {
      const deckId = Number(node.dataset.deckId);
      const selected = this.selectedIds.has(deckId);
      node.disabled = (this.selectedIds.size >= this.maxSelect && !selected) || this.disabled;
    });
  }

  setDisabled(v: boolean) {
    this.disabled = v;
    this.nodes.forEach(node => {
      const deckId = Number(node.dataset.deckId);
      const selected = this.selectedIds.has(deckId);
      node.disabled = (this.selectedIds.size >= this.maxSelect && !selected) || v;
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.root.removeEventListener('pointerdown', this.onPointerDown);
    this.root.removeEventListener('pointermove', this.onPointerMove);
    this.root.removeEventListener('pointerup', this.onPointerUp);
    this.root.removeEventListener('pointercancel', this.onPointerUp);
    this.root.removeEventListener('click', this.onRootClick, true);
    this.root.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('resize', this.onResize);
    this.root.remove();
  }
}

/**
 * 3D 漂浮牌阵 TarotScene：
 * - 78 张卡背分为前/中/后 3 层，在 3D 空间（perspective 900px）中无限循环流动
 * - 拖动平移（横向跟随 + 纵向微调），双指/滚轮缩放
 * - 点选牌背（TAP_SLOP 容差区分拖拽与点击），选中雾粉光环高亮
 * - 牌序打乱，卡背无牌名
 */
export default function TarotScene({ maxSelect, selectedIds, onToggleCard, disabled }: TarotSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TarotSceneEngine | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const engine = new TarotSceneEngine({
      container,
      totalCards: 78,
      maxSelect,
      selectedIds,
      onToggleCard,
    });
    engine.init();
    engineRef.current = engine;
    return () => engine.destroy();
    // 只初始化一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setSelected(selectedIds);
  }, [selectedIds]);

  useEffect(() => {
    engineRef.current?.setMaxSelect(maxSelect);
  }, [maxSelect]);

  useEffect(() => {
    engineRef.current?.setDisabled(!!disabled);
  }, [disabled]);

  return <div ref={containerRef} className="tarot-scene-root" />;
}
