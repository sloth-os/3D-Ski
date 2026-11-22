import type { Course } from '../course.ts'
import type { Point3 } from '../analysis.ts'
import { clamp, radians } from '../slope.ts'

type Projected = { x: number; y: number; depth: number }
// Cache the relief and its lighting. Only the slice around the rider is projected on each frame.
export function canvasSnowfield(
  c: Course,
  at: (x: number, d: number) => Point3,
) {
  const spacing = c.form === 'moguls' ? 1.6 : 2.6,
    half = Math.ceil(32 / spacing)
  const columns = half * 2 + 1,
    start = -24
  const rows: Point3[][] = [],
    shades: number[][] = []
  const ramp = Array.from(
    { length: 49 },
    (_, i) =>
      'rgb(' + [174 + i, 195 + i, 209 + Math.round(0.9 * i)].join(',') + ')',
  )
  for (let d = start; d < c.length + 75; d += spacing) {
    const row = Array.from({ length: columns }, (_, i) =>
      at((i - half) * spacing, d),
    )
    rows.push(row)
    const last = rows[rows.length - 2]
    if (!last) continue
    const colors: number[] = []
    for (let i = 0; i < columns - 1; i++) {
      const slopeX = (last[i + 1][1] - last[i][1]) / spacing
      const slopeD =
        (row[i][1] - last[i][1]) / spacing + Math.sin(c.pitch * radians)
      colors.push(Math.round(clamp(33 + 70 * slopeX - 74 * slopeD, 0, 48)))
    }
    shades.push(colors)
  }
  return (
    ctx: CanvasRenderingContext2D,
    project: (p: Point3) => Projected,
    d: number,
  ) => {
    const from = Math.max(0, Math.floor((d - 27 - start) / spacing)),
      to = Math.min(rows.length - 1, Math.ceil((d + 105 - start) / spacing))
    const projected = rows.slice(from, to + 1).map((row) => row.map(project))
    const ahead = projected.at(-1)![half].depth > projected[0][half].depth
    for (let n = 0; n < projected.length - 1; n++) {
      const j = ahead ? projected.length - 2 - n : n,
        a = projected[j],
        b = projected[j + 1]
      for (let i = 0; i < columns - 1; i++) {
        const p = a[i],
          q = a[i + 1],
          r = b[i + 1],
          s = b[i]
        if (
          Math.min(p.depth, q.depth, r.depth, s.depth) < 0.12 ||
          Math.max(p.x, q.x, r.x, s.x) < 0 ||
          Math.min(p.x, q.x, r.x, s.x) > ctx.canvas.width ||
          Math.max(p.y, q.y, r.y, s.y) < 0 ||
          Math.min(p.y, q.y, r.y, s.y) > ctx.canvas.height
        )
          continue
        ctx.fillStyle = ramp[shades[from + j][i]]
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(q.x, q.y)
        ctx.lineTo(r.x, r.y)
        ctx.lineTo(s.x, s.y)
        ctx.closePath()
        ctx.fill()
      }
    }
  }
}
