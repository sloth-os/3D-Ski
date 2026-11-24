import { useEffect, useRef, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ExternalLink,
  Flag,
  GraduationCap,
  MapPin,
  Play,
  Route,
  Target,
} from 'lucide-react'
import { analyse, riderPose, type Lens } from './analysis.ts'
import { courses, surfaces, type Setup } from './course.ts'
import { type Run, type Frame, radians } from './physics.ts'
import { ReplayControls, useReplay } from './Replay.tsx'
import { PoseStudy, type StudyView } from './PoseStudy.tsx'
import { attemptReplay, stationReplay } from './levelReplay.ts'
import {
  hasCredit,
  markCredit,
  stationComplete,
  type Strand,
} from './levelJournal.ts'
import {
  adjustments,
  beatFor,
  christieWedge,
  footTwist,
  isAirTask,
  progressText,
} from './levelPractice.ts'
import {
  goals,
  levelSources,
  stationsFor,
  teachingCases,
  type Station,
  type Decision,
} from './levelTwo.ts'
import { type Sport } from './library.ts'
import { defaultLoad, type LoadSelection } from './loadPath.ts'
import type { MuscleFocus } from './muscles.ts'
import { lengthText, type Prefs } from './storage.ts'
import { SchemeTabs } from './UI.tsx'

type Units = Prefs['units']
type Clip = ReturnType<typeof stationReplay>

function measurements(
  s: Station,
  f: Frame,
  setup: Setup,
  units: Units,
): [string, string][] {
  const deg = (n: number) => Math.round(n) + '°',
    pct = (n: number) => Math.round(n * 100) + '%'
  const edge: [string, string] = ['Edge tilt', deg(f.edge)]
  if (isAirTask(s.task))
    return [
      ['Height', lengthText(f.air.height, units, 2)],
      s.task === 'spin'
        ? ['Spin', deg(f.air.spin / radians)]
        : ['Pose held', f.air.hold.toFixed(2) + ' s'],
      ['Snow reaction', Math.round(f.normalAccel * 75) + ' N'],
    ]
  if (s.task === 'absorb')
    return [
      ['Knee angle', deg(riderPose(f, setup).legs[0].angle)],
      ['Surface load', Math.round(f.normalAccel * 75) + ' N'],
      ['Leg flex', pct(f.flex)],
    ]
  if (s.task === 'twist')
    return [
      ['Lead tilt', deg(f.edge + footTwist(f))],
      ['Rear tilt', deg(f.edge - footTwist(f))],
      ['Board yaw', deg(f.boardYaw / radians)],
    ]
  if (s.task === 'press')
    return [
      [
        'Tail load',
        f.air.phase === 'flight'
          ? '0 N'
          : Math.round(
              75 * f.normalAccel * (1 - analyse(f, setup).firstShare),
            ) + ' N',
      ],
      [
        'Nose height',
        lengthText(Math.max(0, riderPose(f, setup).leadingEnd[1]), units, 2),
      ],
      edge,
    ]
  if (s.task === 'match')
    return [
      ['Ski opening', deg((christieWedge(f) * 2) / radians)],
      ['Outside load', Math.round(f.load) + '%'],
      edge,
    ]
  if (s.task === 'line')
    return [
      ['Cross-slope', lengthText(f.x, units, 1)],
      ['Bank', deg(f.bank)],
      [
        'Last gate offset',
        f.lastGateOffset === undefined
          ? '—'
          : lengthText(f.lastGateOffset, units, 1),
      ],
    ]
  if (s.task === 'switch')
    return [
      ['Leading foot', f.air.switch ? 'Right' : 'Left'],
      ['Working edge', analyse(f, setup).edgeName],
      edge,
    ]
  if (s.task === 'transfer')
    return [
      ['Outside load', Math.round(f.load) + '%'],
      ['Lateral force', Math.round(Math.abs(f.lateralAccel) * 75) + ' N'],
      edge,
    ]
  if (s.task === 'short' || s.task === 'resize' || s.task === 'funnel')
    return [
      ['Arc time', (f.t - (f.stationProgress?.since ?? 0)).toFixed(2) + ' s'],
      [
        'Turn radius',
        Number.isFinite(f.radius) ? lengthText(f.radius, units, 1) : 'Straight',
      ],
      edge,
    ]
  return [
    edge,
    ['Slip', pct(f.slip)],
    s.task === 'brush'
      ? ['Leg flex', pct(f.flex)]
      : ['Heading', deg(f.heading / radians)],
  ]
}

function TrackFigure({
  clip,
  index,
  otherName,
  alternate,
}: {
  clip: Clip
  index: number
  otherName: string
  alternate: boolean
}) {
  const trace = useMemo(() => {
    const all = [...clip.reference, ...clip.comparison],
      d0 = all[0].d
    let distance = 1,
      low = 0,
      high = 0
    for (const f of all) {
      distance = Math.max(distance, f.d - d0)
      low = Math.min(low, f.x)
      high = Math.max(high, f.x)
    }
    const k = Math.min(384 / distance, 55 / Math.max(2, high - low)),
      mid = (low + high) / 2
    const point = (f: Frame) => [8 + (f.d - d0) * k, 33 + (f.x - mid) * k]
    const path = (frames: Frame[]) =>
      frames
        .filter((_, i) => i % 4 === 0 || i === frames.length - 1)
        .map(
          (f, i) =>
            (i ? 'L' : 'M') +
            point(f)
              .map((v) => v.toFixed(2))
              .join(' '),
        )
        .join(' ')
    return { point, ref: path(clip.reference), other: path(clip.comparison) }
  }, [clip])
  const [x, y] = trace.point(
    (alternate ? clip.comparison : clip.reference)[index],
  )
  return (
    <figure className="station-track">
      <figcaption>
        <span>
          <Route size={13} /> Snow tracks
        </span>
        <small>
          <i /> Reference <i /> {otherName}
        </small>
      </figcaption>
      <svg
        viewBox="0 0 400 66"
        role="img"
        aria-label="Overhead tracks on the same scale, downhill from left to right. The dot follows the selected rider."
      >
        {[8, 72, 136, 200, 264, 328, 392].map((v) => (
          <path key={v} d={'M' + v + ' 4v58'} className="track-grid" />
        ))}
        <path d="M5 33h390" className="track-grid" />
        <path d={trace.ref} className="ref-line" />
        <path d={trace.other} className="alt-line" />
        <circle
          cx={x}
          cy={y}
          r="4"
          className={alternate ? 'alt-dot' : 'ref-dot'}
        />
      </svg>
    </figure>
  )
}

function CoachDecision({
  item,
  label,
  earned,
  answer,
  onAnswer,
}: {
  item: Decision
  label: string
  earned: boolean
  answer: number | null
  onAnswer: (index: number) => void
}) {
  return (
    <section className="coach-question" aria-label={label}>
      <h4>
        {label} {earned && <Check size={14} aria-label="Practiced" />}
      </h4>
      <p>{item.question}</p>
      <div className="coach-answers">
        {item.answers.map((text, i) => (
          <button
            key={text}
            aria-pressed={answer === i}
            data-result={
              answer === i
                ? i === item.correct
                  ? 'correct'
                  : 'retry'
                : undefined
            }
            onClick={() => onAnswer(i)}
          >
            {text}
          </button>
        ))}
      </div>
      {answer !== null && (
        <p className="answer-feedback" role="status">
          {answer === item.correct
            ? item.reason
            : label === 'Movement analysis'
              ? 'Revisit the same phase in both passes. Look at the equipment first, then the joints that moved it.'
              : 'Consider what the guest told you and how you could check the effect of your choice.'}
        </p>
      )}
    </section>
  )
}
function StationScreen({
  s,
  clip,
  personal,
  view,
  units,
  variation,
  setVariation,
}: {
  s: Station
  clip: Clip
  personal: boolean
  view: StudyView
  units: Units
  variation: number
  setVariation: (n: number) => void
}) {
  const [alternate, setAlternate] = useState(personal)
  const [perspective, setPerspective] = useState<'studio' | 'chase' | 'aerial'>(
    'studio',
  )
  const otherName = personal
    ? 'Your attempt'
    : variation === 1
      ? 'Altered run'
      : 'Coached run'
  const frames = alternate ? clip.comparison : clip.reference
  const player = useReplay(frames, personal ? 0 : clip.stops[1].index, true)
  const nearest =
    clip.stops.filter((stop) => stop.index <= player.index).at(-1)?.name ??
    'Entry'
  const ref = measurements(s, clip.reference[player.index], clip.setup, units),
    other = measurements(s, clip.comparison[player.index], clip.setup, units)
  return (
    <section className="station-screen panel" aria-label="Station replay">
      <div className="station-cameras">
        <SchemeTabs
          label="Replay rider"
          value={alternate ? 'other' : 'ref'}
          onChange={(v) => setAlternate(v === 'other')}
          items={[
            { id: 'ref', name: 'Reference' },
            { id: 'other', name: otherName },
          ]}
        />
        <label>
          Camera{' '}
          <select
            aria-label="Replay camera"
            value={perspective}
            onChange={(e) =>
              setPerspective(e.target.value as typeof perspective)
            }
          >
            <option value="studio">Rider study</option>
            <option value="chase">Chase on snow</option>
            <option value="aerial">Aerial on snow</option>
          </select>
        </label>
      </div>
      <div className="station-stage">
        <PoseStudy
          view={view}
          setup={clip.setup}
          frame={player.frame}
          trail={frames}
          angle={0}
          speed={0}
          perspective={perspective}
        />
        <span className="station-phase">{nearest}</span>
      </div>
      <ReplayControls
        player={player}
        stops={clip.stops}
        phase={nearest}
        playLabel="Play movement"
      />
      {!personal && (
        <div className="station-tuner">
          <label>
            {adjustments[s.task][0]} <strong>{adjustments[s.task][1]}</strong>
            <select
              aria-label="Apply coaching cue"
              value={variation}
              onChange={(e) => {
                player.seek(player.index)
                setAlternate(true)
                setVariation(+e.target.value)
              }}
            >
              <option value={1}>Original altered run</option>
              <option value={0.5}>Partial adjustment</option>
              <option value={0}>Full adjustment</option>
            </select>
          </label>
        </div>
      )}
      <div
        className="station-readings"
        role="table"
        aria-label="Same-frame comparison"
      >
        <div role="row">
          <span role="columnheader">Same frame</span>
          <span role="columnheader">Reference</span>
          <span role="columnheader">{otherName}</span>
        </div>
        {ref.map(([key, value], i) => (
          <div role="row" key={key}>
            <span role="cell">{key}</span>
            <b role="cell">{value}</b>
            <b role="cell">{other[i][1]}</b>
          </div>
        ))}
      </div>
      <TrackFigure
        clip={clip}
        index={player.index}
        otherName={otherName}
        alternate={alternate}
      />
    </section>
  )
}

export function LevelClinic({
  station: s,
  select,
  lessons,
  practice,
  runs,
  attempt,
  units,
}: {
  station: Station
  select: (s: Station) => void
  lessons: () => void
  practice: (s: Station, view: StudyView) => void
  runs: Run[]
  attempt?: Run
  units: Units
}) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    root.current?.closest('dialog')?.scrollTo(0, 0)
  }, [s])
  const catalog = stationsFor(s.sport),
    ix = catalog.indexOf(s),
    source = levelSources[s.sport]
  const savedRun =
    attempt?.setup.station === s.id
      ? attempt
      : runs.find((r) => r.setup.station === s.id && r.stationTape?.ticks)
  const [variation, setVariation] = useState(1)
  const [personal, setPersonal] = useState(!!attempt?.stationTape?.ticks)
  const [lens, setLens] = useState<Lens>(s.lens),
    [focus, setFocus] = useState<MuscleFocus>('auto'),
    [load, setLoad] = useState<LoadSelection>(defaultLoad)
  const [movement, setMovement] = useState<number | null>(null),
    [teaching, setTeaching] = useState<number | null>(null)
  const clip = useMemo(
    () =>
      personal && savedRun?.stationTape
        ? attemptReplay(s, savedRun.stationTape)
        : stationReplay(s, variation),
    [s, personal, savedRun, variation],
  )
  const view = { lens, setLens, focus, setFocus, load, setLoad },
    lessonCase = teachingCases[s.teaching]
  const answer = (strand: 'movement' | 'teaching', value: number) => {
    const item = strand === 'teaching' ? lessonCase : s.observation
    if (value === item.correct) markCredit(s, strand)
    if (strand === 'movement') setMovement(value)
    else setTeaching(value)
  }
  const controls = isAirTask(s.task)
    ? s.task === 'spin'
      ? 'J · load and release with ←'
      : 'J · pop    K · pose in flight'
    : s.task === 'press'
      ? 'Hold J · tail preload'
      : '← → · steer    ↓ · flex'
  const groupNames = [...new Set(catalog.map((st) => st.group))]
  return (
    <div className="level-clinic" ref={root} data-station={s.id}>
      <div className="station-bar">
        <SchemeTabs<Sport>
          label="Sport"
          value={s.sport}
          onChange={(sport) => {
            if (sport !== s.sport) select(stationsFor(sport)[0])
          }}
          items={[
            { id: 'skiing', name: 'Skiing' },
            { id: 'snowboarding', name: 'Snowboarding' },
          ]}
        />
        <label className="station-picker">
          Training station
          <select
            aria-label="Training station"
            value={s.id}
            onChange={(e) =>
              select(catalog.find((st) => st.id === e.target.value)!)
            }
          >
            {groupNames.map((group) => (
              <optgroup label={group} key={group}>
                {catalog
                  .filter((st) => st.group === group)
                  .map((st) => (
                    <option key={st.id} value={st.id}>
                      {stationComplete(st) ? '✓ ' : ''}
                      {st.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button className="outline-btn" onClick={lessons}>
          <ArrowLeft size={14} /> All lessons
        </button>
      </div>
      <header className="station-title">
        <div>
          <span className="eyebrow">
            <GraduationCap size={15} />
            {source.publisher} Level II · {s.group}
          </span>
          <h2>{s.name}</h2>
          <p>
            <MapPin size={14} />
            {courses[s.course].name} <i /> {surfaces[s.surface].name}
          </p>
        </div>
        <button className="primary" onClick={() => practice(s, view)}>
          <Play size={15} fill="currentColor" /> Play station
        </button>
      </header>
      <div className="station-grid">
        <div>
          {savedRun?.stationTape?.ticks ? (
            <div className="station-film">
              <span>Recording</span>
              <SchemeTabs
                label="Recording"
                value={personal ? 'mine' : 'example'}
                onChange={(v) => setPersonal(v === 'mine')}
                items={[
                  { id: 'example', name: 'Coaching example' },
                  { id: 'mine', name: 'My recorded run' },
                ]}
              />
            </div>
          ) : null}
          <StationScreen
            key={personal ? 'mine' : 'example'}
            s={s}
            clip={clip}
            personal={personal}
            units={units}
            view={view}
            variation={variation}
            setVariation={setVariation}
          />
        </div>
        <aside className="station-brief">
          <section className="panel">
            <span className="eyebrow">
              <Target size={14} /> On-snow assignment
            </span>
            <h3>{goals[s.task].join(' ')}</h3>
            <p>{s.cue}</p>
            <small className="station-keys">{controls}</small>
            <div className="station-status">
              {(['movement', 'teaching', 'run'] as Strand[]).map((k, i) => (
                <span data-earned={hasCredit(s, k)} key={k}>
                  {hasCredit(s, k) ? <Check size={11} /> : <i />}
                  {['Analyze', 'Coach', 'Ride'][i]}
                </span>
              ))}
            </div>
          </section>
          <section className="panel">
            <h3>What to watch</h3>
            <p>{s.aim}</p>
            <h4>Altered run</h4>
            <p>{s.change}</p>
            {personal && (
              <p className="fine-print">
                Your first{' '}
                {Math.min(30, savedRun!.stationTape!.ticks / 60).toFixed(1)}{' '}
                seconds replay from the trailhead beside a reference with the
                same start.
              </p>
            )}
          </section>
        </aside>
      </div>
      <div className="station-coaching">
        <CoachDecision
          label="Movement analysis"
          item={s.observation}
          earned={hasCredit(s, 'movement')}
          answer={movement}
          onAnswer={(v) => answer('movement', v)}
        />
        <CoachDecision
          label="Teach the next run"
          item={lessonCase}
          earned={hasCredit(s, 'teaching')}
          answer={teaching}
          onAnswer={(v) => answer('teaching', v)}
        />
      </div>
      <footer className="station-next">
        <span>
          <Flag size={15} />
          {catalog.filter(stationComplete).length} / {catalog.length} stations
          complete
        </span>
        <button
          className="outline-btn"
          onClick={() => select(catalog[(ix + 1) % catalog.length])}
        >
          Next station <ArrowRight size={14} />
        </button>
      </footer>
      <details className="panel sources station-sources">
        <summary>
          <span>
            <BookOpen size={16} /> Standards &amp; activity sources
          </span>
          <ChevronDown size={15} />
        </summary>
        <p>
          These independent Fallline exercises adapt the national learning
          outcomes to a simulator. Instructors assess official certification on
          snow. Game targets, estimated joint motion and simulated loads are for
          practice.
        </p>
        <a
          target="_blank"
          rel="noreferrer"
          href={source.activities + '#page=' + s.page}
        >
          {source.publisher} national activities · p. {s.page}
          <ExternalLink size={12} />
        </a>
        <a target="_blank" rel="noreferrer" href={source.standard + '#page=18'}>
          Level 2 technical skills · pp. 16, 18
          <ExternalLink size={12} />
        </a>
        <a target="_blank" rel="noreferrer" href={source.standard + '#page=7'}>
          Professionalism, people and teaching · pp. 7, 10, 14
          <ExternalLink size={12} />
        </a>
      </details>
    </div>
  )
}
export function StationHUD({
  s,
  f,
  preview,
}: {
  s: Station
  f: Frame
  preview: boolean
}) {
  const n = preview ? 0 : (f.stationProgress?.value ?? 0),
    goal = goals[s.task][0]
  const timed = ['short', 'resize', 'funnel'].includes(s.task)
  const hint = timed
    ? 'Hold this arc ~' + beatFor(s.task, n).toFixed(1) + ' s'
    : s.task === 'absorb'
      ? f.stationProgress?.armed
        ? 'Extend into the trough'
        : 'Flex over the crest'
      : s.task === 'press'
        ? 'Hold J / Pop on a flat base'
        : s.task === 'spin'
          ? 'Hold J / Pop · release with left steering'
          : s.task === 'grab' || s.task === 'shifty'
            ? 'J / Pop · K / Pose in flight · release'
            : s.task === 'line'
              ? 'Aim within 2.5 m of center'
              : s.task === 'match' || s.task === 'twist' || s.task === 'brush'
                ? 'Steer left / right + ↓ / Flex'
                : s.task === 'switch'
                  ? 'Keep the right foot leading'
                  : 'Alternate edges'
  return (
    <section className="trick-hud station-hud" aria-label="Level II assignment">
      <span className="hud-kicker">Level II practice</span>
      <header>
        <strong>{s.name}</strong>
      </header>
      <div className="jump-meter">
        <i style={{ width: Math.min(100, (100 * n) / goal) + '%' }} />
      </div>
      <p>{progressText(s, n)}</p>
      <footer>{hint}</footer>
    </section>
  )
}
