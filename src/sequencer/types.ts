export type DrumLane = 'kick' | 'snare' | 'clap' | 'hat' | 'openHat' | '808'
export type PatternLength = 8 | 16 | 32 | 64

export const DRUM_LANES: DrumLane[] = ['kick', 'snare', 'clap', 'hat', 'openHat', '808']
export const PATTERN_LENGTHS: PatternLength[] = [8, 16, 32, 64]
export const MAX_STEP_COUNT = 64
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
    kick: voice(0.82, 0, 0.38, 0.54),
    snare: voice(0.68, 0, 0.22, 0.58),
    clap: voice(0.56, 0, 0.2, 0.64),
    hat: voice(0.42, 0, 0.07, 0.76),
    openHat: voice(0.4, 0, 0.48, 0.7),
    '808': voice(0.7, 0, 1.25, 0.45),
  }
}

export function emptyPattern(length: number = 16): BeatPattern {
  const safeLength = Math.max(1, Math.min(MAX_STEP_COUNT, Math.round(length)))
  return Object.fromEntries(
    DRUM_LANES.map((lane) => [lane, Array.from({ length: safeLength }, () => 0)]),
  ) as BeatPattern
}

export function resizePattern(pattern: BeatPattern, length: number): BeatPattern {
  const next = emptyPattern(length)
  DRUM_LANES.forEach((lane) => {
    const source = pattern[lane] ?? []
    for (let step = 0; step < next[lane].length; step += 1) next[lane][step] = source[step] ?? 0
  })
  return next
}

export function trapStarterPattern(length: number = 16): BeatPattern {
  const pattern = emptyPattern(length)
  const repeat = (lane: DrumLane, baseSteps: number[], velocities: number[]): void => {
    for (let offset = 0; offset < length; offset += 16) {
      baseSteps.forEach((step, index) => {
        const target = offset + step
        if (target < length) pattern[lane][target] = velocities[index] ?? NORMAL_VELOCITY
      })
    }
  }

  repeat('kick', [0, 7, 10], [1, 0.72, 0.9])
  repeat('snare', [4, 12], [0.82, 0.9])
  repeat('clap', [4, 12], [0.72, 0.82])
  repeat('hat', [0, 2, 4, 6, 8, 10, 12, 13, 14, 15], [0.55, 0.48, 0.62, 0.5, 0.56, 0.5, 0.65, 0.42, 0.55, 0.82])
  repeat('openHat', [11], [0.62])
  repeat('808', [0, 3, 7, 10, 14], [1, 0.7, 0.82, 0.76, 0.92])

  return pattern
}

function voice(level: number, tune: number, decay: number, tone: number): DrumVoiceSettings {
  return { level, tune, decay, tone, pan: 0, muted: false, solo: false }
}
