import assert from 'node:assert/strict'
import test from 'node:test'
import { Euler, Vector3 } from 'three'
import {
  add3,
  analyse,
  cross,
  diff,
  dot,
  idealTurn,
  magnitude,
  riderPose,
  riderVector,
  unit,
  type Point3,
} from '../src/analysis.ts'
import { bodyHeading } from '../src/air.ts'
import { defaultSetup, type Setup } from '../src/course.ts'
import { loadDrawing, loadTargets, pickLoad } from '../src/loadDrawing.ts'
import {
  aboutJoint,
  defaultLoad,
  loadFocus,
  loadComponents,
  loadParts,
  loadPath,
  loadReading,
} from '../src/loadPath.ts'
import { muscleWork } from '../src/muscles.ts'
import { radians, type Frame } from '../src/physics.ts'
import { safetyReplay } from '../src/safetyReplay.ts'
import { trickReplay } from '../src/trickReplay.ts'
const near = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-7, `${a} vs ${b}`)
const same = (a: Point3, b: Point3) => a.forEach((v, i) => near(v, b[i]))
const model = (f: Frame, s: Setup) =>
  loadPath(f, s, riderPose(f, s), analyse(f, s))

test('external moment uses the perpendicular lever, its right-hand direction and a zero force limit', () => {
  const joint: Point3 = [0, 0, 0]
  const sample = aboutJoint(joint, [0, 3, 0.2], [0, 100, 0])
  near(sample.nm, 20)
  same(sample.torque, [-20, 0, 0])
  same(sample.foot, [0, 0, 0.2])
  near(sample.metres, 0.2)
  near(aboutJoint(joint, [0, 3, 0], [0, 100, 0]).nm, 0)
  near(aboutJoint(joint, [0, 3, 0.2], [0, 0, 0]).metres, 0)
})
test('both boot branches and direct body support reconstruct the full snow force and its moment at the waist', () => {
  const fall: Setup = { ...defaultSetup, technique: 'boardFall' },
    turn: Setup = { ...defaultSetup, course: 'gully', technique: 'carve' }
  const fallen = safetyReplay(fall).find((f) => (f.safety?.fall ?? 0) > 0.95)!
  const turning = idealTurn(turn, 43, 34)
  turning.bank = 12
  turning.heading = 0.26
  turning.forceHeading = 0.247
  for (const [s, f] of [
    [fall, fallen],
    [turn, turning],
  ] as const) {
    const m = model(f, s),
      a = analyse(f, s),
      p = riderPose(f, s)
    same(add3(add3(m.feet[0].force, m.feet[1].force), m.bodyForce), m.reaction)
    same(add3(m.reaction, m.opposing), [0, 0, 0])
    const rotation = new Euler(
      -f.pitch * radians,
      -f.heading - f.boardYaw - bodyHeading(f),
      f.bank * radians,
      'XZY',
    )
    const world = new Vector3(...riderVector(f, a.reaction)).applyEuler(
      rotation,
    )
    same(world.toArray(), a.reaction)
    let moments = cross(diff(p.bodyContact, m.waist), m.bodyForce)
    const muscle = muscleWork(f, s, p, a)
    m.feet.forEach((foot, i) => {
      moments = add3(
        moments,
        cross(diff(foot.leg.contact, m.waist), foot.force),
      )
      near(foot.loadN, Math.hypot(foot.soleNormal, foot.soleShear))
      near(foot.loadN, Math.hypot(foot.shinAxial, foot.shinShear))
      const axis = unit(
        cross(
          diff(foot.leg.knee, foot.leg.ankle),
          diff(foot.leg.hip, foot.leg.knee),
        ),
      )
      near(Math.abs(dot(foot.knee.torque, axis)), muscle.limbs[i].kneeMoment)
    })
    same(m.waistMoment.torque, moments)
    near(m.waistMoment.metres * a.reactionN, m.waistMoment.nm)
    if (f.safety) assert.ok(magnitude(m.bodyForce) > 0.5 * a.reactionN)
  }
})
test('resolving a load about the snow, sole, shin, thigh or trunk reconstructs its force vector', () => {
  const setup: Setup = {
    ...defaultSetup,
    technique: 'boardCarve',
    course: 'gully',
  }
  const f = idealTurn(setup, 43, 35)
  f.bank = -12
  const m = model(f, setup)
  for (const part of loadParts) {
    const selection = { ...defaultLoad, part, components: true },
      c = loadComponents(m, selection)
    same(
      add3(c.along, c.across),
      loadFocus(m, selection).moment?.force ?? m.reaction,
    )
    near(dot(c.along, c.across), 0)
    if (part === 'snow') {
      near(c.signed, m.a.normalN)
      near(c.transverse, Math.hypot(m.a.frictionN, m.a.lateralN))
    }
    if (part === 'upper') assert.ok(c.signed < 0)
    const drawing = loadDrawing(m, selection)
    assert.ok(
      drawing.heads.length <= 4 &&
        drawing.nodes.length <= 16 &&
        drawing.lines.length <= 48,
    )
  }
})

test('tucking moves the upper-body mass and changes its weight moment at matched speed, edge angle and snow force', () => {
  for (const technique of ['carve', 'boardCarve'] as const) {
    const s = { ...defaultSetup, technique },
      f = idealTurn(s, 32, 30),
      neutral = model(f, s),
      tucked = model({ ...f, tuck: 1 }, s)
    near(neutral.torso.mass, 45.21)
    near(
      magnitude(neutral.weightMoment.force),
      magnitude(tucked.weightMoment.force),
    )
    same(neutral.reaction, tucked.reaction)
    assert.ok(Math.abs(neutral.weightMoment.nm - tucked.weightMoment.nm) > 10)
    assert.ok(neutral.torso.point[2] !== tucked.torso.point[2])
    near(
      tucked.weightMoment.nm,
      tucked.weightMoment.metres * magnitude(tucked.weightMoment.force),
    )
  }
})
test('flight releases every snow-force branch and moment while weight persists, and landing restores contact', () => {
  const s: Setup = { ...defaultSetup, technique: 'boardIndy' },
    replay = trickReplay(s),
    air = model(
      replay.find((f) => f.air.phase === 'flight' && f.air.height > 0.2)!,
      s,
    ),
    land = model(replay.find((f) => f.air.phase === 'landing')!, s)
  assert.ok(air.surfacePoint[1] < 0)
  near(magnitude(air.reaction), 0)
  near(air.waistMoment.nm, 0)
  assert.ok(magnitude(air.weightMoment.force) > 400)
  for (const part of loadParts) {
    const select = { ...defaultLoad, part },
      focus = loadFocus(air, select),
      drawing = loadDrawing(air, select)
    if (part !== 'upper') {
      near(focus.moment?.nm ?? 0, 0)
      assert.equal(drawing.heads.length, 0)
    }
    assert.ok(drawing.nodes.every((n) => n.point.every(Number.isFinite)))
    assert.equal(loadReading(air, select).metrics.length, 3)
  }
  assert.ok(land.feet.every((foot) => foot.loadN > 0))
  assert.ok(land.a.normalN > land.a.weightN)
  assert.equal(
    loadDrawing(land, { ...defaultLoad, part: 'snow' }).heads.length,
    2,
  )
})
test('load focus follows the weighted foot and body picking uses the closest visible landmark', () => {
  const s: Setup = { ...defaultSetup, technique: 'carve' },
    a = model(idealTurn(s, 36, 29, 0), s),
    b = model(idealTurn(s, 36, 29, Math.PI), s)
  assert.notEqual(loadFocus(a, defaultLoad).i, loadFocus(b, defaultLoad).i)
  const board: Setup = { ...s, technique: 'boardCarve', stance: 'switch' },
    m = model(idealTurn(board, 36, 29), board)
  assert.match(m.feet[1].label, /leading/)
  assert.match(m.feet[0].label, /trailing/)
  const targets = loadTargets(a, (p) => ({
      x: p[0] * 0.45 + 0.5,
      y: 0.96 - p[1] * 0.75,
      visible: true,
    })),
    knee = targets.find((t) => t.part === 'knee' && t.side === 'right')!,
    rect = { left: 4, top: 11, width: 1100, height: 720 }
  assert.deepEqual(
    pickLoad(
      targets,
      rect,
      rect.left + knee.screen.x * rect.width,
      rect.top + knee.screen.y * rect.height,
      defaultLoad,
    ),
    { part: 'knee', side: 'right' },
  )
  assert.equal(pickLoad(targets, rect, -40, -50, defaultLoad), defaultLoad)
})
