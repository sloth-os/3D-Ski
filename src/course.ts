export const courses = {
  ridge: {
    name: 'Alpine Ridge',
    region: 'Valais, Switzerland',
    level: 'Intermediate',
    symbol: 'blue',
    pitch: 18,
    altitude: 2480,
    length: 640,
    gates: 12,
    width: 6,
    swing: 12,
    bumps: 0.48,
    image: 'images/alpine-ridge.webp',
    description: 'A rolling piste with a steady rhythm of linked turns.',
  },
  meadow: {
    name: 'Pine Meadow',
    region: 'Bernese Oberland, Switzerland',
    level: 'Beginner',
    symbol: 'green',
    pitch: 10,
    altitude: 1640,
    length: 380,
    gates: 8,
    width: 7,
    swing: 8,
    bumps: 0.15,
    image: 'images/pine-meadow.webp',
    description:
      'A gentle forest clearing with wide gates and room to find your balance.',
  },
  bowl: {
    name: 'Glacier Bowl',
    region: 'Graubünden, Switzerland',
    level: 'Advanced',
    symbol: 'black',
    pitch: 24,
    altitude: 3120,
    length: 780,
    gates: 16,
    width: 5.4,
    swing: 14,
    bumps: 1.05,
    image: 'images/glacier-bowl.webp',
    description:
      'An exposed high-alpine bowl with changing pitch and tighter gates.',
  },
} as const

export type CourseId = keyof typeof courses
export type Course = (typeof courses)[CourseId]

export const surfaces = {
  groomed: {
    name: 'Groomed',
    friction: 0.045,
    grip: 0.96,
    roughness: 0.18,
    note: 'Compacted corduroy gives a predictable platform for edging.',
  },
  powder: {
    name: 'Powder',
    friction: 0.109,
    grip: 0.77,
    roughness: 0.58,
    note: 'Soft snow increases resistance and softens the ski’s response.',
  },
  ice: {
    name: 'Icy',
    friction: 0.025,
    grip: 0.59,
    roughness: 0.07,
    note: 'Low friction maintains speed while reduced edge grip widens the turn.',
  },
} as const
export type SurfaceId = keyof typeof surfaces

export const techniques = {
  parallel: {
    name: 'Parallel turns',
    category: 'Foundations',
    edge: [18, 38],
    sidecut: 19,
    response: 1,
    cue: 'Roll both skis onto their new edges and build pressure on the outside ski.',
    objective:
      'Link smooth turns through the gates with both skis working together.',
    phases: [
      [
        'Release',
        'Soften the old outside leg and let both skis flatten as your body travels across them.',
      ],
      [
        'Engage',
        'Guide both legs into the new turn. Gradually tip the skis and feel support move to the new outside foot.',
      ],
      [
        'Shape',
        'Keep your torso quiet and guide the skis across the fall line before releasing again.',
      ],
    ],
    drill:
      'Alternate left and right inputs in gentle pulses. Release each input briefly as you cross the center of the run.',
    watch:
      'Watch the edge-angle trace fall toward zero between two rounded peaks.',
  },
  carve: {
    name: 'Carved turns',
    category: 'Edge control',
    edge: [32, 53],
    sidecut: 16,
    response: 1.12,
    cue: 'Build edge angle progressively and let the ski’s sidecut shape the arc.',
    objective:
      'Hold a clean arc, then release the edges smoothly into the next turn.',
    phases: [
      [
        'Tip',
        'Roll the ankles and knees toward the center of the new arc. Keep your hands ahead of your torso.',
      ],
      [
        'Build',
        'Support the turn with the outside leg as the inside leg shortens and the edges engage.',
      ],
      [
        'Release',
        'Reduce pressure and edge angle gradually, allowing the skis to travel under the body.',
      ],
    ],
    drill:
      'Hold a turn input to build the edge angle. Release before the next gate and roll onto the opposite edge.',
    watch:
      'A tighter path raises lateral acceleration. Compare turn radius and outside-ski load at different speeds.',
  },
  wedge: {
    name: 'Wedge turns',
    category: 'Speed control',
    edge: [9, 24],
    sidecut: 23,
    response: 0.91,
    cue: 'Keep a comfortable wedge and guide the outside ski through a rounded turn.',
    objective:
      'Use a steady wedge and rounded turn shape to control your descent.',
    phases: [
      [
        'Balance',
        'Start with tips closer together than tails, feet apart, and ankles softly flexed.',
      ],
      [
        'Guide',
        'Steer both legs and allow pressure to build on the outside ski. Keep the wedge comfortable.',
      ],
      [
        'Finish',
        'Continue across the hill to manage speed, then ease the pressure to change direction.',
      ],
    ],
    drill:
      'Choose Pine Meadow. Use short steering inputs and try braking early, well before each gate.',
    watch:
      'A wider skidding wedge dissipates energy. Compare speed with the skis pointing down and across the hill.',
  },
  short: {
    name: 'Short turns',
    category: 'Turn rhythm',
    edge: [20, 45],
    sidecut: 13.5,
    response: 1.32,
    cue: 'Flex to release the old edges and steer the legs beneath a stable upper body.',
    objective:
      'Keep a consistent left–right rhythm as the pitch and gate spacing change.',
    phases: [
      [
        'Retract',
        'Soften the legs to release the previous turn while keeping the torso directed down the corridor.',
      ],
      [
        'Redirect',
        'Steer the legs beneath the upper body and make a precise, progressive edge change.',
      ],
      [
        'Rebound',
        'Allow the outside leg to support the arc. Flex again as the next change approaches.',
      ],
    ],
    drill:
      'Pulse the steering keys in a quicker rhythm. Hold flex over terrain rolls and release into each new arc.',
    watch:
      'Look for evenly spaced edge-angle peaks and fewer jumps in pressure as you absorb the rollers.',
  },
} as const
export type TechniqueId = keyof typeof techniques
export type Setup = {
  course: CourseId
  technique: TechniqueId
  surface: SurfaceId
}
export const defaultSetup: Setup = {
  course: 'ridge',
  technique: 'parallel',
  surface: 'groomed',
}

export const references = [
  {
    title: 'Alpine Skiing Fundamentals',
    publisher: 'PSIA-AASI · Alpine Certification Standards',
    url: 'https://thesnowpros.org/wp-content/uploads/2025/11/PSIA_Alpine_Standards100225v5.pdf',
    note: 'Center of mass, outside-ski pressure, edge angle, leg rotation, and pressure regulation inform the movement cues.',
  },
  {
    title: 'Physics of Skiing',
    publisher: 'Real World Physics Problems',
    url: 'https://www.real-world-physics-problems.com/physics-of-skiing.html',
    note: 'Sidecut geometry, ski bending, skidding friction, and centripetal acceleration inform the turning model.',
  },
  {
    title: 'Your Responsibility Code',
    publisher: 'National Ski Areas Association',
    url: 'https://skisafety.us/your-responsibility-code',
    note: 'Choose a speed that lets you stop or avoid an obstacle, and give people downhill the right of way.',
  },
]

export function isSetup(value: unknown): value is Setup {
  if (!value || typeof value !== 'object') return false
  const s = value as Setup
  return (
    Object.hasOwn(courses, s.course) &&
    Object.hasOwn(techniques, s.technique) &&
    Object.hasOwn(surfaces, s.surface)
  )
}
