import { bankAt, undulation, clamp } from './slope.ts'
import { courseStages, stageAt } from './terrainGuide.ts'
import { useId, useState } from 'react'
import { ChevronDown, MountainSnow } from 'lucide-react'
import { courses, type CourseId } from './course.ts'
import { buildGates, lineAt, pitchAt, radians, worldHeight } from './physics.ts'
import { lengthText, type Prefs } from './storage.ts'

export function TerrainProfile({
  units,
  id,
  choose,
}: {
  units: Prefs['units']
  id: CourseId
  choose?: (id: CourseId) => void
}) {
  const [percent, move] = useState(34),
    [axis, setAxis] = useState<'across' | 'along' | null>(null)
  const slider = useId(),
    fill = useId()
  const course = courses[id],
    gates = buildGates(course)
  const distance = (course.length * percent) / 100
  function elevation(d: number) {
    return (
      course.altitude +
      worldHeight(course, d, lineAt(gates, d)) -
      worldHeight(course, 0)
    )
  }
  const routeX = lineAt(gates, distance),
    pitch = pitchAt(course, distance, routeX),
    bank = bankAt(course, distance, routeX, pitch) / radians
  const stages = courseStages(course),
    stage = stageAt(stages, distance)
  const across =
    (axis ??
      (course.form === 'rollers' || course.form === 'moguls'
        ? 'along'
        : 'across')) === 'across'
  const near = clamp(distance - 20, 0, course.length - 40)
  const relief = Array.from({ length: 101 }, (_, i) =>
    across
      ? undulation(course, distance, -22 + (44 * i) / 100)
      : undulation(course, near + (40 * i) / 100, routeX),
  )
  const high = Math.max(...relief),
    low = Math.min(...relief)
  const reliefY = (value: number) =>
    31 - ((value - (high + low) / 2) * 39) / Math.max(1, high - low)
  const points = relief.map((h, i) => 8 + 3.84 * i + ',' + reliefY(h)).join(' ')
  const fraction = across ? (routeX + 22) / 44 : (distance - near) / 40
  const detailX = 8 + 384 * fraction,
    detailY = reliefY(undulation(course, distance, routeX))
  const point = (d: number) => [
    9 + (382 * d) / course.length,
    11 + (222 * (course.altitude - elevation(d))) / course.length,
  ]
  const samples = Math.ceil(course.length / 1.5)
  const profile = Array.from({ length: samples + 1 }, (_, i) =>
    point((i * course.length) / samples).join(','),
  ).join(' ')
  const [x, y] = point(distance)
  return (
    <section className="panel terrain-profile" data-terrain={id}>
      <div className="profile-heading">
        <h2>
          <MountainSnow size={18} />
          Terrain profile
        </h2>
        {choose && (
          <div className="profile-select">
            <select
              aria-label="Terrain to inspect"
              value={id}
              onChange={(e) => choose(e.target.value as CourseId)}
            >
              {Object.entries(courses).map(([key, c]) => (
                <option key={key} value={key}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </div>
        )}
      </div>
      {choose && <p>{course.description}</p>}
      <svg
        className="elevation-chart"
        viewBox="0 0 400 111"
        preserveAspectRatio="none"
        role="img"
        aria-label={
          course.name +
          ' elevation profile, local pitch ' +
          (pitch / radians).toFixed(1) +
          ' degrees'
        }
      >
        <defs>
          <linearGradient id={fill} x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#55d5ad" stopOpacity=".32" />
            <stop offset="100%" stopColor="#55d5ad" stopOpacity=".035" />
          </linearGradient>
        </defs>
        {[19, 43, 67, 91].map((value) => (
          <path
            key={value}
            d={'M0 ' + value + 'h400'}
            fill="none"
            stroke="#34444b"
            strokeDasharray="2 5"
          />
        ))}
        <polygon
          points={'9,111 ' + profile + ' 391,111'}
          fill={'url(#' + fill + ')'}
        />
        <polyline
          points={profile}
          fill="none"
          stroke="#68dab9"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {gates.map((g) => {
          const [gx, gy] = point(g.d)
          return (
            <path
              key={g.d}
              d={'M' + gx + ' ' + gy + 'v-5'}
              stroke="#a2cbc3"
              strokeWidth="1.3"
            />
          )
        })}
        <path
          d={'M' + x + ' 3V110'}
          stroke="#e1f5ed"
          opacity=".5"
          strokeDasharray="2 3"
        />
        <circle
          cx={x}
          cy={y}
          r="4"
          fill="#6ce1bf"
          stroke="#e3fff4"
          strokeWidth="1.5"
        />
      </svg>
      <div className="range-field">
        <label htmlFor={slider}>
          Course position
          <strong>
            {lengthText(distance, units)} / {lengthText(course.length, units)}
          </strong>
        </label>
        <input
          id={slider}
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={percent}
          onChange={(e) => move(+e.target.value)}
        />
      </div>
      {stage && (
        <>
          <div className="stage-stops" aria-label="Course sections">
            {stages.map((z, i) => (
              <button
                key={z.d}
                type="button"
                aria-pressed={stage.d === z.d}
                onClick={() =>
                  move(
                    (100 * (z.d + (stages[i + 1]?.d ?? course.length))) /
                      (2 * course.length),
                  )
                }
              >
                {z.name}
              </button>
            ))}
          </div>
          <p className="stage-cue">{stage.cue}</p>
          <figure className="snow-section">
            <figcaption>
              Snow relief{' '}
              <select
                aria-label="Snow relief direction"
                value={across ? 'across' : 'along'}
                onChange={(e) => setAxis(e.target.value as 'across' | 'along')}
              >
                <option value="across">Across trail</option>
                <option value="along">Down course</option>
              </select>
            </figcaption>
            <svg
              viewBox="0 0 400 57"
              role="img"
              aria-label={
                course.name +
                ' snow relief ' +
                (across ? 'across the trail' : 'along the course') +
                ' relative to the mean slope.'
              }
            >
              <polygon points={'8,56 ' + points + ' 392,56'} fill="#29474f" />
              <path
                d={'M8 ' + reliefY(0) + 'h384'}
                stroke="#537075"
                strokeDasharray="3 4"
              />
              <polyline
                points={points}
                fill="none"
                stroke="#a7e0ed"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={detailX} cy={detailY} r="3.8" fill="#d0ee9e" />
            </svg>
            <small>
              <span>{across ? 'Left' : 'Uphill'}</span>
              <span>
                {lengthText(across ? 44 : 40, units)} span ·{' '}
                {lengthText(high - low, units, 1)} relief
              </span>
              <span>{across ? 'Right' : 'Downhill'}</span>
            </small>
          </figure>
        </>
      )}
      <div className="experiment-stats terrain-stats">
        <div>
          <span>Elevation</span>
          <b>{lengthText(elevation(distance), units)}</b>
        </div>
        <div>
          <span>Local pitch</span>
          <b>{(pitch / radians).toFixed(1)}°</b>
        </div>
        <div>
          <span>Downhill gravity</span>
          <b>{Math.sin(pitch).toFixed(2)} g</b>
        </div>
        {stage && (
          <div>
            <span>Bank</span>
            <b>{Math.abs(bank).toFixed(1)}°</b>
            <small>
              {Math.abs(bank) < 0.1
                ? 'Level'
                : bank > 0
                  ? 'Right high'
                  : 'Left high'}
            </small>
          </div>
        )}
      </div>
    </section>
  )
}
