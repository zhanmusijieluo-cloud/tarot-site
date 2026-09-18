// Starfield 绘制写法微基准: 同一台机器上跑 A/B/C 三种写法, 量 220 颗星 × 300 帧的总耗时
// 目的: 先量后改 —— 确认「每帧 220 次 fillStyle 字符串 + 220 次独立 fill」到底占多少,
//       再决定要不要动 Starfield.tsx (木木不希望为了性能牺牲视觉)
// 用法: node scripts/_bench_starfield.mjs
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('about:blank')

const res = await page.evaluate(async () => {
  const W = 1440, H = 900, N = 220, FRAMES = 300
  const canvas = document.createElement('canvas')
  const dpr = Math.min(devicePixelRatio || 1, 2)
  canvas.width = W * dpr; canvas.height = H * dpr
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const mkStars = () => {
    const s = []
    for (let i = 0; i < N; i++) s.push({
      x: Math.random() * W, y: Math.random() * H,
      z: Math.random() * 2 + 0.5, size: Math.random() * 1.5 + 0.45,
      speed: Math.random() * 0.15 + 0.02, opacity: Math.random() * 0.45 + 0.4,
      twinkleSpeed: Math.random() * 0.02 + 0.005, twinklePhase: Math.random() * Math.PI * 2,
      hueShift: Math.random() < 0.3,
    })
    return s
  }
  const paletteA = '138,130,212', paletteB = '240,238,255'
  const A_STR = 'rgb(138,130,212)', B_STR = 'rgb(240,238,255)'

  // —— A: 现状 —— 每星 beginPath/arc + fillStyle 字符串 + fill; 大星 createRadialGradient
  const runA = (stars) => {
    for (const s of stars) {
      s.twinklePhase += s.twinkleSpeed
      const alpha = s.opacity * (0.78 + 0.22 * Math.sin(s.twinklePhase))
      s.y -= s.speed * s.z
      if (s.y < -10) { s.y = H + 10; s.x = Math.random() * W }
      const color = s.hueShift && s.z > 1.8 ? paletteA : paletteB
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.size * s.z * 0.7, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${color}, ${alpha})`
      ctx.fill()
      if (s.z > 2.2 && s.size > 1.2) {
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 4)
        g.addColorStop(0, `rgba(${paletteA}, ${alpha * 0.5})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(s.x - s.size * 4, s.y - s.size * 4, s.size * 8, s.size * 8)
      }
    }
  }

  // —— B: 零视觉改动 —— fillStyle 用固定字符串 + globalAlpha 承载透明度 (等价于 rgba alpha)
  const runB = (stars) => {
    for (const s of stars) {
      s.twinklePhase += s.twinkleSpeed
      const alpha = s.opacity * (0.78 + 0.22 * Math.sin(s.twinklePhase))
      s.y -= s.speed * s.z
      if (s.y < -10) { s.y = H + 10; s.x = Math.random() * W }
      const color = s.hueShift && s.z > 1.8 ? A_STR : B_STR
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.size * s.z * 0.7, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.globalAlpha = alpha
      ctx.fill()
      if (s.z > 2.2 && s.size > 1.2) {
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 4)
        g.addColorStop(0, `rgba(${paletteA}, ${alpha * 0.5})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(s.x - s.size * 4, s.y - s.size * 4, s.size * 8, s.size * 8)
      }
    }
    ctx.globalAlpha = 1
  }

  // —— C: B + 大星光晕也走 globalAlpha (渐变颜色固定, 只改 alpha) ——
  const runC = (stars) => {
    for (const s of stars) {
      s.twinklePhase += s.twinkleSpeed
      const alpha = s.opacity * (0.78 + 0.22 * Math.sin(s.twinklePhase))
      s.y -= s.speed * s.z
      if (s.y < -10) { s.y = H + 10; s.x = Math.random() * W }
      const color = s.hueShift && s.z > 1.8 ? A_STR : B_STR
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.size * s.z * 0.7, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.globalAlpha = alpha
      ctx.fill()
      if (s.z > 2.2 && s.size > 1.2) {
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 4)
        g.addColorStop(0, 'rgba(138,130,212,0.5)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(s.x - s.size * 4, s.y - s.size * 4, s.size * 8, s.size * 8)
      }
    }
    ctx.globalAlpha = 1
  }

  const bench = (fn, label) => {
    const stars = mkStars()
    // 预热
    for (let i = 0; i < 30; i++) { ctx.clearRect(0, 0, W, H); fn(stars) }
    const t0 = performance.now()
    for (let f = 0; f < FRAMES; f++) { ctx.clearRect(0, 0, W, H); fn(stars) }
    const dt = performance.now() - t0
    return { label, totalMs: +dt.toFixed(1), perFrameMs: +(dt / FRAMES).toFixed(3) }
  }

  const out = []
  // 交错跑两轮, 抵消 JIT/热漂移
  for (let round = 0; round < 2; round++) {
    out.push(bench(runA, 'A 现状(字符串rgba+独立fill)'))
    out.push(bench(runB, 'B 固定色+globalAlpha'))
    out.push(bench(runC, 'C B+渐变颜色固定'))
  }
  return out
})

console.log('220 颗星 · 1440x900 · DPR' + (await page.evaluate(() => Math.min(devicePixelRatio || 1, 2))) + ' · 每轮 300 帧\n')
for (const r of res) console.log(`  ${r.label.padEnd(30)} 每帧 ${r.perFrameMs} ms   总 ${r.totalMs} ms`)
const byLabel = {}
for (const r of res) { (byLabel[r.label] ??= []).push(r.perFrameMs) }
console.log('\n两轮均值:')
for (const [k, v] of Object.entries(byLabel)) console.log(`  ${k.padEnd(30)} ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3)} ms/帧`)
await b.close()
