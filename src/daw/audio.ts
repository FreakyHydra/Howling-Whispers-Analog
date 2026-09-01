import { scheduleDrumHit, scheduleSynthNote } from '../audio/schedule'
import {
  DAW_COLUMN_COUNT,
  dawColumnForSlot,
  loopBpm,
  type DawProject,
  type SavedLoop,
  type SynthStep,
} from '../loops/types'
import { DRUM_LANES } from '../sequencer/types'

export type ArrangementSchedule = {
  duration: number
  usedSlots: number
}

export function scheduleArrangement(
  context: BaseAudioContext,
  destination: AudioNode,
  project: DawProject,
  loops: SavedLoop[],
  startTime: number,
  track?: (source: AudioScheduledSourceNode) => void,
): ArrangementSchedule {
  const masterBpm = arrangementBpm(project, loops)
  const columnDuration = loopDuration(masterBpm, 16)
  let usedSlots = 0
  let duration = 0

  project.slots.forEach((loopId, index) => {
    const loop = loops.find((candidate) => candidate.id === loopId)
    if (!loop) return

    const column = dawColumnForSlot(index)
    const loopStart = startTime + column * columnDuration
    const bpm = loopBpm(loop)
    const swing = loop.drum?.swing ?? loop.synth?.swing ?? 0
    const length = loopLength(loop)

    scheduleLoop(context, destination, loop, loopStart, bpm, swing, track)
    usedSlots += 1
    duration = Math.max(
      duration,
      (column + 1) * columnDuration,
      column * columnDuration + loopDuration(bpm, length),
    )
  })

  return { duration, usedSlots }
}

export function arrangementDuration(project: DawProject, loops: SavedLoop[]): number {
  const masterBpm = arrangementBpm(project, loops)
  const columnDuration = loopDuration(masterBpm, 16)
  let duration = 0

  project.slots.forEach((loopId, index) => {
    const loop = loops.find((candidate) => candidate.id === loopId)
    if (!loop) return
    const column = dawColumnForSlot(index)
    duration = Math.max(
      duration,
      (column + 1) * columnDuration,
      column * columnDuration + loopDuration(loopBpm(loop), loopLength(loop)),
    )
  })

  return duration
}

function arrangementBpm(project: DawProject, loops: SavedLoop[]): number {
  for (let column = 0; column < DAW_COLUMN_COUNT; column += 1) {
    for (let index = column; index < project.slots.length; index += DAW_COLUMN_COUNT) {
      const loop = loops.find((candidate) => candidate.id === project.slots[index])
      if (loop) return loopBpm(loop)
    }
  }
  return 140
}

function scheduleLoop(
  context: BaseAudioContext,
  destination: AudioNode,
  loop: SavedLoop,
  startTime: number,
  bpm: number,
  swing: number,
  track?: (source: AudioScheduledSourceNode) => void,
): void {
  if (loop.drum) {
    const offsets = stepOffsets(bpm, swing, loop.drum.length)
    const anySolo = DRUM_LANES.some((lane) => loop.drum!.kit[lane].solo)
    DRUM_LANES.forEach((lane) => {
      const voice = loop.drum!.kit[lane]
      const audible = !voice.muted && (!anySolo || voice.solo)
      if (!audible) return
      loop.drum!.pattern[lane].forEach((velocity, step) => {
        if (velocity <= 0 || step >= offsets.length) return
        scheduleDrumHit(context, destination, lane, voice, startTime + offsets[step], velocity, track)
      })
    })
  }

  if (loop.synth) {
    const offsets = stepOffsets(bpm, swing, loop.synth.length)
    loop.synth.steps.forEach((step, index) => {
      if (!step || index >= offsets.length) return
      const stepStart = startTime + offsets[index]
      const length = stepLength(bpm, swing, index) * step.gate
      scheduleSynthNote(
        context,
        destination,
        loop.synth!.patch,
        step,
        stepStart,
        length,
        track,
        previousMidi(loop.synth!.steps, index, loop.synth!.length),
      )
    })
  }
}

function stepOffsets(bpm: number, swing: number, length: number): number[] {
  const result: number[] = []
  let cursor = 0
  for (let index = 0; index < length; index += 1) {
    result.push(cursor)
    cursor += stepLength(bpm, swing, index)
  }
  return result
}

function stepLength(bpm: number, swing: number, index: number): number {
  const safeBpm = Math.min(220, Math.max(40, bpm))
  const safeSwing = Math.min(0.4, Math.max(0, swing))
  const base = 60 / safeBpm / 4
  return base * (1 + (index % 2 === 0 ? safeSwing : -safeSwing))
}

function previousMidi(steps: SynthStep[], index: number, length: number): number | undefined {
  for (let offset = 1; offset <= length; offset += 1) {
    const candidate = steps[(index - offset + length) % length]
    if (candidate) return candidate.midi
  }
  return undefined
}

function loopLength(loop: SavedLoop): number {
  return Math.max(loop.drum?.length ?? 0, loop.synth?.length ?? 0, 1)
}

function loopDuration(bpm: number, length: number): number {
  return (60 / Math.min(220, Math.max(40, bpm)) / 4) * Math.max(1, length)
}
