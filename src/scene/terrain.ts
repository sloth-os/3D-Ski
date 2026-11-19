import * as THREE from 'three'
import type { Course, Setup } from '../course.ts'
import { worldHeight, radians, lineAt, type Gate } from '../physics.ts'

function randomSeed(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    return seed / 4294967296
  }
}
export const zAt = (course: Course, d: number) =>
  -d * Math.cos(course.pitch * radians)
export const pointAt = (course: Course, x: number, d: number, lift = 0) =>
  new THREE.Vector3(x, worldHeight(course, d, x) + lift, zAt(course, d))

function snowGeometry(c: Course) {
  const positions: number[] = [],
    tex: number[] = [],
    colors: number[] = [],
    indices: number[] = []
  const across = 80,
    along = Math.ceil((c.length + 180) / 3)
  for (let j = 0; j <= along; j++) {
    const d = -55 + j * 3
    for (let i = 0; i <= across; i++) {
      const x = (i - across / 2) * 3
      const rim = Math.max(Math.abs(x) - 27, 0) * 0.048
      const y =
        worldHeight(c, d, x) +
        rim * (1.2 + 0.68 * Math.sin(d * 0.052 + x * 0.038))
      positions.push(x, y, zAt(c, d))
      tex.push(x / 5, d / 5)
      const light = 0.95 + 0.035 * Math.sin(d / 26 + x / 16) - 0.015 * rim
      colors.push(light * 0.96, light * 0.99, Math.min(1, light * 1.025))
      if (i < across && j < along) {
        const a = j * (across + 1) + i,
          b = a + across + 1
        indices.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(tex, 2))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}
function snowTexture(setup: Setup) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!,
    px = ctx.createImageData(256, 256),
    random = randomSeed(491)
  for (let i = 0; i < 256 * 256; i++) {
    const x = i % 256
    const ridge =
      setup.surface === 'groomed'
        ? 12 * Math.pow(0.5 + 0.5 * Math.cos((x * Math.PI) / 4), 3)
        : 0
    const y = Math.floor(i / 256)
    const grain =
      random() * (setup.surface === 'powder' ? 17 : 8) +
      2.3 * Math.sin(x * 0.09 + Math.sin(y * 0.06)) * Math.sin(y * 0.11)
    const n = 253 - ridge - grain
    px.data.set([n - 3, n, Math.min(255, n + 4), 255], i * 4)
  }
  ctx.putImageData(px, 0, 0)
  const map = new THREE.CanvasTexture(canvas)
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 4
  return map
}

function addForest(scene: THREE.Group, c: Course, setup: Setup) {
  const random = randomSeed(
    setup.course === 'ridge' ? 472 : setup.course === 'bowl' ? 629 : 818,
  )
  const perSide = setup.course === 'bowl' ? 63 : Math.round(c.length * 0.56)
  const dummy = new THREE.Object3D()
  const texture = new THREE.TextureLoader().load(
    import.meta.env.BASE_URL + 'images/spruce.webp',
  )
  texture.colorSpace = THREE.SRGBColorSpace
  // Upright cutouts retain fine branch detail and keep the entire forest in one draw call.
  const foliage = new THREE.MeshBasicMaterial({
    map: texture,
    alphaTest: 0.34,
    alphaToCoverage: true,
    side: THREE.DoubleSide,
  })
  foliage.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      [
        'vec3 center = (modelMatrix * instanceMatrix * vec4(0.,0.,0.,1.)).xyz;',
        'vec3 sight = normalize(cameraPosition - center);',
        'vec3 across = normalize(vec3(sight.z,0.,-sight.x));',
        'vec3 at = center + across * position.x * length(instanceMatrix[0].xyz) + vec3(0.,position.y * length(instanceMatrix[1].xyz),0.);',
        'vec4 mvPosition = viewMatrix * vec4(at,1.);',
        'gl_Position = projectionMatrix * mvPosition;',
      ].join('\n'),
    )
  }
  const trees = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    foliage,
    perSide * 2,
  )
  const shade = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: texture,
      color: 0x637f99,
      transparent: true,
      opacity: 0.23,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
    perSide * 2,
  )
  const color = new THREE.Color()
  const slope = c.pitch * radians
  for (let i = 0; i < trees.count; i++) {
    const side = i % 2 ? 1 : -1
    const d = random() * (c.length + 120) - 32
    const x = (31 + 3 * Math.sin(d / 32) + Math.pow(random(), 1.6) * 72) * side
    const height = (6 + random() * 11) * (setup.course === 'bowl' ? 0.67 : 1)
    const width = height * (0.47 + random() * 0.19)
    const ground = pointAt(c, x, d)
    ground.y +=
      Math.max(Math.abs(x) - 27, 0) *
      0.048 *
      (1.2 + 0.68 * Math.sin(d * 0.052 + x * 0.038))
    dummy.position.copy(ground)
    dummy.position.y += height / 2 - 0.1
    dummy.scale.set(width, height, 1)
    dummy.rotation.set(
      0,
      (i % 3 ? 0 : Math.PI) + (random() - 0.5) * 0.49,
      (random() - 0.5) * 0.046,
    )
    dummy.updateMatrix()
    trees.setMatrixAt(i, dummy.matrix)
    const tint = 0.84 + random() * 0.16
    trees.setColorAt(i, color.setRGB(tint, tint * 0.994, tint * 0.986))
    dummy.position.copy(ground)
    dummy.position.x += height * 0.39
    dummy.position.z += height * 0.25
    dummy.position.y += height * 0.25 * Math.tan(slope) + 0.06
    dummy.rotation.set(-Math.PI / 2 - slope, 0, -2.18)
    dummy.scale.set(width * 0.86, height * 1.02, 1)
    dummy.updateMatrix()
    shade.setMatrixAt(i, dummy.matrix)
  }
  scene.add(trees, shade)
  const rocks = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: 0x86929d, flatShading: true }),
    setup.course === 'bowl' ? 105 : 35,
  )
  for (let i = 0; i < rocks.count; i++) {
    const d = random() * (c.length + 65),
      x = (i % 2 ? -1 : 1) * (27 + random() * 32)
    dummy.position.copy(pointAt(c, x, d, 0.3))
    dummy.scale.set(1 + random() * 3, 0.7 + random() * 1.8, 1 + random() * 2)
    dummy.rotation.set(random() * 0.4, random() * 6, random() * 0.4)
    dummy.updateMatrix()
    rocks.setMatrixAt(i, dummy.matrix)
  }
  scene.add(rocks)
}
function addGates(scene: THREE.Group, c: Course, gates: Gate[]) {
  const pole = new THREE.CylinderGeometry(0.045, 0.052, 2.05, 7)
  const fabric = new THREE.BoxGeometry(1.05, 0.53, 0.028)
  const colors = [0xef5545, 0x3578d6].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.84 }),
  )
  const white = new THREE.MeshStandardMaterial({ color: 0xf7faff })
  const stripe = new THREE.CylinderGeometry(0.055, 0.055, 0.28, 7)
  gates.forEach((g, i) => {
    const mat = colors[i % 2]
    for (const sign of [-1, 1]) {
      for (const offset of [0, 1.02]) {
        const x = g.x + sign * (g.width + offset)
        const p = new THREE.Mesh(pole, mat)
        p.position.copy(pointAt(c, x, g.d, 1))
        scene.add(p)
        const band = new THREE.Mesh(stripe, white)
        band.position.copy(pointAt(c, x, g.d, 0.38))
        scene.add(band)
      }
      const flag = new THREE.Mesh(fabric, mat)
      flag.position.copy(pointAt(c, g.x + sign * (g.width + 0.51), g.d, 1.58))
      scene.add(flag)
    }
  })
  const finish = document.createElement('canvas')
  finish.width = 256
  finish.height = 48
  const ctx = finish.getContext('2d')!
  ctx.fillStyle = '#143a40'
  ctx.fillRect(0, 0, 256, 48)
  ctx.fillStyle = '#e5fff7'
  ctx.font = 'bold 30px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('FINISH', 128, 35)
  const tex = new THREE.CanvasTexture(finish)
  tex.colorSpace = THREE.SRGBColorSpace
  const center = lineAt(gates, c.length)
  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(19, 1.2, 0.08),
    new THREE.MeshBasicMaterial({ map: tex }),
  )
  banner.position.copy(pointAt(c, center, c.length, 4.35))
  scene.add(banner)
  for (const side of [-1, 1]) {
    const p = new THREE.Mesh(pole, colors[1])
    p.scale.y = 2.35
    p.position.copy(pointAt(c, center + side * 9.5, c.length, 2.35))
    scene.add(p)
  }
}

export function addTerrain(
  scene: THREE.Scene,
  course: Course,
  setup: Setup,
  gates: Gate[],
) {
  const terrain = new THREE.Group(),
    texture = snowTexture(setup)
  const snow = new THREE.Mesh(
    snowGeometry(course),
    new THREE.MeshStandardMaterial({
      map: texture,
      bumpMap: texture,
      bumpScale: setup.surface === 'powder' ? 0.066 : 0.022,
      color: setup.surface === 'ice' ? 0xd5e7f5 : 0xffffff,
      roughness: setup.surface === 'ice' ? 0.38 : 0.94,
      vertexColors: true,
    }),
  )
  snow.receiveShadow = true
  terrain.add(snow)
  addForest(terrain, course, setup)
  addGates(terrain, course, gates)
  scene.add(terrain)
  return terrain
}
