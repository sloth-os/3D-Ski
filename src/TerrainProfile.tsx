import { useState } from 'react'
import { ChevronDown, MountainSnow } from 'lucide-react'
import { courses, type CourseId } from './course.ts'
import { buildGates, lineAt, pitchAt, radians, worldHeight } from './physics.ts'
import { lengthText, type Prefs } from './storage.ts'

export function TerrainProfile({ units }: { units: Prefs['units'] }) {
  const [id, choose] = useState<CourseId>('ridge')
  const [percent, move] = useState(34)
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
  const pitch = pitchAt(course, distance, lineAt(gates, distance))
  const point = (d: number) => [
    9 + (382 * d) / course.length,
    11 + (222 * (course.altitude - elevation(d))) / course.length,
  ]
  const profile = Array.from({ length: 100 }, (_, i) =>
    point((i * course.length) / 99).join(','),
  ).join(' ')
  const [x, y] = point(distance)
  return (
    <section className="panel terrain-profile">
      <div className="profile-heading">
        <h2>
          <MountainSnow size={18} />
          Terrain profile
        </h2>
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
      </div>
      <p>
        {course.description} Move along the course to inspect the local
        gradient.
      </p>
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
          <linearGradient id="terrain-fill" x1="0" x2="0" y1="0" y2="1">
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
          fill="url(#terrain-fill)"
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
        <label htmlFor="course-position">
          Course position
          <strong>
            {lengthText(distance, units)} / {lengthText(course.length, units)}
          </strong>
        </label>
        <input
          id="course-position"
          type="range"
          min="0"
          max="100"
          value={percent}
          onChange={(e) => move(+e.target.value)}
        />
      </div>
      <div className="experiment-stats">
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
      </div>
    </section>
  )
}
