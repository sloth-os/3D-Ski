import type { Station } from './levelTwo.ts'
export type Strand = 'movement' | 'teaching' | 'run'
const session = new Set<string>()
const key = (s: Station, strand: Strand) =>
  'fallline.level-ii.' + s.id + '.' + strand
export function hasCredit(s: Station, strand: Strand) {
  const name = key(s, strand)
  try {
    return session.has(name) || localStorage.getItem(name) === '1'
  } catch {
    return session.has(name)
  }
}
export function markCredit(s: Station, strand: Strand) {
  const name = key(s, strand)
  session.add(name)
  try {
    localStorage.setItem(name, '1')
  } catch {
    /* Session credit remains available. */
  }
}
export const stationComplete = (s: Station) =>
  hasCredit(s, 'movement') && hasCredit(s, 'teaching') && hasCredit(s, 'run')
