import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  Check,
  ChevronDown,
  ChevronsDown,
  Flag,
  LoaderCircle,
  MapPin,
  Maximize,
  Minimize,
  MountainSnow,
  Pause,
  Play,
  Route,
  ScanLine,
  Square,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { courses, type Setup } from './course.ts'
import { clamp, emptyFrame, lineAt, type Frame, type Gate } from './physics.ts'
import { canvasMountain } from './scene/canvas.ts'
import type { CameraMode, MountainView, ViewOptions } from './mountain.ts'
import { duration, lengthText, type Prefs } from './storage.ts'
import type { TrainingRun } from './useRun.ts'

const cameraLabels: Record<CameraMode, string> = {
  chase: 'Chase cam',
  wide: 'Trail cam',
  first: 'Skier view',
}

function TrailMap({
  gates,
  frame,
  length,
  guide,
  preview,
}: {
  gates: Gate[]
  frame: Frame
  length: number
  guide: boolean
  preview: boolean
}) {
  const project = (d: number, x: number) => [
    22 + (d / length) * 65 + x * 0.57,
    75 - (d / length) * 64 + x * 0.17,
  ]
  const line = Array.from({ length: 110 }, (_, i) => {
    const d = (i / 109) * length
    return project(d, lineAt(gates, d)).join(',')
  }).join(' ')
  const [x, y] = project(preview ? 0 : frame.d, preview ? 0 : frame.x)
  return (
    <div
      className="trail-map"
      aria-label={
        'Trail map, ' +
        (preview
          ? 'start of course'
          : Math.round((frame.d / length) * 100) + ' percent complete')
      }
    >
      <span className="map-label">
        <Route size={11} /> Trail map
      </span>
      <svg
        viewBox="0 0 110 83"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
      >
        <g fill="none" stroke="#c2d9e5" opacity=".16" strokeWidth=".7">
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d={
                'M' +
                (-45 + i * 9) +
                ' -5c23 23 0 25 16 40s27 6 35 25 -3 20 14 34'
              }
            />
          ))}
        </g>
        {guide && (
          <>
            <polyline
              points={line}
              fill="none"
              stroke="rgba(6,27,34,.5)"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <polyline
              points={line}
              fill="none"
              stroke="#80e6cd"
              strokeWidth="1.65"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}
        <circle
          cx="87"
          cy="11"
          r="2.9"
          fill="#e1f2ed"
          stroke="#173836"
          strokeWidth="1"
        />
        <circle cx={x} cy={y} r="6.1" fill="#47e1b9" opacity=".21" />
        <circle
          cx={x}
          cy={y}
          r="3.25"
          fill="#69f3ca"
          stroke="#e4fff8"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  )
}
type Props = {
  run: TrainingRun
  setup: Setup
  prefs: Prefs
  toggleSound: () => void
  camera: CameraMode
  setCamera: (c: CameraMode) => void
  inspect: boolean
  setInspect: (v: boolean) => void
  watch: () => void
}
export function Viewport({
  run,
  setup,
  prefs,
  toggleSound,
  camera,
  setCamera,
  inspect,
  setInspect,
  watch,
}: Props) {
  const c = courses[setup.course],
    preview = run.phase === 'preview',
    active3D = !preview || inspect
  const holder = useRef<HTMLDivElement>(null),
    viewport = useRef<HTMLDivElement>(null),
    scene = useRef<MountainView | null>(null)
  const [loaded, setLoaded] = useState(false),
    [full, setFull] = useState(false),
    [fallbackFull, setFallbackFull] = useState(false)
  const [orbit, setOrbit] = useState(0),
    drag = useRef<number | null>(null)
  useEffect(() => {
    if (run.phase === 'running' || run.phase === 'demo') {
      viewport.current?.focus({ preventScroll: true })
    }
  }, [run.phase])
  const cameraId = useId(),
    phaseRef = useRef(run.phase)
  phaseRef.current = run.phase
  const opts = useRef<ViewOptions>({
    camera,
    line: prefs.line,
    forces: prefs.forces,
    orbit,
  })
  opts.current = { camera, line: prefs.line, forces: prefs.forces, orbit }
  const starter = useRef(emptyFrame())
  const { draw, ready, current, keys } = run
  const render = useCallback(
    (f: Frame) => scene.current?.draw(f, opts.current),
    [],
  )
  useEffect(() => {
    if (!active3D) return
    let closed = false
    setLoaded(false)
    ready.current = false
    import('./mountain.ts')
      .then(
        (module) => module.createMountain,
        () => canvasMountain,
      )
      .then((createView) => {
        if (closed || !holder.current) return
        scene.current = createView(holder.current, setup)
        draw.current = render
        render(
          phaseRef.current === 'preview' ? starter.current : current.current,
        )
        ready.current = true
        setLoaded(true)
      })
    return () => {
      closed = true
      ready.current = false
      draw.current = null
      scene.current?.dispose()
      scene.current = null
    }
  }, [active3D, setup, render, draw, ready, current])
  useEffect(() => {
    if (active3D) render(preview ? starter.current : current.current)
  }, [
    active3D,
    preview,
    render,
    current,
    camera,
    orbit,
    prefs.line,
    prefs.forces,
    loaded,
  ])
  useEffect(() => {
    setOrbit(0)
  }, [camera, setup.course, run.phase === 'running'])
  useEffect(() => {
    const update = () =>
      setFull(document.fullscreenElement === viewport.current)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])
  useEffect(() => {
    if (!fallbackFull) return
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFallbackFull(false)
    }
    window.addEventListener('keydown', key)
    return () => {
      document.body.style.overflow = old
      window.removeEventListener('keydown', key)
    }
  }, [fallbackFull])
  async function fullscreen() {
    try {
      if (fallbackFull) {
        setFallbackFull(false)
        return
      }
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (viewport.current?.requestFullscreen)
        await viewport.current.requestFullscreen()
      else setFallbackFull(true)
    } catch {
      setFallbackFull(true)
    }
  }
  const changeCamera = (value: CameraMode) => {
    setCamera(value)
    if (preview) setInspect(true)
  }
  const touchButton = (key: string, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        keys.current.add(key)
      }}
      onPointerUp={() => keys.current.delete(key)}
      onPointerCancel={() => keys.current.delete(key)}
      onLostPointerCapture={() => keys.current.delete(key)}
    >
      {icon}
    </button>
  )
  const f = run.frame,
    g = run.gates[f.gatesSeen],
    hitNow = !preview && f.t - f.lastGateTime < 1.75
  const allowOrbit =
    active3D &&
    run.phase !== 'running' &&
    run.phase !== 'demo' &&
    camera !== 'first'
  return (
    <div
      className={
        'viewport' +
        (fallbackFull ? ' expanded' : '') +
        (full ? ' fullscreen' : '') +
        (preview ? ' standby' : ' in-run')
      }
      ref={viewport}
      role="region"
      tabIndex={-1}
      aria-label="Ski course viewport"
      data-testid="course-viewport"
    >
      <div className="scene-area">
        <img
          className={'course-poster ' + (active3D && loaded ? 'hidden' : '')}
          src={import.meta.env.BASE_URL + c.image}
          alt={c.name + ' ski course in the Swiss Alps'}
          aria-hidden={active3D && loaded}
          fetchPriority="high"
          draggable={false}
        />
        {active3D && (
          <div
            ref={holder}
            className={'mountain-canvas ' + (allowOrbit ? 'orbit-enabled' : '')}
            aria-label="Interactive 3D skiing scene"
            onPointerDown={(e) => {
              if (allowOrbit) {
                drag.current = e.clientX
                e.currentTarget.setPointerCapture(e.pointerId)
              }
            }}
            onPointerMove={(e) => {
              if (drag.current !== null) {
                const dx = e.clientX - drag.current
                drag.current = e.clientX
                setOrbit((v) => clamp(v + dx * 0.008, -1.17, 1.17))
              }
            }}
            onPointerUp={() => {
              drag.current = null
            }}
            onPointerCancel={() => {
              drag.current = null
            }}
          />
        )}
        <div className={'viewport-shade ' + (preview ? '' : 'mild')} />
        <div className="view-top">
          <div
            className={
              'view-status ' +
              (!preview && run.phase === 'running' ? 'live' : '')
            }
          >
            <i />
            {preview
              ? 'Course preview'
              : run.phase === 'paused'
                ? 'Paused'
                : run.phase === 'demo'
                  ? 'Technique demo'
                  : 'Run active'}
          </div>
          <div className="view-tools">
            {!preview && run.phase !== 'demo' && (
              <button
                className="glass-icon"
                aria-label={
                  run.phase === 'running' ? 'Pause run' : 'Resume run'
                }
                title={run.phase === 'running' ? 'Pause run' : 'Resume run'}
                onClick={run.phase === 'running' ? run.pause : run.resume}
              >
                {run.phase === 'running' ? <Pause /> : <Play />}
              </button>
            )}
            <button
              className="glass-icon"
              aria-label={prefs.sound ? 'Mute audio' : 'Enable audio'}
              title={prefs.sound ? 'Mute audio' : 'Enable audio'}
              aria-pressed={prefs.sound}
              onClick={toggleSound}
            >
              {prefs.sound ? <Volume2 /> : <VolumeX />}
            </button>
            <button
              className="glass-icon"
              aria-label={
                full || fallbackFull ? 'Exit fullscreen' : 'Enter fullscreen'
              }
              title="Fullscreen"
              onClick={fullscreen}
            >
              {full || fallbackFull ? <Minimize /> : <Maximize />}
            </button>
          </div>
        </div>
        {active3D && !loaded && (
          <span className="scene-loader">
            <LoaderCircle size={19} /> Loading course
          </span>
        )}
        {preview ? (
          <div className="course-caption">
            <div className="difficulty">
              <i className={'slope-symbol ' + c.symbol} />
              {c.level}
            </div>
            <h2>{c.name}</h2>
            <div className="location">
              <span>
                <MapPin />
                {c.region}
              </span>
              <b />
              <span>
                <MountainSnow />
                {lengthText(c.altitude, prefs.units)}
              </span>
            </div>
          </div>
        ) : (
          <div className="game-readout">
            <div className="readout-speed">
              {Math.round(f.speed * (prefs.units === 'metric' ? 3.6 : 2.23694))}
              <small>{prefs.units === 'metric' ? 'km/h' : 'mph'}</small>
            </div>
            <div className="hud-small">
              <Timer size={13} />
              {duration(f.t)}
              <i /> <Trophy size={13} />
              {f.points} pts
            </div>
          </div>
        )}
        {!preview && (
          <div className={'gate-target' + (hitNow ? ' gate-result' : '')}>
            {hitNow ? (
              f.lastGateHit ? (
                <>
                  <Check size={15} /> Gate cleared +100
                </>
              ) : (
                <>
                  <Flag size={14} /> Gate missed
                </>
              )
            ) : g ? (
              <>
                <Flag size={14} /> Gate {f.gatesSeen + 1} / {c.gates}
                <span>{lengthText(Math.max(0, g.d - f.d), prefs.units)}</span>
                {Math.abs(g.x - f.x) > g.width ? (
                  g.x > f.x ? (
                    <ArrowRight size={13} aria-label="Gate to the right" />
                  ) : (
                    <ArrowLeft size={13} aria-label="Gate to the left" />
                  )
                ) : (
                  <Check size={13} aria-label="Aligned with gate" />
                )}
              </>
            ) : (
              <>
                <Flag size={14} /> Finish line
              </>
            )}
          </div>
        )}
        {active3D && prefs.forces && (
          <div className="vector-key">
            <span>
              <i />
              Snow reaction
            </span>
            <span>
              <i />
              Gravity
            </span>
          </div>
        )}
        <TrailMap
          gates={run.gates}
          frame={f}
          length={c.length}
          guide={prefs.line}
          preview={preview}
        />
        {run.phase === 'running' && (
          <div className={'touch-controls ' + (prefs.touch ? 'forced' : '')}>
            <div>
              {touchButton('left', 'Steer left', <ArrowLeft />)}
              {touchButton('right', 'Steer right', <ArrowRight />)}
            </div>
            <div>
              {touchButton('tuck', 'Tuck', <ArrowUp />)}
              {touchButton('flex', 'Flex legs', <ChevronsDown />)}
              {touchButton('brake', 'Brake', <span>Brake</span>)}
            </div>
          </div>
        )}
        {run.phase === 'paused' && (
          <div className="pause-layer">
            <div>
              <span className="pause-icon">
                <Pause />
              </span>
              <h3>Run paused</h3>
              <p>
                {c.name} · {lengthText(f.d, prefs.units)} skied
              </p>
              <button className="primary" onClick={run.resume}>
                <Play size={16} fill="currentColor" />
                Resume run
              </button>
              <button className="text-btn" onClick={run.end}>
                End run &amp; review
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="view-foot">
        <div className="view-foot-left">
          <div className="cam-select">
            <Camera size={15} />
            <select
              id={cameraId}
              value={camera}
              aria-label="Camera view"
              onChange={(e) => changeCamera(e.target.value as CameraMode)}
            >
              {Object.entries(cameraLabels).map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
            <ChevronDown size={12} />
          </div>
          {(preview || run.phase === 'demo') && (
            <button
              className="watch-demo"
              onClick={run.phase === 'demo' ? run.end : watch}
            >
              {run.phase === 'demo' ? <Square size={11} /> : <Play size={12} />}{' '}
              {run.phase === 'demo' ? 'Stop demo' : 'Watch demo'}
            </button>
          )}
        </div>
        <div className="scene-specs">
          {inspect && preview ? (
            <button
              className="text-btn preview-reset"
              onClick={() => {
                setInspect(false)
                setCamera('chase')
              }}
            >
              <ScanLine size={14} /> Course photo
            </button>
          ) : null}
          <span>
            <ArrowDownRight />
            {c.pitch}° pitch
          </span>
          <i />
          <span>
            <Route />
            {lengthText(c.length, prefs.units)}
          </span>
        </div>
      </div>
    </div>
  )
}
