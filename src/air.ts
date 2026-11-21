import type { Course } from './course.ts'
import type { Frame, Input } from './physics.ts'
import { clamp, radians, worldHeight } from './slope.ts'
import {
  isSpin,
  usesPose,
  tricks,
  popEnd,
  spinDegrees,
  requiredSpin,
  type TrickId,
} from './tricks.ts'

type Phase = 'ready' | 'load' | 'flight' | 'landing'
type Landing =
  | 'Clean landing'
  | 'Short pop'
  | 'Under-rotated'
  | 'Over-rotated'
  | 'Opposite spin'
  | 'Pose missed'
  | 'Late release'
  | ''
export type AirState = {
  phase: Phase
  charge: number
  pushElapsed: number
  pushStartFlex: number
  elapsed: number
  duration: number
  height: number
  worldY: number
  vx: number
  vy: number
  vz: number
  drag: [number, number, number]
  spin: number
  spinRate: number
  pose: number
  hold: number
  peak: number
  switch: boolean
  startSwitch: boolean
  alignedSpin: number
  direction: number
  impact: number
  landedAt: number
  result: Landing
  award: number
  attempts: number
  landed: number
  points: number
  bestTime: number
}
export function initialAir(switched = false): AirState {
  return {
    phase: 'ready',
    charge: 0,
    pushElapsed: -1,
    pushStartFlex: 0,
    elapsed: 0,
    duration: 0,
    height: 0,
    worldY: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    drag: [0, 0, 0],
    spin: 0,
    spinRate: 0,
    pose: 0,
    hold: 0,
    peak: 0,
    switch: switched,
    startSwitch: switched,
    alignedSpin: 0,
    direction: 1,
    impact: 0,
    landedAt: -10,
    result: '',
    award: 0,
    attempts: 0,
    landed: 0,
    points: 0,
    bestTime: 0,
  }
}
const compressionTime = 0.28
const pushTime = 0.18
const airDrag = 0.0072
const smooth = (u: number) => u * u * (3 - 2 * u)
const popSpeed = (id: string, charge: number) =>
  (popEnd(id) ? 3.45 : 4.45) * (0.43 + 0.57 * charge)
export function pushProgress(f: Frame) {
  return f.air.phase === 'load' && f.air.pushElapsed >= 0
    ? clamp(f.air.pushElapsed / pushTime, 0, 1)
    : 0
}
// The normal component of the takeoff impulse is delivered while the feet still have support.
export function pushSupport(f: Frame, id: string) {
  const u = pushProgress(f)
  return (
    (6 *
      u *
      (1 - u) *
      popSpeed(id, f.air.charge) *
      Math.cos(f.pitch * radians)) /
    pushTime
  )
}
export function extensionFlex(f: Frame) {
  return (
    f.air.pushStartFlex + (0.21 - f.air.pushStartFlex) * smooth(pushProgress(f))
  )
}
export function landingFlex(f: Frame) {
  const u = clamp((f.t - f.air.landedAt) / compressionTime, 0, 1)
  const depth = 0.4 + 0.46 * clamp(f.air.impact / 4.5, 0, 1)
  return (
    f.air.pushStartFlex + (depth - f.air.pushStartFlex) * (1 - (1 - u) ** 2)
  )
}
export function landingSupport(f: Frame) {
  return f.air.phase === 'landing'
    ? ((2 * f.air.impact) / compressionTime) *
        clamp(1 - (f.t - f.air.landedAt) / compressionTime, 0, 1)
    : 0
}
export function bodyHeading(f: Frame) {
  const a = f.air
  if (f.pivot) {
    const t = f.pivot.progress
    return (
      (a.switch ? Math.PI : 0) +
      f.pivot.direction * Math.PI * t * t * (3 - 2 * t)
    )
  }
  if (a.phase === 'flight') return (a.startSwitch ? Math.PI : 0) + a.spin
  if (a.phase === 'landing') {
    const settle = clamp((f.t - a.landedAt) / compressionTime, 0, 1)
    return (
      (a.startSwitch ? Math.PI : 0) + a.spin + (a.alignedSpin - a.spin) * settle
    )
  }
  return a.switch ? Math.PI : 0
}
export function trickPhase(f: Frame) {
  switch (f.air.phase) {
    case 'load':
      return 'Takeoff'
    case 'flight':
      return 'Maneuver'
    case 'landing':
      return 'Landing'
    default:
      return 'Approach'
  }
}
export function shoulderLook(f: Frame) {
  const amount = f.air.phase === 'flight' ? 1.1 : 2.16
  return (amount * f.lookSide * (1 - Math.cos(bodyHeading(f)))) / 2
}
export function boardHeadYaw(f: Frame) {
  return 0.9 - 1.04 * (1 - Math.cos(bodyHeading(f)))
}
export function foreAftPress(f: Frame, id: string) {
  const a = f.air,
    sign = popEnd(id) * (a.switch ? -1 : 1)
  if (a.phase === 'load') return sign * a.charge
  if (a.phase === 'flight')
    return sign * a.charge * Math.max(0, 1 - (2.8 * a.elapsed) / a.duration)
  return 0
}
export function stepPivot(f: Frame, input: Input, dt: number) {
  if (
    input.pivot &&
    !f.pivotHeld &&
    !f.pivot &&
    f.air.phase === 'ready' &&
    !input.jump
  ) {
    f.pivot = { progress: 0, direction: Math.sign(input.steer) || 1 }
  }
  f.pivotHeld = !!input.pivot
  if (!f.pivot) return
  const progress = f.pivot.progress + dt / 0.8
  if (progress < 1) f.pivot = { ...f.pivot, progress }
  else {
    f.air = { ...f.air, switch: !f.air.switch }
    f.pivot = null
    f.lastSide = 0
  }
}
function launch(f: Frame, id: TrickId, course: Course) {
  const a = f.air,
    pitch = f.pitch * radians
  const maxPop = popSpeed(id, 1)
  const pop = popSpeed(id, a.charge)
  const angle = spinDegrees(id) * radians
  // A weak-drag estimate sets the spin for a full pop on a planar slope.
  // Local terrain curvature and the player's charge change the actual time available.
  const fullPopTime = (2 * maxPop) / 9.81
  const turnRate = angle * (1 / fullPopTime + (airDrag * f.speed) / 6)
  Object.assign(a, {
    phase: 'flight',
    height: 0,
    elapsed: 0,
    peak: 0,
    pose: 0,
    hold: 0,
    spin: 0,
    startSwitch: a.switch,
    direction: a.direction || 1,
    spinRate: a.direction * turnRate,
    worldY: worldHeight(course, f.d, f.x),
    duration: (2 * pop) / 9.81,
    attempts: a.attempts + 1,
    vx: f.speed * Math.sin(f.heading),
    vy: pop - f.speed * Math.cos(f.heading) * Math.sin(pitch),
    vz: -f.speed * Math.cos(f.heading) * Math.cos(pitch),
  })
}
function land(f: Frame, id: TrickId) {
  const a = f.air,
    spin = Math.abs(a.spin),
    target = spinDegrees(id) * radians
  let result: Landing = 'Clean landing'
  if (isSpin(id) && spin < target - 0.46) result = 'Under-rotated'
  else if (isSpin(id) && spin > target + 0.46) result = 'Over-rotated'
  else if (
    requiredSpin(id, a.startSwitch) &&
    Math.sign(a.spin) !== requiredSpin(id, a.startSwitch)
  )
    result = 'Opposite spin'
  else if (a.charge < 0.36) result = 'Short pop'
  else if (usesPose(id) && a.hold < 0.1) result = 'Pose missed'
  else if (usesPose(id) && a.pose > 0.28) result = 'Late release'
  a.result = result
  a.landedAt = f.t
  a.phase = 'landing'
  a.height = 0
  a.pose = 0
  a.alignedSpin = Math.round(a.spin / Math.PI) * Math.PI
  a.switch =
    a.startSwitch !== (Math.abs(Math.round(a.spin / Math.PI)) % 2 === 1)
  if (a.switch !== a.startSwitch) f.lastSide = 0
  a.impact = Math.max(
    0,
    -a.vy * Math.cos(f.pitch * radians) + a.vz * Math.sin(f.pitch * radians),
  )
  a.award = result === 'Clean landing' ? tricks[id].points : 0
  if (a.award) a.landed++
  a.bestTime = Math.max(a.bestTime, a.elapsed)
  a.points += a.award
  f.points += a.award
  f.normalAccel = 9.81 * Math.cos(f.pitch * radians) + landingSupport(f)
  a.pushStartFlex = f.flex
  f.load = 50
  f.quality = Math.round((100 * a.landed) / a.attempts)
}
// Flight uses world-space velocity. Touchdown is the intersection of the ballistic path and the rolling course.
function fly(f: Frame, id: TrickId, course: Course, input: Input, dt: number) {
  const a = f.air
  const horizontalCos = Math.cos(course.pitch * radians),
    oldY = a.worldY,
    oldD = f.d,
    oldX = f.x
  const k = airDrag * Math.hypot(a.vx, a.vy, a.vz)
  a.drag = [-k * a.vx, -k * a.vy, -k * a.vz]
  const ax = a.drag[0],
    ay = a.drag[1] - 9.81,
    az = a.drag[2]
  const heightAfter = (seconds: number) => {
    const d = clamp(
      oldD - ((a.vz + 0.5 * az * seconds) * seconds) / horizontalCos,
      0,
      course.length,
    )
    const x = clamp(oldX + (a.vx + 0.5 * ax * seconds) * seconds, -26.5, 26.5)
    return (
      oldY + (a.vy + 0.5 * ay * seconds) * seconds - worldHeight(course, d, x)
    )
  }
  const touching = heightAfter(dt) <= 0 && a.elapsed > 0
  let time = dt
  if (touching) {
    let lo = 0,
      hi = dt
    for (let i = 0; i < 9; i++) {
      const mid = (lo + hi) / 2
      if (heightAfter(mid) > 0) lo = mid
      else hi = mid
    }
    time = hi
  }
  f.x = clamp(oldX + (a.vx + 0.5 * ax * time) * time, -26.5, 26.5)
  f.d = clamp(
    oldD - ((a.vz + 0.5 * az * time) * time) / horizontalCos,
    0,
    course.length,
  )
  a.worldY = oldY + (a.vy + 0.5 * ay * time) * time
  a.vx += ax * time
  a.vy += ay * time
  a.vz += az * time
  a.height = Math.max(0, a.worldY - worldHeight(course, f.d, f.x))
  a.peak = Math.max(a.peak, a.height)
  a.elapsed += time
  a.spin += a.spinRate * time
  const wanted = usesPose(id) && input.pose ? 1 : 0
  a.pose += clamp(wanted - a.pose, -9 * time, 8 * time)
  if (a.pose >= 0.73) a.hold += time
  f.speed = Math.hypot(a.vx, a.vz / horizontalCos)
  f.maxSpeed = Math.max(f.maxSpeed, f.speed)
  f.radius = Infinity
  f.edge = 0
  f.edgeRate = 0
  f.brake = 0
  f.lean = 0
  f.slip = 0
  f.normalAccel = 0
  f.frictionAccel = 0
  f.lateralAccel = 0
  f.grip = 0
  f.dragAccel = Math.hypot(...a.drag)
  f.load = 0
  f.flex =
    0.23 +
    0.28 * Math.sin(Math.PI * clamp(a.elapsed / a.duration, 0, 1)) +
    0.42 * a.pose
  if (touching) land(f, id)
}
// Copy the per-step state so paused frames, lab replay samples, and recorder snapshots remain independent.
export function stepAir(
  f: Frame,
  id: TrickId,
  course: Course,
  input: Input,
  dt: number,
): boolean {
  const a = (f.air = { ...f.air })
  if (a.phase === 'landing' && f.t - a.landedAt >= compressionTime) {
    a.phase = 'ready'
    a.charge = 0
  }
  if (a.phase === 'ready' && input.jump && !f.pivot) {
    a.phase = 'load'
    a.charge = 0
    a.pushElapsed = -1
  }
  if (a.phase === 'load') {
    if (a.pushElapsed < 0 && input.jump)
      a.charge = clamp(a.charge + dt / 0.55, 0, 1)
    else {
      if (a.pushElapsed < 0) {
        a.pushElapsed = 0
        a.pushStartFlex = f.flex
        a.direction = Math.sign(input.steer)
      }
      a.pushElapsed += dt
      if (a.pushElapsed >= pushTime) launch(f, id, course)
    }
  }
  if (a.phase !== 'flight') return false
  fly(f, id, course, input, dt)
  return true
}
export function trickDemoControls(f: Frame, id: TrickId, steer: number) {
  // Set the spin on the release frame. The airborne rider keeps the takeoff velocity.
  const clock = f.t % 5.8,
    jump = clock >= 1.48 && clock < 2.13
  return {
    jump,
    pose:
      f.air.phase === 'flight' &&
      f.air.elapsed > 0.055 &&
      f.air.elapsed < f.air.duration * 0.67,
    steer:
      isSpin(id) && f.air.phase === 'load' && f.air.pushElapsed < 0 && !jump
        ? requiredSpin(id, f.air.switch) || (f.air.attempts % 2 ? -1 : 1)
        : steer,
  }
}
