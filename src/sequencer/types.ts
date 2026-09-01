export type DrumLane = 'kick' | 'snare' | 'clap' | 'hat' | '808'

export const DRUM_LANES: DrumLane[] = ['kick', 'snare', 'clap', 'hat', '808']
export const STEP_COUNT = 16
export const NORMAL_VELOCITY = 0.72
export const ACCENT_VELOCITY = 1

export type BeatPattern = Record<DrumLane, number[]>

export type DrumVoiceSettings = {
  level: number
  tune: number
  decay: number
  tone: number
  pan: number
  muted: boolean
  solo: boolean
}

export type DrumKit = Record<DrumLane, DrumVoiceSettings>

export function createDefaultDrumKit(): DrumKit {
  return {
    kick: voice(0.9, 0, 0.34, 0.58),
    snare: voice(0.72, 0, 0.19, 0.55),
    clap: voice(0.62, 0, 0.18, 0.62),
    hat: voice(0.5, 0, 0.07, 0.72),
    '808': voice(0.78, 0, 0.88, 0.42),
  }
}

export function emptyPattern(): BeatPattern {
  return Object.fromEntries(
    DRUM_LANES.map((lane) => [lane, Array.from({ length: STEP_COUNT }, () => 0)]),
  ) as BeatPattern
}

export function trapStarterPattern(): BeatPattern {
  const pattern = emptyPattern()

  activate(pattern.kick, [0, 7, 10], [1, 0.72, 0.9])
  activate(pattern.snare, [4, 12], [0.82, 0.9])
  activate(pattern.clap, [4, 12], [0.72, 0.82])
  activate(pattern.hat, [0, 2, 4, 6, 8, 10, 12, 13, 14, 15], [0.55, 0.48, 0.62, 0.5, 0.56, 0.5, 0.65, 0.42, 0.55, 0.82])
  activate(pattern['808'], [0, 3, 7, 10, 14], [1, 0.7, 0.82, 0.76, 0.92])

  return pattern
}

function voice(level: number, tune: number, decay: number, tone: number): DrumVoiceSettings {
  return { level, tune, decay, tone, pan: 0, muted: false, solo: false }
}

function activate(lane: number[], steps: number[], velocities: number[]): void {
  steps.forEach((step, index) => { lane[step] = velocities[index] ?? NORMAL_VELOCITY })
}
