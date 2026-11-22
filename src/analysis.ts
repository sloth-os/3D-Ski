import { bankAt, slopeAxes } from './slope.ts'
import {
  contactOnBody,
  bodyGuard,
  isSafety,
  safetyPhases,
  wedgeYaw,
  uphillLook,
  isFall,
} from './safety.ts'
import {
  isTrick,
  tricks,
  usesPose,
  isSpin,
  gripFor,
  requiredSpin,
} from './tricks.ts'
import {
  trickPhase,
  bodyHeading,
  foreAftPress,
  shoulderLook,
  pushProgress,
} from './air.ts'
import {
  courses,
  equipmentFor,
  techniques,
  startsSwitch,
  type Setup,
} from './course.ts'
import {
  clamp,
  emptyFrame,
  frontBindingShare,
  pitchAt,
  radians,
  type Frame,
} from './physics.ts'

export const lenses = ['forces', 'body', 'contact', 'muscles'] as const
export type Lens = (typeof lenses)[number]
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

// Intersect two fixed-length segments in the limb's bend plane.
function bendJoint(
  start: Point3,
  end: Point3,
  bend: Point3,
  upper: number,
  lower: number,
  minReach: number,
) {
  const span = add3(start, scale3(end, -1)),
    axis = unit(span),
    d = clamp(magnitude(span), minReach, upper + lower - 0.003),
    along = (lower ** 2 - upper ** 2 + d * d) / (2 * d)
  const toward = unit(add3(bend, scale3(axis, -dot(bend, axis))))
  return add3(
    add3(end, scale3(axis, along)),
    scale3(toward, Math.sqrt(Math.max(0.0001, lower ** 2 - along ** 2))),
  )
}
type RigidTransform = {
  origin: Point3
  pitch: number
  yaw: number
  roll: number
}
// Both renderers use the same YXZ rotation order for equipment and upper body.
export function transformPoint(
  transform: RigidTransform,
  point: Point3,
): Point3 {
  const [x, y, z] = point,
    cr = Math.cos(transform.roll),
    sr = Math.sin(transform.roll)
  const rx = x * cr - y * sr,
    ry = x * sr + y * cr
  const cp = Math.cos(transform.pitch),
    sp = Math.sin(transform.pitch),
    py = ry * cp - z * sp,
    pz = ry * sp + z * cp
  const cy = Math.cos(transform.yaw),
    sy = Math.sin(transform.yaw)
  return add3(transform.origin, [rx * cy + pz * sy, py, -rx * sy + pz * cy])
}
export const deckPoint = transformPoint
export function mixPoint(a: Point3, b: Point3, w: number): Point3 {
  return add3(scale3(a, 1 - w), scale3(b, w))
}
export const guardHand = (side: number): Point3 => [side * 0.17, 0.36, -0.29]
export const guardElbow = (side: number): Point3 => [side * 0.29, 0.19, -0.13]
export function riderPose(f: Frame, setup: Setup) {
  const board = equipmentFor(setup.technique) === 'snowboard',
    facing = Math.cos(bodyHeading(f)),
    lean = clamp(f.lean * facing, -0.89, 0.89)
  const ripple =
    Math.sin(f.d * 0.34) * 0.01 * Math.min(f.speed / 9, 1) * (1 - f.flex)
  const flex = clamp(
    f.flex +
      0.13 * Math.min(Math.abs(f.edge) / 45, 1) +
      (f.air.phase === 'ready'
        ? clamp((f.normalAccel - 9.4) * 0.025, -0.07, 0.11)
        : 0),
    0.1,
    1,
  )
  const fall = f.safety?.fall ?? 0,
    guard = bodyGuard(f.safety),
    wedgeStop = setup.technique === 'skiStop'
  const roll = wedgeStop ? 0 : f.edge * radians * facing
  const lateral = Math.sin(lean) * 0.56 + Math.sin(roll) * 0.085
  const id = setup.technique,
    a = f.air,
    flying = a.phase === 'flight'
  const time = flying ? clamp(a.elapsed / a.duration, 0, 1) : 0
  const press = foreAftPress(f, id)
  const shifty =
    id === 'boardShifty'
      ? a.pose * (a.switch ? 1 : -1)
      : id === 'shifty'
        ? a.pose * a.direction
        : 0
  const grip = gripFor(id, a.switch)
  const grabAmount = grip ? a.pose : 0
  const crossed = id === 'muteGrab' ? grabAmount : 0
  const yaw = board
    ? -1.24 + f.heading * 0.13 + 0.49 * shifty
    : f.heading * 0.28 + 0.56 * shifty + 0.38 * shoulderLook(f)
  const hipYaw = board
    ? yaw - 1.16 * shifty
    : f.heading * 0.28 - 0.59 * shifty + 0.08 * shoulderLook(f)
  const lift = 0.075 * Math.sin(Math.PI * time) + 0.24 * grabAmount
  const noseReach =
    id === 'boardNoseGrab' ? grabAmount * (a.switch ? -1 : 1) : 0
  const boardDeck: RigidTransform = {
    origin: [
      0,
      0.031 +
        0.148 * Math.abs(Math.sin(roll)) +
        0.79 * Math.abs(Math.sin(0.32 * press)) +
        lift +
        0.045 * grabAmount,
      0,
    ],
    pitch: 0.32 * press + 0.59 * noseReach,
    yaw: -1.04 * shifty,
    roll:
      -roll +
      (grip?.target === 'heel edge'
        ? -0.18
        : grip?.target === 'toe edge'
          ? 0.18
          : 0) *
        grabAmount,
  }
  const base: Point3 = [
    lateral - (board ? 0.2 * grabAmount : 0),
    0.935 -
      flex * 0.235 -
      Math.abs(lateral) * 0.18 +
      ripple -
      (board ? 0 : 0.065) * grabAmount,
    0.039 + flex * 0.11 - f.tuck * 0.07 + 0.18 * press - 0.18 * noseReach,
  ]
  if (fall) {
    const down: Point3 = board ? [-0.5, 0.19, 0.1] : [-0.49, 0.19, 0.14]
    for (let i = 0; i < 3; i++) base[i] += (down[i] - base[i]) * fall
  }
  const torso: RigidTransform = {
    origin: base,
    yaw,
    pitch:
      -0.16 -
      f.tuck * 0.45 -
      (board ? 0.2 : 0.15) * flex -
      (board ? 0.45 * grabAmount : 0),
    roll:
      -lean * 0.36 -
      (board && grip
        ? grip.hand * (id === 'boardNoseGrab' ? 0.55 : 0.3) * grabAmount
        : 0),
  }
  if (fall) {
    torso.pitch += ((board ? 0.84 : -0.15) - torso.pitch) * fall
    torso.roll += ((board ? 0.25 : 1.06) - torso.roll) * fall
  }
  torso.yaw += uphillLook(f) * (board ? (f.boardYaw > 0 ? 0.12 : 0.88) : 0.7)
  const forward: Point3 = [-Math.sin(hipYaw), 0, -Math.cos(hipYaw)]
  const legs = ([-1, 1] as const).map((side) => {
    const half = board ? 0.148 : 0.064,
      baseX = board ? 0 : side * (0.196 + (wedgeStop ? 0.14 : 0.065) * f.brake)
    const z = board ? side * 0.28 : side * Math.sin(lean) * 0.14
    const stagger =
      board || flying ? 0 : (side * 0.12 * f.lookSide * (1 - facing)) / 2
    const skiPitch = press * 0.31,
      twist = -1.04 * shifty
    const origin: Point3 = [
      baseX * Math.cos(twist),
      0.031 +
        half * Math.abs(Math.sin(wedgeStop ? 0.24 * f.brake : roll)) +
        0.85 * Math.abs(Math.sin(skiPitch)) +
        lift +
        (side > 0 ? 0.18 : 0.018) * grabAmount +
        (side > 0 ? 0.07 : 0) * crossed,
      z - baseX * Math.sin(twist) + stagger,
    ]
    const deck: RigidTransform = board
      ? boardDeck
      : {
          origin,
          pitch: skiPitch,
          yaw: wedgeStop
            ? side * wedgeYaw(f.brake)
            : twist +
              side *
                (((id === 'wedge' ? 0.18 : 0.008) + f.brake * 0.33) * facing +
                  0.53 * crossed),
          roll: wedgeStop ? side * 0.24 * f.brake : -roll,
        }
    const ankle = deckPoint(deck, [0, 0.148, board ? z : 0])
    const contact: Point3 = [
      baseX +
        (wedgeStop ? -side : Math.sign(roll)) *
          half *
          Math.cos(wedgeStop ? 0.24 * f.brake : roll),
      0.022 + lift,
      board
        ? z * (1 - 0.8 * Math.abs(press)) + 0.65 * press
        : z + stagger + 0.83 * press,
    ]
    const hip: Point3 = add3(base, [
      Math.cos(hipYaw) * side * 0.135,
      side * 0.038 * Math.sin(lean),
      -Math.sin(hipYaw) * side * 0.135,
    ])
    const knee = bendJoint(
      hip,
      ankle,
      add3(forward, [0.23 * Math.sin(f.edge * radians), 0, 0]),
      0.452,
      0.425,
      0.17,
    )
    const thigh = unit(add3(hip, scale3(knee, -1))),
      shin = unit(add3(knee, scale3(ankle, -1)))
    const angle = Math.acos(clamp(dot(thigh, shin), -1, 1)) / radians
    return { side, hip, ankle, contact, deck, knee, angle }
  })
  const outside = board ? (a.switch ? 1 : 0) : roll >= 0 ? 0 : 1
  const com: Point3 = add3(base, [
    lateral * 0.12,
    0.136,
    -0.034 - 0.135 * f.tuck,
  ])
  let grab = null
  if (grip && grabAmount > 0) {
    const lead = a.switch ? 1 : -1
    let point: Point3
    switch (grip.target) {
      case 'toe edge':
        point = deckPoint(boardDeck, [0.116, 0.009, -lead * 0.155])
        break
      case 'heel edge':
        point = deckPoint(boardDeck, [-0.116, 0.009, lead * 0.155])
        break
      case 'nose':
        point = deckPoint(boardDeck, [0, 0.078, -0.819])
        break
      case 'leading tail':
        point = deckPoint(boardDeck, [0, 0.052, 0.754])
        break
      default:
        point = deckPoint(legs[1].deck, [0.059, 0.014, -0.235])
    }
    const shoulder = transformPoint(torso, [grip.hand * 0.218, 0.423, -0.03])
    const outward = add3(
      transformPoint(torso, [grip.hand * 0.78, -0.22, 0.48]),
      scale3(base, -1),
    )
    const elbow = bendJoint(shoulder, point, outward, 0.35, 0.35, 0.04)
    grab = {
      ...grip,
      weight: grabAmount,
      engaged: grabAmount >= 0.99,
      point,
      shoulder,
      elbow,
    }
  }
  const arms = ([-1, 1] as const).map((side) => {
    const plant =
      board || f.safety || a.phase !== 'ready' || side !== f.lastSide
        ? 0
        : clamp(1 - (f.t - f.lastTurnTime) / 1.15, 0, 1)
    const liftArm = 0.14 * (pushProgress(f) || (flying ? 1 - time : 0))
    const swing =
      0.038 * Math.sin(f.t * 2.05 + side * 1.6) * Math.min(1, f.speed / 6)
    const counter = grip && grip.hand !== side ? grabAmount : 0
    const shoulder = transformPoint(torso, [side * 0.218, 0.423, -0.03])
    let elbow: Point3 = [
      side * ((board ? 0.37 : 0.343) + 0.06 * counter) - lean * 0.047,
      0.218 + 0.036 * f.tuck + 0.55 * liftArm + 0.09 * counter,
      -0.048 + 0.055 * side * lean,
    ]
    let hand: Point3 = [
      side * ((board ? 0.55 : 0.399) - 0.11 * f.tuck + 0.07 * counter) -
        lean * 0.043 +
        shifty * 0.11,
      0.112 +
        0.13 * f.tuck +
        side * lean * 0.084 -
        0.043 * plant +
        liftArm +
        0.17 * counter,
      (board ? -0.126 : -0.258 - 0.135 * plant) +
        swing +
        side * shifty * 0.16 -
        liftArm,
    ]
    hand = transformPoint(torso, mixPoint(hand, guardHand(side), guard))
    elbow = transformPoint(torso, mixPoint(elbow, guardElbow(side), guard))
    if (grab?.hand === side) {
      hand = mixPoint(hand, grab.point, grab.weight)
      elbow = mixPoint(elbow, grab.elbow, grab.weight)
    }
    const poleTip: Point3 = guard
      ? [hand[0] + side * 0.32, Math.max(0.12, hand[1] - 0.18), hand[2] + 0.92]
      : flying
        ? [hand[0] + side * 0.135, hand[1] - 0.44, hand[2] + 0.78]
        : [
            hand[0] + side * (0.135 + 0.075 * plant),
            0.055 + 0.09 * (1 - plant) + 0.028 * Math.sin(f.t * 2.05 + side),
            hand[2] + 0.57 - 0.72 * plant,
          ]
    return { side, shoulder, elbow, hand, poleTip }
  })
  // Vertical clearance over the local snow plane. Joint positions are in the slope-aligned rider frame.
  const comHeight =
    a.height +
    com[1] / (Math.cos(f.pitch * radians) * Math.cos(f.bank * radians))
  return {
    base,
    torso,
    guard,
    scan: uphillLook(f),
    bodyContact: [base[0], 0.027, base[2]] as Point3,
    yaw,
    hipYaw,
    forward,
    flex,
    lean,
    legs,
    arms,
    outside,
    com,
    comHeight,
    grab,
    shifty,
    leadingEnd: deckPoint(legs[board ? 0 : 1].deck, [
      0,
      0.068,
      board ? (a.switch ? 0.754 : -0.819) : a.switch ? 0.82 : -0.91,
    ]),
  }
}
export function analyse(f: Frame, setup: Setup) {
  const board = equipmentFor(setup.technique) === 'snowboard',
    pitch = f.pitch * radians,
    h = f.forceHeading
  const { normal, forward, side } = slopeAxes(pitch, f.bank * radians, h)
  const normalN = riderMass * f.normalAccel,
    frictionN = riderMass * f.frictionAccel
  const flying = f.air.phase === 'flight'
  const lateralN = flying ? 0 : riderMass * (f.lateralAccel + gravity * side[1])
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
      ? frontBindingShare(f, setup)
      : (f.edge * Math.cos(bodyHeading(f)) >= 0 ? f.load : 100 - f.load) / 100
  const contactFraction = flying
    ? 0
    : 1 - 0.75 * Math.abs(foreAftPress(f, setup.technique))
  const bodyShare = contactOnBody(f.safety),
    equipmentN = normalN * (1 - bodyShare)
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
    bodyShare,
    bodySupportN: normalN * bodyShare,
    contacts: [equipmentN * firstShare, equipmentN * (1 - firstShare)],
    firstShare,
    pressureKpa: area ? equipmentN / (area * 1000) : 0,
    area,
    contactFraction,
    edgeName:
      setup.technique === 'skiStop' && f.brake > 0.08
        ? 'Inside edges'
        : flying
          ? 'Airborne'
          : board
            ? Math.abs(f.edge) < 3
              ? 'Flat base'
              : f.edge * Math.cos(bodyHeading(f)) > 0
                ? 'Toe edge'
                : 'Heel edge'
            : Math.abs(f.edge) < 3
              ? 'Flat bases'
              : f.edge * Math.cos(bodyHeading(f)) > 0
                ? 'Left ski'
                : 'Right ski',
    phase: f.safety
      ? safetyPhases[f.safety.phase]
      : isTrick(setup.technique)
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
export function studyPoint(f: Frame, setup: Setup, p: RiderPose) {
  if (!f.safety) return p.grab?.point ?? p.leadingEnd
  if (isFall(setup.technique))
    return contactOnBody(f.safety) > 0.2
      ? p.bodyContact
      : p.legs[p.outside].knee
  return p.legs[1].contact
}

// A constrained ideal-edge study. The selected angle and speed describe the peak of a linked turn.
export function idealTurn(
  setup: Setup,
  peak: number,
  kmh: number,
  phase = 0,
  switched = startsSwitch(setup),
): Frame {
  const f = emptyFrame(setup),
    speed = kmh / 3.6,
    transfer = Math.cos(phase)
  f.d = 15
  f.air.switch = f.air.startSwitch = switched
  f.t = phase / 1.2
  f.speed = speed
  f.edge = peak * transfer
  f.lookSide = -Math.tanh(f.edge / 9)
  f.edgeRate = -1.2 * peak * Math.sin(phase)
  f.pitch = pitchAt(courses[setup.course], f.d) / radians
  f.bank = bankAt(courses[setup.course], f.d, 0, f.pitch * radians) / radians
  const sidecutRadius =
    techniques[setup.technique].sidecut * Math.cos(f.edge * radians)
  f.radius =
    Math.abs(f.edge) > 1e-6 ? sidecutRadius / Math.abs(transfer) : Infinity
  f.lateralAccel = (Math.sign(f.edge) * speed ** 2) / f.radius
  f.normalAccel =
    gravity * Math.cos(f.pitch * radians) * Math.cos(f.bank * radians)
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
  if (isSafety(setup.technique)) return techniques[setup.technique].cue
  if (f.pivot)
    return 'Keep the base flat while the equipment pivots across the direction of travel.'
  if (isTrick(setup.technique)) {
    const a = f.air,
      id = setup.technique
    if (a.phase === 'load') {
      if (a.pushElapsed >= 0)
        return 'Extend through the hips and knees as the feet press against the snow.'
      if (!isSpin(id)) return 'Release the pop to take off.'
      const turn = requiredSpin(id, a.switch)
      const direction =
        turn < 0 ? 'left' : turn > 0 ? 'right' : 'a steering direction'
      return (
        'Hold ' + direction + ' and release the pop when the meter is full.'
      )
    }
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
            ? board
              ? 'Ride out with your right foot leading and look past the tail binding.'
              : 'Ride out tails first and look over the outside shoulder.'
            : board
              ? 'Ride out balanced between both bindings.'
              : 'Ride out centered over both skis.'
        case 'Late release':
          return board
            ? 'Release the pose earlier and level the deck before contact.'
            : 'Release the pose earlier so the skis reopen before contact.'
        case 'Pose missed':
          return 'Hold the pose through the middle of the jump.'
        case 'Under-rotated':
          return 'Fill the pop meter and hold a direction as you take off.'
        case 'Over-rotated':
          return 'Try a shorter pop here. This landing gives the spin more airtime.'
        case 'Opposite spin':
          return (
            'Set the spin ' +
            (requiredSpin(id, a.startSwitch) < 0 ? 'left' : 'right') +
            ' from that starting stance.'
          )
        case 'Short pop':
          return 'Hold the pop longer before releasing.'
      }
    }
    return tricks[id].cue
  }
  if (f.air.switch)
    return board
      ? Math.abs(f.edge) < 5
        ? 'Right foot leads. Roll through a flat base to change edges.'
        : analyse(f, setup).edgeName +
          ' engaged. Look along the board past the leading binding.'
      : Math.abs(f.edge) < 5
        ? 'Change the stagger and look into the next switch turn.'
        : 'Guide the tails and look over the outside shoulder.'
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
