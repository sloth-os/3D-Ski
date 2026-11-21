import { useMemo } from 'react'
import { Eye, ShieldCheck, ExternalLink } from 'lucide-react'
import { PoseStudy, type StudyView } from './PoseStudy.tsx'
import { ReplayControls, useReplay } from './Replay.tsx'
import { safetyReplay } from './safetyReplay.ts'
import {
  isFall,
  safetyLessons,
  safetyPhases,
  laneLength,
  responsibilityCode,
  wedgeYaw,
  type SafetyId,
} from './safety.ts'
import { type Setup } from './course.ts'
import { type Frame, radians } from './physics.ts'
import { lengthText, type Prefs } from './storage.ts'

const speedText = (v: number, units: Prefs['units']) =>
  (v * (units === 'metric' ? 3.6 : 2.23694)).toFixed(1) +
  (units === 'metric' ? ' km/h' : ' mph')
export function SafetyStudy({
  view,
  setup,
  id,
  units,
  edgeChange,
}: {
  view: StudyView
  setup: Setup
  id: SafetyId
  units: Prefs['units']
  edgeChange: (edge: 'heel' | 'toe') => void
}) {
  const frames = useMemo(() => safetyReplay(setup), [setup])
  const fall = isFall(id)
  const find = (phase: keyof typeof safetyPhases) =>
    frames.findIndex((f) => f.safety?.phase === phase)
  const initial = frames.findIndex((f) =>
    fall ? f.safety!.fall >= 0.86 : f.brake >= 0.86,
  )
  const player = useReplay(frames, Math.max(0, initial)),
    f = player.frame,
    s = f.safety!
  const phases: (keyof typeof safetyPhases)[] = fall
    ? ['glide', 'losing', 'slide', 'rest']
    : ['glide', 'brake', 'rest', 'checked']
  return (
    <section className="panel experiment trick-study safety-study">
      <h2>
        <ShieldCheck size={19} />
        {fall ? 'Fall and recovery study' : 'Stopping study'}
      </h2>
      {id === 'boardStop' && (
        <label className="study-choice">
          Uphill edge
          <select
            aria-label="Uphill edge"
            value={setup.stopEdge ?? 'heel'}
            onChange={(e) => edgeChange(e.target.value as 'heel' | 'toe')}
          >
            <option value="heel">Heel edge</option>
            <option value="toe">Toe edge</option>
          </select>
        </label>
      )}
      <div className="replay-scene">
        <PoseStudy view={view} setup={setup} frame={f} angle={0} speed={0} />
        <span className="replay-phase">{safetyPhases[s.phase]}</span>
      </div>
      <ReplayControls
        player={player}
        playLabel="Play movement"
        phase={safetyPhases[s.phase]}
        stops={phases
          .map((phase) => ({ name: safetyPhases[phase], index: find(phase) }))
          .filter((x) => x.index >= 0)}
      />
      <div className="experiment-stats">
        <div>
          <span>Speed</span>
          <b>{speedText(f.speed, units)}</b>
        </div>
        <div>
          <span>{fall ? 'Slide distance' : 'Braking distance'}</span>
          <b>
            {lengthText(s.actionAt < 0 ? 0 : f.d - s.actionDistance, units)}
          </b>
        </div>
        <div>
          <span>
            {fall
              ? 'Posture'
              : id === 'skiStop'
                ? 'Wedge opening'
                : 'Edge angle'}
          </span>
          <b>
            {fall
              ? s.fall > 0.65
                ? 'Grounded'
                : s.guard > 0.4
                  ? 'Lowered'
                  : 'Upright'
              : Math.round(
                  id === 'skiStop'
                    ? (2 * wedgeYaw(f.brake)) / radians
                    : Math.abs(f.edge),
                ) + '°'}
          </b>
        </div>
      </div>
      <p className="fine-print">
        {fall
          ? 'The replay shows a low-speed fall. Rehearse the movement on snow with a qualified instructor.'
          : 'Compare the speed and equipment angle as the rider comes to rest. The striped line marks the end of the practice lane.'}
      </p>
      <div className="lesson-sources">
        <a
          className="trick-source"
          target="_blank"
          rel="noreferrer"
          href={safetyLessons[id].source}
        >
          {safetyLessons[id].publisher}
          <ExternalLink size={12} />
        </a>
        <a
          className="trick-source"
          target="_blank"
          rel="noreferrer"
          href={responsibilityCode}
        >
          Your Responsibility Code
          <ExternalLink size={12} />
        </a>
      </div>
    </section>
  )
}
export function SafetyHUD({
  frame: f,
  setup,
  units,
  preview,
  running,
  check,
}: {
  frame: Frame
  setup: Setup
  units: Prefs['units']
  preview: boolean
  running: boolean
  check: () => void
}) {
  const id = setup.technique as SafetyId,
    s = f.safety
  if (!s) return null
  const fall = isFall(id),
    rest = s.phase === 'rest'
  const cue = preview
    ? safetyLessons[id].cue
    : s.phase === 'checked'
      ? 'Looking uphill before moving again.'
      : rest
        ? fall
          ? 'Check for injury. If unhurt, look uphill.'
          : 'Hold your stop and check uphill.'
        : fall
          ? s.phase === 'slide'
            ? 'Stay low until the slide ends.'
            : 'Hold Flex (↓ / S) as balance goes.'
          : 'Hold Brake (Space) to stop before the line.'
  return (
    <section
      className="trick-hud safety-hud"
      aria-label="Safety practice"
      data-phase={s.phase}
    >
      <span className="hud-kicker">
        {preview ? 'Reference movement' : safetyPhases[s.phase]}
      </span>
      <header>
        <strong>{safetyLessons[id].name}</strong>
      </header>
      <p>{cue}</p>
      {rest && !preview ? (
        <button className="safety-check" disabled={!running} onClick={check}>
          <Eye size={14} />
          Check uphill <kbd>E</kbd>
        </button>
      ) : (
        <footer>
          {lengthText(Math.max(0, laneLength - f.d), units)} to end of lane
        </footer>
      )}
    </section>
  )
}
