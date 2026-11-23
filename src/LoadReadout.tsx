import { magnitude } from './analysis.ts'
import {
  loadParts,
  isFootPart,
  partName,
  loadReading,
  loadComponents,
  type LoadPath,
  type LoadSelection,
} from './loadPath.ts'

export function LoadReadout({
  model,
  selection,
  change,
}: {
  model: LoadPath
  selection: LoadSelection
  change: (s: LoadSelection) => void
}) {
  const r = loadReading(model, selection),
    branched = isFootPart(selection.part)
  const components = selection.components
    ? loadComponents(model, selection)
    : null
  return (
    <section
      className="chain-readout"
      aria-label="Load path analysis"
      data-part={selection.part}
      data-side={branched ? r.i : 'both'}
      data-phase={model.phase}
    >
      <div className="chain-selects">
        <label>
          Inspect
          <select
            aria-label="Load path segment"
            value={selection.part}
            onChange={(e) =>
              change({
                ...selection,
                part: e.target.value as LoadSelection['part'],
              })
            }
          >
            {loadParts.map((id) => (
              <option key={id} value={id}>
                {partName(id, model.board)}
              </option>
            ))}
          </select>
        </label>
        {branched && (
          <label>
            Foot
            <select
              aria-label="Load path foot"
              value={selection.side}
              onChange={(e) =>
                change({
                  ...selection,
                  side: e.target.value as LoadSelection['side'],
                })
              }
            >
              <option value="auto">Heavier foot</option>
              {model.feet.map((foot, i) => (
                <option key={i} value={i ? 'right' : 'left'}>
                  {foot.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="chain-phase">
        <span>{model.phase}</span>
        <span>
          {branched
            ? r.foot.label +
              (selection.part === 'equipment'
                ? ' · ' + Math.round(model.edge) + '°'
                : '')
            : selection.part === 'upper'
              ? 'Head, arms & trunk'
              : 'Combined contact'}
        </span>
      </div>
      <dl className="chain-metrics">
        {r.metrics.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <button
        className="chain-resolve"
        aria-pressed={!!selection.components}
        onClick={() =>
          change({ ...selection, components: !selection.components })
        }
      >
        Resolve force components
      </button>
      {components && (
        <div className="chain-components">
          <span>
            {components.labels[0]} <b>{Math.round(components.signed)} N</b>
          </span>
          <span>
            {components.labels[1]} <b>{Math.round(components.transverse)} N</b>
          </span>
        </div>
      )}
      <p>{r.cue}</p>
      <div className="chain-key">
        {selection.part === 'snow' ? (
          <>
            <span className="key-left">Snow on rider</span>
            <span className="key-weight">Rider on snow</span>
          </>
        ) : (
          <>
            <span className="key-left">Left</span>
            <span className="key-right">Right</span>
            <span className="key-arm">Lever</span>
            <span className="key-moment">Moment</span>
            {selection.part === 'upper' && (
              <span className="key-weight">Weight</span>
            )}
          </>
        )}
      </div>
    </section>
  )
}
export function LoadBreakdown({ m }: { m: LoadPath }) {
  return (
    <section className="chain-breakdown">
      <h3>Snow load through the rider</h3>
      <table>
        <caption>Resolved equipment branches</caption>
        <thead>
          <tr>
            <th>At this frame</th>
            {m.feet.map((foot) => (
              <th key={foot.label}>{foot.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(
            [
              ['Snow reaction', 'loadN'],
              ['Binding moment', 'equipment'],
              ['Ankle moment', 'boot'],
              ['Knee moment', 'knee'],
              ['Hip moment', 'hip'],
            ] as const
          ).map(([label, key]) => (
            <tr key={key}>
              <th>{label}</th>
              {m.feet.map((foot, i) => (
                <td key={i}>
                  {key === 'loadN'
                    ? Math.round(foot.loadN) + ' N'
                    : Math.round(foot[key].nm) + ' N·m'}
                </td>
              ))}
            </tr>
          ))}
          {(
            [
              ['Normal to boot sole', 'soleNormal', 'N'],
              ['Shear along sole', 'soleShear', 'N'],
              ['Along shin', 'shinAxial', 'N'],
              ['Across shin', 'shinShear', 'N'],
              ['Shin tilt from sole normal', 'shinTilt', '°'],
            ] as const
          ).map(([label, key, u]) => (
            <tr key={key}>
              <th>{label}</th>
              {m.feet.map((foot, i) => (
                <td key={i}>
                  {Math.round(foot[key])}
                  {u === '°' ? '' : ' '}
                  {u}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="chain-metrics">
        {[
          ['Direct body contact', Math.round(magnitude(m.bodyForce)) + ' N'],
          ['Snow moment at waist', Math.round(m.waistMoment.nm) + ' N·m'],
          ['Upper-body weight moment', Math.round(m.weightMoment.nm) + ' N·m'],
        ].map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>
        A joint’s external moment equals the force times its perpendicular
        distance from the joint. Left and right forces combine at the pelvis.
        The whole-rider snow moment also includes direct body contact during a
        fall. Tangential force is split in proportion to normal support. Force
        components use the orientation of the animated boot sole and shin.
        Moments are the magnitude of the snow force’s turning effect about each
        joint.
      </p>
      <p>
        The upper-body estimate places {m.torso.mass.toFixed(1)} kg in the head,
        trunk and arms of this 75 kg rider. Its weight moment describes gravity
        about the waist. Estimating internal joint loads or boot-cuff pressure
        would require segment dynamics and contact measurements.
      </p>
      <div className="chain-sources">
        <a
          href="https://openstax.org/books/university-physics-volume-1/pages/10-6-torque"
          target="_blank"
          rel="noreferrer"
        >
          Moment arms ↗
        </a>
        <a
          href="https://openstax.org/books/university-physics-volume-1/pages/5-5-newtons-third-law"
          target="_blank"
          rel="noreferrer"
        >
          Contact forces ↗
        </a>
        <a
          href="https://doi.org/10.1016/0021-9290(95)00178-6"
          target="_blank"
          rel="noreferrer"
        >
          Segment masses ↗
        </a>
      </div>
    </section>
  )
}
