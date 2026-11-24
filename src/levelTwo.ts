import type { Lens } from './analysis.ts'
import type { CourseId, Setup, SurfaceId, TechniqueId } from './course.ts'
import type { Sport } from './library.ts'

export const goals = {
  wedge: [4, 'gliding wedge arcs'],
  match: [4, 'matched turn finishes'],
  parallel: [4, 'linked parallel arcs'],
  track: [4, 'low-slip arcs'],
  transfer: [4, 'outside-ski transfers'],
  short: [5, 'short turns in rhythm'],
  resize: [6, 'timed turns in sequence'],
  funnel: [5, 'progressively shorter turns'],
  line: [3, 'centered gate crossings'],
  absorb: [3, 'crest-to-trough cycles'],
  brush: [4, 'brushed turns'],
  twist: [4, 'flexed edge changes'],
  switch: [4, 'linked switch turns'],
  spin: [1, 'aligned 180 landing'],
  press: [1.2, 's of continuous tail press'],
  grab: [1, 'clean grab landing'],
  shifty: [1, 'realigned shifty landing'],
} as const
export type Task = keyof typeof goals
export type Decision = {
  question: string
  answers: readonly [string, string, string]
  correct: number
  reason: string
}
const decision = (
  question: string,
  answers: Decision['answers'],
  correct: number,
  reason: string,
): Decision => ({ question, answers, correct, reason })

export const teachingCases = {
  listen: decision(
    'One guest wants faster turns. Another quietly drops back. What would you do before the next lap?',
    [
      'Set the same faster pace for both.',
      'Ask each what felt manageable and agree on a shared meeting place and two options.',
      'Ask the faster guest to explain the drill to everyone.',
    ],
    1,
    'Two-way listening gives both guests a voice. Offer a shorter line and a wider line that end in view of one another, then check whether each option met its goal.',
  ),
  feedback: decision(
    'A guest says “I always get this wrong” after seeing the replay. What feedback would help on the next attempt?',
    [
      'Point to one successful change of support, ask what they felt, then agree on one cue.',
      'List every movement that differed from the reference.',
      'Tell them to trust the equipment.',
    ],
    0,
    'An observable success and a question connect your feedback to the learner’s experience. Revisit the same section to see whether the agreed cue changes the track.',
  ),
  plan: decision(
    'An intermediate group wants shorter turns. Their wide turns are consistent. Which progression gives you evidence of learning?',
    [
      'Start everyone in the narrowest corridor.',
      'Repeat the wide turns until the end of the lesson.',
      'Agree on a corridor, shorten two turns at a time, and ask each rider to identify where the line changed.',
    ],
    2,
    'Change one demand at a time. A visible corridor makes the goal specific and gives each learner a way to evaluate the result.',
  ),
  terrain: decision(
    'The first uneven pitch feels intimidating to two group members. How would you adapt the activity?',
    [
      'Take one visible, isolated roller with an easier bypass, regroup below it and ask what they noticed.',
      'Send the strongest rider into the full bump line first.',
      'Keep the original line and increase the spacing.',
    ],
    0,
    'A short, visible feature preserves the pressure-control goal while reducing the physical and emotional demands. Check comfort before choosing the next feature together.',
  ),
  inclusion: decision(
    'A confident partner keeps answering for a quieter guest. How would you involve both?',
    [
      'Give the quieter guest a demonstration to copy silently.',
      'Invite each to describe one track in turn, then swap observer and rider roles.',
      'Ask the more vocal partner to grade the next run.',
    ],
    1,
    'Structured turns to speak and observe make room for both learners. Ask permission before sharing individual feedback with the group.',
  ),
  equipment: decision(
    'A guest using unfamiliar equipment reports that the usual cue feels different. What would you investigate first?',
    [
      'Prescribe the same movement with more force.',
      'Change the binding settings on the hill.',
      'Ask about the equipment and sensation, observe an easy baseline run, and refer fit or adjustment questions to a qualified technician.',
    ],
    2,
    'Sidecut, stiffness, stance and boot support can change the response. Compare the same task on familiar terrain and adapt the cue to what you observe.',
  ),
  reflect: decision(
    'After two attempts, a guest asks whether the change helped. Which review gives the learner ownership?',
    [
      'Ask them to predict the second track, compare it with the first, and choose a cue for the next lap.',
      'Read out the score and move on.',
      'Demonstrate again before hearing their impression.',
    ],
    0,
    'Prediction, observation and reflection link sensation to a visible outcome. Ask where else the learner could use that change.',
  ),
  park: decision(
    'A small freestyle feature has a blind landing and a waiting group. What is the appropriate lesson decision?',
    [
      'Use the first rider to check whether the landing is clear.',
      'Pause, inspect the approach and landing from a safe place, and use a visible flat-snow alternative if the line is unsuitable.',
      'Send pairs to keep the group together.',
    ],
    1,
    'Inspect the feature and traffic before committing. Agree on spacing, consent and a stopping point visible from above. A flat-snow rehearsal preserves the sequencing goal.',
  ),
  adapt: decision(
    'A demonstration and a spoken cue leave one guest puzzled. How could you check understanding?',
    [
      'Give the same explanation more loudly.',
      'Move straight to harder terrain.',
      'Trace the intended arc in the snow, demonstrate it slowly, and invite the guest to show the part they want to try.',
    ],
    2,
    'A visual cue and a teach-back give the learner another way to communicate. Use their response to change the task or language.',
  ),
} as const

type Group = 'Integrated' | 'Individual' | 'Versatility' | 'Core' | 'Supporting'
export type Station = {
  id: string
  sport: Sport
  name: string
  group: Group
  page: number
  technique: TechniqueId
  course: CourseId
  surface: SurfaceId
  task: Task
  lens: Lens
  aim: string
  cue: string
  change: string
  observation: Decision
  teaching: keyof typeof teachingCases
}
function station(
  id: string,
  name: string,
  group: Group,
  page: number,
  technique: TechniqueId,
  course: CourseId,
  surface: SurfaceId,
  task: Task,
  lens: Lens,
  aim: string,
  cue: string,
  change: string,
  observation: Decision,
  teaching: Station['teaching'],
): Station {
  return {
    id,
    name,
    group,
    page,
    technique,
    course,
    surface,
    task,
    lens,
    aim,
    cue,
    change,
    observation,
    teaching,
    sport: technique.startsWith('board') ? 'snowboarding' : 'skiing',
  }
}
export const stations: readonly Station[] = [
  station(
    'gliding-wedge',
    'Gliding wedge',
    'Integrated',
    24,
    'wedge',
    'meadow',
    'groomed',
    'wedge',
    'body',
    'Guide both skis around a round arc while the tails stay apart. Watch the moving feet under a quiet torso.',
    'Tap left and right gently. Let each arc develop before changing sides.',
    'Hard braking',
    decision(
      'What changes when the rider holds the brake through shaping?',
      [
        'The skis tip farther and leave narrower tracks.',
        'The tails spread and slip increases.',
        'The inside ski matches earlier.',
      ],
      1,
      'The wider wedge and extra sliding resistance slow the skier. Use a smaller gliding wedge and let the line manage speed.',
    ),
    'adapt',
  ),
  station(
    'wedge-christie',
    'Wedge to parallel',
    'Integrated',
    25,
    'parallel',
    'meadow',
    'groomed',
    'match',
    'body',
    'Open a small wedge at entry. Watch the inside ski turn and match the outside ski as pressure builds.',
    'Build the edge progressively and hold Flex in shaping to let the inside ski match.',
    'Stiff inside leg',
    decision(
      'Compare the skis after entry. What prevents the matched finish?',
      [
        'The skier tips both skis too far after they have already matched.',
        'Both skis flatten too early.',
        'The inside ski stays angled out as the legs stay long.',
      ],
      2,
      'Steer the inside leg toward the outside ski’s direction as support moves across. The leg and ski outlines show when the match happens.',
    ),
    'feedback',
  ),
  station(
    'basic-parallel',
    'Linked parallel turns',
    'Integrated',
    26,
    'parallel',
    'ridge',
    'groomed',
    'parallel',
    'body',
    'Follow the feet from one edge change to the next. Look for both skis changing direction under a stable upper body.',
    'Alternate steering across the fall line. Give each turn time to build before releasing.',
    'Shallow steering',
    decision(
      'Why do the two tracks stay closer to the fall line in the altered pass?',
      [
        'Less edge and leg steering produce less change of direction.',
        'The skier loads the outside ski more abruptly at the apex.',
        'The skier releases later and finishes farther across the hill.',
      ],
      0,
      'The slope and equipment are identical. Increase steering through shaping and release both skis together for the next arc.',
    ),
    'listen',
  ),
  station(
    'railroad-tracks',
    'Railroad tracks',
    'Individual',
    27,
    'carve',
    'meadow',
    'groomed',
    'track',
    'contact',
    'Compare two pencil-thin carved arcs with a brushed finish. Look at edge engagement and the width of the track.',
    'Roll onto each edge and release smoothly. Keep the brake off through the arc.',
    'Brake through shaping',
    decision(
      'Which two changes explain the broader track in the altered pass?',
      [
        'More edge tilt and an earlier weight transfer.',
        'More sliding across the edges and less effective tilt.',
        'Longer outside-leg extension and a later release.',
      ],
      1,
      'Braking reduces the achieved edge angle and increases modeled slip. Release it and roll both lower legs progressively to draw a narrower arc.',
    ),
    'equipment',
  ),
  station(
    'outside-ski',
    'Outside-ski support',
    'Individual',
    33,
    'parallel',
    'ridge',
    'groomed',
    'transfer',
    'forces',
    'Prepare for stork turns by building support on one outside ski, then transferring to the other. Both skis stay down in this exercise.',
    'Hold each arc until the outside ski carries at least 68% of the modeled load. Alternate sides.',
    'Under-edged arc',
    decision(
      'What follows the smaller tilt through shaping?',
      [
        'Less lateral acceleration and a smaller shift of load to the outside ski.',
        'Equal load on both skis throughout each pass.',
        'More load on the new outside ski before release.',
      ],
      0,
      'Turn force grows with direction change. Build the edge and let pressure migrate before softening the old outside leg.',
    ),
    'inclusion',
  ),
  station(
    'short-radius',
    'Short-turn rhythm',
    'Versatility',
    36,
    'short',
    'ridge',
    'groomed',
    'short',
    'body',
    'Keep the torso moving downhill as the legs change edges beneath it. Compare short and lingering arcs.',
    'Change direction about once a second. Keep both edges active on successive turns.',
    'Lingering turns',
    decision(
      'Which change would bring the altered rhythm back into the narrow corridor?',
      [
        'Hold the old edges longer.',
        'Increase the time between turns.',
        'Release sooner and guide the legs onto the new edges.',
      ],
      2,
      'The longer edge hold lengthens the arc. Earlier release changes the duration and timing while the torso continues downhill.',
    ),
    'plan',
  ),
  station(
    'radius-change',
    'Short–medium–short',
    'Versatility',
    37,
    'short',
    'ridge',
    'groomed',
    'resize',
    'contact',
    'Use two short turns, two longer turns and two short turns. Compare the spacing between edge changes.',
    'Follow the timing cue in the HUD. Hold the middle pair longer, then return to the opening rhythm.',
    'One steady rhythm',
    decision(
      'What is missing in the middle of the altered track?',
      [
        'A stronger edge set at every transition.',
        'A longer shaping phase and more time between releases.',
        'A shorter, faster leg movement in the middle pair.',
      ],
      1,
      'Keep the same equipment. Lengthen the middle two edge holds and then shorten the rhythm again.',
    ),
    'reflect',
  ),
  station(
    'ski-funnel',
    'Narrowing funnel',
    'Versatility',
    39,
    'short',
    'rollers',
    'powder',
    'funnel',
    'contact',
    'Shorten the time from one release to the next as the track narrows in soft snow.',
    'Start with broad arcs. Follow the progressively shorter beat before reversing the edges.',
    'Unchanging turn size',
    decision(
      'Why does the altered line keep its width?',
      [
        'The rider keeps the same timing from arc to arc.',
        'Pressure shifts progressively farther toward the tips.',
        'The legs progressively turn the skis farther across the hill.',
      ],
      0,
      'Shorten the duration of each edge hold progressively. Adjust the rate of leg steering to complete the shorter arc.',
    ),
    'plan',
  ),
  station(
    'lane-change',
    'Change lanes',
    'Versatility',
    38,
    'short',
    'traverse',
    'groomed',
    'line',
    'forces',
    'Adapt the line across a sidehill. Look through the next gate and account for the downhill drift.',
    'Cross within 2.5 m of each gate center. Aim early enough to compensate for the bank.',
    'Late line choice',
    decision(
      'Which adjustment would move the rider closer to the gate center?',
      [
        'Brake only after passing the gate.',
        'Keep steering down the fall line.',
        'Look ahead and start changing the line earlier.',
      ],
      2,
      'The altered rider follows the earlier position on the course. Earlier direction change leaves time to compensate for the bank.',
    ),
    'listen',
  ),
  station(
    'mogul-line',
    'Short turns in bumps',
    'Versatility',
    40,
    'short',
    'moguls',
    'powder',
    'absorb',
    'body',
    'Follow the knees and pelvis over a bump. Shorten the legs near the crest and lengthen them into the trough.',
    'Use Flex as the snow rises, then release as it falls away. Link the movement over three features.',
    'Rigid legs',
    decision(
      'What changes in the altered rider over each crest?',
      [
        'The skier draws the feet up toward the pelvis earlier.',
        'The knees stay longer as the snow rises beneath the feet.',
        'The legs extend farther down the backside of the bump.',
      ],
      1,
      'The rigid rider loses the leg-length cycle. Retract over the crest and extend down the back to retain room for the next bump.',
    ),
    'terrain',
  ),
  station(
    'brushed-turns',
    'Brushed edge changes',
    'Core',
    23,
    'boardSkid',
    'ridge',
    'groomed',
    'brush',
    'contact',
    'Guide the board across the direction of travel on both edges. Watch the knees soften through the change.',
    'Use left and right steering with Flex. Maintain a controlled brush through each shaping phase.',
    'Stiff edge changes',
    decision(
      'What differs even though both riders leave a brushed track?',
      [
        'The altered rider keeps longer legs through the edge change.',
        'The altered rider steers a much wider board angle through shaping.',
        'The altered rider holds each edge much longer.',
      ],
      0,
      'A board can skid with different body movements. Flex through release, then guide the board onto the next edge and compare both turns.',
    ),
    'feedback',
  ),
  station(
    'carved-turns',
    'Carve both edges',
    'Core',
    24,
    'boardCarve',
    'ridge',
    'groomed',
    'track',
    'contact',
    'Hold a clean toe-edge arc, flatten the board, then establish the heel edge. Compare the board’s axis with its travel.',
    'Alternate toe and heel edges with a sustained edge angle and little sideways slip.',
    'Skid at the apex',
    decision(
      'What makes the board turn farther across its travel direction in the altered pass?',
      [
        'More tilt with the same edge hold.',
        'An earlier release with less braking.',
        'A stronger braking skid and more yaw relative to the track.',
      ],
      2,
      'Release the brake and build tilt with the ankles, knees and hips. The board then follows a narrower carved path.',
    ),
    'equipment',
  ),
  station(
    'bump-riding',
    'Absorb the bumps',
    'Core',
    25,
    'boardSkid',
    'moguls',
    'powder',
    'absorb',
    'body',
    'Bring the board up toward the hips at a crest. Reach down into the trough while keeping the next line in sight.',
    'Flex over each light crest and extend into the heavier trough. Repeat three cycles.',
    'Rigid legs',
    decision(
      'Which body change is missing between the crest and trough?',
      [
        'A progressively stronger twist of the board.',
        'A change in leg length to follow the surface.',
        'A full change in board heading over each crest.',
      ],
      1,
      'Yield as the terrain rises, then lengthen the legs while the surface falls away. Track knee angle alongside the snow load.',
    ),
    'terrain',
  ),
  station(
    'switch-turns',
    'Linked switch turns',
    'Core',
    26,
    'boardSwitch',
    'ridge',
    'groomed',
    'switch',
    'body',
    'Ride with the right foot leading, link both edges and look along the new direction of travel.',
    'Stay switch and alternate edges. Watch which foot leads while the board crosses the fall line.',
    'Pivot to regular',
    decision(
      'What explains the new leading foot in the altered pass?',
      [
        'The rider pivots back to regular and the nose leads again.',
        'The rider tips from the toe edge to the heel edge without pivoting.',
        'The rider looks over the opposite shoulder while maintaining stance.',
      ],
      0,
      'Follow the pivot and the end of the board that leads. Keep the switch stance while adjusting your gaze and edge timing.',
    ),
    'inclusion',
  ),
  station(
    'air-180',
    'Air 180 to switch',
    'Core',
    27,
    'boardFS180',
    'rollers',
    'groomed',
    'spin',
    'body',
    'Follow approach, takeoff, maneuver and landing. See how direction at release sets up a half turn and a switch exit.',
    'Hold Jump to load. Release with left steering from the regular stance, center the board for touchdown and ride away.',
    'No rotation at release',
    decision(
      'Why does the altered rider touch down in the original stance?',
      [
        'The rider changes the edge angle after leaving the snow.',
        'The rider absorbs the landing more deeply after snow contact.',
        'The takeoff lacked the rotational input for a half turn.',
      ],
      2,
      'Create the rotational impulse while supported, then let the board and body realign at touchdown. Compare the spin at the apex and the exit stance.',
    ),
    'park',
  ),
  station(
    'tail-press',
    'Tail-press preparation',
    'Core',
    28,
    'boardOllie',
    'meadow',
    'groomed',
    'press',
    'forces',
    'Move support toward the tail while the nose lifts. This flat-snow preparation isolates the fore–aft movement used on a small box.',
    'On a flat base, hold Jump to load the tail and sustain the press for 1.2 seconds before release.',
    'Early release',
    decision(
      'What cuts the sustained tail load short in the altered pass?',
      [
        'The rider keeps the nose high for longer.',
        'The rider releases the preload and leaves the snow.',
        'The rider remains on a flat base.',
      ],
      1,
      'Keep the center of mass toward the supported end while both feet control the board. In flight there is no snow reaction under the tail.',
    ),
    'equipment',
  ),
  station(
    'torsional-release',
    'Lead-foot release',
    'Supporting',
    41,
    'boardSkid',
    'traverse',
    'groomed',
    'twist',
    'contact',
    'Study a movement used in a pivot-slip progression. The lead and trailing feet can tip at different times, twisting the board between them.',
    'Hold Flex as you reverse steering. Compare the two transverse edge angles through the change.',
    'Feet tip together',
    decision(
      'At the edge change, what distinguishes the two decks?',
      [
        'The reference lead end tips first while the trailing end briefly stays on the old edge.',
        'Both ends of the reference deck pivot farther across the slope together.',
        'The reference rider simply holds a higher tilt at both ends.',
      ],
      0,
      'A difference in local tilt creates torsion. Progressively release the leading foot and let the trailing foot follow while regulating pressure.',
    ),
    'adapt',
  ),
  station(
    'switch-bumps',
    'Switch through bumps',
    'Supporting',
    30,
    'boardSwitch',
    'moguls',
    'powder',
    'absorb',
    'body',
    'Keep the right foot leading while the legs adapt to the snow. Compare the crest and trough from the edge camera.',
    'Stay switch, flex as the snow rises and extend into the hollows. Link three pressure cycles.',
    'Rigid switch stance',
    decision(
      'Which blend keeps the board following the uneven line in switch?',
      [
        'Turning the torso downhill and holding the knees locked.',
        'Increasing speed on each crest.',
        'Looking along the switch line and varying leg length with the surface.',
      ],
      2,
      'The lead foot stays the same through both phases. Adapt pressure with the legs while the head keeps the intended line in view.',
    ),
    'terrain',
  ),
  station(
    'board-funnel',
    'Funnel turns',
    'Supporting',
    43,
    'boardCarve',
    'gully',
    'groomed',
    'funnel',
    'contact',
    'Narrow the path by changing the duration of toe- and heel-edge arcs on a banked slope.',
    'Begin with a longer edge hold. Follow the decreasing time shown for each successive turn.',
    'Fixed edge timing',
    decision(
      'Which change is visible in the reference timing and missing from the altered run?',
      [
        'The new edge is held progressively longer.',
        'Each new edge change follows the last one sooner.',
        'The rider increases braking through every finish.',
      ],
      1,
      'Shorten the edge hold and adjust the rate of tipping to reshape the line. Read the bank before crossing the channel.',
    ),
    'reflect',
  ),
  station(
    'indy-air',
    'Small-air grab',
    'Supporting',
    32,
    'boardIndy',
    'rollers',
    'groomed',
    'grab',
    'body',
    'Bring the toe edge up to the rear hand after takeoff, release the grab and extend toward the landing.',
    'Hold Jump, release for lift, then hold Pose in the air. Release Pose before touching down.',
    'No grab in flight',
    decision(
      'What differs at the apex when both runs reach similar height?',
      [
        'Only the reference rider brings the board to the rear hand.',
        'Only the altered rider draws the board toward the rear hand.',
        'Only the reference rider creates a larger yaw at takeoff.',
      ],
      0,
      'Sequence the grab after takeoff. Draw the knees up and let the board meet the hand before opening for touchdown.',
    ),
    'park',
  ),
  station(
    'shifty-air',
    'Shifty and realign',
    'Supporting',
    35,
    'boardShifty',
    'rollers',
    'groomed',
    'shifty',
    'body',
    'Separate board and torso in the air. Return them to alignment before the board contacts the snow.',
    'Load and release Jump. Hold Pose during the maneuver, then release it before landing.',
    'Hold through landing',
    decision(
      'What is the best timing change for the altered rider?',
      [
        'Hold the twisted position farther into landing.',
        'Try to change edges in the air.',
        'Release the pose earlier so the board returns beneath the body.',
      ],
      2,
      'Compare the board axis and torso at the apex and touchdown. Preserve takeoff alignment, then unwind before snow contact.',
    ),
    'feedback',
  ),
  station(
    'switch-carve',
    'Switch carved arcs',
    'Supporting',
    31,
    'boardSwitch',
    'meadow',
    'groomed',
    'track',
    'contact',
    'Carry the new leading end smoothly from a switch toe-edge carve into a switch heel-edge carve.',
    'Stay switch and alternate edges without braking. Look for a narrow trace on both sides.',
    'Skidding in switch',
    decision(
      'Both riders stay switch. What widens the altered track?',
      [
        'The rider uses the right foot to lead.',
        'The braking skid turns the deck across its direction of travel.',
        'The rider brings the hips farther inside while keeping a clean carve.',
      ],
      1,
      'Keep the switch alignment while releasing the old edge progressively. Roll onto the new edge before increasing its load.',
    ),
    'reflect',
  ),
]
export const stationsFor = (sport: Sport) =>
  stations.filter((s) => s.sport === sport)
const stationMap = new Map(stations.map((s) => [s.id, s]))
export const findStation = (id?: string) =>
  id ? stationMap.get(id) : undefined
export const stationPath = (s: Station) => '#' + s.sport + '/level-ii/' + s.id
export function stationFromHash(hash: string) {
  const match = /^#(skiing|snowboarding)\/level-ii(?:\/([a-z0-9-]+))?\/?$/.exec(
    hash,
  )
  if (!match) return undefined
  const station = findStation(match[2])
  return station?.sport === match[1]
    ? station
    : stationsFor(match[1] as Sport)[0]
}
export const stationSetup = (s: Station): Setup => ({
  course: s.course,
  surface: s.surface,
  technique: s.technique,
  station: s.id,
})
export const stationFits = (s: Station, setup: Setup) =>
  s.course === setup.course &&
  s.technique === setup.technique &&
  s.surface === setup.surface &&
  (setup.stance !== 'switch' || setup.technique === 'boardSwitch')
const uploads = 'https://thesnowpros.org/wp-content/uploads/'
export const levelSources = {
  skiing: {
    publisher: 'PSIA',
    standard: uploads + '2025/11/PSIA_Alpine_Standards100225v5.pdf',
    activities:
      uploads + '2026/10/PSIA-AASI_National_Alpine_Activities_List_v1.2a.pdf',
  },
  snowboarding: {
    publisher: 'AASI',
    standard:
      uploads + '2025/10/AASI_Snowboard_Standards0224_updated_100325_v3.pdf',
    activities:
      uploads +
      '2026/10/PSIA-AASI_National_Snowboard_Activities_List_v1.0_10_26.pdf',
  },
}
