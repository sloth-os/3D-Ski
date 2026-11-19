import {
  courses,
  surfaces,
  techniques,
  type Course,
  type Setup,
} from './course.ts'

export const radians = Math.PI / 180
export const clamp = (n: number, low: number, high: number) =>
  Math.max(low, Math.min(high, n))
const approach = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt))

export type Input = {
  steer: number
  tuck: boolean
  flex: boolean
  brake: boolean
}
export const neutralInput: Input = {
  steer: 0,
  tuck: false,
  flex: false,
  brake: false,
}
export type Gate = { d: number; x: number; width: number }
export type Frame = {
  x: number
  d: number
  t: number
  speed: number
  heading: number
  edge: number
  radius: number
  load: number
  flex: number
  tuck: number
  brake: number
  lean: number
  slip: number
  pitch: number
  gatesSeen: number
  gatesHit: number
  turns: number
  points: number
  quality: number
  maxSpeed: number
  lastGateHit: boolean
  lastGateTime: number
  lastSide: number
  lastTurnTime: number
  focusTime: number
  done: boolean
}
export const emptyFrame = (): Frame => ({
  x: 0,
  d: 0,
  t: 0,
  speed: 0,
  heading: 0,
  edge: 0,
  radius: Infinity,
  load: 50,
  flex: 0.2,
  tuck: 0,
  brake: 0,
  lean: 0,
  slip: 0,
  pitch: 0,
  gatesSeen: 0,
  gatesHit: 0,
  turns: 0,
  points: 0,
  quality: 0,
  maxSpeed: 0,
  lastGateHit: false,
  lastGateTime: -5,
  lastSide: 0,
  lastTurnTime: -2,
  focusTime: 0,
  done: false,
})

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
export function buildGates(c: Course): Gate[] {
  return Array.from({ length: c.gates }, (_, i) => ({
    d: ((i + 0.78) * c.length) / (c.gates + 0.2),
    x: (i % 2 ? -1 : 1) * c.swing * (0.62 + 0.32 * Math.sin(i * 0.8 + 0.4)),
    width: c.width,
  }))
}
export function lineAt(gates: Gate[], distance: number) {
  const index = gates.findIndex((g) => g.d >= distance)
  if (index < 0) return gates[gates.length - 1].x
  const before = gates[index - 1] ?? { d: 0, x: 0 }
  const after = gates[index]
  const fraction = clamp((distance - before.d) / (after.d - before.d), 0, 1)
  return (
    before.x + (after.x - before.x) * (0.5 - 0.5 * Math.cos(Math.PI * fraction))
  )
}

export function step(
  f: Frame,
  input: Input,
  setup: Setup,
  gates: Gate[],
  dt: number,
): void {
  if (f.done || dt <= 0) return
  const course = courses[setup.course],
    surface = surfaces[setup.surface],
    tech = techniques[setup.technique]
  const pitch = pitchAt(course, f.d, f.x)
  f.t += dt
  f.pitch = pitch / radians
  f.tuck = approach(f.tuck, input.tuck && !input.brake ? 1 : 0, 4, dt)
  f.brake = approach(f.brake, input.brake ? 1 : 0, 5, dt)
  f.flex = approach(f.flex, input.flex ? 0.96 : 0.2 + 0.38 * f.tuck, 5, dt)
  const wedge = setup.technique === 'wedge'
  const maxEdge = wedge ? 26 : setup.technique === 'carve' ? 58 : 46
  f.edge = approach(
    f.edge,
    clamp(input.steer, -1, 1) * maxEdge * (1 - 0.32 * f.brake),
    2.3 * tech.response,
    dt,
  )
  const edge = Math.abs(f.edge) * radians
  const rough =
    surface.roughness * Math.abs(Math.sin(f.d * 0.21)) * (1 - 0.62 * f.flex)
  const effectiveGrip = clamp(surface.grip - rough * 0.17, 0.35, 1)
  const offPiste = clamp((Math.abs(f.x) - 21) / 5, 0, 1)
  f.slip = clamp(
    (1 - effectiveGrip) * Math.sin(edge) + f.brake * 0.7 + (wedge ? 0.18 : 0),
    0,
    1,
  )

  // Gravity along the skis, Coulomb sliding resistance, skidding, and quadratic air drag.
  const normal = 9.81 * Math.cos(pitch)
  const resistance =
    normal *
    (surface.friction +
      f.brake * 0.73 +
      f.slip * 0.12 +
      offPiste *
        Math.min(
          0.13,
          Math.max(0, (Math.tan(pitch) - surface.friction) * 0.42),
        ))
  const drag = (0.0093 - 0.004 * f.tuck) * f.speed * f.speed
  const acceleration =
    9.81 * Math.sin(pitch) * Math.cos(f.heading) - resistance - drag
  f.speed = clamp(f.speed + acceleration * dt, 0, 32)
  const cutRadius = tech.sidecut * Math.cos(edge)
  const engagement = Math.sin(edge) * (wedge ? 2.05 : 1.5) * effectiveGrip
  const edgeRate = (Math.sign(f.edge) * f.speed * engagement) / cutRadius
  const gravityRate =
    (-Math.sin(f.heading) * 9.81 * Math.sin(pitch)) / Math.max(f.speed, 3)
  const previousHeading = f.heading
  const intendedRate = edgeRate + gravityRate
  const bankSide = Math.sign(f.x)
  const inwardRate =
    intendedRate * (intendedRate * bankSide > 0 ? 1 - offPiste : 1)
  const bankRate = -bankSide * offPiste * (0.65 + f.speed * 0.075)
  f.heading = clamp(f.heading + (inwardRate + bankRate) * dt, -1.22, 1.22)
  const yawRate = (f.heading - previousHeading) / dt
  f.radius =
    Math.abs(yawRate) > 0.012 && f.speed > 0.2
      ? Math.abs(f.speed / yawRate)
      : Infinity
  const lateral = Math.abs(f.speed * yawRate)
  f.lean = Math.atan2(f.speed * yawRate, normal)
  f.load = clamp(
    50 + (38 * lateral) / (lateral + 3.2) + Math.sin(edge) * 5,
    50,
    94,
  )
  const beforeX = f.x,
    beforeD = f.d
  f.x = clamp(f.x + Math.sin(f.heading) * f.speed * dt, -26.5, 26.5)
  f.d = Math.min(course.length, f.d + Math.cos(f.heading) * f.speed * dt)
  f.maxSpeed = Math.max(f.maxSpeed, f.speed)
  const side = Math.abs(f.edge) >= 9 ? Math.sign(f.edge) : 0
  if (side && side !== f.lastSide && f.speed > 1) {
    if (f.lastSide && f.t - f.lastTurnTime > 0.65) {
      f.turns++
      f.points += 25
    }
    f.lastSide = side
    f.lastTurnTime = f.t
  }
  if (
    Math.abs(f.edge) >= tech.edge[0] &&
    Math.abs(f.edge) <= tech.edge[1] &&
    f.speed > 1 &&
    offPiste < 0.1
  )
    f.focusTime += dt
  f.quality = Math.round((100 * f.focusTime) / f.t)
  const gate = gates[f.gatesSeen]
  if (gate && f.d >= gate.d) {
    const crossingX =
      beforeX +
      ((f.x - beforeX) * (gate.d - beforeD)) / Math.max(0.00001, f.d - beforeD)
    f.lastGateHit = Math.abs(crossingX - gate.x) <= gate.width
    f.gatesSeen++
    f.lastGateTime = f.t
    if (f.lastGateHit) {
      f.gatesHit++
      f.points += 100
    }
  }
  f.done = f.d >= course.length
}

export type Sample = {
  speed: number
  edge: number
  load: number
  radius: number
}
export function sample(f: Frame): Sample {
  return {
    speed: f.speed * 3.6,
    edge: Math.abs(f.edge),
    load: f.load,
    radius: f.radius,
  }
}

// The standby charts show a reproducible sample from the same dynamics used during play.
export function referenceRun(setup: Setup): Sample[] {
  const frame = emptyFrame(),
    gates = buildGates(courses[setup.course]),
    samples: Sample[] = []
  for (let i = 0; i < 646; i++) {
    step(frame, demonstrationInput(frame, setup, gates), setup, gates, 1 / 60)
    if (i % 8 === 0) samples.push(sample(frame))
  }
  return samples.slice(-44)
}
export function summarize(frame: Frame, setup: Setup) {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    date: new Date().toISOString(),
    setup: { ...setup },
    distance: Math.round(frame.d),
    seconds: Math.round(frame.t),
    peak: +(frame.maxSpeed * 3.6).toFixed(1),
    gates: frame.gatesHit,
    seen: frame.gatesSeen,
    turns: frame.turns,
    points: frame.points,
    quality: frame.quality,
    finished: frame.done,
  }
}
export type Run = ReturnType<typeof summarize>

// A reference skier looks ahead along the same gate line the learner can display.
export function demonstrationInput(
  f: Frame,
  setup: Setup,
  gates: Gate[],
): Input {
  const anticipation = 2.6 + f.speed * 0.53
  const targetD = f.d + anticipation
  const center = lineAt(gates, targetD)
  const gradient = (lineAt(gates, targetD + 1) - lineAt(gates, targetD - 1)) / 2
  const predictedX = f.x + Math.tan(f.heading) * anticipation
  const heading =
    Math.atan(gradient) +
    Math.atan2(center - predictedX, anticipation + 4) * 0.85
  const tech = techniques[setup.technique],
    surface = surfaces[setup.surface]
  const rate =
    2.4 * (heading - f.heading) +
    (Math.sin(f.heading) *
      9.81 *
      Math.sin(courses[setup.course].pitch * radians)) /
      Math.max(f.speed, 3)
  const wedge = setup.technique === 'wedge'
  const targetEdge = Math.atan(
    (rate * tech.sidecut) /
      (Math.max(f.speed, 4) * (wedge ? 2.05 : 1.5) * surface.grip),
  )
  const maxEdge = wedge ? 26 : setup.technique === 'carve' ? 58 : 46
  const steer = clamp(targetEdge / (maxEdge * radians), -1, 1)
  const targetSpeed =
    (wedge ? 8.5 : setup.technique === 'short' ? 11.5 : 13.5) +
    1.3 * Math.cos(f.d / 25)
  return {
    steer,
    flex: Math.abs(steer) > 0.42 || f.pitch > courses[setup.course].pitch + 1.2,
    tuck: !wedge && Math.abs(steer) < 0.13,
    brake: f.speed > targetSpeed,
  }
}
