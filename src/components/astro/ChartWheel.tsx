'use client';

// ============================================================
// 3D 星盘轮盘 (C1 · 真实星体版 v2) — three.js
// 方向铁则: ASC 固定9点钟(左), 宫位/星座自 ASC 逆时针增 (标准星盘惯例)
// 行星全部平铺同一高度; 同度数挤靠的星球自动径向错层, 脚线仍指真实刻度
// 点击星球 = 只做高亮+标注卡, 绝不自转盘面 (盘向=客户读盘的方位基准)
// 纪律: 位置数据全部来自排盘引擎, 本组件只画不编
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useI18n } from '@/i18n';
import { AspectLegend } from '@/components/astro/AspectGrid';

// ---------- 与 API 返回对齐的数据类型 ----------
export interface VPlanet {
  name: string; zh: string; symbol: string;
  kind?: 'planet' | 'asteroid' | 'point';
  longitude: number; eclLat?: number; // 黄纬(度), 缺省0
  sign: string; signZh: string; degInSign: number; formatted: string;
  house: number | null; retrograde: boolean; speed?: number;
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
  hourRuler?: string | null;
  combust?: string[]; viaCombusta?: string[];
  input: { year: number; month: number; day: number; hour: number; minute: number; city?: string; label?: string;
    latitude?: number; longitude?: number; timezone?: number; cnCode?: string };
  settings?: { display?: { dir?: 'ccw' | 'cw'; ascPos?: 'left' | 'top'; aspects?: boolean; feet?: boolean; nums?: boolean; ticks?: boolean } };
  planets: VPlanet[];
  angles: { ascendant: VPlanet | null; midheaven: VPlanet | null };
  cusps: number[] | null;
  aspects: VAspect[];
  receptions: VReception[];
  warnings: string[];
}

// ---------- 布局常量 (俯视: 屏幕右=+X, 屏幕上=-Z) ----------
const R_OUT = 5.0;    // 宫位带外缘
const R_BAND = 4.42;  // 宫位带内缘(星座带外缘)
const R_SIGN = 3.45;  // 星座带内缘
const R_PLAN = 2.68;  // 行星基准半径
const GOLD = 0xcdb88a;

// 黄经 → 屏幕角: rel=自ASC逆时针角; a=180°+rel → rel=0在左(9点), 逆时针走
// 黄经 → 屏幕角: rel=自ASC起沿盘序角(逆时针默认); 默认 a=180°+rel → ASC在左(9点)
// dir=cw: 盘序反向(顺时针); ascPos=top: ASC移到12点(360°)
function lonToAngle(lon: number, ascLon: number, dir: 'ccw' | 'cw' = 'ccw', ascPos: 'left' | 'top' = 'left'): number {
  const rel = (((lon - ascLon) % 360) + 360) % 360;
  const signed = dir === 'cw' ? -rel : rel;
  const base = ascPos === 'top' ? 360 : 180;
  return (base + signed) * Math.PI / 180;
}
function polar(r: number, a: number): THREE.Vector3 {
  return new THREE.Vector3(Math.cos(a) * r, 0, -Math.sin(a) * r);
}
const norm360 = (d: number) => ((d % 360) + 360) % 360;

const ELEMENT_OF_SIGN: Record<string, string> = {
  Aries: '火', Leo: '火', Sagittarius: '火',
  Taurus: '土', Virgo: '土', Capricorn: '土',
  Gemini: '风', Libra: '风', Aquarius: '风',
  Cancer: '水', Scorpio: '水', Pisces: '水',
};
const ELEMENT_COLOR: Record<string, number> = {
  '火': 0xe8a08a, '土': 0xcdb88a, '风': 0x9cc3d8, '水': 0x8aa8d8,
};
const ELEMENT_HEX: Record<string, string> = {
  '火': '#e8a08a', '土': '#cdb88a', '风': '#9cc3d8', '水': '#8aa8d8',
};
const SIGN_GLYPH = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const SIGN_ORDER = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
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

// 真实星球贴图 (NASA Solar System Scope)
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
  Pluto: '/textures/planet/2k_moon.jpg', // 无免费冥王星贴图, 灰岩质感代替
};
const BODY_R: Record<string, number> = {
  Sun: 0.42, Moon: 0.19, Mercury: 0.11, Venus: 0.16, Mars: 0.13,
  Jupiter: 0.30, Saturn: 0.26, Uranus: 0.21, Neptune: 0.20, Pluto: 0.09,
};
const DEG = Math.PI / 180;

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
function textTexture(text: string, font: number, color = '#e6ecff', glow = 0): THREE.Texture {
  const size = Math.max(128, Math.ceil(font * 2.6));
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.font = `400 ${font}px "Segoe UI Symbol","Apple Symbols","PingFang SC","Microsoft YaHei",serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (glow > 0) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  ctx.fillStyle = color;
  ctx.fillText(text, size / 2, size / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface SceneProps {
  chart: VChart;
  zhMode: boolean;
  view: 'top' | 'side';
  disp?: {
    dir?: 'ccw' | 'cw'; ascPos?: 'left' | 'top';
    aspects?: boolean; feet?: boolean; nums?: boolean; ticks?: boolean;
  };
  /** 外层按钮调场景指令 (回正等) */
  sceneApi?: React.MutableRefObject<{ reset?: () => void } | null>;
  selected: string | null;
  onSelect: (name: string | null) => void;
}

function ChartScene({ chart, zhMode, view, disp, sceneApi, selected, onSelect }: SceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ set: (n: string | null) => void; reset?: () => void } | null>(null);

  const ascLon = chart.angles.ascendant?.longitude ?? 0;
  const DIR = disp?.dir ?? 'ccw';
  const ASCP = disp?.ascPos ?? 'left';
  const la = (lon: number) => lonToAngle(lon, ascLon, DIR, ASCP);
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
    camera.lookAt(0, 0, 0);

    const root = new THREE.Group();
    root.rotation.order = 'YXZ';
    scene.add(root);
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

    const sunP = chart.planets.find((p) => p.name === 'Sun');
    scene.add(new THREE.AmbientLight(0xbcc8e8, 0.85));
    const sunLight = new THREE.PointLight(0xfff1d6, 2.6, 0, 0);

    // ---------- 背景星尘 ----------
    {
      const pts: number[] = [];
      for (let i = 0; i < 360; i++) {
        const v = new THREE.Vector3().randomDirection();
        const rr = 14 + Math.random() * 8;
        pts.push(v.x * rr, v.y * rr * 0.6, v.z * rr);
      }
      const g = track(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      root.add(new THREE.Points(g, track(new THREE.PointsMaterial({
        color: 0x9fb4d8, size: 0.05, transparent: true, opacity: 0.35, sizeAttenuation: true, depthWrite: false,
      }))));
    }

    // ---------- 中央发光点 ----------
    {
      const ct = track(glowTexture('#9db4e8', 128));
      const cs = new THREE.Sprite(track(new THREE.SpriteMaterial({
        map: ct, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending,
      })));
      cs.scale.set(1.7, 1.7, 1);
      root.add(cs);
    }

    // ---------- 宫位带 (外环: 细分扇区 + 金刻度) ----------
    const houseSlices: THREE.Mesh[] = [];
    const cusps = chart.cusps as number[] | null;
    {
      const a1 = (s: number) => la(s * 30); // 星座带扇区起始角(跟随ASC)
      for (let s = 0; s < 12; s++) {
        const geo = track(new THREE.RingGeometry(R_SIGN, R_BAND, 24, 1, a1(s), 30 * DEG));
        const el = ELEMENT_OF_SIGN[SIGN_ORDER[s]];
        const mat = track(new THREE.MeshBasicMaterial({
          color: ELEMENT_COLOR[el], transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false,
        }));
        const m = new THREE.Mesh(geo, mat);
        m.rotation.x = -Math.PI / 2;
        m.userData = { signSlice: s, baseOpacity: 0.10 };
        root.add(m);
        houseSlices.push(m);
        // 符号: 元素色 + 微光, 大尺寸
        const gt = track(textTexture(SIGN_GLYPH[s], 96, ELEMENT_HEX[el], 10));
        const gs = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: gt, transparent: true, opacity: 0.95, depthWrite: false })));
        gs.position.copy(polar((R_SIGN + R_BAND) / 2, la(s * 30 + 15)));
        gs.scale.set(0.6, 0.6, 1);
        root.add(gs);
        // 星座边界: 30° 金色细线
        const ab = la(s * 30);
        root.add(new THREE.Line(
          track(new THREE.BufferGeometry().setFromPoints([polar(R_SIGN, ab), polar(R_OUT, ab)])),
          track(new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.32 })),
        ));
      }
    }
    if (hasHouses && cusps) {
      for (let h = 0; h < 12; h++) {
        const c0 = norm360(cusps[h]), c1 = norm360(cusps[(h + 1) % 12]);
        let span = norm360(c1 - c0); if (span < 1) span = 30;
        const a0 = la(c0);
        const geo = track(new THREE.RingGeometry(R_BAND + 0.04, R_OUT, 40, 1, a0, span * DEG));
        const el = ELEMENT_OF_SIGN[SIGN_ORDER[Math.floor(c0 / 30) % 12]] ?? '风';
        const mat = track(new THREE.MeshBasicMaterial({
          color: ELEMENT_COLOR[el], transparent: true, opacity: 0.045, side: THREE.DoubleSide, depthWrite: false,
        }));
        const m = new THREE.Mesh(geo, mat);
        m.rotation.x = -Math.PI / 2;
        m.userData = { houseSlice: h + 1, baseOpacity: 0.045 };
        root.add(m);
        houseSlices.push(m);
        // 宫头线 (角点1/4/7/10用金色)
        const isAcs = h % 3 === 0;
        root.add(new THREE.Line(
          track(new THREE.BufferGeometry().setFromPoints([polar(R_SIGN, a0), polar(R_OUT, a0)])),
          track(new THREE.LineBasicMaterial({
            color: isAcs ? GOLD : 0x6f84ab, transparent: true, opacity: isAcs ? 0.95 : 0.6,
          })),
        ));
        // 宫号 (扇区中点, 角点金色; 图层开关 nums)
        if (disp?.nums !== false) {
          const amid = a0 + (span * DEG) / 2;
          const tex = track(textTexture(String(h + 1), 46, isAcs ? '#e3d3a3' : '#9fb2d4'));
          const spr = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.95, depthWrite: false })));
          spr.position.copy(polar((R_BAND + R_OUT) / 2, amid));
          spr.scale.set(0.3, 0.3, 1);
          root.add(spr);
        }
      }
      // ASC / MC 锚点标签 (带外)
      const ascA = la(norm360(cusps[0]));
      const mcA = la(norm360(cusps[9]));
      for (const [txt, ang, big] of [['ASC', ascA, 1.15], ['MC', mcA, 1.0]] as const) {
        const tex = track(textTexture(txt, 40, '#e3d3a3'));
        const spr = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.95, depthWrite: false })));
        const p = polar(R_OUT + 0.34, ang);
        p.y = 0.26 * (big - 1);
        spr.position.copy(p);
        spr.scale.set(0.62 * big, 0.24 * big, 1);
        root.add(spr);
      }
    } else {
      // 未知时间: 无宫位环, 只留刻度圈
      const g = track(new THREE.RingGeometry(R_BAND + 0.04, R_OUT, 128));
      const m = new THREE.Mesh(g, track(new THREE.MeshBasicMaterial({ color: 0x1a2136, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })));
      m.rotation.x = -Math.PI / 2;
      root.add(m);
    }

    // ---------- 外环金线 + 5°/10° 刻度针脚 ----------
    for (const [r, op] of [[R_BAND + 0.02, 0.5], [R_OUT, 0.6]] as const) {
      const ringLine = new THREE.Mesh(
        track(new THREE.RingGeometry(r, r + 0.013, 220)),
        track(new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: op, side: THREE.DoubleSide })),
      );
      ringLine.rotation.x = -Math.PI / 2;
      root.add(ringLine);
    }
    if (disp?.ticks !== false) for (let lon = 0; lon < 360; lon += 5) {
      const major = lon % 30 === 0, med = lon % 10 === 0;
      if (!med && !major) {
        // 5°: 极细短针脚
        const a = la(lon);
        root.add(new THREE.Line(
          track(new THREE.BufferGeometry().setFromPoints([polar(R_OUT + 0.01, a), polar(R_OUT + 0.07, a)])),
          track(new THREE.LineBasicMaterial({ color: 0x8a98b8, transparent: true, opacity: 0.3 })),
        ));
        continue;
      }
      const a = la(lon);
      const len = major ? 0.17 : 0.12;
      root.add(new THREE.Line(
        track(new THREE.BufferGeometry().setFromPoints([polar(R_OUT + 0.01, a), polar(R_OUT + len, a)])),
        track(new THREE.LineBasicMaterial({ color: major ? GOLD : 0x8a98b8, transparent: true, opacity: major ? 0.85 : 0.5 })),
      ));
    }

    // ---------- 行星: 同高度平铺 + 近距错层防遮挡 ----------
    const texLoader = new THREE.TextureLoader();
    const planetObjs: { name: string; group: THREE.Group; mesh: THREE.Mesh | THREE.Sprite; r: number; a: number; tScale: number; cScale: number; tDim: number; cDim: number; tEmi: number; cEmi: number }[] = [];
    {
      // 按逆时针角度排序后聚类: 弧距 < 两半径和+0.10 的同组
      const items = chart.planets.map((p) => {
        const a = la(p.longitude);
        const rel = norm360(p.longitude - ascLon);
        return { p, a, rel, br: BODY_R[p.name] ?? 0.14 };
      }).sort((x, y) => x.rel - y.rel);
      const groups: number[][] = [];
      items.forEach((it, i) => {
        const g0 = groups[groups.length - 1];
        if (g0) {
          const prev = items[g0[g0.length - 1]];
          if (Math.abs(it.rel - prev.rel) * DEG * R_PLAN < (prev.br + it.br) * 1.08 + 0.06) g0.push(i);
          else groups.push([i]);
        } else groups.push([i]);
      });
      // 环向跨360°的贴邻也并入
      if (groups.length > 1) {
        const gF = groups[0], gL = groups[groups.length - 1];
        if ((360 - items[gL[gL.length - 1]].rel + items[gF[0]].rel) * DEG * R_PLAN < (items[gL[gL.length - 1]].br + items[gF[0]].br) * 1.08 + 0.06) {
          groups[0] = [...gL.reverse(), ...gF];
          groups.pop();
        }
      }
      const OFFSETS = [0, -0.62, 0.55, -1.18, 1.05]; // 先内后外, 外扩封顶贴星座带
      const radiusOf = new Map<string, number>();
      for (const g of groups) {
        g.forEach((idx, k) => radiusOf.set(items[idx].p.name, R_PLAN + (OFFSETS[k % OFFSETS.length] ?? (k % 2 ? -1.4 : 1.4))));
      }

      for (const it of items) {
        const p = it.p;
        const kind = p.kind ?? 'planet';
        const r = radiusOf.get(p.name) ?? R_PLAN;
        const pos = polar(r, it.a);
        const g = new THREE.Group();
        g.position.copy(pos);

        let mesh: THREE.Mesh | THREE.Sprite;
        if (kind === 'point') {
          // 虚点: 纯发光符号 (无球体), 元素色微光
          const el = ELEMENT_OF_SIGN[p.sign] ?? '风';
          const gt = track(glowTexture(ELEMENT_HEX[el], 128));
          const gs = new THREE.Sprite(track(new THREE.SpriteMaterial({
            map: gt, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending,
          })));
          gs.scale.set(0.5, 0.5, 1);
          g.add(gs);
          const st = track(textTexture(`${p.symbol}${p.retrograde ? '℞' : ''}`, 52, '#eef3ff', 8));
          mesh = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false })));
          mesh.scale.set(0.4, 0.4, 1);
          mesh.userData = { planet: p.name };
          g.add(mesh);
        } else {
          const br = kind === 'asteroid' ? it.br * 0.55 : it.br;
          let mat: THREE.Material;
          if (p.name === 'Sun') mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
          else mat = new THREE.MeshPhongMaterial({
            color: kind === 'asteroid' ? 0x9aa3b5 : p.name === 'Pluto' ? 0xb8b0a8 : 0xffffff,
            emissive: 0x121622, emissiveIntensity: 1, shininess: p.name === 'Moon' ? 2 : 8,
          });
          const geo = track(new THREE.SphereGeometry(br, 24, 14));
          const m = new THREE.Mesh(geo, track(mat));
          m.userData = { planet: p.name };
          g.add(m);
          mesh = m;
          if (kind !== 'asteroid' && TEX[p.name]) {
            texLoader.load(TEX[p.name], (t) => {
              t.colorSpace = THREE.SRGBColorSpace;
              (mat as THREE.MeshPhongMaterial).map = t;
              (mat as THREE.MeshPhongMaterial).needsUpdate = true;
            });
          }
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
            const el = ELEMENT_OF_SIGN[p.sign] ?? '风';
            const gt = track(glowTexture(ELEMENT_HEX[el]));
            const gs = new THREE.Sprite(track(new THREE.SpriteMaterial({
              map: gt, transparent: true, opacity: kind === 'asteroid' ? 0.18 : 0.3, depthWrite: false, blending: THREE.AdditiveBlending,
            })));
            gs.scale.set(br * 3.4, br * 3.4, 1);
            g.add(gs);
          }
          if (p.name === 'Saturn') {
            const rg = track(new THREE.RingGeometry(br * 1.4, br * 2.3, 40, 1));
            const pArr = rg.attributes.position, uvA = rg.attributes.uv;
            const v3 = new THREE.Vector3();
            for (let i = 0; i < pArr.count; i++) {
              v3.fromBufferAttribute(pArr, i);
              uvA.setXY(i, (v3.length() - br * 1.4) / (br * 0.95), 0.5);
            }
            const ringMat = track(new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0 }));
            texLoader.load('/textures/planet/2k_saturn_ring_alpha.png', (t) => {
              t.colorSpace = THREE.SRGBColorSpace;
              ringMat.map = t; ringMat.opacity = 0.9; ringMat.needsUpdate = true;
            });
            const rm = new THREE.Mesh(rg, ringMat);
            rm.rotation.x = Math.PI / 2 + 0.45;
            g.add(rm);
          }
          // 符号标签 (行星/小行星: 球上方)
          const lt = track(textTexture(`${p.symbol}${p.retrograde ? '℞' : ''}`, 44, '#f2f6ff', 6));
          const ls = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: lt, transparent: true, depthWrite: false })));
          ls.position.set(0, br + 0.3, 0);
          ls.scale.set(0.44, 0.44, 1);
          g.add(ls);
        }
        root.add(g);
        planetObjs.push({ name: p.name, group: g, mesh, r, a: it.a, tScale: 1, cScale: 1, tDim: 1, cDim: 1, tEmi: 1, cEmi: 1 });

        // 脚线 + 刻度点 (球 → 真实黄经在星座带上的投影; 图层开关 feet)
        if (disp?.feet !== false) {
          const foot = polar(R_SIGN - 0.01, it.a);
          root.add(new THREE.Line(
            track(new THREE.BufferGeometry().setFromPoints([pos, foot])),
            track(new THREE.LineBasicMaterial({ color: 0x8ea3c8, transparent: true, opacity: 0.3 })),
          ));
          const el = ELEMENT_OF_SIGN[p.sign] ?? '风';
          const dot = new THREE.Mesh(
            track(new THREE.CircleGeometry(0.055, 14)),
            track(new THREE.MeshBasicMaterial({ color: ELEMENT_COLOR[el], transparent: true, opacity: 0.95, side: THREE.DoubleSide })),
          );
          dot.position.copy(foot); dot.rotation.x = -Math.PI / 2;
          root.add(dot);
        }
      }
    }
    root.add(sunLight); // 幂等兜底

    // ---------- 相位线 ----------
    const aspectLines: { mesh: THREE.Line; a: string; b: string; baseOp: number; tOp: number }[] = [];
    for (const asp of aspects) {
      const pa = planetObjs.find((o) => o.name === asp.a);
      const pb = planetObjs.find((o) => o.name === asp.b);
      if (!pa || !pb) continue;
      const ra = Math.max(0.5, pa.r - (BODY_R[asp.a] ?? 0.14) - 0.08);
      const rb = Math.max(0.5, pb.r - (BODY_R[asp.b] ?? 0.14) - 0.08);
      const col = asp.type === 'conjunction' ? GOLD : (asp.type === 'trine' || asp.type === 'sextile') ? 0x8aa8d8 : 0xe8a08a;
      const mesh = new THREE.Line(
        track(new THREE.BufferGeometry().setFromPoints([polar(ra, pa.a), polar(rb, pb.a)])),
        track(new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.5 })),
      );
      root.add(mesh);
      aspectLines.push({ mesh, a: asp.a, b: asp.b, baseOp: 0.5, tOp: 0.5 });
    }

    // ---------- 高亮 (不移动盘面) ----------
    for (const po of planetObjs) {
      po.group.traverse((o) => {
        const sp = o as THREE.Sprite;
        if (sp.isSprite && (sp.material as THREE.SpriteMaterial).userData?.base === undefined) {
          const sm = sp.material as THREE.SpriteMaterial;
          sm.userData = { ...sm.userData, base: sm.opacity };
        }
      });
    }
    // 高亮只改"目标值", 由渲染循环缓动过渡 (点击不再突变动)
    const applyHighlight = (name: string | null) => {
      const sel = name ? chart.planets.find((x) => x.name === name) ?? null : null;
      for (const po of planetObjs) {
        po.tScale = name && po.name === name ? 1.18 : 1;
        po.tDim = name ? (po.name === name ? 1 : 0.55) : 1;
        po.tEmi = name && po.name === name ? 1.7 : 1;
      }
      for (const al of aspectLines) {
        const hot = name && (al.a === name || al.b === name);
        al.tOp = name ? (hot ? 0.95 : 0.16) : al.baseOp;
      }
      for (const hs of houseSlices) {
        const ud = hs.userData as { signSlice?: number; houseSlice?: number; baseOpacity: number; tOpacity?: number };
        let target = ud.baseOpacity;
        if (sel) {
          if (ud.signSlice !== undefined && SIGN_ORDER[ud.signSlice] === sel.sign) target = Math.max(target, ud.baseOpacity + 0.14);
          if (ud.houseSlice !== undefined && sel.house === ud.houseSlice) target = Math.max(target, ud.baseOpacity + 0.1);
        }
        ud.tOpacity = target;
      }
    };
    applyHighlight(selected);
    // 初帧落位 (重建场景时不从默认值淡入)
    for (const po of planetObjs) { po.cScale = po.tScale; po.cDim = po.tDim; po.cEmi = po.tEmi; po.group.scale.setScalar(po.cScale) }
    for (const al of aspectLines) (al.mesh.material as THREE.LineBasicMaterial).opacity = al.tOp
    for (const hs of houseSlices) { const ud = hs.userData as { baseOpacity: number; tOpacity?: number }; (hs.material as THREE.MeshBasicMaterial).opacity = ud.tOpacity ?? ud.baseOpacity }
    const sceneCtl = { reset: () => { yawV = 0; idleT = 99; fastReturn = true; } };
    apiRef.current = { set: applyHighlight, ...sceneCtl };
    if (sceneApi) sceneApi.current = sceneCtl;

    // ---------- 拖拽旋转(惯性) + 滚轮变焦 + 点击 ----------
    let dragging = false, movedPx = 0, lastX = 0, lastY = 0;
    let yawV = 0, spinY = 0, fov = 42;
    // A方案: 松手静止一会儿后自动弹回 ASC朝左(最近一圈基准); ⟳键立即快回
    let idleT = 0, fastReturn = false;
    const el = renderer.domElement;
    const onDown = (e: PointerEvent) => { dragging = true; movedPx = 0; lastX = e.clientX; lastY = e.clientY; idleT = 0; fastReturn = false; };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      movedPx += Math.abs(dx) + Math.abs(dy);
      yawV = dx * 0.005;
      spinY += yawV;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (movedPx > 7) return;
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

    // ---------- 渲染循环 ----------
    let raf = 0, last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!dragging) {
        yawV *= 0.88; spinY += yawV;
        if (Math.abs(yawV) < 0.0015) {
          idleT += dt;
          if (idleT > 1.1 || fastReturn) {
            const home = Math.round(spinY / (Math.PI * 2)) * Math.PI * 2; // 最短路径回最近基准圈
            spinY += (home - spinY) * Math.min(1, dt * (fastReturn ? 7 : 2.2));
            if (Math.abs(home - spinY) < 0.002) { spinY = home; fastReturn = false; }
          }
        } else idleT = 0;
      }
      root.rotation.y += (spinY - root.rotation.y) * Math.min(1, dt * 9);
      const targetTilt = view === 'side' ? 1.02 : 0;
      root.rotation.x += (targetTilt - root.rotation.x) * Math.min(1, dt * 5);
      camera.fov += (fov - camera.fov) * Math.min(1, dt * 7);
      camera.updateProjectionMatrix();
      // 高亮缓动 (0.2s 级别收敛, 消除点击瞬跳)
      const hl = Math.min(1, dt * 9)
      for (const po of planetObjs) {
        po.mesh.rotation.y += dt * 0.12;
        po.cScale += (po.tScale - po.cScale) * hl
        po.cDim += (po.tDim - po.cDim) * hl
        po.cEmi += (po.tEmi - po.cEmi) * hl
        po.group.scale.setScalar(po.cScale)
        const mm = po.mesh.material as THREE.MeshPhongMaterial
        if (mm.emissiveIntensity !== undefined) mm.emissiveIntensity = po.cEmi
        po.group.traverse((o) => {
          const sp = o as THREE.Sprite
          if (sp.isSprite) {
            const base = (sp.material as THREE.SpriteMaterial).userData?.base as number | undefined ?? 1
            ;(sp.material as THREE.SpriteMaterial).opacity = base * po.cDim
          }
        })
      }
      for (const al of aspectLines) {
        const mo = al.mesh.material as THREE.LineBasicMaterial
        mo.opacity += (al.tOp - mo.opacity) * hl
      }
      for (const hs of houseSlices) {
        const ud = hs.userData as { baseOpacity: number; tOpacity?: number }
        const mo = hs.material as THREE.MeshBasicMaterial
        const tgt = ud.tOpacity ?? ud.baseOpacity
        mo.opacity += (tgt - mo.opacity) * hl
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    // 容器自身宽度变化 (弹窗开合让位/抽屉收展) 也要重设画布
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('wheel', onWheel);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
      apiRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, view]);

  // selected 变化 → 只改高亮, 不动盘
  useEffect(() => { apiRef.current?.set(selected); }, [selected]);

  // 俯视: 满高正方形(3D盘为透明层, 与背后相位网格同层 → 方圆相融, 网格四角可见); 侧视: 扁面板
  // 固定大小: 弹窗不再挤压盘面 (A方案定稿)
  return <div ref={mountRef} className={`w-full cursor-grab active:cursor-grabbing ${view === 'side' ? 'h-[min(46vh,460px)]' : 'h-[min(78vh,760px)]'}`} />;
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
    <div className="mt-3 rounded-2xl border border-white/[0.12] bg-[#0c101c]/[0.97] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-md" style={{ animation: 'rise-in 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
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
export default function ChartWheel({ chart, zhMode, selected: selProp, onSelect, gridSlot, cornerSlot, actions }: {
  chart: VChart; zhMode: boolean;
  /** 受控选中 (相位网格行头共用): 不传则内部自管 */
  selected?: string | null; onSelect?: (name: string | null) => void;
  /** 圆盘背后的垫层 (相位网格 方圆重叠); 由父级传入避免循环依赖 */
  gridSlot?: React.ReactNode;
  /** 盘框左上角内嵌槽 (圆外空隙, 放出生资料卡) */
  cornerSlot?: React.ReactNode;
  /** 头部右侧附加按钮区 (列表/网格切换) */
  actions?: React.ReactNode;
}) {
  const { t } = useI18n();
  const [view, setView] = useState<'top' | 'side'>('top');
  const [selInner, setSelInner] = useState<string | null>(null);
  const selected = selProp !== undefined ? selProp : selInner;
  const setSelected = onSelect ?? setSelInner;
  const selPlanet = selected ? [...chart.planets, chart.angles.ascendant, chart.angles.midheaven].find((p) => p?.name === selected) ?? null : null;
  const sceneApiRef = useRef<{ reset?: () => void } | null>(null);

  return (
    <div className="relative rounded-2xl border border-white/[0.07] bg-black/20 p-2">
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
        {/* 星球快捷跳转 */}
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
        {actions}
        <button
          onClick={() => sceneApiRef.current?.reset?.()}
          className="text-[10px] tracking-[0.2em] text-muted/70 transition-colors hover:text-accent"
          title={t('astro.view.resetTip')}
        >
          ⟳ {t('astro.view.reset')}
        </button>
        {selPlanet && (
          <button onClick={() => setSelected(null)} className="text-[10px] tracking-[0.2em] text-muted/70 hover:text-frost">
            {t('astro.view.clear')}
          </button>
        )}
      </div>

      {/* 左上角内嵌: 盘框圆外空隙放资料卡 (与右侧弹窗对称) */}
      {cornerSlot && (
        <div className="pointer-events-none absolute left-3 top-14 z-[6] hidden lg:block">{cornerSlot}</div>
      )}

      {/* 方圆相融: 俯视+网格模式时, 网格垫底(圆外清晰可见), 圆盘浮前; 结构恒定防切视图重挂3D */}
      {gridSlot && view === 'top' ? (
        <div className="relative w-full">
          {/* 底: 相位网格 (撑满容器, 与圆盘同框) */}
          <div className="absolute inset-0 flex items-center justify-center">{gridSlot}</div>
          {/* 遮罩: 精确压住圆盘本体(半径=容器44%), 圆外网格不受影响 */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'rgba(6,8,15,0.92)' }} />
          {/* 前: 圆盘 */}
          <div className="relative">
            <ChartScene chart={chart} zhMode={zhMode} view={view} disp={chart.settings?.display} sceneApi={sceneApiRef} selected={selected} onSelect={setSelected} />
          </div>
        </div>
      ) : (
        <ChartScene chart={chart} zhMode={zhMode} view={view} disp={chart.settings?.display} sceneApi={sceneApiRef} selected={selected} onSelect={setSelected} />
      )}

      <p className="flex flex-wrap items-center justify-center gap-x-3 pb-2 pt-1 text-center text-[10px] tracking-[0.18em] text-muted/55">
        {gridSlot && view === 'top' ? <AspectLegend zhMode={zhMode} /> : null}
        <span>{view === 'top' ? t('astro.view.hintTop') : t('astro.view.hintSide')}</span>
      </p>

      {/* 点击标注: 宽屏浮动在盘旁小窗, 窄屏退回盘下 */}
      {selPlanet && (
        <div className="mt-3 lg:absolute lg:right-3 lg:top-14 lg:z-30 lg:mt-0 lg:max-h-[calc(100%-5rem)] lg:w-[280px] lg:overflow-y-auto">
          <PlanetDetail p={selPlanet} chart={chart} zhMode={zhMode} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}
