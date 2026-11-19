import { courses, equipmentFor, techniques, type Setup } from './course.ts'
import {
  clamp,
  emptyFrame,
  frontBindingShare,
  pitchAt,
  radians,
  type Frame,
} from './physics.ts'

export type Lens = 'forces' | 'body' | 'contact'
export type Point3 = [number, number, number]
export const riderMass = 75
export const gravity = 9.81
export const lensColors = {
  support: '#c3f47b',
  gravity: '#ffae73',
  drag: '#8ed2fc',
  body: '#b8a7ff',
} as const
export const add3 = (a: Point3, b: Point3): Point3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
]
export const scale3 = (a: Point3, s: number): Point3 => [
  a[0] * s,
  a[1] * s,
  a[2] * s,
]
const dot = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const magnitude = (a: Point3) => Math.hypot(...a)
const unit = (a: Point3) => scale3(a, 1 / (magnitude(a) || 1))

// A two-link leg solves hip and ankle constraints; reported flexion is measured from those same links.
function kneeBetween(hip: Point3, ankle: Point3, forward: Point3) {
  const axis = unit(add3(hip, scale3(ankle, -1))),
    d = clamp(magnitude(add3(hip, scale3(ankle, -1))), 0.17, 0.874)
  const shin = 0.425,
    thigh = 0.452,
    along = (shin ** 2 - thigh ** 2 + d * d) / (2 * d)
  const toward = unit(add3(forward, scale3(axis, -dot(forward, axis))))
  const knee = add3(
    add3(ankle, scale3(axis, along)),
    scale3(toward, Math.sqrt(Math.max(0.0001, shin ** 2 - along ** 2))),
  )
  const upper = unit(add3(hip, scale3(knee, -1))),
    lower = unit(add3(knee, scale3(ankle, -1)))
  return { knee, angle: Math.acos(clamp(dot(upper, lower), -1, 1)) / radians }
}
export function riderPose(f: Frame, setup: Setup) {
  const board = equipmentFor(setup.technique) === 'snowboard',
    lean = clamp(f.lean, -0.89, 0.89)
  const ripple =
    Math.sin(f.d * 0.34) * 0.01 * Math.min(f.speed / 9, 1) * (1 - f.flex)
  const flex = clamp(
    f.flex +
      0.13 * Math.min(Math.abs(f.edge) / 45, 1) +
      clamp((f.normalAccel - 9.4) * 0.025, -0.07, 0.11),
    0.1,
    1,
  )
  const lateral = Math.sin(lean) * 0.56 + Math.sin(f.edge * radians) * 0.085
  const yaw = board ? -1.24 + f.heading * 0.13 : f.heading * 0.28
  const base: Point3 = [
    lateral,
    0.935 - flex * 0.235 - Math.abs(lateral) * 0.18 + ripple,
    0.039 + flex * 0.11 - f.tuck * 0.07,
  ]
  const forward: Point3 = [-Math.sin(yaw), 0, -Math.cos(yaw)]
  const legs = ([-1, 1] as const).map((side) => {
    const roll = f.edge * radians,
      half = board ? 0.148 : 0.064,
      baseX = board ? 0 : side * (0.196 + 0.065 * f.brake)
    const z = board ? side * 0.28 : side * Math.sin(lean) * 0.14
    const ankle: Point3 = [
      baseX + 0.148 * Math.sin(roll),
      0.031 + half * Math.abs(Math.sin(roll)) + 0.148 * Math.cos(roll),
      z,
    ]
    const contact: Point3 = [
      baseX + Math.sign(roll) * half * Math.cos(roll),
      0.022,
      z,
    ]
    const hip: Point3 = add3(base, [
      Math.cos(yaw) * side * 0.135,
      side * 0.038 * Math.sin(lean),
      -Math.sin(yaw) * side * 0.135,
    ])
    const solved = kneeBetween(
      hip,
      ankle,
      add3(forward, [0.23 * Math.sin(f.edge * radians), 0, 0]),
    )
    return { side, hip, ankle, contact, ...solved }
  })
  const outside = board ? 0 : f.edge >= 0 ? 0 : 1
  const com: Point3 = add3(base, [
    lateral * 0.12,
    0.136,
    -0.034 - 0.135 * f.tuck,
  ])
  return { base, yaw, forward, flex, lean, legs, outside, com }
}
export function analyse(f: Frame, setup: Setup) {
  const board = equipmentFor(setup.technique) === 'snowboard',
    pitch = f.pitch * radians,
    h = f.forceHeading
  const normal: Point3 = [0, Math.cos(pitch), -Math.sin(pitch)]
  const forward: Point3 = [
    Math.sin(h),
    -Math.sin(pitch) * Math.cos(h),
    -Math.cos(pitch) * Math.cos(h),
  ]
  const side: Point3 = [
    Math.cos(h),
    Math.sin(pitch) * Math.sin(h),
    Math.cos(pitch) * Math.sin(h),
  ]
  const normalN = riderMass * f.normalAccel,
    frictionN = riderMass * f.frictionAccel
  const lateralN =
    riderMass * (f.lateralAccel + gravity * Math.sin(pitch) * Math.sin(h))
  const weight: Point3 = [0, -riderMass * gravity, 0]
  const drag = scale3(forward, -riderMass * f.dragAccel)
  const reaction = add3(
    add3(scale3(normal, normalN), scale3(side, lateralN)),
    scale3(forward, -frictionN),
  )
  const net = add3(add3(weight, reaction), drag)
  const firstShare = board
    ? frontBindingShare(f)
    : (f.edge >= 0 ? f.load : 100 - f.load) / 100
  const area =
    (board ? 0.34 : 0.245) *
    (setup.surface === 'powder' ? 1.27 : setup.surface === 'ice' ? 0.79 : 1) *
    (0.18 + 0.82 * Math.cos(Math.abs(f.edge) * radians) ** 2)
  return {
    weight,
    drag,
    reaction,
    net,
    normal,
    forward,
    side,
    normalN,
    lateralN,
    frictionN,
    weightN: riderMass * gravity,
    dragN: magnitude(drag),
    reactionN: magnitude(reaction),
    loadG: magnitude(reaction) / (riderMass * gravity),
    contacts: [normalN * firstShare, normalN * (1 - firstShare)],
    firstShare,
    pressureKpa: normalN / (area * 1000),
    area,
    edgeName: board
      ? Math.abs(f.edge) < 3
        ? 'Flat base'
        : f.edge > 0
          ? 'Toe edge'
          : 'Heel edge'
      : Math.abs(f.edge) < 3
        ? 'Flat bases'
        : f.edge > 0
          ? 'Left ski'
          : 'Right ski',
    phase:
      Math.abs(f.edge) < 6
        ? 'Transition'
        : Math.sign(f.edge) * f.edgeRate > 5
          ? 'Engagement'
          : Math.sign(f.edge) * f.edgeRate < -5
            ? 'Release'
            : 'Shaping',
  }
}
export type ForceState = ReturnType<typeof analyse>
export type RiderPose = ReturnType<typeof riderPose>

// A constrained ideal-edge study. The selected angle and speed describe the peak of a linked turn.
export function idealTurn(
  setup: Setup,
  peak: number,
  kmh: number,
  phase = 0,
): Frame {
  const f = emptyFrame(),
    speed = kmh / 3.6,
    transfer = Math.cos(phase)
  f.d = 15
  f.t = phase / 1.2
  f.speed = speed
  f.edge = peak * transfer
  f.edgeRate = -1.2 * peak * Math.sin(phase)
  f.pitch = pitchAt(courses[setup.course], f.d) / radians
  f.radius = techniques[setup.technique].sidecut * Math.cos(f.edge * radians)
  f.lateralAccel = (transfer * speed ** 2) / f.radius
  f.normalAccel = gravity * Math.cos(f.pitch * radians)
  f.lean = Math.atan2(f.lateralAccel, f.normalAccel)
  f.load = clamp(
    50 +
      (38 * Math.abs(f.lateralAccel)) / (Math.abs(f.lateralAccel) + 3.2) +
      5 * Math.sin(Math.abs(f.edge) * radians),
    50,
    94,
  )
  f.flex = 0.27 + 0.36 * Math.abs(transfer) + 0.18 * Math.min(1, speed / 13)
  return f
}

export function coachingCue(f: Frame, setup: Setup) {
  const board = equipmentFor(setup.technique) === 'snowboard',
    drill = techniques[setup.technique]
  if (f.t - f.lastGateTime < 1.8)
    return f.lastGateHit
      ? 'Gate cleared. Soften the legs and look toward the next gate.'
      : 'Look through the next pair of flags and shape the turn earlier.'
  if (f.speed < 2)
    return 'Point downhill to build speed, then guide the first turn.'
  if (f.brake > 0.55)
    return board
      ? 'Let the board skid across the slope to shed speed.'
      : 'Guide the tails across the slope to shed speed.'
  if (f.grip < 0.63 && Math.abs(f.edgeRate) > 26)
    return 'Low grip. Roll onto the next edge progressively.'
  if (Math.abs(f.edge) < 6)
    return board
      ? 'Pass through a flat base before engaging the opposite edge.'
      : 'Pass through flat skis and guide both tips into the next turn.'
  if (Math.sign(f.edge) * f.edgeRate < -8)
    return 'Release the loaded edge and move across the equipment.'
  if (Math.abs(f.edge) > drill.edge[1] + 3)
    return 'Ease the edge angle into the drill’s target range.'
  return drill.cue
}
