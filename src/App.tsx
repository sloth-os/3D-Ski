import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDownRight,
  Footprints,
  RotateCcw,
  Check,
  ChevronDown,
  Download,
  Flag,
  History,
  Layers3,
  MapPin,
  Maximize,
  Minimize,
  MountainSnow,
  Pause,
  Settings,
  Target,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { cameras, nextCamera, type CameraMode } from './cameras.ts'
import { coachingCue, type Lens } from './analysis.ts'
import {
  courses,
  techniques,
  equipmentFor,
  isSwitchDrill,
  stanceLabel,
  equipmentName,
  surfaces,
  type Setup,
  type TechniqueId,
} from './course.ts'
import { worldHeight, type Frame, type Run, type Sample } from './physics.ts'
import {
  appendRun,
  initialLog,
  initialPrefs,
  initialSetup,
  write,
  lengthText,
  duration,
  type Prefs,
} from './storage.ts'
import { Brand, Modal, SchemeTabs, Toggle } from './UI.tsx'
import { skiingKeys, useRun } from './useRun.ts'
import { Viewport } from './Viewport.tsx'
import {
  TrailMap,
  FlightInstruments,
  InstrumentPanel,
  Dock,
  TouchPad,
  TrickHUD,
  Loadout,
  FrameInspector,
} from './Cockpit.tsx'
import { Controls, Log, RunDetails, TelemetryHelp } from './Panels.tsx'
import { Telemetry } from './Telemetry.tsx'
import { Lab } from './Lab.tsx'
import { isTrick } from './tricks.ts'
import {
  sportNames,
  sportFor,
  lessonFor,
  lessonPath,
  resolveLesson,
  type Sport,
} from './library.ts'
import { isSafety } from './safety.ts'
import { SafetyHUD } from './SafetyStudy.tsx'
import { useOffline } from './offline.ts'

type Dialog =
  | 'settings'
  | 'controls'
  | 'setup'
  | 'analysis'
  | 'lab'
  | 'run-log'
  | null
function fromHash(preferred: TechniqueId): Dialog {
  if (resolveLesson(location.hash, preferred)) return 'lab'
  return location.hash === '#run-log' ? 'run-log' : null
}
export default function App() {
  const [setup, setSetup] = useState<Setup>(initialSetup),
    [prefs, setPrefs] = useState(initialPrefs),
    [runs, setRuns] = useState(initialLog)
  const [dialog, setDialog] = useState<Dialog>(() => fromHash(setup.technique)),
    [review, setReview] = useState<Run | null>(null),
    log = useRef(runs)
  const [labId, setLabId] = useState<TechniqueId>(
      () => resolveLesson(location.hash, setup.technique) ?? setup.technique,
    ),
    [camera, setCamera] = useState<CameraMode>('chase'),
    [lens, setLens] = useState<Lens>('forces')
  const [resetView, reset] = useState(0),
    [full, setFull] = useState(false),
    [saved, setSaved] = useState(true),
    [snapshot, setSnapshot] = useState<{
      frame: Frame
      samples: Sample[]
    } | null>(null)
  const compassRef = useRef<HTMLCanvasElement>(null),
    world = useRef<HTMLElement>(null),
    offline = useOffline()
  const record = useCallback((r: Run) => {
    const next = [r, ...log.current].slice(0, 200)
    log.current = next
    setRuns(next)
    void appendRun(r, next).then(({ records, saved }) => {
      log.current = records
      setRuns(records)
      setSaved(saved)
    })
    setReview(r)
  }, [])
  const run = useRun(setup, prefs.sound, record, !!dialog || !!review),
    f = run.frame,
    c = courses[setup.course],
    preview = run.phase === 'preview',
    paused = run.phase === 'paused'
  function close() {
    setDialog(null)
    setReview(null)
    if (location.hash)
      history.replaceState(null, '', location.pathname + location.search)
    world.current?.focus({ preventScroll: true })
  }
  function openLesson(id: TechniqueId) {
    run.pause()
    setLabId(id)
    setDialog('lab')
    setReview(null)
    history.replaceState(
      null,
      '',
      location.pathname + location.search + lessonPath(id),
    )
  }
  function open(which: Dialog) {
    run.pause()
    if (which === 'analysis')
      setSnapshot({
        frame: { ...run.current.current },
        samples: [...run.samples],
      })
    setDialog(which)
    setReview(null)
    const hash = which === 'run-log' ? '#run-log' : ''
    history.replaceState(null, '', location.pathname + location.search + hash)
  }
  function start(demo = false, initial = setup) {
    close()
    reset((n) => n + 1)
    run.start(demo, initial)
    requestAnimationFrame(() => world.current?.focus({ preventScroll: true }))
  }
  function configure(s: Setup) {
    if (run.phase !== 'preview') run.end()
    setSetup(s)
    setLabId(s.technique)
    setCamera('chase')
    reset((n) => n + 1)
    close()
  }
  function practice(id: TechniqueId, demo = false, stopEdge = setup.stopEdge) {
    const chosen = { ...setup, technique: id, stopEdge }
    configure(chosen)
    start(demo, chosen)
  }
  function changeLens(value: Lens) {
    setLens(value)
    if (!prefs.forces) setPrefs((p) => ({ ...p, forces: true }))
  }
  function sound() {
    if (!prefs.sound) run.audio.current.enable()
    else run.audio.current.update(0, 0, false)
    setPrefs((p) => ({ ...p, sound: !p.sound }))
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen()
      else setFull((v) => !v)
    } catch {
      setFull((v) => !v)
    }
  }
  useEffect(() => {
    write('setup', setup)
  }, [setup])
  useEffect(() => {
    write('preferences', prefs)
  }, [prefs])
  useEffect(() => {
    const hash = () => {
        run.pause()
        const id = resolveLesson(location.hash, setup.technique)
        setDialog(fromHash(setup.technique))
        if (id) {
          setLabId(id)
          history.replaceState(
            null,
            '',
            location.pathname + location.search + lessonPath(id),
          )
        }
        setReview(null)
      },
      fs = () => setFull(!!document.fullscreenElement)
    const storage = (e: StorageEvent) => {
      if (e.key === 'fallline.runs') {
        log.current = initialLog()
        setRuns(log.current)
      }
    }
    const initial = resolveLesson(location.hash, setup.technique)
    if (initial && location.hash !== lessonPath(initial))
      history.replaceState(
        null,
        '',
        location.pathname + location.search + lessonPath(initial),
      )
    window.addEventListener('hashchange', hash)
    window.addEventListener('storage', storage)
    document.addEventListener('fullscreenchange', fs)
    return () => {
      window.removeEventListener('hashchange', hash)
      window.removeEventListener('storage', storage)
      document.removeEventListener('fullscreenchange', fs)
    }
  }, [run.pause, setup.technique])
  useEffect(() => {
    if (run.phase === 'running' || run.phase === 'demo')
      world.current?.focus({ preventScroll: true })
  }, [run.phase])
  const input = useRef<(e: KeyboardEvent, down: boolean) => void>(() => {})
  input.current = (e, down) => {
    if (!down) {
      run.keys.current.delete(e.code)
      return
    }
    const el = e.target as HTMLElement
    if (
      e.altKey ||
      e.ctrlKey ||
      e.metaKey ||
      dialog ||
      review ||
      el.matches('input,select,textarea,[contenteditable=true]')
    )
      return
    if (run.phase === 'running' && skiingKeys.has(e.code)) {
      if (e.code === 'Space' && el.closest('button,a,summary')) return
      e.preventDefault()
      run.keys.current.add(e.code)
      return
    }
    if (e.repeat) return
    if (
      e.code === 'KeyE' &&
      run.phase === 'running' &&
      isSafety(setup.technique)
    ) {
      e.preventDefault()
      run.checkUphill()
      return
    }
    if (
      e.code === 'KeyV' &&
      run.phase === 'running' &&
      !isSafety(setup.technique)
    ) {
      e.preventDefault()
      run.pivot()
      return
    }
    if (e.key === '?') {
      e.preventDefault()
      open('controls')
    }
    if (e.code === 'Enter' && !el.closest('button,a,summary')) {
      e.preventDefault()
      if (paused) run.resume()
      else if (preview || run.phase === 'demo') start()
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      e.preventDefault()
      if (paused) run.resume()
      else run.pause()
    }
    if (e.code === 'KeyC') setCamera(nextCamera(camera))
    if (/^Digit[1-5]$/.test(e.code))
      setCamera(cameras[Number(e.code.slice(-1)) - 1].id)
    if (e.code === 'KeyF')
      changeLens(
        lens === 'forces' ? 'body' : lens === 'body' ? 'contact' : 'forces',
      )
    if (e.code === 'Period' && paused) {
      e.preventDefault()
      run.singleStep()
    }
    if (e.code === 'KeyR') reset((v) => v + 1)
    if (e.code === 'KeyM') sound()
  }
  useEffect(() => {
    const down = (e: KeyboardEvent) => input.current(e, true),
      up = (e: KeyboardEvent) => input.current(e, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])
  const liveGate = f.t - f.lastGateTime < 1.35 && !preview
  return (
    <main
      ref={world}
      className={
        'ski-sim ' +
        (preview ? 'at-rest' : 'on-run') +
        (full ? ' expanded' : '') +
        (prefs.touch ? ' touch-enabled' : '')
      }
      tabIndex={-1}
      aria-label="Fallline alpine simulator"
    >
      <Viewport
        run={run}
        setup={setup}
        prefs={prefs}
        camera={camera}
        lens={lens}
        resetView={resetView}
        compassRef={compassRef}
        blocked={!!dialog || !!review}
        details={() => open('analysis')}
      />
      <header className="game-header">
        <a
          className="game-brand"
          href="#simulator"
          aria-label="Fallline simulator"
          onClick={(e) => {
            e.preventDefault()
            close()
          }}
        >
          <Brand />
        </a>
        <canvas
          ref={compassRef}
          className="scene-compass"
          role="img"
          aria-label="Camera compass bearing"
        />
        <div className="game-tools">
          <nav aria-label="Game menu">
            {(Object.keys(sportNames) as Sport[]).map((sport) => (
              <a
                key={sport}
                className="sport-link"
                aria-label={sportNames[sport]}
                href={'#' + sport}
                title={sportNames[sport]}
                onClick={(e) => {
                  e.preventDefault()
                  openLesson(lessonFor(sport, setup.technique))
                }}
              >
                {sport === 'skiing' ? (
                  <Footprints size={16} />
                ) : (
                  <Layers3 size={16} />
                )}
                <span>{sportNames[sport]}</span>
              </a>
            ))}
            <a
              href="#run-log"
              title="Run log"
              aria-label="Run log"
              onClick={(e) => {
                e.preventDefault()
                open('run-log')
              }}
            >
              <History size={17} />
              <span>Run log</span>
            </a>
          </nav>
          <i />
          <button
            onClick={sound}
            aria-label={prefs.sound ? 'Mute audio' : 'Enable audio'}
            title="Slope audio"
          >
            {prefs.sound ? <Volume2 /> : <VolumeX />}
          </button>
          <button
            onClick={fullscreen}
            aria-label={full ? 'Exit fullscreen' : 'Enter fullscreen'}
            title="Fullscreen"
          >
            {full ? <Minimize /> : <Maximize />}
          </button>
          <button
            onClick={() => open('settings')}
            aria-label="Settings"
            title="Settings"
          >
            <Settings />
          </button>
        </div>
      </header>
      <section className="course-hud">
        <div className="mode-label">
          <i />
          {preview
            ? 'Free practice'
            : paused
              ? 'Frame paused'
              : run.phase === 'demo'
                ? 'Technique demo'
                : 'Run active'}
        </div>
        <h1>{c.name}</h1>
        <div className="region">
          <MapPin size={14} />
          {c.region}
        </div>
        <div className="course-badges">
          <span>
            <i className={'slope-symbol ' + c.symbol} />
            {c.level}
          </span>
          <span>
            <ArrowDownRight size={13} />
            {preview ? c.pitch : Math.round(f.pitch)}° pitch
          </span>
          {!preview && !isSafety(setup.technique) && (
            <button
              className="stance-chip"
              data-stance={f.air.switch ? 'switch' : 'forward'}
              disabled={
                run.phase !== 'running' || !!f.pivot || f.air.phase !== 'ready'
              }
              onClick={run.pivot}
              aria-label={f.air.switch ? 'Pivot to forward' : 'Pivot to switch'}
              title={
                stanceLabel(
                  equipmentFor(setup.technique) === 'snowboard',
                  f.air.switch,
                ) + ' · V to pivot'
              }
            >
              <RotateCcw size={12} />
              {f.pivot
                ? 'Pivoting'
                : f.air.switch
                  ? 'Switch'
                  : equipmentFor(setup.technique) === 'snowboard'
                    ? 'Regular'
                    : 'Forward'}
              <kbd>V</kbd>
            </button>
          )}
        </div>
        <button className="equipped" onClick={() => open('setup')}>
          <Layers3 size={14} />
          {equipmentName[equipmentFor(setup.technique)]}
          <i /> {surfaces[setup.surface].name}
          <ChevronDown size={11} />
        </button>
      </section>
      <InstrumentPanel
        setup={setup}
        frame={f}
        prefs={prefs}
        lens={lens}
        setLens={changeLens}
        toggle={() => setPrefs((p) => ({ ...p, forces: !p.forces }))}
        details={() => open('analysis')}
      />
      {!preview && !isSafety(setup.technique) && (
        <div className={'score-ribbon ' + (liveGate ? 'gate-flash' : '')}>
          <Flag size={13} />
          {liveGate
            ? f.lastGateHit
              ? 'Gate cleared +100'
              : 'Gate missed'
            : f.gatesSeen < c.gates
              ? 'Gate ' + (f.gatesSeen + 1) + ' / ' + c.gates
              : 'Finish line'}
          <i />
          {f.points} pts
        </div>
      )}
      {paused && (
        <div className="paused-chip">
          <Pause size={13} />
          Paused <span>{f.t.toFixed(2)} s</span>
        </div>
      )}
      <FlightInstruments
        run={run}
        freestyle={isTrick(setup.technique)}
        units={prefs.units}
        details={() => open('analysis')}
      />
      {isSafety(setup.technique) ? (
        <SafetyHUD
          frame={f}
          setup={setup}
          units={prefs.units}
          preview={preview}
          running={run.phase === 'running'}
          check={run.checkUphill}
        />
      ) : isTrick(setup.technique) ? (
        <TrickHUD frame={f} id={setup.technique} preview={preview} />
      ) : isSwitchDrill(setup.technique) ? (
        <section
          className="trick-hud switch-hud"
          aria-label="Switch practice"
          data-stance={f.air.switch ? 'switch' : 'forward'}
        >
          <span className="hud-kicker">
            {f.pivot
              ? 'Surface pivot'
              : stanceLabel(
                  equipmentFor(setup.technique) === 'snowboard',
                  f.air.switch,
                )}
          </span>
          <header>
            <strong>{techniques[setup.technique].name}</strong>
          </header>
          <footer>
            <span>
              {lengthText(preview ? 0 : f.switchDistance, prefs.units)} switch
            </span>
            <span>{preview ? 0 : f.switchTurns} linked turns</span>
          </footer>
        </section>
      ) : (
        <div className="technique-cue">
          <span className="hud-kicker">
            <Target size={12} />
            Technique focus
          </span>
          <b>{techniques[setup.technique].name}</b>
          <span>
            {preview ? techniques[setup.technique].cue : coachingCue(f, setup)}
          </span>
        </div>
      )}
      {!isSafety(setup.technique) && (
        <TrailMap run={run} setup={setup} units={prefs.units} />
      )}
      <TouchPad run={run} force={prefs.touch} technique={setup.technique} />
      <Dock
        run={run}
        camera={camera}
        changeCamera={setCamera}
        start={start}
        setup={() => open('setup')}
        controls={() => open('controls')}
      />
      <div className="game-foot">
        <span>
          <i />
          {offline.online
            ? offline.cached
              ? 'Offline ready'
              : 'Local session'
            : 'Offline mode'}
        </span>
        <span>
          <MountainSnow size={11} />
          {lengthText(
            preview ? c.altitude : c.altitude + worldHeight(c, f.d, f.x),
            prefs.units,
          )}
          <b /> {preview ? 'Course preview' : duration(f.t)}
        </span>
      </div>
      {dialog === 'setup' && (
        <Modal title="Run setup" onClose={close}>
          <Loadout
            setup={setup}
            prefs={prefs}
            apply={configure}
            toggle={() => setPrefs((p) => ({ ...p, line: !p.line }))}
            inRun={!preview && !run.automated}
          />
        </Modal>
      )}
      {dialog === 'controls' && (
        <Modal title="Run controls" onClose={close}>
          <Controls />
        </Modal>
      )}
      {dialog === 'analysis' && (
        <Modal title="Frame analysis" onClose={close}>
          <FrameInspector f={snapshot?.frame ?? f} setup={setup} />
          <details className="analysis-notes">
            <summary>Telemetry recorder</summary>
            <Telemetry
              samples={snapshot?.samples ?? run.samples}
              units={prefs.units}
              preview={preview}
              board={equipmentFor(setup.technique) === 'snowboard'}
            />
            <TelemetryHelp
              board={equipmentFor(setup.technique) === 'snowboard'}
            />
          </details>
        </Modal>
      )}
      {dialog === 'lab' && (
        <Modal
          title={sportNames[sportFor(labId)] + ' training'}
          wide
          onClose={close}
        >
          <Lab
            setup={setup}
            id={labId}
            select={openLesson}
            practice={practice}
            units={prefs.units}
          />
        </Modal>
      )}
      {dialog === 'run-log' && !review && (
        <Modal title="Run log" aria-label="Run log" wide onClose={close}>
          <Log
            runs={runs}
            open={setReview}
            practice={close}
            units={prefs.units}
          />
        </Modal>
      )}
      {review && (
        <Modal
          title={dialog === 'run-log' ? 'Run details' : 'Run review'}
          onClose={() => setReview(null)}
        >
          <RunDetails
            record={review}
            units={prefs.units}
            again={() => {
              configure(review.setup)
              start(false, review.setup)
            }}
            close={() => setReview(null)}
          />
          {!saved && (
            <p className="fine-print">
              Storage is unavailable. This run is available for the current
              visit.
            </p>
          )}
        </Modal>
      )}
      {dialog === 'settings' && (
        <Modal title="Settings" onClose={close}>
          <div className="settings-content">
            <div className="setting-group">
              <span className="field-label">Display units</span>
              <SchemeTabs<Prefs['units']>
                value={prefs.units}
                label="Display units"
                items={[
                  { id: 'metric', name: 'Metric · km/h' },
                  { id: 'imperial', name: 'Imperial · mph' },
                ]}
                onChange={(units) => setPrefs((p) => ({ ...p, units }))}
              />
            </div>
            <div className="setting-group">
              <Toggle label="Slope audio" on={prefs.sound} change={sound} />
              <Toggle
                label="Always show touch controls"
                on={prefs.touch}
                change={() => setPrefs((p) => ({ ...p, touch: !p.touch }))}
              />
              <Toggle
                label="Show gate line"
                on={prefs.line}
                change={() => setPrefs((p) => ({ ...p, line: !p.line }))}
              />
            </div>
            <div className="install-card">
              <span className="install-icon">
                <Download size={20} />
              </span>
              <div>
                <h3>Fallline offline</h3>
                <p>
                  {offline.cached
                    ? 'The mountain, equipment, and lessons are cached on this device.'
                    : 'The production app caches its courses and lessons on your first visit.'}
                </p>
              </div>
            </div>
            {offline.installed ? (
              <p className="installed">
                <Check size={14} />
                App installed
              </p>
            ) : offline.canInstall ? (
              <button className="outline-btn" onClick={offline.install}>
                <Download size={14} />
                Install Fallline
              </button>
            ) : (
              <details className="install-help">
                <summary>Install on this device</summary>
                <p>
                  Choose Install app from the browser menu. On iPhone or iPad,
                  open Share in Safari and choose Add to Home Screen.
                </p>
              </details>
            )}
          </div>
        </Modal>
      )}
    </main>
  )
}
