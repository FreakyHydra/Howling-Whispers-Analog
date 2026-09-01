import { DRUM_LANES, createDefaultDrumKit, type DrumKit, type DrumLane, type DrumVoiceSettings } from './types'

export class DrumEngine {
  private context?: AudioContext
  private master?: GainNode
  private noiseBuffer?: AudioBuffer
  private readonly kit = createDefaultDrumKit()
  private readonly channels = new Map<DrumLane, { gain: GainNode; pan: StereoPannerNode }>()
  private readonly sources = new Set<AudioScheduledSourceNode>()

  async arm(): Promise<void> {
    this.ensureGraph()
    if (this.context?.state === 'suspended') await this.context.resume()
  }

  get currentTime(): number {
    return this.context?.currentTime ?? 0
  }

  getVoice(lane: DrumLane): DrumVoiceSettings {
    return { ...this.kit[lane] }
  }

  getKit(): DrumKit {
    return Object.fromEntries(
      DRUM_LANES.map((lane) => [lane, { ...this.kit[lane] }]),
    ) as DrumKit
  }

  updateVoice(lane: DrumLane, changes: Partial<DrumVoiceSettings>): void {
    Object.assign(this.kit[lane], changes)
    this.applyMix()
  }

  applyKit(kit: DrumKit): void {
    DRUM_LANES.forEach((lane) => Object.assign(this.kit[lane], kit[lane]))
    this.applyMix()
  }

  async preview(lane: DrumLane): Promise<void> {
    await this.arm()
    this.play(lane, this.currentTime + 0.01, 1)
  }

  play(lane: DrumLane, time: number, velocity = 1): void {
    this.ensureGraph()
    if (!this.isAudible(lane)) return

    if (lane === 'kick') this.kick(time, velocity)
    if (lane === 'snare') this.snare(time, velocity)
    if (lane === 'clap') this.clap(time, velocity)
    if (lane === 'hat') this.hat(time, velocity)
    if (lane === '808') this.bass808(time, velocity)
  }

  panic(): void {
    this.sources.forEach((source) => {
      try { source.stop() } catch { /* source already stopped */ }
    })
    this.sources.clear()
  }

  private ensureGraph(): void {
    if (this.context) return

    const context = new AudioContext({ latencyHint: 'interactive' })
    const master = context.createGain()
    master.gain.value = 0.72
    master.connect(context.destination)

    DRUM_LANES.forEach((lane) => {
      const gain = context.createGain()
      const pan = context.createStereoPanner()
      gain.connect(pan).connect(master)
      this.channels.set(lane, { gain, pan })
    })

    this.context = context
    this.master = master
    this.noiseBuffer = makeNoiseBuffer(context)
    this.applyMix()
  }

  private applyMix(): void {
    if (!this.context) return
    const now = this.context.currentTime
    const anySolo = DRUM_LANES.some((lane) => this.kit[lane].solo)

    DRUM_LANES.forEach((lane) => {
      const voice = this.kit[lane]
      const channel = this.channels.get(lane)
      if (!channel) return
      const enabled = !voice.muted && (!anySolo || voice.solo)
      channel.gain.gain.setTargetAtTime(enabled ? voice.level : 0, now, 0.008)
      channel.pan.pan.setTargetAtTime(voice.pan, now, 0.008)
    })
  }

  private isAudible(lane: DrumLane): boolean {
    const voice = this.kit[lane]
    const anySolo = DRUM_LANES.some((candidate) => this.kit[candidate].solo)
    return !voice.muted && (!anySolo || voice.solo)
  }

  private kick(time: number, velocity: number): void {
    const context = this.context!
    const voice = this.kit.kick
    const oscillator = this.track(context.createOscillator())
    const gain = context.createGain()
    const ratio = pitchRatio(voice.tune)
    const decay = clamp(voice.decay, 0.05, 1.5)
    const start = (95 + voice.tone * 125) * ratio
    const end = (38 + voice.tone * 16) * ratio

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(start, time)
    oscillator.frequency.exponentialRampToValueAtTime(end, time + Math.min(decay * 0.55, 0.22))
    gain.gain.setValueAtTime(Math.max(0.0001, velocity), time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay)

    oscillator.connect(gain).connect(this.channel('kick'))
    oscillator.start(time)
    oscillator.stop(time + decay + 0.03)
  }

  private bass808(time: number, velocity: number): void {
    const context = this.context!
    const voice = this.kit['808']
    const oscillator = this.track(context.createOscillator())
    const gain = context.createGain()
    const shaper = context.createWaveShaper()
    const ratio = pitchRatio(voice.tune)
    const decay = clamp(voice.decay, 0.12, 2.4)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(65.41 * ratio, time)
    oscillator.frequency.exponentialRampToValueAtTime(49 * ratio, time + Math.min(0.22, decay * 0.35))
    gain.gain.setValueAtTime(Math.max(0.0001, velocity), time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay)
    shaper.curve = saturationCurve(voice.tone)
    shaper.oversample = '4x'

    oscillator.connect(shaper).connect(gain).connect(this.channel('808'))
    oscillator.start(time)
    oscillator.stop(time + decay + 0.04)
  }

  private snare(time: number, velocity: number): void {
    const context = this.context!
    const voice = this.kit.snare
    const noise = this.track(context.createBufferSource())
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    const body = this.track(context.createOscillator())
    const bodyGain = context.createGain()
    const decay = clamp(voice.decay, 0.05, 1.2)
    const ratio = pitchRatio(voice.tune)

    noise.buffer = this.noiseBuffer!
    filter.type = 'highpass'
    filter.frequency.value = (650 + voice.tone * 2400) * ratio
    gain.gain.setValueAtTime(0.62 * velocity, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay)

    body.type = 'triangle'
    body.frequency.value = 155 * ratio
    bodyGain.gain.setValueAtTime(0.35 * velocity, time)
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(decay, 0.2))

    noise.connect(filter).connect(gain).connect(this.channel('snare'))
    body.connect(bodyGain).connect(this.channel('snare'))
    noise.start(time)
    noise.stop(time + decay + 0.02)
    body.start(time)
    body.stop(time + Math.min(decay, 0.22) + 0.02)
  }

  private clap(time: number, velocity: number): void {
    const voice = this.kit.clap
    const duration = clamp(voice.decay * 0.42, 0.035, 0.32)
    const cutoff = (850 + voice.tone * 3600) * pitchRatio(voice.tune)
    ;[0, 0.022, 0.045].forEach((offset, index) => {
      this.noiseBurst('clap', time + offset, duration, cutoff, velocity * (0.46 - index * 0.06))
    })
  }

  private hat(time: number, velocity: number): void {
    const voice = this.kit.hat
    const duration = clamp(voice.decay, 0.025, 0.6)
    const cutoff = (3600 + voice.tone * 7800) * pitchRatio(voice.tune)
    this.noiseBurst('hat', time, duration, cutoff, velocity * 0.55)
  }

  private noiseBurst(lane: DrumLane, time: number, duration: number, cutoff: number, level: number): void {
    const context = this.context!
    const source = this.track(context.createBufferSource())
    const filter = context.createBiquadFilter()
    const gain = context.createGain()

    source.buffer = this.noiseBuffer!
    filter.type = 'highpass'
    filter.frequency.value = clamp(cutoff, 120, context.sampleRate * 0.45)
    gain.gain.setValueAtTime(Math.max(0.0001, level), time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

    source.connect(filter).connect(gain).connect(this.channel(lane))
    source.start(time)
    source.stop(time + duration + 0.015)
  }

  private channel(lane: DrumLane): GainNode {
    const channel = this.channels.get(lane)
    if (!channel) throw new Error(`Missing drum channel: ${lane}`)
    return channel.gain
  }

  private track<T extends AudioScheduledSourceNode>(source: T): T {
    this.sources.add(source)
    source.addEventListener('ended', () => this.sources.delete(source), { once: true })
    return source
  }
}

function makeNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  return buffer
}

function pitchRatio(semitones: number): number {
  return 2 ** (semitones / 12)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function saturationCurve(tone: number): Float32Array {
  const curve = new Float32Array(512)
  const drive = 1 + clamp(tone, 0, 1) * 16
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i * 2) / (curve.length - 1) - 1
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive)
  }
  return curve
}
