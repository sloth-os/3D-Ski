import type { Frame, Input } from './physics.ts'

// Record only changes in the player's controls. The same fixed-step simulator reconstructs the run offline.
export const tapeLimit = 30 * 60
type Entry = [tick: number, steer: number, flags: number]
export type StationTape = {
  ticks: number
  changes: Entry[]
  cancellations?: number[]
}
export function recordControls(tape: StationTape, input: Input) {
  if (tape.ticks >= tapeLimit) return
  const flags =
    Number(input.flex) |
    (Number(input.tuck) << 1) |
    (Number(input.brake) << 2) |
    (Number(!!input.jump) << 3) |
    (Number(!!input.pose) << 4) |
    (Number(!!input.pivot) << 5)
  const previous = tape.changes.at(-1)
  if (!previous || previous[1] !== input.steer || previous[2] !== flags)
    tape.changes.push([tape.ticks, input.steer, flags])
  tape.ticks++
}
export function recordedInput(entry: Entry): Input {
  const [, steer, bits] = entry
  return {
    steer,
    flex: !!(bits & 1),
    tuck: !!(bits & 2),
    brake: !!(bits & 4),
    jump: !!(bits & 8),
    pose: !!(bits & 16),
    pivot: !!(bits & 32),
  }
}
export function isTape(value: unknown): value is StationTape {
  if (!value || typeof value !== 'object') return false
  const { ticks, changes, cancellations } = value as StationTape
  return (
    Number.isInteger(ticks) &&
    ticks >= 0 &&
    ticks <= tapeLimit &&
    Array.isArray(changes) &&
    (cancellations === undefined ||
      (Array.isArray(cancellations) &&
        cancellations.length <= ticks + 1 &&
        cancellations.every(
          (n, i) =>
            Number.isInteger(n) &&
            n >= 0 &&
            n <= ticks &&
            (!i || n > cancellations[i - 1]),
        ))) &&
    changes.length <= ticks &&
    (ticks === 0 || changes[0]?.[0] === 0) &&
    changes.every(
      (v, i) =>
        Array.isArray(v) &&
        v.length === 3 &&
        Number.isInteger(v[0]) &&
        v[0] >= 0 &&
        v[0] < ticks &&
        (!i || v[0] > changes[i - 1][0]) &&
        Number.isFinite(v[1]) &&
        Math.abs(v[1]) <= 1 &&
        Number.isInteger(v[2]) &&
        v[2] >= 0 &&
        v[2] <= 63,
    )
  )
}

export function cancelPop(f: Frame) {
  if (f.air.phase !== 'load' || f.air.pushElapsed >= 0) return
  const tape = f.stationTape
  if (tape && tape.ticks < tapeLimit) {
    const times = (tape.cancellations ??= [])
    if (times.at(-1) !== tape.ticks) times.push(tape.ticks)
  }
  f.air = { ...f.air, phase: 'ready', charge: 0 }
}
