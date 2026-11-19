import * as THREE from 'three'
import type { Setup } from '../course.ts'
import { clamp, radians, type Frame } from '../physics.ts'

export function skierModel() {
  const root = new THREE.Group(),
    legs = new THREE.Group(),
    body = new THREE.Group()
  const mat = (color: number, roughness = 0.75) =>
    new THREE.MeshStandardMaterial({ color, roughness })
  const orange = mat(0xf16a17),
    dark = mat(0x192738),
    boots = mat(0x2b3843),
    black = mat(0x15202c),
    cuff = mat(0x913815),
    green = mat(0x58e0bf, 0.36),
    visor = mat(0x288392, 0.2),
    poleMetal = mat(0x667a87, 0.28)
  const sphere = new THREE.SphereGeometry(1, 16, 12)
  const ellipsoid = (
    parent: THREE.Object3D,
    material: THREE.Material,
    xyz: number[],
    scale: number[],
  ) => {
    const m = new THREE.Mesh(sphere, material)
    m.position.set(xyz[0], xyz[1], xyz[2])
    m.scale.set(scale[0], scale[1], scale[2])
    m.castShadow = true
    parent.add(m)
    return m
  }
  const up = new THREE.Vector3(0, 1, 0)
  function limb(
    parent: THREE.Group,
    material: THREE.Material,
    radius: number,
    toRadius = radius,
  ) {
    const piece = new THREE.Mesh(
      new THREE.CylinderGeometry(toRadius, radius, 1, 12),
      material,
    )
    piece.castShadow = true
    parent.add(piece)
    const v = new THREE.Vector3(),
      a = new THREE.Vector3(),
      b = new THREE.Vector3()
    return (from: number[], to: number[]) => {
      a.fromArray(from)
      b.fromArray(to)
      v.subVectors(b, a)
      piece.position.addVectors(a, b).multiplyScalar(0.5)
      piece.scale.y = v.length()
      piece.quaternion.setFromUnitVectors(up, v.normalize())
    }
  }
  root.add(legs, body)
  // A tapered jacket, articulated limbs, and independent skis make the edge change visible from behind.
  const jacketShape = [
    [0.17, 0.015],
    [0.214, 0.04],
    [0.221, 0.14],
    [0.235, 0.32],
    [0.264, 0.43],
    [0.235, 0.498],
    [0.145, 0.555],
    [0.098, 0.57],
  ]
  const jacket = new THREE.Mesh(
    new THREE.LatheGeometry(
      jacketShape.map(([x, y]) => new THREE.Vector2(x, y)),
      24,
    ),
    orange,
  )
  jacket.castShadow = true
  jacket.scale.z = 0.72
  jacket.rotation.x = -0.17
  body.add(jacket)
  const yoke = ellipsoid(
    body,
    mat(0xc95217),
    [0, 0.421, 0.038],
    [0.237, 0.095, 0.122],
  )
  yoke.rotation.x = -0.17
  for (const s of [-1, 1]) {
    const seam = ellipsoid(
      body,
      cuff,
      [s * 0.178, 0.22, 0.092],
      [0.011, 0.148, 0.014],
    )
    seam.rotation.z = -s * 0.13
  }
  ellipsoid(body, mat(0xf2974d), [-0.045, 0.395, 0.157], [0.036, 0.009, 0.006])
  ellipsoid(body, cuff, [0, 0.061, 0.02], [0.227, 0.095, 0.153])
  ellipsoid(body, cuff, [0, 0.517, 0.084], [0.178, 0.094, 0.141])
  ellipsoid(body, orange, [0, 0.546, 0.068], [0.176, 0.096, 0.132])
  ellipsoid(body, black, [0, 0.718, -0.095], [0.168, 0.183, 0.163])
  ellipsoid(body, boots, [0, 0.712, -0.09], [0.172, 0.038, 0.165])
  for (const s of [-1, 1]) {
    const vent = ellipsoid(
      body,
      mat(0x465362),
      [s * 0.065, 0.848, -0.043],
      [0.017, 0.013, 0.062],
    )
    vent.rotation.z = s * 0.22
  }
  ellipsoid(body, mat(0x77828a), [0, 0.718, 0.074], [0.048, 0.015, 0.007])
  ellipsoid(body, visor, [0, 0.712, -0.164], [0.157, 0.066, 0.122])
  ellipsoid(body, black, [0, 0.61, -0.113], [0.115, 0.085, 0.118])
  ellipsoid(body, dark, [0, 0.0, 0], [0.21, 0.16, 0.152])
  const parts = [-1, 1].map((side) => {
    ellipsoid(body, orange, [side * 0.22, 0.443, -0.061], [0.106, 0.105, 0.105])
    const ski = new THREE.Group()
    root.add(ski)
    const shape = new THREE.Shape()
    shape.moveTo(0, -1.07)
    shape.quadraticCurveTo(0.073, -1.04, 0.074, -0.81)
    shape.lineTo(0.047, 0.02)
    shape.lineTo(0.067, 0.79)
    shape.quadraticCurveTo(0.0, 0.88, -0.067, 0.79)
    shape.lineTo(-0.047, 0.02)
    shape.lineTo(-0.074, -0.81)
    shape.quadraticCurveTo(-0.073, -1.04, 0, -1.07)
    const skiG = new THREE.ExtrudeGeometry(shape, {
      depth: 0.018,
      bevelEnabled: false,
      curveSegments: 6,
    })
    skiG.rotateX(Math.PI / 2)
    const positions = skiG.getAttribute('position')
    for (let i = 0; i < positions.count; i++) {
      const z = positions.getZ(i)
      positions.setY(
        i,
        positions.getY(i) +
          Math.max(0, -z - 0.74) ** 2 * 1.05 +
          Math.max(0, z - 0.68) ** 2 * 0.9,
      )
    }
    skiG.computeVertexNormals()
    ski.add(new THREE.Mesh(skiG, black))
    for (const z of [-0.69, 0.61]) {
      const mark = new THREE.Mesh(
        new THREE.BoxGeometry(0.105, 0.015, 0.22),
        green,
      )
      mark.position.set(0, 0.008, z)
      ski.add(mark)
    }
    ellipsoid(ski, boots, [0, 0.13, -0.035], [0.104, 0.19, 0.2])
    ellipsoid(ski, black, [0, 0.061, -0.038], [0.112, 0.067, 0.226])
    ellipsoid(ski, green, [0, 0.17, -0.056], [0.105, 0.022, 0.154])
    ellipsoid(ski, poleMetal, [0, 0.108, -0.115], [0.102, 0.012, 0.108])
    return {
      side,
      ski,
      shin: limb(legs, dark, 0.099, 0.119),
      thigh: limb(legs, dark, 0.122, 0.147),
      knee: ellipsoid(legs, dark, [0, 0, 0], [0.123, 0.127, 0.121]),
      upper: limb(body, orange, 0.103, 0.087),
      lower: limb(body, orange, 0.088, 0.068),
      elbow: ellipsoid(body, orange, [0, 0, 0], [0.091, 0.093, 0.09]),
      glove: ellipsoid(body, black, [0, 0, 0], [0.073, 0.094, 0.077]),
      pole: limb(body, poleMetal, 0.011, 0.009),
      basket: ellipsoid(body, black, [0, 0, 0], [0.048, 0.013, 0.048]),
    }
  })
  function pose(f: Frame, setup: Setup, first: boolean) {
    const lean = clamp(f.lean, -0.72, 0.72),
      bend = f.flex,
      hip = 0.87 - bend * 0.24,
      lateral = Math.sin(lean) * 0.48
    body.position.set(lateral, hip, -0.005 - f.tuck * 0.07)
    body.rotation.set(-0.11 - f.tuck * 0.41, f.heading * 0.28, -lean * 0.38)
    body.visible = legs.visible = !first
    parts.forEach((p) => {
      const s = p.side
      p.ski.position.set(
        s * (0.186 + f.brake * 0.055),
        0.04,
        s * Math.sin(lean) * 0.09,
      )
      p.ski.rotation.z = -f.edge * radians * 0.85
      p.ski.rotation.y =
        s * ((setup.technique === 'wedge' ? 0.18 : 0.012) + f.brake * 0.32)
      const ankle = [p.ski.position.x, 0.19, p.ski.position.z],
        knee = [
          s * 0.166 + lateral * 0.7,
          hip * 0.56 + 0.05,
          -0.176 - 0.13 * bend,
        ],
        pelvis = [s * 0.125 + lateral, hip, 0.015]
      p.shin(ankle, knee)
      p.thigh(knee, pelvis)
      p.knee.position.fromArray(knee)
      const shoulder = [s * 0.22, 0.46, -0.056],
        elbow = [s * (0.358 - 0.076 * f.tuck), 0.24, -0.06],
        hand = [s * (0.408 - 0.145 * f.tuck), 0.13 + 0.08 * f.tuck, -0.32]
      p.upper(shoulder, elbow)
      p.lower(elbow, hand)
      p.elbow.position.fromArray(elbow)
      p.glove.position.fromArray(hand)
      const tip = [s * 0.59, -hip + 0.08, 0.43 + bend * 0.2]
      p.pole(hand, tip)
      p.basket.position.set(tip[0], tip[1] + 0.065, tip[2] - 0.041)
    })
  }
  return { root, pose }
}
