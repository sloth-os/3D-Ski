import { useId } from 'react'
import {
  Activity,
  Footprints,
  Gauge,
  MoveUpRight,
  RotateCw,
} from 'lucide-react'
import type { Sample } from './physics.ts'
import type { Prefs } from './storage.ts'

function Trace({
  values,
  color,
  min,
  max,
}: {
  values: number[]
  color: string
  min?: number
  max?: number
}) {
  const id = useId().replaceAll(':', '')
  const ys = values.filter(Number.isFinite),
    hi = max ?? (ys.length ? Math.max(...ys) : 1),
    lo = Math.min(min ?? (ys.length ? Math.min(...ys) : 0), hi - 0.01)
  const span = Math.max(1, hi - lo)
  const points = values.map((v, i) => [
    (i / (Math.max(2, values.length) - 1)) * 118,
    40 -
      ((Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : hi)) - lo) / span) *
        32,
  ])
  const line = points
    .map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1))
    .join(' ')
  return (
    <svg
      className="sparkline"
      viewBox="0 0 120 48"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".24" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[12, 26, 40].map((y) => (
        <path
          key={y}
          d={'M0 ' + y + 'h120'}
          stroke={color}
          opacity=".11"
          strokeDasharray="2 4"
          strokeWidth=".6"
        />
      ))}
      {points.length > 1 && (
        <>
          <path d={line + ' L118,48 L0,48Z'} fill={'url(#' + id + ')'} />
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={points.at(-1)![0]}
            cy={points.at(-1)![1]}
            r="2.1"
            fill={color}
          />
        </>
      )}
    </svg>
  )
}
export function Telemetry({
  samples,
  preview,
  units,
  board,
}: {
  samples: Sample[]
  preview: boolean
  units: Prefs['units']
  board: boolean
}) {
  const s = samples.at(-1) ?? { speed: 0, edge: 0, load: 50, radius: Infinity },
    metric = units === 'metric'
  const cards = [
    {
      label: 'Speed',
      icon: Gauge,
      value: (s.speed * (metric ? 1 : 0.621371)).toFixed(1),
      unit: metric ? 'km/h' : 'mph',
      key: 'speed',
      color: '#54ddba',
      tint: 'mint',
    },
    {
      label: 'Edge angle',
      icon: MoveUpRight,
      value: Math.round(s.edge).toString(),
      unit: '°',
      key: 'edge',
      color: '#78acf9',
      tint: 'blue',
    },
    {
      label: board ? 'Front binding load' : 'Outside ski load',
      icon: Footprints,
      value: Math.round(s.load).toString(),
      unit: '%',
      key: 'load',
      color: '#b89af6',
      tint: 'violet',
    },
    {
      label: 'Turn radius',
      icon: RotateCw,
      value: Number.isFinite(s.radius)
        ? (s.radius * (metric ? 1 : 3.28084)).toFixed(1)
        : '∞',
      unit: metric ? 'm' : 'ft',
      key: 'radius',
      color: '#edb774',
      tint: 'orange',
    },
  ] as const
  return (
    <section className="telemetry">
      <div className="section-row">
        <h2>
          <Activity />
          Live telemetry
        </h2>
        <span className="reference-badge">
          <span className={'data-dot ' + (preview ? '' : 'active')} />
          {preview ? 'Reference run' : 'Session data'}
        </span>
      </div>
      <div className="metric-grid">
        {cards.map((card) => (
          <article className="metric" key={card.key}>
            <div className="metric-head">
              <span className={'metric-icon ' + card.tint}>
                <card.icon size={17} />
              </span>
              <h3>{card.label}</h3>
            </div>
            <div className="metric-body">
              <strong>
                {card.value}
                <small className={card.unit === '°' ? 'degrees' : ''}>
                  {card.unit}
                </small>
              </strong>
              <Trace
                values={samples.map((s) => s[card.key])}
                color={card.color}
                max={
                  card.key === 'radius'
                    ? Math.min(
                        100,
                        Math.max(
                          1,
                          ...samples.map((s) =>
                            Number.isFinite(s.radius) ? s.radius : 100,
                          ),
                        ),
                      )
                    : undefined
                }
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
