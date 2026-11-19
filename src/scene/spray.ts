import * as THREE from 'three'
import type { SurfaceId } from '../course.ts'
import type { Frame } from '../physics.ts'

export function makeSpray(surface: SurfaceId) {
  const count = 160,
    positions = new Float32Array(count * 3),
    velocities = new Float32Array(count * 3),
    lives = new Float32Array(count)
  for (let i = 0; i < count; i++) positions[i * 3 + 1] = -10000
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  )
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  const ctx = canvas.getContext('2d')!,
    grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(0.35, 'rgba(245,252,255,.8)')
  grad.addColorStop(1, 'rgba(220,242,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 32, 32)
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: surface === 'powder' ? 0.14 : 0.085,
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      opacity: 0.77,
      depthWrite: false,
    }),
  )
  points.frustumCulled = false
  let previous = 0,
    fraction = 0,
    next = 0
  function update(f: Frame, pos: THREE.Vector3, pitch: number) {
    if (f.t < previous) {
      lives.fill(0)
      for (let i = 0; i < count; i++) positions[i * 3 + 1] = -10000
      fraction = 0
    }
    const dt = Math.max(0, Math.min(0.2, f.t - previous))
    previous = f.t
    for (let i = 0; i < count; i++) {
      if (lives[i] <= 0) continue
      const k = i * 3
      lives[i] -= dt
      if (lives[i] <= 0) {
        positions[k + 1] = -10000
        continue
      }
      for (let axis = 0; axis < 3; axis++)
        positions[k + axis] += velocities[k + axis] * dt
      velocities[k + 1] -= 6.7 * dt
    }
    const amount =
      (surface === 'powder' ? 1.65 : surface === 'ice' ? 0.32 : 1) *
      (Math.abs(f.edge) / 45 + 1.6 * f.brake)
    fraction += Math.min(145, amount * f.speed * 4.5) * dt
    const emitted = Math.floor(fraction)
    fraction -= emitted
    for (let i = 0; i < emitted; i++) {
      const j = next++ % count,
        k = j * 3,
        outside =
          f.brake > 0.3
            ? Math.random() > 0.5
              ? 1
              : -1
            : -(Math.sign(f.edge) || 1)
      positions[k] = pos.x + outside * (0.16 + Math.random() * 0.08)
      positions[k + 1] = pos.y + 0.13
      positions[k + 2] = pos.z + 0.37
      velocities[k] =
        outside * (0.45 + Math.random() * 2) * amount +
        Math.sin(f.heading) * f.speed * 0.32
      velocities[k + 1] =
        0.4 + Math.random() * 1.75 - Math.sin(pitch) * f.speed * 0.16
      velocities[k + 2] = 0.65 - Math.cos(f.heading) * f.speed * 0.24
      lives[j] = 0.29 + Math.random() * 0.35
    }
    geometry.attributes.position.needsUpdate = true
  }
  return { points, update }
}
