import { scheduleDrumHit, scheduleSynthNote } from '../audio/schedule'
import type { DawProject, SavedLoop } from '../loops/types'
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
  let cursor = startTime
  let usedSlots = 0

  project.slots.forEach((loopId) => {
    const loop = loops.find((candidate) => candidate.id === loopId)
    if (!loop) return
    const bpm = loop.drum?.bpm ?? loop.synth?.bpm ?? 140
    const swing = loop.drum?.swing ?? loop.synth?.swing ?? 0
    scheduleLoop(context, destination, loop, cursor, bpm, swing, track)
    cursor += loopDuration(bpm)
    usedSlots += 1
  })

  return { duration: Math.max(0, cursor - startTime), usedSlots }
}

export function arrangementDuration(project: DawProject, loops: SavedLoop[]): number {
  return project.slots.reduce((total, loopId) => {
    const loop = loops.find((candidate) => candidate.id === loopId)
    if (!loop) return total
    const bpm = loop.drum?.bpm ?? loop.synth?.bpm ?? 140
    return total + loopDuration(bpm)
  }, 0)
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
  const offsets = stepOffsets(bpm, swing)

  if (loop.drum) {
    const anySolo = DRUM_LANES.some((lane) => loop.drum!.kit[lane].solo)
    DRUM_LANES.forEach((lane) => {
      const voice = loop.drum!.kit[lane]
      const audible = !voice.muted && (!anySolo || voice.solo)
      if (!audible) return
      loop.drum!.pattern[lane].forEach((velocity, step) => {
        if (velocity <= 0) return
        scheduleDrumHit(context, destination, lane, voice, startTime + offsets[step], velocity, track)
      })
    })
  }

  if (loop.synth) {
    loop.synth.steps.forEach((step, index) => {
      if (!step) return
      const stepStart = startTime + offsets[index]
      const length = stepLength(bpm, swing, index) * step.gate
      scheduleSynthNote(context, destination, loop.synth!.patch, step, stepStart, length, track)
    })
  }
}

function stepOffsets(bpm: number, swing: number): number[] {
  const result: number[] = []
  let cursor = 0
  for (let index = 0; index < 16; index += 1) {
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

function loopDuration(bpm: number): number {
  return 240 / Math.min(220, Math.max(40, bpm))
}
