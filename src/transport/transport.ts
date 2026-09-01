import { analogAudio } from '../audio/runtime'

const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_SECONDS = 0.12
const STEPS_PER_BAR = 16

export type TransportClient = {
  id: string
  length: () => number
  schedule: (step: number, time: number, duration: number, absoluteStep: number) => void
  visual?: (step: number, absoluteStep: number) => void
  stop?: () => void
}

type ClientState = {
  client: TransportClient
  active: boolean
  joinAt: number | null
}

export type TransportSnapshot = {
  playing: boolean
  bpm: number
  swing: number
  sync: boolean
  absoluteStep: number
}

export class MasterTransport {
  bpm = 140
  swing = 0.12
  sync = true
  playing = false

  private absoluteStep = 0
  private nextStepTime = 0
  private timer?: number
  private clients = new Map<string, ClientState>()
  private listeners = new Set<(snapshot: TransportSnapshot) => void>()
  private visualTimers = new Set<number>()

  register(client: TransportClient, active = true): () => void {
    this.clients.set(client.id, { client, active, joinAt: null })
    this.emit()
    return () => {
      this.clients.delete(client.id)
      this.emit()
    }
  }

  subscribe(listener: (snapshot: TransportSnapshot) => void): () => void {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => this.listeners.delete(listener)
  }

  isClientActive(id: string): boolean {
    return this.clients.get(id)?.active ?? false
  }

  setClientActive(id: string, active: boolean): void {
    const state = this.clients.get(id)
    if (!state) return
    state.active = active
    state.joinAt = active && this.playing && this.sync
      ? Math.ceil(Math.max(1, this.absoluteStep) / STEPS_PER_BAR) * STEPS_PER_BAR
      : null
    if (!active) state.client.stop?.()
    this.emit()
  }

  async play(reset = true): Promise<void> {
    await analogAudio.arm()
    if (this.playing) return

    if (reset) this.absoluteStep = 0
    this.playing = true
    this.nextStepTime = analogAudio.currentTime + 0.06
    this.scheduleAhead()
    this.timer = window.setInterval(() => this.scheduleAhead(), LOOKAHEAD_MS)
    this.emit()
  }

  stop(): void {
    this.playing = false
    if (this.timer !== undefined) window.clearInterval(this.timer)
    this.timer = undefined
    this.visualTimers.forEach((timer) => window.clearTimeout(timer))
    this.visualTimers.clear()
    this.clients.forEach((state) => state.client.stop?.())
    this.emit()
  }

  rewind(): void {
    this.stop()
    this.absoluteStep = 0
    this.emit()
  }

  setBpm(value: number): void {
    this.bpm = clamp(Math.round(value), 40, 220)
    this.emit()
  }

  setSwing(value: number): void {
    this.swing = clamp(value, 0, 0.4)
    this.emit()
  }

  setSync(enabled: boolean): void {
    this.sync = enabled
    if (!enabled) this.clients.forEach((state) => { state.joinAt = null })
    this.emit()
  }

  getSnapshot(): TransportSnapshot {
    return this.snapshot()
  }

  private scheduleAhead(): void {
    if (!this.playing) return

    while (this.nextStepTime < analogAudio.currentTime + SCHEDULE_AHEAD_SECONDS) {
      const absoluteStep = this.absoluteStep
      const duration = this.stepLength(absoluteStep)

      this.clients.forEach((state) => {
        if (!state.active) return
        if (state.joinAt !== null && absoluteStep < state.joinAt) return
        if (state.joinAt !== null && absoluteStep >= state.joinAt) state.joinAt = null

        const length = Math.max(1, Math.round(state.client.length()))
        const localStep = absoluteStep % length
        state.client.schedule(localStep, this.nextStepTime, duration, absoluteStep)
      })

      const delay = Math.max(0, (this.nextStepTime - analogAudio.currentTime) * 1000)
      const timer = window.setTimeout(() => {
        this.visualTimers.delete(timer)
        if (!this.playing) return
        this.clients.forEach((state) => {
          if (!state.active) return
          if (state.joinAt !== null && absoluteStep < state.joinAt) return
          const length = Math.max(1, Math.round(state.client.length()))
          state.client.visual?.(absoluteStep % length, absoluteStep)
        })
        this.emitAt(absoluteStep)
      }, delay)
      this.visualTimers.add(timer)

      this.nextStepTime += duration
      this.absoluteStep += 1
    }
  }

  private stepLength(index: number): number {
    const base = 60 / this.bpm / 4
    const swingOffset = index % 2 === 0 ? this.swing : -this.swing
    return base * (1 + swingOffset)
  }

  private snapshot(step = this.absoluteStep): TransportSnapshot {
    return {
      playing: this.playing,
      bpm: this.bpm,
      swing: this.swing,
      sync: this.sync,
      absoluteStep: step,
    }
  }

  private emit(): void {
    const snapshot = this.snapshot()
    this.listeners.forEach((listener) => listener(snapshot))
  }

  private emitAt(step: number): void {
    const snapshot = this.snapshot(step)
    this.listeners.forEach((listener) => listener(snapshot))
  }
}

export function positionForStep(absoluteStep: number): { bar: number; beat: number; step: number } {
  return {
    bar: Math.floor(absoluteStep / STEPS_PER_BAR) + 1,
    beat: Math.floor((absoluteStep % STEPS_PER_BAR) / 4) + 1,
    step: (absoluteStep % 4) + 1,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
