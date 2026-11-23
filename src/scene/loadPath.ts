import * as THREE from 'three'
import type { LoadDrawing } from '../loadDrawing.ts'

export function makeLoadOverlay(root: THREE.Group) {
  const group = new THREE.Group()
  root.add(group)
  const material = new THREE.MeshBasicMaterial({
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  const batch = (
    geometry: THREE.BufferGeometry,
    capacity: number,
    order: number,
  ) => {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.frustumCulled = false
    mesh.renderOrder = order
    group.add(mesh)
    return mesh
  }
  const rods = batch(new THREE.CylinderGeometry(1, 1, 1, 8), 48, 16),
    cones = batch(new THREE.ConeGeometry(1, 1, 12), 4, 18),
    dots = batch(new THREE.SphereGeometry(1, 12, 9), 16, 17)
  const object = new THREE.Object3D(),
    dir = new THREE.Vector3(),
    end = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0),
    color = new THREE.Color()
  function finish(mesh: THREE.InstancedMesh, count: number) {
    mesh.count = count
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }
  function drawLines(mesh: THREE.InstancedMesh, lines: LoadDrawing['lines']) {
    lines.forEach((line, i) => {
      object.position.fromArray(line.from)
      end.fromArray(line.to)
      dir.subVectors(end, object.position)
      const length = dir.length()
      object.position.lerp(end, 0.5)
      object.quaternion.setFromUnitVectors(up, dir.normalize())
      object.scale.set(line.radius, length, line.radius)
      object.updateMatrix()
      mesh.setMatrixAt(i, object.matrix)
      mesh.setColorAt(i, color.set(line.color))
    })
    finish(mesh, lines.length)
  }
  return {
    group,
    draw(d: LoadDrawing) {
      drawLines(rods, d.lines)
      drawLines(cones, d.heads)
      d.nodes.forEach((node, i) => {
        object.position.fromArray(node.point)
        object.scale.setScalar(node.radius)
        object.updateMatrix()
        dots.setMatrixAt(i, object.matrix)
        dots.setColorAt(i, color.set(node.color))
      })
      finish(dots, d.nodes.length)
    },
  }
}
