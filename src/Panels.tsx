import {
  ArrowRight,
  Flag,
  Focus,
  Gamepad2,
  History,
  MountainSnow,
  Play,
  Route,
  Trophy,
} from 'lucide-react'
import {
  courses,
  equipmentFor,
  equipmentName,
  isSwitchDrill,
  surfaces,
  techniques,
} from './course.ts'
import { duration, lengthText, type Prefs } from './storage.ts'
import type { Run } from './physics.ts'

export function Controls() {
  const controls = [
    {
      keys: ['←', '→'],
      alt: 'A / D',
      name: 'Turn left / right',
      text: 'Hold to build edge angle. Release to bring the base flat to the snow.',
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
      keys: ['J'],
      name: 'Pop on skis or a board',
      text: 'In a freestyle trick drill, hold to preload the legs, then release to jump. A fuller charge gives more airtime.',
    },
    {
      keys: ['K'],
      name: 'Pose or grab',
      text: 'In shifty and grab drills, hold K after takeoff and release before touching down. In spin drills, hold left or right as J is released to set the rotation.',
    },
    {
      keys: ['V'],
      name: 'Pivot into or out of switch',
      text: 'Tap V or the on-screen stance button to perform a surface 180. Steering stays relative to downhill travel. Choose a starting stance in Run setup.',
    },
    {
      keys: ['C'],
      name: 'Change camera',
      text: 'Cycle through chase, helmet, trackside, edge, and aerial cameras. Keys 1–5 select a view directly.',
    },
    {
      keys: ['F'],
      name: 'Analysis layer',
      text: 'Switch between external forces, body mechanics, and equipment contact.',
    },
    {
      keys: ['.'],
      name: 'Step one frame',
      text: 'While paused, advance the simulation by 1/60 second to inspect a change in loading.',
    },
    {
      keys: ['R'],
      name: 'Reset camera',
      text: 'Drag the mountain to orbit. Scroll to zoom. Reset returns to the selected camera position.',
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
export function TelemetryHelp({ board }: { board: boolean }) {
  return (
    <div className="help-copy">
      <p className="modal-intro">
        The preview shows a reference rider on your selected terrain. Starting a
        run connects the instruments to your inputs.
      </p>
      {[
        [
          'Speed',
          'Gravity accelerates the rider down the fall line. Air drag, skidding, and snow friction reduce speed.',
        ],
        [
          'Edge angle',
          'The angle between the base and the snow grows as you hold a steering input. It passes through zero as you change edges.',
        ],
        [
          board ? 'Binding load' : 'Outside ski load',
          board
            ? 'The nose and tail bindings share the normal force. The nose binding leads in regular and the tail binding leads in switch. Loading an ollie shifts pressure toward the trailing foot.'
            : 'The modeled share of support on the outside ski increases with lateral acceleration and edge angle.',
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
            {equipmentName[equipmentFor(record.setup.technique)]} ·{' '}
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
          [
            record.freestyle
              ? 'Clean landings'
              : isSwitchDrill(record.setup.technique)
                ? 'Switch edge control'
                : 'In edge range',
            record.quality + '%',
          ],
          ...(record.switchRide
            ? [
                [
                  'Switch distance',
                  lengthText(record.switchRide.distance, units),
                ],
                ['Switch linked turns', record.switchRide.turns],
                ['Switch gates', record.switchRide.gates],
              ]
            : []),
          ...(record.freestyle
            ? [
                [
                  'Tricks landed',
                  record.freestyle.landed + ' / ' + record.freestyle.attempts,
                ],
                ['Best airtime', record.freestyle.bestTime.toFixed(2) + ' s'],
                ['Trick points', record.freestyle.points],
              ]
            : []),
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
            {record.freestyle || isSwitchDrill(record.setup.technique)
              ? techniques[record.setup.technique].watch
              : record.gates === c.gates
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
          Ride again
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
