import { analogAudio } from '../audio/runtime'

export type ChipMode = '8' | '16' | '32'
export type ChipWave = 'pulse' | 'square' | 'triangle'

export type ChipSettings = {
  mode: ChipMode
  wave: ChipWave
  duty: number
  level: number
  vibratoRate: number
  vibratoDepth: number
  glide: number
}

export type ChipStep = {
  midi: number
  gate: number
  slide: boolean
  vibrato: boolean
} | null

export const DEFAULT_CHIP_SETTINGS: ChipSettings = {
  mode: '8',
  wave: 'pulse',
  duty: 0.25,
  level: 0.46,
  vibratoRate: 7.2,
  vibratoDepth: 18,
  glide: 0.055,
}

export class ChipEngine {
  private context?: AudioContext
  private bus?: GainNode
  private readonly sources = new Set<AudioScheduledSourceNode>()

  async arm(): Promise<void> {
    this.ensureGraph()
    await analogAudio.arm()
  }

  get currentTime(): number { return analogAudio.currentTime }

  play(settings: ChipSettings, step: ChipStep, time: number, duration: number, previousMidi?: number): void {
    if (!step) return
    this.ensureGraph()
    const context = this.context!
    const bus = this.bus!
    const oscillator = this.track(context.createOscillator())
    const gain = context.createGain()
    const end = time + Math.max(0.03, duration)
    const frequency = midiToFrequency(step.midi)
    const startFrequency = previousMidi === undefined ? frequency : midiToFrequency(previousMidi)

    applyWave(context, oscillator, settings)
    oscillator.frequency.setValueAtTime(step.slide ? startFrequency : frequency, time)
    if (step.slide && previousMidi !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(frequency, time + Math.min(settings.glide, duration * 0.65))
    }

    const level = settings.level * modeGain(settings.mode)
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.linearRampToValueAtTime(level, time + 0.003)
    gain.gain.setValueAtTime(level, Math.max(time + 0.004, end - 0.012))
    gain.gain.exponentialRampToValueAtTime(0.0001, end)

    oscillator.connect(gain).connect(bus)

    if (step.vibrato && settings.vibratoDepth > 0) {
      const lfo = this.track(context.createOscillator())
      const depth = context.createGain()
      lfo.frequency.setValueAtTime(settings.vibratoRate, time)
      depth.gain.setValueAtTime(settings.vibratoDepth, time)
      lfo.connect(depth).connect(oscillator.detune)
      lfo.start(time)
      lfo.stop(end + 0.02)
    }

    if (settings.mode === '16') this.addHarmonic(settings, step, time, end, frequency, gain)
    if (settings.mode === '32') this.addAir(settings, time, end, frequency, gain)

    oscillator.start(time)
    oscillator.stop(end + 0.02)
  }

  panic(): void {
    this.sources.forEach((source) => {
      try { source.stop() } catch { /* already stopped */ }
    })
    this.sources.clear()
  }

  private addHarmonic(settings: ChipSettings, step: Exclude<ChipStep, null>, time: number, end: number, frequency: number, destination: GainNode): void {
    const context = this.context!
    const harmonic = this.track(context.createOscillator())
    const gain = context.createGain()
    harmonic.type = 'sine'
    harmonic.frequency.setValueAtTime(frequency * 2, time)
    harmonic.detune.value = step.vibrato ? 5 : 0
    gain.gain.setValueAtTime(settings.level * 0.16, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    harmonic.connect(gain).connect(destination)
    harmonic.start(time)
    harmonic.stop(end + 0.02)
  }

  private addAir(settings: ChipSettings, time: number, end: number, frequency: number, destination: GainNode): void {
    const context = this.context!
    const air = this.track(context.createOscillator())
    const gain = context.createGain()
    air.type = 'triangle'
    air.frequency.setValueAtTime(frequency * 0.5, time)
    gain.gain.setValueAtTime(settings.level * 0.12, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    air.connect(gain).connect(destination)
    air.start(time)
    air.stop(end + 0.02)
  }

  private ensureGraph(): void {
    if (this.context) return
    const context = analogAudio.getContext()
    const bus = context.createGain()
    bus.gain.value = 0.72
    bus.connect(analogAudio.getInput())
    this.context = context
    this.bus = bus
  }

  private track<T extends AudioScheduledSourceNode>(source: T): T {
    this.sources.add(source)
    source.addEventListener('ended', () => this.sources.delete(source), { once: true })
    return source
  }
}

function applyWave(context: AudioContext, oscillator: OscillatorNode, settings: ChipSettings): void {
  if (settings.wave === 'triangle') {
    oscillator.type = 'triangle'
    return
  }
  if (settings.wave === 'square' || Math.abs(settings.duty - 0.5) < 0.01) {
    oscillator.type = 'square'
    return
  }
  oscillator.setPeriodicWave(pulseWave(context, settings.duty))
}

function pulseWave(context: AudioContext, duty: number): PeriodicWave {
  const harmonics = 48
  const real: Float32Array<ArrayBuffer> = new Float32Array(
    new ArrayBuffer((harmonics + 1) * Float32Array.BYTES_PER_ELEMENT),
  )
  const imag: Float32Array<ArrayBuffer> = new Float32Array(
    new ArrayBuffer((harmonics + 1) * Float32Array.BYTES_PER_ELEMENT),
  )
  const d = Math.min(0.875, Math.max(0.125, duty))
  real[0] = 2 * d - 1
  for (let n = 1; n <= harmonics; n += 1) {
    real[n] = (2 * Math.sin(Math.PI * n * d) * Math.cos(Math.PI * n * d)) / (Math.PI * n)
    imag[n] = (2 * Math.sin(Math.PI * n * d) ** 2) / (Math.PI * n)
  }
  return context.createPeriodicWave(real, imag, { disableNormalization: false })
}

function modeGain(mode: ChipMode): number {
  if (mode === '8') return 0.9
  if (mode === '16') return 0.78
  return 0.7
}

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}
