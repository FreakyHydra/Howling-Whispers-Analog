import type { AnalogPatch } from '../patch'
import { cloneSynthState, type SynthLoopState, type SynthStep } from '../loops/types'
import type { MasterTransport } from '../transport/transport'
import type { PatternLength } from '../sequencer/types'
import { SynthSequenceEngine } from './engine'

export class MelodicSequencer {
  readonly engine = new SynthSequenceEngine()
  steps: SynthStep[] = Array.from({ length: 16 }, () => null)
  length: PatternLength = 16
  onStep?: (step: number) => void
  onChange?: () => void

  constructor(
    private readonly transport: MasterTransport,
    private readonly getPatch: () => AnalogPatch,
  ) {
    transport.register({
      id: 'melodic',
      length: () => this.length,
      schedule: (step, time, duration) => this.scheduleStep(step, time, duration),
      visual: (step) => this.onStep?.(step),
      stop: () => this.onStep?.(-1),
    })
  }

  get playing(): boolean { return this.transport.playing && this.transport.isClientActive('melodic') }

  async start(): Promise<void> {
    await this.engine.arm()
    this.transport.setClientActive('melodic', true)
    if (!this.transport.playing) await this.transport.play()
  }

  stop(): void {
    this.transport.setClientActive('melodic', false)
  }

  panic(): void {
    this.stop()
    this.engine.panic()
  }

  toggle(index: number): SynthStep {
    if (index < 0 || index >= this.length) return null
    const current = this.steps[index]
    this.steps[index] = current ? null : { midi: 48, velocity: 0.8, gate: 0.82 }
    this.changed()
    return this.steps[index]
  }

  update(index: number, changes: Partial<Exclude<SynthStep, null>>): SynthStep {
    if (index < 0 || index >= this.length) return null
    const current = this.steps[index] ?? { midi: 48, velocity: 0.8, gate: 0.82 }
    const next = {
      midi: clamp(Math.round(changes.midi ?? current.midi), 24, 96),
      velocity: clamp(changes.velocity ?? current.velocity, 0.05, 1),
      gate: clamp(changes.gate ?? current.gate, 0.08, 1.8),
      accent: changes.accent ?? current.accent,
      slide: changes.slide ?? current.slide,
    }
    this.steps[index] = next
    this.changed()
    return next
  }

  assignNote(index: number, midi: number): SynthStep {
    return this.update(index, { midi })
  }

  clear(): void {
    this.steps = Array.from({ length: this.length }, () => null)
    this.changed()
  }

  setLength(value: number): void {
    const next = normalizeLength(value)
    if (next === this.length) return
    const previous = this.steps
    this.length = next
    this.steps = Array.from({ length: next }, (_, index) => previous[index] ? { ...previous[index]! } : null)
    this.changed()
  }

  loadBassStarter(): void {
    this.steps = Array.from({ length: this.length }, () => null)
    for (let offset = 0; offset < this.length; offset += 16) {
      const notes = new Map([[0, 36], [3, 36], [6, 43], [8, 39], [11, 34], [14, 36]])
      notes.forEach((midi, index) => {
        const target = offset + index
        if (target >= this.length) return
        this.steps[target] = { midi, velocity: index === 0 ? 1 : 0.78, gate: index === 14 ? 1.35 : 0.82 }
      })
    }
    this.changed()
  }

  getState(patch: AnalogPatch, bpm: number, swing: number): SynthLoopState {
    return cloneSynthState({
      bpm: clamp(Math.round(bpm), 40, 220),
      swing: clamp(swing, 0, 0.4),
      length: this.length,
      steps: this.steps,
      patch,
    })
  }

  loadState(state: SynthLoopState): void {
    const copy = cloneSynthState(state)
    this.length = normalizeLength(copy.length)
    this.steps = copy.steps
    this.transport.setBpm(copy.bpm)
    this.transport.setSwing(copy.swing)
    this.changed()
  }

  private changed(): void {
    this.onChange?.()
  }

  private scheduleStep(index: number, time: number, duration: number): void {
    const step = this.steps[index]
    if (!step) return
    const gate = duration * step.gate
    this.engine.play(this.getPatch(), step, time, gate, previousMidi(this.steps, index, this.length))
  }
}

function previousMidi(steps: SynthStep[], index: number, length: number): number | undefined {
  for (let offset = 1; offset <= length; offset += 1) {
    const candidate = steps[(index - offset + length) % length]
    if (candidate) return candidate.midi
  }
  return undefined
}

function normalizeLength(value: number): PatternLength {
  if (value <= 8) return 8
  if (value <= 16) return 16
  if (value <= 32) return 32
  return 64
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
