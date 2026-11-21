import { useReplay, ReplayControls } from './Replay.tsx'
import { useMemo } from 'react'
import { ExternalLink, Route } from 'lucide-react'
import { PoseStudy, type StudyView } from './PoseStudy.tsx'
import { trickReplay } from './trickReplay.ts'
import { trickPhase, pushProgress } from './air.ts'
import { riderMass } from './analysis.ts'
import { radians } from './physics.ts'
import { tricks, isBoardTrick, type TrickId } from './tricks.ts'
import type { Setup } from './course.ts'
import type { Prefs } from './storage.ts'

export function TrickStudy({
  view,
  setup,
  id,
  units,
}: {
  view: StudyView
  setup: Setup
  id: TrickId
  units: Prefs['units']
}) {
  const frames = useMemo(() => trickReplay(setup), [setup])
  const peak = useMemo(
    () =>
      frames.reduce(
        (best, s, i) => (s.air.height > frames[best].air.height ? i : best),
        0,
      ),
    [frames],
  )
  const player = useReplay(frames, peak)
  const f = player.frame,
    a = f.air,
    phase = trickPhase(f)
  const height =
    (a.height * (units === 'metric' ? 1 : 3.28084)).toFixed(2) +
    ' ' +
    (units === 'metric' ? 'm' : 'ft')
  return (
    <section className="panel experiment trick-study">
      <h2>
        <Route size={19} />
        Trick replay
      </h2>
      <div className="replay-scene">
        <PoseStudy
          view={view}
          setup={setup}
          angle={0}
          speed={0}
          frame={f}
          trail={frames}
        />
        <span className="replay-phase">{phase}</span>
      </div>
      <ReplayControls
        player={player}
        phase={a.phase === 'load' && a.pushElapsed < 0 ? 'Preload' : phase}
        playLabel="Play trick"
        stops={[
          { name: 'Approach', index: 0 },
          {
            name: 'Preload',
            index: frames.findIndex(
              (s) => s.air.phase === 'load' && s.air.charge >= 0.92,
            ),
          },
          {
            name: 'Takeoff',
            index: frames.findIndex((s) => pushProgress(s) >= 0.48),
          },
          { name: 'Maneuver', index: peak },
          {
            name: 'Landing',
            index: frames.findIndex((s) => s.air.phase === 'landing'),
          },
        ]}
      />
      <div className="experiment-stats">
        <div>
          <span>Lift above snow</span>
          <b>{height}</b>
        </div>
        <div>
          <span>Spin</span>
          <b>{Math.round(a.spin / radians)}°</b>
        </div>
        <div>
          <span>Normal load</span>
          <b>{Math.round(f.normalAccel * riderMass)} N</b>
        </div>
      </div>
      <p className="fine-print">
        The dotted line traces the jump. Drag to orbit or use the slider to
        compare takeoff and touchdown.
      </p>
      <a
        className="trick-source"
        target="_blank"
        rel="noreferrer"
        href={tricks[id].source}
      >
        {isBoardTrick(id) ? 'Snowboard Addiction' : 'Ski Addiction'} · Movement
        reference <ExternalLink size={12} />
      </a>
    </section>
  )
}
