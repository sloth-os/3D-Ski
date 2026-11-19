import * as THREE from 'three'
import { courses, type Course, type Setup } from './course.ts'
import {
  type Frame,
  buildGates,
  lineAt,
  radians,
  worldHeight,
} from './physics.ts'

import { skierModel } from './scene/skier.ts'
import { addTerrain, pointAt, zAt } from './scene/terrain.ts'
import { canvasMountain } from './scene/canvas.ts'
import { makeSpray } from './scene/spray.ts'

export type CameraMode = 'chase' | 'wide' | 'first'
export type ViewOptions = {
  camera: CameraMode
  line: boolean
  forces: boolean
  orbit: number
}
export type MountainView = {
  draw(f: Frame, options: ViewOptions): void
  dispose(): void
}

function createTrails() {
  const count = 520,
    arrays: Float32Array[] = [],
    lines: THREE.Line[] = []
  const material = new THREE.LineBasicMaterial({
    color: 0x8ca9be,
    transparent: true,
    opacity: 0.76,
  })
  for (let i = 0; i < 2; i++) {
    const points = new Float32Array(count * 3)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(points, 3).setUsage(THREE.DynamicDrawUsage),
    )
    geometry.setDrawRange(0, 0)
    const line = new THREE.Line(geometry, material)
    line.frustumCulled = false
    arrays.push(points)
    lines.push(line)
  }
  let size = 0,
    lastD = -1
  return {
    lines,
    update(f: Frame, c: Course) {
      if (f.d < lastD) {
        size = 0
        lastD = -1
      }
      if (f.d - lastD < 0.38) return
      const index = Math.min(count - 1, size)
      lines.forEach((line, i) => {
        const a = arrays[i],
          x = f.x + (i ? 0.185 : -0.185) * Math.cos(f.heading)
        if (size === count) a.copyWithin(0, 3)
        a[index * 3] = x
        a[index * 3 + 1] = worldHeight(c, f.d, x) + 0.028
        a[index * 3 + 2] = zAt(c, f.d)
        line.geometry.attributes.position.needsUpdate = true
        line.geometry.setDrawRange(0, index + 1)
      })
      size = Math.min(size + 1, count)
      lastD = f.d
    },
  }
}

export function createMountain(
  container: HTMLElement,
  setup: Setup,
): MountainView {
  let renderer: THREE.WebGLRenderer
  try {
    const canvas = document.createElement('canvas')
    const options: WebGLContextAttributes = {
      antialias: true,
      alpha: true,
      depth: true,
      powerPreference: 'high-performance',
    }
    const context = canvas.getContext('webgl2', options)
    if (!context) return canvasMountain(container, setup)
    renderer = new THREE.WebGLRenderer({ canvas, context, ...options })
  } catch {
    return canvasMountain(container, setup)
  }
  const c = courses[setup.course],
    gates = buildGates(c)
  let disposed = false
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(54, 1, 0.075, 1600)
  scene.fog = new THREE.FogExp2(0xc8dfec, 0.0036)
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.6))
  renderer.setClearColor(0xaccce2, 0)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)
  const hemisphere = new THREE.HemisphereLight(0xf1f9ff, 0xa8bdcf, 1.69)
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.05)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -8
  sun.shadow.camera.right = 8
  sun.shadow.camera.top = 8
  sun.shadow.camera.bottom = -8
  sun.shadow.camera.far = 70
  sun.shadow.bias = -0.00045
  scene.add(hemisphere, sun, sun.target)
  addTerrain(scene, c, setup, gates, () => {
    if (!disposed) renderer.render(scene, camera)
  })
  const guidePoints: THREE.Vector3[] = []
  for (let d = 0; d <= c.length; d += 1)
    guidePoints.push(pointAt(c, lineAt(gates, d), d, 0.066))
  const guide = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(guidePoints),
    new THREE.LineDashedMaterial({
      color: 0x21af9d,
      dashSize: 1.85,
      gapSize: 1.02,
      transparent: true,
      opacity: 0.9,
    }),
  )
  guide.computeLineDistances()
  scene.add(guide)
  const skier = skierModel()
  scene.add(skier.root)
  const spray = makeSpray(setup.surface)
  scene.add(spray.points)
  const trail = createTrails()
  trail.lines.forEach((l) => scene.add(l))
  const gravity = new THREE.ArrowHelper(
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(),
    0.9,
    0xf9b854,
    0.16,
    0.11,
  )
  const reaction = new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(),
    1,
    0x21e3bd,
    0.16,
    0.11,
  )
  scene.add(gravity, reaction)
  const look = new THREE.Vector3(),
    pos = new THREE.Vector3(),
    toward = new THREE.Vector3()
  let viewportWidth = 0,
    viewportHeight = 0
  const resize = () => {
    const w = Math.max(1, container.clientWidth),
      h = Math.max(1, container.clientHeight)
    if (w === viewportWidth && h === viewportHeight) return
    viewportWidth = w
    viewportHeight = h
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.render(scene, camera)
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(container)
  return {
    draw(f, opt) {
      pos.copy(pointAt(c, f.x, f.d))
      skier.root.position.copy(pos)
      skier.root.rotation.order = 'XYZ'
      skier.root.rotation.set(-(f.pitch || c.pitch) * radians, -f.heading, 0)
      skier.pose(f, setup, opt.camera === 'first')
      guide.visible = opt.line
      trail.update(f, c)
      spray.update(f, pos, c.pitch * radians)
      gravity.visible = reaction.visible = opt.forces
      gravity.position.copy(pos).add(new THREE.Vector3(0.65, 1.42, 0))
      reaction.position.copy(pos).add(new THREE.Vector3(-0.22, 0.06, 0))
      const slopeAngle = (f.pitch || c.pitch) * radians,
        normal = Math.cos(slopeAngle)
      const sideForce =
        Math.tan(f.lean) * normal + Math.sin(slopeAngle) * Math.sin(f.heading)
      toward.set(
        sideForce * Math.cos(f.heading),
        normal * Math.cos(slopeAngle) +
          sideForce * Math.sin(slopeAngle) * Math.sin(f.heading),
        -normal * Math.sin(slopeAngle) +
          sideForce * Math.cos(slopeAngle) * Math.sin(f.heading),
      )
      const magnitude = toward.length()
      reaction.setDirection(toward.normalize())
      reaction.setLength(0.9 * magnitude, 0.17, 0.11)
      sun.position.copy(pos).add(new THREE.Vector3(-13, 24, -10))
      sun.target.position.copy(pos)
      const yaw = f.heading * 0.48 + opt.orbit
      if (opt.camera === 'first') {
        camera.position
          .copy(pos)
          .add(new THREE.Vector3(0, 1.5 - f.flex * 0.23, 0))
        look
          .copy(pos)
          .add(
            new THREE.Vector3(
              Math.sin(f.heading) * 15,
              -1.45,
              -Math.cos(f.heading) * 17,
            ),
          )
      } else {
        const wide = opt.camera === 'wide',
          dist = wide ? 9.2 : 4.65,
          angle = yaw + (wide ? 0.56 : 0.18)
        camera.position
          .copy(pos)
          .add(
            new THREE.Vector3(
              -Math.sin(angle) * dist,
              (wide ? 3.9 : 2.3) + Math.sin(c.pitch * radians) * dist * 0.54,
              Math.cos(angle) * dist,
            ),
          )
        look
          .copy(pos)
          .add(
            new THREE.Vector3(
              Math.sin(f.heading) * 0.62,
              wide ? 1.35 : 1.13,
              -0.66,
            ),
          )
      }
      camera.lookAt(look)
      container.style.setProperty('--pan', 50 + Math.sin(yaw) * 16 + '%')
      renderer.render(scene, camera)
    },
    dispose() {
      disposed = true
      ro.disconnect()
      const mats = new Set<THREE.Material>(),
        geometries = new Set<THREE.BufferGeometry>(),
        textures = new Set<THREE.Texture>()
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry) geometries.add(mesh.geometry)
        if (mesh.material)
          for (const mat of Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material])
            mats.add(mat)
        if (obj instanceof THREE.InstancedMesh) obj.dispose()
      })
      mats.forEach((m) => {
        for (const value of Object.values(m))
          if (value instanceof THREE.Texture) textures.add(value)
        m.dispose()
      })
      textures.forEach((t) => t.dispose())
      geometries.forEach((g) => g.dispose())
      sun.shadow.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
