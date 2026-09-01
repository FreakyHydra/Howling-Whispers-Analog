import { cloneDrumState, type DrumLoopState } from '../loops/types'
import type { MasterTransport } from '../transport/transport'
import { DrumEngine } from './drum-engine'
import {
  ACCENT_VELOCITY,
  DRUM_LANES,
  NORMAL_VELOCITY,
  emptyPattern,
  resizePattern,
  trapStarterPattern,
  type BeatPattern,
  type DrumLane,
  type DrumVoiceSettings,
  type PatternLength,
} from './types'

export class BeatSequencer {
  readonly engine = new DrumEngine()
  pattern: BeatPattern = emptyPattern(16)
  length: PatternLength = 16
  onStep?: (step: number) => void
  onChange?: () => void

  constructor(private readonly transport: MasterTransport) {
    transport.register({
      id: 'beat',
      length: () => this.length,
      schedule: (step, time) => this.scheduleStep(step, time),
      visual: (step) => this.onStep?.(step),
      stop: () => {
        this.engine.panic()
        this.onStep?.(-1)
      },
    })
  }

  get bpm(): number { return this.transport.bpm }
  get swing(): number { return this.transport.swing }
  get playing(): boolean { return this.transport.playing && this.transport.isClientActive('beat') }

  async start(): Promise<void> {
    await this.engine.arm()
    this.transport.setClientActive('beat', true)
    if (!this.transport.playing) await this.transport.play()
  }

  stop(): void {
    this.transport.setClientActive('beat', false)
  }

  panic(): void {
    this.stop()
    this.engine.panic()
  }

  toggle(lane: DrumLane, step: number): number {
    if (step < 0 || step >= this.length) return 0
    const next = this.pattern[lane][step] > 0 ? 0 : NORMAL_VELOCITY
    this.pattern[lane][step] = next
    this.changed()
    return next
  }

  toggleAccent(lane: DrumLane, step: number): number {
    if (step < 0 || step >= this.length) return 0
    const current = this.pattern[lane][step]
    const next = current >= ACCENT_VELOCITY ? NORMAL_VELOCITY : ACCENT_VELOCITY
    this.pattern[lane][step] = next
    this.changed()
    return next
  }

  clear(): void {
    this.pattern = emptyPattern(this.length)
    this.changed()
  }

  loadTrapStarter(): void {
    this.pattern = trapStarterPattern(this.length)
    this.changed()
  }

  setLength(value: number): void {
    const next = normalizeLength(value)
    if (next === this.length) return
    this.length = next
    this.pattern = resizePattern(this.pattern, next)
    this.changed()
  }

  setBpm(value: number): void {
    this.transport.setBpm(value)
    this.changed()
  }

  setSwing(value: number): void {
    this.transport.setSwing(value)
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
      length: this.length,
      pattern: this.pattern,
      kit: this.engine.getKit(),
    })
  }

  loadState(state: DrumLoopState): void {
    const copy = cloneDrumState(state)
    this.length = normalizeLength(copy.length)
    this.transport.setBpm(copy.bpm)
    this.transport.setSwing(copy.swing)
    this.pattern = resizePattern(copy.pattern, this.length)
    this.engine.applyKit(copy.kit)
    this.changed()
  }

  private changed(): void {
    this.onChange?.()
  }

  private scheduleStep(step: number, time: number): void {
    DRUM_LANES.forEach((lane) => {
      const velocity = this.pattern[lane][step] ?? 0
      if (velocity > 0) this.engine.play(lane, time, velocity)
    })
  }
}

function normalizeLength(value: number): PatternLength {
  if (value <= 8) return 8
  if (value <= 16) return 16
  if (value <= 32) return 32
  return 64
}
