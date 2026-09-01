export type OscillatorWaveform = 'sawtooth' | 'square' | 'triangle'

export interface VcoPatch {
  waveform: OscillatorWaveform
  level: number
  detune: number
}

export interface AnalogPatch {
  version: 1
  name: string
  oscillators: [VcoPatch, VcoPatch, VcoPatch]
  filter: {
    cutoff: number
    resonance: number
  }
  envelope: {
    attack: number
    decay: number
    sustain: number
    release: number
  }
  lfo: {
    rate: number
    depth: number
  }
  drive: number
  master: number
}

export const DEFAULT_PATCH: AnalogPatch = {
  version: 1,
  name: 'First Howl',
  oscillators: [
    { waveform: 'sawtooth', level: 0.42, detune: -7 },
    { waveform: 'square', level: 0.32, detune: 7 },
    { waveform: 'sawtooth', level: 0.24, detune: -12 },
  ],
  filter: {
    cutoff: 2200,
    resonance: 5.5,
  },
  envelope: {
    attack: 0.025,
    decay: 0.28,
    sustain: 0.72,
    release: 0.65,
  },
  lfo: {
    rate: 0.9,
    depth: 180,
  },
  drive: 0.2,
  master: 0.62,
}

export function clonePatch(patch: AnalogPatch): AnalogPatch {
  return structuredClone(patch)
}

export function replacePatch(target: AnalogPatch, source: AnalogPatch): void {
  const copy = clonePatch(source)
  target.name = copy.name
  target.oscillators = copy.oscillators
  target.filter = copy.filter
  target.envelope = copy.envelope
  target.lfo = copy.lfo
  target.drive = copy.drive
  target.master = copy.master
}
