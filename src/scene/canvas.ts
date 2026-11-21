import {
  muscleWork,
  muscleBands,
  muscleCenter,
  effortColors,
  effortBand,
} from '../muscles.ts'
import { isSafety, laneLength } from '../safety.ts'
import { bodyHeading, boardHeadYaw, shoulderLook } from '../air.ts'
import { courses, equipmentFor, isSwitchDrill, type Setup } from '../course.ts'
import {
  cameraShot,
  travelArrow,
  isTrailhead,
  type ScreenPoint,
} from '../cameras.ts'
import {
  studyPoint,
  analyse,
  mixPoint,
  deckPoint,
  transformPoint,
  riderPose,
  add3,
  scale3,
  magnitude,
  lensColors,
  type Point3,
} from '../analysis.ts'
import {
  buildGates,
  lineAt,
  radians,
  worldHeight,
  type Frame,
} from '../physics.ts'
import type { MountainView } from '../mountain.ts'

const sub = (a: Point3, b: Point3) => add3(a, scale3(b, -1))
const unit = (a: Point3) => scale3(a, 1 / (magnitude(a) || 1))
const dot = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Point3, b: Point3): Point3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
export function canvasMountain(
  container: HTMLElement,
  setup: Setup,
  study = false,
  replay?: readonly Frame[],
): MountainView {
  const canvas = document.createElement('canvas'),
    ctx = canvas.getContext('2d')!,
    course = courses[setup.course],
    gates = buildGates(course),
    board = equipmentFor(setup.technique) === 'snowboard'
  canvas.dataset.renderer = 'canvas'
  container.appendChild(canvas)
  const tree = new Image()
  tree.src = import.meta.env.BASE_URL + 'images/spruce.webp'
  const pano = new Image()
  pano.src = import.meta.env.BASE_URL + 'images/glacier-bowl.webp'
  const at = (x: number, d: number, y = 0): Point3 => [
    x,
    worldHeight(course, d, x) + y,
    -d * Math.cos(course.pitch * radians),
  ]
  const arc = replay
    ?.filter((s) => s.air.phase === 'flight')
    .map((s) => at(s.x, s.d, s.air.height + 0.045))
  const tracks: (Point3 | null)[][] = board ? [[]] : [[], []]
  let lastDistance = -1
  return {
    draw(f, opt) {
      const w = container.clientWidth,
        h = container.clientHeight
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      ctx.clearRect(0, 0, w, h)
      const plate =
        !isSafety(setup.technique) &&
        isTrailhead(opt) &&
        setup.course === 'ridge'
      container.dataset.plate = plate ? 'on' : 'off'
      const shot = cameraShot(f, course, opt, board),
        pos = at(f.x, f.d),
        eye = add3(shot.eye, pos)
      const fw = unit(sub(shot.target, shot.eye)),
        right = unit(cross(fw, [0, 1, 0])),
        up = unit(cross(right, fw)),
        focal = (0.5 * h) / Math.tan((shot.fov * radians) / 2)
      function project(p: Point3) {
        const rel = sub(p, eye),
          depth = dot(rel, fw),
          k = focal / Math.max(0.04, depth)
        return {
          x: w / 2 + dot(rel, right) * k,
          y: h / 2 - dot(rel, up) * k,
          k,
          depth,
        }
      }
      function screen(p: Point3): ScreenPoint {
        const v = project(p)
        return {
          x: v.x / w,
          y: v.y / h,
          visible:
            v.depth > 0.05 && v.x > 3 && v.y > 3 && v.x < w - 3 && v.y < h - 3,
        }
      }
      function stroke(a: Point3, b: Point3, color: string, width: number) {
        const s = project(a),
          e = project(b)
        if (s.depth < 0.06 || e.depth < 0.06) return
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(e.x, e.y)
        ctx.lineWidth = Math.max(0.65, width * (s.k + e.k) * 0.5)
        ctx.strokeStyle = color
        ctx.lineCap = 'round'
        ctx.stroke()
      }
      function ball(p: Point3, r: number, color: string) {
        const v = project(p)
        if (v.depth < 0.07) return
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(v.x, v.y, r * v.k, 0, Math.PI * 2)
        ctx.fill()
      }
      const arrow = (p: Point3, force: Point3, color: string) => {
        if (magnitude(force) < 0.7) return p
        const end = add3(p, scale3(force, 1.39 / (75 * 9.81)))
        stroke(p, end, color, 0.012)
        const a = project(p),
          b = project(end)
        if (a.depth > 0.06 && b.depth > 0.06) {
          const angle = Math.atan2(b.y - a.y, b.x - a.x),
            length = Math.min(13, Math.hypot(b.x - a.x, b.y - a.y) * 0.35)
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.moveTo(b.x, b.y)
          for (const s of [-1, 1])
            ctx.lineTo(
              b.x - length * Math.cos(angle + s * 0.35),
              b.y - length * Math.sin(angle + s * 0.35),
            )
          ctx.fill()
        }
        return end
      }
      const pitch = (f.pitch || course.pitch) * radians,
        yaw = -f.heading - f.boardYaw - bodyHeading(f)
      function local(p: Point3): Point3 {
        const x = p[0] * Math.cos(yaw) + p[2] * Math.sin(yaw),
          z = -p[0] * Math.sin(yaw) + p[2] * Math.cos(yaw)
        return add3(pos, [
          x,
          p[1] * Math.cos(pitch) + z * Math.sin(pitch) + f.air.height,
          -p[1] * Math.sin(pitch) + z * Math.cos(pitch),
        ])
      }
      if (study) {
        ctx.fillStyle = '#243941'
        ctx.fillRect(0, 0, w, h)
        for (let i = -12; i <= 12; i++) {
          stroke(at(i * 0.25, f.d - 3), at(i * 0.25, f.d + 3), '#456169', 0.008)
          stroke(
            at(-3, f.d + i * 0.25),
            at(3, f.d + i * 0.25),
            '#456169',
            0.008,
          )
        }
      } else if (!plate) {
        ctx.fillStyle = '#91b8d5'
        ctx.fillRect(0, 0, w, h)
        if (pano.complete && pano.naturalWidth)
          ctx.drawImage(pano, 0, 0, w, h * 0.67)
        const normal: Point3 = [0, Math.cos(pitch), -Math.sin(pitch)]
        const horizon = (x: number) =>
          h * 0.5 +
          (focal * dot(normal, fw) + (x - w * 0.5) * dot(normal, right)) /
            Math.max(0.015, dot(normal, up))
        const grad = ctx.createLinearGradient(0, 0, 0, h)
        grad.addColorStop(0, '#d2e1e9')
        grad.addColorStop(1, setup.surface === 'ice' ? '#b5d1e0' : '#f5f2ed')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.moveTo(0, horizon(0))
        ctx.lineTo(w, horizon(w))
        ctx.lineTo(w, h)
        ctx.lineTo(0, h)
        ctx.fill()
        if (f.d < lastDistance) {
          lastDistance = -1
          tracks.forEach((track) => (track.length = 0))
        }
        if (f.d - lastDistance > 0.28) {
          tracks.forEach((track, i) => {
            const offset = board ? 0 : i ? 0.192 : -0.192
            track.push(
              f.air.phase === 'flight'
                ? null
                : at(
                    f.x + Math.cos(f.heading) * offset,
                    f.d - Math.sin(f.heading) * offset,
                    0.021,
                  ),
            )
            if (track.length > 280) track.shift()
          })
          lastDistance = f.d
        }
        tracks.forEach((track) => {
          for (let i = 1; i < track.length; i++) {
            const from = track[i - 1],
              to = track[i]
            if (from && to) stroke(from, to, '#90a7b473', board ? 0.15 : 0.046)
          }
        })
        const objects: { depth: number; draw: () => void }[] = []
        for (
          let d = Math.max(-32, Math.floor((f.d - 55) / 6) * 6);
          d < Math.min(course.length + 50, f.d + 190);
          d += 6
        ) {
          for (const s of [-1, 1]) {
            const x =
                s * (27 + Math.sin(d * 0.26) * 3 + Math.cos(d * 0.12) * 2),
              v = project(at(x, d))
            if (v.depth < 2 || v.x < -h || v.x > w + h) continue
            const height = (7 + 2 * Math.sin(d * 0.7)) * v.k
            objects.push({
              depth: v.depth,
              draw: () => {
                if (tree.complete && tree.naturalWidth)
                  ctx.drawImage(
                    tree,
                    v.x - height * 0.31,
                    v.y - height,
                    height * 0.62,
                    height,
                  )
              },
            })
          }
        }
        if (!isSafety(setup.technique))
          gates.forEach((g, i) => {
            for (const side of [-1, 1]) {
              const x = g.x + side * g.width,
                base = at(x, g.d),
                v = project(base)
              if (v.depth < 1) continue
              objects.push({
                depth: v.depth,
                draw: () => {
                  const col = i % 2 ? '#3774ac' : '#cf6249'
                  stroke(base, at(x, g.d, 2), col, 0.064)
                  stroke(
                    at(x, g.d, 1.63),
                    at(x + side * 1.01, g.d, 1.63),
                    col,
                    0.4,
                  )
                },
              })
            }
          })
        objects.sort((a, b) => b.depth - a.depth).forEach((o) => o.draw())
        if (isSafety(setup.technique)) {
          for (let i = -8; i < 8; i++)
            stroke(
              at(i / 2, laneLength, 0.065),
              at((i + 1) / 2, laneLength, 0.065),
              i % 2 ? '#173d43' : '#a6f0d6',
              0.24,
            )
        } else if (opt.line) {
          for (
            let d = Math.max(0, f.d - 5);
            d < Math.min(course.length, f.d + 135);
            d += 2.8
          )
            stroke(
              at(lineAt(gates, d), d, 0.038),
              at(lineAt(gates, d + 1.4), d + 1.4, 0.038),
              '#57a48c',
              0.052,
            )
        }
      }
      if (arc)
        for (let i = 1; i < arc.length; i += 2)
          stroke(arc[i - 1], arc[i], '#d2ef9a', 0.013)
      const p = riderPose(f, setup),
        a = analyse(f, setup),
        com = local(p.com)
      if (
        (isSwitchDrill(setup.technique) || f.air.switch || f.pivot) &&
        f.air.phase !== 'flight'
      ) {
        const mark = travelArrow.map(([x, y, z]) =>
          project(
            at(
              f.x + x * Math.cos(f.heading) - z * Math.sin(f.heading),
              f.d - x * Math.sin(f.heading) - z * Math.cos(f.heading),
              y,
            ),
          ),
        )
        if (mark.every((v) => v.depth > 0.06)) {
          ctx.fillStyle = '#65ded0'
          ctx.beginPath()
          mark.forEach((v, i) =>
            i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y),
          )
          ctx.closePath()
          ctx.fill()
        }
      }
      const shadow = project(pos)
      if (shadow.depth > 0.4 && opt.camera !== 'first') {
        ctx.fillStyle = '#42566940'
        ctx.beginPath()
        ctx.ellipse(
          shadow.x + shadow.k * 0.15,
          shadow.y,
          shadow.k * 0.43,
          shadow.k * 0.085,
          -0.16,
          0,
          Math.PI * 2,
        )
        ctx.fill()
      }
      for (const leg of p.legs) {
        if (board && leg.side === 1) continue
        const half = board ? 0.15 : 0.062
        const deck = (s: number, z: number, y = 0): Point3 =>
          local(deckPoint(leg.deck, [s * half, y, z]))
        const vertices = (ring: number[][], color: string) => {
          const points = ring.map(([x, z, y]) => project(deck(x, z, y)))
          if (points.some((q) => q.depth < 0.06)) return
          ctx.fillStyle = color
          ctx.beginPath()
          points.forEach((q, i) =>
            i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y),
          )
          ctx.closePath()
          ctx.fill()
        }
        const len = board ? 0.82 : 0.93
        vertices(
          [
            [0, -len, 0.09],
            [1, -len * 0.88, 0.045],
            [0.75, 0, 0],
            [1, len * 0.8, 0.02],
            [0.4, len * 0.95, 0.047],
            [-0.4, len * 0.95, 0.047],
            [-1, len * 0.8, 0.02],
            [-0.75, 0, 0],
            [-1, -len * 0.88, 0.045],
          ],
          '#24373b',
        )
        vertices(
          [
            [0, -len, 0.092],
            [1, -len * 0.88, 0.047],
            [0.92, -len * 0.65, 0.01],
            [-0.95, -len * 0.52, 0.008],
            [-1, -len * 0.88, 0.047],
          ],
          '#d0ee99',
        )
        stroke(
          deck(-0.83, len * 0.63, 0.017),
          deck(0.85, len * 0.54, 0.014),
          '#bbda93',
          0.032,
        )
      }
      const anatomy =
        opt.forces && opt.lens === 'muscles' && opt.camera !== 'first'
      const torso = (v: Point3) => local(transformPoint(p.torso, v))
      if (opt.camera !== 'first') {
        for (const l of p.legs) {
          stroke(local(l.hip), local(l.knee), '#273744', anatomy ? 0.12 : 0.212)
          stroke(local(l.knee), local(l.ankle), '#23313c', anatomy ? 0.1 : 0.17)
          ball(local(l.ankle), 0.081, '#24333b')
          if (board)
            stroke(
              local(deckPoint(l.deck, [-0.1, 0.058, l.side * 0.28])),
              local(deckPoint(l.deck, [0.15, 0.058, l.side * 0.28])),
              '#28363c',
              0.095,
            )
        }
        stroke(
          torso([0, 0.023, 0]),
          torso([0, 0.41, 0]),
          anatomy ? '#334a55' : '#da652c',
          anatomy ? 0.31 : 0.39,
        )
        if (!anatomy)
          stroke(
            torso([0, 0.14, 0.085]),
            torso([0, 0.37, 0.09]),
            '#39443a',
            0.195,
          )
        for (const arm of p.arms) {
          const hand = local(arm.hand),
            elbow = local(arm.elbow)
          stroke(
            local(arm.shoulder),
            elbow,
            anatomy ? '#3b515c' : '#de6d33',
            anatomy ? 0.096 : 0.152,
          )
          stroke(elbow, hand, anatomy ? '#40545c' : '#c2552d', 0.118)
          ball(hand, 0.061, '#1c292e')
          if (!board) stroke(hand, local(arm.poleTip), '#586975', 0.013)
        }
        ball(torso([0, 0.58, -0.06]), 0.125, '#253238')
        const helmet = torso([0, 0.683, -0.082])
        ball(helmet, 0.151, '#26343d')
        const gaze =
          (board
            ? f.safety
              ? 0
              : boardHeadYaw(f)
            : 0.62 * shoulderLook(f) - 0.25 * f.heading) +
          p.scan * (board && f.boardYaw > 0 ? 0 : 1.15)
        const goggles = (side: number) =>
          torso([
            side * 0.105 * Math.cos(gaze) - 0.13 * Math.sin(gaze),
            0.687 - 0.065 * p.guard,
            -0.082 - side * 0.105 * Math.sin(gaze) - 0.13 * Math.cos(gaze),
          ])
        if (dot(sub(goggles(0), helmet), sub(eye, helmet)) > 0)
          stroke(goggles(-1), goggles(1), '#76aeb8', 0.058)
      }
      let upper = com,
        lower = local(p.legs[p.outside].knee)
      if (opt.forces && opt.lens === 'forces') {
        const weighted = add3(
          scale3(p.legs[0].contact, a.firstShare),
          scale3(p.legs[1].contact, 1 - a.firstShare),
        )
        upper = arrow(
          local(mixPoint(weighted, p.bodyContact, a.bodyShare)),
          a.reaction,
          lensColors.support,
        )
        arrow(com, a.weight, lensColors.gravity)
        const tip = arrow(com, a.drag, lensColors.drag)
        if (!a.normalN) upper = tip
        lower = com
      }
      if (opt.lens === 'body' && opt.forces) {
        for (const l of p.legs) {
          stroke(local(l.hip), local(l.knee), lensColors.body, 0.013)
          stroke(local(l.knee), local(l.ankle), lensColors.body, 0.013)
          ball(local(l.knee), 0.025, '#f6f2ff')
        }
        ball(com, 0.032, lensColors.body)
        if (p.grab?.engaged) {
          lower = local(p.grab.point)
          const bend = local(p.grab.elbow),
            shoulder = local(p.grab.shoulder)
          stroke(shoulder, bend, lensColors.body, 0.013)
          stroke(bend, lower, lensColors.body, 0.013)
          ball(bend, 0.025, '#f6f2ff')
          ball(shoulder, 0.025, '#f6f2ff')
          const grip = project(lower)
          if (grip.depth > 0.06) {
            ctx.strokeStyle = lensColors.support
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.arc(grip.x, grip.y, Math.max(3, grip.k * 0.078), 0, 2 * Math.PI)
            ctx.stroke()
          }
        }
      }
      let work
      if (anatomy) {
        work = muscleWork(f, setup, p, a)
        const focus = opt.muscle ?? 'auto',
          id = focus === 'auto' ? work.primary : focus
        const bands = muscleBands(p)
        const pair = bands.filter((b) => b.id === id)
        upper = local(muscleCenter(pair[0]))
        lower = local(muscleCenter(pair[1]))
        const sorted = bands.map((b) => ({
          b,
          from: project(local(b.from)),
          to: project(local(b.to)),
        }))
        sorted.sort(
          (l, r) => r.from.depth + r.to.depth - l.from.depth - l.to.depth,
        )
        for (const { b, from, to } of sorted) {
          if (Math.min(from.depth, to.depth) < 0.06) continue
          const dx = to.x - from.x,
            dy = to.y - from.y,
            len = Math.hypot(dx, dy) / 2
          const width = (from.k + to.k) * 0.5 * b.radius
          if (len < 0.1 || width < 0.1) continue
          const color =
            focus === 'auto' || b.id === id
              ? effortColors[effortBand(work.limbs[b.limb].levels[b.id])]
              : '#587075'
          ctx.save()
          ctx.translate((from.x + to.x) / 2, (from.y + to.y) / 2)
          ctx.rotate(Math.atan2(dy, dx))
          const grad = ctx.createLinearGradient(0, -width, 0, width)
          grad.addColorStop(0, '#36474c')
          grad.addColorStop(0.36, color)
          grad.addColorStop(0.69, color)
          grad.addColorStop(1, '#344248')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.ellipse(0, 0, len, width, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#ffffff48'
          ctx.lineWidth = Math.min(1, width * 0.13)
          for (const side of [-1, 1]) {
            ctx.beginPath()
            ctx.moveTo(-len * 0.8, 0)
            ctx.quadraticCurveTo(0, side * width, len * 0.8, 0)
            ctx.stroke()
          }
          ctx.restore()
        }
      }
      if (opt.lens === 'contact') {
        if (opt.forces && a.bodySupportN > 0)
          arrow(
            local(p.bodyContact),
            scale3(a.normal, a.bodySupportN),
            lensColors.gravity,
          )
        upper = local(p.legs[0].contact)
        lower = local(p.legs[1].contact)
        if (opt.forces && a.normalN)
          [upper, lower].forEach((v, i) => {
            const leg = p.legs[i],
              color = i ? lensColors.drag : lensColors.support
            const length = (board ? 0.255 : 0.46) * a.contactFraction
            const end: Point3 = [
              Math.sin(leg.deck.yaw) * length,
              0,
              Math.cos(leg.deck.yaw) * length,
            ]
            stroke(
              local(add3(leg.contact, end)),
              local(add3(leg.contact, scale3(end, -1))),
              color,
              0.052,
            )
            ball(v, 0.04, color)
            arrow(
              v,
              scale3(a.normal, a.contacts[i]),
              i ? lensColors.drag : lensColors.support,
            )
          })
      }
      const gate = isSafety(setup.technique) ? null : gates[f.gatesSeen],
        target = gate
          ? screen(at(gate.x, gate.d, 2.3))
          : { x: 0, y: 0, visible: false }
      if (plate || !opt.line) target.visible = false
      return {
        muscles: work,
        upper: screen(upper),
        studyPoint: screen(local(studyPoint(f, setup, p))),
        lower: screen(lower),
        gate: target,
        bearing: (320 + Math.atan2(fw[0], -fw[2]) / radians + 360) % 360,
      }
    },
    dispose() {
      canvas.remove()
    },
  }
}
