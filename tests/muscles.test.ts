import assert from 'node:assert/strict'
import test from 'node:test'
import {
  analyse,
  idealTurn,
  magnitude,
  riderPose,
  type Point3,
} from '../src/analysis.ts'
import { pushProgress, pushSupport } from '../src/air.ts'
import { defaultSetup, type Setup } from '../src/course.ts'
import { muscleBands, muscleIds, muscleWork } from '../src/muscles.ts'
import { radians, type Frame } from '../src/physics.ts'
import { safetyReplay } from '../src/safetyReplay.ts'
import { trickReplay } from '../src/trickReplay.ts'
import { tricks } from '../src/tricks.ts'

const view = (f: Frame, s: Setup) =>
  muscleWork(f, s, riderPose(f, s), analyse(f, s))
const distance = (a: Point3, b: Point3) =>
  magnitude([a[0] - b[0], a[1] - b[1], a[2] - b[2]])

test('a grounded extension delivers the normal impulse before flight and the landing bends over multiple frames', () => {
  const s: Setup = { ...defaultSetup, technique: 'straightAir' },
    frames = trickReplay(s)
  const push = frames.filter((f) => pushProgress(f) > 0),
    start = push[0],
    end = push.at(-1)!
  assert.ok(
    push.length >= 8 &&
      push.every((f) => !f.air.height && analyse(f, s).normalN > 0),
  )
  const impulse = push.reduce((n, f) => n + pushSupport(f, s.technique) / 60, 0)
  assert.ok(Math.abs(impulse - 4.45 * Math.cos(end.pitch * radians)) < 0.06)
  assert.ok(
    riderPose(start, s).legs[0].angle - riderPose(end, s).legs[0].angle > 15,
  )
  assert.ok(riderPose(end, s).base[1] > riderPose(start, s).base[1])
  const flight = frames.filter((f) => f.air.phase === 'flight'),
    fall = frames.filter((f) => f.air.phase === 'landing')
  assert.ok(
    flight.every((f) => view(f, s).limbs.every((l) => l.kneeMoment === 0)),
  )
  assert.ok(Math.abs(fall[0].flex - flight.at(-1)!.flex) < 0.06)
  assert.ok(fall[6].flex > fall[0].flex && fall[12].flex > fall[6].flex)
  assert.ok(
    view(fall[0], s).limbs[0].levels.quads >
      view(flight.at(-1)!, s).limbs[0].levels.quads,
  )
  assert.equal(view(push[4], s).phase, 'Push-off')
  assert.equal(view(fall[3], s).phase, 'Landing absorption')
})

test('ski support changes sides and snowboard edges change the ankle muscle emphasis', () => {
  const s: Setup = { ...defaultSetup, technique: 'parallel' }
  const left = view(idealTurn(s, 40, 32), s),
    right = view(idealTurn(s, 40, 32, Math.PI), s)
  assert.ok(left.limbs[0].levels.quads > left.limbs[1].levels.quads)
  assert.ok(right.limbs[1].levels.quads > right.limbs[0].levels.quads)
  const board: Setup = { ...s, technique: 'boardCarve' }
  for (const switchStance of [false, true]) {
    for (const phase of [0, Math.PI]) {
      const f = idealTurn(board, 40, 32, phase, switchStance),
        w = view(f, board),
        toe = analyse(f, board).edgeName === 'Toe edge'
      assert.equal(w.primary, toe ? 'calves' : 'shins')
      assert.ok(
        w.limbs.every((l) =>
          toe
            ? l.levels.calves > l.levels.shins
            : l.levels.shins > l.levels.calves,
        ),
      )
    }
  }
  // For a vertical reaction, the sagittal moment is half the weight times the horizontal arm.
  const f = idealTurn(s, 0, 0)
  f.pitch = 0
  f.normalAccel = 9.81
  const pose = riderPose(f, s)
  const k = pose.legs[0].knee
  pose.legs[0].hip[0] = pose.legs[0].ankle[0] = k[0]
  pose.legs[0].contact = [k[0], 0, k[2] + 0.2]
  const moment = muscleWork(f, s, pose, analyse(f, s)).limbs[0].kneeMoment
  assert.ok(Math.abs(moment - 75 * 9.81 * 0.5 * 0.2) < 1e-6)
})

test('the reaching shoulder and animated hand follow the physical grab in regular and switch', () => {
  for (const stance of ['forward', 'switch'] as const) {
    const s: Setup = { ...defaultSetup, technique: 'boardIndy', stance }
    const f = trickReplay(s).find((f) => f.air.pose === 1)!,
      p = riderPose(f, s),
      w = view(f, s)
    const i = p.grab!.hand === 1 ? 1 : 0
    assert.equal(i, stance === 'forward' ? 1 : 0)
    assert.ok(distance(p.arms[i].hand, p.grab!.point) < 1e-9)
    assert.ok(
      w.limbs[i].levels.deltoids > w.limbs[1 - i].levels.deltoids &&
        w.limbs[i].levels.hipFlexors > 0.65,
    )
    assert.equal(w.primary, 'deltoids')
    const bands = muscleBands(p)
    assert.equal(bands.length, 2 * muscleIds.length)
    assert.ok(bands.every((b) => b.radius > 0 && distance(b.from, b.to) > 0.04))
  }
})

test('muscle demand stays finite for all trick replays and for falls with body support', () => {
  const ids = [
    ...Object.keys(tricks),
    'skiFall',
    'boardFall',
  ] as Setup['technique'][]
  for (const technique of ids) {
    const s: Setup = { ...defaultSetup, technique }
    const frames = technique.endsWith('Fall') ? safetyReplay(s) : trickReplay(s)
    for (const f of frames.filter((_, i) => i % 6 === 0)) {
      const w = view(f, s)
      for (const limb of w.limbs) {
        assert.ok(Number.isFinite(limb.kneeMoment) && limb.kneeMoment >= 0)
        assert.ok(Object.values(limb.levels).every((v) => v >= 0 && v <= 1))
      }
    }
    if (technique.endsWith('Fall')) {
      const f = frames.find((f) => f.safety?.phase === 'rest')!
      assert.ok(analyse(f, s).bodyShare > 0.7)
      assert.equal(view(f, s).phase, 'Resting on snow')
      const slide = frames.find((s) => s.safety?.phase === 'slide')!
      assert.equal(view(slide, s).phase, 'Supported slide')
    }
  }
})
