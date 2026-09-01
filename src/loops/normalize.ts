import type { AnalogPatch } from '../patch'
import { createDefaultDrumKit, DRUM_LANES, emptyPattern, resizePattern, type DrumKit, type PatternLength } from '../sequencer/types'
import { cloneDrumState, cloneSynthState, createEmptySynthState, type DrumLoopState, type SavedLoop, type SynthLoopState, type WorkingSession } from './types'

type UnknownRecord = Record<string, unknown>

export function normalizeSavedLoop(value: unknown): SavedLoop | undefined {
  if (!isRecord(value) || typeof value.id !== 'string') return undefined
  const kind = value.kind === 'drum' || value.kind === 'synth' || value.kind === 'combined' ? value.kind : undefined

  if (kind) {
    const drum = normalizeDrumState(value.drum)
    const synth = normalizeSynthState(value.synth)
    if (kind === 'drum' && !drum) return undefined
    if (kind === 'synth' && !synth) return undefined
    if (kind === 'combined' && (!drum || !synth)) return undefined
    return {
      id: value.id,
      name: typeof value.name === 'string' ? value.name : 'Untitled Loop',
      kind,
      drum,
      synth,
      createdAt: numberOrNow(value.createdAt),
      updatedAt: numberOrNow(value.updatedAt),
    }
  }

  const legacy = normalizeDrumState(value)
  if (legacy) {
    return {
      id: value.id,
      name: typeof value.name === 'string' ? value.name : 'Legacy Drum Loop',
      kind: 'drum',
      drum: legacy,
      createdAt: numberOrNow(value.createdAt),
      updatedAt: numberOrNow(value.updatedAt),
    }
  }

  return undefined
}

export function normalizeWorkingSession(value: unknown, fallbackPatch: AnalogPatch): WorkingSession | undefined {
  if (!isRecord(value)) return undefined

  const drum = normalizeDrumState(value.drum)
  const synth = normalizeSynthState(value.synth)
  if (drum && synth) {
    return { id: 'working-session', drum, synth, updatedAt: numberOrNow(value.updatedAt) }
  }

  if (isRecord(value.state)) {
    const legacyDrum = normalizeDrumState(value.state)
    if (legacyDrum) {
      return {
        id: 'working-session',
        drum: legacyDrum,
        synth: createEmptySynthState(fallbackPatch, legacyDrum.bpm, legacyDrum.swing),
        updatedAt: numberOrNow(value.updatedAt),
      }
    }
  }

  return undefined
}

function normalizeDrumState(value: unknown): DrumLoopState | undefined {
  if (!isRecord(value) || typeof value.bpm !== 'number' || typeof value.swing !== 'number') return undefined
  if (!isRecord(value.pattern) || !isRecord(value.kit)) return undefined

  const patternRecord = value.pattern
  const kitRecord = value.kit
  const length = normalizeLength(value.length, inferPatternLength(patternRecord))
  const pattern = emptyPattern(length)

  DRUM_LANES.forEach((lane) => {
    const source = patternRecord[lane]
    if (!Array.isArray(source)) return
    for (let index = 0; index < length; index += 1) {
      const step = source[index]
      pattern[lane][index] = typeof step === 'number' && Number.isFinite(step) ? step : 0
    }
  })

  const defaults = createDefaultDrumKit()
  const kit = {} as DrumKit
  DRUM_LANES.forEach((lane) => {
    const raw = kitRecord[lane]
    const fallback = defaults[lane]
    kit[lane] = isRecord(raw) ? {
      level: finiteOr(raw.level, fallback.level),
      tune: finiteOr(raw.tune, fallback.tune),
      decay: finiteOr(raw.decay, fallback.decay),
      tone: finiteOr(raw.tone, fallback.tone),
      pan: finiteOr(raw.pan, fallback.pan),
      muted: typeof raw.muted === 'boolean' ? raw.muted : false,
      solo: typeof raw.solo === 'boolean' ? raw.solo : false,
    } : { ...fallback }
  })

  return cloneDrumState({ bpm: value.bpm, swing: value.swing, length, pattern: resizePattern(pattern, length), kit })
}

function normalizeSynthState(value: unknown): SynthLoopState | undefined {
  if (!isRecord(value) || typeof value.bpm !== 'number' || typeof value.swing !== 'number') return undefined
  if (!Array.isArray(value.steps) || !isRecord(value.patch)) return undefined

  const sourceSteps = value.steps
  const patch = value.patch as unknown as AnalogPatch
  const length = normalizeLength(value.length, sourceSteps.length)
  const steps = Array.from({ length }, (_, index) => {
    const step = sourceSteps[index]
    if (!isRecord(step) || typeof step.midi !== 'number') return null
    return {
      midi: Math.round(step.midi),
      velocity: finiteOr(step.velocity, 0.8),
      gate: finiteOr(step.gate, 0.82),
      accent: typeof step.accent === 'boolean' ? step.accent : undefined,
      slide: typeof step.slide === 'boolean' ? step.slide : undefined,
    }
  })
  return cloneSynthState({ bpm: value.bpm, swing: value.swing, length, steps, patch })
}

function inferPatternLength(pattern: UnknownRecord): number {
  for (const lane of DRUM_LANES) {
    const steps = pattern[lane]
    if (Array.isArray(steps) && steps.length) return steps.length
  }
  return 16
}

function normalizeLength(value: unknown, fallback: number): PatternLength {
  const candidate = typeof value === 'number' ? value : fallback
  if (candidate <= 8) return 8
  if (candidate <= 16) return 16
  if (candidate <= 32) return 32
  return 64
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function numberOrNow(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Date.now()
}
