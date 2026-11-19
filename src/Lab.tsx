import { useMemo, useState } from 'react'
import { PoseStudy } from './PoseStudy.tsx'
import { analyse, idealTurn } from './analysis.ts'
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
import {
  references,
  surfaces,
  techniques,
  equipmentFor,
  type Setup,
  type TechniqueId,
} from './course.ts'
import { lengthText, type Prefs } from './storage.ts'

export function Lab({
  setup,
  id,
  select,
  practice,
  units,
}: {
  setup: Setup
  id: TechniqueId
  select: (id: TechniqueId) => void
  practice: (id: TechniqueId, demo?: boolean) => void
  units: Prefs['units']
}) {
  const [angle, setAngle] = useState(32),
    [speed, setSpeed] = useState(28)
  const t = techniques[id],
    study = useMemo(() => ({ ...setup, technique: id }), [setup, id])
  const f = idealTurn(study, angle, speed),
    board = equipmentFor(id) === 'snowboard'
  const load = board ? 100 * analyse(f, study).firstShare : f.load,
    r = f.radius,
    a = f.lateralAccel
  return (
    <div className="lab-view">
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
            Set the speed and peak edge angle. Drag the rider to inspect the
            turn.
          </p>
          <PoseStudy setup={study} angle={angle} speed={speed} />
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
              Rider speed{' '}
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
              <span>{board ? 'Front binding' : 'Outside ski'}</span>
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
          Fallline uses fictional courses and a 75 kg rider. The leg pose and
          contact loads are modeled from steering, flexion, equipment, and
          acceleration. On snow, a qualified instructor can observe balance,
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
