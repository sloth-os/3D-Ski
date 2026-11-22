import type { Course } from './course.ts'
import { featureStart, runoutStart } from './slope.ts'

const stages = {
  traverse: [
    [
      'Right-rising traverse',
      'Hold a traverse across the camber and feel which edge supports the rider.',
    ],
    [
      'Reverse camber',
      'The right side now falls away. Change edges smoothly and check the new direction of drift.',
    ],
  ],
  rollers: [
    [
      'Broad rollers',
      'Flex as the crest rises under the feet, then extend into the hollow.',
    ],
    [
      'Closer rollers',
      'The crests come sooner. Shorten the flexion and extension cycle to match their spacing.',
    ],
  ],
  gully: [
    [
      'Winding channel',
      'Look through the bend and let the bank support the turn before crossing the floor.',
    ],
    [
      'Deeper banks',
      'The channel deepens. Compare the surface tilt on the wall with the flatter floor.',
    ],
  ],
  moguls: [
    [
      'Staggered bumps',
      'Look one bump ahead. Flex the legs up the face and extend down the back.',
    ],
    [
      'Taller bumps',
      'Connect the troughs with short turns and let the legs move beneath a steady torso.',
    ],
  ],
} as const
export function courseStages(c: Course) {
  if (c.form === 'piste') return []
  const [first, second] = stages[c.form]
  return [
    {
      d: 0,
      name: 'Approach',
      cue: 'Use the even entry to set your speed and find the first gate.',
    },
    { d: featureStart, name: first[0], cue: first[1] },
    {
      d: Math.round((featureStart + runoutStart(c)) / 2),
      name: second[0],
      cue: second[1],
    },
    {
      d: runoutStart(c),
      name: 'Runout',
      cue: 'Release the edges as the surface evens out and look through the finish.',
    },
  ]
}
export function stageAt(stages: ReturnType<typeof courseStages>, d: number) {
  return stages.filter((stage) => stage.d <= d).at(-1)
}
