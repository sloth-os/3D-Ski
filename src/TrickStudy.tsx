import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Play, Pause, Rewind, Route } from 'lucide-react'
import { PoseStudy } from './PoseStudy.tsx'
import { trickReplay } from './trickReplay.ts'
import { trickPhase } from './air.ts'
import { riderMass } from './analysis.ts'
import { radians } from './physics.ts'
import { tricks, isBoardTrick, type TrickId } from './tricks.ts'
import type { Setup } from './course.ts'
import type { Prefs } from './storage.ts'

export function TrickStudy({
  setup,
  id,
  units,
}: {
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
  const [index, setIndex] = useState(peak),
    [playing, setPlaying] = useState(false)
  const cursor = useRef(0)
  function seek(next: number) {
    setPlaying(false)
    cursor.current = next
    setIndex(next)
  }
  useEffect(() => {
    if (!playing) return
    let raf = 0,
      previous = 0,
      acc = 0
    function advance(now: number) {
      if (document.hidden) {
        previous = 0
      } else {
        if (previous) acc += Math.min(0.12, (now - previous) / 1000) * 30
        previous = now
        const steps = Math.floor(acc)
        if (steps) {
          acc -= steps
          cursor.current = Math.min(frames.length - 1, cursor.current + steps)
          setIndex(cursor.current)
        }
        if (cursor.current === frames.length - 1) {
          cursor.current = 0
          setPlaying(false)
          return
        }
      }
      raf = requestAnimationFrame(advance)
    }
    raf = requestAnimationFrame(advance)
    return () => cancelAnimationFrame(raf)
  }, [playing, frames])
  const f = frames[index],
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
        <PoseStudy setup={setup} angle={0} speed={0} frame={f} trail={frames} />
        <span className="replay-phase">{phase}</span>
      </div>
      <div className="replay-transport">
        <button
          className="outline-btn"
          onClick={() => {
            if (!playing) setIndex(cursor.current)
            setPlaying(!playing)
          }}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}{' '}
          {playing ? 'Pause replay' : 'Play trick'}
        </button>
        <button
          aria-label="Rewind to approach"
          title="Rewind to approach"
          onClick={() => seek(0)}
        >
          <Rewind size={15} />
        </button>
        <span>½× · {(f.t - frames[0].t).toFixed(2)} s</span>
      </div>
      <label className="replay-slider">
        <span>Replay position</span>
        <input
          aria-label="Replay position"
          type="range"
          min={0}
          max={frames.length - 1}
          value={index}
          onChange={(e) => seek(+e.target.value)}
        />
      </label>
      <div className="phase-stops">
        {['Approach', 'Takeoff', 'Maneuver', 'Landing'].map((part) => (
          <button
            key={part}
            aria-pressed={phase === part}
            onClick={() =>
              seek(
                part === 'Maneuver'
                  ? peak
                  : part === 'Takeoff'
                    ? frames.findIndex((s) => s.air.phase === 'flight') - 1
                    : frames.findIndex((s) => trickPhase(s) === part),
              )
            }
          >
            {part}
          </button>
        ))}
      </div>
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
