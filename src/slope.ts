import type { Course } from './course.ts'

export const radians = Math.PI / 180
export const clamp = (n: number, low: number, high: number) =>
  Math.max(low, Math.min(high, n))

const smooth = (t: number) => {
  const u = clamp(t, 0, 1)
  return u * u * (3 - 2 * u)
}
export const featureStart = 42
export const runoutStart = (c: Course) => c.length - 38
const tau = 2 * Math.PI
export const gullyCenter = (d: number) =>
  6.4 * Math.sin(((d - featureStart) * tau) / 124)

// Distances are along the course's mean slope. All four features fade into an even start and runout.
export function undulation(c: Course, d: number, x = 0): number {
  if (c.form === 'piste')
    return (
      c.bumps *
      (Math.sin(d / 15 + x / 28) * 0.68 + Math.sin(d / 7.4 - x / 18) * 0.32)
    )
  const base = c.bumps * (0.68 * Math.sin(d / 15) + 0.32 * Math.sin(d / 7.4))
  if (d <= featureStart || d >= runoutStart(c)) return base
  const envelope =
    smooth((d - featureStart) / 20) * smooth((runoutStart(c) - d) / 21)
  const progress = (d - featureStart) / (runoutStart(c) - featureStart)
  let feature: number
  switch (c.form) {
    case 'traverse':
      feature = 16 * Math.tanh(x / 16) * 0.15 * Math.cos(Math.PI * progress)
      break
    case 'rollers': {
      // A continuous phase gives a 32 m spacing at entry and 23 m near the runout.
      const span = runoutStart(c) - featureStart
      const phase =
        tau *
        span *
        (progress / 32 + 0.5 * (1 / 23 - 1 / 32) * progress * progress)
      feature =
        (0.68 + 0.19 * progress) * Math.cos(phase + 0.17 * Math.sin(x / 8))
      break
    }
    case 'gully': {
      const wall = (x - gullyCenter(d)) / 8
      feature = (2.5 + 0.8 * progress) * (1 - Math.exp(-0.5 * wall * wall))
      break
    }
    case 'moguls': {
      const row = (Math.PI * (d - featureStart)) / 7.8
      const column = (tau * x) / 5.8 + 0.33 * Math.sin(d / 22)
      const stagger = 0.5 + 0.5 * Math.cos(column) * Math.cos(row)
      feature =
        (0.59 + 0.22 * progress) *
        Math.cos(row) ** 2 *
        (0.08 + 0.92 * stagger ** 1.35)
      break
    }
  }
  return base + envelope * feature
}
export function worldHeight(c: Course, d: number, x = 0): number {
  return -d * Math.sin(c.pitch * radians) + undulation(c, d, x)
}
export function pitchAt(c: Course, d: number, x = 0) {
  return Math.atan2(
    worldHeight(c, d - 0.25, x) - worldHeight(c, d + 0.25, x),
    0.5 * Math.cos(c.pitch * radians),
  )
}
// Positive bank raises the right side. Axes first rotate about the downhill line, then follow pitch.
export function bankAt(c: Course, d: number, x = 0, pitch = pitchAt(c, d, x)) {
  // The three original pistes use the longitudinal model their practice runs were built with.
  if (c.form === 'piste') return 0
  const grade = (undulation(c, d, x + 0.15) - undulation(c, d, x - 0.15)) / 0.3
  return Math.atan(grade * Math.cos(pitch))
}
type Vector = [number, number, number]
export function slopeAxes(pitch: number, bank: number, heading: number) {
  const cp = Math.cos(pitch),
    sp = Math.sin(pitch),
    cb = Math.cos(bank),
    sb = Math.sin(bank),
    ch = Math.cos(heading),
    sh = Math.sin(heading)
  const normal: Vector = [-sb, cp * cb, -sp * cb]
  const forward: Vector = [
    cb * sh,
    cp * sb * sh - sp * ch,
    -sp * sb * sh - cp * ch,
  ]
  const side: Vector = [
    cb * ch,
    cp * sb * ch + sp * sh,
    -sp * sb * ch + cp * sh,
  ]
  return { normal, forward, side }
}
