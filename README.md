# Fallline Alpine Simulator

Fallline is a full-screen ski and snowboard game for the browser. Choose **Skiing** or **Snowboarding**, then use the lesson picker for turns, tricks, switch riding, stopping, or falls. Drag to orbit the 3D rider, scrub an example, or take control on the mountain. The production app runs offline after its first successful visit. [Play Fallline](https://sloth-os.github.io/3D-Ski/) · [Skiing](https://sloth-os.github.io/3D-Ski/#skiing) · [Snowboarding](https://sloth-os.github.io/3D-Ski/#snowboarding)

## Playing

Open **Run setup** to choose terrain, equipment, technique, and snow. **Start run** gives you control. **Watch demo** follows a reference rider through the same course. Each cleared gate earns 100 points and linking opposite turns earns 25. The trail map shows your progress. Your latest 200 practice runs are stored on this device with gate scores, linked turns, time, peak speed, and exercise-specific edge control.

| Control         | Action                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| ← / → or A / D  | Steer, progressively engage the edges, and release to flatten the base |
| ↑ or W          | Tuck to reduce air drag                                                |
| ↓ or S          | Flex the legs over terrain changes                                     |
| Space           | Brake with the movement for the current lesson                         |
| E               | Check uphill after coming to rest in a stopping or falling drill       |
| Hold J, release | Charge a pop and jump in a freestyle drill                             |
| ← or → at pop   | Set the direction of a 180 or 360                                      |
| Hold K, release | Show a shifty or grab in flight, then open for touchdown               |
| V               | Pivot between forward and switch in open practice or a switch drill    |
| Enter           | Start or resume                                                        |
| P or Esc        | Pause or resume                                                        |
| C or 1–5        | Cycle cameras or select chase, helmet, trackside, edge, or aerial      |
| Drag, scroll, R | Orbit, zoom, or reset the selected external camera                     |
| F               | Cycle the force, body, contact, and muscle layers                              |
| .               | Advance a paused run or demonstration by one physics frame             |
| M or ?          | Toggle slope audio or open controls                                    |

On a touchscreen, hold **Pop** and lift your finger to jump. Keep a second finger on a steering arrow as you release Pop to spin. **Pose** controls shifties and grabs. Tap the stance beside the course name to pivot on the snow. Playback offers full, half, and quarter speed. Opening a tool or leaving the tab pauses an active descent.

### Mountain and equipment

| Course | Difficulty | Mean pitch | Length | Gates | Training focus |
| --- | --- | ---: | ---: | ---: | --- |
| Pine Meadow | Beginner | 10° | 380 m | 8 | Link wide turns in a gentle forest clearing. |
| [Larch Traverse](https://sloth-os.github.io/3D-Ski/#terrain/traverse) | Beginner | 12° | 440 m | 9 | Hold an edge across a sidehill, then change edges as the slope tilts the other way. |
| [Roller Run](https://sloth-os.github.io/3D-Ski/#terrain/rollers) | Intermediate | 16° | 480 m | 11 | Flex over rounded crests and extend into the hollows as the spacing tightens. |
| Alpine Ridge | Intermediate | 18° | 640 m | 12 | Link turns at a steady rhythm on a rolling piste. |
| [Banked Gully](https://sloth-os.github.io/3D-Ski/#terrain/gully) | Intermediate | 19° | 560 m | 12 | Cross a winding channel and use each bank to support the next turn. |
| [Mogul Garden](https://sloth-os.github.io/3D-Ski/#terrain/moguls) | Advanced | 21° | 390 m | 14 | Pick a line through staggered bumps and work the legs beneath a steady torso. |
| Glacier Bowl | Advanced | 24° | 780 m | 16 | Make tighter turns through changing pitch in an exposed alpine bowl. |

The seven courses are fictional Swiss training runs. Open **Run setup → Scout terrain** and move the position slider along the gate line. On the traverse, rollers, gully, and moguls, select a named section to jump to its midpoint. Switch the snow relief view between **Across trail** and **Down course** to see the local shape with the mean slope removed. The dot marks the position on the gate line. Pitch and bank report the snow angles there. **Apply setup** takes the selected course onto the mountain, where trailside signs mark the transitions. Mogul technique cues draw on flexion, extension, and line choice. [REI, How to Ski Moguls](https://www.rei.com/learn/expert-advice/how-to-ski-moguls.html)

Groomed, powder, and icy snow change friction, effective grip, contact area, and spray. Choose parallel, carved, wedge, or short turns on skis. On a snowboard, choose edge-to-edge carves or skidded turns with fixed bindings, toe and heel edges, and sideslip. Use **Run setup → Starting stance** to begin an open practice forward or switch.

### Stopping and falling

Each sport has two short exercises in an 18 m practice lane. Use **Space** or **Brake** to slow down, **↓ / S** or **Flex** to lower the body in the fall response, and **E** or **Check uphill** once stationary. Each drill has an orbitable, half-speed replay with phase controls.

| Lesson                                                                              | What to practice                                                                                                                      |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [Wedge stop](https://sloth-os.github.io/3D-Ski/#skiing/skiStop)                     | Keep the tips apart and spread the tails progressively. Compare your approach speed with the distance needed to stop.                 |
| [Snowboard edge stop](https://sloth-os.github.io/3D-Ski/#snowboarding/boardStop)    | Begin across the slope in a sideslip. Choose the heel or toe edge and increase uphill edge angle to slow both feet together.          |
| [Falling on skis](https://sloth-os.github.io/3D-Ski/#skiing/skiFall)                | Follow a low-speed sideways loss of balance. Keep knees flexed, hands forward, and wait until sliding ends before assessing recovery. |
| [Falling on a snowboard](https://sloth-os.github.io/3D-Ski/#snowboarding/boardFall) | Follow a low-speed heelside fall. Lower the hips, keep the arms in front, and observe how support moves from the board to the body.   |

The run log measures speed, distance, and time to rest from brake onset or the first body contact with snow. It also records the uphill check. Falls also record whether the flex cue was held at contact. The ground forces are estimates in a sliding model. On snow, practice with a qualified instructor on gentle terrain. After a fall, first check for injury and signal for patrol if hurt or unsure. [Vermont Ski Safety](https://vermontskisafety.com/research/tips/) · [Nemours KidsHealth](https://kidshealth.org/en/teens/safety-snowboarding.html) · [SnowProfessor](https://snowprofessor.com/step-6-get-up-start-stop) · [NSAA Responsibility Code](https://skisafety.us/your-responsibility-code)

### Practicing ski tricks

Open **Skiing**, pick a move from **Lesson**, and use the replay to study approach, takeoff, maneuver, and landing. Drag to orbit the rider, scrub the timeline, or select a phase. The dotted arc follows the simulated jump. Switch between body joints, force vectors, and snow contact before choosing **Practice this trick** or **Watch demo**.

| Trick        | What to look for in the replay                                                      | Clean landing |
| ------------ | ----------------------------------------------------------------------------------- | ------------: |
| Straight air | Both skis leave the snow together and the legs absorb the landing                   |     80 points |
| Ollie        | The tails carry the preload as the tips rise first                                  |    110 points |
| Nollie       | The tips carry the preload as the tails rise first                                  |    120 points |
| Shifty       | The skis twist across the flight path while the shoulders turn the other way        |    150 points |
| Safety grab  | The right hand meets the outside edge of the raised right ski                       |    180 points |
| Mute grab    | The tips cross and the left hand reaches the upper right ski                        |    220 points |
| 180          | A half-turn changes your landing stance. Link two to return to your original stance |    190 points |
| 360          | One full rotation returns you to your approach stance                               |    280 points |

A full pop takes about half a second to charge. Grabs and shifties score when the pose is held visibly and released before landing. Spins use the rotation set at takeoff and can finish under- or over-rotated. The run log stores attempts, clean landings, longest completed airtime, and trick points alongside the gate score. These are simulator scoring rules.

### Practicing snowboard tricks

Select a trick and scrub between takeoff, the apex, and landing. In **Body**, follow the highlighted arm from shoulder to elbow to the glove’s contact point on the deck. In **Contact**, watch pressure move between the bindings during preload, drop to zero in flight, and rise on touchdown. Both feet stay attached to the same deck as it pitches and turns. [Snowboard trick studio](https://sloth-os.github.io/3D-Ski/#snowboarding/boardIndy)

| Trick            | Movement to study                                                        | Clean landing |
| ---------------- | ------------------------------------------------------------------------ | ------------: |
| Board ollie      | Load the trailing end and lift the leading end first                     |    110 points |
| Board nollie     | Reverse the preload and lift the trailing end first                      |    130 points |
| Frontside shifty | Turn the board across the flight path while the shoulders counter-rotate |    155 points |
| Indy grab        | Trailing hand on the toe edge, just inside the trailing binding          |    180 points |
| Melon grab       | Leading hand on the heel edge between the feet                           |    200 points |
| Nose grab        | Draw up the leading knee to bring the tip to the leading hand            |    220 points |
| Frontside 180    | Turn chest-first through downhill and land on the other lead foot        |    190 points |
| Backside 180     | Turn back-first through downhill and land on the other lead foot         |    210 points |
| Frontside 360    | Complete a frontside rotation and ride out in the starting stance        |    290 points |

With the simulator’s regular setup, left foot leads and a frontside spin starts left. Riding switch puts the right foot first and reverses the spin cue. A half-turn in the opposite direction still changes the lead foot, and the game identifies the missed trick. Switch grab variations use the advancing end as the reference, so a switch nose grab reaches the physical tail. [Snowboard grab reference](https://snowboardaddiction.com/blogs/training-education/112716804-the-complicated-world-of-snowboard-grabs) · [Frontside 180](https://snowboardaddiction.com/blogs/training-education/how-to-frontside-180-on-snow) · [Backside 180](https://snowboardaddiction.com/blogs/training-education/how-to-backside-180-on-snow)

### Skiing backwards and riding switch

**Skiing backwards** starts with the tails leading. The skier changes the foot stagger and looks over the outside shoulder as the turn changes direction. **Switch snowboarding** starts with the right foot leading. A right turn engages the heel edge in switch and the toe edge in regular. In the turn study, hold the same steering angle and change stance to compare the loaded ski or edge. The turquoise arrow tracks travel as the equipment turns. [Skiing backwards](https://sloth-os.github.io/3D-Ski/#skiing/skiSwitch) · [Switch snowboarding](https://sloth-os.github.io/3D-Ski/#snowboarding/boardSwitch)

Press **V** or tap the stance to pivot once on the snow. The base flattens as the equipment turns through 180° and the rider continues downhill. The switch practice display tracks downhill distance and linked turns. The run log also records gates cleared while riding switch. Airborne tricks have their own score. [Ski Addiction on switch skiing](https://skiaddiction.com/blogs/training-education/how-to-ski-switch) · [Snowboard Addiction on riding switch](https://snowboardaddiction.com/blogs/training-education/how-to-ride-switch)

### Studying a turn

- **Forces** draws gravity and air drag at the center of mass and snow reaction at the weighted contact point. The arrows share a force scale. Select an annotation or an instrument to capture that frame. The inspector resolves the vectors in newtons and shows the net force.
- **Body** attaches joint markers to both hips, knees, and ankles. The highlighted center of mass moves with inclination, flexion, and tuck. The displayed knee angles are measured from the same two-link legs that drive the animation.
- **Contact** shows two ski contact patches or two loading regions on one snowboard edge. Compare normal load, sliding resistance, estimated contact pressure, and the left/right ski or front/rear binding split.
- **Skiing** and **Snowboarding** provide lesson phases, a drill, and a draggable 3D rider. Change speed and peak edge angle, link successive turns, or inspect the bindings in close-up. The terrain profile samples course elevation, local pitch, and the downhill component of gravity.

### How muscles work

Every lesson opens with **Muscle demand** selected on the 3D rider. Orbit to see the quadriceps and shins in front, the hamstrings and calves behind, or the hip adductors, gluteals, hip flexors, spinal extensors, obliques, and deltoids. **Muscle focus** can follow the movement or isolate a group. Each side has its own light, moderate, or high demand reading. Starting practice or a demo carries that view onto the mountain.

- In a ski turn, select **Quadriceps**, play **Link turns**, and watch demand shift to the new outside leg. On a snowboard, compare the lower legs on a toe-edge and a heel-edge turn. [Ski turns](https://sloth-os.github.io/3D-Ski/#skiing/carve) · [Snowboard turns](https://sloth-os.github.io/3D-Ski/#snowboarding/boardCarve)
- In a jump, compare **Preload**, **Takeoff**, **Maneuver**, and **Landing**. The rider lowers the hips, extends against the snow, draws the legs up, and bends progressively after touchdown. During a grab, one shoulder reaches toward the equipment and the other arm balances it. The snow-force moment falls to zero in flight while the limbs still move. [Straight air](https://sloth-os.github.io/3D-Ski/#skiing/straightAir) · [Indy grab](https://sloth-os.github.io/3D-Ski/#snowboarding/boardIndy)

The frame inspector reports the magnitude of the snow reaction’s moment about each modeled knee flexion axis in N·m. It uses the vector from knee to contact and that foot’s share of the reaction. The educational muscle estimates also use flexion, edge engagement, trunk rotation, and arm reach. The colors describe relative demand in this rider. Estimating individual physiological activation requires additional measurements. [Berg and Eiken on alpine skiing](https://pubmed.ncbi.nlm.nih.gov/10416571/) · [Hirose and colleagues on snowboard turns](https://doi.org/10.1016/j.proeng.2012.04.129) · [DeVita and Skelly on landing](https://pubmed.ncbi.nlm.nih.gov/1548984/)

## Physics and research

The fixed 60 Hz model follows the terrain height field. It resolves gravity along the path, sliding resistance, braking, quadratic drag, edge engagement, and steering. Local snow curvature changes the normal load. A rider crossing a roller at the same speed feels less support on a crest and more in a hollow. On the four sculpted courses the model also resolves gravity across the bank, so a flat ski or board on a gully wall drifts toward the floor. The reference rider reads upcoming rollers and moguls, retracting the legs over crests and extending into hollows. The game, force inspector, and terrain profile sample the same snow surface. Speed and yaw rate determine the instantaneous path radius. The ideal-edge experiment uses sidecut geometry and lateral acceleration, with a peak radius of approximately `sidecut × cos(edge angle)` and peak acceleration of `speed² / radius`. [Physics of Skiing](https://www.real-world-physics-problems.com/physics-of-skiing.html)

The analysis assumes a 75 kg rider. Body pose, binding loads, and snow contact area are estimates from the model. Pressure, edging, rotation, and flexion cues draw on the alpine and snowboard fundamentals. [PSIA Alpine Certification Standards](https://thesnowpros.org/wp-content/uploads/2025/11/PSIA_Alpine_Standards100225v5.pdf) · [AASI Snowboard Certification Standards](https://thesnowpros.org/wp-content/uploads/2025/10/AASI_Snowboard_Standards0224_updated_100325_v3.pdf)

The freestyle model gives the rider an upward impulse from the rolling course surface. Gravity and quadratic air drag act through flight. The reaction force and contact pressure drop to zero until the ballistic path intersects the terrain. A short modeled compression absorbs the normal impact speed. Equipment orientation can change independently of the flight path. The studio replays use the same fixed-step simulation and inputs as the playable drills.

The four lesson phases follow the PSIA-AASI freestyle performance guide. The guide describes fore–aft loading, maintaining a grab in the air, and aligning the equipment for landing. Each trick also links to its movement tutorial in the game. [PSIA-AASI Freestyle Specialist Performance Guide](https://thesnowpros.org/wp-content/uploads/2025/01/Frestyle-Specialist-Performance-Guide-Nov2022_2-2.pdf) · [Ski Addiction on the shifty](https://skiaddiction.com/blogs/training-education/how-to-shifty-zero-spin) · [Safety and mute grabs](https://skiaddiction.com/blogs/training-education/how-to-safety-mute-grab) · [The 360](https://skiaddiction.com/blogs/training-education/how-to-360)

The lessons connect speed and turn shape with staying in control. [NSAA Your Responsibility Code](https://skisafety.us/your-responsibility-code)

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. For the installable production build, run the following and open `http://localhost:4173`.

```sh
npm test
npm run build
npm run preview
```

React and TypeScript manage the instruments. Three.js renders the rider, equipment, forces, piste, scenery, tracks, and particles. A perspective Canvas renderer handles devices without WebGL. The opening panorama, backdrops, vegetation, and fonts ship locally. Production builds include third-party notices in `licenses.txt`.

## Offline installation and publishing

After the production app shows **Offline ready**, its service worker has cached all courses, images, software, fonts, and lessons. A fresh course, the 3D lab, and the local run log remain available offline. Linked research publications open on their publishers’ sites. Use **Settings → Install Fallline** when the browser offers installation. On iOS, use **Share → Add to Home Screen** in Safari.

The GitHub Actions workflow runs on pushes to the default branch and manual dispatch. It runs the physics regressions, builds the production app, exercises the WebGL cockpit and disconnected PWA with Chromium, and deploys the resulting artifact. Repository Pages settings use **GitHub Actions** as the deployment source. Relative asset URLs and the scoped manifest and service worker support repository subpaths. [Publishing workflow](.github/workflows/pages.yml)

The regression suite covers all 609 course, surface, and lesson combinations, including 105 stopping and falling replays with both snowboard stopping edges, and 714 freestyle replays across both starting stances. It checks force balance, grabs, binding attachment, toe and heel edges, surface pivots, switch landings, and scoring. To repeat the browser checks locally, first build the site and then run the following. An existing Chromium executable can be selected with `FALLLINE_CHROMIUM`.

```sh
npx playwright-core install --only-shell chromium
npm run test:cockpit
npm run test:offline
```
