// Each park lesson also uses the parallel-ski steering profile on its approach and ride-out.
const skiProfile = { sidecut: 19, response: 1, edge: [18, 38] as const }
export const freestyleGuide =
  'https://thesnowpros.org/wp-content/uploads/2025/01/Frestyle-Specialist-Performance-Guide-Nov2022_2-2.pdf'
const library = 'https://skiaddiction.com/blogs/training-education/'
type Lesson = {
  name: string
  category: string
  points: number
  source: string
  objective: string
  cue: string
  phases: readonly (readonly [string, string])[]
  drill: string
  watch: string
}
function lesson(data: Lesson) {
  return { ...skiProfile, ...data, source: library + data.source }
}
export const tricks = {
  straightAir: lesson({
    name: 'Straight air',
    category: 'Freestyle · Pop',
    points: 80,
    source: 'basics-of-jumping',
    objective:
      'Leave the snow with both skis together and absorb the return to the slope.',
    cue: 'Hold J to flex. Release J to pop. Keep the skis aligned for touchdown.',
    phases: [
      [
        'Approach',
        'Glide with both skis parallel and the hips centered over the boots.',
      ],
      ['Takeoff', 'Flex, then extend both legs together to lift off the snow.'],
      [
        'Maneuver',
        'Keep the skis level with each other and the hands in front.',
      ],
      [
        'Landing',
        'Let the legs compress as contact returns. Ride away along the approach line.',
      ],
    ],
    drill:
      'Hold J until the pop meter fills, then release. Try a shorter hold on the next jump and compare the airtime.',
    watch:
      'In the Forces layer, snow reaction vanishes during flight and returns as the legs absorb the landing.',
  }),
  ollie: lesson({
    name: 'Ollie',
    category: 'Freestyle · Tail pop',
    points: 110,
    source: 'how-to-ollie',
    objective:
      'Lift the tips first, spring from the ski tails, and bring the feet back beneath the hips.',
    cue: 'Hold J to load the tails. Release to spring upward and level the skis.',
    phases: [
      ['Approach', 'Start with the feet close and the legs ready to flex.'],
      [
        'Takeoff',
        'Move support toward the tails as the tips rise. Extend from the loaded tails.',
      ],
      [
        'Maneuver',
        'Draw the feet underneath the body and bring the skis parallel to the landing.',
      ],
      ['Landing', 'Settle back over both boots and absorb the contact.'],
    ],
    drill:
      'Use the trackside camera. Hold J, watch the tips rise, then release. Compare the sequence with a straight air.',
    watch:
      'The tails stay at the snow during the preload. The hips move back toward center in flight.',
  }),
  nollie: lesson({
    name: 'Nollie',
    category: 'Freestyle · Tip pop',
    points: 120,
    source: 'how-to-nollie-on-skis',
    objective:
      'Reverse the fore–aft loading of an ollie and spring from the ski tips.',
    cue: 'Hold J to load the tips. Release to pop and draw the skis back to level.',
    phases: [
      [
        'Approach',
        'Begin centered with soft knees and room to move the feet fore and aft.',
      ],
      [
        'Takeoff',
        'Draw the feet back and move the hips forward. The tails rise as the tips take the load.',
      ],
      [
        'Maneuver',
        'Extend from the tips, then bring the hips back over the boots.',
      ],
      [
        'Landing',
        'Match the landing pitch with both skis and flex through the return of pressure.',
      ],
    ],
    drill:
      'Hold and release J in the trackside view. Pause beside an ollie replay and compare which end lifts first.',
    watch:
      'The lift starts at the tails. In the contact view, the support point moves toward the tips before takeoff.',
  }),
  shifty: lesson({
    name: 'Shifty',
    category: 'Freestyle · Air position',
    points: 150,
    source: 'how-to-shifty-zero-spin',
    objective:
      'Counter-rotate the legs and shoulders in the air, then bring them back into alignment.',
    cue: 'Pop with J. Hold K to twist in flight and release K before landing.',
    phases: [
      [
        'Approach',
        'Carry a straight line with the shoulders square to travel.',
      ],
      [
        'Takeoff',
        'Pop from a centered stance with the skis traveling together.',
      ],
      [
        'Maneuver',
        'Turn the feet and hips across the line while the shoulders counter in the other direction.',
      ],
      [
        'Landing',
        'Unwind the ski–shoulder separation before the bases meet the snow.',
      ],
    ],
    drill:
      'After releasing J, hold K through the middle of the jump. Let K go as you begin to descend.',
    watch:
      'The equipment turns across the flight path while the whole rider completes zero net spin.',
  }),
  safetyGrab: lesson({
    name: 'Safety grab',
    category: 'Freestyle · Grab',
    points: 180,
    source: 'how-to-safety-mute-grab',
    objective:
      'Bring one ski up to the hand on the same side and show a controlled release.',
    cue: 'Pop with J. Hold K to take the right ski with the right hand. Release K to open.',
    phases: [
      ['Approach', 'Center the chest over the boots with the hands forward.'],
      ['Takeoff', 'Extend into the pop before drawing the knees upward.'],
      [
        'Maneuver',
        'Bring the right ski toward the right hand and hold the outside edge just ahead of the binding.',
      ],
      [
        'Landing',
        'Release the ski and open the legs into a balanced two-ski landing.',
      ],
    ],
    drill:
      'Hold K just after takeoff. In the replay, orbit to the rider’s right to see the glove meet the ski.',
    watch:
      'The knees bring the ski to the hand. A scored grab needs a visible hold and time to release.',
  }),
  muteGrab: lesson({
    name: 'Mute grab',
    category: 'Freestyle · Crossed-ski grab',
    points: 220,
    source: 'how-to-safety-mute-grab',
    objective:
      'Cross the ski tips and use the opposite hand to catch the upper ski.',
    cue: 'Pop with J. Hold K to cross and grab. Release K early enough to uncross.',
    phases: [
      [
        'Approach',
        'Start aligned and centered so both feet can lift together.',
      ],
      ['Takeoff', 'Extend upward, then pull the knees toward the torso.'],
      [
        'Maneuver',
        'Cross the right ski over the left and reach around the knees with the left hand to its outer edge.',
      ],
      [
        'Landing',
        'Release the grab, uncross, and match the skis to the slope.',
      ],
    ],
    drill:
      'Scrub the replay through the apex. Check the hand and ski sides, then repeat the hold-and-release timing on the course.',
    watch:
      'At the apex the right ski lies above the left. Both bases must be back in landing position at contact.',
  }),
  spin180: lesson({
    name: '180',
    category: 'Freestyle · Half rotation',
    points: 190,
    source: 'how-to-180',
    objective:
      'Turn through half a revolution and ride away switch, facing back up the slope.',
    cue: 'Charge J fully. Hold ← or → as you release J to set a half-turn.',
    phases: [
      [
        'Approach',
        'Approach with a stable base. Choose a direction for the turn.',
      ],
      [
        'Takeoff',
        'Extend off the snow and set the rotation with the hips and shoulders.',
      ],
      [
        'Maneuver',
        'Bring the skis through half a turn and keep the landing in sight over a shoulder.',
      ],
      [
        'Landing',
        'Touch down with the skis aligned to travel and the rider facing switch.',
      ],
    ],
    drill:
      'Set a direction at release. Keep riding switch after touchdown. A second clean 180 brings you back to forward.',
    watch:
      'The skier’s heading turns through 180° while the center of mass continues along the original flight path.',
  }),
  spin360: lesson({
    name: '360',
    category: 'Freestyle · Full rotation',
    points: 280,
    source: 'how-to-360',
    objective:
      'Use a full pop to carry a complete rotation and land facing the approach direction.',
    cue: 'Fill the J meter. Hold ← or → at release to set a full turn.',
    phases: [
      [
        'Approach',
        'Carry a balanced stance and choose the rotational direction.',
      ],
      ['Takeoff', 'Extend and set the spin through the shoulders and hips.'],
      [
        'Maneuver',
        'Keep the body compact around an upright axis and look through the turn for the landing.',
      ],
      [
        'Landing',
        'Open as the skis return to the travel direction. Absorb the load with both legs.',
      ],
    ],
    drill:
      'Compare a full and a partial charge. The launch sets the spin rate, so a short hop can run out of airtime before 360°.',
    watch:
      'Use the aerial camera to separate the rotation of the equipment from the direction of travel.',
  }),
} as const
export type TrickId = keyof typeof tricks
export function isTrick(id: string): id is TrickId {
  return Object.hasOwn(tricks, id)
}
export const isSpin = (id: TrickId) => id === 'spin180' || id === 'spin360'
export const usesPose = (id: TrickId) =>
  id === 'shifty' || id === 'safetyGrab' || id === 'muteGrab'
