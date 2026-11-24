import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Rewind } from 'lucide-react'
import type { Frame } from './physics.ts'

export function useReplay(
  frames: readonly Frame[],
  initial: number,
  startAtDisplayed = false,
) {
  const [index, setIndex] = useState(initial),
    [playing, setPlaying] = useState(false)
  const cursor = useRef(startAtDisplayed ? initial : 0)
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
      if (document.hidden) previous = 0
      else {
        if (previous) acc += Math.min(0.12, (now - previous) / 1000) * 30
        previous = now
        const n = Math.floor(acc)
        if (n) {
          acc -= n
          cursor.current = Math.min(frames.length - 1, cursor.current + n)
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
  return {
    index,
    playing,
    seek,
    frame: frames[index],
    max: frames.length - 1,
    seconds: frames[index].t - frames[0].t,
    toggle: () => {
      if (!playing) setIndex(cursor.current)
      setPlaying(!playing)
    },
  }
}
export function ReplayControls({
  player,
  stops,
  phase,
  playLabel,
}: {
  player: ReturnType<typeof useReplay>
  stops: { name: string; index: number }[]
  phase: string
  playLabel: string
}) {
  return (
    <>
      <div className="replay-transport">
        <button className="outline-btn" onClick={player.toggle}>
          {player.playing ? <Pause size={14} /> : <Play size={14} />}{' '}
          {player.playing ? 'Pause replay' : playLabel}
        </button>
        <button
          aria-label="Rewind to approach"
          title="Rewind to approach"
          onClick={() => player.seek(0)}
        >
          <Rewind size={15} />
        </button>
        <span>½× · {player.seconds.toFixed(2)} s</span>
      </div>
      <label className="replay-slider">
        <span>Replay position</span>
        <input
          aria-label="Replay position"
          type="range"
          min={0}
          max={player.max}
          value={player.index}
          onChange={(e) => player.seek(+e.target.value)}
        />
      </label>
      <div className="phase-stops">
        {stops.map((stop) => (
          <button
            key={stop.name}
            aria-pressed={phase === stop.name}
            onClick={() => player.seek(stop.index)}
          >
            {stop.name}
          </button>
        ))}
      </div>
    </>
  )
}
