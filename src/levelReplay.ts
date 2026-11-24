import { cancelPop, recordedInput, type StationTape } from './stationTape.ts'
import { courses } from './course.ts'
import {
  buildGates,
  demonstrationInput,
  emptyFrame,
  step,
  type Frame,
} from './physics.ts'
import { stationSetup, type Station } from './levelTwo.ts'
import { christieWedge, footTwist, isAirTask } from './levelPractice.ts'

export function stationReplay(s: Station, variation = 1) {
  const setup = stationSetup(s),
    course = courses[s.course],
    gates = buildGates(course),
    seed = emptyFrame(setup)
  const entry =
    s.task === 'absorb' || s.task === 'line' || s.task === 'twist' ? 62 : 0
  while (seed.d < entry && !seed.done && seed.t < 35)
    step(seed, demonstrationInput(seed, setup, gates), setup, gates, 1 / 60)
  const count = isAirTask(s.task)
    ? 215
    : s.task === 'press'
      ? 177
      : s.task === 'resize' || s.task === 'funnel'
        ? 700
        : 455
  function record(alteration: number) {
    const f = structuredClone(seed),
      frames: Frame[] = [{ ...f }]
    for (let i = 1; i < count; i++) {
      step(
        f,
        demonstrationInput(f, setup, gates, alteration),
        setup,
        gates,
        1 / 60,
      )
      frames.push({ ...f })
    }
    return frames
  }
  const reference = record(0),
    comparison = record(variation)
  const first = (start: number, check: (f: Frame) => boolean) => {
    const found = reference.findIndex((f, i) => i >= start && check(f))
    return found < 0 ? Math.min(start, reference.length - 1) : found
  }
  let marks: [string, number][]
  if (isAirTask(s.task)) {
    const launch = first(
      1,
      (f) => f.air.phase === 'load' && f.air.pushElapsed >= 0,
    )
    const apex = reference.reduce(
      (n, f, i) => (f.air.height > reference[n].air.height ? i : n),
      launch,
    )
    marks = [
      ['Approach', 0],
      ['Takeoff', launch],
      ['Maneuver', apex],
      ['Landing', first(apex + 1, (f) => f.air.phase === 'landing')],
    ]
  } else if (s.task === 'press') {
    marks = [
      ['Approach', 0],
      ['Tail loads', first(1, (f) => f.air.charge > 0.55)],
      ['Hold', first(1, (f) => (f.stationProgress?.value ?? 0) > 0.75)],
      ['Release', first(1, (f) => f.air.pushElapsed >= 0)],
    ]
  } else if (s.task === 'absorb') {
    const crest = first(1, (f) => f.normalAccel < 8.75 && f.flex > 0.61)
    const trough = first(crest + 1, (f) => f.normalAccel > 10 && f.flex < 0.57)
    marks = [
      ['Approach', 0],
      ['Crest', crest],
      ['Trough', trough],
      [
        'Next crest',
        first(trough + 1, (f) => f.normalAccel < 8.75 && f.flex > 0.61),
      ],
    ]
  } else if (s.task === 'line') {
    const gate = first(1, (f) => f.gatesSeen > seed.gatesSeen)
    marks = [
      ['Approach', 0],
      ['Set the line', Math.max(1, gate - 55)],
      ['Gate crossing', gate],
      ['Exit', Math.min(gate + 52, count - 1)],
    ]
  } else if (s.task === 'resize' || s.task === 'funnel') {
    const widths =
      s.task === 'resize'
        ? ['First short pair', 'Widen the arc', 'Shorten again']
        : ['Broad arc', 'Narrow the line', 'Shortest arc']
    const start = reference[0].turns
    marks = [
      ['Entry', 0],
      [widths[0], first(1, (f) => f.turns > start)],
      [widths[1], first(1, (f) => f.turns >= start + 2)],
      [widths[2], first(1, (f) => f.turns >= start + 4)],
    ]
  } else {
    const shape = first(
      1,
      (f) => Math.abs(f.edge) > 12 && Math.abs(f.edgeRate) < 6,
    )
    const release = first(
      shape + 1,
      (f) => Math.sign(f.edge) * f.edgeRate < -10,
    )
    const engage = first(
      release + 1,
      (f) =>
        Math.sign(f.edge) !== Math.sign(reference[shape].edge) &&
        Math.abs(f.edge) > 7,
    )
    marks = [
      ['Entry', 0],
      ['Shaping', shape],
      ['Release', release],
      ['New edge', engage],
    ]
  }
  return {
    setup,
    reference,
    comparison,
    stops: marks.map(([name, index]) => ({ name, index })),
  }
}

// Select a measurable point for a learner and reference starting at the same place and time.
function comparisonSignal(s: Station): [string, string, (f: Frame) => number] {
  switch (s.task) {
    case 'absorb':
    case 'brush':
      return ['leg flex', '%', (f) => f.flex * 100]
    case 'twist':
      return [
        'difference between the two foot tilts',
        '°',
        (f) => 2 * Math.abs(footTwist(f)),
      ]
    case 'match':
      return [
        'opening between the skis',
        '°',
        (f) => (christieWedge(f) * 360) / Math.PI,
      ]
    case 'transfer':
      return ['outside-ski load', '%', (f) => f.load]
    case 'wedge':
    case 'track':
      return ['slip', '%', (f) => f.slip * 100]
    case 'spin':
      return ['rotation', '°', (f) => (f.air.spin * 180) / Math.PI]
    case 'press':
      return [
        'tail preload',
        '%',
        (f) => (f.air.phase === 'load' ? f.air.charge * 100 : 0),
      ]
    case 'grab':
    case 'shifty':
      return ['airborne pose engagement', '%', (f) => f.air.pose * 100]
    case 'line':
      return [
        'heading across the slope',
        '°',
        (f) => (f.heading * 180) / Math.PI,
      ]
    default:
      return ['signed edge angle', '°', (f) => f.edge]
  }
}
export function attemptReplay(s: Station, tape: StationTape) {
  const setup = stationSetup(s),
    gates = buildGates(courses[s.course]),
    f = emptyFrame(setup),
    ref = emptyFrame(setup)
  const reference = [{ ...ref }],
    comparison = [{ ...f }]
  const cancellations = new Set(tape.cancellations)
  let change = 0
  for (let tick = 0; tick < tape.ticks; tick++) {
    if (tape.changes[change + 1]?.[0] === tick) change++
    step(f, recordedInput(tape.changes[change]), setup, gates, 1 / 60)
    step(ref, demonstrationInput(ref, setup, gates), setup, gates, 1 / 60)
    if (cancellations.has(tick + 1)) cancelPop(f)
    comparison.push({ ...f })
    reference.push({ ...ref })
  }
  const stops = [{ name: 'Start', index: 0 }]
  const firstGain = comparison.findIndex(
    (frame) => (frame.stationProgress?.value ?? 0) > 0,
  )
  if (firstGain > 0 && firstGain < tape.ticks)
    stops.push({ name: 'First progress', index: firstGain })
  const [signal, unit, read] = comparisonSignal(s)
  let index = tape.ticks,
    largest = -1
  for (let i = 1; i <= tape.ticks; i++) {
    const difference = Math.abs(read(reference[i]) - read(comparison[i]))
    if (difference >= largest) {
      largest = difference
      index = i
    }
  }
  const evidence =
    'At ' +
    (index / 60).toFixed(2) +
    ' s your ' +
    signal +
    ' was ' +
    Math.round(read(comparison[index])) +
    unit +
    '. The reference at the same time was ' +
    Math.round(read(reference[index])) +
    unit +
    '.'
  if (index > 0 && index < tape.ticks && index !== firstGain)
    stops.push({ name: 'Compare this frame', index })
  if (tape.ticks > 0) stops.push({ name: 'Last frame', index: tape.ticks })
  stops.sort((a, b) => a.index - b.index)
  return { setup, reference, comparison, stops, evidence }
}
