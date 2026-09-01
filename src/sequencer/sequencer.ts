import { cloneDrumState, type DrumLoopState } from '../loops/types'
import { DrumEngine } from './drum-engine'
import {
  ACCENT_VELOCITY,
  DRUM_LANES,
  NORMAL_VELOCITY,
  STEP_COUNT,
  emptyPattern,
  trapStarterPattern,
  type BeatPattern,
  type DrumLane,
  type DrumVoiceSettings,
} from './types'

const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_SECONDS = 0.1

export class BeatSequencer {
  readonly engine = new DrumEngine()
  pattern: BeatPattern = emptyPattern()
  bpm = 140
  swing = 0.12
  playing = false
  onStep?: (step: number) => void
  onChange?: () => void

  private step = 0
  private nextStepTime = 0
  private timer?: number
  private visualTimers = new Set<number>()

  async start(): Promise<void> {
    if (this.playing) return
    await this.engine.arm()
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

  toggle(lane: DrumLane, step: number): number {
    const next = this.pattern[lane][step] > 0 ? 0 : NORMAL_VELOCITY
    this.pattern[lane][step] = next
    this.changed()
    return next
  }

  toggleAccent(lane: DrumLane, step: number): number {
    const current = this.pattern[lane][step]
    const next = current >= ACCENT_VELOCITY ? NORMAL_VELOCITY : ACCENT_VELOCITY
    this.pattern[lane][step] = next
    this.changed()
    return next
  }

  clear(): void {
    this.pattern = emptyPattern()
    this.changed()
  }

  loadTrapStarter(): void {
    this.pattern = trapStarterPattern()
    this.changed()
  }

  setBpm(value: number): void {
    this.bpm = Math.min(220, Math.max(40, Math.round(value)))
    this.changed()
  }

  setSwing(value: number): void {
    this.swing = Math.min(0.4, Math.max(0, value))
    this.changed()
  }

  getVoice(lane: DrumLane): DrumVoiceSettings {
    return this.engine.getVoice(lane)
  }

  updateVoice(lane: DrumLane, changes: Partial<DrumVoiceSettings>): void {
    this.engine.updateVoice(lane, changes)
    this.changed()
  }

  preview(lane: DrumLane): Promise<void> {
    return this.engine.preview(lane)
  }

  getState(): DrumLoopState {
    return cloneDrumState({
      bpm: this.bpm,
      swing: this.swing,
      pattern: this.pattern,
      kit: this.engine.getKit(),
    })
  }

  loadState(state: DrumLoopState): void {
    const copy = cloneDrumState(state)
    this.bpm = copy.bpm
    this.swing = copy.swing
    this.pattern = copy.pattern
    this.engine.applyKit(copy.kit)
    this.changed()
  }

  private changed(): void {
    this.onChange?.()
  }

  private schedule(): void {
    if (!this.playing) return

    while (this.nextStepTime < this.engine.currentTime + SCHEDULE_AHEAD_SECONDS) {
      this.scheduleStep(this.step, this.nextStepTime)
      this.advance()
    }
  }

  private scheduleStep(step: number, time: number): void {
    DRUM_LANES.forEach((lane) => {
      const velocity = this.pattern[lane][step]
      if (velocity > 0) this.engine.play(lane, time, velocity)
    })

    const delay = Math.max(0, (time - this.engine.currentTime) * 1000)
    const timer = window.setTimeout(() => {
      this.visualTimers.delete(timer)
      if (this.playing) this.onStep?.(step)
    }, delay)
    this.visualTimers.add(timer)
  }

  private advance(): void {
    const base = 60 / Math.max(40, this.bpm) / 4
    const swingOffset = this.step % 2 === 0 ? this.swing : -this.swing
    this.nextStepTime += base * (1 + swingOffset)
    this.step = (this.step + 1) % STEP_COUNT
  }
}
