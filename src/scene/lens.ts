import * as THREE from 'three'
import {
  lensColors,
  riderMass,
  gravity,
  type ForceState,
  type RiderPose,
  type Lens,
  type Point3,
} from '../analysis.ts'

function rod(parent: THREE.Group, color: string, radius: number) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.94,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 1, 8),
    material,
  )
  mesh.renderOrder = 12
  parent.add(mesh)
  const up = new THREE.Vector3(0, 1, 0),
    direction = new THREE.Vector3()
  return (from: THREE.Vector3, to: THREE.Vector3) => {
    direction.subVectors(to, from)
    mesh.position.copy(from).addScaledVector(direction, 0.5)
    mesh.scale.y = direction.length()
    if (mesh.scale.y > 0.00001)
      mesh.quaternion.setFromUnitVectors(up, direction.normalize())
  }
}
function arrow(parent: THREE.Group, color: string) {
  const group = new THREE.Group()
  parent.add(group)
  const line = rod(group, color, 0.008)
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.041, 0.105, 14),
    new THREE.MeshBasicMaterial({
      color,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  tip.renderOrder = 13
  group.add(tip)
  const end = new THREE.Vector3(),
    dir = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0)
  return (from: THREE.Vector3, force: Point3) => {
    dir.fromArray(force)
    const size = dir.length()
    group.visible = size > 0.7
    const len = (size / (riderMass * gravity)) * 1.39,
      head = Math.min(0.105, len * 0.36)
    dir.normalize()
    end.copy(from).addScaledVector(dir, Math.max(0, len - head * 0.65))
    line(from, end)
    tip.position.copy(from).addScaledVector(dir, len - head / 2)
    tip.quaternion.setFromUnitVectors(up, dir)
    tip.scale.setScalar(head / 0.105)
    return end.copy(from).addScaledVector(dir, len)
  }
}
export function makeLens(scene: THREE.Scene) {
  const forces = new THREE.Group(),
    body = new THREE.Group(),
    contact = new THREE.Group()
  scene.add(forces, body, contact)
  const reaction = arrow(forces, lensColors.support),
    weight = arrow(forces, lensColors.gravity),
    drag = arrow(forces, lensColors.drag)
  const sphere = new THREE.SphereGeometry(0.027, 12, 10)
  const dots = Array.from({ length: 7 }, () => {
    const m = new THREE.Mesh(
      sphere,
      new THREE.MeshBasicMaterial({
        color: 0xe6e3ff,
        depthTest: false,
        depthWrite: false,
      }),
    )
    m.renderOrder = 15
    body.add(m)
    return m
  })
  const links = Array.from({ length: 6 }, () =>
    rod(body, lensColors.body, 0.009),
  )
  const grip = new THREE.Mesh(
    sphere,
    new THREE.MeshBasicMaterial({
      color: lensColors.support,
      wireframe: true,
      depthTest: false,
      depthWrite: false,
    }),
  )
  grip.scale.setScalar(2.9)
  grip.renderOrder = 16
  body.add(grip)
  const normalArrows = [
      arrow(contact, lensColors.support),
      arrow(contact, lensColors.drag),
    ],
    shear = arrow(contact, lensColors.gravity)
  const pads = [0, 1].map((i) => {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(1, 40),
      new THREE.MeshBasicMaterial({
        color: i ? 0x80cdfc : 0xc4f486,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      }),
    )
    m.renderOrder = 10
    contact.add(m)
    return m
  })
  const upper = new THREE.Vector3(),
    lower = new THREE.Vector3(),
    scratch = new THREE.Vector3()
  const joints = Array.from({ length: 7 }, () => new THREE.Vector3())
  return {
    upper,
    lower,
    update(
      root: THREE.Object3D,
      p: RiderPose,
      a: ForceState,
      lens: Lens,
      enabled: boolean,
      board: boolean,
    ) {
      forces.visible = enabled && lens === 'forces'
      body.visible = enabled && lens === 'body'
      contact.visible = enabled && lens === 'contact' && a.normalN > 0
      const point = (out: THREE.Vector3, v: Point3) =>
        out.fromArray(v).applyMatrix4(root.matrixWorld)
      const com = point(joints[6], p.com)
      for (let i = 0; i < 2; i++) {
        const leg = p.legs[i]
        point(joints[i * 3], leg.hip)
        point(joints[i * 3 + 1], leg.knee)
        point(joints[i * 3 + 2], leg.ankle)
      }
      if (lens === 'forces') {
        const contactPoint: Point3 = [0, 0, 0]
        for (let j = 0; j < 3; j++)
          contactPoint[j] =
            p.legs[0].contact[j] * a.firstShare +
            p.legs[1].contact[j] * (1 - a.firstShare)
        upper.copy(reaction(point(scratch, contactPoint), a.reaction))
        weight(com, a.weight)
        const dragTip = drag(com, a.drag)
        if (!a.normalN) upper.copy(dragTip)
        lower.copy(com)
      } else if (lens === 'body') {
        joints.forEach((v, i) => dots[i].position.copy(v))
        dots[6].scale.setScalar(1.45)
        for (let i = 0; i < 2; i++) {
          const j = 3 * i
          links[j](joints[j], joints[j + 1])
          links[j + 1](joints[j + 1], joints[j + 2])
          links[j + 2](com, joints[j])
        }
        upper.copy(com)
        lower.copy(joints[p.outside * 3 + 1])
        grip.visible = !!p.grab?.engaged
        if (p.grab?.engaged) {
          point(grip.position, p.grab.point)
          lower.copy(grip.position)
        }
      } else {
        for (let i = 0; i < 2; i++) {
          const pos = point(scratch, p.legs[i].contact)
          const load = a.contacts[i],
            share = a.normalN ? load / a.normalN : 0
          pads[i].position.copy(pos)
          pads[i].quaternion.copy(root.quaternion)
          pads[i].rotateX(-Math.PI / 2)
          pads[i].scale.set(
            (board ? 0.098 : 0.054) * (0.65 + share),
            (board ? 0.255 : 0.46) * a.contactFraction,
            1,
          )
          const v = a.normal.map((n) => n * load) as Point3
          normalArrows[i](pos, v)
          if (i === 0) upper.copy(pos)
          else lower.copy(pos)
        }
        shear(lower, a.forward.map((n) => -n * a.frictionN) as Point3)
      }
    },
  }
}
