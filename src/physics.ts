import { recordControls, type StationTape } from './stationTape.ts'
import { findStation } from './levelTwo.ts'
import {
  advanceStation,
  goalReached,
  freshProgress,
  stationInput,
  christieWedge,
  footTwist,
  type StationProgress,
} from './levelPractice.ts'
import {
  courses,
  equipmentFor,
  defaultSetup,
  startsSwitch,
  isSwitchDrill,
  surfaces,
  techniques,
  type Course,
  type Setup,
} from './course.ts'

import {
  clamp,
  radians,
  pitchAt,
  bankAt,
  gullyCenter,
  featureStart,
  runoutStart,
  undulation,
  slopeAxes,
  worldHeight,
} from './slope.ts'
export { clamp, radians, pitchAt, worldHeight, undulation } from './slope.ts'
import {
  initialAir,
  foreAftPress,
  stepPivot,
  stepAir,
  landingSupport,
  landingFlex,
  pushSupport,
  extensionFlex,
  trickDemoControls,
  type AirState,
} from './air.ts'
import { isTrick } from './tricks.ts'
import {
  isSafety,
  isFall,
  initialSafety,
  safetyStartSpeed,
  safetyReferenceInput,
  stepSafety,
  edgeSide,
  type SafetyState,
} from './safety.ts'
const approach = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt))

export type Input = {
  jump?: boolean
  pose?: boolean
  check?: boolean
  pivot?: boolean
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
  stationTape?: StationTape
  stationProgress?: StationProgress
  x: number
  d: number
  t: number
  speed: number
  heading: number
  forceHeading: number
  safety: SafetyState | null
  air: AirState
  pivot: { progress: number; direction: number } | null
  pivotHeld: boolean
  lookSide: number
  switchDistance: number
  switchTurns: number
  switchGates: number
  edge: number
  radius: number
  load: number
  flex: number
  tuck: number
  brake: number
  lean: number
  slip: number
  pitch: number
  bank: number
  edgeRate: number
  normalAccel: number
  lateralAccel: number
  frictionAccel: number
  dragAccel: number
  grip: number
  boardYaw: number
  gatesSeen: number
  gatesHit: number
  turns: number
  points: number
  quality: number
  maxSpeed: number
  lastGateOffset?: number
  lastGateHit: boolean
  lastGateTime: number
  lastSide: number
  lastTurnTime: number
  focusTime: number
  done: boolean
}
export const emptyFrame = (setup: Setup = defaultSetup): Frame => ({
  x: 0,
  d: 0,
  t: 0,
  ...(setup.station ? { stationProgress: freshProgress() } : {}),
  speed: setup.station
    ? 7.5
    : isSafety(setup.technique)
      ? safetyStartSpeed(setup.technique)
      : 0,
  heading: 0,
  forceHeading: 0,
  safety: isSafety(setup.technique) ? initialSafety() : null,
  air: initialAir(startsSwitch(setup)),
  pivot: null,
  pivotHeld: false,
  lookSide: 1,
  switchDistance: 0,
  switchTurns: 0,
  switchGates: 0,
  edge: 0,
  radius: Infinity,
  load: 50,
  flex: 0.2,
  tuck: 0,
  brake: 0,
  lean: 0,
  slip: 0,
  pitch: pitchAt(courses[setup.course], 0) / radians,
  bank: bankAt(courses[setup.course], 0) / radians,
  edgeRate: 0,
  normalAccel: 9.81,
  lateralAccel: 0,
  frictionAccel: 0,
  dragAccel: 0,
  grip: 0.96,
  boardYaw:
    setup.technique === 'boardStop'
      ? (edgeSide(setup) * Math.PI) / 2
      : setup.technique === 'boardFall'
        ? -Math.PI / 2
        : 0,
  gatesSeen: 0,
  gatesHit: 0,
  turns: 0,
  points: 0,
  quality: 0,
  maxSpeed: isSafety(setup.technique) ? safetyStartSpeed(setup.technique) : 0,
  lastGateHit: false,
  lastGateTime: -5,
  lastSide: 0,
  lastTurnTime: -2,
  focusTime: 0,
  done: false,
})

export function buildGates(c: Course): Gate[] {
  return Array.from({ length: c.gates }, (_, i) => {
    const sign = i % 2 ? -1 : 1
    const d = ((i + 0.78) * c.length) / (c.gates + 0.2)
    let x = sign * c.swing * (0.62 + 0.32 * Math.sin(i * 0.8 + 0.4))
    if (c.form === 'gully') x = gullyCenter(d) + sign * c.swing
    if (c.form === 'rollers') x = c.swing * Math.sin(i * 1.12 + 0.4)
    if (c.form === 'traverse')
      x = sign * c.swing * (0.84 + 0.1 * Math.cos(i * 0.7))
    if (c.form === 'moguls')
      x = sign * c.swing * (0.72 + 0.17 * Math.sin(i * 1.6))
    return { d, x, width: c.width }
  })
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

function edgeLimit(setup: Setup) {
  switch (setup.technique) {
    case 'wedge':
      return 26
    case 'carve':
      return 58
    case 'boardCarve':
      return 54
    case 'boardSkid':
      return 36
    default:
      return 46
  }
}
export function step(
  f: Frame,
  input: Input,
  setup: Setup,
  gates: Gate[],
  dt: number,
): void {
  if (f.done || dt <= 0) return
  if (f.stationTape) recordControls(f.stationTape, input)
  const station = findStation(setup.station)
  const course = courses[setup.course],
    surface = surfaces[setup.surface],
    tech = techniques[setup.technique]
  const pitch = pitchAt(course, f.d, f.x),
    bank = bankAt(course, f.d, f.x, pitch)
  const axes = slopeAxes(pitch, bank, f.heading)
  if (f.t === 0 && startsSwitch(setup) && !f.air.switch)
    f.air = initialAir(true)
  if (f.t === 0 && isSafety(setup.technique) && !f.safety)
    Object.assign(f, emptyFrame(setup))
  f.t += dt
  f.pitch = pitch / radians
  f.bank = bank / radians
  f.forceHeading = f.heading
  if (isSafety(setup.technique)) {
    stepSafety(f, input, setup, surface.friction, dt)
    return
  }
  const trick = isTrick(setup.technique),
    beforeX = f.x,
    beforeD = f.d
  stepPivot(f, input, dt)
  if (
    isTrick(setup.technique) &&
    stepAir(f, setup.technique, course, input, dt)
  ) {
    finishStep(f, gates, course, beforeX, beforeD)
    if (station) advanceStation(station, f, dt)
    return
  }
  f.tuck = approach(f.tuck, input.tuck && !input.brake ? 1 : 0, 4, dt)
  f.brake = approach(f.brake, input.brake ? 1 : f.pivot ? 0.32 : 0, 5, dt)
  if (f.air.phase === 'load' && f.air.pushElapsed >= 0)
    f.flex = extensionFlex(f)
  else if (f.air.phase === 'landing') f.flex = landingFlex(f)
  else
    f.flex = approach(
      f.flex,
      f.air.phase === 'load'
        ? 0.24 + 0.72 * f.air.charge
        : input.flex
          ? 0.96
          : 0.2 + 0.38 * f.tuck,
      course.form === 'moguls' ? 8 : 5,
      dt,
    )
  const wedge = setup.technique === 'wedge'
  const board = equipmentFor(setup.technique) === 'snowboard'
  const maxEdge = edgeLimit(setup)
  const previousEdge = f.edge
  f.edge = approach(
    f.edge,
    (f.pivot ? 0 : clamp(input.steer, -1, 1)) * maxEdge * (1 - 0.32 * f.brake),
    2.3 * tech.response,
    dt,
  )
  f.edgeRate = (f.edge - previousEdge) / dt
  if (Math.abs(f.edge) > 4)
    f.lookSide = approach(f.lookSide, -Math.sign(f.edge), 4.4, dt)
  const edge = Math.abs(f.edge) * radians
  const rough =
    surface.roughness * Math.abs(Math.sin(f.d * 0.21)) * (1 - 0.62 * f.flex)
  const effectiveGrip = clamp(surface.grip - rough * 0.17, 0.35, 1)
  f.grip = effectiveGrip
  const offPiste = clamp((Math.abs(f.x) - 21) / 5, 0, 1)
  const christie = station?.task === 'match' ? christieWedge(f) : 0
  f.slip = clamp(
    (f.pivot ? 0.46 * Math.sin(Math.PI * f.pivot.progress) : 0) +
      (1 - effectiveGrip) * Math.sin(edge) +
      f.brake * 0.7 +
      christie +
      (wedge
        ? 0.18
        : setup.technique === 'boardSkid'
          ? 0.27 * Math.min(1, Math.abs(f.edge) / 15)
          : 0),
    0,
    1,
  )

  // Gravity along the skis, Coulomb sliding resistance, skidding, and quadratic air drag.
  const horizontalCos = Math.cos(course.pitch * radians)
  const dx = 0.55 * axes.forward[0],
    dd = (-0.55 * axes.forward[2]) / horizontalCos
  const curvature =
    (worldHeight(course, f.d + dd, f.x + dx) -
      2 * worldHeight(course, f.d, f.x) +
      worldHeight(course, f.d - dd, f.x - dx)) /
    0.55 ** 2
  const normal = clamp(
    axes.normal[1] * (9.81 + curvature * f.speed * f.speed),
    2.5,
    21,
  )
  f.normalAccel = normal + landingSupport(f) + pushSupport(f, setup.technique)
  const resistance =
    normal *
    (surface.friction +
      f.brake * (board ? 0.78 : 0.73) +
      f.slip * 0.12 +
      offPiste *
        Math.min(
          0.13,
          Math.max(0, (Math.tan(pitch) - surface.friction) * 0.42),
        ))
  const drag = (0.0093 - 0.004 * f.tuck) * f.speed * f.speed
  const acceleration = -9.81 * axes.forward[1] - resistance - drag
  const previousSpeed = f.speed
  f.speed = clamp(f.speed + acceleration * dt, 0, 32)
  f.dragAccel = drag
  f.frictionAccel = Math.max(
    0,
    -9.81 * axes.forward[1] - drag - (f.speed - previousSpeed) / dt,
  )
  const slipSign = Math.sign(f.edge || f.lastSide || 1)
  f.boardYaw = board
    ? approach(
        f.boardYaw,
        slipSign * (f.brake * 0.86 + f.slip * 0.56) +
          (station?.task === 'twist' ? footTwist(f) * radians * 0.25 : 0),
        4.4,
        dt,
      )
    : 0
  const cutRadius = tech.sidecut * Math.cos(edge)
  const engagement =
    Math.sin(edge) * (wedge ? 2.05 : board ? 0.88 : 1.5) * effectiveGrip
  const edgeRate = (Math.sign(f.edge) * f.speed * engagement) / cutRadius
  const gravityRate = (-9.81 * axes.side[1]) / Math.max(f.speed, 3)
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
  f.lateralAccel = f.speed * yawRate
  const lateral = Math.abs(f.lateralAccel)
  // A quick change of support under the boots moves the legs before it moves the torso.
  const supportLean = Math.atan2(f.lateralAccel + 9.81 * axes.side[1], normal)
  f.lean =
    course.form === 'piste'
      ? Math.atan2(f.lateralAccel, normal)
      : approach(f.lean, supportLean, 4.5, dt)
  f.load = clamp(
    50 + (38 * lateral) / (lateral + 3.2) + Math.sin(edge) * 5,
    50,
    94,
  )
  const travel = slopeAxes(pitch, bank, f.heading).forward
  f.x = clamp(f.x + travel[0] * f.speed * dt, -26.5, 26.5)
  f.d = Math.min(
    course.length,
    f.d - (travel[2] * f.speed * dt) / horizontalCos,
  )
  f.maxSpeed = Math.max(f.maxSpeed, f.speed)
  const side = Math.abs(f.edge) >= 9 ? Math.sign(f.edge) : 0
  if (side && side !== f.lastSide && f.speed > 1 && !f.pivot) {
    if (f.lastSide && f.t - f.lastTurnTime > 0.65) {
      f.turns++
      if (f.air.switch) f.switchTurns++
      f.points += 25
    }
    f.lastSide = side
    f.lastTurnTime = f.t
  }
  if (
    Math.abs(f.edge) >= tech.edge[0] &&
    Math.abs(f.edge) <= tech.edge[1] &&
    f.speed > 1 &&
    offPiste < 0.1 &&
    (!isSwitchDrill(setup.technique) || (f.air.switch && !f.pivot))
  )
    f.focusTime += dt
  if (!trick) f.quality = Math.round((100 * f.focusTime) / f.t)
  finishStep(f, gates, course, beforeX, beforeD)
  if (station) advanceStation(station, f, dt)
}
function finishStep(
  f: Frame,
  gates: Gate[],
  course: Course,
  beforeX: number,
  beforeD: number,
) {
  const ridingSwitch =
    f.air.switch &&
    !f.pivot &&
    f.air.phase !== 'flight' &&
    f.air.landedAt !== f.t
  if (ridingSwitch) f.switchDistance += f.d - beforeD
  const gate = gates[f.gatesSeen]
  if (gate && f.d >= gate.d) {
    const crossingX =
      beforeX +
      ((f.x - beforeX) * (gate.d - beforeD)) / Math.max(0.00001, f.d - beforeD)
    f.lastGateOffset = crossingX - gate.x
    f.lastGateHit = Math.abs(f.lastGateOffset) <= gate.width
    f.gatesSeen++
    f.lastGateTime = f.t
    if (f.lastGateHit) {
      f.gatesHit++
      if (ridingSwitch) f.switchGates++
      f.points += 100
    }
  }
  f.done = f.d >= course.length && f.air.phase !== 'flight'
}

export type Sample = {
  speed: number
  edge: number
  load: number
  radius: number
}
export function frontBindingShare(f: Frame, setup?: Setup) {
  if (setup?.technique === 'boardStop') return 0.5
  const lead = clamp(
    0.53 + 0.065 * f.tuck - 0.13 * f.brake + 0.038 * Math.tanh(f.edgeRate / 38),
    0.32,
    0.68,
  )
  const nose = f.air.switch ? 1 - lead : lead
  const press =
    setup && f.air.phase === 'load' ? foreAftPress(f, setup.technique) : 0
  return clamp(nose - 0.34 * press, 0.12, 0.88)
}
export function sample(f: Frame, setup: Setup = defaultSetup): Sample {
  return {
    speed: f.speed * 3.6,
    edge: Math.abs(f.edge),
    load:
      f.air.phase === 'flight'
        ? 0
        : equipmentFor(setup.technique) === 'snowboard'
          ? 100 * frontBindingShare(f, setup)
          : f.load,
    radius: f.radius,
  }
}

// The standby charts show a reproducible sample from the same dynamics used during play.
export function referenceRun(setup: Setup): Sample[] {
  const frame = emptyFrame(setup),
    gates = buildGates(courses[setup.course]),
    samples: Sample[] = []
  for (let i = 0; i < 646; i++) {
    step(frame, demonstrationInput(frame, setup, gates), setup, gates, 1 / 60)
    if (i % 8 === 0) samples.push(sample(frame, setup))
  }
  return samples.slice(-44)
}
export function summarize(frame: Frame, setup: Setup) {
  const station = findStation(setup.station)
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
    quality: isTrick(setup.technique)
      ? Math.round((100 * frame.air.landed) / Math.max(1, frame.air.attempts))
      : frame.quality,
    finished: station
      ? goalReached(station, frame.stationProgress)
      : frame.safety
        ? frame.safety.phase === 'checked'
        : frame.done,
    ...(setup.station && frame.stationTape
      ? { stationTape: frame.stationTape }
      : {}),
    ...(setup.station && frame.stationProgress
      ? { stationValue: frame.stationProgress.value }
      : {}),
    ...(frame.safety
      ? {
          safety: {
            phase: frame.safety.phase,
            guarded: frame.safety.guarded,
            speed: frame.safety.entrySpeed * 3.6,
            distance:
              frame.safety.actionAt < 0
                ? 0
                : Math.max(0, frame.d - frame.safety.actionDistance),
            seconds:
              frame.safety.restAt < 0
                ? 0
                : frame.safety.restAt - frame.safety.actionAt,
          },
        }
      : {}),
    ...(frame.switchDistance > 0 || startsSwitch(setup)
      ? {
          switchRide: {
            distance: Math.round(frame.switchDistance),
            turns: frame.switchTurns,
            gates: frame.switchGates,
          },
        }
      : {}),
    ...(isTrick(setup.technique)
      ? {
          freestyle: {
            landed: frame.air.landed,
            attempts: frame.air.attempts,
            bestTime: frame.air.bestTime,
            points: frame.air.points,
          },
        }
      : {}),
  }
}
export type Run = ReturnType<typeof summarize>

// A reference skier looks ahead along the same gate line the learner can display.
export function demonstrationInput(
  f: Frame,
  setup: Setup,
  gates: Gate[],
  alteration: boolean | number = false,
): Input {
  if (isSafety(setup.technique)) return safetyReferenceInput(f, setup.technique)
  const anticipation = 2.6 + f.speed * 0.53
  const station = findStation(setup.station)
  const variation = clamp(Number(alteration), 0, 1)
  const targetD =
    f.d +
    anticipation -
    (station?.task === 'line' ? variation * (anticipation + 10) : 0)
  const center = lineAt(gates, targetD)
  const gradient = (lineAt(gates, targetD + 1) - lineAt(gates, targetD - 1)) / 2
  const predictedX = f.x + Math.tan(f.heading) * anticipation
  const heading =
    Math.atan(gradient) +
    Math.atan2(center - predictedX, anticipation + 4) * 0.85
  const tech = techniques[setup.technique],
    surface = surfaces[setup.surface],
    course = courses[setup.course]
  const axes = slopeAxes(f.pitch * radians, f.bank * radians, f.heading)
  const rate =
    2.4 * (heading - f.heading) + (9.81 * axes.side[1]) / Math.max(f.speed, 3)
  const wedge = setup.technique === 'wedge'
  const board = equipmentFor(setup.technique) === 'snowboard'
  const targetEdge = Math.atan(
    (rate * tech.sidecut) /
      (Math.max(f.speed, 4) *
        (wedge ? 2.05 : board ? 0.88 : 1.5) *
        surface.grip),
  )
  const maxEdge = edgeLimit(setup)
  const steer = clamp(targetEdge / (maxEdge * radians), -1, 1)
  const targetSpeed =
    (wedge ? 8.5 : setup.technique === 'short' ? 11.5 : 13.5) +
    1.3 * Math.cos(f.d / 25)
  let flex = Math.abs(steer) > 0.42 || f.pitch > course.pitch + 1.2
  if (
    (course.form === 'rollers' || course.form === 'moguls') &&
    f.d > featureStart &&
    f.d < runoutStart(course)
  ) {
    // Read the approaching crest early enough for the reference rider's legs to retract.
    const lead = (course.form === 'moguls' ? 0.09 : 0.17) * f.speed,
      reach = course.form === 'rollers' ? 5 : 2
    const forwardD = -axes.forward[2] / Math.cos(course.pitch * radians)
    const relief = (travel: number) =>
      undulation(
        course,
        f.d + forwardD * travel,
        f.x + axes.forward[0] * travel,
      )
    flex =
      relief(lead) > (relief(lead - reach) + relief(lead + reach)) / 2 + 0.015
  }
  const input = {
    steer,
    flex,
    tuck: !wedge && Math.abs(steer) < 0.13,
    brake: f.speed > targetSpeed,
    ...(isTrick(setup.technique)
      ? trickDemoControls(f, setup.technique, steer)
      : {}),
  }
  return station ? stationInput(station, f, input, variation) : input
}

export function referenceFrame(setup: Setup): Frame {
  const frame = emptyFrame(setup),
    gates = buildGates(courses[setup.course])
  for (let i = 0; i < 646; i++) {
    step(frame, demonstrationInput(frame, setup, gates), setup, gates, 1 / 60)
    if (
      frame.safety &&
      (isFall(setup.technique) ? frame.safety.fall >= 0.8 : frame.brake >= 0.82)
    )
      break
    if (
      isTrick(setup.technique) &&
      frame.air.phase === 'flight' &&
      frame.air.elapsed >= frame.air.duration * 0.5
    )
      break
  }
  return frame
}
