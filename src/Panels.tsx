import {
  ArrowRight,
  Flag,
  Focus,
  Gamepad2,
  History,
  MountainSnow,
  Pause,
  Play,
  Route,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Trophy,
  Waves,
  Waypoints,
} from 'lucide-react'
import {
  courses,
  surfaces,
  techniques,
  type CourseId,
  type Setup,
  type SurfaceId,
  type TechniqueId,
} from './course.ts'
import { duration, lengthText, type Prefs } from './storage.ts'
import { type Run } from './physics.ts'
import { SchemeTabs, SelectField, Toggle } from './UI.tsx'
import type { TrainingRun } from './useRun.ts'

const surfaceIcons = {
  groomed: <Waves size={16} />,
  powder: <Snowflake size={16} />,
  ice: <Sparkles size={16} />,
}
type SetupProps = {
  setup: Setup
  update: (s: Setup) => void
  run: TrainingRun
  prefs: Prefs
  toggle: (key: 'line' | 'forces') => void
  start: () => void
}
export function SetupPanel({
  setup,
  update,
  run,
  prefs,
  toggle,
  start,
}: SetupProps) {
  const preview = run.phase === 'preview' || run.phase === 'demo',
    c = courses[setup.course],
    t = techniques[setup.technique],
    f = run.frame
  return (
    <aside className={'panel setup-panel ' + (preview ? '' : 'active-setup')}>
      <h2>
        <SlidersHorizontal />
        {preview ? 'Session setup' : 'Session in progress'}
      </h2>
      {preview ? (
        <div className="setup-fields">
          <SelectField
            id="terrain"
            label="Terrain"
            value={setup.course}
            icon={<MountainSnow size={17} />}
            items={Object.entries(courses).map(([value, c]) => ({
              value,
              name: c.name,
            }))}
            onChange={(v) => update({ ...setup, course: v as CourseId })}
          />
          <SelectField
            id="technique"
            label="Technique"
            value={setup.technique}
            icon={<Waypoints size={17} />}
            items={Object.entries(techniques).map(([value, t]) => ({
              value,
              name: t.name,
            }))}
            onChange={(v) => update({ ...setup, technique: v as TechniqueId })}
          />
          <div className="field">
            <span className="field-label" id="surface-label">
              Snow surface
            </span>
            <SchemeTabs<SurfaceId>
              value={setup.surface}
              label="Snow surface"
              items={(Object.keys(surfaces) as SurfaceId[]).map((id) => ({
                id,
                name: surfaces[id].name,
                icon: surfaceIcons[id],
              }))}
              onChange={(surface) => update({ ...setup, surface })}
            />
          </div>
        </div>
      ) : (
        <div className="run-insights">
          <div className="run-tech">
            <span className="field-label">Training objective</span>
            <h3>{t.name}</h3>
            <p>{t.objective}</p>
            <span className="edge-target">
              <Focus size={12} />
              Target edge angle{' '}
              <b>
                {t.edge[0]}–{t.edge[1]}°
              </b>
            </span>
          </div>
          <div className="course-progress">
            <div>
              <span>Course progress</span>
              <b>{Math.floor((f.d / c.length) * 100)}%</b>
            </div>
            <progress max={c.length} value={f.d} />
            <small>
              {lengthText(f.d, prefs.units)} of{' '}
              {lengthText(c.length, prefs.units)}
            </small>
          </div>
          <div className="run-pair">
            <div>
              <Flag />
              <b>
                {f.gatesHit} / {c.gates}
              </b>
              <span>Gates cleared</span>
            </div>
            <div>
              <Route />
              <b>{f.turns}</b>
              <span>Linked turns</span>
            </div>
          </div>
        </div>
      )}
      <div className="aids">
        <span className="field-label">Visual aids</span>
        <Toggle
          label="Line guide"
          on={prefs.line}
          change={() => toggle('line')}
        />
        <Toggle
          label="Force vectors"
          on={prefs.forces}
          change={() => toggle('forces')}
        />
      </div>
      {preview ? (
        <button className="primary start-run" onClick={start}>
          <Play size={16} fill="currentColor" />
          <span>Start run</span>
          <kbd>↵</kbd>
        </button>
      ) : (
        <div className="run-actions">
          <button
            className="primary"
            onClick={run.phase === 'running' ? run.pause : run.resume}
          >
            {run.phase === 'running' ? <Pause size={16} /> : <Play size={16} />}{' '}
            {run.phase === 'running' ? 'Pause run' : 'Resume run'}
          </button>
          <button className="outline-btn" onClick={run.end}>
            End run
          </button>
        </div>
      )}
    </aside>
  )
}
export function Controls() {
  const controls = [
    {
      keys: ['←', '→'],
      alt: 'A / D',
      name: 'Turn left / right',
      text: 'Hold to build edge angle. Release to flatten the skis.',
    },
    {
      keys: ['↑'],
      alt: 'W',
      name: 'Tuck',
      text: 'Lower your torso to reduce air resistance.',
    },
    {
      keys: ['↓'],
      alt: 'S',
      name: 'Flex legs',
      text: 'Absorb terrain changes with a deeper knee bend.',
    },
    {
      keys: ['Space'],
      name: 'Brake',
      text: 'Skid to scrub speed or come to a stop.',
    },
    {
      keys: ['P'],
      alt: 'Esc',
      name: 'Pause',
      text: 'Pause your descent and resume when ready.',
    },
    {
      keys: ['C'],
      name: 'Change camera',
      text: 'Cycle between chase, trail, and skier views.',
    },
  ]
  return (
    <div className="controls-content">
      <p className="modal-intro">
        Ski between the matching gate flags. Each cleared gate earns 100 points,
        and each linked turn adds 25.
      </p>
      <div className="control-list">
        {controls.map((row) => (
          <div key={row.name}>
            <div className="keyset">
              {row.keys.map((k) => (
                <kbd key={k}>{k}</kbd>
              ))}
              {row.alt && <small>{row.alt}</small>}
            </div>
            <div>
              <h3>{row.name}</h3>
              <p>{row.text}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="note">
        <Gamepad2 size={16} />
        Touch controls appear on touchscreens. You can also enable them in
        settings.
      </p>
    </div>
  )
}
export function TelemetryHelp() {
  return (
    <div className="help-copy">
      <p className="modal-intro">
        The preview shows a reference skier on your selected terrain. Starting a
        run connects the instruments to your inputs.
      </p>
      {[
        [
          'Speed',
          'Gravity accelerates the skier down the fall line. Air drag, skidding, and snow friction reduce speed.',
        ],
        [
          'Edge angle',
          'The angle between ski base and snow grows as you hold a steering input. It falls through zero as you change edges.',
        ],
        [
          'Outside ski load',
          'An estimated share of support on the ski on the outside of a turn. Straight gliding distributes support evenly.',
        ],
        [
          'Turn radius',
          'An instantaneous estimate from speed divided by turning rate. A straight path has an infinite radius. The trace clips very wide turns for readability.',
        ],
      ].map(([title, body]) => (
        <div key={title}>
          <h3>{title}</h3>
          <p>{body}</p>
        </div>
      ))}
    </div>
  )
}
export function RunDetails({
  record,
  units,
  again,
  close,
}: {
  record: Run
  units: Prefs['units']
  again: () => void
  close: () => void
}) {
  const c = courses[record.setup.course],
    metric = units === 'metric'
  return (
    <div className="run-details">
      <div className="result-hero">
        <span className="result-trophy">
          <Trophy size={28} />
        </span>
        <div>
          <span className="eyebrow">
            {record.finished ? 'Course complete' : 'Practice session'}
          </span>
          <h3>{c.name}</h3>
          <p>
            {techniques[record.setup.technique].name} ·{' '}
            {surfaces[record.setup.surface].name}
          </p>
        </div>
        <strong>
          {record.points}
          <small>points</small>
        </strong>
      </div>
      <div className="result-grid">
        {[
          ['Gates cleared', record.gates + ' / ' + c.gates],
          ['Linked turns', record.turns],
          ['Time', duration(record.seconds)],
          ['Distance', lengthText(record.distance, units)],
          [
            'Top speed',
            (record.peak * (metric ? 1 : 0.621371)).toFixed(1) +
              ' ' +
              (metric ? 'km/h' : 'mph'),
          ],
          ['In edge range', record.quality + '%'],
        ].map(([name, value]) => (
          <div key={name}>
            <span>{name}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
      <div className="drill-box">
        <Focus size={20} />
        <div>
          <h3>Next run</h3>
          <p>
            {record.gates === c.gates
              ? 'You cleared every gate. Repeat on a different snow surface and compare your turn shape.'
              : record.turns < 2
                ? 'Build a left turn, release, then roll onto the right edges. Try linking two turns before adding speed.'
                : techniques[record.setup.technique].watch}
          </p>
        </div>
      </div>
      <div className="modal-actions">
        <button className="outline-btn" onClick={close}>
          Close
        </button>
        <button className="primary" onClick={again}>
          <Play size={15} fill="currentColor" />
          Ski again
        </button>
      </div>
    </div>
  )
}
export function Log({
  runs,
  open,
  practice,
  units,
}: {
  runs: Run[]
  open: (r: Run) => void
  practice: () => void
  units: Prefs['units']
}) {
  return (
    <div className="log-view">
      <div className="page-heading">
        <div>
          <h1>Run log</h1>
          <p>Your saved descents, scores, and technique progress.</p>
        </div>
      </div>
      <div className="log-stats">
        {[
          [Flag, 'Runs logged', runs.length],
          [
            Trophy,
            'Best score',
            Math.max(0, ...runs.map((r) => r.points)) + ' pts',
          ],
          [
            Route,
            'Total distance',
            lengthText(
              runs.reduce((a, b) => a + b.distance, 0),
              units,
            ),
          ],
        ].map(([Icon, label, value]) => {
          const I = Icon as typeof Flag
          return (
            <div key={String(label)} className="panel">
              <I size={20} />
              <div>
                <span>{String(label)}</span>
                <b>{String(value)}</b>
              </div>
            </div>
          )
        })}
      </div>
      {runs.length ? (
        <div className="panel log-table">
          <div className="section-row">
            <h2>
              <History size={18} />
              Recent runs
            </h2>
            <span className="fine-print">Saved on this device</span>
          </div>
          {runs.map((r) => (
            <button key={r.id} onClick={() => open(r)}>
              <span
                className={'log-course-icon ' + courses[r.setup.course].symbol}
              >
                <MountainSnow />
              </span>
              <span className="log-title">
                <b>{courses[r.setup.course].name}</b>
                <small>
                  {techniques[r.setup.technique].name} ·{' '}
                  {new Date(r.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </small>
              </span>
              <span className="log-state">
                {r.finished ? 'Completed' : 'Practice'}
              </span>
              <span className="log-points">{r.points} pts</span>
              <ArrowRight size={17} />
            </button>
          ))}
        </div>
      ) : (
        <div className="panel log-empty">
          <span className="empty-symbol">
            <Flag size={32} />
          </span>
          <h2>Your first run starts here</h2>
          <p>
            Finish a practice run to see your gate score, linked turns, and top
            speed here.
          </p>
          <button className="primary" onClick={practice}>
            <Play fill="currentColor" size={15} />
            Open simulator
          </button>
        </div>
      )}
    </div>
  )
}
