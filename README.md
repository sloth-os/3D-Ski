# Fallline Ski Simulator

Fallline is a browser-based alpine skiing game and technique lab. Steer an articulated skier through a gate course, watch a technique demonstration, or study how edge angle and speed change a turn. The app runs entirely on the device.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. To try the installable, offline production build, run the following commands and open `http://localhost:4173`.

```sh
npm test
npm run build
npm run preview
```

## Practice on the slope

Choose a terrain, technique, and snow surface. **Watch demo** follows a reference skier along the gates. **Start run** gives you control. Each cleared gate earns 100 points. Linking a turn onto the opposite edges earns another 25.

| Control                      | Action                                   |
| ---------------------------- | ---------------------------------------- |
| Left / right arrows or A / D | Steer and progressively engage the edges |
| Up arrow or W                | Tuck to reduce aerodynamic drag          |
| Down arrow or S              | Flex the legs to absorb terrain changes  |
| Space                        | Brake                                    |
| P                            | Pause or resume                          |
| Esc                          | Pause                                    |
| C                            | Cycle chase, trail, and skier cameras    |
| Enter                        | Start from the simulator                 |
| ?                            | Open the controls guide                  |

Touchscreens include steering, tuck, flex, and brake buttons. The viewport supports fullscreen, local slope audio, ski tracks, a switchable line guide, and force vectors. Choose a camera in the course preview and drag to inspect the skier. Leaving an active run pauses the simulation.

### Terrain and disciplines

The three fictional courses use different gradients, gate layouts, rolls, and tree cover.

| Terrain      | Mean pitch | Length | Gates |
| ------------ | ---------- | ------ | ----- |
| Pine Meadow  | 10°        | 380 m  | 8     |
| Alpine Ridge | 18°        | 640 m  | 12    |
| Glacier Bowl | 24°        | 780 m  | 16    |

Groomed, powder, and icy surfaces change sliding resistance, effective edge grip, and snow spray. Parallel turns, carved turns, wedge turns, and short turns each have a technique-specific steering response, edge range, and drill. The technique lab includes movement phases and an interactive edge-angle experiment. A terrain profile lets you inspect local elevation, pitch, and downhill gravity at any point along a course.

The run review records gates, linked turns, distance, time, peak speed, score, and the share of time spent in the exercise’s edge range. The run log stores the latest 200 sessions locally. Reference demonstrations are available for observation and practice runs are recorded for comparison.

## Simulation and research

The physics and rendering share a rolling terrain height field. A fixed 60 Hz integrator resolves downhill gravity along the ski heading, sliding friction, braking, quadratic air drag, and a grip-adjusted turning rate. Speed and yaw rate determine the measured path radius. The idealized carving experiment uses the approximation `R ≈ sidecut × cos(edge angle)` and the lateral acceleration `v²/R`. [Physics of Skiing](https://www.real-world-physics-problems.com/physics-of-skiing.html)

Inclination, leg flexion, ski separation, wedge angle, and estimated outside-ski support drive the visible pose. The arrows represent gravity and the modeled support from the snow. Form cues draw on the fundamentals of pressure distribution, edge control, independent leg rotation, and pressure regulation. All load values are simulation estimates. [PSIA Alpine Certification Standards](https://thesnowpros.org/wp-content/uploads/2025/11/PSIA_Alpine_Standards100225v5.pdf)

The learning material connects turn shape and braking with the responsibility to maintain control. A qualified instructor can assess a skier’s movements, equipment, and local conditions on snow. [NSAA Your Responsibility Code](https://skisafety.us/your-responsibility-code)

## Offline use and installation

The production build generates a versioned service worker from the emitted files. The first successful visit caches the app, every course image, the 3D engine, fonts, icons, and learning material. The **Offline ready** indicator appears after installation completes. The app can then reload, play a fresh course, and save reviews without a connection. The linked research publications open on their publishers’ websites.

Use **Settings → Install Fallline** when the browser offers installation. Safari on iOS also supports **Share → Add to Home Screen**. Localhost or HTTPS provides the secure context required for service workers. The development server uses Vite’s live-reload mode.

## GitHub Pages

Select **GitHub Actions** in the repository’s **Settings → Pages → Build and deployment → Source**. The workflow tests and builds the project on pushes to the default branch. It can also be run manually from the Actions tab. A successful build uploads `dist/` and deploys the artifact to the `github-pages` environment. [Publishing workflow](.github/workflows/pages.yml)

Relative asset URLs, a project-scoped manifest, and a scoped service worker support both a root site and a repository path such as `/3D-Ski/`. The production files can also be served by a standard static web server.

## Implementation

React and TypeScript manage the interface. Three.js renders the articulated skier, rolling piste, gates, ski trails, conifers, and snow particles. A perspective Canvas 2D renderer shares the simulation on devices without WebGL. The course photographs and vegetation textures are generated assets bundled with the app. Third-party software and font notices accompany the production build in `licenses.txt`.

The automated tests cover turn reversal, braking, drag, snow friction, gate scoring, course completion, boundary recovery, the demonstration skier, and all 36 terrain, surface, and technique combinations.

The deployment workflow also opens the production build under a repository-style path, stops its web server, reloads the installed app, checks the course images, and saves an offline run. To repeat that browser check locally, build the site and run the following commands. An existing Chromium executable can be selected with the `FALLLINE_CHROMIUM` environment variable.

```sh
npx playwright-core install --only-shell chromium
npm run test:offline
```
