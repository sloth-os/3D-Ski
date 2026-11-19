import { useEffect, useRef, useState } from 'react'
import { Camera, Pause, Play, RotateCcw } from 'lucide-react'
import { idealTurn, type Lens } from './analysis.ts'
import type { Setup } from './course.ts'
import type { MountainView } from './mountain.ts'
import { canvasMountain } from './scene/canvas.ts'
import { clamp } from './physics.ts'

export function PoseStudy({
  setup,
  angle,
  speed,
}: {
  setup: Setup
  angle: number
  speed: number
}) {
  const mount = useRef<HTMLDivElement>(null),
    orbit = useRef(-0.25),
    pointer = useRef<{ id: number; x: number } | null>(null)
  const [playing, setPlaying] = useState(false),
    [lens, setLens] = useState<Lens>('body'),
    [closeUp, setCloseUp] = useState(false)
  const phase = useRef(0),
    refresh = useRef(true),
    config = useRef({ angle, speed, playing, lens, closeUp })
  config.current = { angle, speed, playing, lens, closeUp }
  useEffect(() => {
    refresh.current = true
  }, [angle, speed, lens, playing, closeUp])
  useEffect(() => {
    const host = mount.current!
    let dead = false,
      raf = 0,
      view: MountainView | undefined,
      last = 0
    refresh.current = true
    phase.current = 0
    const resize = new ResizeObserver(() => {
      refresh.current = true
    })
    resize.observe(host)
    async function boot() {
      const create = await import('./mountain.ts').then(
        (m) => m.createMountain,
        () => canvasMountain,
      )
      if (dead) return
      view = create(host, setup, true)
      function draw(now: number) {
        if (dead) return
        const opt = config.current
        if (
          !document.hidden &&
          (refresh.current || (opt.playing && now - last >= 30))
        ) {
          if (opt.playing && last)
            phase.current += 1.2 * clamp((now - last) / 1000, 0, 0.08)
          const f = idealTurn(setup, opt.angle, opt.speed, phase.current)
          view!.draw(f, {
            camera: opt.closeUp ? 'edge' : 'side',
            lens: opt.lens,
            forces: true,
            line: false,
            orbit: orbit.current,
            tilt: 0.045,
            zoom: opt.closeUp ? 1.05 : 0.75,
            preview: false,
            reduced: true,
          })
          refresh.current = false
          last = now
        }
        raf = requestAnimationFrame(draw)
      }
      raf = requestAnimationFrame(draw)
    }
    void boot()
    return () => {
      dead = true
      resize.disconnect()
      cancelAnimationFrame(raf)
      view?.dispose()
    }
  }, [setup])
  return (
    <div className="pose-study">
      <div
        className="study-surface"
        ref={mount}
        role="img"
        aria-label="Interactive 3D rider showing the selected edge angle and body position. Drag to orbit."
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          pointer.current = { id: e.pointerId, x: e.clientX }
        }}
        onPointerMove={(e) => {
          const d = pointer.current
          if (d && d.id === e.pointerId) {
            orbit.current += (e.clientX - d.x) * 0.008
            d.x = e.clientX
            refresh.current = true
          }
        }}
        onLostPointerCapture={() => (pointer.current = null)}
      />
      <div className="study-tools">
        <button
          onClick={() => {
            orbit.current = -0.25
            phase.current = 0
            refresh.current = true
          }}
          aria-label="Reset study view"
        >
          <RotateCcw size={13} />
        </button>
        <button
          aria-label={closeUp ? 'Show whole rider' : 'Show edge close-up'}
          onClick={() => setCloseUp(!closeUp)}
        >
          <Camera size={14} />
        </button>
      </div>
      <div className="study-foot">
        <button
          onClick={() => {
            if (!playing) phase.current = 0
            setPlaying(!playing)
          }}
        >
          {playing ? <Pause size={12} /> : <Play size={12} />}{' '}
          {playing ? 'Hold pose' : 'Link turns'}
        </button>
        <select
          aria-label="3D study layer"
          value={lens}
          onChange={(e) => setLens(e.target.value as Lens)}
        >
          <option value="body">Body joints</option>
          <option value="contact">Snow contact</option>
          <option value="forces">Force vectors</option>
        </select>
      </div>
    </div>
  )
}
