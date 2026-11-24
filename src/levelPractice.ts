import { requiredSpin } from './tricks.ts'
import { goals, type Station, type Task } from './levelTwo.ts'
import type { Frame, Input } from './physics.ts'
import { clamp, featureStart } from './slope.ts'

export type StationProgress = {
  value: number
  side: number
  since: number
  goodTime: number
  armed: boolean
}
export const freshProgress = (): StationProgress => ({
  value: 0,
  side: 0,
  since: 0,
  goodTime: 0,
  armed: false,
})
const resize = [1.2, 1.2, 2.5, 2.5, 1.2, 1.2]
const funnel = [2.8, 2.35, 1.9, 1.5, 1.12]
export const beatFor = (task: Task, n: number) =>
  task === 'resize'
    ? resize[n % resize.length]
    : task === 'funnel'
      ? funnel[n % funnel.length]
      : 1.18
export const isAirTask = (task: Task) =>
  task === 'spin' || task === 'grab' || task === 'shifty'
export const goalReached = (s: Station, progress?: StationProgress) =>
  (progress?.value ?? 0) >= goals[s.task][0]
export function progressText(s: Station, value: number) {
  const [target, label] = goals[s.task]
  const current =
    s.task === 'press'
      ? (Math.floor((value + 1e-8) * 10) / 10).toFixed(1)
      : Math.floor(value)
  return current + ' / ' + target + ' ' + label
}
// An illustrative difference in local edge tilt. Soft legs allow the leading end to change first.
export const footTwist = (f: Frame) =>
  clamp(f.edgeRate * 0.22, -14, 14) * clamp((f.flex - 0.23) / 0.62, 0, 1)
export const christieWedge = (f: Frame) =>
  0.19 *
  (1 -
    clamp((Math.abs(f.edge) - 3) / 20, 0, 1) *
      clamp((f.flex - 0.2) / 0.53, 0, 1))
function qualifying(s: Station, f: Frame) {
  const edge = Math.abs(f.edge)
  switch (s.task) {
    case 'wedge':
      return edge >= 9 && edge <= 23 && f.slip < 0.37
    case 'match':
      return edge > 16 && christieWedge(f) < 0.045
    case 'track':
      return edge > 22 && f.slip < 0.16
    case 'transfer':
      return f.load >= 68
    case 'brush':
      return f.slip >= 0.22 && f.flex > 0.58
    case 'twist':
      return Math.abs(footTwist(f)) > 4 && edge < 30
    case 'switch':
      return f.air.switch && edge > 18
    default:
      return edge >= 17
  }
}
export function advanceStation(s: Station, f: Frame, dt: number) {
  const p = f.stationProgress
  if (!p || goalReached(s, p)) return
  const state = (f.stationProgress = { ...p })
  const [goal] = goals[s.task]
  if (s.task === 'line') {
    if (f.lastGateTime === f.t && Math.abs(f.lastGateOffset ?? Infinity) <= 2.5)
      state.value++
    return
  }
  if (isAirTask(s.task)) {
    if (
      f.air.landedAt === f.t &&
      f.air.result === 'Clean landing' &&
      (s.task !== 'spin' || (!f.air.startSwitch && f.air.switch))
    )
      state.value++
    return
  }
  if (s.task === 'press') {
    const holding =
      !f.air.switch &&
      !f.pivot &&
      f.air.phase === 'load' &&
      f.air.pushElapsed < 0 &&
      f.air.charge > 0.78 &&
      Math.abs(f.edge) < 9 &&
      f.speed > 2
    state.goodTime = holding ? p.goodTime + dt : 0
    state.value = Math.min(goal, Math.max(p.value, state.goodTime))
    return
  }
  if (
    f.speed < 2 ||
    f.pivot ||
    f.air.switch !== (s.technique === 'boardSwitch')
  ) {
    state.side = 0
    state.armed = false
    state.goodTime = 0
    return
  }
  if (s.task === 'absorb') {
    if (f.d <= featureStart || Math.abs(f.x) > 21) return
    if (f.normalAccel < 8.75 && f.flex > 0.61) state.armed = true
    if (
      state.armed &&
      f.normalAccel > 10.0 &&
      f.flex < 0.57 &&
      f.t - p.since > 0.35
    ) {
      state.value++
      state.armed = false
      state.since = f.t
    }
    return
  }
  const side = Math.abs(f.edge) >= 7 ? Math.sign(f.edge) : 0
  if (side && side !== p.side) {
    const duration = f.t - p.since
    const timed =
      s.task === 'short' || s.task === 'resize' || s.task === 'funnel'
    const onBeat =
      !timed ||
      Math.abs(duration - beatFor(s.task, p.value)) <
        (s.task === 'short' ? 0.48 : 0.32)
    if (
      p.side &&
      p.goodTime >= (s.task === 'twist' ? 0.055 : 0.15) &&
      duration > 0.42 &&
      onBeat
    )
      state.value++
    state.since = f.t
    state.side = side
    state.goodTime = 0
  }
  if (state.side && qualifying(s, f)) state.goodTime += dt
}

function driveWave(t: number, lengths: readonly number[]) {
  const period = lengths.reduce((a, b) => a + b, 0)
  const cycle = Math.floor(t / period)
  let offset = t - cycle * period,
    i = 0
  while (i < lengths.length - 1 && offset >= lengths[i]) offset -= lengths[i++]
  const sign = (cycle * lengths.length + i) % 2 ? -1 : 1
  return sign * Math.min(1, 0.32 + offset * 6)
}
export function stationInput(
  s: Station,
  f: Frame,
  base: Input,
  variation: number,
): Input {
  if (s.task === 'line') return base
  if (s.task === 'absorb')
    return {
      ...base,
      flex:
        base.flex &&
        (variation === 0 ||
          (variation < 1 && f.normalAccel < 10 - variation * 3)),
    }
  if (isAirTask(s.task)) {
    if (!variation) return base
    const flight = f.air.phase === 'flight',
      fraction = f.air.elapsed / Math.max(0.01, f.air.duration)
    if (s.task === 'spin') {
      if (variation === 1) return { ...base, steer: 0 }
      const t = f.t % 5.8,
        jump = t >= 1.48 && t < 2.13 - variation * 0.62
      return {
        ...base,
        jump,
        steer:
          f.air.phase === 'load' && !jump
            ? requiredSpin('boardFS180', f.air.switch)
            : 0,
      }
    }
    return {
      ...base,
      pose:
        s.task === 'shifty'
          ? flight && fraction < 0.67 + 0.38 * variation
          : flight &&
            fraction > 0.1 + 0.55 * variation &&
            fraction < 0.67 - 0.14 * variation,
    }
  }
  if (s.task === 'press')
    return {
      ...base,
      steer: 0,
      brake: false,
      tuck: false,
      jump: f.t % 4.5 < 2.25 - 1.77 * variation,
    }
  const times =
    s.task === 'short'
      ? [1.18 + 1.32 * variation]
      : s.task === 'resize'
        ? resize.map((t) => t + (1.2 - t) * variation)
        : s.task === 'funnel'
          ? funnel.map((t) => t + (2.7 - t) * variation)
          : [1.95]
  const steering =
    driveWave(f.t, times) *
    (s.task === 'wedge'
      ? 0.72
      : s.task === 'transfer' || s.task === 'parallel'
        ? 0.88 - 0.62 * variation
        : 0.88)
  const phase = (f.t % 1.95) / 1.95
  return {
    steer: steering,
    flex:
      !['match', 'twist', 'brush'].includes(s.task) || phase < 1 - variation,
    brake:
      (s.task === 'track' || s.task === 'wedge') &&
      Math.abs(f.edge) > 8 &&
      Math.abs(phase - 0.5) < variation / 2,
    pivot:
      variation > 0 &&
      s.task === 'switch' &&
      f.air.switch &&
      f.t > 0.55 + 7 * (1 - variation) &&
      !f.pivot,
    tuck: false,
  }
}
export const adjustments: Record<Task, readonly [string, string]> = {
  wedge: ['Intensity', 'Soften the braking wedge'],
  match: ['Timing', 'Soften the inside leg while shaping'],
  parallel: ['Intensity', 'Increase edge and leg steering'],
  track: ['Duration', 'Shorten the braking input'],
  transfer: ['Intensity', 'Build outside-ski support'],
  short: ['Rate', 'Quicken the edge changes'],
  resize: ['Duration', 'Lengthen the middle pair of arcs'],
  funnel: ['Rate', 'Quicken each successive change'],
  line: ['Timing', 'Aim at the next gate sooner'],
  absorb: ['Timing', 'Start flexing as the snow rises'],
  brush: ['Timing', 'Flex through the edge change'],
  twist: ['Timing', 'Release the leading foot first'],
  switch: ['Duration', 'Keep riding in switch'],
  spin: ['Timing', 'Coordinate load, release and rotation'],
  press: ['Duration', 'Sustain the supported tail press'],
  grab: ['Duration', 'Give the hand time to meet the edge'],
  shifty: ['Timing', 'Let the board realign sooner'],
}
