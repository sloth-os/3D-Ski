import * as THREE from 'three'

const ink = '#18252b'
function deckArt(board: boolean, side: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 1024
  const g = canvas.getContext('2d')!
  g.fillStyle = ink
  g.fillRect(0, 0, 256, 1024)
  g.fillStyle = board ? '#d9eee3' : '#d6f29b'
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(256, 0)
  g.lineTo(256, board ? 320 : 260)
  g.lineTo(0, 380)
  g.fill()
  g.fillStyle = '#687e77'
  g.beginPath()
  g.moveTo(0, 320)
  g.lineTo(256, 212)
  g.lineTo(256, 225)
  g.lineTo(0, 333)
  g.fill()
  g.strokeStyle = '#879e91'
  g.lineWidth = 1.8
  for (let i = 0; i < 22; i++) {
    g.beginPath()
    g.moveTo(-30, 450 + i * 19)
    g.bezierCurveTo(95, 420 + i * 19, 115, 555 + i * 19, 280, 480 + i * 19)
    g.stroke()
  }
  g.fillStyle = '#d8f88c'
  g.fillRect(0, 864, 256, 30)
  g.fillStyle = '#e5efed'
  g.save()
  g.translate(143, 814)
  g.rotate(-Math.PI / 2)
  g.font = 'italic bold 43px sans-serif'
  g.fillText('FALLLINE', 0, 0)
  g.restore()
  if (side < 0) {
    g.fillStyle = '#fa8257'
    g.fillRect(0, 844, 256, 7)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
// Longitudinal sections preserve the waist, steel edges, raised tail and curved shovel in close-up.
export function makeDeck(board: boolean, side: number) {
  const segments = 70,
    positions: number[] = [],
    uv: number[] = [],
    idx: number[] = []
  const width = board ? 0.152 : 0.066,
    length = board ? 1.59 : 1.86
  for (let i = 0; i <= segments; i++) {
    const t = i / segments,
      z = (t - 0.52) * length,
      tip = Math.min(t, 1 - t)
    const radius = board ? 0.105 : 0.052
    const round =
      tip < radius ? Math.sqrt(Math.max(0.001, 1 - (1 - tip / radius) ** 2)) : 1
    const w = width * (0.73 + 0.27 * Math.cos(t * Math.PI) ** 2) * round
    const rise =
      Math.max(0, (0.13 - t) / 0.13) ** 2 * (board ? 0.081 : 0.1) +
      Math.max(0, (t - 0.915) / 0.085) ** 2 * 0.054
    for (const [x, y] of [
      [-w, rise],
      [w, rise],
      [-w, rise - 0.016],
      [w, rise - 0.016],
    ]) {
      positions.push(x, y, z)
      uv.push(x < 0 ? 0 : 1, 1 - t)
    }
    if (i < segments) {
      const a = i * 4
      idx.push(a, a + 4, a + 1, a + 1, a + 4, a + 5)
    }
  }
  const top = idx.length
  for (let i = 0; i < segments; i++) {
    const a = i * 4
    idx.push(
      a + 2,
      a + 3,
      a + 6,
      a + 3,
      a + 7,
      a + 6,
      a,
      a + 2,
      a + 4,
      a + 2,
      a + 6,
      a + 4,
      a + 1,
      a + 5,
      a + 3,
      a + 3,
      a + 5,
      a + 7,
    )
  }
  const geom = new THREE.BufferGeometry()
  geom.setIndex(idx)
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geom.computeVertexNormals()
  geom.addGroup(0, top, 0)
  geom.addGroup(top, idx.length - top, 1)
  const mesh = new THREE.Mesh(geom, [
    new THREE.MeshStandardMaterial({
      map: deckArt(board, side),
      roughness: 0.37,
      metalness: 0.13,
      side: THREE.DoubleSide,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x53616b,
      metalness: 0.74,
      roughness: 0.29,
      side: THREE.DoubleSide,
    }),
  ])
  mesh.castShadow = true
  return mesh
}

// Spread the relative foot roll along the deck, with constant tilt outside the bindings.
export function flexDeck(mesh: ReturnType<typeof makeDeck>) {
  const geometry = mesh.geometry,
    vertices = geometry.getAttribute('position')
  const rest = Float32Array.from(vertices.array)
  let previous = 0
  return (torsion: number) => {
    if (torsion === previous) return
    previous = torsion
    for (let i = 0; i < vertices.count; i++) {
      const x = rest[i * 3],
        y = rest[i * 3 + 1],
        z = rest[i * 3 + 2]
      const a = torsion * Math.max(-1, Math.min(1, z / 0.28))
      vertices.setXY(
        i,
        x * Math.cos(a) - y * Math.sin(a),
        x * Math.sin(a) + y * Math.cos(a),
      )
    }
    vertices.needsUpdate = true
    geometry.computeVertexNormals()
  }
}
