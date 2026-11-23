import { pickLoad, type LoadTarget } from './loadDrawing.ts'
import { LoadReadout } from './LoadReadout.tsx'
import { loadReading, type LoadSelection, type LoadPath } from './loadPath.ts'
import { MuscleReadout, MuscleEvidence } from './MuscleReadout.tsx'
import { muscleGroups, type MuscleFocus, type MuscleWork } from './muscles.ts'
import { isSafety, isFall, safetyLessons, contactOnBody } from './safety.ts'
import { useEffect, useRef, useState } from 'react'
import { Camera, Pause, Play, RotateCcw } from 'lucide-react'
import { analyse, idealTurn, type Lens } from './analysis.ts'
import { equipmentFor, startsSwitch, type Setup } from './course.ts'
import { gripFor } from './tricks.ts'
import type { MountainView } from './mountain.ts'
import { canvasMountain } from './scene/canvas.ts'
import { clamp, type Frame } from './physics.ts'

export type StudyView = {
  load: LoadSelection
  setLoad: (s: LoadSelection) => void
  lens: Lens
  focus: MuscleFocus
  setLens: (lens: Lens) => void
  setFocus: (focus: MuscleFocus) => void
}
export function PoseStudy({
  view,
  setup,
  angle,
  speed,
  frame,
  trail,
  switched,
}: {
  view: StudyView
  setup: Setup
  angle: number
  speed: number
  frame?: Frame
  switched?: boolean
  trail?: readonly Frame[]
}) {
  const mount = useRef<HTMLDivElement>(null),
    gripLabel = useRef<HTMLSpanElement>(null),
    musclePin = useRef<HTMLSpanElement>(null),
    readout = useRef<HTMLOutputElement>(null),
    orbit = useRef(equipmentFor(setup.technique) === 'skis' ? 0.55 : -0.25),
    targets = useRef<LoadTarget[]>([]),
    pointer = useRef<{
      id: number
      x: number
      y: number
      travel: number
    } | null>(null)
  const [playing, setPlaying] = useState(false),
    [tuck, setTuck] = useState(0),
    [chain, setChain] = useState<LoadPath | null>(null),
    [sample, setSample] = useState<MuscleWork | null>(null),
    [closeUp, setCloseUp] = useState(false)
  const { lens, setLens, focus, setFocus, load, setLoad } = view
  const phase = useRef(0),
    refresh = useRef(true),
    config = useRef({
      angle,
      speed,
      playing,
      lens,
      load,
      tuck,
      focus,
      closeUp,
      frame,
      switched,
    })
  config.current = {
    angle,
    speed,
    playing,
    lens,
    load,
    tuck,
    focus,
    closeUp,
    frame,
    switched,
  }
  useEffect(() => {
    refresh.current = true
  }, [angle, speed, lens, load, tuck, focus, playing, closeUp, frame, switched])
  useEffect(() => {
    const host = mount.current!
    let dead = false,
      raf = 0,
      view: MountainView | undefined,
      last = 0,
      lastReadout = -Infinity
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
          // Only alter the dedicated turn experiment. Recorded replay frames are shared with scoring.
          if (!opt.frame && opt.lens === 'path') f.tuck = opt.tuck / 100
          const projection = view!.draw(f, {
            camera: opt.closeUp ? 'edge' : 'side',
            lens: opt.lens,
            muscle: opt.focus,
            load: opt.load,
            forces: true,
            line: false,
            orbit: orbit.current,
            tilt: 0.045,
            zoom: opt.closeUp
              ? 1.05
              : opt.lens === 'muscles' || opt.lens === 'path'
                ? 0.7
                : opt.frame
                  ? 0.85
                  : 0.75,
            preview: false,
            reduced: true,
          })
          targets.current = projection.loadTargets ?? []
          const work = projection.muscles
          if (work && musclePin.current) {
            const id = opt.focus === 'auto' ? work.primary : opt.focus
            const right = work.limbs[1].levels[id] > work.limbs[0].levels[id]
            const at = right ? projection.lower : projection.upper
            const pin = musclePin.current
            pin.hidden = !at.visible
            pin.style.left = at.x * 100 + '%'
            pin.style.top = at.y * 100 + '%'
            pin.textContent = (right ? 'R · ' : 'L · ') + muscleGroups[id][0]
            const x = at.x * host.clientWidth,
              gap = pin.offsetWidth + 18
            pin.dataset.flip = String(
              x > host.clientWidth - gap || (at.x < 0.5 && x > gap),
            )
            if (!opt.playing || now - lastReadout >= 90 || refresh.current) {
              setSample(work)
              lastReadout = now
            }
          }
          if (projection.loadPath && musclePin.current) {
            const r = loadReading(projection.loadPath, opt.load),
              pin = musclePin.current,
              at = projection.upper
            pin.hidden = !at.visible
            pin.style.left = at.x * 100 + '%'
            pin.style.top = at.y * 100 + '%'
            pin.textContent = r.title + ' · ' + r.annotation
            pin.dataset.flip = String(
              at.x * host.clientWidth > host.clientWidth - pin.offsetWidth - 18,
            )
            if (!opt.playing || now - lastReadout >= 90 || refresh.current) {
              setChain(projection.loadPath)
              lastReadout = now
            }
          }
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
            const at =
              useStudyPoint || opt.lens === 'muscles'
                ? projection.studyPoint
                : projection.lower
            label.hidden =
              !at.visible ||
              opt.lens === 'path' ||
              (!useStudyPoint &&
                ((opt.lens !== 'body' && opt.lens !== 'muscles') ||
                  f.air.pose < 0.99))
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
    <>
      <div className="pose-study" data-layer={lens}>
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
            pointer.current = {
              id: e.pointerId,
              x: e.clientX,
              y: e.clientY,
              travel: 0,
            }
          }}
          onPointerMove={(e) => {
            const d = pointer.current
            if (d && d.id === e.pointerId) {
              d.travel += Math.hypot(e.clientX - d.x, e.clientY - d.y)
              d.y = e.clientY
              orbit.current += (e.clientX - d.x) * 0.008
              d.x = e.clientX
              refresh.current = true
            }
          }}
          onPointerUp={(e) => {
            if (
              lens === 'path' &&
              pointer.current?.id === e.pointerId &&
              pointer.current.travel < 6
            )
              setLoad(
                pickLoad(
                  targets.current,
                  e.currentTarget.getBoundingClientRect(),
                  e.clientX,
                  e.clientY,
                  load,
                ),
              )
            pointer.current = null
          }}
          onLostPointerCapture={() => (pointer.current = null)}
        />
        {(lens === 'muscles' || lens === 'path') && (
          <span className="muscle-pin" ref={musclePin} hidden />
        )}
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
              orbit.current = board ? -0.25 : 0.55
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
            <option value="muscles">Muscle demand</option>
            <option value="body">Body joints</option>
            <option value="contact">Snow contact</option>
            <option value="forces">Force vectors</option>
            <option value="path">Load path</option>
          </select>
        </div>
      </div>
      {lens === 'path' && !frame && (
        <label className="chain-experiment">
          Torso tuck <span aria-hidden="true">{tuck}%</span>
          <input
            type="range"
            aria-label="Torso tuck"
            min="0"
            max="100"
            value={tuck}
            onChange={(e) => setTuck(+e.target.value)}
          />
          <small>
            Keep speed and edge angle fixed. Move the torso to compare its
            weight moment about the waist.
          </small>
        </label>
      )}
      {lens === 'path' && chain && (
        <LoadReadout model={chain} selection={load} change={setLoad} />
      )}
      {lens === 'muscles' && sample && (
        <>
          <MuscleReadout
            work={sample}
            focus={focus}
            change={setFocus}
            board={board}
            switched={frame?.air.switch ?? switched ?? startsSwitch(setup)}
          />
          <MuscleEvidence />
        </>
      )}
    </>
  )
}
