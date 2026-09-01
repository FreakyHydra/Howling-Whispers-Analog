import type { AnalogPatch } from '../patch'
import { cloneSynthState, SYNTH_STEP_COUNT, type SynthLoopState, type SynthStep } from '../loops/types'
import { SynthSequenceEngine } from './engine'

const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_SECONDS = 0.1

export class MelodicSequencer {
  readonly engine = new SynthSequenceEngine()
  steps: SynthStep[] = Array.from({ length: SYNTH_STEP_COUNT }, () => null)
  playing = false
  onStep?: (step: number) => void
  onChange?: () => void

  private step = 0
  private nextStepTime = 0
  private timer?: number
  private visualTimers = new Set<number>()
  private patch?: AnalogPatch
  private bpm = 140
  private swing = 0.12

  async start(patch: AnalogPatch, bpm: number, swing: number): Promise<void> {
    if (this.playing) return
    await this.engine.arm()
    this.patch = structuredClone(patch)
    this.bpm = clamp(Math.round(bpm), 40, 220)
    this.swing = clamp(swing, 0, 0.4)
    this.playing = true
    this.step = 0
    this.nextStepTime = this.engine.currentTime + 0.05
    this.schedule()
    this.timer = window.setInterval(() => this.schedule(), LOOKAHEAD_MS)
  }

  stop(): void {
    this.playing = false
    if (this.timer !== undefined) window.clearInterval(this.timer)
    this.timer = undefined
    this.visualTimers.forEach((timer) => window.clearTimeout(timer))
    this.visualTimers.clear()
    this.onStep?.(-1)
  }

  panic(): void {
    this.stop()
    this.engine.panic()
  }

  toggle(index: number): SynthStep {
    const current = this.steps[index]
    this.steps[index] = current ? null : { midi: 48, velocity: 0.8, gate: 0.82 }
    this.changed()
    return this.steps[index]
  }

  update(index: number, changes: Partial<Exclude<SynthStep, null>>): SynthStep {
    const current = this.steps[index] ?? { midi: 48, velocity: 0.8, gate: 0.82 }
    const next = {
      midi: clamp(Math.round(changes.midi ?? current.midi), 24, 96),
      velocity: clamp(changes.velocity ?? current.velocity, 0.05, 1),
      gate: clamp(changes.gate ?? current.gate, 0.08, 1.8),
    }
    this.steps[index] = next
    this.changed()
    return next
  }

  clear(): void {
    this.steps = Array.from({ length: SYNTH_STEP_COUNT }, () => null)
    this.changed()
  }

  loadBassStarter(): void {
    this.steps = Array.from({ length: SYNTH_STEP_COUNT }, () => null)
    const notes = new Map([[0, 36], [3, 36], [6, 43], [8, 39], [11, 34], [14, 36]])
    notes.forEach((midi, index) => {
      this.steps[index] = { midi, velocity: index === 0 ? 1 : 0.78, gate: index === 14 ? 1.35 : 0.82 }
    })
    this.changed()
  }

  getState(patch: AnalogPatch, bpm: number, swing: number): SynthLoopState {
    return cloneSynthState({
      bpm: clamp(Math.round(bpm), 40, 220),
      swing: clamp(swing, 0, 0.4),
      steps: this.steps,
      patch,
    })
  }

  loadState(state: SynthLoopState): void {
    const copy = cloneSynthState(state)
    this.steps = copy.steps
    this.changed()
  }

  private changed(): void {
    this.onChange?.()
  }

  private schedule(): void {
    if (!this.playing || !this.patch) return

    while (this.nextStepTime < this.engine.currentTime + SCHEDULE_AHEAD_SECONDS) {
      const index = this.step
      const step = this.steps[index]
      const stepLength = this.stepLength(index)
      if (step) this.engine.play(this.patch, step, this.nextStepTime, stepLength * step.gate)

      const delay = Math.max(0, (this.nextStepTime - this.engine.currentTime) * 1000)
      const timer = window.setTimeout(() => {
        this.visualTimers.delete(timer)
        if (this.playing) this.onStep?.(index)
      }, delay)
      this.visualTimers.add(timer)

      this.nextStepTime += stepLength
      this.step = (this.step + 1) % SYNTH_STEP_COUNT
    }
  }

  private stepLength(index: number): number {
    const base = 60 / this.bpm / 4
    const swingOffset = index % 2 === 0 ? this.swing : -this.swing
    return base * (1 + swingOffset)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
