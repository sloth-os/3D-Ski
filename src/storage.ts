import { isSetup, type Setup, defaultSetup } from './course.ts'
import type { Run } from './physics.ts'

function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem('fallline.' + key) ?? 'null')
  } catch {
    return null
  }
}
export function write(key: string, value: unknown) {
  try {
    localStorage.setItem('fallline.' + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
export function initialSetup(): Setup {
  const s = read('setup')
  return isSetup(s) ? s : { ...defaultSetup }
}
export type Prefs = {
  sound: boolean
  units: 'metric' | 'imperial'
  touch: boolean
  line: boolean
  forces: boolean
}
export function initialPrefs(): Prefs {
  const p = read('preferences') as Partial<Prefs> | null
  return {
    sound: p?.sound === true,
    units: p?.units === 'imperial' ? 'imperial' : 'metric',
    touch: p?.touch === true,
    line: p?.line !== false,
    forces: p?.forces !== false,
  }
}
export function initialLog(): Run[] {
  const list = read('runs')
  return Array.isArray(list)
    ? list.filter(
        (r): r is Run =>
          !!r &&
          isSetup(r.setup) &&
          (r.freestyle === undefined ||
            (r.freestyle !== null &&
              ['landed', 'attempts', 'bestTime', 'points'].every(
                (k) => Number.isFinite(r.freestyle[k]) && r.freestyle[k] >= 0,
              ))) &&
          typeof r.id === 'string' &&
          Number.isFinite(Date.parse(r.date)) &&
          [
            'points',
            'gates',
            'seen',
            'quality',
            'seconds',
            'turns',
            'distance',
            'peak',
          ].every((k) => typeof r[k] === 'number' && Number.isFinite(r[k])),
      )
    : []
}
export const duration = (n: number) =>
  Math.floor(n / 60)
    .toString()
    .padStart(2, '0') +
  ':' +
  (Math.floor(n) % 60).toString().padStart(2, '0')
export function lengthText(metres: number, units: Prefs['units']) {
  return units === 'imperial'
    ? Math.round(metres * 3.28084).toLocaleString() + ' ft'
    : Math.round(metres).toLocaleString() + ' m'
}

export async function appendRun(run: Run, previous: Run[]) {
  const commit = () => {
    const unique = new Map<string, Run>()
    for (const item of [...previous, ...initialLog(), run])
      unique.set(item.id, item)
    const records = [...unique.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 200)
    return { records, saved: write('runs', records) }
  }
  if (!navigator.locks) return commit()
  try {
    return await navigator.locks.request('fallline.run-log', commit)
  } catch {
    return commit()
  }
}
