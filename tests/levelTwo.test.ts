import assert from 'node:assert/strict'
import test from 'node:test'
import {
  stations,
  stationsFor,
  stationFromHash,
  stationPath,
  stationSetup,
  teachingCases,
  goals,
  type Station,
} from '../src/levelTwo.ts'
import {
  buildGates,
  emptyFrame,
  demonstrationInput,
  neutralInput,
  step,
  summarize,
} from '../src/physics.ts'
import { attemptReplay, stationReplay } from '../src/levelReplay.ts'
import { goalReached } from '../src/levelPractice.ts'
import { courses, defaultSetup, isSetup } from '../src/course.ts'
import { riderPose } from '../src/analysis.ts'
import { isTape, tapeLimit, cancelPop } from '../src/stationTape.ts'
const tick = 1 / 60
function drive(s: Station, variant?: boolean) {
  const setup = stationSetup(s),
    gates = buildGates(courses[s.course]),
    f = emptyFrame(setup)
  while (f.t < 32 && !f.done && !goalReached(s, f.stationProgress))
    step(
      f,
      variant === undefined
        ? neutralInput
        : demonstrationInput(f, setup, gates, variant),
      setup,
      gates,
      tick,
    )
  return f
}
test('Level II sport routes, sources, decisions and saved setup stay consistent', () => {
  assert.equal(stations.length, new Set(stations.map((s) => s.id)).size)
  assert.ok(isSetup(defaultSetup))
  assert.equal(stationsFor('skiing').length, 10)
  assert.equal(stationsFor('snowboarding').length, 12)
  assert.equal(
    stationFromHash('#snowboarding/level-ii/wedge-christie')?.sport,
    'snowboarding',
  )
  assert.equal(stationFromHash('#skiing/parallel/load-path'), undefined)
  for (const s of stations) {
    const setup = stationSetup(s)
    assert.ok(isSetup(setup))
    assert.equal(stationFromHash(stationPath(s)), s)
    assert.ok(
      !isSetup({ ...setup, surface: s.surface === 'ice' ? 'groomed' : 'ice' }),
    )
    assert.ok(!isSetup({ ...setup, station: 'constructor' }))
    assert.ok(s.page >= 23 && s.page <= 48)
    for (const q of [s.observation, teachingCases[s.teaching]]) {
      assert.ok(q.answers[q.correct] && new Set(q.answers).size === 3)
    }
  }
})
test('each station goal is attainable and neutral input earns no full credit', () => {
  for (const s of stations) {
    const ref = drive(s, false),
      passive = drive(s)
    assert.equal(ref.stationProgress?.value, goals[s.task][0], s.id)
    assert.ok(!goalReached(s, passive.stationProgress), s.id)
    assert.ok(summarize(ref, stationSetup(s)).finished, s.id)
    assert.equal(summarize(passive, stationSetup(s)).finished, false, s.id)
  }
})
test('each coaching intervention changes the movement and full correction reproduces the reference', () => {
  for (const s of stations) {
    const clip = stationReplay(s),
      fixed = stationReplay(s, 0),
      partial = stationReplay(s, 0.5)
    const signatures = (frames: typeof clip.reference) =>
      frames.map((f) => [
        f.x,
        f.d,
        f.edge,
        f.flex,
        f.brake,
        f.air.charge,
        f.air.spin,
        f.air.pose,
        f.air.switch,
        f.boardYaw,
      ])
    assert.deepEqual(clip.reference[0], clip.comparison[0], s.id)
    assert.deepEqual(
      signatures(fixed.reference),
      signatures(fixed.comparison),
      s.id,
    )
    assert.notDeepEqual(
      signatures(clip.reference),
      signatures(clip.comparison),
      s.id,
    )
    assert.notDeepEqual(
      signatures(partial.comparison),
      signatures(clip.comparison),
      s.id,
    )
    assert.notDeepEqual(
      signatures(partial.comparison),
      signatures(clip.reference),
      s.id,
    )
    assert.equal(clip.stops.length, 4)
    assert.ok(
      clip.stops.every(
        (v, i) =>
          v.index >= 0 &&
          v.index < clip.reference.length &&
          (!i || v.index > clip.stops[i - 1].index),
      ),
      s.id,
    )
  }
})
test('christie ski opening and front-to-rear board torsion appear in the articulated pose', () => {
  const match = stationReplay(stations.find((s) => s.task === 'match')!),
    peak = match.stops[1].index
  assert.ok(
    Math.abs(riderPose(match.reference[peak], match.setup).legs[0].deck.yaw) <
      0.045,
  )
  assert.ok(
    Math.abs(riderPose(match.comparison[peak], match.setup).legs[0].deck.yaw) >
      0.16,
  )
  const twist = stationReplay(stations.find((s) => s.task === 'twist')!)
  assert.ok(
    twist.reference.some(
      (f) => Math.abs(riderPose(f, twist.setup).boardTorsion) > 0.17,
    ),
  )
  assert.ok(
    twist.comparison
      .slice(100)
      .every((f) => Math.abs(riderPose(f, twist.setup).boardTorsion) < 0.005),
  )
})
test('recorded controls reconstruct an actual station attempt including a cancelled pop and pivot', () => {
  const s = stations.find((st) => st.task === 'press')!,
    setup = stationSetup(s),
    gates = buildGates(courses[s.course]),
    f = emptyFrame(setup)
  f.stationTape = { ticks: 0, changes: [] }
  for (let i = 0; i < 360; i++) {
    if (i === 24) cancelPop(f)
    step(
      f,
      {
        ...neutralInput,
        jump: i < 24 || (i >= 60 && i < 108),
        steer: i > 170 ? -1 : 0,
        pivot: i === 220,
      },
      setup,
      gates,
      tick,
    )
  }
  const run = summarize(f, setup),
    tape = run.stationTape!
  assert.ok(isTape(tape))
  assert.ok(tape.changes.length < 10)
  assert.deepEqual(tape.cancellations, [24])
  const replay = attemptReplay(
    s,
    JSON.parse(JSON.stringify(tape)),
  ).comparison.at(-1)!
  assert.deepEqual(
    { ...f, stationTape: undefined },
    { ...replay, stationTape: undefined },
  )
  assert.equal(isTape({ ticks: tapeLimit + 1, changes: [] }), false)
  assert.equal(
    isTape({
      ticks: 5,
      changes: [
        [0, 0, 0],
        [3, 0, 0],
        [2, 0, 0],
      ],
    }),
    false,
  )
  assert.equal(isTape({ ticks: 5, changes: [[0, 0, 64]] }), false)
})

test('a nose-leading tail press and a forward-to-switch 180 require the assigned stance', () => {
  for (const task of ['press', 'spin']) {
    const station = stations.find((s) => s.task === task)!,
      setup = stationSetup(station),
      gates = buildGates(courses[setup.course]),
      f = emptyFrame(setup)
    f.air.switch = true
    while (f.t < 4)
      step(f, demonstrationInput(f, setup, gates), setup, gates, tick)
    assert.equal(f.stationProgress?.value, 0, station.id)
  }
})
