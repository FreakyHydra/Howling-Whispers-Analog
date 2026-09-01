import { analogAudio } from '../audio/runtime'
import { scheduleSynthNote } from '../audio/schedule'
import type { AnalogPatch } from '../patch'
import type { SynthStep } from '../loops/types'

export class SynthSequenceEngine {
  private context?: AudioContext
  private master?: GainNode
  private readonly sources = new Set<AudioScheduledSourceNode>()

  async arm(): Promise<void> {
    this.ensureGraph()
    await analogAudio.arm()
  }

  get currentTime(): number {
    return analogAudio.currentTime
  }

  play(patch: AnalogPatch, step: SynthStep, time: number, duration: number, previousMidi?: number): void {
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
      previousMidi,
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
    const context = analogAudio.getContext()
    const master = context.createGain()

    master.gain.value = 0.7
    master.connect(analogAudio.getInput())

    this.context = context
    this.master = master
  }

  private track<T extends AudioScheduledSourceNode>(source: T): T {
    this.sources.add(source)
    source.addEventListener('ended', () => this.sources.delete(source), { once: true })
    return source
  }
}
