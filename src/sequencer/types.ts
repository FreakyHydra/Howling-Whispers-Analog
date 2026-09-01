export type DrumLane = 'kick' | 'snare' | 'clap' | 'hat' | '808'

export const DRUM_LANES: DrumLane[] = ['kick', 'snare', 'clap', 'hat', '808']
export const STEP_COUNT = 16

export type BeatPattern = Record<DrumLane, boolean[]>

export function emptyPattern(): BeatPattern {
  return Object.fromEntries(
    DRUM_LANES.map((lane) => [lane, Array.from({ length: STEP_COUNT }, () => false)]),
  ) as BeatPattern
}

export function trapStarterPattern(): BeatPattern {
  const pattern = emptyPattern()

  activate(pattern.kick, [0, 7, 10])
  activate(pattern.snare, [4, 12])
  activate(pattern.clap, [4, 12])
  activate(pattern.hat, [0, 2, 4, 6, 8, 10, 12, 13, 14, 15])
  activate(pattern['808'], [0, 3, 7, 10, 14])

  return pattern
}

function activate(lane: boolean[], steps: number[]): void {
  steps.forEach((step) => { lane[step] = true })
}
