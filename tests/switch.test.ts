import assert from 'node:assert/strict'
import test from 'node:test'
import { bodyHeading, shoulderLook } from '../src/air.ts'
import {
  analyse,
  deckPoint,
  idealTurn,
  riderPose,
  type Point3,
} from '../src/analysis.ts'
import { cameraShot, type ViewOptions } from '../src/cameras.ts'
import {
  collectionFor,
  courses,
  defaultSetup,
  equipmentFor,
  isSetup,
  lessonInCollection,
  startsSwitch,
  type Setup,
} from '../src/course.ts'
import {
  buildGates,
  demonstrationInput,
  emptyFrame,
  neutralInput,
  radians,
  referenceFrame,
  sample,
  step,
  summarize,
} from '../src/physics.ts'
import { trickReplay } from '../src/trickReplay.ts'
import { requiredSpin } from '../src/tricks.ts'

const tick = 1 / 60
const close = (a: number, b: number, tol = 1e-7) =>
  assert.ok(Math.abs(a - b) < tol, `${a} differs from ${b}`)
const distance = (p: Point3, q: Point3) =>
  Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])

test('switch lessons, saved starting stances and incoming equipment choose the right collection', () => {
  assert.equal(collectionFor('skiSwitch'), 'switch-riding')
  assert.equal(collectionFor('boardSwitch'), 'switch-riding')
  assert.equal(collectionFor('boardNoseGrab'), 'snowboard-tricks')
  assert.equal(collectionFor('ollie'), 'ski-tricks')
  assert.equal(lessonInCollection('switch-riding', 'boardIndy'), 'boardSwitch')
  assert.equal(lessonInCollection('switch-riding', 'parallel'), 'skiSwitch')
  assert.equal(equipmentFor('boardIndy'), 'snowboard')
  assert.ok(isSetup(defaultSetup))
  assert.ok(
    isSetup({ ...defaultSetup, technique: 'boardSwitch', stance: 'switch' }),
  )
  assert.equal(isSetup({ ...defaultSetup, stance: 'other' }), false)
  assert.equal(startsSwitch(defaultSetup), false)
  assert.equal(summarize(emptyFrame(), defaultSetup).switchRide, undefined)
})

test('a surface pivot turns the equipment smoothly while the rider keeps moving downhill', () => {
  for (const technique of ['parallel', 'boardCarve'] as const) {
    const setup = { ...defaultSetup, technique },
      f = emptyFrame(setup)
    f.speed = 7
    const headings: number[] = []
    const before = { ...f }
    for (let i = 0; i < 75; i++) {
      const prior = f.d
      step(f, { ...neutralInput, pivot: true }, setup, [], tick)
      assert.ok(f.d > prior)
      close(f.heading, 0)
      headings.push(bodyHeading(f))
      assert.equal(f.air.attempts, 0)
    }
    assert.equal(before.air.switch, false)
    assert.ok(headings.some((y) => y > 1 && y < 2))
    assert.ok(
      headings.every((h, i) => !i || Math.abs(h - headings[i - 1]) < 0.12),
    )
    assert.equal(f.air.switch, true)
    assert.equal(f.air.phase, 'ready')
    assert.equal(f.points, 0)
    const switchMetres = f.switchDistance
    assert.ok(switchMetres > 0 && switchMetres < f.d)
    step(f, neutralInput, setup, [], tick)
    step(f, { ...neutralInput, pivot: true, steer: -1 }, setup, [], tick)
    for (let i = 0; i < 100; i++) step(f, neutralInput, setup, [], tick)
    assert.equal(f.air.switch, false)
    close(bodyHeading(f), 0)
    assert.ok(f.switchDistance - switchMetres < 0.4)
  }
})

test('ski and board switch reference riders clear gates and record grounded switch distance and linked turns', () => {
  for (const technique of ['skiSwitch', 'boardSwitch'] as const) {
    const setup = { ...defaultSetup, technique },
      f = emptyFrame(setup),
      gates = buildGates(courses.ridge)
    assert.ok(f.air.switch && referenceFrame(setup).air.switch)
    for (let i = 0; i < 16000 && !f.done; i++)
      step(f, demonstrationInput(f, setup, gates), setup, gates, tick)
    assert.ok(f.done && f.air.switch)
    close(f.switchDistance, courses.ridge.length)
    assert.equal(f.switchGates, gates.length)
    assert.ok(f.switchTurns >= gates.length - 2)
    assert.deepEqual(summarize(f, setup).switchRide, {
      distance: courses.ridge.length,
      turns: f.turns,
      gates: gates.length,
    })
  }
})

test('the switch ski pose changes shoulder and foot stagger across turns, with pressure on the anatomical outside ski', () => {
  const setup: Setup = { ...defaultSetup, technique: 'skiSwitch' }
  for (const side of [-1, 1]) {
    const f = idealTurn(setup, side * 35, 25),
      p = riderPose(f, setup),
      a = analyse(f, setup)
    close(bodyHeading(f), Math.PI)
    assert.equal(Math.sign(f.lateralAccel), side)
    assert.equal(Math.sign(p.lean), -side)
    assert.ok(shoulderLook(f) * side < -1.6)
    assert.ok((p.legs[1].ankle[2] - p.legs[0].ankle[2]) * side < 0)
    assert.equal(a.edgeName, side === 1 ? 'Right ski' : 'Left ski')
    assert.ok(a.contacts[p.outside] > a.contacts[1 - p.outside])
  }
  const flat = idealTurn(setup, 0, 25)
  close(flat.lateralAccel, 0)
  assert.equal(flat.radius, Infinity)
})

test('switch board riding mirrors edge engagement and pressure while both feet stay fixed on one deck', () => {
  const setup: Setup = { ...defaultSetup, technique: 'boardCarve' }
  for (const side of [-1, 1]) {
    const normal = idealTurn(setup, side * 34, 28, 0, false),
      switched = idealTurn(setup, side * 34, 28, 0, true)
    const a = analyse(normal, setup),
      b = analyse(switched, setup),
      p = riderPose(switched, setup)
    assert.equal(a.edgeName, side > 0 ? 'Toe edge' : 'Heel edge')
    assert.equal(b.edgeName, side > 0 ? 'Heel edge' : 'Toe edge')
    close(b.firstShare, 1 - a.firstShare)
    close(sample(switched, setup).load, 100 * b.firstShare)
    close(distance(p.legs[0].ankle, p.legs[1].ankle), 0.56)
    const opt: ViewOptions = {
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
    const shot = cameraShot(switched, courses.ridge, opt, true)
    assert.ok(shot.target[2] < shot.eye[2])
  }
})

test('Indy, melon and nose grabs meet their deck contact with the correct hand in each stance', () => {
  for (const stance of ['forward', 'switch'] as const) {
    const lead = stance === 'switch' ? 1 : -1
    for (const technique of [
      'boardIndy',
      'boardMelon',
      'boardNoseGrab',
    ] as const) {
      const setup = { ...defaultSetup, technique, stance },
        frames = trickReplay(setup)
      const f = frames.find((s) => s.air.pose === 1)!,
        p = riderPose(f, setup),
        deck = p.legs[0].deck
      assert.ok(p.grab?.engaged)
      close(distance(p.grab.shoulder, p.grab.elbow), 0.35)
      close(distance(p.grab.elbow, p.grab.point), 0.35)
      const aboveDeck = deckPoint(deck, [0, 1, 0]).map(
        (v, i) => v - deck.origin[i],
      )
      for (const leg of p.legs) {
        close(distance(leg.hip, leg.knee), 0.452)
        close(distance(leg.knee, leg.ankle), 0.425)
        assert.ok(
          leg.knee.reduce(
            (h, v, i) => h + (v - deck.origin[i]) * aboveDeck[i],
            0,
          ) > 0.07,
        )
      }
      assert.equal(p.legs[1].deck, deck)
      close(distance(p.legs[0].ankle, p.legs[1].ankle), 0.56)
      assert.equal(p.grab.hand, technique === 'boardIndy' ? -lead : lead)
      const point: Point3 =
        technique === 'boardIndy'
          ? [0.116, 0.009, -lead * 0.155]
          : technique === 'boardMelon'
            ? [-0.116, 0.009, lead * 0.155]
            : stance === 'switch'
              ? [0, 0.052, 0.754]
              : [0, 0.078, -0.819]
      assert.deepEqual(p.grab.point, deckPoint(deck, point))
      assert.equal(sample(f, setup).load, 0)
      assert.equal(analyse(f, setup).normalN, 0)
      if (technique === 'boardNoseGrab')
        assert.ok(
          deckPoint(deck, [0, 0, lead * 0.74])[1] >
            deckPoint(deck, [0, 0, -lead * 0.74])[1] + 0.65,
        )
    }
  }
})

test('board ollies and nollies shift the binding loads, and the frontside shifty unwinds before landing', () => {
  for (const stance of ['forward', 'switch'] as const) {
    for (const technique of ['boardOllie', 'boardNollie'] as const) {
      const setup = { ...defaultSetup, technique, stance },
        frames = trickReplay(setup)
      const f = frames.find(
          (x) => x.air.phase === 'load' && x.air.charge === 1,
        )!,
        p = riderPose(f, setup),
        a = analyse(f, setup)
      const towardNose = (technique === 'boardNollie') !== (stance === 'switch')
      assert.ok(towardNose ? a.firstShare > 0.75 : a.firstShare < 0.26)
      const [nose, tail] = [-0.76, 0.76].map(
        (z) => deckPoint(p.legs[0].deck, [0, 0, z])[1],
      )
      assert.ok(towardNose ? nose < tail : tail < nose)
      close(distance(p.legs[0].ankle, p.legs[1].ankle), 0.56)
    }
    const setup: Setup = { ...defaultSetup, stance, technique: 'boardShifty' },
      frames = trickReplay(setup)
    const airborne = frames.find((x) => x.air.pose === 1)!,
      p = riderPose(airborne, setup)
    const neutral = riderPose(
      { ...airborne, air: { ...airborne.air, pose: 0 } },
      setup,
    )
    assert.ok(p.legs[0].deck.yaw * (p.yaw - neutral.yaw) < 0)
    close(airborne.air.spin, 0)
    close(riderPose(frames.at(-1)!, setup).legs[0].deck.yaw, 0)
  }
})

test('frontside and backside spins have stance-specific directions and wrong-direction landings earn no trick points', () => {
  for (const stance of ['forward', 'switch'] as const) {
    for (const technique of [
      'boardFS180',
      'boardBS180',
      'boardFS360',
    ] as const) {
      const setup = { ...defaultSetup, technique, stance },
        end = trickReplay(setup).at(-1)!
      const correct =
        (technique === 'boardBS180' ? 1 : -1) * (stance === 'switch' ? -1 : 1)
      assert.equal(requiredSpin(technique, stance === 'switch'), correct)
      assert.equal(Math.sign(end.air.spin), correct)
      close(
        Math.abs(end.air.spin) / radians,
        technique === 'boardFS360' ? 360 : 180,
        8,
      )
      const f = emptyFrame(setup)
      for (let i = 0; i < 150 && !f.air.result; i++)
        step(
          f,
          {
            ...neutralInput,
            jump: i < 45,
            steer: i === 45 ? -correct : 0,
            pivot: i === 57,
          },
          setup,
          [],
          tick,
        )
      assert.equal(f.air.result, 'Opposite spin')
      assert.equal(f.air.points, 0)
      assert.equal(f.pivot, null)
      assert.equal(
        f.air.switch,
        (stance === 'switch') !== (technique !== 'boardFS360'),
      )
    }
  }
})
