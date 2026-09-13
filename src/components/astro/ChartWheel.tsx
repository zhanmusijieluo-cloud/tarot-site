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
import ChartWheel2D from '@/components/astro/ChartWheel2D';
import { aspectNum } from '@/lib/astro/aspect-colors';
import { PLANET_ZH_OF } from '@/lib/astro/chart';

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
  a: string; b: string; kind: string; mutual: boolean; aspected?: boolean; bySign: string;
}
export interface VChart {
  houseSystemUsed: string; timeKnown: boolean;
  hourRuler?: string | null;
  combust?: string[]; Cazimi?: string[]; underBeams?: string[]; viaCombusta?: string[];
  input: { year: number; month: number; day: number; hour: number; minute: number; city?: string; label?: string;
    latitude?: number; longitude?: number; timezone?: number; cnCode?: string };
  settings?: { display?: { dir?: 'ccw' | 'cw'; ascPos?: 'left' | 'top'; aspects?: boolean; feet?: boolean; feetAlways?: boolean; nums?: boolean; ticks?: boolean } };
  planets: VPlanet[];
  angles: { ascendant: VPlanet | null; midheaven: VPlanet | null };
  cusps: number[] | null;
  aspects: VAspect[];
  receptions: VReception[];
  warnings: string[];
}

// ---------- 布局常量 (俯视: 屏幕右=+X, 屏幕上=-Z) ----------
const R_OUT = 5.0;    // 星座带外缘 (刻度环基线)
const R_BAND = 3.98;  // 星座带内缘 = 宫位带外缘 (两带分界, 线不再互穿)
const R_SIGN = 3.38;  // 宫位带内缘
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
  const size = Math.max(256, Math.ceil(font * 4));
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
  t.anisotropy = 8; // 斜视角下文字不发糊
  return t;
}

interface SceneProps {
  chart: VChart;
  zhMode: boolean;
  view: 'top' | 'side';
  disp?: {
    dir?: 'ccw' | 'cw'; ascPos?: 'left' | 'top';
    aspects?: boolean; feet?: boolean; feetAlways?: boolean; nums?: boolean; ticks?: boolean;
  };
  /** 外层按钮调场景指令 (回正等) */
  sceneApi?: React.MutableRefObject<{ reset?: () => void; zoom?: (f: number) => void } | null>;
  selected: string | null;
  onSelect: (name: string | null) => void;
}

function ChartScene({ chart, zhMode, view, disp, sceneApi, selected, onSelect }: SceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ set: (n: string | null) => void; reset?: () => void; zoom?: (f: number) => void } | null>(null);

  const ascLon = chart.angles.ascendant?.longitude ?? 0;
  const DIR = disp?.dir ?? 'ccw';
  const ASCP = disp?.ascPos ?? 'left';
  const la = (lon: number) => lonToAngle(lon, ascLon, DIR, ASCP);
  const hasHouses = chart.timeKnown && !!chart.cusps;
  const aspects = useMemo(() => [...chart.aspects].sort((a, b) => a.orb - b.orb).slice(0, 14), [chart]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const mm = mount; // fitOrtho 提升函数闭包用, 保 TS 非空窄化
    const W = mount.clientWidth, H = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // 正交相机: 平行投影, 盘面上下边缘同大小 (透视投影会让下沿大 24%, 即"上小下大"错觉根源)
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.position.set(0, 10.6, 3.1);
    camera.lookAt(0, 0, 0);
    let viewHalfH = 5.86; // 默认视高半径(世界单位), resize 时按画布比例算

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

    // ---------- 星座带 (外环 R_BAND→R_OUT) + 宫位带 (内环 R_SIGN→R_BAND): 两带分界不互穿 ----------
    const houseSlices: THREE.Mesh[] = [];
    const cusps = chart.cusps as number[] | null;
    {
      const a1 = (s: number) => la(s * 30); // 星座带扇区起始角(跟随ASC)
      for (let s = 0; s < 12; s++) {
        const geo = track(new THREE.RingGeometry(R_BAND, R_OUT, 24, 1, a1(s), 30 * DEG));
        const el = ELEMENT_OF_SIGN[SIGN_ORDER[s]];
        // 扇区与最外彩弧同步: 同元素色低透明度铺满整带 (爸爸: 颜色与最外环同步)
        const mat = track(new THREE.MeshBasicMaterial({
          color: ELEMENT_COLOR[el], transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false,
        }));
        const m = new THREE.Mesh(geo, mat);
        m.rotation.x = -Math.PI / 2;
        m.userData = { signSlice: s, baseOpacity: 0.5, baseColor: new THREE.Color(ELEMENT_COLOR[el]), litColor: new THREE.Color(0xffffff) };
        // 元素彩弧: 嵌在环带内上缘 (不占刻度区, 不与针脚打架)
        const arc = new THREE.Mesh(
          track(new THREE.RingGeometry(R_OUT - 0.17, R_OUT - 0.025, 20, 1, a1(s), 30 * DEG)),
          track(new THREE.MeshBasicMaterial({ color: ELEMENT_COLOR[el], transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false })),
        );
        arc.rotation.x = -Math.PI / 2;
        // 扇区/彩弧/符号共面 → 必须钉死绘制顺序, 否则倾斜视角下上半弧被扇区盖住(上暗下亮的真凶)
        m.renderOrder = 1; arc.renderOrder = 2;
        root.add(arc);
        root.add(m);
        houseSlices.push(m);
        // 符号: 元素色 + 微光, 大尺寸
        const gt = track(textTexture(SIGN_GLYPH[s], 120, '#f2f5ff', 26));
        const gs = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: gt, transparent: true, opacity: 0.95, depthWrite: false })));
        gs.position.copy(polar((R_BAND + R_OUT) / 2, la(s * 30 + 15)));
        gs.scale.set(1.0, 1.0, 1); // 符号加大 (爸爸: 太浅太小)
        gs.renderOrder = 3
        root.add(gs);
      }
    }
    if (hasHouses && cusps) {
      for (let h = 0; h < 12; h++) {
        const c0 = norm360(cusps[h]), c1 = norm360(cusps[(h + 1) % 12]);
        let span = norm360(c1 - c0); if (span < 1) span = 30;
        const a0 = la(c0);
        const geo = track(new THREE.RingGeometry(R_SIGN, R_BAND - 0.03, 40, 1, a0, span * DEG));
        const el = ELEMENT_OF_SIGN[SIGN_ORDER[Math.floor(c0 / 30) % 12]] ?? '风';
        const mat = track(new THREE.MeshBasicMaterial({
          color: ELEMENT_COLOR[el], transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false,
        }));
        const m = new THREE.Mesh(geo, mat);
        m.rotation.x = -Math.PI / 2;
        m.userData = { houseSlice: h + 1, baseOpacity: 0.13, baseColor: new THREE.Color(ELEMENT_COLOR[el]), litColor: new THREE.Color(0xfdf6e0) };
        root.add(m);
        houseSlices.push(m);
        // 宫头线: 细面片绘制 (WebGL 下 linewidth 无效, 用 quad 才拉得开粗细档)
        const isAcs = h % 3 === 0;
        const radialQuad = (r0: number, r1: number, ang: number, w: number, op: number) => {
          const dir = polar(1, ang).setY(0).normalize()
          const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(w / 2)
          const a = polar(r0, ang).add(perp), b = polar(r0, ang).sub(perp)
          const c = polar(r1, ang).add(perp), d = polar(r1, ang).sub(perp)
          const g = new THREE.BufferGeometry().setFromPoints([a, c, d, a, d, b])
          const mesh = new THREE.Mesh(g, track(new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false })))
          root.add(mesh)
          return mesh
        }
        const lineMesh = radialQuad(R_SIGN, R_BAND, a0, isAcs ? 0.055 : 0.013, isAcs ? 0.95 : 0.55)
        if (isAcs) radialQuad(R_BAND, R_OUT, a0, 0.042, 0.85) // 四轴跨带接 ASC/MC 标签
        // 宫号 (宫位带扇区中点, 角点金色; 图层开关 nums)
        if (disp?.nums !== false) {
          const amid = a0 + (span * DEG) / 2;
          const tex = track(textTexture(String(h + 1), 92, isAcs ? '#fff6d8' : '#f4f8ff', 14));
          const spr = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 1, depthWrite: false })));
          spr.position.copy(polar((R_SIGN + R_BAND) / 2, amid));
          spr.scale.set(0.9, 0.9, 1);
          spr.renderOrder = 5;
          root.add(spr);
        }
      }
      // ASC / MC 锚点标签 (带外)
      const ascA = la(norm360(cusps[0]));
      const mcA = la(norm360(cusps[9]));
      for (const [txt, ang, big] of [['ASC', ascA, 1.15], ['MC', mcA, 1.0]] as const) {
        const tex = track(textTexture(txt, 88, '#d9a8b8', 14));
        const spr = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.95, depthWrite: false })));
        const p = polar(R_OUT + 0.44, ang);
        p.y = 0.26 * (big - 1);
        spr.position.copy(p);
        spr.scale.set(1.6 * big, 0.56 * big, 1);
        root.add(spr);
      }
    } else {
      // 未知时间: 无宫位环, 内环占位淡盘
      const g = track(new THREE.RingGeometry(R_SIGN, R_BAND - 0.03, 128));
      const m = new THREE.Mesh(g, track(new THREE.MeshBasicMaterial({ color: 0x1a2136, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })));
      m.rotation.x = -Math.PI / 2;
      root.add(m);
    }

    // ---------- 外环金线 + 5°/10° 刻度针脚 ----------
    for (const [r, op] of [[R_BAND, 0.55]] as const) {
      const ringLine = new THREE.Mesh(
        track(new THREE.RingGeometry(r, r + 0.013, 220)),
        track(new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: op, side: THREE.DoubleSide })),
      );
      ringLine.rotation.x = -Math.PI / 2;
      root.add(ringLine);
    }
    if (disp?.ticks !== false) for (let lon = 0; lon < 360; lon += 10) {
      const major = lon % 30 === 0;
      const a = la(lon);
      const len = major ? 0.17 : 0.1;
      root.add(new THREE.Line(
        track(new THREE.BufferGeometry().setFromPoints([polar(R_OUT + 0.01, a), polar(R_OUT + len, a)])),
        track(new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: major ? 0.85 : 0.4 })),
      ));
    }

    // ---------- 行星: 同高度平铺 + 近距错层防遮挡 ----------
    const texLoader = new THREE.TextureLoader();
    const planetObjs: { name: string; group: THREE.Group; mesh: THREE.Mesh | THREE.Sprite; r: number; a: number; vr: number; tScale: number; cScale: number; tDim: number; cDim: number; tEmi: number; cEmi: number }[] = [];
    const footGroups: { name: string; obj: THREE.Group }[] = [];
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
      const OFFSETS = [0, -0.5, 0.42, -0.95, 0.8, -1.35, 1.0]; // 先内后外; 下面还有一道按球径夹紧
      const radiusOf = new Map<string, number>();
      for (const g of groups) {
        g.forEach((idx, k) => radiusOf.set(items[idx].p.name, R_PLAN + (OFFSETS[k % OFFSETS.length] ?? (k % 2 ? -1.6 : 1.25))));
      }

      for (const it of items) {
        const p = it.p;
        const kind = p.kind ?? 'planet';
        // 夹紧: 按最大占用算 (选中1.18x放大 + 土星环2.3x + 环倾斜投影余量), 绝不允许碰宫位带内缘
        const brForClamp = (kind === 'asteroid' ? (BODY_R[p.name] ?? 0.14) * 0.55 : BODY_R[p.name] ?? 0.14)
        const maxExtent = p.name === 'Saturn' ? brForClamp * 2.3 * 1.18 : brForClamp * 1.18
        const r = Math.max(1.15, Math.min(radiusOf.get(p.name) ?? R_PLAN, R_BAND - 0.08 - maxExtent));
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
            gs.scale.set(br * 2.4, br * 2.4, 1);
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
          const lt = track(textTexture(`${p.symbol}${p.retrograde ? '℞' : ''}`, 48, '#ffffff', 10));
          const ls = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: lt, transparent: true, depthWrite: false })));
          ls.position.set(0, br + 0.3, 0);
          ls.scale.set(0.44, 0.44, 1);
          g.add(ls);
        }
        root.add(g);
        // 视觉半径(线端让位用): 虚点=符号半高; 土星=环外沿(爸爸指定保留缝); 其余=球缘紧贴不留缝
        const brNow = kind === 'point' ? 0 : (kind === 'asteroid' ? it.br * 0.55 : it.br)
        const vBase = kind === 'point' ? 0.2 : brNow * (p.name === 'Saturn' ? 2.3 : 1)
        planetObjs.push({ name: p.name, group: g, mesh, r, a: it.a, vr: vBase, tScale: 1, cScale: 1, tDim: 1, cDim: 1, tEmi: 1, cEmi: 1 });

        // 脚线 + 刻度点: 乙方案 — 默认仅选中星显示 (feetAlways=true 全体常显)
        if (disp?.feet !== false) {
          const fg = new THREE.Group();
          const foot = polar(R_BAND - 0.02, it.a); // 脚线点到宫位/星座分界, 正对外环刻度
          fg.add(new THREE.Line(
            track(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(pos.x, 0, pos.z), foot])),
            track(new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.75 })),
          ));
          const el = ELEMENT_OF_SIGN[p.sign] ?? '风';
          const dot = new THREE.Mesh(
            track(new THREE.CircleGeometry(0.055, 14)),
            track(new THREE.MeshBasicMaterial({ color: ELEMENT_COLOR[el], transparent: true, opacity: 0.95, side: THREE.DoubleSide })),
          );
          dot.position.copy(foot); dot.rotation.x = -Math.PI / 2;
          fg.add(dot);
          fg.visible = !!disp?.feetAlways;
          root.add(fg);
          footGroups.push({ name: p.name, obj: fg });
        }
      }
    }
    root.add(sunLight); // 幂等兜底

    // ---------- 相位线 ----------
    let orthoT = 1, orthoC = 1;
    const zoomBy = (f: number) => { orthoT = Math.min(1.7, Math.max(0.5, orthoT * f)) };
    const aspectLines: { mesh: THREE.Line; a: string; b: string; baseOp: number; tOp: number }[] = [];
    const ASP_Y = 0.62 // 相位网抬到球体顶之上: 盘是平躺的, 抬高在俯视图里毫无变化, 但球体(最高太阳0.5)再也挡不住线
    // 四轴虚拟锚点: 相位线端点回退用 (盘沿 R_OUT 处, 与 ASC/MC 角标同角; 四轴本身无球体)
    const AXIS_ANCHOR = (() => {
      if (!chart.angles.ascendant || !chart.angles.midheaven) return {};
      const mk = (lon: number) => ({ r: R_OUT - 0.35, a: la(norm360(lon)), vr: 0.25 });
      return {
        Ascendant: mk(chart.angles.ascendant.longitude),
        Midheaven: mk(chart.angles.midheaven.longitude),
        Descendant: mk(norm360(chart.angles.ascendant.longitude + 180)),
        IC: mk(norm360(chart.angles.midheaven.longitude + 180)),
      };
    })();
    for (const asp of aspects) {
      const pa = planetObjs.find((o) => o.name === asp.a) ?? (AXIS_ANCHOR as Record<string, { r: number; a: number; vr: number }>)[asp.a];
      const pb = planetObjs.find((o) => o.name === asp.b) ?? (AXIS_ANCHOR as Record<string, { r: number; a: number; vr: number }>)[asp.b];
      if (!pa || !pb) continue;
      // 端点: 沿两球心连线方向, 各自退出自己的视觉半径 → 大球小球一律"贴边留缝", 不再忽中忽边忽左右
      const P1 = polar(pa.r, pa.a), P2 = polar(pb.r, pb.a)
      const dirV = new THREE.Vector3(P2.x - P1.x, 0, P2.z - P1.z)
      const lenSeg = dirV.length()
      let va = pa.vr, vb = pb.vr
      if (lenSeg < va + vb + 0.08) { const half = Math.max(0.03, lenSeg / 2 - 0.04); va = half; vb = half } // 两球贴身(合相): 各退一半防端点交叉
      dirV.normalize()
      const A = P1.clone().addScaledVector(dirV, va).setY(ASP_Y)
      const B = P2.clone().addScaledVector(dirV, -vb).setY(ASP_Y)
      const col = aspectNum(asp.type); // 爸爸四色: 六合蓝/刑红/拱绿/冲紫 (与网格图例同源)
      const mesh = new THREE.Line(
        track(new THREE.BufferGeometry().setFromPoints([A, B])),
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
        po.tDim = name ? (po.name === name ? 1 : 0.82) : 1;
        po.tEmi = name && po.name === name ? 1.45 : 1;
      }
      // 脚线: 仅选中者显 (常显模式全显)
      for (const fg of footGroups) fg.obj.visible = disp?.feetAlways ? true : (!!name && fg.name === name);
      for (const al of aspectLines) {
        const hot = name && (al.a === name || al.b === name);
        al.tOp = name ? (hot ? 0.95 : 0.16) : al.baseOp;
      }
      for (const hs of houseSlices) {
        const ud = hs.userData as { signSlice?: number; houseSlice?: number; baseOpacity: number; tOpacity?: number; tMix?: number };
        // 轻触原则(爸爸): 保持原色原深浅, 选中段只微调透明度, 未选段绝不变黑
        ud.tOpacity = ud.baseOpacity; ud.tMix = 0
        if (sel) {
          if (ud.signSlice !== undefined && SIGN_ORDER[ud.signSlice] === sel.sign) ud.tOpacity = 0.68 // 原0.5微亮一点
          if (ud.houseSlice !== undefined && sel.house === ud.houseSlice) ud.tOpacity = 0.3           // 原0.13→0.3 同色系加深一档
        }
      }
    };
    applyHighlight(selected);
    // 初帧落位 (重建场景时不从默认值淡入)
    for (const po of planetObjs) { po.cScale = po.tScale; po.cDim = po.tDim; po.cEmi = po.tEmi; po.group.scale.setScalar(po.cScale) }
    for (const al of aspectLines) (al.mesh.material as THREE.LineBasicMaterial).opacity = al.tOp
    for (const hs of houseSlices) {
      const ud = hs.userData as { baseOpacity: number; baseColor: THREE.Color; litColor: THREE.Color; tOpacity?: number; tMix?: number; cMix?: number }
      const mo = hs.material as THREE.MeshBasicMaterial
      mo.opacity = ud.tOpacity ?? ud.baseOpacity
      ud.cMix = ud.tMix ?? 0
      mo.color.copy(ud.baseColor).lerp(ud.litColor, ud.cMix)
    }
    const sceneCtl = { reset: () => { yawV = 0; idleT = 99; fastReturn = true; }, zoom: zoomBy };
    apiRef.current = { set: applyHighlight, ...sceneCtl };
    if (sceneApi) sceneApi.current = sceneCtl;

    // ---------- 拖拽旋转(惯性) + 滚轮变焦 + 点击 ----------
    let dragging = false, movedPx = 0, lastX = 0, lastY = 0;
    let yawV = 0, spinY = 0, fov = 42; // fov 在正交下仅作滚轮档位累加器
    // A方案: 松手静止一会儿后自动弹回 ASC朝左(最近一圈基准); ⟳键立即快回
    let idleT = 0, fastReturn = false;
    const el = renderer.domElement;
    let spinAtDown = 0; // 按下瞬间的盘角 (点击级微移要原样归还)
    const onDown = (e: PointerEvent) => { dragging = true; movedPx = 0; lastX = e.clientX; lastY = e.clientY; idleT = 0; fastReturn = false; spinAtDown = spinY; };
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
      if (movedPx <= 7) {
        // 这是点击不是拖拽: 撤销按下期间所有微转动+惯性, 盘面纹丝不动
        spinY = spinAtDown; yawV = 0;
      } else return;
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
      // 默认不拦截: 页面正常上下滚 (爸爸反馈: 想下滑被盘截住变缩放)
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault();
      orthoT = Math.min(1.7, Math.max(0.5, orthoT + e.deltaY * 0.01)); // Ctrl/⌘+滚轮 = 缩放
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
      orthoC += (orthoT - orthoC) * Math.min(1, dt * 7);
      fitOrtho();
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
        const mUd = mm.userData as { baseColor?: THREE.Color }
        if (!mUd.baseColor) mUd.baseColor = mm.color.clone() // 必须 clone: 存引用会逐帧自乘衰减→漆黑 (爸爸抓到的bug)
        mm.color.copy(mUd.baseColor).multiplyScalar(po.cDim) // 球体本体随 dim 压暗 (每帧从基色重算, 不叠加)
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
        const ud = hs.userData as { baseOpacity: number; baseColor: THREE.Color; litColor: THREE.Color; tOpacity?: number; tMix?: number; cMix?: number }
        const mo = hs.material as THREE.MeshBasicMaterial
        const tgt = ud.tOpacity ?? ud.baseOpacity
        mo.opacity += (tgt - mo.opacity) * hl
        ud.cMix = (ud.cMix ?? 0) + ((ud.tMix ?? 0) - (ud.cMix ?? 0)) * hl
        mo.color.copy(ud.baseColor).lerp(ud.litColor, ud.cMix)
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    function fitOrtho() { // function 声明可提升: 首帧 tick() 同步调用早于此处
      const w = mm.clientWidth, h = mm.clientHeight
      if (!w || !h) return
      const halfH = viewHalfH / orthoC
      const halfW = Math.max(halfH * (w / h), 6.45 / orthoC) // 容外移后的角标 (5.44+0.8=6.24)
      camera.left = -halfW; camera.right = halfW; camera.top = halfH; camera.bottom = -halfH
      camera.updateProjectionMatrix()
    }
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      fitOrtho();
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
  return <div ref={mountRef} className="w-full cursor-grab active:cursor-grabbing h-[min(84vh,880px)]" />;
}

// ---------- 点击标注卡(纯标注, 无AI) ----------
// 星体重要度排序 (爸爸定标: 弹窗内容从重要星体开始 — 七大行星→三王星→4轴→其他)
const BODY_IMP: Record<string, number> = {
  Sun: 70, Moon: 65, Mercury: 60, Venus: 55, Mars: 50, Jupiter: 45, Saturn: 40,
  Uranus: 30, Neptune: 25, Pluto: 20,
  Ascendant: 15, Descendant: 13, 'Midheaven': 12, 'Imum Coeli': 10, IC: 10, MC: 12, ASC: 15, DSC: 13,
};
const impOf = (n: string) => BODY_IMP[n] ?? 0;

function PlanetDetail({ p, chart, zhMode, onClose }: {
  p: VPlanet; chart: VChart; zhMode: boolean; onClose: () => void;
}) {
  const { t } = useI18n();
    const otherOf = (a: { a: string; b: string }) => (a.a === p.name ? a.b : a.a);
    // 相位列表: 先按对方星体重要度倒序 (BODY_IMP 模块级), 同级再按容许度
  const myAspects = [...chart.aspects]
    .filter((a) => a.a === p.name || a.b === p.name)
    .sort((x, y) => impOf(otherOf(y)) - impOf(otherOf(x)) || x.orb - y.orb);
  // 木木体系(爸爸4讲P29-30): 接纳=须成相位的单向许可; 互容=双向同住无需相位; 与古典/IbnEzra完全一致
  // 按 pair 归并: 互容时双向记录合成一条 (此前只显示单向"互容", 漏掉本星对对方的接纳方向 — 爸爸抓到)
  const myRecepRaw = chart.receptions
    .filter((r) => (r.a === p.name || r.b === p.name) && (r.aspected || r.mutual))
  const recepPairs = new Map<string, { other: string; mutual: boolean; aspected: boolean; dir?: { host: string; guest: string; kind: string; sign: string }[] }>()
  for (const r of myRecepRaw) {
    const other = r.a === p.name ? r.b : r.a
    const key = [r.a, r.b].sort().join('|')
    let g = recepPairs.get(key)
    if (!g) { g = { other, mutual: r.mutual, aspected: !!r.aspected, dir: [] }; recepPairs.set(key, g) }
    g.mutual = g.mutual || r.mutual; g.aspected = g.aspected || !!r.aspected
    g.dir!.push({ host: r.b, guest: r.a, kind: r.kind, sign: r.bySign })
  }
  const myRecep = [...recepPairs.values()].sort((a, b) => Number(b.mutual) - Number(a.mutual) || impOf(b.other) - impOf(a.other))
  const signZh = (s: string) => SIGNS_ZH_MINI[s] ?? s;
  const zhOf = (n: string) => chart.planets.find((x) => x.name === n)?.zh ?? PLANET_ZH_OF(n)

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
                  {zhMode ? `${p.zh}${a.typeZh}${zhOf(other)}` : `${p.name} ${a.type} ${other}`}
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
            {myRecep.slice(0, 8).map((rp, i) => (
              <p key={i} className="text-[12.5px] text-muted">
                {rp.mutual && <span className="mr-1 rounded bg-[#cdb88a]/10 px-1 py-px text-[9px] text-[#cdb88a]/90">{rp.aspected ? (zhMode ? '互容+接纳' : 'MR+reception') : (zhMode ? '互容·无相位' : 'MR, no aspect')}</span>}
                {rp.mutual
                  ? (zhMode
                    ? `⇄ ${zhOf(rp.other)}与它互容${rp.aspected ? '+接纳' : ''}: ${rp.dir!.map((d) => `${d.guest === p.name ? '此星' : zhOf(d.guest)}居${signZh(d.sign)}为${d.host === p.name ? '它' : zhOf(d.host)}之${RECEPTION_KIND_ZH[d.kind] ?? d.kind}`).join(', ')}`
                    : `⇄ mutual reception with ${rp.other}: ${rp.dir!.map((d) => `${d.guest} in ${d.sign} (home of ${d.host}, ${d.kind})`).join('; ')}`)
                  : rp.dir!.map((d) => d.guest === p.name
                    ? (zhMode ? `↦ ${zhOf(d.host)} 接纳此星 (此星居其${RECEPTION_KIND_ZH[d.kind] ?? d.kind}·${signZh(d.sign)})` : `↦ received by ${d.host} (in its ${d.kind} · ${d.sign})`)
                    : (zhMode ? `⊤ 此星接纳 ${zhOf(d.guest)} (${zhOf(d.guest)}居${signZh(d.sign)}为此星${RECEPTION_KIND_ZH[d.kind] ?? d.kind})` : `⊤ receives ${d.guest} (in own ${d.kind} · ${d.sign})`)).join(zhMode ? '；' : '; ')}
              </p>
            ))}
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
  const [view, setView] = useState<'top' | 'side' | 'classic'>('top');
  const [selInner, setSelInner] = useState<string | null>(null);
  const selected = selProp !== undefined ? selProp : selInner;
  const setSelected = onSelect ?? setSelInner;
  const selPlanet = selected ? [...chart.planets, chart.angles.ascendant, chart.angles.midheaven].find((p) => p?.name === selected) ?? null : null;
  const sceneApiRef = useRef<{ reset?: () => void; zoom?: (f: number) => void } | null>(null);

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
          <button
            onClick={() => setView('classic')}
            className={`rounded-full px-3.5 py-1.5 text-[11px] tracking-[0.15em] transition-colors ${view === 'classic' ? 'border border-accent/50 bg-accent/[0.08] text-accent' : 'border border-white/[0.1] text-muted hover:border-white/25'}`}
          >
            {t('astro.view.classic')}
          </button>
        </div>
        {/* 星球快捷跳转 */}
        <div className="flex flex-wrap gap-1">
          {[...chart.planets].sort((a, b) => impOf(b.name) - impOf(a.name)).map((p) => (
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
        {view !== 'classic' && <>
          <button
            onClick={() => sceneApiRef.current?.reset?.()}
            className="text-[10px] tracking-[0.2em] text-muted/70 transition-colors hover:text-accent"
            title={t('astro.view.resetTip')}
          >
            ⟳ {t('astro.view.reset')}
          </button>
          <button aria-label="zoom in" onClick={() => sceneApiRef.current?.zoom?.(1.25)} className="ml-1 size-5 rounded-full border border-white/15 text-[11px] leading-none text-muted transition-colors hover:border-white/30 hover:text-frost">+</button>
          <button aria-label="zoom out" onClick={() => sceneApiRef.current?.zoom?.(0.8)} className="size-5 rounded-full border border-white/15 text-[11px] leading-none text-muted transition-colors hover:border-white/30 hover:text-frost">−</button>
        </>}
        <button
          onClick={() => setSelected(null)}
          className={`text-[10px] tracking-[0.2em] text-muted/70 transition-opacity hover:text-frost ${selPlanet ? 'opacity-100' : 'invisible'}`}
        >
          {t('astro.view.clear')}
        </button>
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
      ) : view === 'classic' ? (
        <div className="mx-auto aspect-square w-full max-w-[min(84vh,880px)]">
          <ChartWheel2D chart={chart} zhMode={zhMode} selected={selected} onSelect={setSelected} />
        </div>
      ) : (
        <ChartScene chart={chart} zhMode={zhMode} view={view} disp={chart.settings?.display} sceneApi={sceneApiRef} selected={selected} onSelect={setSelected} />
      )}

      <p className="flex flex-wrap items-center justify-center gap-x-3 pb-2 pt-1 text-center text-[10px] tracking-[0.18em] text-muted/55">
        {gridSlot && view === 'top' ? <AspectLegend zhMode={zhMode} /> : null}
        <span>{view === 'top' ? t('astro.view.hintTop') : view === 'classic' ? t('astro.view.hintClassic') : t('astro.view.hintSide')}</span>
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
