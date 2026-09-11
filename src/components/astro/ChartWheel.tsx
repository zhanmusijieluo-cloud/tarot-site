'use client';

// ============================================================
// 3D 星盘轮盘 (C1) — three.js
// 结构: 宫位环(元素色扇区) + 星座环(30°格+符号) + 行星(真实NASA贴图星球)
// 行星光斑已升级为"真实星体": 太阳自发光+点光源, 行星Phong受光, 土星带环
// 视角: 俯视=标准星盘(ASC左/逆时针) 侧视=黄道面立起看黄纬悬浮
// 线索: 脚线(行星→环上刻度) + 悬停/点击点亮 + 标注卡(落座/宫/尊贵/相位/接纳)
// 纪律: 位置数据全部来自排盘引擎, 本组件只画不编
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useI18n } from '@/i18n';

// ---------- 与 API 返回对齐的数据类型 ----------
export interface VPlanet {
  name: string; zh: string; symbol: string;
  longitude: number; eclLat?: number; // 黄纬(度), 缺省0
  sign: string; signZh: string; degInSign: number; formatted: string;
  house: number | null; retrograde: boolean;
  dignity: { state: string; strength: number } | null;
}
export interface VAspect {
  a: string; b: string; type: string; typeZh: string; symbol: string;
  orb: number; applying: boolean | null;
}
export interface VReception {
  a: string; b: string; kind: string; mutual: boolean; bySign: string;
}
export interface VChart {
  houseSystemUsed: string; timeKnown: boolean;
  planets: VPlanet[];
  angles: { ascendant: VPlanet | null; midheaven: VPlanet | null };
  cusps: number[] | null;
  aspects: VAspect[];
  receptions: VReception[];
  warnings: string[];
}

// ---------- 布局常量 ----------
const R_OUT = 5.0;    // 外环(宫位环)
const R_MID = 4.35;   // 中环(星座环)内缘
const R_SIGN = 3.45;  // 星座环外缘(=宫位环内缘留缝)
const R_PLAN = 2.75;  // 行星带半径
const ASC_ANGLE_DEG = 180; // ASC 画在9点钟(行业惯例), 黄经逆时针增

const ELEMENT_OF_SIGN: Record<string, string> = {
  Aries: '火', Leo: '火', Sagittarius: '火',
  Taurus: '土', Virgo: '土', Capricorn: '土',
  Gemini: '风', Libra: '风', Aquarius: '风',
  Cancer: '水', Scorpio: '水', Pisces: '水',
};
const ELEMENT_COLOR: Record<string, number> = {
  '火': 0xe8a08a, '土': 0xcdb88a, '风': 0x9cc3d8, '水': 0x8aa8d8,
};
const SIGN_GLYPH = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const SIGN_ORDER = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGN_ZH = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼'];
const DIGNITY_ZH: Record<string, string> = {
  Domicile: '入庙', Exalted: '耀升', Detriment: '失势', Fall: '落陷', Peregrine: '游走',
};
const RECEPTION_KIND_ZH: Record<string, string> = {
  domicile: '庙座', exaltation: '耀升', detriment: '失势', fall: '落陷',
};
const SIGNS_ZH_MINI: Record<string, string> = {
  Aries: '白羊', Taurus: '金牛', Gemini: '双子', Cancer: '巨蟹', Leo: '狮子', Virgo: '处女',
  Libra: '天秤', Scorpio: '天蝎', Scorpius: '天蝎', Sagittarius: '射手', Capricorn: '摩羯',
  Capricornus: '摩羯', Aquarius: '水瓶', Pisces: '双鱼', Ophiuchus: '蛇夫',
};

// 真实星球贴图 (NASA Solar System Scope, 公有领域)
const TEX: Record<string, string> = {
  Sun: '/textures/planet/2k_sun.jpg',
  Moon: '/textures/planet/2k_moon.jpg',
  Mercury: '/textures/planet/2k_mercury.jpg',
  Venus: '/textures/planet/2k_venus_surface.jpg',
  Mars: '/textures/planet/2k_mars.jpg',
  Jupiter: '/textures/planet/2k_jupiter.jpg',
  Saturn: '/textures/planet/2k_saturn.jpg',
  Uranus: '/textures/planet/2k_uranus.jpg',
  Neptune: '/textures/planet/2k_neptune.jpg',
  Pluto: '/textures/planet/2k_moon.jpg', // 暂无NASA冥王星贴图, 灰岩质感代替
};
// 视觉半径(盘面尺度; 相对大小参照真实比例适度夸张保证可点)
const BODY_R: Record<string, number> = {
  Sun: 0.42, Moon: 0.19, Mercury: 0.11, Venus: 0.16, Mars: 0.13,
  Jupiter: 0.30, Saturn: 0.26, Uranus: 0.21, Neptune: 0.20, Pluto: 0.09,
};

const DEG = Math.PI / 180;

function lonToAngle(lon: number, ascLon: number): number {
  const rel = (((lon - ascLon) % 360) + 360) % 360; // 自ASC逆时针
  return (ASC_ANGLE_DEG - rel) * DEG;              // three世界角(x=cos,z=-sin)
}
function polar(r: number, a: number): THREE.Vector3 {
  return new THREE.Vector3(Math.cos(a) * r, 0, -Math.sin(a) * r);
}
const norm360 = (d: number) => ((d % 360) + 360) % 360;

function glowTexture(hex: string, px = 128): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, hex);
  g.addColorStop(1, hex.slice(0, 7) + '00');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, px, px);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function textTexture(text: string, font: number, color = '#e6ecff'): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.font = `300 ${font}px "PingFang SC","Microsoft YaHei",serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 8;
  ctx.fillText(text, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface SceneProps {
  chart: VChart;
  zhMode: boolean;
  view: 'top' | 'side';
  selected: string | null;
  onSelect: (name: string | null) => void;
}

function ChartScene({ chart, zhMode, view, selected, onSelect }: SceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const aimRef = useRef<{ aim: (lon: number, lat: number) => void } | null>(null);

  const ascLon = chart.angles.ascendant?.longitude ?? 0;
  const hasHouses = chart.timeKnown && !!chart.cusps;
  const aspects = useMemo(() => [...chart.aspects].sort((a, b) => a.orb - b.orb).slice(0, 14), [chart]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth, H = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 10.6, 3.1);
    camera.up.set(0, 0, -1);        // 俯视稳定化: 屏幕上方=世界-Z
    camera.lookAt(0, 0, 0);

    const root = new THREE.Group(); // 盘面整体; YXZ序: y=水平自转(世界Y), x=倾角(俯视↔侧视)
    root.rotation.order = 'YXZ';
    scene.add(root);
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

    // 灯光: 太阳=点光源(真实方向→月相等受光正确) + 环境光保底
    const sunP = chart.planets.find((p) => p.name === 'Sun');
    scene.add(new THREE.AmbientLight(0xbcc8e8, 0.85));
    const sunLight = new THREE.PointLight(0xfff1d6, 2.6, 0, 0);

    // ---------- 环 ----------
    // 宫位扇区(外环): 元素色 + 悬高亮 userData
    const houseSlices: THREE.Mesh[] = [];
    if (hasHouses) {
      for (let h = 0; h < 12; h++) {
        const c0 = norm360((chart.cusps as number[])[h]);
        const c1 = norm360((chart.cusps as number[])[(h + 1) % 12]);
        let span = norm360(c1 - c0); if (span < 1) span = 30;
        const a0 = lonToAngle(c0, ascLon);
        const geo = track(new THREE.RingGeometry(R_MID + 0.12, R_OUT, 40, 1, a0 - span * DEG, span * DEG));
        const el = ELEMENT_OF_SIGN[SIGN_ORDER[Math.floor(c0 / 30) % 12]] ?? '风';
        const mat = track(new THREE.MeshBasicMaterial({
          color: ELEMENT_COLOR[el], transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false,
        }));
        const m = new THREE.Mesh(geo, mat);
        m.rotation.x = -Math.PI / 2;
        m.userData = { houseSlice: h + 1, baseOpacity: 0.10 };
        root.add(m);
        houseSlices.push(m);
      }
    }
    // 圈线
    for (const [r, op] of [[R_OUT, 0.55], [R_MID + 0.12, 0.4], [R_SIGN, 0.4], [R_MID, 0.35]] as const) {
      const ringLine = new THREE.Mesh(
        track(new THREE.RingGeometry(r, r + 0.015, 160)),
        track(new THREE.MeshBasicMaterial({ color: 0x8ea3c8, transparent: true, opacity: op, side: THREE.DoubleSide })),
      );
      ringLine.rotation.x = -Math.PI / 2;
      root.add(ringLine);
    }
    // 星座扇区 + 符号
    for (let s = 0; s < 12; s++) {
      const a0 = lonToAngle(s * 30, ascLon);
      const geo = track(new THREE.RingGeometry(R_SIGN, R_MID, 24, 1, a0 - 30 * DEG, 30 * DEG));
      const el = ELEMENT_OF_SIGN[SIGN_ORDER[s]];
      const mat = track(new THREE.MeshBasicMaterial({
        color: ELEMENT_COLOR[el], transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false,
      }));
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.userData = { signSlice: s, baseOpacity: 0.12 };
      root.add(m);
      houseSlices.push(m);
      const amid = lonToAngle(s * 30 + 15, ascLon);
      const tex = track(textTexture(SIGN_GLYPH[s], 64, '#cdd9f2'));
      const spr = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })));
      spr.position.copy(polar((R_SIGN + R_MID) / 2, amid));
      spr.scale.set(0.52, 0.52, 1);
      root.add(spr);
    }
    // 宫头线 + 宫号
    if (hasHouses) {
      for (let h = 0; h < 12; h++) {
        const a = lonToAngle(norm360((chart.cusps as number[])[h]), ascLon);
        const line = new THREE.Line(
          track(new THREE.BufferGeometry().setFromPoints([polar(R_SIGN, a), polar(R_MID + 0.1, a)])),
          track(new THREE.LineBasicMaterial({
            color: h === 0 || h === 9 ? 0xcfe0ff : 0x5d6f92,
            transparent: true, opacity: h === 0 || h === 9 ? 0.95 : 0.5,
          })),
        );
        root.add(line);
        const a1 = lonToAngle(norm360((chart.cusps as number[])[(h + 1) % 12]), ascLon);
        const amid = a + norm180(a1 - a) / 2;
        const tex = track(textTexture(String(h + 1), 46, '#93a8cc'));
        const spr = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false })));
        spr.position.copy(polar((R_MID + 0.12 + R_OUT) / 2, amid));
        spr.scale.set(0.34, 0.34, 1);
        root.add(spr);
      }
    }

    // ---------- 真实星球 ----------
    const texLoader = new THREE.TextureLoader();
    const planetObjs: { name: string; group: THREE.Group; mesh: THREE.Mesh; lon: number; lat: number }[] = [];
    const core = new THREE.Group(); // 中心区(相位线用)
    root.add(core);

    for (const p of chart.planets) {
      const a = lonToAngle(p.longitude, ascLon);
      const lat = p.eclLat ?? 0;
      const r = R_PLAN;
      const pos = polar(r, a);
      pos.y = Math.sin(lat * DEG) * r * 3.0; // 黄纬夸张, 侧视可见

      const g = new THREE.Group();
      g.position.copy(pos);
      const br = BODY_R[p.name] ?? 0.14;

      let mat: THREE.Material;
      if (p.name === 'Sun') {
        mat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // 自发光
      } else {
        mat = new THREE.MeshPhongMaterial({
          color: p.name === 'Pluto' ? 0xb8b0a8 : 0xffffff,
          emissive: 0x121622, emissiveIntensity: 1, shininess: p.name === 'Moon' ? 2 : 8,
        });
      }
      const geo = track(new THREE.SphereGeometry(br, 24, 14));
      const mesh = new THREE.Mesh(geo, track(mat));
      mesh.userData = { planet: p.name };
      g.add(mesh);
      if (TEX[p.name]) {
        texLoader.load(TEX[p.name], (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          (mat as THREE.MeshPhongMaterial).map = t;
          (mat as THREE.MeshPhongMaterial).needsUpdate = true;
        });
      }
      // 太阳光晕 + 把点光源摆到太阳位置(挂在root上, 随盘旋转)
      if (p.name === 'Sun') {
        const gt = track(glowTexture('#ffce7a'));
        const gs = new THREE.Sprite(track(new THREE.SpriteMaterial({
          map: gt, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
        })));
        gs.scale.set(br * 5.2, br * 5.2, 1);
        g.add(gs);
        sunLight.position.copy(pos);
        root.add(sunLight);
      } else {
        // 其他星球一层很淡的元素色光斑, 方便在深底上看清
        const el = ELEMENT_OF_SIGN[p.sign] ?? '风';
        const hex = '#' + ELEMENT_COLOR[el].toString(16).padStart(6, '0');
        const gt = track(glowTexture(hex));
        const gs = new THREE.Sprite(track(new THREE.SpriteMaterial({
          map: gt, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending,
        })));
        gs.scale.set(br * 3.6, br * 3.6, 1);
        g.add(gs);
      }
      // 土星环
      if (p.name === 'Saturn') {
        const rg = track(new THREE.RingGeometry(br * 1.4, br * 2.35, 40, 1));
        const pArr = rg.attributes.position, uvA = rg.attributes.uv;
        const v3 = new THREE.Vector3();
        for (let i = 0; i < pArr.count; i++) {
          v3.fromBufferAttribute(pArr, i);
          uvA.setXY(i, (v3.length() - br * 1.4) / (br * 0.95), 0.5);
        }
        const ringMat = track(new THREE.MeshBasicMaterial({ color: 0xd8c9a8, side: THREE.DoubleSide, transparent: true, opacity: 0.0 }));
        texLoader.load('/textures/planet/2k_saturn_ring_alpha.png', (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          ringMat.map = t; ringMat.opacity = 0.9; ringMat.needsUpdate = true;
        });
        const rm = new THREE.Mesh(rg, ringMat);
        rm.rotation.x = Math.PI / 2 + 0.45;
        g.add(rm);
      }
      // 符号标签(球上方)
      const lt = track(textTexture(`${p.symbol}${p.retrograde ? '℞' : ''}`, 44, '#f2f6ff'));
      const ls = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: lt, transparent: true, depthWrite: false })));
      ls.position.set(0, br + 0.28, 0);
      ls.scale.set(0.42, 0.42, 1);
      g.add(ls);
      root.add(g);
      planetObjs.push({ name: p.name, group: g, mesh, lon: p.longitude, lat });

      // 脚线 + 刻度点 (球→星座环上的影子)
      const foot = polar(R_MID - 0.02, a);
      const lg = track(new THREE.BufferGeometry().setFromPoints([pos, foot]));
      root.add(new THREE.Line(lg, track(new THREE.LineBasicMaterial({ color: 0x8ea3c8, transparent: true, opacity: 0.35 }))));
      const dot = new THREE.Mesh(
        track(new THREE.CircleGeometry(0.06, 14)),
        track(new THREE.MeshBasicMaterial({ color: ELEMENT_COLOR[ELEMENT_OF_SIGN[p.sign] ?? '风'], transparent: true, opacity: 0.95, side: THREE.DoubleSide })),
      );
      dot.position.copy(foot); dot.rotation.x = -Math.PI / 2;
      root.add(dot);
    }
    root.add(sunLight); // 兜底: Sun不在行星列表(理论上不会发生)时灯仍生效, 幂等add无副作用

    // ---------- 相位线 ----------
    const aspectLines: { mesh: THREE.Line; a: string; b: string; baseOp: number; hot: boolean }[] = [];
    const lonOf: Record<string, number> = {};
    for (const p of chart.planets) lonOf[p.name] = p.longitude;
    for (const asp of aspects) {
      if (!(asp.a in lonOf) || !(asp.b in lonOf)) continue;
      const p0 = polar(R_PLAN - 0.55, lonToAngle(lonOf[asp.a], ascLon));
      const p1 = polar(R_PLAN - 0.55, lonToAngle(lonOf[asp.b], ascLon));
      const hot = asp.type === 'trine' || asp.type === 'sextile';
      const conj = asp.type === 'conjunction';
      const col = conj ? 0xcdb88a : hot ? 0x8aa8d8 : 0xe8a08a;
      const baseOp = conj ? 0.42 : 0.5;
      const mesh = new THREE.Line(
        track(new THREE.BufferGeometry().setFromPoints([p0, p1])),
        track(new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: baseOp })),
      );
      root.add(mesh);
      aspectLines.push({ mesh, a: asp.a, b: asp.b, baseOp, hot });
    }

    // ---------- 高亮 ----------
    // 光晕/标签 sprite 记录基准透明度, 选中=放大, 其他=压暗(反复切换不衰减)
    for (const po of planetObjs) {
      po.group.traverse((o) => {
        const sp = o as THREE.Sprite;
        if (sp.isSprite && (sp.material as THREE.SpriteMaterial).userData?.base === undefined) {
          (sp.material as THREE.SpriteMaterial).userData = { ...(sp.material as THREE.SpriteMaterial).userData, base: (sp.material as THREE.SpriteMaterial).opacity };
        }
      });
    }
    let curSel = selected;
    const applyHighlight = () => {
      const name = curSel;
      const selPlanet = name ? chart.planets.find((x) => x.name === name) ?? null : null;
      for (const po of planetObjs) {
        const dim = name ? (po.name === name ? 1 : 0.25) : 1;
        po.group.scale.setScalar(po.name === name ? 1.35 : 1);
        const m = po.mesh.material as THREE.MeshPhongMaterial;
        if (m.emissiveIntensity !== undefined) m.emissiveIntensity = po.name === name ? 2.2 : 1;
        po.group.traverse((o) => {
          const sp = o as THREE.Sprite;
          if (sp.isSprite) {
            const base = (sp.material as THREE.SpriteMaterial).userData?.base as number | undefined ?? (sp.material as THREE.SpriteMaterial).opacity;
            (sp.material as THREE.SpriteMaterial).opacity = base * dim;
          }
        });
      }
      for (const al of aspectLines) {
        const isHot = name && (al.a === name || al.b === name);
        (al.mesh.material as THREE.LineBasicMaterial).opacity = name ? (isHot ? 0.98 : 0.05) : al.baseOp;
      }
      for (const hs of houseSlices) {
        const ud = hs.userData as { signSlice?: number; houseSlice?: number; baseOpacity: number };
        let target = ud.baseOpacity;
        if (selPlanet) {
          if (ud.signSlice !== undefined && SIGN_ORDER[ud.signSlice] === selPlanet.sign) target = 0.42;
          if (ud.houseSlice !== undefined && selPlanet.house === ud.houseSlice) target = Math.max(target, 0.32);
        }
        (hs.material as THREE.MeshBasicMaterial).opacity = target;
      }
    };
    applyHighlight();
    apiRef_local.apply = applyHighlight;
    apiRef_local.set = (n: string | null) => { curSel = n; applyHighlight(); };

    // ---------- 拖拽旋转 + 滚轮变焦 + 点击拾取 ----------
    let dragging = false, movedPx = 0, lastX = 0, lastY = 0;
    let yawV = 0, pitchV = 0;             // 惯性速度
    let spinY = 0, tiltUser = 0;          // 自转角 / 用户俯仰偏置
    let fov = 42;
    let aimLL: [number, number] | null = null;

    const el = renderer.domElement;
    const onDown = (e: PointerEvent) => { dragging = true; movedPx = 0; lastX = e.clientX; lastY = e.clientY; };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      movedPx += Math.abs(dx) + Math.abs(dy);
      yawV = dx * 0.005; pitchV = dy * 0.005;
      spinY += yawV;
      tiltUser = Math.min(0.5, Math.max(-0.5, tiltUser + pitchV));
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (movedPx > 7) return; // 拖拽不算点击
      const rect = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(planetObjs.map((o) => o.mesh), false);
      if (hits.length) onSelect(hits[0].object.userData.planet as string);
      else onSelect(null);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      fov = Math.min(75, Math.max(16, fov + e.deltaY * 0.02));
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    // 聚焦: 把行星转到"近侧屏幕中下"(朝相机一侧, 显得大、标签可读)
    aimRef.current = { aim: (lon, lat) => { void lat; aimLL = [lon, 0]; } };

    // ---------- 渲染循环 ----------
    let raf = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!dragging) { // 惯性衰减
        yawV *= 0.88; pitchV *= 0.88;
        spinY += yawV;
        tiltUser = Math.min(0.5, Math.max(-0.5, tiltUser + pitchV));
      }
      // 倾角(top平视/side立起) + 用户偏置; YXZ序: y=世界自转, x=盘面倾角
      const targetTilt = (view === 'side' ? 1.12 : 0) + tiltUser * (view === 'side' ? 0.4 : 1);
      root.rotation.x += (targetTilt - root.rotation.x) * Math.min(1, dt * 5);
      if (aimLL) { // 聚焦收敛: 世界角 a+ry = -π/2 (近侧)
        const a = lonToAngle(aimLL[0], ascLon);
        const wantY = -Math.PI / 2 - a;
        const diff = ((wantY - spinY + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        if (Math.abs(diff) < 0.008) aimLL = null;
        else spinY += diff * Math.min(1, dt * 5);
      }
      root.rotation.y += (spinY - root.rotation.y) * Math.min(1, dt * 9);
      camera.fov += (fov - camera.fov) * Math.min(1, dt * 7);
      camera.updateProjectionMatrix();
      for (const po of planetObjs) po.mesh.rotation.y += dt * 0.12; // 星球自转
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    // 进场: 太阳转到近侧(第一眼看见太阳)
    if (sunP) {
      const a0 = lonToAngle(sunP.longitude, ascLon);
      spinY = root.rotation.y = -Math.PI / 2 - a0;
    }
    tick();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('wheel', onWheel);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
      aimRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, view]);

  // selected 变化 → 高亮 + 聚焦 (不重建场景)
  useEffect(() => {
    apiRef_local.set?.(selected);
    const p = selected ? chart.planets.find((x) => x.name === selected) : null;
    if (p) aimRef.current?.aim(p.longitude, p.eclLat ?? 0);
  }, [selected, chart]);

  return <div ref={mountRef} className="h-[420px] w-full cursor-grab active:cursor-grabbing sm:h-[520px]" />;
}

// 轻量单例桥 (场景重建频率低, 避免 ref 穿透层层传递)
const apiRef_local: { set?: (n: string | null) => void; apply?: () => void } = {};

function norm180(r: number): number {
  let x = r % (Math.PI * 2);
  if (x > Math.PI) x -= Math.PI * 2;
  if (x < -Math.PI) x += Math.PI * 2;
  return x;
}

// ---------- 点击标注卡(纯标注, 无AI) ----------
function PlanetDetail({ p, chart, zhMode, onClose }: {
  p: VPlanet; chart: VChart; zhMode: boolean; onClose: () => void;
}) {
  const { t } = useI18n();
  const myAspects = [...chart.aspects].filter((a) => a.a === p.name || a.b === p.name).sort((x, y) => x.orb - y.orb);
  const myRecep = chart.receptions.filter((r) => r.a === p.name || r.b === p.name);
  const signZh = (s: string) => SIGNS_ZH_MINI[s] ?? s;

  return (
    <div className="mt-3 rounded-2xl border border-white/[0.09] bg-white/[0.03] p-5" style={{ animation: 'rise-in 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl text-accent">{p.symbol}</span>
          <div>
            <p className="font-display text-lg tracking-[0.12em] text-frost">{zhMode ? p.zh : p.name}</p>
            <p className="text-[11px] text-muted">{p.formatted}</p>
          </div>
        </div>
        <button onClick={onClose} className="glass-btn px-3 py-1 text-[10px] tracking-[0.2em]">✕</button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-2.5">
          <p className="text-[9px] tracking-[0.2em] text-muted uppercase">{t('astro.d.sign')}</p>
          <p className="mt-1 text-[13px] text-frost">{zhMode ? `${p.signZh} ${p.degInSign.toFixed(1)}°` : `${p.sign} ${p.degInSign.toFixed(1)}°`}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-2.5">
          <p className="text-[9px] tracking-[0.2em] text-muted uppercase">{t('astro.d.house')}</p>
          <p className="mt-1 text-[13px] text-frost">{p.house ? (zhMode ? `第${p.house}宫` : `H${p.house}`) : '—'}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-2.5">
          <p className="text-[9px] tracking-[0.2em] text-muted uppercase">{t('astro.d.state')}</p>
          <p className="mt-1 text-[13px] text-frost">
            {p.dignity && p.dignity.state !== 'Peregrine'
              ? `${DIGNITY_ZH[p.dignity.state] ?? p.dignity.state}${p.dignity.strength ? ` ${p.dignity.strength > 0 ? '+' : ''}${p.dignity.strength}` : ''}`
              : (zhMode ? '游走' : 'Peregrine')}
            {p.retrograde && <span className="ml-1 text-[#e8a08a]">℞</span>}
          </p>
        </div>
      </div>

      {myAspects.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] tracking-[0.25em] text-muted uppercase">{t('astro.d.aspects')}</p>
          <div className="mt-2 space-y-1.5">
            {myAspects.map((a, i) => {
              const other = a.a === p.name ? a.b : a.a;
              const oP = chart.planets.find((x) => x.name === other);
              const app = a.applying === true ? (zhMode ? '入相' : 'applying') : a.applying === false ? (zhMode ? '出相' : 'separating') : '';
              return (
                <p key={i} className="text-[12.5px] text-muted">
                  <span className="mr-1 text-accent/80">{a.symbol}</span>
                  {zhMode ? `${p.zh}${a.typeZh}${oP?.zh ?? other}` : `${p.name} ${a.type} ${other}`}
                  <span className="ml-1.5 text-accent/70">{a.orb.toFixed(1)}°</span>
                  {app && <span className="ml-1.5 text-[10px] text-muted/70">{app}</span>}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {myRecep.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] tracking-[0.25em] text-muted uppercase">{t('astro.d.reception')}</p>
          <div className="mt-2 space-y-1.5">
            {myRecep.slice(0, 6).map((r, i) => {
              const host = chart.planets.find((x) => x.name === r.b);
              const self = chart.planets.find((x) => x.name === r.a);
              return (
                <p key={i} className="text-[12.5px] text-muted">
                  {r.mutual
                    ? (zhMode
                      ? `⇄ 互溶: ${self?.zh ?? r.a} 居${signZh(r.bySign)}为${host?.zh ?? r.b}之${RECEPTION_KIND_ZH[r.kind] ?? r.kind}, 双向为客`
                      : `⇄ Mutual reception: ${r.a} in ${r.bySign} (home of ${r.b})`)
                    : (r.a === p.name
                      ? (zhMode
                        ? `↦ ${host?.zh ?? r.b} 接纳此星 (此星居其${RECEPTION_KIND_ZH[r.kind] ?? r.kind}·${signZh(r.bySign)})`
                        : `↦ received by ${r.b} (in its ${r.kind} · ${r.bySign})`)
                      : (zhMode
                        ? `⊤ 此星接纳 ${self?.zh ?? r.a} (${self?.zh ?? r.a}居${signZh(r.bySign)}为此星${RECEPTION_KIND_ZH[r.kind] ?? r.kind})`
                        : `⊤ receives ${r.a} (in own ${r.kind} · ${r.bySign})`))}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- 对外入口 ----------
export default function ChartWheel({ chart, zhMode }: { chart: VChart; zhMode: boolean }) {
  const { t } = useI18n();
  const [view, setView] = useState<'top' | 'side'>('top');
  const [selected, setSelected] = useState<string | null>(null);
  const selPlanet = selected ? chart.planets.find((p) => p.name === selected) ?? null : null;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="flex gap-1.5">
          <button
            onClick={() => setView('top')}
            className={`rounded-full px-3.5 py-1.5 text-[11px] tracking-[0.15em] transition-colors ${view === 'top' ? 'border border-accent/50 bg-accent/[0.08] text-accent' : 'border border-white/[0.1] text-muted hover:border-white/25'}`}
          >
            {t('astro.view.top')}
          </button>
          <button
            onClick={() => setView('side')}
            className={`rounded-full px-3.5 py-1.5 text-[11px] tracking-[0.15em] transition-colors ${view === 'side' ? 'border border-accent/50 bg-accent/[0.08] text-accent' : 'border border-white/[0.1] text-muted hover:border-white/25'}`}
          >
            {t('astro.view.side')}
          </button>
        </div>
        {/* 星球快捷跳转(小星球点不到时按符号直达) */}
        <div className="flex flex-wrap gap-1">
          {chart.planets.map((p) => (
            <button
              key={p.name}
              onClick={() => setSelected(p.name === selected ? null : p.name)}
              className={`rounded-full border px-2 py-0.5 text-[12px] leading-none transition-colors ${
                selected === p.name ? 'border-accent/60 bg-accent/[0.12] text-accent' : 'border-white/[0.12] text-frost/75 hover:border-white/30'
              }`}
              title={zhMode ? p.zh : p.name}
            >
              {p.symbol}
            </button>
          ))}
        </div>
        {selPlanet && (
          <button onClick={() => setSelected(null)} className="text-[10px] tracking-[0.2em] text-muted/70 hover:text-frost">
            {t('astro.view.clear')}
          </button>
        )}
      </div>

      <ChartScene chart={chart} zhMode={zhMode} view={view} selected={selected} onSelect={setSelected} />

      <p className="pb-2 text-center text-[10px] tracking-[0.18em] text-muted/55">
        {view === 'top' ? t('astro.view.hintTop') : t('astro.view.hintSide')}
      </p>

      {selPlanet && <PlanetDetail p={selPlanet} chart={chart} zhMode={zhMode} onClose={() => setSelected(null)} />}
    </div>
  );
}
