import * as THREE from 'three'
import {
  effortBand,
  effortColors,
  muscleIds,
  type MuscleBand,
  type MuscleFocus,
  type MuscleWork,
} from '../muscles.ts'

// Longitudinal striations stay in muscle coordinates as the body turns.
export function makeMuscles(parent: THREE.Group) {
  const geo = new THREE.SphereGeometry(1, 32, 16)
  const uv = geo.getAttribute('uv'),
    colors = new Float32Array(uv.count * 3)
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i),
      v = uv.getY(i)
    const fiber =
      0.68 +
      0.32 *
        (0.5 +
          0.5 *
            Math.cos(2 * Math.PI * (u * 13 + 0.21 * Math.sin(v * Math.PI)))) **
          2
    colors.set([fiber, fiber, fiber], i * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mesh = new THREE.InstancedMesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
    muscleIds.length * 2,
  )
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false
  mesh.visible = false
  parent.add(mesh)
  const model = new THREE.Object3D(),
    direction = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0)
  const color = new THREE.Color(),
    muted = new THREE.Color(0x334c52)
  return {
    mesh,
    draw(bands: MuscleBand[], work: MuscleWork, focus: MuscleFocus) {
      for (const [i, band] of bands.entries()) {
        const effort = work.limbs[band.limb].levels[band.id]
        model.position.fromArray(band.from)
        direction.fromArray(band.to).sub(model.position)
        model.position.addScaledVector(direction, 0.5)
        const radius = band.radius * (0.94 + 0.12 * effort)
        model.scale.set(radius, direction.length() / 2, radius * 0.88)
        model.quaternion.setFromUnitVectors(up, direction.normalize())
        model.updateMatrix()
        mesh.setMatrixAt(i, model.matrix)
        color.set(effortColors[effortBand(effort)])
        if (focus !== 'auto' && band.id !== focus) color.lerp(muted, 0.83)
        mesh.setColorAt(i, color)
      }
      mesh.instanceMatrix.needsUpdate = true
      mesh.instanceColor!.needsUpdate = true
    },
  }
}
