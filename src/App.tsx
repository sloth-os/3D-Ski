import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Check,
  Download,
  Gamepad2,
  History,
  Keyboard,
  Settings,
  Waypoints,
} from 'lucide-react'
import { techniques, type Setup, type TechniqueId } from './course.ts'
import { referenceRun, type Run } from './physics.ts'
import {
  appendRun,
  initialLog,
  initialPrefs,
  initialSetup,
  write,
  type Prefs,
} from './storage.ts'
import { Brand, Modal, SchemeTabs, Toggle } from './UI.tsx'
import { skiingKeys, useRun } from './useRun.ts'
import { Viewport } from './Viewport.tsx'
import { Telemetry } from './Telemetry.tsx'
import {
  Controls,
  Log,
  RunDetails,
  SetupPanel,
  TelemetryHelp,
} from './Panels.tsx'
import { Lab } from './Lab.tsx'
import { useOffline } from './offline.ts'
import type { CameraMode } from './mountain.ts'

const navigation = [
  { id: 'simulator', name: 'Simulator', icon: Gamepad2 },
  { id: 'technique-lab', name: 'Technique lab', icon: BookOpen },
  { id: 'run-log', name: 'Run log', icon: History },
] as const
type Page = (typeof navigation)[number]['id']
type Dialog = 'controls' | 'settings' | 'telemetry' | null
const fromHash = (): Page =>
  navigation.find((n) => '#' + n.id === window.location.hash)?.id ?? 'simulator'
const cameraModes: CameraMode[] = ['chase', 'wide', 'first']

export default function App() {
  const [page, setPage] = useState<Page>(fromHash),
    [setup, setSetup] = useState<Setup>(initialSetup),
    [prefs, setPrefs] = useState(initialPrefs)
  const [runs, setRuns] = useState(initialLog),
    logRef = useRef(runs),
    [review, setReview] = useState<Run | null>(null),
    [dialog, setDialog] = useState<Dialog>(null)
  const [labId, setLabId] = useState<TechniqueId>(setup.technique),
    [camera, setCamera] = useState<CameraMode>('chase'),
    [inspect, setInspect] = useState(false)
  const [storageOk, setStorageOk] = useState(true),
    offline = useOffline()
  const storeRun = useCallback((result: Run) => {
    const next = [result, ...logRef.current].slice(0, 200)
    logRef.current = next
    setRuns(next)
    void appendRun(result, next).then(({ records, saved }) => {
      logRef.current = records
      setRuns(records)
      setStorageOk(saved)
    })
    setReview(result)
    setInspect(false)
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {})
  }, [])
  const run = useRun(setup, prefs.sound, storeRun)
  const reference = useMemo(() => referenceRun(setup), [setup])
  useEffect(() => {
    const refresh = (e: StorageEvent) => {
      if (e.key === 'fallline.runs') {
        const records = initialLog()
        logRef.current = records
        setRuns(records)
      }
    }
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])
  useEffect(() => {
    write('setup', setup)
  }, [setup])
  useEffect(() => {
    write('preferences', prefs)
  }, [prefs])
  useEffect(() => {
    const change = () => {
      run.pause()
      setPage(fromHash())
      setDialog(null)
      setReview(null)
    }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [run.pause])
  useEffect(() => {
    document.title = navigation.find((n) => n.id === page)!.name + ' · Fallline'
  }, [page])
  function navigate(next: Page) {
    if (next !== page) run.pause()
    if (window.location.hash !== '#' + next)
      window.history.pushState(null, '', '#' + next)
    setPage(next)
    setDialog(null)
    setReview(null)
    window.scrollTo({ top: 0 })
  }
  function modal(what: Dialog) {
    if (what) run.pause()
    setDialog(what)
  }
  function updateSetup(s: Setup) {
    if (run.phase === 'demo') run.end()
    setSetup(s)
    setInspect(false)
    setCamera('chase')
  }
  function start(demo = false) {
    setInspect(false)
    run.start(demo)
    requestAnimationFrame(() => {
      const view = document.querySelector<HTMLElement>('.viewport')
      view?.focus({ preventScroll: true })
      if (window.matchMedia('(max-width:680px)').matches)
        view?.scrollIntoView({ block: 'start' })
    })
  }
  function startWith(s: Setup, demo = false) {
    if (run.phase !== 'preview') run.end()
    navigate('simulator')
    updateSetup({ ...s })
    setReview(null)
    setDialog(null)
    start(demo)
  }
  function soundToggle() {
    if (!prefs.sound) run.audio.current.enable()
    else run.audio.current.update(0, 0, false)
    setPrefs((p) => ({ ...p, sound: !p.sound }))
  }
  function toggleAid(k: 'line' | 'forces') {
    setPrefs((p) => ({ ...p, [k]: !p[k] }))
    if (run.phase === 'preview') setInspect(true)
  }
  function openLab() {
    setLabId(setup.technique)
    navigate('technique-lab')
  }
  const keyHandler = useRef<(e: KeyboardEvent, down: boolean) => void>(() => {})
  keyHandler.current = (e, down) => {
    const el = e.target as HTMLElement
    const isSkiKey = skiingKeys.has(e.code)
    if (!down) {
      if (isSkiKey) run.keys.current.delete(e.code)
      return
    }
    if (
      e.altKey ||
      e.ctrlKey ||
      e.metaKey ||
      dialog ||
      review ||
      page !== 'simulator' ||
      el.matches('input, select, textarea, [contenteditable=true]')
    )
      return
    if (e.key === '?') {
      e.preventDefault()
      modal('controls')
      return
    }
    if (run.phase === 'running' && isSkiKey) {
      if (e.code === 'Space' && el.closest('button,summary,a')) return
      e.preventDefault()
      run.keys.current.add(e.code)
      return
    }
    if (e.repeat) return
    if (e.code === 'Enter' && !el.closest('button,summary,a')) {
      if (run.phase === 'preview' || run.phase === 'demo') {
        e.preventDefault()
        start()
      } else if (run.phase === 'paused') {
        e.preventDefault()
        run.resume()
      }
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (run.phase === 'running' || run.phase === 'demo') {
        e.preventDefault()
        run.pause()
      } else if (run.phase === 'paused' && e.code === 'KeyP') {
        e.preventDefault()
        run.resume()
      }
    }
    if (e.code === 'KeyC') {
      setCamera(
        cameraModes[(cameraModes.indexOf(camera) + 1) % cameraModes.length],
      )
      if (run.phase === 'preview') setInspect(true)
    }
  }
  useEffect(() => {
    const down = (e: KeyboardEvent) => keyHandler.current(e, true),
      up = (e: KeyboardEvent) => keyHandler.current(e, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])
  const live = run.phase !== 'preview'
  let cue = techniques[setup.technique].cue as string
  if (live && Math.abs(run.frame.x) > 21)
    cue =
      'You are near the edge of the piste. Release the outside turn and guide both skis back toward the next gate.'
  else if (live && run.frame.brake > 0.6)
    cue =
      'Braking increases skidding friction. Ease off as your speed comes under control.'
  else if (live && run.frame.tuck > 0.65)
    cue =
      'Your lower stance reduces air drag. Watch how speed builds along the fall line.'
  else if (live && Math.abs(run.frame.edge) > 30)
    cue =
      'Pressure is building on the outside ski. Ease the edge angle before changing direction.'
  else if (live && run.frame.flex > 0.7)
    cue =
      'Flexion lets the legs absorb changes in the snow while the upper body stays quiet.'
  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <a
            href="#simulator"
            className="brand-link"
            aria-label="Fallline simulator home"
            onClick={(e) => {
              e.preventDefault()
              navigate('simulator')
            }}
          >
            <Brand />
          </a>
          <nav aria-label="Main navigation">
            {navigation.map((n) => (
              <a
                key={n.id}
                href={'#' + n.id}
                onClick={(e) => {
                  e.preventDefault()
                  navigate(n.id)
                }}
                className={page === n.id ? 'active' : ''}
                aria-current={page === n.id ? 'page' : undefined}
              >
                <n.icon size={16} />
                {n.name}
              </a>
            ))}
          </nav>
          <div className="header-right">
            <span className="connect-status">
              <i />
              {!offline.online
                ? 'Offline mode'
                : offline.cached
                  ? 'Offline ready'
                  : 'Local session'}
            </span>
            <span className="header-divider" />
            <button
              className="settings-btn"
              aria-label="Settings"
              title="Settings"
              onClick={() => modal('settings')}
            >
              <Settings size={19} />
            </button>
          </div>
        </div>
      </header>
      <main className="main-shell" id="main-content">
        {page === 'simulator' && (
          <>
            <div className="page-heading">
              <div>
                <h1>Slope simulator</h1>
                <p>
                  Practice your technique in an interactive alpine environment.
                </p>
              </div>
              <button
                className="outline-btn controls-trigger"
                onClick={() => modal('controls')}
              >
                <Keyboard size={17} />
                Controls
              </button>
            </div>
            <div className="sim-grid">
              <Viewport
                run={run}
                setup={setup}
                prefs={prefs}
                toggleSound={soundToggle}
                camera={camera}
                setCamera={setCamera}
                inspect={inspect}
                setInspect={setInspect}
                watch={() => start(true)}
              />
              <SetupPanel
                setup={setup}
                update={updateSetup}
                run={run}
                prefs={prefs}
                toggle={toggleAid}
                start={() => start()}
              />
            </div>
            <Telemetry
              samples={live ? run.samples : reference}
              preview={!live}
              units={prefs.units}
              about={() => modal('telemetry')}
            />
            <section className="coaching-panel">
              <span className="coach-icon">
                <Waypoints size={23} />
              </span>
              <div>
                <span className="eyebrow">Technique focus</span>
                <h2>{techniques[setup.technique].name}</h2>
                <p>{cue}</p>
              </div>
              <button className="outline-btn" onClick={openLab}>
                Technique lab
                <ArrowRight size={15} />
              </button>
            </section>
          </>
        )}
        {page === 'technique-lab' && (
          <Lab
            id={labId}
            select={setLabId}
            practice={(id, demo) =>
              startWith({ ...setup, technique: id }, demo)
            }
            units={prefs.units}
          />
        )}
        {page === 'run-log' && (
          <Log
            runs={runs}
            open={setReview}
            practice={() => navigate('simulator')}
            units={prefs.units}
          />
        )}
      </main>
      {dialog === 'controls' && (
        <Modal title="Run controls" onClose={() => setDialog(null)}>
          <Controls />
        </Modal>
      )}
      {dialog === 'telemetry' && (
        <Modal title="Reading your telemetry" onClose={() => setDialog(null)}>
          <TelemetryHelp />
        </Modal>
      )}
      {dialog === 'settings' && (
        <Modal title="Settings" onClose={() => setDialog(null)}>
          <div className="settings-content">
            <div className="setting-group">
              <span className="field-label">Display units</span>
              <SchemeTabs<Prefs['units']>
                label="Display units"
                value={prefs.units}
                items={[
                  { id: 'metric', name: 'Metric · km/h' },
                  { id: 'imperial', name: 'Imperial · mph' },
                ]}
                onChange={(units) => setPrefs((p) => ({ ...p, units }))}
              />
            </div>
            <div className="setting-group">
              <Toggle
                label="Slope audio"
                on={prefs.sound}
                change={soundToggle}
              />
              <Toggle
                label="Always show touch controls"
                on={prefs.touch}
                change={() => setPrefs((p) => ({ ...p, touch: !p.touch }))}
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
                    ? 'Courses, audio, and lessons are saved for offline practice.'
                    : 'The production app saves courses and lessons on the first visit for offline practice.'}
                </p>
              </div>
            </div>
            {offline.installed ? (
              <p className="installed">
                <Check size={15} />
                App installed
              </p>
            ) : offline.canInstall ? (
              <button className="outline-btn" onClick={offline.install}>
                <Download size={15} />
                Install Fallline
              </button>
            ) : (
              <details className="install-help">
                <summary>Install on this device</summary>
                <p>
                  In Chrome or Edge, choose Install app from the browser menu.
                  In Safari on iPhone or iPad, open Share and choose Add to Home
                  Screen.
                </p>
              </details>
            )}
          </div>
        </Modal>
      )}
      {review && (
        <Modal
          title={page === 'run-log' ? 'Run details' : 'Run review'}
          onClose={() => setReview(null)}
        >
          <RunDetails
            record={review}
            units={prefs.units}
            again={() => startWith(review.setup)}
            close={() => setReview(null)}
          />
          {!storageOk && (
            <p role="status" className="fine-print">
              Device storage is unavailable. This run is available for the
              current visit.
            </p>
          )}
        </Modal>
      )}
    </>
  )
}
