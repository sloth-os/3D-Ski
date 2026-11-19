import { useState } from 'react'
import { TerrainProfile } from './TerrainProfile.tsx'
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ExternalLink,
  GraduationCap,
  Play,
  SlidersHorizontal,
  Snowflake,
  Target,
} from 'lucide-react'
import { references, surfaces, techniques, type TechniqueId } from './course.ts'
import { radians } from './physics.ts'
import { lengthText, type Prefs } from './storage.ts'

function EdgeDiagram({ angle, load }: { angle: number; load: number }) {
  const roll = angle * 0.53,
    lean = angle * 0.26
  return (
    <svg
      className="edge-diagram"
      viewBox="0 0 450 190"
      role="img"
      aria-label={
        'Front view of edging skier, ' +
        angle +
        ' degree edge angle and estimated ' +
        Math.round(load) +
        ' percent outside-ski load'
      }
    >
      <defs>
        <pattern
          id="snowgrid"
          width="22"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 0h22M0 0l-9 16M22 0 13 16"
            stroke="#548086"
            opacity=".24"
            fill="none"
          />
        </pattern>
        <linearGradient id="skyfill" x2="0" y2="1">
          <stop stopColor="#172b3a" />
          <stop offset="100%" stopColor="#1c3542" />
        </linearGradient>
      </defs>
      <rect width="450" height="190" fill="url(#skyfill)" />
      <g stroke="#304651" strokeDasharray="2 6">
        {[30, 60, 90, 120].map((y) => (
          <path key={y} d={'M0 ' + y + 'h450'} />
        ))}
      </g>
      <path
        d="m0 122 76-43 37 18 51-59 28 31 29-17 61 51 51-41 28 24 39-31 50 35v72H0Z"
        fill="#233e4c"
      />
      <path
        d="m0 127 65-26 57 18 50-34 54 29 52-18 45 18 55-37 72 37v59H0Z"
        fill="#2b4653"
      />
      <path d="M0 150 Q225 140 450 148V190H0Z" fill="#294b55" />
      <rect y="150" width="450" height="40" fill="url(#snowgrid)" />
      <path d="M192 26v120" stroke="#688c97" strokeDasharray="3 4" />
      <g strokeLinecap="round" strokeLinejoin="round">
        <path
          d={
            'M185 142L' +
            (186 + roll * 0.45) +
            ' 120 ' +
            (198 + roll) +
            ' 96M217 142L' +
            (222 + roll * 0.48) +
            ' 120 ' +
            (209 + roll) +
            ' 96'
          }
          fill="none"
          stroke="#96aab6"
          strokeWidth="10"
        />
        <g
          transform={'translate(' + (202 + roll) + ' 96) rotate(' + lean + ')'}
        >
          <path d="M0 1q-7-9-8-24l1-12q9-6 20-1l5 9-4 25Z" fill="#ee8b41" />
          <path
            d="m-5-31-15 14-12 1m43-14 15 8 9 8"
            stroke="#ed9654"
            strokeWidth="7"
            fill="none"
          />
          <circle
            cx="3"
            cy="-49"
            r="11"
            fill="#172932"
            stroke="#889da6"
            strokeWidth="1.5"
          />
          <path d="m-5-49 16-2" stroke="#7ad8d1" strokeWidth="4" />
        </g>
        {[185, 217].map((x) => (
          <g key={x} transform={'rotate(' + -angle + ' ' + x + ' 145)'}>
            <path
              d={'M' + (x - 11) + ' 145h24'}
              stroke="#57e3bf"
              strokeWidth="4.5"
            />
            <path
              d={'M' + (x - 5) + ' 140h11'}
              stroke="#364c59"
              strokeWidth="5"
            />
          </g>
        ))}
        <path
          d={
            'M180 143l' +
            Math.round(angle * 0.39) +
            ' -' +
            Math.round(20 + load * 0.33)
          }
          stroke="#5de3bf"
          strokeWidth="2.5"
        />
        <path
          d={
            'm' +
            (180 + Math.round(angle * 0.39)) +
            ' ' +
            (143 - Math.round(20 + load * 0.33)) +
            ' -5 5m5-5 1 7'
          }
          stroke="#5de3bf"
          strokeWidth="2.5"
        />
      </g>
      <path d="M225 144h33l16-15h41" stroke="#749ba1" fill="none" />
      <text x="278" y="122" fill="#a8c9cb" fontSize="10" fontFamily="monospace">
        EDGE {angle}°
      </text>
    </svg>
  )
}
export function Lab({
  id,
  select,
  practice,
  units,
}: {
  id: TechniqueId
  select: (id: TechniqueId) => void
  practice: (id: TechniqueId, demo?: boolean) => void
  units: Prefs['units']
}) {
  const [angle, setAngle] = useState(32),
    [speed, setSpeed] = useState(28)
  const t = techniques[id],
    r = t.sidecut * Math.cos(angle * radians),
    a = (speed / 3.6) ** 2 / r,
    load = 50 + (38 * a) / (a + 3.2) + 5 * Math.sin(angle * radians)
  return (
    <div className="lab-view">
      <div className="page-heading">
        <div>
          <h1>Technique lab</h1>
          <p>Explore the movements and forces behind each turn.</p>
        </div>
      </div>
      <div className="tech-tabs" role="group" aria-label="Study a technique">
        {(Object.keys(techniques) as TechniqueId[]).map((key) => (
          <button
            key={key}
            aria-pressed={key === id}
            onClick={() => select(key)}
            className={id === key ? 'selected' : ''}
          >
            {techniques[key].name}
          </button>
        ))}
      </div>
      <div className="lab-grid">
        <section className="panel lab-lesson">
          <span className="eyebrow">
            <GraduationCap size={15} />
            {t.category}
          </span>
          <h2>{t.name}</h2>
          <p className="lesson-goal">{t.objective}</p>
          <div className="phases">
            {t.phases.map(([name, text], i) => (
              <div key={name}>
                <span className="phase-num">0{i + 1}</span>
                <div>
                  <h3>{name}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="drill-box">
            <Target size={19} />
            <div>
              <h3>On-course drill</h3>
              <p>{t.drill}</p>
              <p>{t.watch}</p>
            </div>
          </div>
          <div className="lesson-actions">
            <button className="primary" onClick={() => practice(id)}>
              <Play size={16} fill="currentColor" />
              Practice this technique
              <ArrowRight size={16} />
            </button>
            <button className="outline-btn" onClick={() => practice(id, true)}>
              Watch demo
            </button>
          </div>
        </section>
        <section className="panel experiment">
          <h2>
            <SlidersHorizontal size={19} />
            Edge experiment
          </h2>
          <p>
            Change the edge angle and speed to explore an ideal carved turn.
          </p>
          <EdgeDiagram angle={angle} load={load} />
          <div className="range-field">
            <label htmlFor="edge-range">
              Edge angle <strong>{angle}°</strong>
            </label>
            <input
              id="edge-range"
              type="range"
              min="5"
              max="60"
              value={angle}
              onChange={(e) => setAngle(+e.target.value)}
            />
          </div>
          <div className="range-field">
            <label htmlFor="speed-range">
              Skier speed{' '}
              <strong>
                {Math.round(speed * (units === 'imperial' ? 0.621371 : 1))}{' '}
                {units === 'imperial' ? 'mph' : 'km/h'}
              </strong>
            </label>
            <input
              id="speed-range"
              type="range"
              min="8"
              max="55"
              value={speed}
              onChange={(e) => setSpeed(+e.target.value)}
            />
          </div>
          <div className="experiment-stats">
            <div>
              <span>Carve radius</span>
              <b>{lengthText(r, units)}</b>
            </div>
            <div>
              <span>Lateral acceleration</span>
              <b>{(a / 9.81).toFixed(2)} g</b>
            </div>
            <div>
              <span>Outside load</span>
              <b>{Math.round(load)}%</b>
            </div>
          </div>
          <p className="fine-print">
            For a fully engaged edge, R ≈ sidecut × cos(angle) and a = v²/R. The
            on-course model also includes steering, gravity, grip, and skid.
          </p>
        </section>
      </div>
      <div className="environment-grid">
        <TerrainProfile units={units} />
        <section className="panel surface-notes">
          <h2>
            <Snowflake size={18} />
            Reading the snow
          </h2>
          <div>
            {Object.values(surfaces).map((s) => (
              <article key={s.name}>
                <h3>{s.name}</h3>
                <p>{s.note}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
      <details className="panel sources">
        <summary>
          <span>
            <BookOpen size={18} />
            Research &amp; model notes
          </span>
          <ChevronDown size={16} />
        </summary>
        <p>
          Fallline uses fictional courses and a simplified, single-skier model.
          The body pose and outside-ski load are estimates derived from steering
          and acceleration. On snow, a qualified instructor can observe balance,
          equipment, and conditions directly.
        </p>
        {references.map((ref) => (
          <div key={ref.title}>
            <h3>{ref.title}</h3>
            <p>{ref.note}</p>
            <a href={ref.url} target="_blank" rel="noreferrer">
              {ref.publisher}
              <ExternalLink size={12} />
            </a>
          </div>
        ))}
      </details>
    </div>
  )
}
