import type { AnalogPatch } from '../patch'
import { cloneDrumState, cloneSynthState, createEmptySynthState, type DrumLoopState, type SavedLoop, type WorkingSession } from './types'

type UnknownRecord = Record<string, unknown>

export function normalizeSavedLoop(value: unknown): SavedLoop | undefined {
  if (!isRecord(value)) return undefined

  if (value.kind === 'drum' || value.kind === 'synth' || value.kind === 'combined') {
    const loop = value as unknown as SavedLoop
    return {
      ...loop,
      drum: loop.drum ? cloneDrumState(loop.drum) : undefined,
      synth: loop.synth ? cloneSynthState(loop.synth) : undefined,
      createdAt: numberOrNow(loop.createdAt),
      updatedAt: numberOrNow(loop.updatedAt),
    }
  }

  if (isLegacyDrumState(value) && typeof value.id === 'string') {
    return {
      id: value.id,
      name: typeof value.name === 'string' ? value.name : 'Legacy Drum Loop',
      kind: 'drum',
      drum: cloneDrumState(value as unknown as DrumLoopState),
      createdAt: numberOrNow(value.createdAt),
      updatedAt: numberOrNow(value.updatedAt),
    }
  }

  return undefined
}

export function normalizeWorkingSession(value: unknown, fallbackPatch: AnalogPatch): WorkingSession | undefined {
  if (!isRecord(value)) return undefined

  if (isLegacyDrumState(value.drum) && isRecord(value.synth)) {
    return {
      id: 'working-session',
      drum: cloneDrumState(value.drum as unknown as DrumLoopState),
      synth: cloneSynthState(value.synth as unknown as WorkingSession['synth']),
      updatedAt: numberOrNow(value.updatedAt),
    }
  }

  if (isRecord(value.state) && isLegacyDrumState(value.state)) {
    const drum = cloneDrumState(value.state as unknown as DrumLoopState)
    return {
      id: 'working-session',
      drum,
      synth: createEmptySynthState(fallbackPatch, drum.bpm, drum.swing),
      updatedAt: numberOrNow(value.updatedAt),
    }
  }

  return undefined
}

function isLegacyDrumState(value: unknown): value is UnknownRecord {
  return isRecord(value)
    && typeof value.bpm === 'number'
    && typeof value.swing === 'number'
    && isRecord(value.pattern)
    && isRecord(value.kit)
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function numberOrNow(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Date.now()
}
