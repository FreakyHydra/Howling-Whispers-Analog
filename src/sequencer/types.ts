export type DrumLane = 'kick' | 'snare' | 'clap' | 'hat' | 'openHat' | '808'

export const DRUM_LANES: DrumLane[] = ['kick', 'snare', 'clap', 'hat', 'openHat', '808']
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
    kick: voice(0.86, 0, 0.32, 0.5),
    snare: voice(0.68, 0, 0.2, 0.55),
    clap: voice(0.58, 0, 0.18, 0.62),
    hat: voice(0.42, 0, 0.065, 0.72),
    openHat: voice(0.38, 0, 0.48, 0.76),
    '808': voice(0.62, 0, 1.25, 0.34),
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
  activate(pattern.hat, [0, 2, 4, 6, 8, 10, 12, 13, 14, 15], [0.52, 0.46, 0.58, 0.46, 0.54, 0.46, 0.61, 0.4, 0.5, 0.72])
  activate(pattern.openHat, [6, 14], [0.54, 0.64])
  activate(pattern['808'], [0, 3, 7, 10, 14], [0.92, 0.66, 0.78, 0.72, 0.86])

  return pattern
}

function voice(level: number, tune: number, decay: number, tone: number): DrumVoiceSettings {
  return { level, tune, decay, tone, pan: 0, muted: false, solo: false }
}

function activate(lane: number[], steps: number[], velocities: number[]): void {
  steps.forEach((step, index) => { lane[step] = velocities[index] ?? NORMAL_VELOCITY })
}
