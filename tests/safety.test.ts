import assert from 'node:assert/strict'
import test from 'node:test'
import {
  courses,
  surfaces,
  techniques,
  startsSwitch,
  isSetup,
  type CourseId,
  type SurfaceId,
  type Setup,
} from '../src/course.ts'
import {
  lessonsFor,
  sportFor,
  lessonPath,
  resolveLesson,
} from '../src/library.ts'
import { safetyReplay } from '../src/safetyReplay.ts'
import {
  safetyLessons,
  isFall,
  wedgeYaw,
  uphillLook,
  type SafetyId,
} from '../src/safety.ts'
import { emptyFrame, step, neutralInput, summarize } from '../src/physics.ts'
import { analyse, riderPose, transformPoint } from '../src/analysis.ts'

test('every lesson appears in one sport and its canonical and published links resolve', () => {
  const all = [...lessonsFor('skiing'), ...lessonsFor('snowboarding')]
  assert.equal(new Set(all).size, Object.keys(techniques).length)
  assert.equal(all.length, new Set(all).size)
  for (const id of all) {
    assert.equal(resolveLesson(lessonPath(id), 'boardCarve'), id)
    assert.ok(lessonPath(id).startsWith('#' + sportFor(id) + '/'))
  }
  for (const [hash, id] of [
    ['#ski-tricks/muteGrab', 'muteGrab'],
    ['#snowboard-tricks/boardIndy', 'boardIndy'],
    ['#switch-riding/skiSwitch', 'skiSwitch'],
    ['#switch-riding/boardSwitch', 'boardSwitch'],
    ['#technique-lab/boardCarve', 'boardCarve'],
  ] as const)
    assert.equal(resolveLesson(hash, 'parallel'), id)
  assert.equal(resolveLesson('#skiing/boardIndy', 'parallel'), 'parallel')
  assert.equal(resolveLesson('#run-log', 'parallel'), null)
  assert.ok(
    !isSetup({
      course: 'ridge',
      surface: 'ice',
      technique: 'boardStop',
      stopEdge: 'other',
    }),
  )
})

test('every safety drill comes to rest before its lane ends and checks uphill across courses and snow', () => {
  for (const id of Object.keys(safetyLessons) as SafetyId[])
    for (const course of Object.keys(courses) as CourseId[])
      for (const surface of Object.keys(surfaces) as SurfaceId[])
        for (const stopEdge of id === 'boardStop'
          ? (['heel', 'toe'] as const)
          : (['heel'] as const)) {
          const setup: Setup = {
              course,
              surface,
              technique: id,
              stopEdge,
              stance: 'switch',
            },
            frames = safetyReplay(setup),
            end = frames.at(-1)!,
            rest = frames.find((f) => f.safety?.phase === 'rest')!
          assert.ok(!startsSwitch(setup) && !end.air.switch)
          assert.equal(end.safety?.phase, 'checked')
          assert.ok(end.done && rest.speed === 0 && rest.d > 0 && rest.d < 18)
          assert.equal(end.d, rest.d)
          assert.equal(uphillLook(end), 1)
          assert.equal(end.points, 0)
          assert.ok(frames[0].safety !== end.safety)
          const result = summarize(end, setup)
          assert.ok(
            result.safety!.distance > 0 &&
              result.safety!.seconds > 0 &&
              result.safety!.speed > 0 &&
              result.finished,
          )
          if (isFall(id)) assert.ok(end.safety!.guarded)
          for (const f of [frames[0], rest, end]) {
            const a = analyse(f, setup)
            assert.ok(
              Math.abs(
                a.contacts[0] + a.contacts[1] + a.bodySupportN - a.normalN,
              ) < 1e-6,
            )
          }
          if (id === 'boardStop')
            assert.equal(
              analyse(rest, setup).edgeName,
              stopEdge === 'heel' ? 'Heel edge' : 'Toe edge',
            )
        }
})
test('ski wedge spreads the tails, keeps the tips apart and loads opposing inside edges', () => {
  const setup: Setup = {
      course: 'meadow',
      surface: 'groomed',
      technique: 'skiStop',
    },
    frames = safetyReplay(setup),
    rest = frames.find((f) => f.safety?.phase === 'rest')!,
    p = riderPose(rest, setup)
  const tips = p.legs.map((l) => transformPoint(l.deck, [0, 0, -0.91])[0]),
    tails = p.legs.map((l) => transformPoint(l.deck, [0, 0, 0.82])[0])
  assert.ok(
    tips[1] - tips[0] > 0.12 && tails[1] - tails[0] > tips[1] - tips[0] + 0.6,
  )
  assert.ok(p.legs[0].deck.roll < 0 && p.legs[1].deck.roll > 0)
  assert.equal(p.legs[1].deck.yaw, wedgeYaw(rest.brake))
  assert.equal(analyse(rest, setup).edgeName, 'Inside edges')
})
test('the fall lowers the hips, transfers load onto the body, and keeps a held early uphill check from ending a slide', () => {
  for (const technique of ['skiFall', 'boardFall'] as const) {
    const setup: Setup = { course: 'ridge', surface: 'groomed', technique },
      f = emptyFrame(setup)
    const upright = riderPose(f, setup)
    for (let i = 0; i < 400; i++)
      step(f, { ...neutralInput, check: true }, setup, [], 1 / 60)
    assert.equal(f.safety!.phase, 'rest')
    assert.equal(f.safety!.guarded, false)
    assert.equal(f.done, false)
    const down = riderPose(f, setup)
    assert.ok(down.base[1] < upright.base[1] - 0.48)
    assert.ok(analyse(f, setup).bodySupportN > 0.78 * analyse(f, setup).normalN)
    assert.ok(down.legs.every((l) => l.angle > 15))
    step(f, neutralInput, setup, [], 1 / 60)
    step(f, { ...neutralInput, check: true }, setup, [], 1 / 60)
    assert.equal(f.safety!.phase, 'checked')
  }
})
test('late braking misses the practice lane and demo and run scores remain distinct from freestyle', () => {
  const setup: Setup = {
      course: 'ridge',
      surface: 'ice',
      technique: 'skiStop',
    },
    f = emptyFrame(setup)
  for (let i = 0; i < 2000 && !f.done; i++)
    step(f, neutralInput, setup, [], 1 / 60)
  assert.equal(f.safety!.phase, 'missed')
  assert.equal(summarize(f, setup).finished, false)
  assert.equal(summarize(f, setup).freestyle, undefined)
  assert.equal(
    summarize(emptyFrame(), { ...setup, technique: 'parallel' }).safety,
    undefined,
  )
})
