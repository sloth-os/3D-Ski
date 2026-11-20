import { safetyLessons, isSafety } from './safety.ts'
import { freestyleGuide, isBoardTrick, tricks } from './tricks.ts'

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
  boardCarve: {
    name: 'Edge-to-edge carve',
    category: 'Snowboard edging',
    edge: [23, 48],
    sidecut: 8.6,
    response: 0.87,
    cue: 'Move your center of mass across the board and build pressure on the new edge.',
    objective:
      'Link toe-side and heel-side arcs with a progressive edge change.',
    phases: [
      [
        'Release',
        'Flex through the ankles and knees to release the old edge and bring the board flatter.',
      ],
      [
        'Tip',
        'Move the body across the board. Engage the new edge smoothly while both feet stay connected to the deck.',
      ],
      [
        'Shape',
        'Allow the sidecut to guide the board across the fall line, then soften the legs for the next transition.',
      ],
    ],
    drill:
      'In the regular stance, steer right to engage the toe edge and left to engage the heel edge. Ease off between arcs.',
    watch:
      'Follow the pressure markers under the bindings as the board rolls from one edge to the other.',
  },
  boardSkid: {
    name: 'Skidded turns',
    category: 'Snowboard speed control',
    edge: [10, 31],
    sidecut: 9.4,
    response: 0.98,
    cue: 'Pivot the board across your direction of travel and regulate grip with edge angle.',
    objective:
      'Manage speed by blending edge tilt and controlled sideways slip.',
    phases: [
      [
        'Flatten',
        'Soften both legs and reduce board tilt while keeping the hips over the feet.',
      ],
      [
        'Pivot',
        'Guide the board across the hill through the feet and legs. Keep the arms quiet.',
      ],
      [
        'Regulate',
        'Use the uphill edge to control the slide. Ease pressure progressively as you change direction.',
      ],
    ],
    drill:
      'Use the brake while steering. Compare the resistance vector with a clean carved turn on the same surface.',
    watch:
      'Observe the angle between board heading and travel, the change in speed, and the front-to-rear load distribution.',
  },
  skiSwitch: {
    name: 'Skiing backwards',
    category: 'Switch · Alpine skis',
    edge: [14, 34],
    sidecut: 19,
    response: 0.96,
    objective:
      'Link parallel turns with the ski tails leading and keep the downhill line in view.',
    cue: 'Stagger the feet, look over the outside shoulder and guide both tails through the turn.',
    phases: [
      [
        'Set the stance',
        'Start tails first on a gentle piste. Keep the knees soft and stagger the feet to make room to look downhill.',
      ],
      [
        'Guide the tails',
        'Look over the outside shoulder and steer the tails through a rounded arc.',
      ],
      [
        'Change shoulders',
        'As you release the edges, change the stagger and turn your gaze through the new outside shoulder.',
      ],
    ],
    drill:
      'Start switch on Pine Meadow. Link two opposite turns and clear a gate tails first. Use V or Pivot to return to forward.',
    watch:
      'The travel arrow stays downhill as the ski tips face uphill. Compare the outside ski and shoulder on each arc.',
    source:
      'https://skiaddiction.com/blogs/training-education/how-to-ski-switch',
  },
  boardSwitch: {
    name: 'Switch snowboarding',
    category: 'Switch · Snowboard',
    edge: [16, 38],
    sidecut: 8.8,
    response: 0.91,
    objective:
      'Ride with the opposite foot leading and link controlled toe-side and heel-side turns.',
    cue: 'Look past the new leading foot, center the hips and roll progressively onto the new edge.',
    phases: [
      [
        'Change the lead',
        'With the regular setup, switch puts the right foot downhill. Look along the board past that binding.',
      ],
      [
        'Find both edges',
        'Steer right to engage the heel edge in switch. Flatten the board before guiding it left onto the toe edge.',
      ],
      [
        'Link the turns',
        'Keep the hips between the bindings and release the old edge smoothly before changing direction.',
      ],
    ],
    drill:
      'Start switch and link a heel-side turn to a toe-side turn. Use V or Pivot to compare the same inputs riding regular.',
    watch:
      'The nose and tail binding positions stay fixed on the deck. The rider changes the leading foot and shifts support toward it.',
    source:
      'https://snowboardaddiction.com/blogs/training-education/how-to-ride-switch',
  },
  ...safetyLessons,
  ...tricks,
} as const
export type TechniqueId = keyof typeof techniques
export type Equipment = 'skis' | 'snowboard'
export function equipmentFor(id: TechniqueId): Equipment {
  return id === 'boardStop' ||
    id === 'boardFall' ||
    id === 'boardCarve' ||
    id === 'boardSkid' ||
    id === 'boardSwitch' ||
    isBoardTrick(id)
    ? 'snowboard'
    : 'skis'
}
export const isSwitchDrill = (
  id: TechniqueId,
): id is 'skiSwitch' | 'boardSwitch' =>
  id === 'skiSwitch' || id === 'boardSwitch'
export const equipmentName = {
  skis: 'Alpine skis',
  snowboard: 'Snowboard',
} as const
export type Setup = {
  course: CourseId
  technique: TechniqueId
  surface: SurfaceId
  stance?: 'forward' | 'switch'
  stopEdge?: 'heel' | 'toe'
}
export const startsSwitch = (setup: Setup) =>
  !isSafety(setup.technique) &&
  (isSwitchDrill(setup.technique) || setup.stance === 'switch')
export function stanceLabel(board: boolean, switched: boolean) {
  if (board)
    return switched ? 'Switch · right foot leads' : 'Regular · left foot leads'
  return switched ? 'Backwards · tails lead' : 'Forward · tips lead'
}
export const defaultSetup: Setup = {
  course: 'ridge',
  technique: 'parallel',
  surface: 'groomed',
}

export const references = [
  {
    title: 'Freestyle Specialist Performance Guide',
    publisher: 'PSIA-AASI · Freestyle',
    url: freestyleGuide,
    note: 'The guide describes switch parallel skiing, switch snowboarding and the approach, takeoff, maneuver and landing phases of freestyle tricks.',
  },
  {
    title: 'Snowboarding Fundamentals',
    publisher: 'AASI · Snowboard Certification Standards',
    url: 'https://thesnowpros.org/wp-content/uploads/2025/10/AASI_Snowboard_Standards0224_updated_100325_v3.pdf',
    note: 'Board tilt, pivot, pressure along and across the board, and independent movements of the upper and lower body inform the snowboard drills.',
  },
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
    Object.hasOwn(surfaces, s.surface) &&
    (s.stopEdge === undefined ||
      s.stopEdge === 'heel' ||
      s.stopEdge === 'toe') &&
    (s.stance === undefined || s.stance === 'forward' || s.stance === 'switch')
  )
}
