import { createSafetyChain, type SafetyChain } from '../audio/safety'
import { scheduleSynthNote } from '../audio/schedule'
import type { AnalogPatch } from '../patch'
import type { SynthStep } from '../loops/types'

export class SynthSequenceEngine {
  private context?: AudioContext
  private master?: GainNode
  private safety?: SafetyChain
  private readonly sources = new Set<AudioScheduledSourceNode>()

  async arm(): Promise<void> {
    this.ensureGraph()
    if (this.context?.state === 'suspended') await this.context.resume()
  }

  get currentTime(): number {
    return this.context?.currentTime ?? 0
  }

  play(patch: AnalogPatch, step: SynthStep, time: number, duration: number): void {
    if (!step) return
    this.ensureGraph()
    scheduleSynthNote(
      this.context!,
      this.master!,
      patch,
      step,
      time,
      duration,
      (source) => this.track(source),
    )
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
    const safety = createSafetyChain(context, context.destination)

    master.gain.value = 0.7
    master.connect(safety.input)

    this.context = context
    this.master = master
    this.safety = safety
  }

  private track<T extends AudioScheduledSourceNode>(source: T): T {
    this.sources.add(source)
    source.addEventListener('ended', () => this.sources.delete(source), { once: true })
    return source
  }
}
