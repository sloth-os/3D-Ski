import { isSafety } from '../src/safety.ts'
import test from 'node:test'
import {
  analyse,
  riderPose,
  riderMass,
  gravity,
  idealTurn,
  magnitude,
  type Point3,
} from '../src/analysis.ts'
import assert from 'node:assert/strict'
import {
  courses,
  techniques,
  equipmentFor,
  isSetup,
  type TechniqueId,
  defaultSetup,
  type CourseId,
  type Setup,
  type SurfaceId,
} from '../src/course.ts'
import {
  buildGates,
  demonstrationInput,
  emptyFrame,
  lineAt,
  sample,
  radians,
  neutralInput,
  referenceRun,
  step,
  type Frame,
  type Input,
} from '../src/physics.ts'

function glide(setup: Setup, input: Input = neutralInput, seconds = 12) {
  const f = emptyFrame(),
    gates = buildGates(courses[setup.course])
  for (let i = 0; i < seconds * 60; i++) step(f, input, setup, gates, 1 / 60)
  return f
}
test('identical inputs produce a reproducible run and reference trace', () => {
  assert.deepEqual(glide(defaultSetup), glide(defaultSetup))
  const trace = referenceRun(defaultSetup)
  assert.deepEqual(trace, referenceRun(defaultSetup))
  assert.equal(trace.length, 44)
  assert.ok(trace.every((s) => s.speed >= 0 && s.load >= 50 && s.load <= 100))
})
test('tucking reduces drag and soft snow slows straight gliding', () => {
  const regular = glide(defaultSetup)
  assert.ok(
    glide(defaultSetup, { ...neutralInput, tuck: true }).speed > regular.speed,
  )
  assert.ok(glide({ ...defaultSetup, surface: 'powder' }).speed < regular.speed)
  assert.ok(glide({ ...defaultSetup, surface: 'ice' }).speed > regular.speed)
})
test('braking brings the skier to rest and holds position', () => {
  const f = glide(defaultSetup),
    gates = buildGates(courses.ridge)
  for (let i = 0; i < 480; i++)
    step(f, { ...neutralInput, brake: true }, defaultSetup, gates, 1 / 60)
  assert.equal(f.speed, 0)
  const d = f.d
  step(f, { ...neutralInput, brake: true }, defaultSetup, gates, 1 / 60)
  assert.equal(f.d, d)
})
test('edge changes reverse the turn and transfer load', () => {
  const f = glide(defaultSetup),
    gates = buildGates(courses.ridge)
  const steer = (side: number) => {
    for (let i = 0; i < 70; i++)
      step(f, { ...neutralInput, steer: side }, defaultSetup, gates, 1 / 60)
  }
  steer(1)
  assert.ok(f.edge > 30 && f.load > 50 && Number.isFinite(f.radius))
  steer(-1)
  assert.ok(f.edge < -30)
  assert.equal(f.turns, 1)
})
test('gate crossings score once and the course ends at its measured length', () => {
  for (const id of Object.keys(courses) as CourseId[]) {
    const c = courses[id],
      setup: Setup = { ...defaultSetup, course: id },
      gates = buildGates(c)
    assert.ok(gates.every((g) => Math.abs(lineAt(gates, g.d) - g.x) < 1e-6))
    const f: Frame = emptyFrame()
    for (const [i, g] of gates.entries()) {
      f.d = g.d - 0.05
      f.x = g.x + (i % 2 ? g.width + 1 : 0)
      f.speed = 8
      step(f, neutralInput, setup, gates, 1 / 60)
      step(f, neutralInput, setup, gates, 1 / 60)
    }
    assert.equal(f.gatesSeen, c.gates)
    assert.equal(f.gatesHit, Math.ceil(c.gates / 2))
    assert.equal(f.points, 100 * f.gatesHit)
    f.d = c.length - 0.02
    step(f, neutralInput, setup, gates, 1 / 60)
    assert.equal(f.d, c.length)
    assert.equal(f.done, true)
    const time = f.t
    step(f, neutralInput, setup, gates, 1 / 60)
    assert.equal(f.t, time)
  }
})
test('all gate-course techniques, terrain and snow combinations stay finite through the finish', () => {
  for (const course of Object.keys(courses) as CourseId[])
    for (const surface of ['groomed', 'powder', 'ice'] as SurfaceId[])
      for (const technique of Object.keys(techniques).filter(
        (id) => !isSafety(id),
      ) as TechniqueId[]) {
        const setup = { course, surface, technique },
          f = emptyFrame(),
          gates = buildGates(courses[course])
        for (let i = 0; !f.done && i < 60 * 240; i++)
          step(
            f,
            { ...neutralInput, steer: Math.sin(i / 91) * 0.64 },
            setup,
            gates,
            1 / 60,
          )
        assert.ok(f.done, JSON.stringify(setup))
        assert.ok(Number.isFinite(f.speed + f.x + f.edge + f.load + f.lean))
        assert.equal(f.gatesSeen, courses[course].gates)
      }
})
test('a sustained turn stays on the snow and can recover on a gentle powder slope', () => {
  for (const course of ['meadow', 'bowl'] as CourseId[]) {
    const setup: Setup = { course, surface: 'powder', technique: 'carve' },
      f = emptyFrame(),
      gates = buildGates(courses[course])
    for (let i = 0; i < 60 * 28; i++) {
      step(f, { ...neutralInput, steer: 1 }, setup, gates, 1 / 60)
      assert.ok(Math.abs(f.x) <= 26.5)
    }
    const distance = f.d
    for (let i = 0; i < 60 * 5; i++) step(f, neutralInput, setup, gates, 1 / 60)
    assert.ok(f.d > distance + 1 && f.speed > 0)
  }
})
test('the parallel-turn demonstration links turns and clears the default course', () => {
  const setup = defaultSetup,
    f = emptyFrame(),
    gates = buildGates(courses[setup.course])
  for (let i = 0; !f.done && i < 60 * 120; i++)
    step(f, demonstrationInput(f, setup, gates), setup, gates, 1 / 60)
  assert.equal(f.done, true)
  assert.equal(f.gatesHit, gates.length)
  assert.ok(f.turns >= gates.length - 1)
})

const closeTo = (actual: number, expected: number, tolerance = 1e-7) =>
  assert.ok(Math.abs(actual - expected) < tolerance, actual + ' vs ' + expected)
const dot = (a: Point3, b: Point3) => a.reduce((n, v, i) => n + v * b[i], 0)
test('external forces resolve in the frame of the snow and reproduce integrated accelerations', () => {
  for (const technique of ['parallel', 'boardSkid'] as const) {
    const setup = { ...defaultSetup, technique },
      f = emptyFrame(),
      gates = buildGates(courses.ridge)
    for (let i = 0; i < 1800; i++) {
      const v = f.speed
      step(
        f,
        {
          ...neutralInput,
          steer: Math.sin(i / 95) * 0.63,
          brake: i > 1420,
          flex: i % 130 < 45,
        },
        setup,
        gates,
        1 / 60,
      )
      const a = analyse(f, setup)
      closeTo(a.weightN, riderMass * gravity)
      closeTo(a.contacts[0] + a.contacts[1], a.normalN)
      closeTo(dot(a.reaction, a.normal), a.normalN)
      closeTo(dot(a.net, a.side) / riderMass, f.lateralAccel)
      // Heading and coefficients are evaluated at the start of each fixed step.
      closeTo(dot(a.net, a.forward) / riderMass, (f.speed - v) * 60)
      assert.ok(a.pressureKpa > 0 && a.contacts.every((v) => v > 0))
    }
  }
})
test('the two bindings of one snowboard retain their stance through both edges', () => {
  const setup: Setup = { ...defaultSetup, technique: 'boardCarve' }
  assert.ok(isSetup(defaultSetup) && isSetup(setup))
  assert.equal(equipmentFor(defaultSetup.technique), 'skis')
  assert.equal(equipmentFor(setup.technique), 'snowboard')
  for (const phase of [0, 0.8, Math.PI / 2, Math.PI]) {
    const f = idealTurn(setup, 40, 36, phase),
      p = riderPose(f, setup),
      a = analyse(f, setup)
    closeTo(p.legs[0].contact[0], p.legs[1].contact[0])
    closeTo(p.legs[1].ankle[2] - p.legs[0].ankle[2], 0.56)
    closeTo((a.contacts[0] / a.normalN) * 100, sample(f, setup).load)
    for (const leg of p.legs) {
      const thigh = leg.hip.map((v, i) => v - leg.knee[i]) as Point3,
        shin = leg.knee.map((v, i) => v - leg.ankle[i]) as Point3
      closeTo(magnitude(thigh), 0.452)
      closeTo(magnitude(shin), 0.425)
      closeTo(
        Math.acos(dot(thigh, shin) / (magnitude(thigh) * magnitude(shin))) /
          radians,
        leg.angle,
      )
    }
  }
  const toe = idealTurn(setup, 40, 36),
    heel = idealTurn(setup, 40, 36, Math.PI)
  assert.equal(analyse(toe, setup).edgeName, 'Toe edge')
  assert.equal(analyse(heel, setup).edgeName, 'Heel edge')
  assert.ok(
    riderPose(toe, setup).com[0] > 0 && riderPose(heel, setup).com[0] < 0,
  )
})
test('snowboard skidding pivots the board across the velocity and brakes the rider', () => {
  const setup: Setup = { ...defaultSetup, technique: 'boardSkid' }
  const f = glide(setup),
    g = buildGates(courses[setup.course]),
    start = f.speed
  for (let n = 0; n < 40; n++)
    step(f, { ...neutralInput, steer: 0.45, brake: true }, setup, g, 1 / 60)
  assert.ok(f.boardYaw > 0.7 && f.speed < start && f.slip > 0.65)
  assert.ok(analyse(f, setup).firstShare < 0.5)
  assert.equal(
    glide(defaultSetup, { ...neutralInput, brake: true }).boardYaw,
    0,
  )
})
test('all ski and snowboard reference riders clear the Alpine Ridge gates', () => {
  for (const technique of Object.keys(techniques).filter(
    (id) => !isSafety(id),
  ) as TechniqueId[]) {
    const setup = { ...defaultSetup, technique },
      gates = buildGates(courses.ridge),
      f = emptyFrame()
    for (let i = 0; !f.done && i < 9000; i++)
      step(f, demonstrationInput(f, setup, gates), setup, gates, 1 / 60)
    assert.equal(f.gatesHit, gates.length, technique)
  }
})
