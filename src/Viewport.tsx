import { useEffect, useRef, type RefObject } from 'react'
import { Flag } from 'lucide-react'
import { courses, equipmentFor, type Setup } from './course.ts'
import { analyse, riderPose, type Lens } from './analysis.ts'
import { clamp } from './physics.ts'
import type { CameraMode, ScreenPoint, ViewOptions } from './cameras.ts'
import type { MountainView } from './mountain.ts'
import { canvasMountain } from './scene/canvas.ts'
import type { TrainingRun } from './useRun.ts'
import { lengthText, type Prefs } from './storage.ts'

function setAnchor(
  el: HTMLDivElement | null,
  p: ScreenPoint,
  show: boolean,
  width: number,
) {
  if (!el) return
  el.style.visibility = show && p.visible ? 'visible' : 'hidden'
  const rightFacing = el.classList.contains('upper')
  if (el.classList.contains('annotation'))
    el.dataset.flip = String(
      rightFacing
        ? p.x * width > width - (width < 651 ? 112 : 175)
        : p.x * width < (width < 651 ? 113 : 152),
    )
  el.style.left = (100 * p.x).toFixed(2) + '%'
  el.style.top = (100 * p.y).toFixed(2) + '%'
}
function compass(canvas: HTMLCanvasElement | null, bearing: number) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = 288,
    h = 40,
    dpr = Math.min(2, window.devicePixelRatio || 1)
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr
    canvas.height = h * dpr
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  ctx.textAlign = 'center'
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  for (let d = Math.floor((bearing - 52) / 5) * 5; d <= bearing + 52; d += 5) {
    const x = w / 2 + (d - bearing) * 2.9,
      n = (d + 360) % 360
    ctx.fillStyle =
      'rgba(239,248,250,' +
      Math.min(0.87, 1 - Math.abs(x - w / 2) / (w * 0.57)) +
      ')'
    ctx.fillRect(x, 21, 1, n % 15 === 0 ? 8 : 4)
    if (n % 15 === 0 && Math.abs(x - w / 2) > 23) {
      ctx.font = n % 45 === 0 ? 'bold 10px sans-serif' : '9px monospace'
      ctx.fillText(n % 45 === 0 ? names[n / 45] : String(n), x, 15)
    }
  }
  ctx.fillStyle = '#d4f59b'
  ctx.font = 'bold 12px monospace'
  ctx.fillText((Math.round(bearing) % 360) + '°', w / 2, 16)
  ctx.beginPath()
  ctx.moveTo(w / 2 - 3, 32)
  ctx.lineTo(w / 2 + 3, 32)
  ctx.lineTo(w / 2, 27)
  ctx.fill()
}
type Props = {
  run: TrainingRun
  setup: Setup
  prefs: Prefs
  camera: CameraMode
  lens: Lens
  blocked: boolean
  compassRef: RefObject<HTMLCanvasElement | null>
  resetView: number
  details: () => void
}
export function Viewport({
  run,
  setup,
  prefs,
  camera,
  lens,
  blocked,
  compassRef,
  resetView,
  details,
}: Props) {
  const holder = useRef<HTMLDivElement>(null),
    upper = useRef<HTMLDivElement>(null),
    lower = useRef<HTMLDivElement>(null),
    gate = useRef<HTMLDivElement>(null)
  const hand = useRef({ orbit: 0, tilt: 0, zoom: 1 }),
    drag = useRef<{ id: number; x: number; y: number } | null>(null)
  const config = useRef({ camera, lens, prefs, phase: run.phase, blocked })
  config.current = { camera, lens, prefs, phase: run.phase, blocked }
  const { ready, current } = run
  useEffect(() => {
    hand.current = { orbit: 0, tilt: 0, zoom: 1 }
  }, [camera, resetView, setup])
  useEffect(() => {
    const host = holder.current!
    let dead = false,
      view: MountainView | undefined,
      raf = 0,
      last = 0,
      oldBearing = -1
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    ready.current = false
    host.dataset.loaded = 'false'
    async function mount() {
      const create = await import('./mountain.ts').then(
        (m) => m.createMountain,
        () => canvasMountain,
      )
      if (dead) return
      view = create(host, setup)
      host.dataset.loaded = 'true'
      ready.current = true
      const loop = (now: number) => {
        if (dead) return
        const cfg = config.current,
          free = cfg.phase === 'preview',
          idle = free || cfg.phase === 'paused'
        if (
          !document.hidden &&
          (!last || now - last > (cfg.blocked ? 175 : idle ? 30 : 0))
        ) {
          const options: ViewOptions = {
            camera: cfg.camera,
            lens: cfg.lens,
            forces: cfg.prefs.forces,
            line: cfg.prefs.line,
            ...hand.current,
            preview: free,
            reduced: reduced.matches,
          }
          const result = view!.draw(current.current, options)
          const labels =
            cfg.prefs.forces &&
            !cfg.blocked &&
            cfg.camera !== 'first' &&
            cfg.camera !== 'aerial'
          setAnchor(upper.current, result.upper, labels, host.clientWidth)
          setAnchor(lower.current, result.lower, labels, host.clientWidth)
          setAnchor(
            gate.current,
            result.gate,
            !cfg.blocked && cfg.prefs.line && !free,
            host.clientWidth,
          )
          if (oldBearing !== Math.round(result.bearing)) {
            oldBearing = Math.round(result.bearing)
            compass(compassRef.current, result.bearing)
          }
          last = now
        }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }
    void mount()
    const wheel = (e: WheelEvent) => {
      if (config.current.blocked || config.current.camera === 'first') return
      e.preventDefault()
      hand.current.zoom = clamp(
        hand.current.zoom * Math.exp(e.deltaY * 0.0012),
        0.59,
        1.85,
      )
    }
    host.addEventListener('wheel', wheel, { passive: false })
    return () => {
      dead = true
      cancelAnimationFrame(raf)
      ready.current = false
      view?.dispose()
      host.removeEventListener('wheel', wheel)
    }
  }, [setup, ready, current, compassRef])
  const f = run.frame,
    a = analyse(f, setup),
    p = riderPose(f, setup),
    board = equipmentFor(setup.technique) === 'snowboard'
  const labels =
    lens === 'forces'
      ? [
          ['Snow reaction', Math.round(a.reactionN) + ' N'],
          ['Gravity', Math.round(a.weightN) + ' N'],
        ]
      : lens === 'body'
        ? [
            ['Center of mass', p.com[1].toFixed(2) + ' m'],
            ['Knee flexion', Math.round(p.legs[p.outside].angle) + '°'],
          ]
        : [
            [
              board ? 'Front binding' : 'Left ski',
              Math.round(a.contacts[0]) + ' N',
            ],
            [
              board ? 'Rear binding' : 'Right ski',
              Math.round(a.contacts[1]) + ' N',
            ],
          ]
  return (
    <div className="world" aria-label="Interactive mountain">
      <img
        className="course-poster"
        src={import.meta.env.BASE_URL + courses[setup.course].image}
        alt={courses[setup.course].name + ' in the Swiss Alps'}
        fetchPriority="high"
      />
      <div
        className="mountain-canvas"
        ref={holder}
        aria-label="3D slope. Drag to orbit and scroll to zoom."
        onPointerDown={(e) => {
          if (blocked || camera === 'first') return
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
          e.currentTarget.setPointerCapture(e.pointerId)
          e.currentTarget.focus({ preventScroll: true })
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d || d.id !== e.pointerId) return
          hand.current.orbit += (e.clientX - d.x) * 0.006
          hand.current.tilt = clamp(
            hand.current.tilt + (e.clientY - d.y) * 0.003,
            -0.28,
            1.02,
          )
          d.x = e.clientX
          d.y = e.clientY
        }}
        onPointerUp={() => {
          drag.current = null
        }}
        onPointerCancel={() => {
          drag.current = null
        }}
        onLostPointerCapture={() => {
          drag.current = null
        }}
        tabIndex={-1}
      >
        {setup.course === 'ridge' && (
          <img
            className="trailhead-plate"
            src={import.meta.env.BASE_URL + 'images/trailhead.webp'}
            alt=""
            draggable={false}
          />
        )}
      </div>
      <div className="world-vignette" />
      <div className={'annotation upper ' + lens} ref={upper}>
        <i />
        <button onClick={details}>
          <span>{labels[0][0]}</span>
          <b>{labels[0][1]}</b>
        </button>
      </div>
      <div className={'annotation lower ' + lens} ref={lower}>
        <i />
        <button onClick={details}>
          <span>{labels[1][0]}</span>
          <b>{labels[1][1]}</b>
        </button>
      </div>
      <div className="world-gate" ref={gate}>
        <Flag size={12} />
        {f.gatesSeen + 1}
        <b>
          {lengthText(
            Math.max(0, (run.gates[f.gatesSeen]?.d ?? f.d) - f.d),
            prefs.units,
          )}
        </b>
        <span>▾</span>
      </div>
    </div>
  )
}
