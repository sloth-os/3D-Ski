import assert from 'node:assert/strict'
import test from 'node:test'
import { bodyHeading, trickPhase } from '../src/air.ts'
import {
  analyse,
  deckPoint,
  gravity,
  riderMass,
  riderPose,
} from '../src/analysis.ts'
import { cameraShot, type ViewOptions } from '../src/cameras.ts'
import {
  courses,
  surfaces,
  defaultSetup,
  type CourseId,
  type Setup,
  type SurfaceId,
} from '../src/course.ts'
import {
  emptyFrame,
  neutralInput,
  step,
  summarize,
  worldHeight,
  type Frame,
  type Input,
} from '../src/physics.ts'
import { trickReplay } from '../src/trickReplay.ts'
import { tricks, type TrickId } from '../src/tricks.ts'

const tick = 1 / 60
const setupFor = (technique: TrickId): Setup => ({ ...defaultSetup, technique })
const near = (a: number, b: number, tolerance = 1e-8) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`)

function jump(
  id: TrickId,
  f = emptyFrame(),
  chargeFrames = 39,
  steer = 0,
  pose: (frame: Frame) => boolean = () => false,
) {
  const setup = setupFor(id)
  if (f.air.phase === 'landing') {
    for (let i = 0; i < 20; i++) step(f, neutralInput, setup, [], tick)
  }
  for (let i = 0; i < chargeFrames; i++)
    step(f, { ...neutralInput, jump: true }, setup, [], tick)
  step(f, { ...neutralInput, steer }, setup, [], tick)
  assert.equal(f.air.phase, 'flight')
  for (let i = 0; i < 100 && f.air.phase === 'flight'; i++) {
    step(f, { ...neutralInput, pose: pose(f) }, setup, [], tick)
  }
  assert.equal(f.air.phase, 'landing')
  return f
}

test('all 72 course and snow combinations replay a complete scored freestyle jump', () => {
  for (const technique of Object.keys(tricks) as TrickId[]) {
    for (const course of Object.keys(courses) as CourseId[]) {
      for (const surface of Object.keys(surfaces) as SurfaceId[]) {
        const setup = { technique, course, surface }
        const frames = trickReplay(setup),
          end = frames.at(-1)!
        const phases = frames
          .map(trickPhase)
          .filter((phase, i, all) => phase !== all[i - 1])
        assert.deepEqual(phases, [
          'Approach',
          'Takeoff',
          'Maneuver',
          'Landing',
          'Approach',
        ])
        assert.equal(
          end.air.result,
          'Clean landing',
          technique + ' ' + course + ' ' + surface,
        )
        assert.equal(end.air.attempts, 1)
        assert.equal(end.air.landed, 1)
        assert.equal(end.air.points, tricks[technique].points)
        assert.equal(end.air.switch, technique === 'spin180')
        const touchdown = frames.find((s) => s.air.phase === 'landing')!
        assert.ok(touchdown.normalAccel > gravity)
        near(
          touchdown.air.worldY,
          worldHeight(courses[course], touchdown.d, touchdown.x),
          0.001,
        )
        assert.equal(end.air.height, 0)
        assert.equal(new Set(frames.map((s) => s.air)).size, frames.length)
      }
    }
  }
})

test('modeled airborne forces reproduce the flight velocity and release both ski contacts', () => {
  const setup = setupFor('spin360'),
    frames = trickReplay(setup)
  const i = frames.findIndex(
    (f) => f.air.phase === 'flight' && f.air.elapsed > 0.15,
  )
  const f = frames[i],
    last = frames[i - 1],
    a = analyse(f, setup)
  assert.equal(a.area, 0)
  assert.equal(a.pressureKpa, 0)
  assert.equal(a.reactionN, 0)
  assert.equal(a.frictionN, 0)
  assert.equal(a.lateralN, 0)
  assert.deepEqual(a.contacts, [0, 0])
  for (const [axis, v] of (['vx', 'vy', 'vz'] as const).entries()) {
    near((f.air[v] - last.air[v]) / tick, a.net[axis] / riderMass)
  }
  near(f.air.worldY, worldHeight(courses.ridge, f.d, f.x) + f.air.height)
  assert.ok(riderPose(f, setup).comHeight > f.air.height + 0.65)
  const landed = analyse(frames.find((s) => s.air.phase === 'landing')!, setup)
  assert.ok(landed.contacts.every((n) => n > 0) && landed.pressureKpa > 0)
})

test('ollies and nollies preload opposite ski ends and support points', () => {
  for (const [id, sign] of [
    ['ollie', 1],
    ['nollie', -1],
  ] as const) {
    const setup = setupFor(id),
      frames = trickReplay(setup)
    const preload = frames.find(
      (f) => f.air.phase === 'load' && f.air.charge === 1,
    )!
    const pose = riderPose(preload, setup)
    const flat = analyse(preload, { ...setup, technique: 'straightAir' }),
      loaded = analyse(preload, setup)
    near(loaded.area, flat.area * 0.25)
    near(loaded.pressureKpa, flat.pressureKpa * 4)
    for (const leg of pose.legs) {
      const tip = deckPoint(leg.deck, [0, 0, -0.85]),
        tail = deckPoint(leg.deck, [0, 0, 0.85])
      assert.ok(sign * (tip[1] - tail[1]) > 0.45)
      assert.ok(Math.min(tip[1], tail[1]) < 0.04)
      assert.ok(sign * leg.contact[2] > 0.7)
    }
    const airborne = frames.find(
      (s) => s.air.phase === 'flight' && s.air.elapsed > s.air.duration * 0.48,
    )!
    near(riderPose(airborne, setup).legs[0].deck.pitch, 0)
  }
})

test('grabs use the requested hand and ski, and a shifty counter-rotates without net spin', () => {
  for (const id of ['safetyGrab', 'muteGrab', 'shifty'] as const) {
    const setup = setupFor(id),
      f = trickReplay(setup).find((s) => s.air.pose === 1)!
    const p = riderPose(f, setup)
    assert.equal(f.air.spin, 0)
    if (id === 'shifty') {
      assert.ok(p.yaw > 0 && p.hipYaw < 0 && p.legs[0].deck.yaw < 0)
      continue
    }
    assert.equal(p.grab!.weight, 1)
    assert.equal(p.grab!.hand, id === 'muteGrab' ? -1 : 1)
    assert.deepEqual(
      p.grab!.point,
      deckPoint(p.legs[1].deck, [0.059, 0.014, -0.235]),
    )
    const [left, right] = p.legs.map((l) => deckPoint(l.deck, [0, 0, -0.8]))
    assert.ok(right[1] > left[1])
    assert.equal(right[0] < left[0], id === 'muteGrab')
  }
})

test('short pops, missed or unreleased poses and incomplete rotations give distinct feedback', () => {
  for (const [frame, outcome] of [
    [jump('straightAir', emptyFrame(), 2), 'Short pop'],
    [jump('safetyGrab'), 'Pose missed'],
    [jump('shifty', emptyFrame(), 39, 0, () => true), 'Late release'],
    [jump('muteGrab', emptyFrame(), 39, 0, () => true), 'Late release'],
    [jump('spin360', emptyFrame(), 39, 0), 'Under-rotated'],
    [jump('spin180', emptyFrame(), 2, -1), 'Under-rotated'],
  ] as const) {
    assert.equal(frame.air.result, outcome)
    assert.equal(frame.air.award, 0)
    assert.equal(frame.air.landed, 0)
  }
  const success = jump(
    'safetyGrab',
    emptyFrame(),
    39,
    0,
    (f) => f.air.elapsed < f.air.duration * 0.62,
  )
  assert.equal(success.air.landed, 1)
  const setup = setupFor('safetyGrab')
  for (let i = 0; i < 100; i++) step(success, neutralInput, setup, [], tick)
  assert.equal(success.points, tricks.safetyGrab.points)
  assert.equal(
    summarize(success, setup).freestyle!.points,
    tricks.safetyGrab.points,
  )
  for (let i = 0; i < 38; i++)
    step(success, { ...neutralInput, jump: true }, setup, [], tick)
  step(success, neutralInput, setup, [], tick)
  assert.equal(summarize(success, setup).quality, 50)
})

test('a pair of half turns links switch to forward and a full turn works in either direction', () => {
  const f = jump('spin180', emptyFrame(), 39, 1)
  assert.equal(f.air.switch, true)
  assert.ok(f.air.spin > 0)
  const next = jump('spin180', f, 39, -1)
  assert.equal(next.air.startSwitch, true)
  assert.equal(next.air.switch, false)
  assert.equal(next.air.landed, 2)
  assert.equal(next.air.points, 380)
  for (const direction of [-1, 1]) {
    const spin = jump('spin360', emptyFrame(), 39, direction)
    assert.equal(spin.air.switch, false)
    assert.equal(spin.air.result, 'Clean landing')
    near(spin.air.spin, 2 * Math.PI * direction, 0.46)
  }
})

test('the helmet follows a spinning skier and reduced motion keeps the look along the run', () => {
  const f = trickReplay(setupFor('spin360')).find(
    (s) => s.air.spin > Math.PI * 0.95,
  )!
  assert.ok(bodyHeading(f) > Math.PI * 0.95)
  const options: ViewOptions = {
    camera: 'first',
    line: false,
    forces: false,
    lens: 'body',
    orbit: 0,
    tilt: 0,
    zoom: 1,
    preview: false,
    reduced: false,
  }
  const rotating = cameraShot(f, courses.ridge, options),
    steady = cameraShot(f, courses.ridge, { ...options, reduced: true })
  assert.ok(rotating.target[2] > rotating.eye[2])
  assert.ok(steady.target[2] < steady.eye[2] - 10)
})

test('a fast approach over a falling-away slope can over-rotate a full-charge 360', () => {
  const f = emptyFrame(),
    setup: Setup = { technique: 'spin360', course: 'bowl', surface: 'ice' }
  f.d = 30
  f.speed = 24
  for (let i = 0; i < 120 && !f.air.result; i++) {
    step(
      f,
      { ...neutralInput, jump: i < 36, steer: i === 36 ? 1 : 0 },
      setup,
      [],
      tick,
    )
  }
  assert.equal(f.air.result, 'Over-rotated')
  assert.ok(f.air.spin > 2 * Math.PI + 0.46)
  assert.equal(f.air.points, 0)
})

test('ordinary ski and snowboard runs accept their existing controls and log format', () => {
  for (const technique of ['parallel', 'boardCarve'] as const) {
    const setup = { ...defaultSetup, technique },
      f = emptyFrame(),
      comparison = emptyFrame()
    for (let i = 0; i < 100; i++) {
      const input: Input = {
        ...neutralInput,
        steer: 0.3,
        jump: i < 43,
        pose: true,
      }
      step(f, input, setup, [], tick)
      step(comparison, { ...neutralInput, steer: 0.3 }, setup, [], tick)
    }
    assert.deepEqual(f, comparison)
    assert.equal(summarize(f, setup).freestyle, undefined)
  }
})
