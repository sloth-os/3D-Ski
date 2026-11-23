import {
  add3,
  cross,
  deckPoint,
  diff,
  dot,
  gravity,
  magnitude,
  mixPoint,
  riderMass,
  riderVector,
  scale3,
  transformPoint,
  unit,
  type ForceState,
  type Point3,
  type RiderPose,
} from './analysis.ts'
import { equipmentFor, surfaces, type Setup } from './course.ts'
import { radians, type Frame } from './physics.ts'

export const loadParts = [
  'snow',
  'equipment',
  'boot',
  'knee',
  'hip',
  'waist',
  'upper',
] as const
export type LoadPart = (typeof loadParts)[number]
export type LoadSelection = {
  part: LoadPart
  side: 'auto' | 'left' | 'right'
  components?: boolean
}
export const defaultLoad: LoadSelection = { part: 'knee', side: 'auto' }
export const isFootPart = (part: LoadPart) =>
  ['equipment', 'boot', 'knee', 'hip'].includes(part)
export function partName(part: LoadPart, board: boolean) {
  return {
    snow: 'Snow surface',
    equipment: board ? 'Snowboard & bindings' : 'Skis & bindings',
    boot: board ? 'Snowboard boot & ankle' : 'Ski boot & ankle',
    knee: 'Leg & knee',
    hip: 'Hip & pelvis',
    waist: 'Waist & trunk',
    upper: 'Upper body',
  }[part]
}
export const loadColors = {
  along: '#5ae4ce',
  across: '#ffbb73',
  left: '#b9ec85',
  right: '#67d5ff',
  body: '#ffa66e',
  moment: '#d3a5ff',
  arm: '#f1f5db',
  idle: '#819198',
} as const

export function resolveAlong(force: Point3, axis: Point3) {
  const signed = dot(force, axis),
    along = scale3(axis, signed),
    across = diff(force, along)
  return { signed, along, across, transverse: magnitude(across) }
}
// The perpendicular from the joint to the force's line of action. All vectors share the rider's coordinate system.
export function aboutJoint(joint: Point3, origin: Point3, force: Point3) {
  const offset = diff(origin, joint),
    axis = unit(force),
    torque = cross(offset, force)
  const arm =
    magnitude(force) > 0
      ? diff(offset, scale3(axis, dot(offset, axis)))
      : scale3(offset, 0)
  return {
    joint,
    origin,
    force,
    arm,
    foot: add3(joint, arm),
    torque,
    nm: magnitude(torque),
    metres: magnitude(arm),
  }
}
// Approximate upper-body centre of mass. Segment mass fractions use de Leva's male reference set.
function upperBody(p: RiderPose) {
  let weighted = add3(
    scale3(transformPoint(p.torso, [0, 0.24, -0.025]), 0.4346),
    scale3(transformPoint(p.torso, [0, 0.642, -0.082]), 0.0694),
  )
  for (const arm of p.arms) {
    weighted = add3(
      weighted,
      scale3(mixPoint(arm.shoulder, arm.elbow, 0.58), 0.0271),
    )
    weighted = add3(
      weighted,
      scale3(mixPoint(arm.elbow, arm.hand, 0.46), 0.0162),
    )
    weighted = add3(weighted, scale3(arm.hand, 0.0061))
  }
  const fraction = 0.4346 + 0.0694 + 2 * (0.0271 + 0.0162 + 0.0061)
  return { point: scale3(weighted, 1 / fraction), mass: riderMass * fraction }
}
export function loadPath(f: Frame, setup: Setup, p: RiderPose, a: ForceState) {
  const board = equipmentFor(setup.technique) === 'snowboard',
    airborne = f.air.phase === 'flight'
  const reaction = riderVector(f, a.reaction),
    torso = upperBody(p)
  const waist = transformPoint(p.torso, [0, 0.105, 0]),
    chest = transformPoint(p.torso, [0, 0.39, -0.025])
  const feet = p.legs.map((leg, i) => {
    const share = a.normalN > 0 ? a.contacts[i] / a.normalN : 0,
      force = scale3(reaction, share)
    const binding = deckPoint(leg.deck, [
        0,
        0.054,
        board ? leg.side * 0.28 : 0,
      ]),
      name = i === 0 ? 'Left' : 'Right'
    const role = board
      ? (i === 0) !== f.air.switch
        ? 'leading'
        : 'trailing'
      : Math.abs(f.edge) < 3 || setup.technique === 'skiStop'
        ? ''
        : i === p.outside
          ? 'outside'
          : 'inside'
    const soleUp = unit(diff(deckPoint(leg.deck, [0, 1, 0]), leg.deck.origin)),
      shin = unit(diff(leg.knee, leg.ankle))
    const soleForce = resolveAlong(force, soleUp),
      shinForce = resolveAlong(force, shin)
    const shinTilt =
      Math.acos(Math.max(-1, Math.min(1, dot(soleUp, shin)))) / radians
    return {
      soleUp,
      shin,
      soleNormal: soleForce.signed,
      soleShear: soleForce.transverse,
      shinAxial: shinForce.signed,
      shinShear: shinForce.transverse,
      shinTilt,
      label: name + (role ? ' · ' + role : ''),
      share,
      force,
      binding,
      leg,
      normalN: a.contacts[i],
      loadN: magnitude(force),
      equipment: aboutJoint(binding, leg.contact, force),
      boot: aboutJoint(leg.ankle, leg.contact, force),
      knee: aboutJoint(leg.knee, leg.contact, force),
      hip: aboutJoint(leg.hip, leg.contact, force),
    }
  })
  const equipmentPoint = mixPoint(
    feet[1].leg.contact,
    feet[0].leg.contact,
    a.firstShare,
  )
  const supportPoint = mixPoint(equipmentPoint, p.bodyContact, a.bodyShare)
  const surfacePoint = airborne
    ? ([
        supportPoint[0],
        -f.air.height *
          Math.cos(f.pitch * radians) *
          Math.cos(f.bank * radians),
        supportPoint[2],
      ] as Point3)
    : supportPoint
  const bodyForce = scale3(reaction, a.bodyShare),
    upperWeight = riderVector(f, [0, -gravity * torso.mass, 0])
  return {
    p,
    a,
    board,
    airborne,
    feet,
    waist,
    chest,
    torso,
    surfacePoint,
    normal: riderVector(f, a.normal),
    reaction,
    opposing: scale3(reaction, -1),
    bodyForce,
    waistMoment: aboutJoint(waist, supportPoint, reaction),
    weightMoment: aboutJoint(waist, torso.point, upperWeight),
    twist: (p.torso.yaw - p.hipYaw) / radians,
    edge: Math.abs(f.edge),
    snow: surfaces[setup.surface].name,
    phase: airborne ? 'Airborne' : a.bodyShare > 0 ? 'Body contact' : a.phase,
  }
}
export type LoadPath = ReturnType<typeof loadPath>
export function loadFocus(m: LoadPath, s: LoadSelection) {
  const i =
    s.side === 'left'
      ? 0
      : s.side === 'right'
        ? 1
        : m.feet[1].loadN > m.feet[0].loadN
          ? 1
          : 0
  const foot = m.feet[i],
    moment =
      s.part === 'upper'
        ? m.weightMoment
        : s.part === 'waist'
          ? m.waistMoment
          : s.part === 'snow'
            ? null
            : foot[s.part]
  const at =
    s.part === 'upper' ? m.torso.point : (moment?.joint ?? m.surfacePoint)
  return {
    i,
    foot,
    moment,
    at,
    title: partName(s.part, m.board),
    source: moment?.origin ?? m.surfacePoint,
  }
}
export function loadComponents(m: LoadPath, s: LoadSelection) {
  const { foot, moment, source } = loadFocus(m, s),
    force = moment?.force ?? m.reaction
  let axis: Point3, labels: [string, string]
  switch (s.part) {
    case 'snow':
      axis = m.normal
      labels = ['Snow normal', 'Snow shear']
      break
    case 'equipment':
    case 'boot':
      axis = foot.soleUp
      labels = ['Sole normal', 'Along sole']
      break
    case 'knee':
      axis = foot.shin
      labels = ['Along shin', 'Across shin']
      break
    case 'hip':
      axis = unit(diff(foot.leg.hip, foot.leg.knee))
      labels = ['Along thigh', 'Across thigh']
      break
    default:
      axis = unit(diff(m.chest, m.waist))
      labels = ['Along trunk', 'Across trunk']
      break
  }
  return {
    ...resolveAlong(force, axis),
    labels,
    origin: source,
  }
}
export function loadReading(m: LoadPath, s: LoadSelection) {
  const selected = loadFocus(m, s),
    { foot, moment } = selected,
    part = s.part
  const n = (v: number) => Math.round(v) + ' N',
    nm = (v: number) => Math.round(v) + ' N·m',
    cm = (v: number) => (100 * v).toFixed(1) + ' cm',
    deg = (v: number) => Math.round(v) + '°'
  const snowShear = Math.hypot(m.a.frictionN, m.a.lateralN)
  const gear = m.board ? 'board' : 'skis'
  let metrics: [string, string][], cue: string
  switch (part) {
    case 'snow':
      metrics = [
        ['Normal support', n(m.a.normalN)],
        ['Surface shear', n(snowShear)],
        ['Mean gear pressure', m.a.pressureKpa.toFixed(1) + ' kPa'],
      ]
      cue = m.airborne
        ? 'Contact pressure and both snow-force arrows drop to zero in flight.'
        : m.a.bodyShare > 0
          ? 'The body and equipment now share the snow reaction. The opposed arrows show the total contact pair.'
          : `${m.snow} snow pushes on the ${gear}. The ${gear} push back with the same force in the opposite direction.`
      break
    case 'equipment':
      metrics = [
        ['Branch force', n(foot.loadN)],
        ['Normal support', n(foot.normalN)],
        ['Moment at binding', nm(foot.equipment.nm)],
      ]
      cue = m.board
        ? 'Both bindings act on one deck. Compare the leading and trailing foot as the contact shifts along the engaged edge.'
        : 'Each ski has its own edge contact. Loading one ski shifts the combined snow reaction toward that foot.'
      break
    case 'boot':
      metrics = [
        ['Branch force', n(foot.loadN)],
        ['Ankle moment', nm(foot.boot.nm)],
        ['Moment arm', cm(foot.boot.metres)],
      ]
      cue = m.board
        ? 'The binding holds the boot to the deck. A shift from toe to heel edge changes where snow support passes the ankle.'
        : 'The binding holds the boot sole to the ski. Moving the edge contact away from the ankle gives the snow force a longer lever.'
      break
    case 'knee':
      metrics = [
        ['Branch force', n(foot.loadN)],
        ['Knee moment', nm(foot.knee.nm)],
        ['Knee flexion', deg(foot.leg.angle)],
      ]
      cue =
        'Follow the shin and thigh. Bending the knee moves it relative to the line of snow force and changes the turning effect about the joint.'
      break
    case 'hip':
      metrics = [
        ['Branch force', n(foot.loadN)],
        ['Hip moment', nm(foot.hip.nm)],
        ['Moment arm', cm(foot.hip.metres)],
      ]
      cue =
        'The thigh connects this boot to its side of the pelvis. Shifting the hips changes the distance from the hip to the line of force.'
      break
    case 'waist':
      metrics = [
        ['Snow moment', nm(m.waistMoment.nm)],
        ['Moment arm', cm(m.waistMoment.metres)],
        ['Torso–pelvis twist', deg(m.twist)],
      ]
      cue =
        m.a.bodyShare > 0
          ? 'Equipment and direct body contact both contribute to the snow moment about the waist.'
          : 'Both leg branches meet at the pelvis. Compare the lever of their combined force about the waist with the rotation between trunk and pelvis.'
      break
    case 'upper':
      metrics = [
        ['Upper-body weight', n(magnitude(m.weightMoment.force))],
        ['Weight moment at waist', nm(m.weightMoment.nm)],
        ['Weight arm', cm(m.weightMoment.metres)],
      ]
      cue = m.airborne
        ? 'Gravity still acts on the airborne head, trunk and arms. Their weight moment is measured about the moving waist.'
        : 'Leaning or reaching moves the upper-body mass relative to the waist. The orange weight arrow and its offset show how posture changes the moment.'
      break
  }
  if (m.airborne && part !== 'upper' && part !== 'snow')
    cue =
      'The rider has left the snow. The equipment and body keep moving together while the snow-force contribution is zero.'
  return {
    ...selected,
    metrics,
    cue,
    annotation:
      part === 'snow'
        ? n(m.a.reactionN)
        : part === 'upper'
          ? n(magnitude(m.weightMoment.force))
          : nm(moment!.nm),
    secondary:
      part === 'upper'
        ? 'Waist'
        : part === 'snow'
          ? 'Force on snow'
          : 'Moment arm',
    secondaryValue:
      part === 'upper'
        ? nm(m.weightMoment.nm)
        : part === 'snow'
          ? n(m.a.reactionN)
          : cm(moment!.metres),
  }
}
