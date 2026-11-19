import { isTrick, tricks, usesPose, isSpin } from './tricks.ts'
import { trickPhase } from './air.ts'
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
type DeckTransform = {
  origin: Point3
  pitch: number
  yaw: number
  roll: number
}
// Apply the same YXZ rotation order as the equipment group in the WebGL rig.
export function deckPoint(deck: DeckTransform, point: Point3): Point3 {
  const [x, y, z] = point,
    cr = Math.cos(deck.roll),
    sr = Math.sin(deck.roll)
  const rx = x * cr - y * sr,
    ry = x * sr + y * cr
  const cp = Math.cos(deck.pitch),
    sp = Math.sin(deck.pitch),
    py = ry * cp - z * sp,
    pz = ry * sp + z * cp
  const cy = Math.cos(deck.yaw),
    sy = Math.sin(deck.yaw)
  return add3(deck.origin, [rx * cy + pz * sy, py, -rx * sy + pz * cy])
}
function endPress(f: Frame, id: Setup['technique']) {
  const sign = id === 'ollie' ? 1 : id === 'nollie' ? -1 : 0
  const a = f.air
  if (a.phase === 'load') return sign * a.charge
  if (a.phase === 'flight')
    return sign * a.charge * Math.max(0, 1 - (2.8 * a.elapsed) / a.duration)
  return 0
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
  const id = setup.technique,
    a = f.air,
    flying = a.phase === 'flight'
  const time = flying ? clamp(a.elapsed / a.duration, 0, 1) : 0
  const press = endPress(f, id)
  const shifty = id === 'shifty' ? a.pose * a.direction : 0
  const grabAmount = id === 'safetyGrab' || id === 'muteGrab' ? a.pose : 0
  const crossed = id === 'muteGrab' ? grabAmount : 0
  const yaw = board
    ? -1.24 + f.heading * 0.13
    : f.heading * 0.28 + 0.56 * shifty
  const hipYaw = yaw - 1.15 * shifty
  const lift = 0.075 * Math.sin(Math.PI * time) + 0.24 * grabAmount
  const base: Point3 = [
    lateral,
    0.935 -
      flex * 0.235 -
      Math.abs(lateral) * 0.18 +
      ripple -
      0.065 * grabAmount,
    0.039 + flex * 0.11 - f.tuck * 0.07 + 0.18 * press,
  ]
  const forward: Point3 = [-Math.sin(yaw), 0, -Math.cos(yaw)]
  const legs = ([-1, 1] as const).map((side) => {
    const roll = f.edge * radians,
      half = board ? 0.148 : 0.064,
      baseX = board ? 0 : side * (0.196 + 0.065 * f.brake)
    const z = board ? side * 0.28 : side * Math.sin(lean) * 0.14
    const stagger = a.switch && !flying ? side * 0.09 : 0
    const skiPitch = press * 0.31,
      twist = -1.04 * shifty
    const origin: Point3 = [
      baseX * Math.cos(twist),
      0.031 +
        half * Math.abs(Math.sin(roll)) +
        0.85 * Math.abs(Math.sin(skiPitch)) +
        lift +
        (side > 0 ? 0.18 : 0.018) * grabAmount +
        (side > 0 ? 0.07 : 0) * crossed,
      z - baseX * Math.sin(twist) + stagger,
    ]
    const deck: DeckTransform = {
      origin,
      pitch: skiPitch,
      yaw:
        twist +
        side *
          ((id === 'wedge' ? 0.18 : 0.008) + f.brake * 0.33 + 0.53 * crossed),
      roll: -roll,
    }
    const ankle: Point3 = board
      ? [
          baseX + 0.148 * Math.sin(roll),
          0.031 + half * Math.abs(Math.sin(roll)) + 0.148 * Math.cos(roll),
          z,
        ]
      : deckPoint(deck, [0, 0.148, 0])
    const contact: Point3 = [
      baseX + Math.sign(roll) * half * Math.cos(roll),
      0.022 + lift,
      z + stagger + 0.83 * press,
    ]
    const hip: Point3 = add3(base, [
      Math.cos(hipYaw) * side * 0.135,
      side * 0.038 * Math.sin(lean),
      -Math.sin(hipYaw) * side * 0.135,
    ])
    const solved = kneeBetween(
      hip,
      ankle,
      add3(forward, [0.23 * Math.sin(f.edge * radians), 0, 0]),
    )
    return { side, hip, ankle, contact, deck, ...solved }
  })
  const outside = board ? 0 : f.edge >= 0 ? 0 : 1
  const com: Point3 = add3(base, [
    lateral * 0.12,
    0.136,
    -0.034 - 0.135 * f.tuck,
  ])
  const grab =
    grabAmount > 0
      ? {
          hand: id === 'muteGrab' ? -1 : 1,
          weight: grabAmount,
          engaged: grabAmount >= 0.99,
          point: deckPoint(legs[1].deck, [0.059, 0.014, -0.235]),
        }
      : null
  // Vertical clearance over the local snow plane. Joint positions are in the slope-aligned rider frame.
  const comHeight = a.height + com[1] / Math.cos(f.pitch * radians)
  return {
    base,
    yaw,
    hipYaw,
    forward,
    flex,
    lean,
    legs,
    outside,
    com,
    comHeight,
    grab,
    shifty,
  }
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
  const flying = f.air.phase === 'flight'
  const lateralN = flying
    ? 0
    : riderMass * (f.lateralAccel + gravity * Math.sin(pitch) * Math.sin(h))
  const weight: Point3 = [0, -riderMass * gravity, 0]
  const drag = flying
    ? scale3(f.air.drag, riderMass)
    : scale3(forward, -riderMass * f.dragAccel)
  const reaction = add3(
    add3(scale3(normal, normalN), scale3(side, lateralN)),
    scale3(forward, -frictionN),
  )
  const net = add3(add3(weight, reaction), drag)
  const firstShare = flying
    ? 0.5
    : board
      ? frontBindingShare(f)
      : (f.edge >= 0 ? f.load : 100 - f.load) / 100
  const contactFraction = flying
    ? 0
    : 1 - 0.75 * Math.abs(endPress(f, setup.technique))
  const area =
    contactFraction *
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
    pressureKpa: area ? normalN / (area * 1000) : 0,
    area,
    contactFraction,
    edgeName: flying
      ? 'Airborne'
      : board
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
    phase: isTrick(setup.technique)
      ? trickPhase(f)
      : Math.abs(f.edge) < 6
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
  if (isTrick(setup.technique)) {
    const a = f.air,
      id = setup.technique
    if (a.phase === 'load')
      return isSpin(id)
        ? 'Hold a direction and release J when the pop meter is full.'
        : 'Release J to take off.'
    if (a.phase === 'flight')
      return usesPose(id)
        ? a.elapsed < a.duration * 0.6
          ? 'Hold K to show the maneuver.'
          : 'Release K and open for the landing.'
        : 'Follow the landing with your eyes and prepare to flex.'
    if (f.t - a.landedAt < 1.8) {
      switch (a.result) {
        case 'Clean landing':
          return a.switch
            ? 'Ride switch and look over your shoulder.'
            : 'Ride out centered over both skis.'
        case 'Late release':
          return 'Release the pose earlier so the skis reopen before contact.'
        case 'Pose missed':
          return 'Hold the pose through the middle of the jump.'
        case 'Under-rotated':
          return 'Fill the pop meter and hold a direction as you take off.'
        case 'Over-rotated':
          return 'Try a shorter pop here. This landing gives the spin more airtime.'
        case 'Short pop':
          return 'Hold the pop longer before releasing.'
      }
    }
    return tricks[id].cue
  }
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
