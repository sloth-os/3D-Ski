import { useState } from 'react'
import { ExternalLink, RotateCcw } from 'lucide-react'
import { equipmentFor, techniques, type Setup } from './course.ts'
import { SchemeTabs } from './UI.tsx'
import { PoseStudy } from './PoseStudy.tsx'

export function SwitchStudy({
  setup,
  id,
}: {
  setup: Setup
  id: 'boardSwitch' | 'skiSwitch'
}) {
  const [stance, setStance] = useState<'forward' | 'switch'>('switch'),
    [edge, setEdge] = useState(24)
  const switched = stance === 'switch',
    board = equipmentFor(id) === 'snowboard'
  return (
    <section className="panel experiment trick-study switch-study">
      <h2>
        <RotateCcw size={18} />
        Switch turn study
      </h2>
      <SchemeTabs
        label="Compare riding stance"
        value={stance}
        onChange={setStance}
        items={[
          { id: 'forward', name: board ? 'Regular' : 'Forward' },
          { id: 'switch', name: 'Switch' },
        ]}
      />
      <div className="replay-scene">
        <PoseStudy setup={setup} angle={edge} speed={24} switched={switched} />
      </div>
      <div className="range-field">
        <label htmlFor="switch-edge">
          Steer through the turn{' '}
          <strong>
            {edge === 0
              ? 'Flat'
              : (edge < 0 ? 'Left ' : 'Right ') + Math.abs(edge) + '°'}
          </strong>
        </label>
        <input
          id="switch-edge"
          type="range"
          min={-42}
          max={42}
          value={edge}
          onChange={(e) => setEdge(+e.target.value)}
        />
      </div>
      <p className="fine-print">
        The turquoise arrow shows downhill travel. Drag to orbit or choose Link
        turns to watch the rider change edges.
      </p>
      <a
        className="trick-source"
        href={techniques[id].source}
        target="_blank"
        rel="noreferrer"
      >
        {board ? 'Snowboard Addiction' : 'Ski Addiction'} · Switch technique{' '}
        <ExternalLink size={12} />
      </a>
    </section>
  )
}
