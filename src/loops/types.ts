import type { AnalogPatch } from '../patch'
import type { BeatPattern, DrumKit, DrumLane } from '../sequencer/types'

export type DrumLoopState = {
  bpm: number
  swing: number
  pattern: BeatPattern
  kit: DrumKit
}

export type SynthStep = {
  midi: number
  velocity: number
  gate: number
} | null

export type SynthLoopState = {
  bpm: number
  swing: number
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

export const DAW_SLOT_COUNT = 12
export const SYNTH_STEP_COUNT = 16

export function cloneDrumState(state: DrumLoopState): DrumLoopState {
  const pattern = Object.fromEntries(
    Object.entries(state.pattern).map(([lane, steps]) => [lane, [...steps]]),
  ) as BeatPattern

  const kit = Object.fromEntries(
    Object.entries(state.kit).map(([lane, voice]) => [lane, { ...voice }]),
  ) as Record<DrumLane, DrumKit[DrumLane]>

  return { bpm: state.bpm, swing: state.swing, pattern, kit: kit as DrumKit }
}

export function cloneSynthState(state: SynthLoopState): SynthLoopState {
  return {
    bpm: state.bpm,
    swing: state.swing,
    steps: state.steps.map((step) => step ? { ...step } : null),
    patch: structuredClone(state.patch),
  }
}

export function createEmptySynthState(patch: AnalogPatch, bpm = 140, swing = 0.12): SynthLoopState {
  return {
    bpm,
    swing,
    steps: Array.from({ length: SYNTH_STEP_COUNT }, () => null),
    patch: structuredClone(patch),
  }
}

export function loopBpm(loop: SavedLoop): number {
  return loop.drum?.bpm ?? loop.synth?.bpm ?? 140
}
