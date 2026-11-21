import { bodyHeading, pushProgress } from './air.ts'
import {
  add3,
  gravity,
  magnitude,
  mixPoint,
  riderMass,
  scale3,
  transformPoint,
  type ForceState,
  type Point3,
  type RiderPose,
} from './analysis.ts'
import { equipmentFor, type Setup } from './course.ts'
import { clamp, radians, type Frame } from './physics.ts'
import { isFall } from './safety.ts'
import { popEnd } from './tricks.ts'

export const muscleGroups = {
  quads: [
    'Quadriceps',
    'The front thigh straightens the knee and controls its bend under load.',
  ],
  glutes: [
    'Gluteals',
    'The gluteals extend the hip and help steady the pelvis over the loaded leg.',
  ],
  hamstrings: [
    'Hamstrings',
    'The back thigh helps extend the hip, bend the knee, and steady a loaded leg.',
  ],
  adductors: [
    'Hip adductors',
    'The inner thigh draws the leg inward and steadies the distance between the legs as edging forces change.',
  ],
  back: [
    'Spinal extensors',
    'The muscles beside the spine support the forward-inclined trunk while the hips and knees move underneath.',
  ],
  calves: [
    'Calves',
    'The calf muscles press the forefoot and control forward movement of the shin.',
  ],
  shins: [
    'Tibialis anterior',
    'The muscle along the front of the shin lifts the forefoot toward the shin.',
  ],
  hipFlexors: [
    'Hip flexors',
    'The hip flexors draw the thigh toward the trunk as the rider brings the equipment up.',
  ],
  obliques: [
    'Obliques',
    'The obliques turn and brace the trunk as the shoulders and pelvis move relative to each other.',
  ],
  deltoids: [
    'Deltoids',
    'The shoulder muscles position the upper arm for balance and guide the reaching arm into a grab.',
  ],
} as const
export type Muscle = keyof typeof muscleGroups
export type MuscleFocus = Muscle | 'auto'
export const muscleIds = Object.keys(muscleGroups) as Muscle[]
export const effortNames = ['Light', 'Moderate', 'High'] as const
export const effortBand = (v: number) => (v < 0.34 ? 0 : v < 0.67 ? 1 : 2)
export const effortColors = ['#70bfc2', '#f0b95e', '#ff7651'] as const
export const muscleSources = [
  [
    'Knee extensor activity in alpine skiing',
    'https://pubmed.ncbi.nlm.nih.gov/10416571/',
  ],
  [
    'Joint loading in snowboard turns',
    'https://doi.org/10.1016/j.proeng.2012.04.129',
  ],
  ['Joint work during landing', 'https://pubmed.ncbi.nlm.nih.gov/1548984/'],
] as const

function movement(
  f: Frame,
  setup: Setup,
  a: ForceState,
): [string, Muscle, string] {
  const board = equipmentFor(setup.technique) === 'snowboard'
  if (isFall(setup.technique)) {
    if (f.safety?.phase === 'rest' || f.safety?.phase === 'checked')
      return [
        'Resting on snow',
        'obliques',
        'The hip is supported and the equipment has stopped. Check for injury before trying to move.',
      ]
    if (a.bodyShare > 0.3)
      return [
        'Supported slide',
        'obliques',
        'Contact shifts toward the hip as the slide ends. Keep the arms in front.',
      ]
    return [
      'Lowering the hips',
      'quads',
      'The knees and hips bend as the rider lowers into the fall.',
    ]
  }
  if (f.air.phase === 'load') {
    if (f.air.pushElapsed >= 0)
      return [
        'Push-off',
        'glutes',
        'The glutes and quadriceps shorten as the hips and knees extend against the snow. This is concentric action.',
      ]
    const end = popEnd(setup.technique)
    return [
      'Preload',
      'quads',
      end
        ? 'Bend the hips and knees. Pressure moves toward the ' +
          (end > 0 ? 'trailing' : 'leading') +
          ' end before extension.'
        : 'The hip and knee extensors control the descent into the crouch, then hold the loaded position.',
    ]
  }
  if (f.air.phase === 'landing')
    return [
      'Landing absorption',
      'quads',
      'The knees and hips bend while their extensors lengthen under tension. This eccentric action absorbs landing energy.',
    ]
  if (f.air.phase === 'flight') {
    if (f.air.elapsed > f.air.duration * 0.74)
      return [
        'Opening for landing',
        'hipFlexors',
        'Let the feet move away from the hips and bring the equipment into line for contact.',
      ]
    if (f.air.pose > 0.18) {
      if (setup.technique === 'shifty' || setup.technique === 'boardShifty')
        return [
          'Counter-rotation',
          'obliques',
          'The shoulders and pelvis turn in opposite directions. Unwind the separation before contact.',
        ]
      return [
        'Reaching for the grab',
        'deltoids',
        'Bring the equipment up with the hips and knees as one arm reaches and the other counterbalances.',
      ]
    }
    if (Math.abs(f.air.spinRate) > 0.1)
      return [
        'Airborne rotation',
        'obliques',
        'Rotation starts at takeoff. The trunk holds the shoulders and pelvis together through flight.',
      ]
    return [
      'Airborne tuck',
      'hipFlexors',
      'Draw the thighs toward the trunk to lift the equipment. The feet have left the snow.',
    ]
  }
  if (f.pivot)
    return [
      'Surface pivot',
      'obliques',
      'Steady the trunk while the legs guide the flat equipment through the pivot.',
    ]
  if (setup.technique === 'skiStop' || setup.technique === 'wedge')
    return [
      'Wedge support',
      'adductors',
      'The inner thighs steady the wedge while the legs turn the skis inward. The quadriceps support the bent knees.',
    ]
  if (board && (setup.technique === 'boardStop' || Math.abs(f.edge) > 4)) {
    const toe =
      a.edgeName === 'Toe edge' ||
      (setup.technique === 'boardStop' && setup.stopEdge === 'toe')
    return toe
      ? [
          'Toe-edge support',
          'calves',
          'Move the shins toward the boot tongues. The calves control ankle motion as pressure builds on the toe edge.',
        ]
      : [
          'Heel-edge support',
          'shins',
          'Draw the forefeet up as the highbacks support the calves. Keep the knees flexed over the heel edge.',
        ]
  }
  if (Math.abs(f.edge) < 6)
    return [
      'Edge transition',
      'glutes',
      'Release the old edge and move the pelvis over the feet as pressure transfers.',
    ]
  if (f.air.switch)
    return [
      'Switch turn',
      'obliques',
      'The trunk supports the over-shoulder look while the legs keep guiding the tails.',
    ]
  return [
    'Outside-leg support',
    'quads',
    'The outside leg carries more of the turn. Its quadriceps steady the knee and control its bend.',
  ]
}
const diff = (a: Point3, b: Point3) => add3(a, scale3(b, -1))
const dot = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const unit = (v: Point3) => scale3(v, 1 / (magnitude(v) || 1))
const cross = (a: Point3, b: Point3): Point3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
// Undo the rendered rider's world rotation before taking a moment about the knee.
function riderReaction(f: Frame, a: ForceState): Point3 {
  const [x, y, z] = a.reaction,
    pitch = f.pitch * radians,
    yaw = f.heading + f.boardYaw + bodyHeading(f)
  const levelZ = y * Math.sin(pitch) + z * Math.cos(pitch)
  return [
    x * Math.cos(yaw) + levelZ * Math.sin(yaw),
    y * Math.cos(pitch) - z * Math.sin(pitch),
    -x * Math.sin(yaw) + levelZ * Math.cos(yaw),
  ]
}
export function muscleWork(
  f: Frame,
  setup: Setup,
  p: RiderPose,
  a: ForceState,
) {
  const [phase, primary, cue] = movement(f, setup, a)
  const board = equipmentFor(setup.technique) === 'snowboard'
  const reaction = riderReaction(f, a),
    drive = Math.sin(Math.PI * pushProgress(f))
  const twist = clamp(
    Math.abs(p.torso.yaw - p.hipYaw) +
      (f.pivot ? 0.65 : 0) +
      (f.air.phase === 'flight' ? Math.abs(f.air.spinRate) * 0.085 : 0),
    0,
    1,
  )
  const tuck =
    f.air.phase === 'flight'
      ? clamp(
          Math.sin(Math.PI * clamp(f.air.elapsed / f.air.duration, 0, 1)) *
            0.6 +
            f.air.pose * 0.65,
          0,
          1,
        )
      : 0
  const limbs = p.legs.map((leg, i) => {
    const fraction = a.normalN > 0 ? a.contacts[i] / a.normalN : 0
    const support = (magnitude(reaction) * fraction) / (riderMass * gravity)
    const axis = unit(cross(diff(leg.knee, leg.ankle), diff(leg.hip, leg.knee)))
    const kneeMoment = Math.abs(
      dot(cross(diff(leg.contact, leg.knee), reaction), axis) * fraction,
    )
    const knee = Math.sin(Math.min(90, leg.angle) * radians)
    const edge = Math.min(1, Math.abs(f.edge) / 30) * Math.min(1, support * 1.7)
    const reach = p.grab?.hand === leg.side ? p.grab.weight : 0
    const levels: Record<Muscle, number> = {
      quads:
        0.08 + 0.44 * support * knee + (0.44 * kneeMoment) / 135 + 0.1 * tuck,
      glutes:
        0.09 +
        support * (0.25 + 0.36 * p.flex + 0.12 * Math.abs(p.lean)) +
        0.27 * drive,
      hamstrings: 0.08 + support * (0.18 + 0.2 * p.flex) + 0.37 * tuck,
      adductors:
        0.1 +
        support * (0.22 + 0.21 * Math.abs(p.lean)) +
        (setup.technique === 'skiStop' || setup.technique === 'wedge'
          ? 0.28 + 0.33 * f.brake
          : 0) +
        0.16 * Math.abs(p.shifty),
      back:
        0.12 +
        support * (0.17 + 0.45 * Math.min(1, Math.abs(p.torso.pitch))) +
        0.2 * tuck,
      calves:
        0.09 +
        0.27 * support +
        0.32 * drive +
        (board && a.edgeName === 'Toe edge' ? 0.54 : 0.08) * edge,
      shins:
        0.08 +
        0.12 * support +
        (board && a.edgeName === 'Heel edge' ? 0.67 : 0.12) * edge,
      hipFlexors: 0.07 + 0.8 * tuck + 0.15 * Math.max(0, p.flex - 0.3),
      obliques:
        0.12 +
        0.58 * twist +
        0.36 * Math.abs(p.lean) +
        0.18 * reach +
        0.21 * (f.safety?.guard ?? 0),
      deltoids:
        0.13 +
        0.66 * reach +
        0.2 * (p.grab?.weight ?? 0) +
        0.21 * Math.abs(p.shifty) +
        0.15 * drive +
        0.17 * (f.safety?.guard ?? 0),
    }
    for (const id of muscleIds) levels[id] = clamp(levels[id], 0, 1)
    return { levels, kneeMoment }
  })
  return { phase, primary, cue, limbs }
}
export type MuscleWork = ReturnType<typeof muscleWork>
export type MuscleBand = {
  id: Muscle
  limb: number
  from: Point3
  to: Point3
  radius: number
}
export const muscleCenter = (b: MuscleBand) => mixPoint(b.from, b.to, 0.5)
// Surface landmarks follow each limb's bend plane as it flexes, including when riding switch.
export function muscleBands(p: RiderPose): MuscleBand[] {
  const bands: MuscleBand[] = []
  const hipSide: Point3 = [Math.cos(p.hipYaw), 0, -Math.sin(p.hipYaw)]
  for (const [i, leg] of p.legs.entries()) {
    const side = leg.side
    const add = (id: Muscle, from: Point3, to: Point3, radius: number) =>
      bands.push({ id, limb: i, from, to, radius })
    const along = (top: Point3, bottom: Point3) => {
      const axis = unit(diff(bottom, top)),
        anterior = unit(diff(p.forward, scale3(axis, dot(p.forward, axis))))
      return (t: number, front: number, out: number) =>
        add3(
          mixPoint(top, bottom, t),
          add3(scale3(anterior, front), scale3(hipSide, out * side)),
        )
    }
    const thigh = along(leg.hip, leg.knee),
      shin = along(leg.knee, leg.ankle)
    const body = (x: number, y: number, z: number) =>
      transformPoint(p.torso, [side * x, y, z])
    add('quads', thigh(0.1, 0.071, 0.015), thigh(0.91, 0.058, 0.012), 0.074)
    add(
      'hamstrings',
      thigh(0.09, -0.068, 0.022),
      thigh(0.9, -0.047, 0.026),
      0.064,
    )
    add(
      'glutes',
      add3(leg.hip, add3(scale3(p.forward, -0.125), [0, 0.075, 0])),
      thigh(0.28, -0.081, 0.018),
      0.087,
    )
    add(
      'adductors',
      thigh(0.04, 0.012, -0.058),
      thigh(0.72, 0.025, -0.054),
      0.05,
    )
    add('back', body(0.063, 0.045, 0.103), body(0.089, 0.403, 0.129), 0.049)
    add('calves', shin(0.13, -0.061, 0.009), shin(0.82, -0.043, 0.008), 0.059)
    add('shins', shin(0.12, 0.052, 0.025), shin(0.78, 0.047, 0.018), 0.036)
    add(
      'hipFlexors',
      body(0.116, 0.19, -0.09),
      thigh(0.19, 0.074, -0.012),
      0.044,
    )
    add('obliques', body(0.122, 0.023, -0.094), body(0.182, 0.32, -0.04), 0.061)
    const arm = p.arms[i]
    add(
      'deltoids',
      body(0.202, 0.449, -0.03),
      mixPoint(arm.shoulder, arm.elbow, 0.6),
      0.079,
    )
  }
  return bands
}
