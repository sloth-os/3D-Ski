import * as THREE from 'three'
import { shoulderLook, boardHeadYaw } from '../air.ts'
import { equipmentFor, type Setup } from '../course.ts'
import { clamp, type Frame } from '../physics.ts'
import { type RiderPose, type Point3 } from '../analysis.ts'
import { makeDeck } from './equipment.ts'

function shellTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!,
    img = ctx.createImageData(512, 512)
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      const u = (x / 512) * Math.PI * 2,
        v = y / 512
      const creases =
        Math.max(0, Math.sin(v * 53 + 2.5 * Math.sin(u * 2 + v * 6))) ** 13
      const weave =
        (x % 5 === 0 || y % 5 === 0 ? -3 : 0) + Math.sin(x * 51.7 + y * 13) * 2
      const shade =
        1 -
        0.065 * creases -
        0.055 * Math.cos(u * 2 + 0.6) * Math.sin(v * Math.PI)
      img.data.set(
        [231 * shade + weave, 99 * shade + weave, 37 * shade + weave, 255],
        (y * 512 + x) * 4,
      )
    }
  ctx.putImageData(img, 0, 0)
  ctx.strokeStyle = 'rgba(101,41,28,.52)'
  ctx.lineWidth = 2
  for (const x of [38, 227, 285, 474]) {
    ctx.beginPath()
    ctx.moveTo(x, 50)
    ctx.bezierCurveTo(x + 20, 135, x - 15, 320, x + 4, 500)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(0, 119)
  ctx.bezierCurveTo(98, 157, 186, 84, 256, 108)
  ctx.bezierCurveTo(334, 88, 428, 155, 512, 119)
  ctx.stroke()
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.anisotropy = 4
  return t
}
export function skierModel(setup: Setup) {
  const board = equipmentFor(setup.technique) === 'snowboard'
  const root = new THREE.Group(),
    upper = new THREE.Group(),
    hips = new THREE.Group(),
    head = new THREE.Group(),
    legGroup = new THREE.Group()
  root.add(upper, hips, legGroup)
  upper.add(head)
  const mat = (color: number, roughness = 0.77, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness })
  const orange = mat(0xe56b2a),
    sleeve = mat(0xcf5423),
    seam = mat(0xa94324),
    fabric = mat(0xffffff)
  fabric.map = shellTexture()
  const pants = mat(0x243441),
    kneepad = mat(0x2d414b),
    boot = mat(0x222c32, 0.41),
    sole = mat(0x121b20),
    metal = mat(0xa6b0ae, 0.31, 0.65),
    mint = mat(0xb3d792, 0.49)
  const sphere = new THREE.SphereGeometry(1, 24, 18),
    up = new THREE.Vector3(0, 1, 0)
  const bulb = (
    parent: THREE.Object3D,
    m: THREE.Material,
    p: Point3,
    s: Point3,
  ) => {
    const mesh = new THREE.Mesh(sphere, m)
    mesh.position.fromArray(p)
    mesh.scale.fromArray(s)
    mesh.castShadow = true
    parent.add(mesh)
    return mesh
  }
  const block = (
    parent: THREE.Object3D,
    m: THREE.Material,
    p: Point3,
    s: Point3,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...s), m)
    mesh.position.fromArray(p)
    mesh.castShadow = true
    parent.add(mesh)
    return mesh
  }
  function loft(
    parent: THREE.Group,
    material: THREE.Material,
    rings: number[][],
    depth: number,
  ) {
    const geo = new THREE.LatheGeometry(
      rings.map(([y, r]) => new THREE.Vector2(r, y)),
      32,
    )
    const mesh = new THREE.Mesh(geo, material)
    mesh.scale.z = depth
    mesh.castShadow = true
    parent.add(mesh)
    return mesh
  }
  function link(
    parent: THREE.Group,
    material: THREE.Material,
    r1: number,
    r2: number,
    soft = true,
  ) {
    const rings = soft
      ? [
          [0, r1 * 0.62],
          [0.07, r1 * 0.94],
          [0.21, r1],
          [0.48, (r1 + r2) * 0.51],
          [0.58, (r1 + r2) * 0.48],
          [0.63, (r1 + r2) * 0.506],
          [0.84, r2 * 1.04],
          [0.98, r2 * 0.9],
          [1, r2 * 0.65],
        ]
      : [
          [0, r1],
          [1, r2],
        ]
    const mesh = loft(parent, material, rings, 0.94),
      a = new THREE.Vector3(),
      b = new THREE.Vector3()
    return (from: Point3, to: Point3) => {
      a.fromArray(from)
      b.fromArray(to).sub(a)
      mesh.position.copy(a)
      mesh.scale.y = b.length()
      mesh.quaternion.setFromUnitVectors(up, b.normalize())
    }
  }
  const jacket = loft(
    upper,
    fabric,
    [
      [-0.062, 0.177],
      [-0.043, 0.207],
      [0, 0.218],
      [0.045, 0.214],
      [0.09, 0.219],
      [0.126, 0.21],
      [0.24, 0.213],
      [0.34, 0.242],
      [0.406, 0.266],
      [0.438, 0.256],
      [0.493, 0.202],
      [0.522, 0.132],
      [0.54, 0.102],
    ],
    0.733,
  )
  jacket.rotation.x = -0.09
  bulb(upper, seam, [0, 0.475, 0.05], [0.173, 0.113, 0.14])
  bulb(upper, orange, [0, 0.505, 0.056], [0.169, 0.111, 0.134])
  bulb(hips, pants, [0, -0.005, 0.024], [0.205, 0.133, 0.14])
  // The back panel, structured shoulder straps, webbing and buckles stay attached to the torso.
  const pack = new THREE.Group()
  upper.add(pack)
  pack.position.set(0, 0.27, 0.136)
  pack.rotation.x = -0.14
  bulb(pack, mat(0x26332f), [0, 0, 0.029], [0.147, 0.214, 0.073])
  bulb(pack, mat(0x374337), [0, -0.02, 0.06], [0.128, 0.164, 0.057])
  for (const side of [-1, 1]) {
    const strap = bulb(
      upper,
      mat(0x313b37),
      [side * 0.161, 0.325, 0.109],
      [0.024, 0.18, 0.031],
    )
    strap.rotation.z = side * 0.13
    const front = bulb(
      upper,
      sole,
      [side * 0.146, 0.318, -0.132],
      [0.024, 0.174, 0.023],
    )
    front.rotation.z = -side * 0.16
    const stripe = block(
      pack,
      seam,
      [side * 0.095, -0.072, 0.101],
      [0.012, 0.13, 0.01],
    )
    stripe.rotation.z = side * 0.32
    block(pack, metal, [side * 0.119, 0.056, 0.085], [0.027, 0.016, 0.018])
  }
  block(pack, mint, [0, 0.096, 0.094], [0.045, 0.014, 0.009])
  head.position.set(0, 0.642, -0.082)
  bulb(head, sole, [0, -0.066, -0.019], [0.108, 0.118, 0.107])
  bulb(head, mat(0x283740, 0.42), [0, 0.043, 0.006], [0.151, 0.156, 0.151])
  bulb(head, mat(0x17262d, 0.5), [0, 0.027, 0.005], [0.155, 0.034, 0.155])
  bulb(head, mat(0x293842, 0.31), [0, 0.037, -0.087], [0.145, 0.072, 0.103])
  const lens = bulb(
    head,
    mat(0x73abb4, 0.18, 0.62),
    [0, 0.04, -0.107],
    [0.137, 0.062, 0.091],
  )
  lens.rotation.x = -0.08
  for (const side of [-1, 1]) {
    bulb(head, sole, [side * 0.137, -0.028, 0.017], [0.026, 0.067, 0.054])
    bulb(head, sole, [side * 0.054, 0.174, -0.005], [0.016, 0.008, 0.045])
  }
  const sharedBoard = board ? new THREE.Group() : null
  if (sharedBoard) {
    root.add(sharedBoard)
    sharedBoard.add(makeDeck(true, 1))
  }
  const limbs = ([-1, 1] as const).map((side) => {
    const platform = new THREE.Group(),
      foot = new THREE.Group()
    if (sharedBoard) {
      sharedBoard.add(foot)
      foot.position.z = side * 0.28
      foot.rotation.y = side < 0 ? -1.27 : -1.71
    } else {
      root.add(platform)
      platform.add(makeDeck(false, side))
      platform.add(foot)
    }
    bulb(foot, sole, [0, 0.045, -0.028], [0.089, 0.043, 0.176])
    bulb(foot, boot, [0, 0.096, -0.036], [0.085, 0.076, 0.162])
    bulb(foot, boot, [0, 0.147, 0.023], [0.079, 0.124, 0.085])
    for (const y of [0.081, 0.141, 0.192]) {
      const band = bulb(
        foot,
        y === 0.192 ? mint : metal,
        [0, y, -0.025],
        [0.083, 0.012, y < 0.12 ? 0.122 : 0.086],
      )
      band.rotation.x = -0.12
    }
    block(foot, sole, [0, 0.026, 0.168], [0.098, 0.053, 0.076])
    block(foot, metal, [0, 0.024, -0.192], [0.092, 0.032, 0.081])
    const shin = link(legGroup, pants, 0.079, 0.119),
      thigh = link(legGroup, pants, 0.122, 0.142)
    const knee = bulb(legGroup, kneepad, [0, 0, 0], [0.115, 0.112, 0.116])
    const shoulder = bulb(
      upper,
      orange,
      [side * 0.222, 0.406, -0.03],
      [0.106, 0.102, 0.101],
    )
    const bicep = link(upper, fabric, 0.103, 0.086),
      forearm = link(upper, sleeve, 0.088, 0.061),
      elbow = bulb(upper, sleeve, [0, 0, 0], [0.084, 0.087, 0.084]),
      glove = bulb(upper, sole, [0, 0, 0], [0.067, 0.088, 0.07])
    const pole = !board ? link(root, metal, 0.009, 0.006, false) : null
    const basket = !board
      ? bulb(root, sole, [0, 0, 0], [0.048, 0.01, 0.047])
      : null
    return {
      side,
      platform,
      shin,
      thigh,
      knee,
      shoulder,
      bicep,
      forearm,
      elbow,
      glove,
      pole,
      basket,
    }
  })
  const handPoint = new THREE.Vector3(),
    rootInv = new THREE.Matrix4()
  function pose(f: Frame, p: RiderPose, first: boolean) {
    upper.visible = hips.visible = legGroup.visible = !first
    upper.position.fromArray(p.base)
    hips.position.fromArray(p.base)
    const yaw =
      p.yaw +
      (board ? 0 : 0.035 * Math.sin(f.t * 1.7) * Math.min(1, f.speed / 5))
    upper.rotation.order = 'YXZ'
    upper.rotation.set(p.torso.pitch, yaw, p.torso.roll)
    hips.rotation.set(0, p.hipYaw, -p.lean * 0.13)
    head.rotation.set(
      0.085 + 0.18 * f.tuck,
      board ? boardHeadYaw(f) : 0.62 * shoulderLook(f) - f.heading * 0.25,
      p.lean * 0.13,
    )
    if (sharedBoard) {
      const deck = p.legs[0].deck
      sharedBoard.position.fromArray(deck.origin)
      sharedBoard.rotation.set(deck.pitch, deck.yaw, deck.roll, 'YXZ')
    }
    upper.updateWorldMatrix(true, false)
    rootInv.copy(root.matrixWorld).invert()
    limbs.forEach((l, i) => {
      const side = l.side,
        leg = p.legs[i]
      if (!board) {
        l.platform.position.fromArray(leg.deck.origin)
        l.platform.rotation.set(
          leg.deck.pitch,
          leg.deck.yaw,
          leg.deck.roll,
          'YXZ',
        )
      }
      l.shin(leg.ankle, leg.knee)
      l.thigh(leg.knee, leg.hip)
      l.knee.position.fromArray(leg.knee)
      const plant =
        clamp((1.15 - (f.t - f.lastTurnTime)) / 1.15, 0, 1) *
        (side === f.lastSide ? 1 : 0)
      const swing =
        0.038 * Math.sin(f.t * 2.05 + side * 1.6) * Math.min(1, f.speed / 6)
      const elbow: Point3 = [
        side * (board ? 0.37 : 0.343) - p.lean * 0.047,
        0.218 + 0.036 * f.tuck,
        -0.048 + 0.055 * side * p.lean,
      ]
      const hand: Point3 = [
        side * ((board ? 0.55 : 0.399) - 0.11 * f.tuck) - p.lean * 0.043,
        0.112 + 0.13 * f.tuck + side * p.lean * 0.084 - 0.043 * plant,
        board ? -0.126 + swing : -0.258 - 0.135 * plant + swing,
      ]
      if (p.grab?.hand === side) {
        const target = upper.worldToLocal(
          handPoint.fromArray(p.grab.point).applyMatrix4(root.matrixWorld),
        )
        const weight = p.grab.weight
        for (let axis = 0; axis < 3; axis++)
          hand[axis] += (target.getComponent(axis) - hand[axis]) * weight
        const bend = upper.worldToLocal(
          handPoint.fromArray(p.grab.elbow).applyMatrix4(root.matrixWorld),
        )
        for (let axis = 0; axis < 3; axis++)
          elbow[axis] += (bend.getComponent(axis) - elbow[axis]) * weight
      }
      if (p.shifty) {
        hand[0] += p.shifty * 0.11
        hand[2] += side * p.shifty * 0.16
      }
      l.bicep([side * 0.218, 0.423, -0.03], elbow)
      l.forearm(elbow, hand)
      l.elbow.position.fromArray(elbow)
      l.glove.position.fromArray(hand)
      if (l.pole && l.basket) {
        handPoint
          .fromArray(hand)
          .applyMatrix4(upper.matrixWorld)
          .applyMatrix4(rootInv)
        const h = handPoint.toArray() as Point3
        const tip: Point3 = [
          h[0] + side * (0.135 + 0.075 * plant),
          0.055 + 0.09 * (1 - plant) + 0.028 * Math.sin(f.t * 2.05 + side),
          h[2] + 0.57 - 0.72 * plant,
        ]
        if (f.air.phase === 'flight') {
          tip[1] = h[1] - 0.44
          tip[2] = h[2] + 0.78
        }
        l.pole(h, tip)
        l.basket.position.set(tip[0], tip[1] + 0.048, tip[2] - 0.022)
      }
    })
  }
  return { root, pose }
}
