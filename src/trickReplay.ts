import { courses, type Setup } from './course.ts'
import {
  emptyFrame,
  step,
  neutralInput,
  buildGates,
  type Frame,
} from './physics.ts'
import { isSpin, isTrick, requiredSpin } from './tricks.ts'

export function trickReplay(setup: Setup): Frame[] {
  const f = emptyFrame(setup),
    gates = buildGates(courses[setup.course]),
    frames: Frame[] = []
  f.speed = 7.5
  f.d = 12
  const id = setup.technique
  if (!isTrick(id)) return frames
  for (let i = 0; i < 150; i++) {
    const jump = i >= 10 && i < 49
    const pose =
      f.air.phase === 'flight' &&
      f.air.elapsed > 0.055 &&
      f.air.elapsed < f.air.duration * 0.67
    step(
      f,
      {
        ...neutralInput,
        jump,
        pose,
        steer: i === 49 && isSpin(id) ? requiredSpin(id, f.air.switch) || 1 : 0,
      },
      setup,
      gates,
      1 / 60,
    )
    frames.push({ ...f })
    if (f.air.attempts && f.t - f.air.landedAt > 0.44 && f.air.result) break
  }
  return frames
}
