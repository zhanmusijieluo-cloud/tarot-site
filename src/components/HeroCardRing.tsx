'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import CardDissolve from '@/components/CardDissolve';
import { useI18n } from '@/i18n';

/**
 * HeroCardRing — 首页 3D 旋转卡环
 *
 * - 大阿卡那 22 张牌围成圆环，绕 Y 轴缓慢自转
 * - 鼠标/触屏拖拽旋转视角，松手恢复自转
 * - 点击一张牌：弹出覆盖层 —— 背景模糊变暗、牌面居中翻面展示；点击任意处关闭
 */

const MAJOR_COUNT = 22;
const RING_RADIUS = 11.5;
const CARD_W = 1.9;
const CARD_H = 3.1;
const AUTO_SPEED = 0.1;

const MAJOR_NAMES = [
  '愚者', '魔术师', '女祭司', '皇后', '皇帝', '教皇', '恋人', '战车',
  '力量', '隐者', '命运之轮', '正义', '倒吊人', '死神', '节制', '恶魔',
  '高塔', '星星', '月亮', '太阳', '审判', '世界',
];

export default function HeroCardRing({ onActiveChange }: { onActiveChange?: (active: boolean) => void }) {
  const { t } = useI18n();
  // 牌名跟随站点语言：i18n 已有 card.0~card.21 三语键，中文回退到上面的原始数组
  const majorName = useCallback(
    (idx: number) => {
      const key = `card.${idx}`;
      const localized = t(key);
      return localized && localized !== key ? localized : MAJOR_NAMES[idx] ?? '';
    },
    [t]
  );
  const mountRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  // 关闭弹层时先触发粒子消散，动画结束才真正移除 focused
  const [dissolving, setDissolving] = useState(false);
  const [closingCard, setClosingCard] = useState<number | null>(null);
  // 粒子消散是否就绪：图片加载完、canvas 初始化后为 true，此时才隐藏牌面 img（防回闪）
  const [dissolveReady, setDissolveReady] = useState(false);
  const cardBoxRef = useRef<HTMLDivElement | null>(null);
  // 被点击牌在屏幕上的投影位置（相对视口中心偏移），供弹层牌从原位飞入
  const [flyFrom, setFlyFrom] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // 弹层牌容器 ref：JS 贝塞尔飞行动画直接操作它
  const cardAnimRef = useRef<HTMLDivElement | null>(null);

  // 通知父级：弹层打开/关闭状态（供 Hero 隐藏/恢复文字）
  const activeRef = useRef(onActiveChange);
  activeRef.current = onActiveChange;
  const notifyActive = useCallback((active: boolean) => {
    activeRef.current?.(active);
  }, []);
  useEffect(() => {
    notifyActive(!dissolving && focused !== null);
  }, [focused, dissolving, notifyActive]);

  // JS 贝塞尔抽卡动画：从被点击牌的位置，沿连续曲线飞入中央，无分段感
  useEffect(() => {
    if (focused === null || dissolving) return;
    const el = cardAnimRef.current;
    if (!el) return;
    const fx = flyFrom.x;
    const fy = flyFrom.y;
    // 二次贝塞尔：P0=起点（点击牌投影），P1=弧线控制点（更高拱起），P2=终点(0,0)
    const P1x = fx * 0.45;
    const P1y = fy - Math.max(360, window.innerHeight * 0.5);
    const dur = 950;
    let raf = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min((now - start) / dur, 1);
      // easeOutCubic：整体平滑减速，全程连续
      const e = 1 - Math.pow(1 - t, 3);
      const u = 1 - e;
      const x = u * u * fx + 2 * u * e * P1x + e * e * 0;
      const y = u * u * fy + 2 * u * e * P1y + e * e * 0;
      // 旋转：两端均为 0°（起飞平 → 中段转体 → 结束精确回正，无跳变）
      const rot = -10 * Math.sin(Math.PI * e);
      const scale = 0.9 + 0.1 * e;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) rotateX(${rot * 0.4}deg) rotateZ(${rot}deg) scale(${scale})`;
      el.style.opacity = String(Math.min(1, t * 4));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        el.style.transform = 'translate3d(0,0,0) rotateX(0deg) rotateZ(0deg) scale(1)';
        el.style.opacity = '1';
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [focused, dissolving, flyFrom]);

  const closeFocus = useCallback(() => {
    if (focused === null) return;
    setClosingCard(focused);
    setDissolving(true);
    setDissolveReady(false); // 先保留牌面 img，等粒子动画就绪再隐藏，避免回闪
    // 关闭动作一开始就让首页文字恢复淡入（不等粒子消散完）
    activeRef.current?.(false);
  }, [focused]);

  // three 内部状态放 ref，避免重建场景
  const api = useRef<{ dragging: boolean }>({ dragging: false });
  const pickRef = useRef<((clientX: number, clientY: number, isClick: boolean) => void) | null>(null);
  // majorName 的 ref：three 场景 effect 只挂载一次，通过 ref 拿到最新的语言相关牌名函数
  const majorNameRef = useRef(majorName);
  majorNameRef.current = majorName;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(54, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 6.0, 16.2);
    camera.lookAt(0, 5.4, 0);

    scene.add(new THREE.AmbientLight(0xbfb4e6, 1.15));
    const key = new THREE.DirectionalLight(0xfff2e0, 1.35);
    key.position.set(3, 5, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9b8cff, 0.85);
    rim.position.set(-4, 2, -5);
    scene.add(rim);

    const ring = new THREE.Group();
    ring.position.y = 5.4;
    scene.add(ring);

    const loader = new THREE.TextureLoader();
    const backTex = loader.load('/cards/card-back.jpg');
    backTex.colorSpace = THREE.SRGBColorSpace;
    const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.55, metalness: 0.08 });

    const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);
    const groups: THREE.Group[] = [];
    for (let i = 0; i < MAJOR_COUNT; i++) {
      const faceTex = loader.load(`/cards/card_${String(i).padStart(2, '0')}.jpg`);
      faceTex.colorSpace = THREE.SRGBColorSpace;
      const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.55, metalness: 0.08 });

      const g = new THREE.Group();
      const face = new THREE.Mesh(geo, faceMat);
      face.position.z = 0.008;
      const back = new THREE.Mesh(geo, backMat);
      back.rotation.y = Math.PI;
      g.add(face, back);

      const angle = (i / MAJOR_COUNT) * Math.PI * 2;
      g.position.set(Math.sin(angle) * RING_RADIUS, Math.sin(i * 1.7) * 0.14, Math.cos(angle) * RING_RADIUS);
      g.rotation.y = angle;
      g.userData = { index: i, baseY: g.position.y };
      ring.add(g);
      groups.push(g);
    }

    // 星点背景
    const starGeo = new THREE.BufferGeometry();
    const starCount = 420;
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xcfc7ff, size: 0.045, transparent: true, opacity: 0.65, depthWrite: false })
    );
    scene.add(stars);

    // ---- 交互 ----
    let targetRotY = 0;
    let dragging = false;
    let suppressClick = false;
    let lastX = 0;
    let downX = 0;
    let downY = 0;
    let downTime = 0;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const castAt = (clientX: number, clientY: number): number => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const meshes: THREE.Mesh[] = [];
      groups.forEach((g) => g.children.forEach((c) => meshes.push(c as THREE.Mesh)));
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length === 0) return -1;
      const grp = hits[0].object.parent as THREE.Group;
      return grp.userData.index as number;
    };

    // 暴露给外层的拾取回调：isClick=true 时触发选牌
    pickRef.current = (clientX: number, clientY: number, isClick: boolean) => {
      const idx = castAt(clientX, clientY);
      if (isClick) {
        if (idx >= 0) {
          // 计算被点击牌的世界坐标 → 屏幕坐标（相对视口中心的偏移），作为弹层牌飞入起点
          const wp = new THREE.Vector3();
          groups[idx].getWorldPosition(wp);
          wp.project(camera);
          const sx = ((wp.x + 1) / 2) * window.innerWidth;
          const sy = ((1 - wp.y) / 2) * window.innerHeight;
          setFlyFrom({ x: sx - window.innerWidth / 2, y: sy - window.innerHeight / 2 });
          setFocused(idx);
        }
      } else {
        setHoveredName(idx >= 0 ? majorNameRef.current(idx) : null);
        renderer.domElement.style.cursor = idx >= 0 ? 'pointer' : 'grab';
      }
    };

    const el = renderer.domElement;
    el.style.cursor = 'grab';
    el.style.touchAction = 'pan-y';
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      downX = e.clientX;
      downY = e.clientY;
      downTime = performance.now();
      api.current.dragging = true;
    };
    const onMove = (e: PointerEvent) => {
      if (dragging) {
        const dx = e.clientX - lastX;
        const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (dist > 12 || performance.now() - downTime > 500) suppressClick = true;
        targetRotY += dx * 0.005;
        lastX = e.clientX;
      } else if (e.pointerType !== 'touch' && e.target === el) {
        pickRef.current?.(e.clientX, e.clientY, false);
      }
    };
    const onUp = () => {
      dragging = false;
      api.current.dragging = false;
    };
    const onCancel = () => {
      dragging = false;
      api.current.dragging = false;
    };
    const onClick = (e: MouseEvent) => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      pickRef.current?.(e.clientX, e.clientY, true);
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    el.addEventListener('click', onClick);

    // ---- 动画循环 ----
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      targetRotY += AUTO_SPEED * dt;
      ring.rotation.y += (targetRotY - ring.rotation.y) * Math.min(dt * 8, 1);
      for (const g of groups) {
        g.position.y = (g.userData.baseY as number) + Math.sin((now / 1000) * 0.9 + (g.userData.index as number)) * 0.3;
      }
      stars.rotation.y += dt * 0.008;

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      el.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) mat.dispose();
      });
      if (el.parentElement === mount) mount.removeChild(el);
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full touch-pan-y" aria-hidden="true" />

      {/* 悬停牌名 */}
      {hoveredName && focused === null && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full border border-accent/25 bg-black/40 px-5 py-2 backdrop-blur-sm">
          <span className="font-display text-sm tracking-[0.2em] text-frost/90">{hoveredName}</span>
        </div>
      )}

      {/* 点击放大层：渲染到 document.body 顶层（fixed 全屏），
          彻底脱离 Hero 内的冷粉叠色遮罩堆叠，牌面保持纯净清晰 */}
      {focused !== null &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl"
            style={{
              animation: 'ringFadeIn .25s ease-out',
              opacity: dissolving && closingCard === focused ? 0 : 1,
              transition: dissolving && closingCard === focused ? 'opacity .45s ease-out 1.0s' : 'none',
              pointerEvents: dissolving && closingCard === focused ? 'none' : 'auto',
            }}
            onClick={closeFocus}
            role="dialog"
            aria-label={majorName(focused)}
          >
            <div className="flex flex-col items-center" style={{ perspective: '1200px' }}>
              <div
                ref={(node) => {
                  cardAnimRef.current = node;
                  cardBoxRef.current = node;
                }}
                className="relative will-change-transform"
                style={{
                  width: 'min(52vw, 240px)',
                  aspectRatio: '2 / 3.35',
                  opacity: 0,
                }}
              >
                {dissolving && closingCard === focused && dissolveReady ? (
                  <div className="h-full w-full opacity-0" aria-hidden="true" />
                ) : (
                  <img
                    src={`/cards/card_${String(focused).padStart(2, '0')}.jpg`}
                    alt={majorName(focused)}
                    className="h-full w-full rounded-lg border border-white/15 object-cover shadow-2xl"
                    style={{
                      transition: 'opacity 0.55s ease-out',
                      opacity: dissolving && closingCard === focused ? 0 : 1,
                    }}
                    draggable={false}
                  />
                )}
              </div>
              <p
                className="mt-5 font-display text-lg tracking-[0.35em] text-frost"
                style={{ animation: 'ringFadeIn .5s ease-out .64s both' }}
              >
                {majorName(focused)}
              </p>
              <p className="mt-2 text-xs tracking-[0.2em] text-frost/40" style={{ animation: 'ringFadeIn .5s ease-out .76s both' }}>
                {t('hero.tapAnywhereToClose')}
              </p>
            </div>

            {/* 全屏粒子消散层：粒子以屏幕坐标向四周飞散，无裁切 */}
            {dissolving && closingCard === focused && (
              <CardDissolve
                src={`/cards/card_${String(focused).padStart(2, '0')}.jpg`}
                cardBoxRef={cardBoxRef}
                onReady={() => setDissolveReady(true)}
                onDone={() => {
                  setDissolving(false);
                  setClosingCard(null);
                  setFocused(null);
                }}
              />
            )}
            <style>{`
              @keyframes ringFadeIn { from { opacity:0 } to { opacity:1 } }
            `}</style>
          </div>,
          document.body
        )}
    </div>
  );
}
