export const cameras = [
  { id: 'chase', name: 'Chase', description: 'Follow the rider from behind.' },
  {
    id: 'first',
    name: 'Helmet',
    description: 'Look down the run from the rider’s eye line.',
  },
  {
    id: 'side',
    name: 'Trackside',
    description: 'Study flexion and pressure transfer side-on.',
  },
  {
    id: 'edge',
    name: 'Edge cam',
    description: 'Follow the bindings and the loaded edge close to the snow.',
  },
  {
    id: 'aerial',
    name: 'Aerial',
    description: 'Read the gate line and your tracks from above.',
  },
] as const
export type CameraMode = (typeof cameras)[number]['id']
export const nextCamera = (current: CameraMode) =>
  cameras[(cameras.findIndex((c) => c.id === current) + 1) % cameras.length].id

import type { MuscleFocus, MuscleWork } from './muscles.ts'
import type { Point3, Lens } from './analysis.ts'
import { bodyHeading, shoulderLook, boardHeadYaw } from './air.ts'
import { clamp, radians, type Frame } from './physics.ts'
import type { Course } from './course.ts'
export type ViewOptions = {
  camera: CameraMode
  line: boolean
  forces: boolean
  lens: Lens
  muscle?: MuscleFocus
  orbit: number
  tilt: number
  zoom: number
  preview: boolean
  reduced: boolean
}
export type ScreenPoint = { x: number; y: number; visible: boolean }
export type Projection = {
  muscles?: MuscleWork
  studyPoint: ScreenPoint
  upper: ScreenPoint
  lower: ScreenPoint
  gate: ScreenPoint
  bearing: number
}
export type CameraShot = { eye: Point3; target: Point3; fov: number }
export const isTrailhead = (opt: ViewOptions) =>
  opt.preview &&
  opt.camera === 'chase' &&
  Math.abs(opt.orbit) < 0.005 &&
  Math.abs(opt.tilt) < 0.005 &&
  Math.abs(opt.zoom - 1) < 0.01

// All camera offsets are in metres. A camera follows the terrain pitch when it moves around the rider.
export function cameraShot(
  f: Frame,
  c: Course,
  opt: ViewOptions,
  board = false,
): CameraShot {
  const pitch = (f.pitch || c.pitch) * radians,
    heading = f.heading,
    quiet = opt.reduced ? 0 : 1
  const lift = f.air.height
  const phase = f.d * 0.54
  const bob =
    0.024 *
    Math.sin(phase) *
    Math.min(f.speed / 8, 1) *
    quiet *
    (1 - f.flex * 0.64)
  let distance = 4.15,
    height = 1.65,
    angle = 0.22 + heading * 0.69,
    targetY = 0.84,
    targetZ = -0.38
  let fov = 48 + Math.min(4, f.speed * 0.16) * quiet
  switch (opt.camera) {
    case 'chase':
      if (opt.preview) {
        distance = 4.36
        height = 1.42
        angle = heading + 0.67
        targetY = 0.87
        fov = 47
      }
      break
    case 'first': {
      const gaze = board ? 1.24 - boardHeadYaw(f) : -shoulderLook(f)
      const look = heading + quiet * (bodyHeading(f) + f.boardYaw + gaze)
      const eye: Point3 = [
        Math.sin(f.lean) * 0.36,
        lift +
          1.56 -
          f.flex * 0.24 -
          f.tuck * 0.17 +
          bob -
          (f.safety?.fall ?? 0) * 0.9,
        -0.03,
      ]
      return {
        eye,
        target: [
          eye[0] + Math.sin(look) * 11,
          eye[1] - 1.1 - 11 * Math.tan(pitch) * Math.cos(look),
          eye[2] - Math.cos(look) * 11,
        ],
        fov: 71 + Math.min(3, f.speed * 0.13) * quiet,
      }
    }
    case 'side':
      distance = 3.75
      height = 0.93
      angle = heading + 1.43
      targetY = 0.7
      targetZ = 0
      fov = 44
      break
    case 'edge':
      distance = 1.5
      height = 0.27
      angle = heading + 1.08
      targetY = 0.2
      targetZ = -0.015
      fov = 57
      break
    case 'aerial':
      distance = 9.7
      height = 14
      angle = heading * 0.2 + 0.23
      targetY = -0.8
      targetZ = -5
      fov = 56
      break
  }
  if (f.safety) {
    targetY -= 0.36 * f.safety.fall
    if (opt.camera === 'side') angle -= 0.44
  }
  angle += opt.orbit
  const zoom = clamp(opt.zoom, 0.59, 1.85),
    dist = distance * zoom
  const x = Math.sin(angle) * dist,
    z = Math.cos(angle) * dist
  return {
    eye: [
      x,
      Math.max(
        0.21,
        height * zoom +
          z * Math.tan(pitch) +
          opt.tilt * dist +
          bob +
          lift * 0.62,
      ),
      z,
    ],
    target: [
      Math.sin(heading) * 0.26,
      targetY + bob * 0.13 + lift * 0.79,
      targetZ,
    ],
    fov,
  }
}

// A flat direction arrow beside the equipment is aligned to travel, even during a surface pivot.
export const travelArrow: Point3[] = [
  [-1.14, 0.06, -0.83],
  [-0.96, 0.06, -0.83],
  [-0.96, 0.06, -1.64],
  [-0.76, 0.06, -1.61],
  [-1.05, 0.06, -2.14],
  [-1.34, 0.06, -1.61],
  [-1.14, 0.06, -1.64],
]
