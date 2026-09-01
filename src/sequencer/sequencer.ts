import { DrumEngine } from './drum-engine'
import { DRUM_LANES, emptyPattern, trapStarterPattern, type BeatPattern, type DrumLane } from './types'

const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_SECONDS = 0.1

export class BeatSequencer {
  readonly engine = new DrumEngine()
  pattern: BeatPattern = emptyPattern()
  bpm = 140
  swing = 0.12
  playing = false
  onStep?: (step: number) => void

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

  toggle(lane: DrumLane, step: number): boolean {
    const next = !this.pattern[lane][step]
    this.pattern[lane][step] = next
    return next
  }

  clear(): void {
    this.pattern = emptyPattern()
  }

  loadTrapStarter(): void {
    this.pattern = trapStarterPattern()
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
      if (this.pattern[lane][step]) this.engine.play(lane, time)
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
    this.step = (this.step + 1) % 16
  }
}
