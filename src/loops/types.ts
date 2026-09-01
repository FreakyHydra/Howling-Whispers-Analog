import type { AnalogPatch } from '../patch'
import { resizePattern, type BeatPattern, type DrumKit, type DrumLane, type PatternLength } from '../sequencer/types'

export type DrumLoopState = {
  bpm: number
  swing: number
  length: PatternLength
  pattern: BeatPattern
  kit: DrumKit
}

export type SynthStep = {
  midi: number
  velocity: number
  gate: number
  accent?: boolean
  slide?: boolean
} | null

export type SynthLoopState = {
  bpm: number
  swing: number
  length: PatternLength
  steps: SynthStep[]
  patch: AnalogPatch
}

export type LoopKind = 'drum' | 'synth' | 'combined'

export type SavedLoop = {
  id: string
  name: string
  kind: LoopKind
  drum?: DrumLoopState
  synth?: SynthLoopState
  createdAt: number
  updatedAt: number
}

export type WorkingSession = {
  id: 'working-session'
  drum: DrumLoopState
  synth: SynthLoopState
  updatedAt: number
}

export type DawProject = {
  id: 'default-project'
  slots: Array<string | null>
  updatedAt: number
}

export const DAW_TRACK_COUNT = 3
export const DAW_COLUMN_COUNT = 4
export const DAW_SLOT_COUNT = DAW_TRACK_COUNT * DAW_COLUMN_COUNT
export const SYNTH_STEP_COUNT = 16

export function cloneDrumState(state: DrumLoopState): DrumLoopState {
  const length = normalizeLength(state.length ?? state.pattern.kick?.length ?? 16)
  const pattern = resizePattern(state.pattern, length)

  const kit = Object.fromEntries(
    Object.entries(state.kit).map(([lane, voice]) => [lane, { ...voice }]),
  ) as Record<DrumLane, DrumKit[DrumLane]>

  return {
    bpm: state.bpm,
    swing: state.swing,
    length,
    pattern,
    kit: kit as DrumKit,
  }
}

export function cloneSynthState(state: SynthLoopState): SynthLoopState {
  const length = normalizeLength(state.length ?? state.steps.length ?? 16)
  return {
    bpm: state.bpm,
    swing: state.swing,
    length,
    steps: Array.from({ length }, (_, index) => state.steps[index] ? { ...state.steps[index]! } : null),
    patch: structuredClone(state.patch),
  }
}

export function createEmptySynthState(patch: AnalogPatch, bpm = 140, swing = 0.12, length: PatternLength = 16): SynthLoopState {
  return {
    bpm,
    swing,
    length,
    steps: Array.from({ length }, () => null),
    patch: structuredClone(patch),
  }
}

export function loopBpm(loop: SavedLoop): number {
  return loop.drum?.bpm ?? loop.synth?.bpm ?? 140
}

export function dawTrackForSlot(index: number): number {
  return Math.floor(index / DAW_COLUMN_COUNT)
}

export function dawColumnForSlot(index: number): number {
  return index % DAW_COLUMN_COUNT
}

function normalizeLength(value: number): PatternLength {
  if (value <= 8) return 8
  if (value <= 16) return 16
  if (value <= 32) return 32
  return 64
}
