import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { courses, type Setup } from './course.ts'
import {
  buildGates,
  demonstrationInput,
  emptyFrame,
  sample,
  step,
  summarize,
  type Frame,
  type Run,
  type Sample,
} from './physics.ts'
import { SkiSound } from './sound.ts'

export type Phase = 'preview' | 'running' | 'paused' | 'demo'
export const keyBindings = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  tuck: ['ArrowUp', 'KeyW'],
  flex: ['ArrowDown', 'KeyS'],
  brake: ['Space'],
} as const
export const skiingKeys = new Set<string>(Object.values(keyBindings).flat())
export function useRun(setup: Setup, sound: boolean, record: (r: Run) => void) {
  const [phase, setPhase] = useState<Phase>('preview')
  const [frame, setFrame] = useState<Frame>(emptyFrame)
  const [samples, setSamples] = useState<Sample[]>([])
  const current = useRef<Frame>(emptyFrame()),
    keys = useRef(new Set<string>()),
    state = useRef<Phase>('preview')
  const draw = useRef<((frame: Frame) => void) | null>(null),
    ready = useRef(false),
    audio = useRef(new SkiSound())
  const gates = useMemo(() => buildGates(courses[setup.course]), [setup.course])
  const enabled = useRef(sound)
  enabled.current = sound
  const onRecord = useRef(record)
  onRecord.current = record
  const change = useCallback((next: Phase) => {
    state.current = next
    setPhase(next)
    keys.current.clear()
  }, [])
  const start = useCallback(
    (demo = false) => {
      current.current = emptyFrame()
      setFrame({ ...current.current })
      setSamples([sample(current.current)])
      if (enabled.current) audio.current.enable()
      change(demo ? 'demo' : 'running')
    },
    [change],
  )
  const pause = useCallback(() => {
    if (state.current === 'running') change('paused')
    else if (state.current === 'demo') change('preview')
  }, [change])
  const resume = useCallback(() => {
    if (state.current === 'paused') {
      if (enabled.current) audio.current.enable()
      change('running')
    }
  }, [change])
  const end = useCallback(() => {
    if (state.current === 'preview') return
    if (state.current === 'demo') {
      change('preview')
      return
    }
    const result = summarize(current.current, setup)
    change('preview')
    onRecord.current(result)
  }, [change, setup])
  useEffect(() => {
    const onBlur = () => {
      keys.current.clear()
      pause()
    }
    const visibility = () => {
      if (document.hidden) onBlur()
    }
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [pause])
  useEffect(() => {
    if (phase !== 'running' && phase !== 'demo') {
      audio.current.update(0, 0, false)
      return
    }
    let id = 0,
      previous = 0,
      acc = 0,
      lastSample = 0
    const loop = (now: number) => {
      if (state.current !== phase) return
      if (!ready.current) {
        previous = 0
        id = requestAnimationFrame(loop)
        return
      }
      acc += previous ? Math.min((now - previous) / 1000, 0.2) : 0
      previous = now
      const k = keys.current,
        down = (action: keyof typeof keyBindings) =>
          k.has(action) || keyBindings[action].some((code) => k.has(code))
      const input = {
        steer: Number(down('right')) - Number(down('left')),
        tuck: down('tuck'),
        flex: down('flex'),
        brake: down('brake'),
      }
      const f = current.current,
        before = f.gatesHit
      while (acc >= 1 / 60 && !f.done) {
        step(
          f,
          phase === 'demo' ? demonstrationInput(f, setup, gates) : input,
          setup,
          gates,
          1 / 60,
        )
        acc -= 1 / 60
      }
      draw.current?.(f)
      if (now - lastSample >= 110 || f.done) {
        setFrame({ ...f })
        setSamples((old) => [...old.slice(-43), sample(f)])
        audio.current.update(f.speed, f.edge, enabled.current)
        lastSample = now
      }
      if (before !== f.gatesHit && enabled.current) audio.current.gate()
      if (f.done) {
        end()
        return
      }
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(id)
      audio.current.update(0, 0, false)
    }
  }, [phase, setup, gates, end])
  return {
    phase,
    frame,
    samples,
    current,
    keys,
    draw,
    ready,
    audio,
    gates,
    start,
    pause,
    resume,
    end,
  }
}
export type TrainingRun = ReturnType<typeof useRun>
