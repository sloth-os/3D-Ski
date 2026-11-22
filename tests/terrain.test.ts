import assert from 'node:assert/strict'
import test from 'node:test'
import { analyse, riderMass, riderPose, type Point3 } from '../src/analysis.ts'
import {
  courses,
  courseFromHash,
  defaultSetup,
  isSetup,
} from '../src/course.ts'
import {
  buildGates,
  demonstrationInput,
  emptyFrame,
  neutralInput,
  step,
} from '../src/physics.ts'
import {
  bankAt,
  featureStart,
  gullyCenter,
  pitchAt,
  radians,
  runoutStart,
  slopeAxes,
  undulation,
  worldHeight,
} from '../src/slope.ts'
import { courseStages, stageAt } from '../src/terrainGuide.ts'

const terrain = ['traverse', 'rollers', 'gully', 'moguls'] as const
const dot = (a: Point3, b: Point3) =>
  a.reduce((sum, value, i) => sum + value * b[i], 0)
const closeTo = (actual: number, expected: number, tolerance = 1e-7) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} should be within ${tolerance} of ${expected}`,
  )

test('course links and stored setups accept each course, and features meet the approach and runout smoothly', () => {
  for (const id of Object.keys(courses)) {
    assert.equal(courseFromHash('#terrain/' + id), id)
    assert.ok(isSetup({ ...defaultSetup, course: id }))
  }
  for (const invalid of [
    '#terrain/__proto__',
    '#terrain/constructor',
    '#terrain/moguls/extra',
    '#terrain/unknown',
    '#skiing/parallel',
  ])
    assert.equal(courseFromHash(invalid), null)
  for (const id of terrain) {
    const c = courses[id],
      sections = courseStages(c)
    assert.deepEqual(
      sections.map((s) => s.d),
      [
        0,
        featureStart,
        Math.round((featureStart + runoutStart(c)) / 2),
        runoutStart(c),
      ],
    )
    for (const section of sections.slice(1)) {
      assert.equal(stageAt(sections, section.d)?.name, section.name)
      assert.notEqual(stageAt(sections, section.d - 0.001)?.name, section.name)
    }
    for (const d of [featureStart, runoutStart(c)]) {
      assert.equal(bankAt(c, d, 9), 0)
      closeTo(
        worldHeight(c, d + 0.01, 9) - worldHeight(c, d, 9),
        worldHeight(c, d, 9) - worldHeight(c, d - 0.01, 9),
        0.0001,
      )
    }
  }
})

test('traverse camber reverses, roller crests move closer, and mogul rows are staggered', () => {
  assert.ok(bankAt(courses.traverse, 110) > 5 * radians)
  assert.ok(bankAt(courses.traverse, 325) < -5 * radians)
  const crests: number[] = []
  for (let d = 70; d < runoutStart(courses.rollers) - 15; d += 0.25) {
    const h = undulation(courses.rollers, d)
    if (
      h > undulation(courses.rollers, d - 0.25) &&
      h > undulation(courses.rollers, d + 0.25)
    )
      crests.push(d)
  }
  assert.ok(crests.length >= 10)
  assert.ok(crests[1] - crests[0] > 30)
  assert.ok(crests.at(-1)! - crests.at(-2)! < 25.5)
  for (const row of [12, 13]) {
    const d = featureStart + 7.8 * row,
      center = (-0.33 * Math.sin(d / 22) * 5.8) / (2 * Math.PI)
    const difference =
      undulation(courses.moguls, d, center) -
      undulation(courses.moguls, d, center + 2.9)
    assert.ok(difference * (row % 2 ? -1 : 1) > 0.5)
  }
})

test('gravity pulls a flat rider off each gully wall and the force vectors follow the actual tangent plane', () => {
  const setup = { ...defaultSetup, course: 'gully' as const },
    c = courses.gully,
    d = 73,
    center = gullyCenter(d)
  const gates = buildGates(c)
  for (const wall of [-1, 1]) {
    const x = center + wall * 8,
      pitch = pitchAt(c, d, x),
      bank = bankAt(c, d, x, pitch)
    assert.ok(worldHeight(c, d, x) > worldHeight(c, d, center) + 0.9)
    assert.ok(bank * wall > 9 * radians)
    const f = Object.assign(emptyFrame(setup), { d, x, speed: 8 })
    step(f, neutralInput, setup, gates, 1 / 60)
    const a = analyse(f, setup),
      axes = slopeAxes(pitch, bank, f.forceHeading)
    const dx = (worldHeight(c, d, x + 0.15) - worldHeight(c, d, x - 0.15)) / 0.3
    closeTo(dot(axes.normal, [1, dx, 0]), 0)
    closeTo(dot(axes.normal, [0, -Math.tan(pitch), -1]), 0)
    closeTo(dot(a.net, axes.side) / riderMass, f.lateralAccel)
    closeTo(dot(a.net, axes.forward) / riderMass, (f.speed - 8) * 60)
    for (let n = 1; n < 20; n++) step(f, neutralInput, setup, gates, 1 / 60)
    assert.ok((f.x - x) * wall < -0.05)
  }
})

test('a roller hollow increases the snow reaction and a crest unloads the rider at the same speed', () => {
  const c = courses.rollers,
    setup = { ...defaultSetup, course: 'rollers' as const },
    gates = buildGates(c)
  const profile = Array.from({ length: 113 }, (_, i) => 100 + i / 4)
  const byHeight = profile.sort((a, b) => undulation(c, a) - undulation(c, b))
  const supportAt = (d: number) => {
    const f = Object.assign(emptyFrame(setup), { d, speed: 9 })
    step(f, neutralInput, setup, gates, 1 / 60)
    return analyse(f, setup).normalN
  }
  assert.ok(
    supportAt(byHeight[0]) - supportAt(byHeight.at(-1)!) > 2 * riderMass,
  )
})

test('the reference rider bends the animated knees more over roller and mogul crests than in hollows', () => {
  for (const course of ['rollers', 'moguls'] as const) {
    const c = courses[course],
      setup = { ...defaultSetup, course },
      gates = buildGates(c),
      f = emptyFrame(setup)
    const crests: number[] = [],
      hollows: number[] = []
    for (let n = 0; !f.done && n < 7200; n++) {
      step(f, demonstrationInput(f, setup, gates), setup, gates, 1 / 60)
      if (n % 6 || f.d < featureStart + 25 || f.d > runoutStart(c) - 25)
        continue
      const height = undulation(c, f.d, f.x)
      const [left, right] = riderPose(f, setup).legs
      const kneeAngle = (left.angle + right.angle) / 2
      if (height > 0.46) crests.push(kneeAngle)
      if (height < (course === 'rollers' ? -0.46 : 0.09))
        hollows.push(kneeAngle)
    }
    const mean = (samples: number[]) =>
      samples.reduce((sum, n) => sum + n, 0) / samples.length
    assert.ok(Math.min(crests.length, hollows.length) > 20)
    assert.ok(
      mean(crests) > mean(hollows) + 4,
      `${course} knee angles ${mean(crests)} and ${mean(hollows)}`,
    )
  }
})

test('landing on a bank absorbs the normal velocity and carries the tangential velocity into the next turn', () => {
  const setup = {
    ...defaultSetup,
    course: 'gully' as const,
    technique: 'straightAir' as const,
  }
  const c = courses.gully,
    gates = buildGates(c)
  const f = Object.assign(emptyFrame(setup), {
    d: 73,
    x: gullyCenter(73) + 8,
    speed: 8,
    heading: 0.12,
  })
  for (let n = 0; n < 150 && f.air.phase !== 'landing'; n++)
    step(f, { ...neutralInput, jump: n < 38 }, setup, gates, 1 / 60)
  assert.equal(f.air.phase, 'landing')
  const pitch = pitchAt(c, f.d, f.x),
    bank = bankAt(c, f.d, f.x, pitch),
    axes = slopeAxes(pitch, bank, 0)
  assert.ok(Math.abs(bank) > 4 * radians)
  const incoming: Point3 = [f.air.vx, f.air.vy, f.air.vz]
  closeTo(f.air.impact, -dot(incoming, axes.normal))
  closeTo(f.speed * Math.cos(f.heading), dot(incoming, axes.forward))
  closeTo(f.speed * Math.sin(f.heading), dot(incoming, axes.side))
})

test('ski and snowboard reference runs clear every gate on each new course and snow surface', () => {
  for (const course of terrain)
    for (const surface of ['groomed', 'ice', 'powder'] as const)
      for (const technique of ['parallel', 'short', 'boardCarve'] as const) {
        const setup = { course, surface, technique },
          gates = buildGates(courses[course]),
          f = emptyFrame(setup)
        for (let i = 0; !f.done && i < 60 * 120; i++)
          step(f, demonstrationInput(f, setup, gates), setup, gates, 1 / 60)
        assert.ok(f.done, `${course} ${surface} ${technique}`)
        assert.equal(
          f.gatesHit,
          gates.length,
          `${course} ${surface} ${technique}`,
        )
      }
})
