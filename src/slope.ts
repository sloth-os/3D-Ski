import type { Course } from './course.ts'

export const radians = Math.PI / 180
export const clamp = (n: number, low: number, high: number) =>
  Math.max(low, Math.min(high, n))

// Distance follows the slope. The renderer and the force model sample the same rolling snow surface.
export function undulation(c: Course, d: number, x = 0): number {
  return (
    c.bumps *
    (Math.sin(d / 15 + x / 28) * 0.68 + Math.sin(d / 7.4 - x / 18) * 0.32)
  )
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
