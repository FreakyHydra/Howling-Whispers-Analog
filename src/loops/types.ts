import type { BeatPattern, DrumKit, DrumLane } from '../sequencer/types'

export type LoopState = {
  bpm: number
  swing: number
  pattern: BeatPattern
  kit: DrumKit
}

export type SavedLoop = LoopState & {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

export type WorkingSession = {
  id: 'working-session'
  state: LoopState
  updatedAt: number
}

export type DawProject = {
  id: 'default-project'
  slots: Array<string | null>
  updatedAt: number
}

export const DAW_SLOT_COUNT = 12

export function cloneLoopState(state: LoopState): LoopState {
  const pattern = Object.fromEntries(
    Object.entries(state.pattern).map(([lane, steps]) => [lane, [...steps]]),
  ) as BeatPattern

  const kit = Object.fromEntries(
    Object.entries(state.kit).map(([lane, voice]) => [lane, { ...voice }]),
  ) as Record<DrumLane, DrumKit[DrumLane]>

  return {
    bpm: state.bpm,
    swing: state.swing,
    pattern,
    kit: kit as DrumKit,
  }
}
