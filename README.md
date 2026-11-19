# Fallline Alpine Simulator

Fallline is a full-screen ski and snowboard game for the browser. Ride through alpine gates, slow down a reference rider, or pause on an edge change and inspect the forces and joint positions in 3D. The production app runs offline after its first successful visit. [Play Fallline on GitHub Pages](https://sloth-os.github.io/3D-Ski/)

## Playing

Open **Run setup** to choose terrain, equipment, technique, and snow. **Start run** gives you control. **Watch demo** follows a reference rider through the same course. Each cleared gate earns 100 points and linking opposite turns earns 25. The trail map shows your progress. Your latest 200 practice runs are stored on this device with gate scores, linked turns, time, peak speed, and exercise-specific edge control.

| Control         | Action                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| ← / → or A / D  | Steer, progressively engage the edges, and release to flatten the base |
| ↑ or W          | Tuck to reduce air drag                                                |
| ↓ or S          | Flex the legs over terrain changes                                     |
| Space           | Brake by skidding                                                      |
| Enter           | Start or resume                                                        |
| P or Esc        | Pause or resume                                                        |
| C or 1–5        | Cycle cameras or select chase, helmet, trackside, edge, or aerial      |
| Drag, scroll, R | Orbit, zoom, or reset the selected external camera                     |
| F               | Cycle the force, body, and contact layers                              |
| .               | Advance a paused run or demonstration by one physics frame             |
| M or ?          | Toggle slope audio or open controls                                    |

Touchscreen controls support simultaneous steering, tuck, flex, and brake. Playback offers full, half, and quarter speed. Opening a tool or leaving the tab pauses an active descent.

### Mountain and equipment

| Terrain      | Mean pitch | Length | Gates |
| ------------ | ---------- | ------ | ----- |
| Pine Meadow  | 10°        | 380 m  | 8     |
| Alpine Ridge | 18°        | 640 m  | 12    |
| Glacier Bowl | 24°        | 780 m  | 16    |

The three fictional Swiss courses have distinct gate spacing, elevation, forest density, and undulations. Groomed, powder, and icy snow change friction, effective grip, contact area, and spray. Choose parallel, carved, wedge, or short turns on skis. On a snowboard, choose edge-to-edge carves or skidded turns with a regular stance, fixed bindings, toe and heel edges, and sideslip.

### Studying a turn

- **Forces** draws gravity and air drag at the center of mass and snow reaction at the weighted contact point. The arrows share a force scale. Select an annotation or an instrument to capture that frame. The inspector resolves the vectors in newtons and shows the net force.
- **Body** attaches joint markers to both hips, knees, and ankles. The highlighted center of mass moves with inclination, flexion, and tuck. The displayed knee angles are measured from the same two-link legs that drive the animation.
- **Contact** shows two ski contact patches or two loading regions on one snowboard edge. Compare normal load, sliding resistance, estimated contact pressure, and the left/right ski or front/rear binding split.
- **Technique lab** provides lesson phases, a drill, and a draggable 3D rider. Change speed and peak edge angle, link successive turns, or inspect the bindings in close-up. The terrain profile samples course elevation, local pitch, and the downhill component of gravity.

## Physics and research

The fixed 60 Hz model follows the terrain height field. It resolves gravity along the path, sliding resistance, braking, quadratic drag, edge engagement, and steering. Surface curvature changes the normal load. Speed and yaw rate determine the instantaneous path radius. The ideal-edge experiment uses sidecut geometry and lateral acceleration, with a peak radius of approximately `sidecut × cos(edge angle)` and peak acceleration of `speed² / radius`. [Physics of Skiing](https://www.real-world-physics-problems.com/physics-of-skiing.html)

The analysis assumes a 75 kg rider. Body pose, binding loads, and snow contact area are estimates from the model. Pressure, edging, rotation, and flexion cues draw on the alpine and snowboard fundamentals. The simulator models continuous snow contact and a predominantly downhill gradient. [PSIA Alpine Certification Standards](https://thesnowpros.org/wp-content/uploads/2025/11/PSIA_Alpine_Standards100225v5.pdf) · [AASI Snowboard Certification Standards](https://thesnowpros.org/wp-content/uploads/2025/10/AASI_Snowboard_Standards0224_updated_100325_v3.pdf)

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

The regression suite covers all 54 course, surface, and technique combinations, plus force balance, measured knee angles, snowboard stance and braking, scoring, and reference riders. To repeat both browser checks locally, first build the site and then run the following. An existing Chromium executable can be selected with `FALLLINE_CHROMIUM`.

```sh
npx playwright-core install --only-shell chromium
npm run test:cockpit
npm run test:offline
```
