import {
  add3,
  cross,
  diff,
  magnitude,
  scale3,
  unit,
  type Point3,
} from './analysis.ts'
import {
  loadColors as colors,
  loadFocus,
  loadComponents,
  type LoadPath,
  type LoadSelection,
} from './loadPath.ts'

type Stroke = { from: Point3; to: Point3; radius: number; color: string }
type Marker = { point: Point3; radius: number; color: string }
// Both renderers draw these same pose-local paths, force arrows, and right-hand moment arcs.
export function loadDrawing(m: LoadPath, s: LoadSelection) {
  const lines: Stroke[] = [],
    heads: Stroke[] = [],
    nodes: Marker[] = []
  const line = (from: Point3, to: Point3, radius: number, color: string) =>
    lines.push({ from, to, radius, color })
  function arrow(from: Point3, to: Point3, color: string, headLimit: number) {
    const delta = diff(to, from),
      size = magnitude(delta)
    if (size < 0.001) return
    const head = Math.min(headLimit, 0.35 * size),
      base = add3(to, scale3(delta, -head / size))
    line(from, base, Math.min(0.009, head * 0.18), color)
    heads.push({ from: base, to, radius: head * 0.34, color })
  }
  const { foot, i: active, moment, at } = loadFocus(m, s)
  m.feet.forEach((foot, i) => {
    const color =
      foot.share < 0.002 ? colors.idle : i ? colors.right : colors.left
    const points = [
      foot.leg.contact,
      foot.binding,
      foot.leg.ankle,
      foot.leg.knee,
      foot.leg.hip,
      m.p.base,
    ]
    if (foot.normalN > 0 && (s.part === 'snow' || s.part === 'equipment')) {
      const half = (m.board ? 0.25 : 0.55) * m.a.contactFraction,
        yaw = foot.leg.deck.yaw
      const edge: Point3 = [Math.sin(yaw) * half, 0, Math.cos(yaw) * half]
      line(
        diff(foot.leg.contact, edge),
        add3(foot.leg.contact, edge),
        0.009 + 0.011 * Math.sqrt(foot.share),
        color,
      )
    }
    const radius = 0.006 + 0.018 * Math.sqrt(foot.share)
    for (let j = m.airborne ? 2 : 1; j < points.length; j++)
      line(points[j - 1], points[j], radius, color)
    for (const point of points.slice(1, -1))
      nodes.push({ point, radius: radius * 1.45, color })
  })
  if (m.a.bodyShare > 0)
    line(
      m.p.bodyContact,
      m.p.base,
      0.009 + 0.019 * Math.sqrt(m.a.bodyShare),
      colors.body,
    )
  const trunkColor = m.airborne ? colors.idle : colors.arm
  line(m.p.base, m.waist, 0.018, trunkColor)
  line(m.waist, m.chest, 0.018, trunkColor)
  for (const arm of m.p.arms) line(m.chest, arm.shoulder, 0.011, trunkColor)
  const forceScale = 0.52 / m.a.weightN
  const pair = m.reaction
  if (s.part === 'snow') {
    arrow(at, add3(at, scale3(pair, forceScale)), colors.left, 0.09)
    arrow(at, add3(at, scale3(m.opposing, forceScale)), colors.body, 0.09)
  } else if (moment) {
    const color =
      s.part === 'upper'
        ? colors.body
        : s.part === 'waist'
          ? colors.left
          : active
            ? colors.right
            : colors.left
    arrow(
      moment.origin,
      add3(moment.origin, scale3(moment.force, forceScale)),
      color,
      0.09,
    )
    if (moment.nm > 0.1 && moment.metres > 0.001) {
      // Extend the force line to the perpendicular foot. Draw the actual shortest lever in white.
      line(moment.origin, moment.foot, 0.0035, color)
      line(moment.joint, moment.foot, 0.008, colors.arm)
      nodes.push({ point: moment.foot, radius: 0.014, color: colors.arm })
      const axis = unit(moment.torque),
        u = unit(moment.arm),
        v = cross(axis, u)
      const radius = 0.055 + 0.085 * Math.min(moment.nm / 120, 1)
      const arc = (theta: number) =>
        add3(
          moment.joint,
          add3(
            scale3(u, Math.cos(theta) * radius),
            scale3(v, Math.sin(theta) * radius),
          ),
        )
      let last = arc(0)
      for (let j = 1; j <= 9; j++) {
        const next = arc(j * 0.29)
        line(last, next, 0.008, colors.moment)
        last = next
      }
      arrow(last, arc(3.16), colors.moment, 0.042)
    }
  }
  if (s.components) {
    const c = loadComponents(m, s),
      corner = add3(c.origin, scale3(c.along, forceScale)),
      tip = add3(corner, scale3(c.across, forceScale))
    arrow(c.origin, corner, colors.along, 0.08)
    arrow(corner, tip, colors.across, 0.08)
  }
  nodes.push({ point: at, radius: 0.044, color: colors.moment })
  if (s.part === 'upper')
    nodes.push({ point: m.waist, radius: 0.031, color: colors.arm })
  const secondary =
    s.part === 'upper'
      ? m.waist
      : s.part === 'snow'
        ? add3(m.surfacePoint, scale3(m.opposing, forceScale))
        : (moment?.foot ?? foot.leg.contact)
  return { lines, heads, nodes, at, secondary }
}
export type LoadDrawing = ReturnType<typeof loadDrawing>

export type PickPoint = { x: number; y: number; visible: boolean }
export type LoadTarget = {
  part: LoadSelection['part']
  side: LoadSelection['side']
  screen: PickPoint
}
export function loadTargets(m: LoadPath, project: (p: Point3) => PickPoint) {
  const targets: LoadTarget[] = []
  const place = (
    part: LoadSelection['part'],
    point: Point3,
    side: LoadSelection['side'] = 'auto',
  ) => targets.push({ part, side, screen: project(point) })
  place('upper', m.torso.point)
  place('waist', m.waist)
  place('snow', m.surfacePoint)
  m.feet.forEach((foot, i) => {
    const side = i ? 'right' : 'left'
    place('hip', foot.leg.hip, side)
    place('knee', foot.leg.knee, side)
    place('boot', foot.leg.ankle, side)
    place('equipment', foot.binding, side)
  })
  return targets
}
export function pickLoad(
  targets: LoadTarget[],
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
  selection: LoadSelection,
) {
  let nearest: LoadTarget | undefined,
    range = 22
  for (const target of targets) {
    const { x, y, visible } = target.screen
    if (!visible) continue
    const distance = Math.hypot(
      rect.left + x * rect.width - clientX,
      rect.top + y * rect.height - clientY,
    )
    if (distance < range) {
      nearest = target
      range = distance
    }
  }
  return nearest
    ? {
        ...selection,
        part: nearest.part,
        side: nearest.side === 'auto' ? selection.side : nearest.side,
      }
    : selection
}
