import type { DrumLane } from './types'

export class DrumEngine {
  private context?: AudioContext
  private master?: GainNode
  private noiseBuffer?: AudioBuffer

  async arm(): Promise<void> {
    this.ensureGraph()
    if (this.context?.state === 'suspended') await this.context.resume()
  }

  get currentTime(): number {
    return this.context?.currentTime ?? 0
  }

  play(lane: DrumLane, time: number): void {
    this.ensureGraph()

    if (lane === 'kick') this.kick(time)
    if (lane === 'snare') this.snare(time)
    if (lane === 'clap') this.clap(time)
    if (lane === 'hat') this.hat(time)
    if (lane === '808') this.bass808(time)
  }

  private ensureGraph(): void {
    if (this.context) return

    const context = new AudioContext({ latencyHint: 'interactive' })
    const master = context.createGain()
    master.gain.value = 0.55
    master.connect(context.destination)

    this.context = context
    this.master = master
    this.noiseBuffer = makeNoiseBuffer(context)
  }

  private kick(time: number): void {
    const context = this.context!
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(145, time)
    oscillator.frequency.exponentialRampToValueAtTime(48, time + 0.16)
    gain.gain.setValueAtTime(0.92, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.34)

    oscillator.connect(gain).connect(this.master!)
    oscillator.start(time)
    oscillator.stop(time + 0.36)
  }

  private bass808(time: number): void {
    const context = this.context!
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(72, time)
    oscillator.frequency.exponentialRampToValueAtTime(43, time + 0.24)
    gain.gain.setValueAtTime(0.72, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.92)

    oscillator.connect(gain).connect(this.master!)
    oscillator.start(time)
    oscillator.stop(time + 0.95)
  }

  private snare(time: number): void {
    const context = this.context!
    const noise = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    const body = context.createOscillator()
    const bodyGain = context.createGain()

    noise.buffer = this.noiseBuffer!
    filter.type = 'highpass'
    filter.frequency.value = 1100
    gain.gain.setValueAtTime(0.44, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18)

    body.type = 'triangle'
    body.frequency.value = 185
    bodyGain.gain.setValueAtTime(0.25, time)
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12)

    noise.connect(filter).connect(gain).connect(this.master!)
    body.connect(bodyGain).connect(this.master!)
    noise.start(time)
    noise.stop(time + 0.2)
    body.start(time)
    body.stop(time + 0.14)
  }

  private clap(time: number): void {
    ;[0, 0.022, 0.045].forEach((offset) => this.noiseBurst(time + offset, 0.075, 1500, 0.28))
  }

  private hat(time: number): void {
    this.noiseBurst(time, 0.055, 7200, 0.2)
  }

  private noiseBurst(time: number, duration: number, cutoff: number, level: number): void {
    const context = this.context!
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()

    source.buffer = this.noiseBuffer!
    filter.type = 'highpass'
    filter.frequency.value = cutoff
    gain.gain.setValueAtTime(level, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

    source.connect(filter).connect(gain).connect(this.master!)
    source.start(time)
    source.stop(time + duration + 0.01)
  }
}

function makeNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  return buffer
}
