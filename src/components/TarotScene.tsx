'use client';

import { useEffect, useRef } from 'react';
import { TAROT_DECK } from '@/lib/tarot';
import { useI18n } from '@/i18n';

const TAP_SLOP = 6;
const MAX_ZOOM = 1.22;
/** 系统建议的最小可点目标边长（触屏拾取用，见 pickCardAt） */
const MIN_TAP_PX = 44;

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
  /** 洗牌时一次定好的朝向，客户点到即揭晓；雷诺曼恒为 false */
  reversed: boolean;
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
  /** 点中牌背即揭晓该张牌：reversed 是洗牌时定好的朝向，翻牌阶段只负责展示 */
  onToggleCard: (id: number, reversed: boolean) => void;
  disabled?: boolean;
  /** 牌组: tarot=78张(id 0-77, 默认) / lenormand=36张(id 1-36)。控制漂浮牌池与洗牌范围 */
  deck?: 'tarot' | 'lenormand';
}

/**
 * 洗牌：一次真·洗牌应该同时固定「位置」和「朝向」，所以这里洗出的是 {id, reversed} 序列，
 * 客户点到哪个牌背就同时拿到那张牌和那个朝向；翻牌只是揭示，不再重掷。
 * 用 Fisher-Yates——`sort(() => Math.random() - 0.5)` 分布是偏的（实测前排命中率 8%~26%，
 * 而公平值是 16/78≈20.5%），会让小 id 的大阿卡纳系统性地沉进最难点的后层。
 */
interface DeckSlot {
  id: number;
  reversed: boolean;
}

function shuffleDeck(totalCards: number, deck: 'tarot' | 'lenormand' = 'tarot'): DeckSlot[] {
  const ids = deck === 'lenormand'
    ? Array.from({ length: 36 }, (_, i) => i + 1) // 雷诺曼 id 1~36
    : TAROT_DECK.map((c) => c.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  // 雷诺曼无逆位
  return ids.slice(0, totalCards).map((id) => ({ id, reversed: deck === 'lenormand' ? false : Math.random() < 0.5 }));
}

function buildCards(totalCards: number, isMobile: boolean, slots: DeckSlot[], deck: 'tarot' | 'lenormand' = 'tarot'): CardSpec[] {
  const random = seeded(0x79657969);
  const cards: CardSpec[] = [];
  const yNudge: Record<string, number[]> = {
    back: [-0.038, 0.018, -0.026, 0.038, -0.046, 0.006, 0.03, -0.018],
    mid: [0.024, -0.034, 0.006, 0.044, -0.018, 0.032, -0.042, 0.012],
    front: [-0.026, 0.042, -0.012, 0.028, -0.038, 0.016],
  };
  // 三层数量按牌组规模等比缩放: 塔罗78 → 32/30/16; 雷诺曼36 → 15/14/7
  // (节点数必须恰好等于牌数, 否则取模复用会让同一张牌在场景中重复出现)
  const ln = deck === 'lenormand';
  const nBack = Math.max(1, Math.round((totalCards * 32) / 78));
  const nMid = Math.max(1, Math.round((totalCards * 30) / 78));
  const nFront = Math.max(1, totalCards - nBack - nMid);
  const bands = ln
    ? [
        // 雷诺曼: 三层纵向整体下移居中(牌海重心≈视口中线), 漂移带更窄(同屏密度≈塔罗)
        { count: nBack, layer: 'back' as const, y: 0.18, amp: 0.04, width: 40, alpha: 0.68, scale: 0.94, z: -190, speed: 0.24, offset: 0.012 },
        { count: nMid, layer: 'mid' as const, y: 0.42, amp: 0.055, width: 44, alpha: 0.84, scale: 0.96, z: -36, speed: 0.31, offset: 0.055 },
        { count: nFront, layer: 'front' as const, y: 0.64, amp: 0.036, width: 49, alpha: 0.96, scale: 0.99, z: 76, speed: 0.36, offset: 0.115 },
      ]
    : [
        { count: nBack, layer: 'back' as const, y: 0.04, amp: 0.042, width: 40, alpha: 0.68, scale: 0.94, z: -190, speed: 0.24, offset: 0.012 },
        { count: nMid, layer: 'mid' as const, y: 0.28, amp: 0.058, width: 44, alpha: 0.84, scale: 0.96, z: -36, speed: 0.31, offset: 0.055 },
        { count: nFront, layer: 'front' as const, y: 0.5, amp: 0.038, width: 49, alpha: 0.96, scale: 0.99, z: 76, speed: 0.36, offset: 0.115 },
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
      const slot = slots[deckIndex % slots.length];
      cards.push({
        id: slot.id,
        reversed: slot.reversed,
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

/** 逐节点缓存上次写进 DOM 的值: 只有真变化的属性才碰 style, 避免每帧全量重算样式 */
interface CardCache {
  alpha: number;
  w: number;
  zIndex: number;
  sel: boolean;
  hidden: boolean;
}

class TarotSceneEngine {
  container: HTMLElement;
  totalCards: number;
  deck: 'tarot' | 'lenormand';
  maxSelect: number;
  selectedIds: Set<number>;
  onToggleCard: (id: number, reversed: boolean) => void;
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
  /**
   * 视口几何量: 只与容器尺寸/牌数有关, 与帧时间无关 —— 全部预算好缓存起来。
   * 原来 layout() 每帧读 root.clientWidth 并每帧重算这些量, 读操作会把上一帧的
   * style 写入强制刷新成一次同步重排(78 节点 * 每帧), 是移动端卡顿的第一道来源。
   */
  viewW = 1;
  viewH = 1;
  sizeScale = 1;
  span = 1;
  bandLeft = 0;
  safeTop = 14;
  safeBottom = 1;
  private cache: CardCache[] = [];
  private geometryDirty = true;
  private resizeObserver: ResizeObserver | null = null;
  /** 交互中标记的收尾计时器（抬手后延迟摘掉，别在一次拖拽里反复起停） */
  private interactTimer: ReturnType<typeof setTimeout> | null = null;
  /** 当前按住的牌背 + 摘掉 pressed 的计时器 */
  private pressedNode: HTMLButtonElement | null = null;
  private pressedTimer: ReturnType<typeof setTimeout> | null = null;
  /** 牌背无障碍标签文案（按屏内槽位取，语言切换时由 setCardLabelOf 重刷） */
  cardLabelOf: (slot: number) => string;

  constructor(opts: { container: HTMLElement; totalCards: number; maxSelect: number; selectedIds: number[]; onToggleCard: (id: number, reversed: boolean) => void; deck?: 'tarot' | 'lenormand'; cardLabelOf?: (slot: number) => string }) {
    this.container = opts.container;
    this.totalCards = opts.totalCards;
    this.deck = opts.deck || 'tarot';
    this.maxSelect = opts.maxSelect;
    this.selectedIds = new Set(opts.selectedIds);
    this.onToggleCard = opts.onToggleCard;
    this.cardLabelOf = opts.cardLabelOf || ((slot) => `Card back ${slot}`);
    this.disabled = false;
    this.isMobile = window.matchMedia('(max-width: 767px)').matches;
    this.cards = buildCards(opts.totalCards, this.isMobile, shuffleDeck(opts.totalCards, opts.deck), opts.deck);

    this.root = document.createElement('div');
    this.root.className = 'tarot-scene-root';
    this.field = document.createElement('div');
    this.field.className = 'tarot-scene-field';
    this.root.appendChild(this.field);
    this.container.appendChild(this.root);

    this.nodes = this.cards.map((card, slot) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tarot-scene-card';
      button.style.setProperty('--card-w', `${card.width}px`);
      button.style.setProperty('--card-alpha', String(card.alpha));
      // 鎏金流光相位：每张卡错开，避免全体同步闪烁
      button.style.setProperty('--gilt-phase', `${(card.id % 12) * -0.55}s`);
      button.setAttribute('aria-label', this.cardLabelOf(slot + 1));
      button.dataset.deckId = String(card.id);
      button.dataset.reversed = card.reversed ? '1' : '0';
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
      button.addEventListener('click', (e) => this.onCardClick(e as MouseEvent, card.id, card.reversed));
      this.field.appendChild(button);
      return button;
    });
    this.cache = this.cards.map(() => ({
      alpha: NaN, w: NaN, zIndex: NaN, sel: false, hidden: false,
    }));

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
    // 容器尺寸变化(旋转屏幕、抽屉键盘弹起)靠 resize 事件未必触发, 补一个观察者
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.markGeometryDirty());
      this.resizeObserver.observe(this.root);
    }
  }

  init() {
    this.setSelected(Array.from(this.selectedIds));
    this.measure();
    this.layout(0, 1);
    this.frame = requestAnimationFrame(this.animate);
    return this;
  }

  markGeometryDirty() {
    this.geometryDirty = true;
  }

  /**
   * 量一次容器尺寸并把所有派生几何量算好。只在挂载/尺寸变化时调用,
   * 不要放回每帧循环 —— 读 clientWidth 会强制同步重排。
   */
  measure() {
    const width = this.root.clientWidth || window.innerWidth || 1;
    const height = this.root.clientHeight || window.innerHeight || 1;
    this.viewW = Math.max(1, width);
    this.viewH = Math.max(1, height);
    // 尺寸基准是场景高度, 但手机上「高度不输桌面、屏宽只有桌面的 1/3.7」,
    // 于是同一套牌在手机上占屏宽 17.2%, 桌面只占 5.7% —— 看着就是大。
    // 窄屏额外收一档(393px → 0.756), 前层牌压到实测 51.7px(桌面 81.6px 不受影响)。
    // 再往下就碰系统建议的 44px 最小可点目标了, 所以不是无脑照搬桌面比例;
    // 中/后层低于 44px 的部分由 pickCardAt 按 44px 下限补可点范围。
    const narrow = clamp(this.viewW / 520, 0.72, 1);
    this.sizeScale = clamp(this.viewH / 440, 0.85, 2.1) * narrow;
    // 漂移带总宽按牌数等比缩放: 塔罗78张→4.85屏宽; 雷诺曼36张→2.24屏宽
    this.span = this.viewW * 4.85 * (this.totalCards / 78);
    this.bandLeft = -(this.span - this.viewW) / 2;
    this.safeTop = this.isMobile ? 18 : 14;
    this.safeBottom = this.viewH - (this.isMobile ? 18 : 16);
    this.geometryDirty = false;
  }

  getBounds() {
    return { width: this.viewW, height: this.viewH };
  }

  layout(elapsed: number, damping: number) {
    if (this.geometryDirty) this.measure();
    const width = this.viewW;
    const height = this.viewH;
    this.offset.x += (this.targetOffset.x - this.offset.x) * damping;
    this.offset.y += (this.targetOffset.y - this.offset.y) * damping;
    this.zoom += (this.targetZoom - this.zoom) * damping;

    const sizeScale = this.sizeScale;
    const span = this.span;
    const left = this.bandLeft;
    const safeTop = this.safeTop;
    const safeBottom = this.safeBottom;
    const zoomDelta = this.zoom - 1;
    const cx = width / 2;
    this.cards.forEach((card, index) => {
      const node = this.nodes[index];
      const c = this.cache[index];
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
      const selected = this.selectedIds.has(card.id);
      const selectedScale = selected ? 1.06 : 1;
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
      const w = card.width * sizeScale * widthZoom;
      const visualH = w * s * 1.5;
      y = clamp(y, safeTop, safeBottom - visualH * 0.72);
      const alpha = clamp(card.alpha + alphaLift, card.alpha, 0.98);

      /* 屏外剔除: 漂移带是 4.85 屏宽, 同屏最多两成牌可见, 其余七成的 style 写入
         和合成层是纯浪费。按 perspective 放大后的实际落点判定(近层最多放大 ~1.5x),
         留出牌宽裕量后仍出界的直接 display:none —— 不写 DOM, 也不参与绘制。 */
      const ps = z < 880 ? 900 / Math.max(60, 900 - z) : 12;
      const screenLeft = cx + (x + w / 2 - cx) * ps - (w * s) / 2;
      const visible = screenLeft > -w * 1.6 && screenLeft < width + w * 0.6;
      if (!visible) {
        if (!c.hidden) {
          node.style.display = 'none';
          c.hidden = true;
        }
        return;
      }
      if (c.hidden) {
        node.style.display = '';
        c.hidden = false;
        c.alpha = NaN; c.w = NaN; c.zIndex = NaN; // 重新入屏: 全量重写
      }
      // 每帧一次 transform 直写。
      // 不再走 --x/--y/--z/--rx/... 这些自定义属性: 自定义属性是可继承的,
      // 改一个就要连带重算整棵子树的样式(Blink 里比直接改 transform 贵得多),
      // 而每帧每张牌原本要写 5 个。合并成 1 次 inline transform 后,
      // 变化只影响这一个属性、且只走合成器路径。
      node.style.transform =
        `translate3d(${x.toFixed(2)}px,${(y + (selected ? -10 : 0)).toFixed(2)}px,${z.toFixed(2)}px)` +
        ` rotateX(${(card.rotateX + Math.sin(elapsed * 0.38 + card.phase) * 1.4).toFixed(2)}deg)` +
        ` rotateY(${(card.rotateY + Math.cos(elapsed * 0.31 + card.phase) * 2.2).toFixed(2)}deg)` +
        ` rotateZ(${(card.rotateZ + Math.sin(elapsed * 0.27 + card.phase) * 1.8).toFixed(2)}deg)` +
        ` scale(${s.toFixed(4)})`;
      // 宽高由 --card-w 决定, 改它=触发整棵子树重排: 只在缩放真的改变它时才写
      if (c.w !== w) {
        node.style.setProperty('--card-w', `${w}px`);
        c.w = w;
      }
      // 透明度只在缩放时变(近层变实), 同样只在变化时写
      if (c.alpha !== alpha) {
        node.style.setProperty('--card-alpha', alpha.toFixed(3));
        c.alpha = alpha;
      }
      const zIndex = Math.round(1000 + z);
      if (c.zIndex !== zIndex) {
        node.style.zIndex = String(zIndex);
        c.zIndex = zIndex;
      }
      if (c.sel !== selected) {
        node.classList.toggle('selected', selected);
        c.sel = selected;
      }
    });
  }

  animate(now: number) {
    if (this.destroyed) return;
    this.frame = requestAnimationFrame(this.animate);
    const elapsed = (now - this.startedAt) / 1000;
    this.layout(elapsed, 0.09);
  }

  /**
   * 交互期间暂停鎏金流光。实测它是场景里唯一还能收回帧的开销：
   * 拖拽中 4x 降频下 28fps → 34fps。手指按住的时候正是最需要每一帧的时候
   * ——选中高亮要等下一帧才画得出来。抬手 420ms 后恢复，一次拖拽里不会反复起停。
   */
  markInteracting() {
    this.root.classList.add('interacting');
    if (this.interactTimer) clearTimeout(this.interactTimer);
    this.interactTimer = setTimeout(() => {
      this.interactTimer = null;
      this.root.classList.remove('interacting');
    }, 420);
  }

  /**
   * 按下瞬间给那张牌一个高亮。
   * 这条链路上第一个可见变化本来要等 touchend → click → React setState → effect →
   * 下一帧，393px + 4x 降频实测 +233ms 才亮，也就是「点了要等一下」。
   * :active 顶不上：Chromium 触屏要到抬手后才挂上它，鼠标分支又被
   * onPointerDown 里的 preventDefault 挡掉了，所以「按下」这件事自己来标。
   */
  markPressed(event: PointerEvent) {
    // closest 命中不到时回退到坐标拾取 —— 触屏的可点范围比视觉矩形大一圈（见 pickCardAt），
    // 落在这一圈里的按下也必须给出反馈。一次手势只付一次，代价可接受。
    const node = ((event.target as Element | null)?.closest?.('.tarot-scene-card') as HTMLButtonElement | null)
      ?? this.pickCardAt(event.clientX, event.clientY);
    if (this.pressedNode === node) return;
    this.clearPressed();
    if (!node || node.disabled) return;
    this.pressedNode = node;
    node.classList.add('pressed');
  }

  /** 0ms=立刻（手势变成拖拽了）；给一个短停留则是让快速轻点也能被看见 */
  clearPressed(hold = 0) {
    if (this.pressedTimer) {
      clearTimeout(this.pressedTimer);
      this.pressedTimer = null;
    }
    const node = this.pressedNode;
    if (!node) return;
    if (hold <= 0) {
      node.classList.remove('pressed');
      this.pressedNode = null;
      return;
    }
    this.pressedTimer = setTimeout(() => {
      this.pressedTimer = null;
      node.classList.remove('pressed');
      if (this.pressedNode === node) this.pressedNode = null;
    }, hold);
  }

  onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.markInteracting();
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
      this.clearPressed();
      this.pointer = null;
      return;
    }
    if (event.isPrimary) {
      this.markPressed(event);
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
    // 长拖拽会超过 420ms，按住期间要续着
    if (this.pointer || this.pinch) this.markInteracting();
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
      if (!this.pointer.moved) this.clearPressed(); // 手势变成拖拽了，按下高亮立即让位
      this.pointer.moved = true;
    }
    if (!this.pointer.moved) return;
    const { width } = this.getBounds();
    // 横向拖拽限位: 塔罗保持原 ±1.7屏; 窄带牌组(雷诺曼)收紧到带缘+半屏, 防止把牌全部拖出视野
    const dragSpan = width * 4.85 * (this.totalCards / 78);
    const dragMax = Math.min(width * 1.7, (dragSpan - width) / 2 + width * 0.55);
    this.targetOffset.x = clamp(this.targetOffset.x + dx * 1.35, -dragMax, dragMax);
    this.targetOffset.y = clamp(this.targetOffset.y + dy * 0.45, -58, 58);
  }

  onPointerUp(event: PointerEvent) {
    this.activePointers.delete(event.pointerId);
    // 松手后留住 140ms：selected 要等 click→React→effect 才落地，中间不能有一段「暗下去」
    this.clearPressed(140);
    if (this.activePointers.size < 2) this.pinch = null;
    if (!this.pointer || this.pointer.id !== event.pointerId) return;
    const wasDrag = this.pointer.moved;
    this.root.releasePointerCapture?.(event.pointerId);
    this.pointer = null;
    // 拖动后标记一下时间戳，click 兜底时跳过（防止浏览器在 drag-end 仍派发 click）
    if (wasDrag) this.lastDragAt = performance.now();
  }

  // click 兜底：处理真实点击/触屏 tap/自动化工具派发的 click
  onCardClick(event: MouseEvent, cardId: number, reversed: boolean) {
    if (this.disabled) return;
    // 拖动刚结束（80ms 内）→ 视为 drag 末端，忽略
    if (performance.now() - this.lastDragAt < 80) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.onToggleCard(cardId, reversed);
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
    const node = target ?? this.pickCardAt(event.clientX, event.clientY);
    const deckId = Number(node?.dataset.deckId);
    if (!Number.isFinite(deckId) || deckId < 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.onToggleCard(deckId, node?.dataset.reversed === '1');
  }

  pickCardAt(clientX: number, clientY: number): HTMLButtonElement | null {
    let best: HTMLButtonElement | null = null;
    let bestZ = -Infinity;
    for (const node of this.nodes) {
      if (node.disabled || node.style.display === 'none') continue;
      const rect = node.getBoundingClientRect();
      /* 触屏的可点范围按 44px 系统建议下限补偿。
         窄屏把牌收小后中/后层只有 34~41px 宽，按视觉矩形判定会点空。
         只在拾取时把矩形撑开、牌面视觉不变；仍是 z 最大的那张赢。
         高度方向天然 >44，所以实际只会横向各补几像素。 */
      const padX = Math.max(0, (MIN_TAP_PX - rect.width) / 2);
      const padY = Math.max(0, (MIN_TAP_PX - rect.height) / 2);
      if (clientX < rect.left - padX || clientX > rect.right + padX) continue;
      if (clientY < rect.top - padY || clientY > rect.bottom + padY) continue;
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
    this.markInteracting();
    this.targetZoom = clamp(this.targetZoom + (event.deltaY > 0 ? -0.07 : 0.07), 0.78, MAX_ZOOM);
  }

  onResize() {
    this.measure();
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

  setCardLabelOf(fn: (slot: number) => string) {
    this.cardLabelOf = fn;
    this.nodes.forEach((node, slot) => node.setAttribute('aria-label', fn(slot + 1)));
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
    if (this.interactTimer) {
      clearTimeout(this.interactTimer);
      this.interactTimer = null;
    }
    this.clearPressed();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
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
export default function TarotScene({ maxSelect, selectedIds, onToggleCard, disabled, deck = 'tarot' }: TarotSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TarotSceneEngine | null>(null);
  const { lang, t } = useI18n();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const engine = new TarotSceneEngine({
      container,
      totalCards: deck === 'lenormand' ? 36 : 78,
      maxSelect,
      selectedIds,
      onToggleCard,
      deck,
      cardLabelOf: (slot) => t('scene.cardBackLabel', { n: slot }),
    });
    engine.init();
    engineRef.current = engine;
    return () => engine.destroy();
    // 只初始化一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 牌背节点由引擎命令式创建、不随 React 重渲染，切语言后要手动重刷 aria-label
  useEffect(() => {
    engineRef.current?.setCardLabelOf((slot) => t('scene.cardBackLabel', { n: slot }));
  }, [lang, t]);

  useEffect(() => {
    engineRef.current?.setSelected(selectedIds);
  }, [selectedIds]);

  useEffect(() => {
    engineRef.current?.setMaxSelect(maxSelect);
  }, [maxSelect]);

  useEffect(() => {
    engineRef.current?.setDisabled(!!disabled);
  }, [disabled]);

  return (
    <>
      {/* 卡背图 92KB：写在场景这一层，牌池一开始挂载就去取图，
          而不是等 effect 里建出 78 个 <img> 才被浏览器发现（实测那已是加载后 3~5s）。 */}
      <link rel="preload" as="image" href="/cards/card-back-new.webp" />
      <div ref={containerRef} className="tarot-scene-root" />
    </>
  );
}
