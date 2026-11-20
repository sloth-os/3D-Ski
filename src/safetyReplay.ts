import { courses, type Setup } from './course.ts'
import { emptyFrame, step, type Frame } from './physics.ts'
import { isSafety, safetyReferenceInput } from './safety.ts'

export function safetyReplay(setup: Setup): Frame[] {
  const id = setup.technique
  if (!isSafety(id)) throw new Error('Select a stopping or falling lesson')
  const f = emptyFrame(setup),
    frames: Frame[] = []
  f.pitch = courses[setup.course].pitch
  for (let i = 0; i < 1000 && !f.done; i++) {
    step(f, safetyReferenceInput(f, id), setup, [], 1 / 60)
    frames.push({ ...f })
  }
  return frames
}
