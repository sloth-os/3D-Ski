import {
  effortBand,
  effortColors,
  effortNames,
  muscleGroups,
  muscleIds,
  muscleSources,
  type MuscleFocus,
  type MuscleWork,
} from './muscles.ts'

export function MuscleReadout({
  work,
  focus,
  change,
  board,
  switched,
}: {
  work: MuscleWork
  focus: MuscleFocus
  change: (focus: MuscleFocus) => void
  board: boolean
  switched: boolean
}) {
  const id = focus === 'auto' ? work.primary : focus
  return (
    <section
      className="muscle-readout"
      aria-label="Muscle demand"
      data-movement={work.phase}
    >
      <header>
        <label>
          Muscle focus
          <select
            aria-label="Muscle focus"
            value={focus}
            onChange={(e) => change(e.target.value as MuscleFocus)}
          >
            <option value="auto">Follow movement</option>
            {muscleIds.map((key) => (
              <option key={key} value={key}>
                {muscleGroups[key][0]}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="muscle-title">
        <strong>{muscleGroups[id][0]}</strong>
        <span>{work.phase}</span>
      </div>
      <div className="muscle-sides">
        {work.limbs.map((limb, i) => {
          const band = effortBand(limb.levels[id])
          return (
            <div key={i}>
              <span>
                {i ? 'Right' : 'Left'}
                {board ? (switched === !!i ? ' · lead' : ' · trail') : ''}
              </span>
              <b style={{ color: effortColors[band] }}>{effortNames[band]}</b>
              <i className="demand-scale" aria-hidden="true">
                {effortNames.map((name, j) => (
                  <i
                    key={name}
                    style={
                      j <= band ? { background: effortColors[band] } : undefined
                    }
                  />
                ))}
              </i>
            </div>
          )
        })}
      </div>
      <p>{work.cue}</p>
      {focus !== 'auto' && <p>{muscleGroups[id][1]}</p>}
      <small>Color shows estimated relative demand.</small>
    </section>
  )
}

export function MuscleEvidence() {
  return (
    <details className="muscle-evidence">
      <summary>How muscle demand is estimated</summary>
      <p>
        The model combines each foot’s share of snow reaction, the reaction’s
        lever arm about the knee, joint position, and movement phase. The colors
        show relative demand within the simulation. Individual muscle activity
        would require measurements such as electromyography (EMG).
      </p>
      {muscleSources.map(([name, url]) => (
        <a key={url} href={url} target="_blank" rel="noreferrer">
          {name} ↗
        </a>
      ))}
    </details>
  )
}
