import {
  equipmentFor,
  techniques,
  isSwitchDrill,
  type TechniqueId,
} from './course.ts'
import { isSafety } from './safety.ts'
import { isTrick } from './tricks.ts'

export const sportNames = {
  skiing: 'Skiing',
  snowboarding: 'Snowboarding',
} as const
export type Sport = keyof typeof sportNames
export const sportFor = (id: TechniqueId): Sport =>
  equipmentFor(id) === 'skis' ? 'skiing' : 'snowboarding'
export const isSport = (key: string | null): key is Sport =>
  !!key && Object.hasOwn(sportNames, key)
const ids = Object.keys(techniques) as TechniqueId[]
export function lessonsFor(sport: Sport) {
  const matches = ids.filter((id) => sportFor(id) === sport)
  return [...matches.filter(isSafety), ...matches.filter((id) => !isSafety(id))]
}
export const lessonFor = (sport: Sport, preferred: TechniqueId) =>
  sportFor(preferred) === sport
    ? preferred
    : sport === 'skiing'
      ? 'skiStop'
      : 'boardStop'
export const lessonPath = (id: TechniqueId) => '#' + sportFor(id) + '/' + id

// Bookmarks from the original four libraries still resolve to the same lessons.
export function resolveLesson(
  hash: string,
  preferred: TechniqueId,
): TechniqueId | null {
  const [section, raw] = hash.replace(/^#/, '').split('/')
  const id = raw && Object.hasOwn(techniques, raw) ? (raw as TechniqueId) : null
  if (isSport(section))
    return lessonFor(section, id && sportFor(id) === section ? id : preferred)
  const old = id ?? preferred
  switch (section) {
    case 'technique-lab':
      return !isTrick(old) && !isSafety(old) && !isSwitchDrill(old)
        ? old
        : equipmentFor(preferred) === 'skis'
          ? 'parallel'
          : 'boardCarve'
    case 'ski-tricks':
      return isTrick(old) && sportFor(old) === 'skiing' ? old : 'straightAir'
    case 'snowboard-tricks':
      return isTrick(old) && sportFor(old) === 'snowboarding'
        ? old
        : 'boardOllie'
    case 'switch-riding':
      return isSwitchDrill(old)
        ? old
        : equipmentFor(preferred) === 'skis'
          ? 'skiSwitch'
          : 'boardSwitch'
    default:
      return null
  }
}
