import type { AnalogPatch } from '../patch'
import {
  DRUM_LANES,
  STEP_COUNT,
  createDefaultDrumKit,
  emptyPattern,
  type BeatPattern,
  type DrumKit,
  type DrumLane,
  type DrumVoiceSettings,
} from '../sequencer/types'

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

export const DAW_TRACK_COUNT = 3
export const DAW_COLUMN_COUNT = 4
export const DAW_SLOT_COUNT = DAW_TRACK_COUNT * DAW_COLUMN_COUNT
export const SYNTH_STEP_COUNT = 16

export function cloneDrumState(state: DrumLoopState): DrumLoopState {
  const fallbackPattern = emptyPattern()
  const fallbackKit = createDefaultDrumKit()

  const pattern = Object.fromEntries(
    DRUM_LANES.map((lane) => [lane, normalizePatternLane(state.pattern?.[lane], fallbackPattern[lane])]),
  ) as BeatPattern

  const kit = Object.fromEntries(
    DRUM_LANES.map((lane) => [lane, normalizeVoice(state.kit?.[lane], fallbackKit[lane])]),
  ) as Record<DrumLane, DrumVoiceSettings>

  return {
    bpm: clampFinite(state.bpm, 40, 220, 140),
    swing: clampFinite(state.swing, 0, 0.4, 0.12),
    pattern,
    kit: kit as DrumKit,
  }
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

export function dawTrackForSlot(index: number): number {
  return Math.floor(index / DAW_COLUMN_COUNT)
}

export function dawColumnForSlot(index: number): number {
  return index % DAW_COLUMN_COUNT
}

function normalizePatternLane(value: number[] | undefined, fallback: number[]): number[] {
  if (!Array.isArray(value)) return [...fallback]
  return Array.from({ length: STEP_COUNT }, (_, index) => clampFinite(value[index], 0, 1, 0))
}

function normalizeVoice(value: DrumVoiceSettings | undefined, fallback: DrumVoiceSettings): DrumVoiceSettings {
  const source = value ?? fallback
  return {
    level: clampFinite(source.level, 0, 1, fallback.level),
    tune: clampFinite(source.tune, -24, 24, fallback.tune),
    decay: clampFinite(source.decay, 0.03, 2.8, fallback.decay),
    tone: clampFinite(source.tone, 0, 1, fallback.tone),
    pan: clampFinite(source.pan, -1, 1, fallback.pan),
    muted: Boolean(source.muted),
    solo: Boolean(source.solo),
  }
}

function clampFinite(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}
