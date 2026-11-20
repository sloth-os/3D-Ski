import { isSafety, isFall } from './safety.ts'
import { lessonsFor, sportFor } from './library.ts'
import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Axis3d,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  CircleDot,
  Flag,
  Footprints,
  GripHorizontal,
  Layers3,
  MountainSnow,
  Pause,
  PersonStanding,
  Play,
  Route,
  SkipForward,
  SlidersHorizontal,
  Snowflake,
  Square,
  Timer,
  Waves,
  Wind,
} from 'lucide-react'
import {
  isTrick,
  isSpin,
  usesPose,
  tricks,
  requiredSpin,
  type TrickId,
} from './tricks.ts'
import { trickPhase } from './air.ts'
import { cameras, type CameraMode } from './cameras.ts'
import { analyse, riderPose, riderMass, type Lens } from './analysis.ts'
import {
  courses,
  surfaces,
  techniques,
  equipmentFor,
  startsSwitch,
  isSwitchDrill,
  stanceLabel,
  type Setup,
  type CourseId,
  type SurfaceId,
  type TechniqueId,
  type Equipment,
} from './course.ts'
import { lineAt, type Frame } from './physics.ts'
import { lengthText, type Prefs } from './storage.ts'
import { cancelPop, type TrainingRun } from './useRun.ts'
import { SchemeTabs, SelectField, Toggle } from './UI.tsx'

export function TrailMap({
  run,
  setup,
  units,
}: {
  run: TrainingRun
  setup: Setup
  units: Prefs['units']
}) {
  const c = courses[setup.course],
    f = run.frame,
    ready = run.phase === 'preview',
    d = ready ? 0 : f.d
  const project = (distance: number, x: number) => [
    30 + (distance / c.length) * 95 + x * 1.3,
    88 - (distance / c.length) * 73 + x * 0.35,
  ]
  const points = useMemo(
    () =>
      Array.from({ length: 130 }, (_, i) => {
        const k = (i / 129) * c.length
        return project(k, lineAt(run.gates, k)).join(',')
      }).join(' '),
    [c, run.gates],
  )
  const [px, py] = project(d, ready ? 0 : f.x)
  return (
    <div
      className="nav-map"
      aria-label={
        'Course map, ' + Math.floor((d / c.length) * 100) + ' percent complete'
      }
    >
      <header>
        <Route size={13} />
        <span>Trail map</span>
        <b>N ↑</b>
      </header>
      <svg viewBox="0 0 160 101" aria-hidden="true">
        <g fill="none" stroke="#abc5b6" opacity=".25" strokeWidth=".65">
          {Array.from({ length: 19 }, (_, i) => (
            <path
              key={i}
              d={
                'M' +
                (-89 + i * 12) +
                ' -8c38 22 5 27 26 43s37 12 44 37 17 25 34 35'
              }
            />
          ))}
        </g>
        <polyline
          points={points}
          stroke="#192c29"
          strokeWidth="5"
          fill="none"
        />
        <polyline
          points={points}
          stroke="#d1e8a3"
          strokeWidth="1.7"
          fill="none"
          strokeLinejoin="round"
        />
        <circle cx="125" cy="15" r="3" fill="#ecf4ed" />
        <circle cx={px} cy={py} r="8" fill="#b9fb8d" opacity=".22" />
        <circle
          cx={px}
          cy={py}
          r="3.4"
          fill="#d2f88f"
          stroke="white"
          strokeWidth="1.3"
        />
      </svg>
      <footer>
        <Flag size={11} />
        {ready ? c.gates + ' gates' : f.gatesHit + ' / ' + c.gates}
        <span>{lengthText(ready ? c.length : c.length - d, units)}</span>
      </footer>
    </div>
  )
}
export function InstrumentPanel({
  setup,
  frame,
  prefs,
  lens,
  setLens,
  toggle,
  details,
}: {
  setup: Setup
  frame: Frame
  prefs: Prefs
  lens: Lens
  setLens: (v: Lens) => void
  toggle: () => void
  details: () => void
}) {
  const [compact, setCompact] = useState(
    () => matchMedia('(max-width: 780px), (max-height: 560px)').matches,
  )
  const a = analyse(frame, setup),
    p = riderPose(frame, setup),
    board = equipmentFor(setup.technique) === 'snowboard'
  const rows =
    lens === 'forces'
      ? [
          {
            icon: ArrowUpRight,
            label: 'Snow reaction',
            value: Math.round(a.reactionN),
            unit: 'N',
            tint: 'green',
          },
          {
            icon: ArrowDown,
            label: 'Gravity',
            value: Math.round(a.weightN),
            unit: 'N',
            tint: 'amber',
          },
          {
            icon: Wind,
            label: 'Air drag',
            value: Math.round(a.dragN),
            unit: 'N',
            tint: 'sky',
          },
        ]
      : lens === 'body'
        ? [
            {
              icon: PersonStanding,
              label: 'Knee flexion',
              value: Math.round(p.legs[p.outside].angle),
              unit: '°',
              tint: 'violet',
            },
            {
              icon: ArrowDownRight,
              label: 'Body inclination',
              value: Math.round((Math.abs(p.lean) * 180) / Math.PI),
              unit: '°',
              tint: 'amber',
            },
            {
              icon: CircleDot,
              label: 'COM height',
              value: p.comHeight.toFixed(2),
              unit: 'm',
              tint: 'green',
            },
          ]
        : [
            {
              icon: Footprints,
              label: 'Normal load',
              value: Math.round(a.normalN),
              unit: 'N',
              tint: 'green',
            },
            {
              icon: GripHorizontal,
              label: 'Snow resistance',
              value: Math.round(a.frictionN),
              unit: 'N',
              tint: 'amber',
            },
            {
              icon: Layers3,
              label: 'Contact pressure',
              value: a.pressureKpa.toFixed(1),
              unit: 'kPa',
              tint: 'sky',
            },
          ]
  return (
    <aside className={'force-console glass ' + (compact ? 'compact' : '')}>
      <button
        className="console-heading"
        aria-expanded={!compact}
        aria-label={
          compact ? 'Expand force analysis' : 'Collapse force analysis'
        }
        onClick={() => setCompact(!compact)}
      >
        <Axis3d size={19} />
        <strong>Force analysis</strong>
        {compact ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      {!compact && (
        <div className="console-content">
          <div className="lens-tabs" aria-label="Analysis layer">
            {(['forces', 'body', 'contact'] as Lens[]).map((v) => (
              <button
                key={v}
                aria-pressed={v === lens}
                onClick={() => setLens(v)}
              >
                {v === 'forces' ? 'Forces' : v === 'body' ? 'Body' : 'Contact'}
              </button>
            ))}
          </div>
          <div className="force-rows">
            {rows.map((r) => (
              <button
                title="Inspect this frame"
                key={r.label}
                onClick={details}
              >
                <i className={r.tint}>
                  <r.icon size={15} />
                </i>
                <span>{r.label}</span>
                <b>
                  {r.value}
                  <small>{r.unit}</small>
                </b>
              </button>
            ))}
          </div>
          <div
            className="load-split"
            data-airborne={frame.air.phase === 'flight'}
          >
            <header>
              <span>{board ? 'Binding load' : 'Ski pressure'}</span>
              <b>
                {frame.air.phase === 'flight'
                  ? 'Airborne'
                  : Math.round(a.firstShare * 100) +
                    ' / ' +
                    (100 - Math.round(a.firstShare * 100))}
              </b>
            </header>
            <div>
              <i style={{ width: a.firstShare * 100 + '%' }} />
            </div>
            <footer>
              <span>
                {board
                  ? frame.air.switch
                    ? 'Nose · trailing'
                    : 'Front'
                  : 'Left'}
              </span>
              <span>
                {board
                  ? frame.air.switch
                    ? 'Tail · leading'
                    : 'Rear'
                  : 'Right'}
              </span>
            </footer>
          </div>
          <Toggle label="3D overlays" on={prefs.forces} change={toggle} />
        </div>
      )}
    </aside>
  )
}
export function FrameInspector({ f, setup }: { f: Frame; setup: Setup }) {
  const a = analyse(f, setup),
    p = riderPose(f, setup),
    board = equipmentFor(setup.technique) === 'snowboard'
  return (
    <div className="frame-inspector">
      <p className="modal-intro">
        This frame uses a {riderMass} kg rider on{' '}
        {surfaces[setup.surface].name.toLowerCase()} snow. Vectors are scaled
        together in the world. Components below use right, up, and uphill as
        positive axes.
      </p>
      <table>
        <caption>Forces in newtons</caption>
        <thead>
          <tr>
            <th>Force</th>
            <th>Right</th>
            <th>Up</th>
            <th>Uphill</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Gravity', a.weight],
            ['Snow reaction', a.reaction],
            ['Air drag', a.drag],
            ['Net force', a.net],
          ].map(([name, v]) => (
            <tr key={String(name)}>
              <th>{String(name)}</th>
              {(v as number[]).map((n, i) => (
                <td key={i}>{Math.round(n)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Snow reaction combines support perpendicular to the surface, lateral
        edge force, and sliding resistance. The sum of the three external forces
        gives the modeled net force.
      </p>
      <div className="frame-grid">
        {[
          [
            board
              ? f.air.switch
                ? 'Left knee · trailing'
                : 'Front knee'
              : 'Left knee',
            Math.round(p.legs[0].angle) + '°',
          ],
          [
            board
              ? f.air.switch
                ? 'Right knee · leading'
                : 'Rear knee'
              : 'Right knee',
            Math.round(p.legs[1].angle) + '°',
          ],
          ['Loaded edge', a.edgeName],
          ['Riding stance', stanceLabel(board, f.air.switch)],
          [
            f.safety
              ? 'Drill phase'
              : isTrick(setup.technique)
                ? 'Trick phase'
                : 'Turn phase',
            a.phase,
          ],
          ...(isFall(setup.technique)
            ? [
                ['Body support on snow', Math.round(a.bodySupportN) + ' N'],
                [
                  'Equipment support',
                  Math.round(a.contacts[0] + a.contacts[1]) + ' N',
                ],
              ]
            : []),
          ['Normal load', Math.round(a.normalN) + ' N'],
          ['Apparent load', a.loadG.toFixed(2) + ' g'],
          ...(isTrick(setup.technique)
            ? [
                ['Airtime', f.air.elapsed.toFixed(2) + ' s'],
                ['Peak lift', f.air.peak.toFixed(2) + ' m'],
                ['Rotation', Math.round((f.air.spin * 180) / Math.PI) + '°'],
              ]
            : []),
        ].map(([key, val]) => (
          <div key={key}>
            <small>{key}</small>
            <b>{val}</b>
          </div>
        ))}
      </div>
      <p>
        Joint angles come from the animated leg segments. Contact pressure uses
        an estimated contact area of {Math.round(a.area * 10000)} cm². These
        readings describe the simulated rider.
      </p>
    </div>
  )
}
export function FlightInstruments({
  run,
  freestyle,
  units,
  details,
}: {
  freestyle: boolean
  run: TrainingRun
  units: Prefs['units']
  details: () => void
}) {
  const f = run.frame,
    metric = units === 'metric',
    v = f.speed * (metric ? 3.6 : 2.23694)
  return (
    <button
      className="flight-instruments"
      onClick={details}
      aria-label="Inspect telemetry"
    >
      <span className="hud-kicker">
        <i />
        {run.phase === 'preview'
          ? 'Reference telemetry'
          : run.phase === 'paused'
            ? 'Frame held'
            : 'Live telemetry'}
      </span>
      <span className="instrument-line">
        <span className="primary-reading">
          <b className="readout-speed">{v.toFixed(1)}</b>
          <small>{metric ? 'km/h' : 'mph'}</small>
        </span>
        <span className="secondary-reading">
          <b>
            {f.safety
              ? (f.safety.actionAt < 0
                  ? '0.0'
                  : (
                      (f.safety.restAt >= 0 ? f.safety.restAt : f.t) -
                      f.safety.actionAt
                    ).toFixed(1)) + 's'
              : freestyle
                ? f.air.elapsed.toFixed(2) + 's'
                : Math.round(Math.abs(f.edge)) + '°'}
          </b>
          <small>
            {f.safety ? 'Time in motion' : freestyle ? 'Airtime' : 'Edge angle'}
          </small>
        </span>
        <span className="secondary-reading">
          <b>
            {f.safety
              ? (
                  (f.safety.actionAt < 0 ? 0 : f.d - f.safety.actionDistance) *
                  (metric ? 1 : 3.28084)
                ).toFixed(1)
              : freestyle
                ? Math.round((f.air.spin * 180) / Math.PI) + '°'
                : Number.isFinite(f.radius)
                  ? (f.radius * (metric ? 1 : 3.28084)).toFixed(1)
                  : '∞'}
            {!freestyle && <em>{metric ? 'm' : 'ft'}</em>}
          </b>
          <small>
            {f.safety ? 'Since response' : freestyle ? 'Spin' : 'Turn radius'}
          </small>
        </span>
      </span>
    </button>
  )
}
export function Dock({
  run,
  camera,
  changeCamera,
  start,
  setup,
  controls,
}: {
  run: TrainingRun
  camera: CameraMode
  changeCamera: (v: CameraMode) => void
  start: (demo?: boolean) => void
  setup: () => void
  controls: () => void
}) {
  const preview = run.phase === 'preview',
    paused = run.phase === 'paused',
    demo = run.phase === 'demo' || (paused && run.automated)
  return (
    <div className="command-dock glass">
      <div className="play-controls">
        {preview || demo ? (
          <button className="launch" onClick={() => start()}>
            <Play size={16} fill="currentColor" />
            Start run<kbd>↵</kbd>
          </button>
        ) : (
          <button className="launch" onClick={paused ? run.resume : run.pause}>
            {paused ? <Play size={16} /> : <Pause size={16} />}{' '}
            {paused ? 'Resume' : 'Pause'}
            <kbd>P</kbd>
          </button>
        )}
        {preview ? (
          <button className="demo-key" onClick={() => start(true)}>
            <Play size={14} />
            Watch demo
          </button>
        ) : (
          <>
            <button className="demo-key" onClick={run.end}>
              <Square size={13} />
              {demo ? 'Stop demo' : 'End run'}
            </button>
            {demo && (
              <button
                className="dock-icon"
                aria-label={paused ? 'Resume demo' : 'Pause demo'}
                onClick={paused ? run.resume : run.pause}
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}
              </button>
            )}
          </>
        )}
      </div>
      <div className="capture-controls">
        <label className="dock-select">
          <Camera />
          <span>
            <small>Camera</small>
            <select
              aria-label="Camera view"
              value={camera}
              onChange={(e) => changeCamera(e.target.value as CameraMode)}
            >
              {cameras.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </span>
          <ChevronDown size={12} />
        </label>
        <label className="dock-select rate-select">
          <Timer />
          <span>
            <small>Playback</small>
            <select
              aria-label="Playback speed"
              value={run.rate}
              onChange={(e) => run.setRate(Number(e.target.value))}
            >
              {[1, 0.5, 0.25].map((n) => (
                <option key={n} value={n}>
                  {n}×
                </option>
              ))}
            </select>
          </span>
          <ChevronDown size={12} />
        </label>
        {paused && (
          <button
            className="dock-icon"
            title="Advance one physics frame"
            aria-label="Step one frame"
            onClick={run.singleStep}
          >
            <SkipForward size={16} />
          </button>
        )}
      </div>
      <div className="dock-utilities">
        <button onClick={setup}>
          <SlidersHorizontal size={16} />
          <span>Run setup</span>
        </button>
        <button
          onClick={controls}
          className="controls-key"
          aria-label="Controls"
        >
          <kbd>?</kbd>
          <span>Controls</span>
        </button>
      </div>
    </div>
  )
}
export function TouchPad({
  run,
  force,
  technique,
}: {
  run: TrainingRun
  force: boolean
  technique: TechniqueId
}) {
  if (run.phase !== 'running') return null
  function cancel(key: string) {
    if (key === 'jump' && run.keys.current.has(key))
      cancelPop(run.current.current)
    run.keys.current.delete(key)
  }
  const button = (key: string, label: string, icon: React.ReactNode) => (
    <button
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        run.keys.current.add(key)
      }}
      onPointerCancel={() => cancel(key)}
      onPointerUp={() => run.keys.current.delete(key)}
      onLostPointerCapture={() => cancel(key)}
    >
      {icon}
    </button>
  )
  return (
    <div className={'ski-pad ' + (force ? 'force' : '')}>
      <div>
        {!isSafety(technique) && button('left', 'Steer left', <ArrowLeft />)}
        {!isSafety(technique) && button('right', 'Steer right', <ArrowRight />)}
      </div>
      <div>
        {isTrick(technique) &&
          button('jump', 'Hold to load, release to jump', <small>Pop</small>)}
        {isTrick(technique) &&
          usesPose(technique) &&
          button('pose', 'Hold the trick pose', <small>Pose</small>)}
        {!isSafety(technique) && button('tuck', 'Tuck', <ArrowUp />)}
        {(!isSafety(technique) || isFall(technique)) &&
          button(
            'flex',
            'Flex legs',
            isFall(technique) ? <small>Flex</small> : <ChevronsDown />,
          )}
        {!isFall(technique) && button('brake', 'Brake', <small>Brake</small>)}
      </div>
    </div>
  )
}
export function Loadout({
  setup,
  prefs,
  apply,
  toggle,
  inRun,
}: {
  setup: Setup
  prefs: Prefs
  apply: (s: Setup) => void
  toggle: () => void
  inRun: boolean
}) {
  const [draft, setDraft] = useState<Setup>({ ...setup }),
    gear = equipmentFor(draft.technique)
  const options = lessonsFor(sportFor(draft.technique))
  return (
    <div className="loadout">
      <div className="field-label">Terrain</div>
      <div className="course-choices">
        {(Object.keys(courses) as CourseId[]).map((id) => (
          <button
            key={id}
            data-course={id}
            aria-pressed={draft.course === id}
            onClick={() => setDraft({ ...draft, course: id })}
            style={{
              backgroundImage:
                'linear-gradient(0deg,#08141be8,transparent),url(' +
                import.meta.env.BASE_URL +
                courses[id].image +
                ')',
            }}
          >
            <strong>{courses[id].name}</strong>
            <span>
              {courses[id].level} · {courses[id].pitch}°
            </span>
            {draft.course === id && <Check size={15} />}
          </button>
        ))}
      </div>
      <div className="setting-group">
        <span className="field-label">Equipment</span>
        <SchemeTabs<Equipment>
          value={gear}
          label="Equipment"
          items={[
            { id: 'skis', name: 'Alpine skis', icon: <MountainSnow /> },
            { id: 'snowboard', name: 'Snowboard', icon: <Layers3 /> },
          ]}
          onChange={(v) => {
            if (v !== gear)
              setDraft({
                ...draft,
                technique: v === 'skis' ? 'parallel' : 'boardCarve',
              })
          }}
        />
      </div>
      <SelectField
        id="technique"
        label="Technique"
        value={draft.technique}
        icon={<Route size={16} />}
        items={options.map((value) => ({
          value,
          name: techniques[value].name,
        }))}
        onChange={(v) => setDraft({ ...draft, technique: v as TechniqueId })}
      />
      <div className="setting-group">
        <span className="field-label">Starting stance</span>
        {isSafety(draft.technique) ? (
          <p className="stance-note">
            {gear === 'snowboard'
              ? 'Regular · left foot leads'
              : 'Forward · tips first'}{' '}
            for this drill.
          </p>
        ) : isSwitchDrill(draft.technique) ? (
          <p className="stance-note">
            {stanceLabel(gear === 'snowboard', true)} · This drill starts
            switch.
          </p>
        ) : (
          <SchemeTabs<'forward' | 'switch'>
            label="Starting stance"
            value={startsSwitch(draft) ? 'switch' : 'forward'}
            onChange={(stance) => setDraft({ ...draft, stance })}
            items={[
              {
                id: 'forward',
                name:
                  gear === 'snowboard'
                    ? 'Regular · left foot leads'
                    : 'Forward · tips first',
              },
              {
                id: 'switch',
                name:
                  gear === 'snowboard'
                    ? 'Switch · right foot leads'
                    : 'Backwards · tails first',
              },
            ]}
          />
        )}
      </div>
      {draft.technique === 'boardStop' && (
        <SelectField
          id="setup-stop-edge"
          label="Uphill edge"
          value={draft.stopEdge ?? 'heel'}
          icon={<Layers3 size={16} />}
          items={[
            { value: 'heel', name: 'Heel edge' },
            { value: 'toe', name: 'Toe edge' },
          ]}
          onChange={(v) =>
            setDraft({ ...draft, stopEdge: v as 'heel' | 'toe' })
          }
        />
      )}
      <div className="setting-group">
        <span className="field-label">Snow surface</span>
        <SchemeTabs<SurfaceId>
          value={draft.surface}
          label="Snow surface"
          items={[
            { id: 'groomed', name: 'Groomed', icon: <Waves /> },
            { id: 'powder', name: 'Powder', icon: <Snowflake /> },
            { id: 'ice', name: 'Icy', icon: <Layers3 /> },
          ]}
          onChange={(v) => setDraft({ ...draft, surface: v })}
        />
      </div>
      <Toggle label="Show gate line" on={prefs.line} change={toggle} />
      <button className="primary" onClick={() => apply(draft)}>
        {inRun ? 'Save run & apply' : 'Apply setup'}
        <ArrowRight size={16} />
      </button>
    </div>
  )
}

export function TrickHUD({
  frame: f,
  id,
  preview,
}: {
  frame: Frame
  id: TrickId
  preview: boolean
}) {
  const a = f.air,
    landed =
      !preview &&
      (a.phase === 'landing' || a.phase === 'ready') &&
      a.result &&
      f.t - a.landedAt < 1.8,
    flight = a.phase === 'flight'
  const caption = preview ? 'Reference jump' : landed ? a.result : trickPhase(f)
  const percent =
    a.phase === 'load'
      ? a.charge
      : flight
        ? Math.min(1, a.elapsed / a.duration)
        : 0
  const spin = requiredSpin(id, a.switch)
  const spinHint =
    spin < 0
      ? '← · Spin left'
      : spin > 0
        ? '→ · Spin right'
        : '← / → · Set spin'
  const action = usesPose(id) ? 'K · Hold pose' : isSpin(id) ? spinHint : ''
  return (
    <section
      className="trick-hud"
      aria-label="Trick practice"
      data-phase={a.phase}
      data-stance={a.switch ? 'switch' : 'forward'}
    >
      <div className="hud-kicker">
        <i />
        {caption}
        {landed && a.award > 0 ? ' +' + a.award : ''}
      </div>
      <header>
        <strong>{tricks[id].name}</strong>
        <span>
          {a.switch
            ? 'Switch'
            : equipmentFor(id) === 'snowboard'
              ? 'Regular'
              : 'Forward'}
        </span>
      </header>
      <div
        className="jump-meter"
        role="meter"
        aria-label={flight ? 'Flight progress' : 'Pop charge'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent * 100)}
      >
        <i style={{ width: 100 * percent + '%' }} />
      </div>
      <footer>
        <span className="key-hint">
          {a.phase === 'load'
            ? Math.round(a.charge * 100) + '% · Release J'
            : 'J · Hold & release'}
        </span>
        <span className="touch-hint">
          {a.phase === 'load' ? 'Release Pop' : 'Hold & release Pop'}
        </span>
        {action && (
          <>
            <span className="key-hint">{action}</span>
            <span className="touch-hint">
              {usesPose(id)
                ? 'Hold Pose'
                : spin < 0
                  ? 'Hold ← at pop'
                  : spin > 0
                    ? 'Hold → at pop'
                    : 'Steer at pop'}
            </span>
          </>
        )}
      </footer>
    </section>
  )
}
