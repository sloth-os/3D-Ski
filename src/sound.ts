export class SkiSound {
  private context: AudioContext | null = null
  private wind: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  enable() {
    if (!window.AudioContext) return
    if (!this.context) {
      const ctx = new AudioContext()
      this.context = ctx
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      const noise = ctx.createBufferSource()
      noise.buffer = buffer
      noise.loop = true
      this.filter = ctx.createBiquadFilter()
      this.filter.type = 'lowpass'
      this.filter.frequency.value = 400
      this.wind = ctx.createGain()
      this.wind.gain.value = 0
      noise.connect(this.filter).connect(this.wind).connect(ctx.destination)
      noise.start()
    }
    void this.context.resume().catch(() => {})
  }
  update(speed: number, edge: number, playing: boolean) {
    if (!this.context || !this.wind || !this.filter) return
    const now = this.context.currentTime
    this.wind.gain.setTargetAtTime(
      playing ? 0.014 + Math.min(speed / 180, 0.12) : 0,
      now,
      0.16,
    )
    this.filter.frequency.setTargetAtTime(
      350 + speed * 24 + Math.abs(edge) * 14,
      now,
      0.15,
    )
  }
  gate() {
    if (!this.context) return
    const ctx = this.context,
      osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      t = ctx.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(690, t)
    osc.frequency.exponentialRampToValueAtTime(1010, t + 0.1)
    gain.gain.setValueAtTime(0.045, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.23)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(t + 0.24)
  }
}
