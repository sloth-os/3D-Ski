import { courses, type Setup } from '../course.ts'
import { buildGates, lineAt, clamp } from '../physics.ts'
import type { MountainView } from '../mountain.ts'

// A perspective canvas renderer keeps the course playable on devices without a WebGL context.
export function canvasMountain(
  container: HTMLElement,
  setup: Setup,
): MountainView {
  const canvas = document.createElement('canvas'),
    ctx = canvas.getContext('2d')!,
    c = courses[setup.course],
    gates = buildGates(c)
  container.appendChild(canvas)
  const pine = (x: number, y: number, h: number) => {
    ctx.fillStyle = '#344e50'
    ctx.fillRect(x - h * 0.035, y - h * 0.36, h * 0.07, h * 0.36)
    for (let i = 0; i < 4; i++) {
      const top = y - h * (0.52 + i * 0.16),
        half = h * (0.24 - i * 0.039)
      ctx.beginPath()
      ctx.moveTo(x, top)
      ctx.lineTo(x + half, top + h * 0.47)
      ctx.lineTo(x - half, top + h * 0.47)
      ctx.closePath()
      ctx.fillStyle = i % 2 ? '#759193' : '#466b69'
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(x, top)
      ctx.lineTo(x + half * 0.55, top + h * 0.3)
      ctx.lineTo(x - half * 0.65, top + h * 0.32)
      ctx.closePath()
      ctx.fillStyle = '#c7dce1'
      ctx.fill()
    }
  }
  return {
    draw(f, opt) {
      const w = container.clientWidth,
        h = container.clientHeight
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      ctx.clearRect(0, 0, w, h)
      const horizon = h * 0.34,
        focal = h * 0.85,
        back = opt.camera === 'wide' ? 8 : opt.camera === 'first' ? 0.55 : 4.3,
        eye = opt.camera === 'wide' ? 3.6 : 2.1
      const proj = (x: number, d: number, y = 0) => {
        const depth = Math.max(0.2, d - f.d + back)
        return [
          w * 0.5 +
            ((x - f.x - Math.sin(f.heading + opt.orbit) * depth * 0.15) *
              focal) /
              depth,
          horizon + ((eye - y) * focal) / depth,
          focal / depth,
        ]
      }
      const grad = ctx.createLinearGradient(0, horizon, 0, h)
      grad.addColorStop(0, '#e5f0f5')
      grad.addColorStop(1, setup.surface === 'ice' ? '#b6d5e7' : '#f7fbfc')
      ctx.fillStyle = grad
      ctx.fillRect(0, horizon, w, h - horizon)
      for (let j = 44; j >= 0; j--) {
        const d = (Math.floor(f.d / 5) + j) * 5
        for (const s of [-1, 1]) {
          const [x, y, k] = proj(s * (26 + 4 * Math.sin(d * 0.73)), d)
          pine(x, y, k * (7 + 2 * Math.sin(d * 0.82)))
        }
      }
      if (opt.line) {
        ctx.setLineDash([4, 5])
        ctx.strokeStyle = '#239f91'
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let i = 80; i >= 0; i--) {
          const d = f.d + i * 1.5
          const [x, y] = proj(lineAt(gates, d), d)
          if (i === 80) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.setLineDash([])
      }
      for (const [i, g] of [...gates].entries()) {
        if (g.d < f.d - 1 || g.d > f.d + 210) continue
        for (const s of [-1, 1]) {
          const [x, y, k] = proj(g.x + s * g.width, g.d)
          ctx.fillStyle = i % 2 ? '#3376bd' : '#d84b37'
          ctx.fillRect(x, y - k * 2, k * 0.07, k * 2)
          ctx.fillRect(x - (s < 0 ? k : 0), y - k * 1.9, k, k * 0.5)
        }
      }
      if (opt.camera !== 'first') {
        const [x, y] = proj(f.x, f.d),
          scale = h / (opt.camera === 'wide' ? 420 : 275)
        ctx.save()
        ctx.translate(x, y)
        ctx.scale(scale, scale)
        ctx.strokeStyle = '#283947'
        ctx.lineWidth = 3
        for (const s of [-1, 1]) {
          ctx.beginPath()
          ctx.moveTo(s * 9, 3)
          ctx.lineTo(s * 5, -15)
          ctx.stroke()
        }
        ctx.rotate(-clamp(f.lean, -0.65, 0.65))
        ctx.lineCap = 'round'
        ctx.lineWidth = 8
        for (const s of [-1, 1]) {
          ctx.beginPath()
          ctx.moveTo(s * 4, -22)
          ctx.lineTo(s * 8, -5)
          ctx.stroke()
        }
        ctx.strokeStyle = '#ed721e'
        ctx.lineWidth = 15
        ctx.beginPath()
        ctx.moveTo(0, -24)
        ctx.lineTo(1, -39 + f.flex * 4)
        ctx.stroke()
        ctx.fillStyle = '#1c2a38'
        ctx.beginPath()
        ctx.arc(1, -48 + f.flex * 4, 6.5, 0, Math.PI * 2)
        ctx.fill()
        if (opt.forces) {
          ctx.strokeStyle = '#16bda8'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(0, -3)
          ctx.lineTo(0, -60)
          ctx.stroke()
          ctx.strokeStyle = '#e7a035'
          ctx.beginPath()
          ctx.moveTo(16, -35)
          ctx.lineTo(16, -8)
          ctx.stroke()
        }
        ctx.restore()
      }
    },
    dispose() {
      canvas.remove()
    },
  }
}
