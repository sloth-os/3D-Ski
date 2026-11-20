import { isSafety, isFall, safetyLessons, contactOnBody } from './safety.ts'
import { useEffect, useRef, useState } from 'react'
import { Camera, Pause, Play, RotateCcw } from 'lucide-react'
import { analyse, idealTurn, type Lens } from './analysis.ts'
import { equipmentFor, type Setup } from './course.ts'
import { gripFor } from './tricks.ts'
import type { MountainView } from './mountain.ts'
import { canvasMountain } from './scene/canvas.ts'
import { clamp, type Frame } from './physics.ts'

export function PoseStudy({
  setup,
  angle,
  speed,
  frame,
  trail,
  switched,
}: {
  setup: Setup
  angle: number
  speed: number
  frame?: Frame
  switched?: boolean
  trail?: readonly Frame[]
}) {
  const mount = useRef<HTMLDivElement>(null),
    gripLabel = useRef<HTMLSpanElement>(null),
    readout = useRef<HTMLOutputElement>(null),
    orbit = useRef(-0.25),
    pointer = useRef<{ id: number; x: number } | null>(null)
  const [playing, setPlaying] = useState(false),
    [lens, setLens] = useState<Lens>('body'),
    [closeUp, setCloseUp] = useState(false)
  const phase = useRef(0),
    refresh = useRef(true),
    config = useRef({ angle, speed, playing, lens, closeUp, frame, switched })
  config.current = { angle, speed, playing, lens, closeUp, frame, switched }
  useEffect(() => {
    refresh.current = true
  }, [angle, speed, lens, playing, closeUp, frame, switched])
  useEffect(() => {
    const host = mount.current!
    let dead = false,
      raf = 0,
      view: MountainView | undefined,
      last = 0
    refresh.current = true
    phase.current = 0
    const resize = new ResizeObserver(() => {
      refresh.current = true
    })
    resize.observe(host)
    async function boot() {
      const create = await import('./mountain.ts').then(
        (m) => m.createMountain,
        () => canvasMountain,
      )
      if (dead) return
      view = create(host, setup, true, trail)
      function draw(now: number) {
        if (dead) return
        const opt = config.current
        if (
          !document.hidden &&
          (refresh.current || (opt.playing && now - last >= 30))
        ) {
          if (opt.playing && last)
            phase.current += 1.2 * clamp((now - last) / 1000, 0, 0.08)
          const f =
            opt.frame ??
            idealTurn(setup, opt.angle, opt.speed, phase.current, opt.switched)
          const projection = view!.draw(f, {
            camera: opt.closeUp ? 'edge' : 'side',
            lens: opt.lens,
            forces: true,
            line: false,
            orbit: orbit.current,
            tilt: 0.045,
            zoom: opt.closeUp ? 1.05 : opt.frame ? 0.85 : 0.75,
            preview: false,
            reduced: true,
          })
          const label = gripLabel.current
          if (readout.current) {
            const a = analyse(f, setup)
            readout.current.textContent =
              equipmentFor(setup.technique) === 'snowboard'
                ? a.edgeName +
                  ' · ' +
                  Math.round(
                    (f.air.switch ? 1 - a.firstShare : a.firstShare) * 100,
                  ) +
                  '% on lead foot'
                : a.edgeName + ' · ' + Math.round(f.load) + '% outside'
          }
          if (label) {
            const useStudyPoint = opt.switched !== undefined || !!f.safety
            const at = useStudyPoint ? projection.studyPoint : projection.lower
            label.hidden =
              !at.visible ||
              (!useStudyPoint && (opt.lens !== 'body' || f.air.pose < 0.99))
            label.style.left = at.x * 100 + '%'
            label.style.top = at.y * 100 + '%'
            label.dataset.flip = String(
              at.x * host.clientWidth >
                host.clientWidth - label.offsetWidth - 24 && at.x > 0.5,
            )
          }
          refresh.current = false
          last = now
        }
        raf = requestAnimationFrame(draw)
      }
      raf = requestAnimationFrame(draw)
    }
    void boot()
    return () => {
      dead = true
      resize.disconnect()
      cancelAnimationFrame(raf)
      view?.dispose()
    }
  }, [setup, trail])
  const grip = gripFor(setup.technique, frame?.air.switch ?? false)
  const safetyMark = frame?.safety
    ? isFall(setup.technique)
      ? contactOnBody(frame.safety) > 0.2
        ? 'Hip contact'
        : 'Soft knees'
      : setup.technique === 'skiStop'
        ? 'Inside edge'
        : setup.stopEdge === 'toe'
          ? 'Uphill toe edge'
          : 'Uphill heel edge'
    : null
  const board = equipmentFor(setup.technique) === 'snowboard'
  return (
    <div className="pose-study">
      <div
        className="study-surface"
        ref={mount}
        role="img"
        aria-label={
          frame
            ? (isSafety(setup.technique)
                ? '3D movement study of ' +
                  safetyLessons[setup.technique].name +
                  '.'
                : board
                  ? '3D snowboard trick replay.'
                  : '3D ski trick replay.') + ' Drag to orbit the rider.'
            : 'Interactive 3D rider showing the selected edge angle and body position. Drag to orbit.'
        }
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          pointer.current = { id: e.pointerId, x: e.clientX }
        }}
        onPointerMove={(e) => {
          const d = pointer.current
          if (d && d.id === e.pointerId) {
            orbit.current += (e.clientX - d.x) * 0.008
            d.x = e.clientX
            refresh.current = true
          }
        }}
        onLostPointerCapture={() => (pointer.current = null)}
      />
      {(grip || switched !== undefined || safetyMark) && (
        <span className="study-grip" ref={gripLabel} hidden>
          {safetyMark ??
            (grip
              ? (grip.hand === 1 ? 'Right glove' : 'Left glove') +
                ' · ' +
                grip.target
              : board
                ? switched
                  ? 'Tail · right foot leads'
                  : 'Nose · left foot leads'
                : switched
                  ? 'Ski tails lead'
                  : 'Ski tips lead')}
        </span>
      )}
      <div className="study-tools">
        <button
          onClick={() => {
            orbit.current = -0.25
            phase.current = 0
            refresh.current = true
          }}
          aria-label="Reset study view"
        >
          <RotateCcw size={13} />
        </button>
        <button
          aria-label={closeUp ? 'Show whole rider' : 'Show edge close-up'}
          onClick={() => setCloseUp(!closeUp)}
        >
          <Camera size={14} />
        </button>
      </div>
      {switched !== undefined && (
        <output
          ref={readout}
          className="switch-readout"
          aria-label="Switch turn analysis"
          aria-live="off"
        />
      )}
      <div className="study-foot">
        {!frame && (
          <button
            onClick={() => {
              if (!playing) phase.current = 0
              setPlaying(!playing)
            }}
          >
            {playing ? <Pause size={12} /> : <Play size={12} />}{' '}
            {playing ? 'Hold pose' : 'Link turns'}
          </button>
        )}
        <select
          aria-label="3D study layer"
          value={lens}
          onChange={(e) => setLens(e.target.value as Lens)}
        >
          <option value="body">Body joints</option>
          <option value="contact">Snow contact</option>
          <option value="forces">Force vectors</option>
        </select>
      </div>
    </div>
  )
}
