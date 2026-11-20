import type { Setup, SurfaceId } from './course.ts'
import type { Frame, Input } from './physics.ts'
import { clamp, radians } from './slope.ts'

export const responsibilityCode =
  'https://skisafety.us/your-responsibility-code'
export const safetyLessons = {
  skiStop: {
    name: 'Wedge stop',
    category: 'Speed control',
    objective:
      'Bring both skis to rest in a clear stopping area on a gentle slope.',
    phases: [
      [
        'Choose the spot',
        'Pick open, gentle terrain with a clear runout. Choose a spot that people above can see.',
      ],
      [
        'Shape the wedge',
        'Keep the tips apart and closer together than the tails. Turn both legs inward gently and stay centered over your feet.',
      ],
      [
        'Build pressure',
        'Widen the wedge progressively and brush the snow with both inside edges. Keep the knees soft and the poles clear.',
      ],
      [
        'At rest',
        'Hold the wedge until the skis stop. Look uphill and yield before you set off again.',
      ],
    ],
    drill:
      'In the marked practice lane, hold Brake to open the wedge. Come to rest before the striped line, then check uphill.',
    cue: 'Spread both tails progressively and keep the tips clear of each other.',
    watch:
      'Compare the speed at brake onset with the distance the skis travel before coming to rest.',
    source: 'https://thesnowpros.org/learn-to-ski-or-snowboard/',
    publisher: 'PSIA-AASI beginner’s guide',
    edge: [8, 24],
    sidecut: 19,
    response: 1,
  },
  boardStop: {
    name: 'Snowboard edge stop',
    category: 'Speed control',
    objective:
      'Bring a controlled sideslip to a stop using the uphill edge of the board.',
    phases: [
      [
        'Set up across the hill',
        'Choose a clear, gentle slope. Begin with the board across the fall line, knees soft and pressure between both bindings.',
      ],
      [
        'Find the uphill edge',
        'Facing downhill, lift the toes slightly to engage the heel edge. Facing uphill, bring the shins toward the boot tongues to engage the toe edge.',
      ],
      [
        'Slow the sideslip',
        'Gradually increase the uphill edge angle with both feet. Keep the downhill edge clear as the slide slows.',
      ],
      [
        'At rest',
        'Hold the engaged edge until stationary. Look uphill and check the blind side before starting again.',
      ],
    ],
    drill:
      'Choose the heel or toe edge. Hold Brake to increase its angle, stop before the striped line, then check uphill.',
    cue: 'Keep the board across the slope and tilt onto its uphill edge.',
    watch:
      'Switch edges in the study and watch which side of the deck meets the snow.',
    source: 'https://snowprofessor.com/step-6-get-up-start-stop',
    publisher: 'SnowProfessor',
    edge: [10, 32],
    sidecut: 8.8,
    response: 1,
  },
  skiFall: {
    name: 'Falling on skis',
    category: 'Fall response',
    objective:
      'Rehearse a low-speed loss of balance with flexed knees and the arms forward.',
    phases: [
      [
        'As balance goes',
        'The simulation introduces a sideways loss of balance. Soften the knees and let the body lower.',
      ],
      [
        'Keep the arms forward',
        'Keep your hands up and forward and your elbows soft. Reaching behind or planting an uphill hand can load the arm and knee.',
      ],
      [
        'During the slide',
        'Let the legs stay flexed and wait for the slide to finish. Trying to stand while the skis are moving can twist a loaded knee.',
      ],
      [
        'Once stationary',
        'Pause and check for injury. If hurt or unsure, signal for ski patrol. If unhurt, check uphill before getting up and moving clear.',
      ],
    ],
    drill:
      'Hold Flex as balance goes and through the slide. The uphill check becomes available once the rider is still.',
    cue: 'Soften the knees, bring the hands forward and stay low through the slide.',
    watch:
      'Orbit to the side to see the pelvis lower and support move from the skis onto the snow.',
    source: 'https://vermontskisafety.com/research/tips/',
    publisher: 'Vermont Ski Safety',
    edge: [10, 28],
    sidecut: 19,
    response: 1,
  },
  boardFall: {
    name: 'Falling on a snowboard',
    category: 'Fall response',
    objective:
      'Rehearse a low-speed heelside fall with bent knees and the hands clear of the snow.',
    phases: [
      [
        'Lower your center',
        'As balance goes toward the heels, bend the knees to shorten the distance to the snow.',
      ],
      [
        'Protect the head and wrists',
        'Bring the chin gently in and the arms in front with soft elbows. Reaching back with a straight arm puts the wrist under load.',
      ],
      [
        'Spread contact',
        'Let the side of the hip and the broad part of the back take contact progressively. Keep the head clear and stay down while the board is sliding.',
      ],
      [
        'Once stationary',
        'Check how you feel before trying to move. Signal for patrol if hurt or unsure. If unhurt, look uphill and check your blind side before rejoining.',
      ],
    ],
    drill:
      'Hold Flex as the rider loses balance. Follow the hip toward the snow and wait for a complete stop before checking uphill.',
    cue: 'Soften the knees and keep the hands in front as the hips lower.',
    watch:
      'The boots stay attached to the deck while the upper body settles onto the snow.',
    source: 'https://kidshealth.org/en/teens/safety-snowboarding.html',
    publisher: 'Nemours KidsHealth',
    edge: [10, 28],
    sidecut: 8.8,
    response: 1,
  },
} as const
export type SafetyId = keyof typeof safetyLessons
export const isSafety = (id: string): id is SafetyId =>
  Object.hasOwn(safetyLessons, id)
export const isFall = (id: string) => id === 'skiFall' || id === 'boardFall'
export const laneLength = 18
export const safetyPhases = {
  glide: 'Approach',
  brake: 'Braking',
  losing: 'Balance goes',
  slide: 'Sliding',
  rest: 'At rest',
  checked: 'Uphill checked',
  missed: 'Past the line',
} as const
export type SafetyState = {
  phase: keyof typeof safetyPhases
  fall: number
  guard: number
  guarded: boolean
  actionAt: number
  actionDistance: number
  entrySpeed: number
  checkHeld: boolean
  checkedAt: number
  restAt: number
}
export const initialSafety = (): SafetyState => ({
  phase: 'glide',
  fall: 0,
  guard: 0,
  guarded: false,
  actionAt: -1,
  actionDistance: 0,
  entrySpeed: 0,
  checkHeld: false,
  checkedAt: -1,
  restAt: -1,
})
export const safetyStartSpeed = (id: string) => (isFall(id) ? 1.7 : 3)
export const edgeSide = (setup: Setup) => (setup.stopEdge === 'toe' ? 1 : -1)
export function uphillLook(f: Frame) {
  const s = f.safety
  if (!s || s.checkedAt < 0) return 0
  const t = clamp((f.t - s.checkedAt) / 0.7, 0, 1)
  return t * t * (3 - 2 * t)
}
export const wedgeYaw = (brake: number) => 0.012 + 0.26 * brake
export const contactOnBody = (s: SafetyState | null) =>
  s ? 0.86 * clamp((s.fall - 0.62) / 0.38, 0, 1) : 0
export const bodyGuard = (s: SafetyState | null) =>
  s ? Math.max(s.guard, s.fall * 0.68) : 0
const resistanceBySnow: Record<SurfaceId, number> = {
  groomed: 0.86,
  powder: 1,
  ice: 0.66,
}
export function safetyReferenceInput(f: Frame, id: SafetyId): Input {
  return {
    steer: 0,
    tuck: false,
    flex: isFall(id) && f.t >= 0.48,
    brake: !isFall(id) && f.t >= 0.85,
    check:
      !!f.safety && f.safety.phase === 'rest' && f.t - f.safety.restAt > 1.1,
  }
}
// A short, straight training lane uses the local terrain pitch and snow. No impact injury model is inferred.
export function stepSafety(
  f: Frame,
  input: Input,
  setup: Setup,
  friction: number,
  dt: number,
) {
  const s = (f.safety = { ...(f.safety ?? initialSafety()) })
  const fall = isFall(setup.technique),
    board = setup.technique === 'boardStop' || setup.technique === 'boardFall'
  const ease = 1 - Math.exp(-6 * dt),
    normal = 9.81 * Math.cos(f.pitch * radians),
    gravity = 9.81 * Math.sin(f.pitch * radians)
  const checkPressed = !!input.check && !s.checkHeld
  s.checkHeld = !!input.check
  f.normalAccel = normal
  if (s.phase === 'rest' || s.phase === 'checked') {
    if (s.phase === 'rest' && checkPressed) {
      s.phase = 'checked'
      s.checkedAt = f.t
    }
    if (s.phase === 'checked' && f.t - s.checkedAt >= 0.85) f.done = true
    return
  }
  const action = !fall && input.brake
  if (fall) {
    const u = clamp((f.t - 0.8) / 0.78, 0, 1)
    if (s.actionAt < 0) s.guard += (Number(input.flex) - s.guard) * ease
    s.fall = u * u * (3 - 2 * u)
    s.phase = u === 0 ? 'glide' : u < 1 ? 'losing' : 'slide'
  } else s.phase = action || f.brake > 0.06 ? 'brake' : 'glide'
  if (s.actionAt < 0 && (fall ? contactOnBody(s) > 0 : action)) {
    s.actionAt = f.t
    s.actionDistance = f.d
    s.entrySpeed = f.speed
    s.guarded = fall && s.guard >= 0.55
  }
  f.flex +=
    ((fall
      ? 0.22 + 0.49 * Math.max(s.guard, s.fall)
      : 0.28 + 0.28 * Number(action)) -
      f.flex) *
    ease
  f.brake += ((fall ? 0 : Number(action)) - f.brake) * ease
  const previousEdge = f.edge
  f.edge = board
    ? setup.technique === 'boardStop'
      ? edgeSide(setup) * (3 + 30 * f.brake)
      : -8 * (1 - s.fall)
    : setup.technique === 'skiStop'
      ? (0.24 * f.brake) / radians
      : 0
  f.edgeRate = (f.edge - previousEdge) / dt
  f.boardYaw = board
    ? ((setup.technique === 'boardStop' ? edgeSide(setup) : -1) * Math.PI) / 2
    : 0
  f.lean = setup.technique === 'boardStop' ? f.edge * radians * 0.33 : 0
  f.slip = board ? 0.7 : Math.max(f.brake, s.fall)
  const coefficient =
    friction +
    resistanceBySnow[setup.surface] *
      (fall
        ? 0.055 + 1.1 * contactOnBody(s)
        : 0.055 + (board ? 0.91 : 0.82) * f.brake)
  f.dragAccel = 0.0093 * f.speed * f.speed
  const oldSpeed = f.speed
  f.speed = Math.max(
    0,
    oldSpeed + (gravity - normal * coefficient - f.dragAccel) * dt,
  )
  f.frictionAccel = Math.max(
    0,
    gravity - f.dragAccel - (f.speed - oldSpeed) / dt,
  )
  f.d += ((oldSpeed + f.speed) * dt) / 2
  f.maxSpeed = Math.max(f.maxSpeed, f.speed)
  if (f.speed === 0 && s.actionAt >= 0 && (!fall || s.fall === 1)) {
    s.phase = 'rest'
    s.restAt = f.t
    f.dragAccel = 0
    f.frictionAccel = gravity
  } else if (f.d >= laneLength) {
    s.phase = 'missed'
    f.done = true
  }
}
