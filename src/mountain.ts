import { isSafety } from './safety.ts'
import { bodyHeading } from './air.ts'
import * as THREE from 'three'
import {
  courses,
  equipmentFor,
  isSwitchDrill,
  type Course,
  type Setup,
} from './course.ts'
import {
  buildGates,
  lineAt,
  radians,
  worldHeight,
  type Frame,
} from './physics.ts'
import { analyse, riderPose, studyPoint } from './analysis.ts'
import {
  cameraShot,
  travelArrow,
  isTrailhead,
  type Projection,
  type ScreenPoint,
  type ViewOptions,
} from './cameras.ts'
import { skierModel } from './scene/skier.ts'
import { addTerrain, pointAt, zAt } from './scene/terrain.ts'
import { canvasMountain } from './scene/canvas.ts'
import { makeSpray } from './scene/spray.ts'
import { makeLens } from './scene/lens.ts'

export type MountainView = {
  draw(f: Frame, opt: ViewOptions): Projection
  dispose(): void
}

function makeTracks(scene: THREE.Scene, course: Course, board: boolean) {
  const length = 610,
    count = board ? 1 : 2
  const tracks = Array.from({ length: count }, () => {
    const buffer = new Float32Array(length * 6),
      indices: number[] = []
    for (let i = 0; i < length - 1; i++) {
      const a = i * 2
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(buffer, 3).setUsage(THREE.DynamicDrawUsage),
    )
    g.setIndex(indices)
    g.setDrawRange(0, 0)
    const m = new THREE.Mesh(
      g,
      new THREE.MeshBasicMaterial({
        color: 0x7694ab,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    )
    m.frustumCulled = false
    scene.add(m)
    return { m, g, buffer }
  })
  let gap = false,
    last = -1,
    size = 0
  return (f: Frame, visible: boolean) => {
    if (f.d < last) {
      last = -1
      size = 0
      tracks.forEach((t) => t.g.setDrawRange(0, 0))
    }
    tracks.forEach((t) => (t.m.visible = visible))
    if (!visible || f.d - last < 0.24) return
    const flying = f.air.phase === 'flight'
    const index = Math.min(size, length - 1)
    tracks.forEach(({ buffer, g }, i) => {
      if (size === length) buffer.copyWithin(0, 6)
      const width =
        flying || gap
          ? 0
          : board
            ? 0.105 + 0.09 * f.slip
            : 0.037 + 0.044 * f.slip
      for (let j = 0; j < 2; j++) {
        const offset = (board ? 0 : i ? 0.192 : -0.192) + (j - 0.5) * width * 2,
          x = f.x + Math.cos(f.heading) * offset,
          d = f.d - Math.sin(f.heading) * offset
        buffer.set(
          [x, worldHeight(course, d, x) + 0.031, zAt(course, d)],
          index * 6 + j * 3,
        )
      }
      g.attributes.position.needsUpdate = true
      g.setDrawRange(0, index * 6)
    })
    size = Math.min(length, size + 1)
    last = f.d
    gap = flying
  }
}
function makeStudyFloor(scene: THREE.Scene) {
  const stage = new THREE.Group()
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(54, 54),
    new THREE.MeshStandardMaterial({ color: 0x283e47, roughness: 0.91 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  const grid = new THREE.GridHelper(26, 104, 0x859f9b, 0x416068)
  grid.position.y = 0.003
  stage.add(floor, grid)
  scene.add(stage)
  return stage
}
export function createMountain(
  container: HTMLElement,
  setup: Setup,
  study = false,
  replay?: readonly Frame[],
): MountainView {
  const canvas = document.createElement('canvas')
  let renderer: THREE.WebGLRenderer
  try {
    const params: WebGLContextAttributes = {
      alpha: true,
      antialias: true,
      depth: true,
      powerPreference: 'high-performance',
    }
    const gl = canvas.getContext('webgl2', params)
    if (!gl) return canvasMountain(container, setup, study, replay)
    renderer = new THREE.WebGLRenderer({ canvas, context: gl, ...params })
  } catch {
    return canvasMountain(container, setup, study, replay)
  }
  canvas.dataset.renderer = 'webgl'
  container.appendChild(canvas)
  const c = courses[setup.course],
    board = equipmentFor(setup.technique) === 'snowboard',
    gates = buildGates(c)
  const skyColor = new THREE.Color(0x4483ad),
    studioColor = new THREE.Color(0x20323b)
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(48, 1, 0.055, 1900)
  scene.fog = study
    ? new THREE.Fog(0x20323b, 3, 13)
    : new THREE.FogExp2(0xc1d4df, 0.003)
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.55))
  renderer.setClearColor(0x90b6d5, 0)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  scene.add(new THREE.HemisphereLight(0xf0f7ff, 0x9aafbc, 1.63))
  const sun = new THREE.DirectionalLight(0xffe5bd, 2.9)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  Object.assign(sun.shadow.camera, {
    left: -5,
    right: 5,
    top: 5,
    bottom: -5,
    far: 65,
  })
  sun.shadow.bias = -0.00028
  sun.shadow.normalBias = 0.009
  scene.add(sun, sun.target)
  const terrain = study
    ? makeStudyFloor(scene)
    : addTerrain(scene, c, setup, gates)
  if (replay) {
    const path = replay
      .filter((s) => s.air.phase === 'flight')
      .map((s) => pointAt(c, s.x, s.d, s.air.height + 0.045))
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(path),
      new THREE.LineDashedMaterial({
        color: 0xd2ef9a,
        dashSize: 0.14,
        gapSize: 0.1,
        toneMapped: false,
      }),
    )
    line.computeLineDistances()
    scene.add(line)
  }
  const backdrop = study
    ? new THREE.Texture()
    : new THREE.TextureLoader().load(
        import.meta.env.BASE_URL + 'images/glacier-bowl.webp',
      )
  backdrop.colorSpace = THREE.SRGBColorSpace
  backdrop.wrapS = THREE.MirroredRepeatWrapping
  backdrop.repeat.set(2, 1)
  backdrop.offset.x = 0.42
  const sky = new THREE.Mesh(
    new THREE.CylinderGeometry(740, 740, 760, 96, 1, true),
    new THREE.MeshBasicMaterial({
      map: backdrop,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  sky.renderOrder = -5
  scene.add(sky)
  // The opening panorama receives the same articulated rider and shadows as the playable piste.
  const catcher = new THREE.Mesh(
    new THREE.PlaneGeometry(25, 22),
    new THREE.ShadowMaterial({ opacity: 0.36, depthWrite: false }),
  )
  catcher.receiveShadow = true
  scene.add(catcher)
  const path = []
  for (let d = 0; !study && d <= c.length; d++)
    path.push(pointAt(c, lineAt(gates, d), d, 0.061))
  const guide = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(path),
    new THREE.LineDashedMaterial({
      color: 0x65ab94,
      dashSize: 1.6,
      gapSize: 1.2,
      transparent: true,
      opacity: 0.85,
    }),
  )
  guide.computeLineDistances()
  scene.add(guide)
  const arrowGeometry = new THREE.BufferGeometry().setFromPoints(
    travelArrow.map((p) => new THREE.Vector3(...p)),
  )
  arrowGeometry.setIndex([0, 1, 2, 0, 2, 6, 3, 4, 5])
  const directionMark = new THREE.Mesh(
    arrowGeometry,
    new THREE.MeshBasicMaterial({
      color: 0x65ded0,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  )
  scene.add(directionMark)
  const skier = skierModel(setup)
  scene.add(skier.root)
  const spray = makeSpray(setup.surface, board)
  scene.add(spray.points)
  const tracks = makeTracks(scene, c, board),
    lens = makeLens(scene)
  const pos = new THREE.Vector3(),
    eye = new THREE.Vector3(),
    target = new THREE.Vector3(),
    dest = new THREE.Vector3(),
    aim = new THREE.Vector3(),
    projected = new THREE.Vector3()
  const project = (v: THREE.Vector3): ScreenPoint => {
    projected.copy(v).project(camera)
    return {
      x: (projected.x + 1) * 0.5,
      y: (1 - projected.y) * 0.5,
      visible:
        projected.z > -1 &&
        projected.z < 1 &&
        Math.abs(projected.x) < 0.99 &&
        Math.abs(projected.y) < 0.97,
    }
  }
  let lastTime = 0,
    oldD = -1,
    wasPlate = false,
    oldW = 0,
    oldH = 0
  const ro = new ResizeObserver(() => {
    const w = container.clientWidth,
      h = container.clientHeight
    if (w && h && (w !== oldW || h !== oldH)) {
      oldW = w
      oldH = h
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
  })
  ro.observe(container)
  renderer.setSize(container.clientWidth, container.clientHeight, false)
  camera.aspect = container.clientWidth / Math.max(1, container.clientHeight)
  camera.updateProjectionMatrix()
  return {
    draw(f, opt) {
      const plate =
        !isSafety(setup.technique) &&
        isTrailhead(opt) &&
        setup.course === 'ridge'
      const now = performance.now() / 1000,
        dt = Math.min(0.15, Math.max(0, now - lastTime)),
        snap = !lastTime || opt.reduced || f.d < oldD - 1 || wasPlate !== plate
      oldD = f.d
      lastTime = now
      wasPlate = plate
      scene.background = plate ? null : study ? studioColor : skyColor
      terrain.visible = !plate
      sky.visible = !study && !plate
      catcher.visible = plate
      guide.visible = !isSafety(setup.technique) && opt.line && !plate
      const pitch = (f.pitch || c.pitch) * radians
      pos.set(f.x, worldHeight(c, f.d, f.x), zAt(c, f.d))
      if (study) {
        terrain.position.copy(pos)
        terrain.rotation.x = -pitch
      }
      catcher.position.copy(pos)
      catcher.position.y += 0.006
      catcher.rotation.x = -Math.PI / 2 - pitch
      sky.position.copy(pos)
      sky.position.y -= 143
      container.dataset.plate = plate ? 'on' : 'off'
      directionMark.visible =
        (isSwitchDrill(setup.technique) || f.air.switch || !!f.pivot) &&
        f.air.phase !== 'flight'
      directionMark.position.copy(pos)
      directionMark.rotation.set(-pitch, -f.heading, 0, 'XYZ')
      skier.root.position.copy(pos)
      skier.root.position.y += f.air.height
      skier.root.rotation.set(
        -pitch,
        -f.heading - f.boardYaw - bodyHeading(f),
        0,
        'XYZ',
      )
      const pose = riderPose(f, setup),
        forces = analyse(f, setup)
      skier.pose(f, pose, opt.camera === 'first')
      skier.root.updateMatrixWorld(true)
      lens.update(skier.root, pose, forces, opt.lens, opt.forces, board)
      tracks(f, !study && !plate)
      if (!study) spray.update(f, pos, pitch)
      sun.position.copy(pos).add(new THREE.Vector3(-12, 19, -8))
      sun.target.position.copy(pos)
      const shot = cameraShot(f, c, opt, board)
      dest.fromArray(shot.eye)
      aim.fromArray(shot.target)
      const ease = snap ? 1 : 1 - Math.exp(-dt * 6.8)
      eye.lerp(dest, ease)
      target.lerp(aim, ease)
      camera.position.copy(pos).add(eye)
      const distanceOnSlope = -camera.position.z / Math.cos(c.pitch * radians)
      camera.position.y = Math.max(
        camera.position.y,
        worldHeight(c, distanceOnSlope, camera.position.x) + 0.14,
      )
      const fov = camera.fov + (shot.fov - camera.fov) * ease
      if (Math.abs(camera.fov - fov) > 0.001) {
        camera.fov = fov
        camera.updateProjectionMatrix()
      }
      camera.lookAt(dest.copy(pos).add(target))
      camera.updateMatrixWorld()
      renderer.render(scene, camera)
      const gate = isSafety(setup.technique) ? null : gates[f.gatesSeen],
        g = gate
          ? project(pointAt(c, gate.x, gate.d, 2.3))
          : { x: 0, y: 0, visible: false }
      if (plate || !opt.line) g.visible = false
      camera.getWorldDirection(dest)
      return {
        upper: project(lens.upper),
        studyPoint: project(
          aim
            .fromArray(studyPoint(f, setup, pose))
            .applyMatrix4(skier.root.matrixWorld),
        ),
        lower: project(lens.lower),
        gate: g,
        bearing: (320 + Math.atan2(dest.x, -dest.z) / radians + 360) % 360,
      }
    },
    dispose() {
      ro.disconnect()
      const mats = new Set<THREE.Material>(),
        geos = new Set<THREE.BufferGeometry>(),
        maps = new Set<THREE.Texture>()
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.geometry) geos.add(mesh.geometry)
        if (mesh.material)
          for (const m of Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material])
            mats.add(m)
        if (o instanceof THREE.InstancedMesh) o.dispose()
      })
      mats.forEach((m) => {
        Object.values(m).forEach((v) => {
          if (v instanceof THREE.Texture) maps.add(v)
        })
        m.dispose()
      })
      maps.forEach((m) => m.dispose())
      geos.forEach((g) => g.dispose())
      sun.shadow.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}
