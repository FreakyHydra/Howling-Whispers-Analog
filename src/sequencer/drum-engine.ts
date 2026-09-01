import { createSafetyChain, type SafetyChain } from '../audio/safety'
import { scheduleDrumHit } from '../audio/schedule'
import { DRUM_LANES, createDefaultDrumKit, type DrumKit, type DrumLane, type DrumVoiceSettings } from './types'

export class DrumEngine {
  private context?: AudioContext
  private master?: GainNode
  private safety?: SafetyChain
  private openHatBus?: GainNode
  private readonly kit = createDefaultDrumKit()
  private readonly channels = new Map<DrumLane, GainNode>()
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

    if (lane === 'hat') this.chokeOpenHat(time)

    scheduleDrumHit(
      this.context!,
      this.channel(lane),
      lane,
      this.kit[lane],
      time,
      velocity,
      (source) => this.track(source),
    )
  }

  panic(): void {
    this.sources.forEach((source) => {
      try { source.stop() } catch { /* source already stopped */ }
    })
    this.sources.clear()
    if (this.context && this.openHatBus) {
      const now = this.context.currentTime
      this.openHatBus.gain.cancelScheduledValues(now)
      this.openHatBus.gain.setValueAtTime(1, now)
    }
  }

  private ensureGraph(): void {
    if (this.context) return

    const context = new AudioContext({ latencyHint: 'interactive' })
    const master = context.createGain()
    const safety = createSafetyChain(context, context.destination)
    const openHatBus = context.createGain()

    master.gain.value = 0.78
    openHatBus.gain.value = 1
    master.connect(safety.input)
    openHatBus.connect(master)

    DRUM_LANES.forEach((lane) => {
      const gain = context.createGain()
      if (lane === 'openHat') gain.connect(openHatBus)
      else gain.connect(master)
      this.channels.set(lane, gain)
    })

    this.context = context
    this.master = master
    this.safety = safety
    this.openHatBus = openHatBus
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
      channel.gain.setTargetAtTime(enabled ? 1 : 0, now, 0.008)
    })
  }

  private isAudible(lane: DrumLane): boolean {
    const voice = this.kit[lane]
    const anySolo = DRUM_LANES.some((candidate) => this.kit[candidate].solo)
    return !voice.muted && (!anySolo || voice.solo)
  }

  private chokeOpenHat(time: number): void {
    if (!this.openHatBus) return
    const gain = this.openHatBus.gain
    gain.cancelScheduledValues(time)
    gain.setValueAtTime(Math.max(0.0001, gain.value), time)
    gain.exponentialRampToValueAtTime(0.0001, time + 0.012)
    gain.setValueAtTime(1, time + 0.025)
  }

  private channel(lane: DrumLane): GainNode {
    const channel = this.channels.get(lane)
    if (!channel) throw new Error(`Missing drum channel: ${lane}`)
    return channel
  }

  private track<T extends AudioScheduledSourceNode>(source: T): T {
    this.sources.add(source)
    source.addEventListener('ended', () => this.sources.delete(source), { once: true })
    return source
  }
}
