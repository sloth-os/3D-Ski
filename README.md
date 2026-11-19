# Fallline Alpine Simulator

Fallline is a full-screen ski and snowboard game for the browser. Ride through alpine gates, practice freestyle ski tricks, or freeze a reference rider in midair and inspect the forces and joint positions in 3D. The production app runs offline after its first successful visit. [Play Fallline](https://sloth-os.github.io/3D-Ski/) · [Open the ski tricks](https://sloth-os.github.io/3D-Ski/#ski-tricks)

## Playing

Open **Run setup** to choose terrain, equipment, technique, and snow. **Start run** gives you control. **Watch demo** follows a reference rider through the same course. Each cleared gate earns 100 points and linking opposite turns earns 25. The trail map shows your progress. Your latest 200 practice runs are stored on this device with gate scores, linked turns, time, peak speed, and exercise-specific edge control.

| Control         | Action                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| ← / → or A / D  | Steer, progressively engage the edges, and release to flatten the base |
| ↑ or W          | Tuck to reduce air drag                                                |
| ↓ or S          | Flex the legs over terrain changes                                     |
| Space           | Brake by skidding                                                      |
| Hold J, release | Charge a pop and jump in a ski trick drill                             |
| ← or → at pop   | Set the direction of a 180 or 360                                      |
| Hold K, release | Show a shifty or grab in flight, then open for touchdown               |
| Enter           | Start or resume                                                        |
| P or Esc        | Pause or resume                                                        |
| C or 1–5        | Cycle cameras or select chase, helmet, trackside, edge, or aerial      |
| Drag, scroll, R | Orbit, zoom, or reset the selected external camera                     |
| F               | Cycle the force, body, and contact layers                              |
| .               | Advance a paused run or demonstration by one physics frame             |
| M or ?          | Toggle slope audio or open controls                                    |

On a touchscreen, hold **Pop** and lift your finger to jump. Keep a second finger on a steering arrow as you release Pop to spin. **Pose** controls shifties and grabs. Playback offers full, half, and quarter speed. Opening a tool or leaving the tab pauses an active descent.

### Mountain and equipment

| Terrain      | Mean pitch | Length | Gates |
| ------------ | ---------- | ------ | ----- |
| Pine Meadow  | 10°        | 380 m  | 8     |
| Alpine Ridge | 18°        | 640 m  | 12    |
| Glacier Bowl | 24°        | 780 m  | 16    |

The three fictional Swiss courses have distinct gate spacing, elevation, forest density, and undulations. Groomed, powder, and icy snow change friction, effective grip, contact area, and spray. Choose parallel, carved, wedge, or short turns on skis. On a snowboard, choose edge-to-edge carves or skidded turns with a regular stance, fixed bindings, toe and heel edges, and sideslip.

### Practicing ski tricks

Open **Ski tricks**, pick a move, and use the replay to study approach, takeoff, maneuver, and landing. Drag to orbit the rider, scrub the timeline, or select a phase. The dotted arc follows the simulated jump. Switch between body joints, force vectors, and snow contact before choosing **Practice this trick** or **Watch demo**.

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

### Studying a turn

- **Forces** draws gravity and air drag at the center of mass and snow reaction at the weighted contact point. The arrows share a force scale. Select an annotation or an instrument to capture that frame. The inspector resolves the vectors in newtons and shows the net force.
- **Body** attaches joint markers to both hips, knees, and ankles. The highlighted center of mass moves with inclination, flexion, and tuck. The displayed knee angles are measured from the same two-link legs that drive the animation.
- **Contact** shows two ski contact patches or two loading regions on one snowboard edge. Compare normal load, sliding resistance, estimated contact pressure, and the left/right ski or front/rear binding split.
- **Technique lab** provides lesson phases, a drill, and a draggable 3D rider. Change speed and peak edge angle, link successive turns, or inspect the bindings in close-up. The terrain profile samples course elevation, local pitch, and the downhill component of gravity.

## Physics and research

The fixed 60 Hz model follows the terrain height field. It resolves gravity along the path, sliding resistance, braking, quadratic drag, edge engagement, and steering. Surface curvature changes the normal load. Speed and yaw rate determine the instantaneous path radius. The ideal-edge experiment uses sidecut geometry and lateral acceleration, with a peak radius of approximately `sidecut × cos(edge angle)` and peak acceleration of `speed² / radius`. [Physics of Skiing](https://www.real-world-physics-problems.com/physics-of-skiing.html)

The analysis assumes a 75 kg rider. Body pose, binding loads, and snow contact area are estimates from the model. Pressure, edging, rotation, and flexion cues draw on the alpine and snowboard fundamentals. [PSIA Alpine Certification Standards](https://thesnowpros.org/wp-content/uploads/2025/11/PSIA_Alpine_Standards100225v5.pdf) · [AASI Snowboard Certification Standards](https://thesnowpros.org/wp-content/uploads/2025/10/AASI_Snowboard_Standards0224_updated_100325_v3.pdf)

The freestyle model gives the rider an upward impulse from the rolling course surface. Gravity and quadratic air drag act through flight. The reaction force and contact pressure drop to zero until the ballistic path intersects the terrain. A short modeled compression absorbs the normal impact speed. Ski orientation can change independently of the flight path. The studio replays use the same fixed-step simulation and inputs as the playable drills.

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

The regression suite covers all 126 course, surface, and technique combinations, including all 72 freestyle replays. It checks force balance, ski and hand positions, snowboard stance, takeoff, switch landings, and scoring. To repeat the browser checks locally, first build the site and then run the following. An existing Chromium executable can be selected with `FALLLINE_CHROMIUM`.

```sh
npx playwright-core install --only-shell chromium
npm run test:cockpit
npm run test:offline
```
