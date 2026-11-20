import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { courses, type Setup } from './course.ts'
import {
  buildGates,
  demonstrationInput,
  emptyFrame,
  sample,
  neutralInput,
  referenceFrame,
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
  jump: ['KeyJ'],
  pose: ['KeyK'],
} as const
export const skiingKeys = new Set<string>(Object.values(keyBindings).flat())
export function useRun(
  setup: Setup,
  sound: boolean,
  record: (r: Run) => void,
  observing: boolean,
) {
  const [phase, setPhase] = useState<Phase>('preview')
  const covered = useRef(observing)
  covered.current = observing
  const reference = useMemo(() => referenceFrame(setup), [setup])
  const [frame, setFrame] = useState<Frame>(() => ({ ...reference }))
  const [rate, setRate] = useState(1),
    rateRef = useRef(1)
  rateRef.current = rate
  const lastInput = useRef({ ...neutralInput }),
    pivotRequest = useRef(false),
    demoOrigin = useRef(false)
  const [samples, setSamples] = useState<Sample[]>([])
  const current = useRef<Frame>({ ...reference }),
    keys = useRef(new Set<string>()),
    state = useRef<Phase>('preview')
  const ready = useRef(false),
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
    pivotRequest.current = false
  }, [])
  const start = useCallback(
    (demo = false, initial = setup) => {
      demoOrigin.current = demo
      lastInput.current = { ...neutralInput }
      current.current = emptyFrame(initial)
      setFrame({ ...current.current })
      setSamples([sample(current.current, initial)])
      if (enabled.current) audio.current.enable()
      change(demo ? 'demo' : 'running')
    },
    [change, setup],
  )
  const pause = useCallback(() => {
    if (state.current === 'running' || state.current === 'demo') {
      setFrame({ ...current.current })
      change('paused')
    }
  }, [change])
  const resume = useCallback(() => {
    if (state.current === 'paused') {
      if (!demoOrigin.current) cancelPop(current.current)
      if (enabled.current) audio.current.enable()
      change(demoOrigin.current ? 'demo' : 'running')
    }
  }, [change])
  const end = useCallback(() => {
    if (state.current === 'preview') return
    if (demoOrigin.current) {
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
    const study = phase === 'preview'
    if (study) {
      current.current = { ...reference }
      setFrame({ ...reference })
      setSamples([sample(reference, setup)])
      audio.current.update(0, 0, false)
    }
    if (phase !== 'running' && phase !== 'demo' && !study) {
      audio.current.update(0, 0, false)
      return
    }
    let id = 0,
      previous = 0,
      acc = 0,
      lastSample = 0
    const loop = (now: number) => {
      if (state.current !== phase) return
      if (
        !ready.current ||
        document.hidden ||
        (study &&
          (covered.current ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches))
      ) {
        previous = 0
        id = requestAnimationFrame(loop)
        return
      }
      acc += previous
        ? Math.min((now - previous) / 1000, 0.2) *
          (study ? 0.24 : 1) *
          rateRef.current
        : 0
      previous = now
      const k = keys.current,
        down = (action: keyof typeof keyBindings) =>
          k.has(action) || keyBindings[action].some((code) => k.has(code))
      const input = {
        steer: Number(down('right')) - Number(down('left')),
        tuck: down('tuck'),
        flex: down('flex'),
        brake: down('brake'),
        jump: down('jump'),
        pose: down('pose'),
      }
      const f = current.current,
        before = f.gatesHit
      lastInput.current = input
      while (acc >= 1 / 60 && !f.done) {
        step(
          f,
          phase === 'demo' || study
            ? demonstrationInput(f, setup, gates)
            : pivotRequest.current
              ? { ...input, pivot: true }
              : input,
          setup,
          gates,
          1 / 60,
        )
        pivotRequest.current = false
        acc -= 1 / 60
      }
      if (now - lastSample >= 110 || f.done) {
        setFrame({ ...f })
        setSamples((old) => [...old.slice(-43), sample(f, setup)])
        audio.current.update(
          f.speed,
          f.edge,
          enabled.current && !study && f.air.phase !== 'flight',
        )
        lastSample = now
      }
      if (!study && before !== f.gatesHit && enabled.current)
        audio.current.gate()
      if (f.done) {
        if (study) {
          current.current = { ...reference }
        } else {
          end()
          return
        }
      }
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(id)
      audio.current.update(0, 0, false)
    }
  }, [phase, setup, gates, end, reference])
  const singleStep = () => {
    if (state.current !== 'paused') return
    const f = current.current
    step(
      f,
      demoOrigin.current
        ? demonstrationInput(f, setup, gates)
        : lastInput.current,
      setup,
      gates,
      1 / 60,
    )
    setFrame({ ...f })
    setSamples((old) => [...old.slice(-43), sample(f, setup)])
    if (f.done) end()
  }
  return {
    phase,
    frame,
    samples,
    current,
    keys,
    rate,
    setRate,
    singleStep,
    automated: demoOrigin.current,
    ready,
    audio,
    gates,
    start,
    pivot: () => {
      if (
        state.current === 'running' &&
        !current.current.pivot &&
        current.current.air.phase === 'ready'
      )
        pivotRequest.current = true
    },
    pause,
    resume,
    end,
  }
}
export type TrainingRun = ReturnType<typeof useRun>

export function cancelPop(f: Frame) {
  if (f.air.phase === 'load') f.air = { ...f.air, phase: 'ready', charge: 0 }
}
