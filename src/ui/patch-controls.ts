import { SynthEngine } from '../audio/synth-engine'
import type { AnalogPatch, OscillatorWaveform } from '../patch'
import { formatValue } from './format'

type BindPatchControlsOptions = {
  patch: AnalogPatch
  synth: SynthEngine
}

export function bindPatchControls({ patch, synth }: BindPatchControlsOptions): void {
  const commitPatch = () => synth.setPatch(patch)

  const bindRange = (id: string, apply: (value: number) => void): void => {
    const input = document.querySelector<HTMLInputElement>(`#${id}`)
    const output = document.querySelector<HTMLOutputElement>(`#${id}-value`)
    if (!input || !output) throw new Error(`Missing Analog control: ${id}`)

    const unit = input.dataset.unit ?? ''
    input.addEventListener('input', () => {
      const value = Number(input.value)
      apply(value)
      output.value = formatValue(value, unit)
      commitPatch()
    })
  }

  patch.oscillators.forEach((oscillator, index) => {
    const wave = document.querySelector<HTMLSelectElement>(`#osc-${index}-wave`)
    if (!wave) throw new Error(`Missing oscillator waveform control: ${index}`)

    wave.addEventListener('change', () => {
      oscillator.waveform = wave.value as OscillatorWaveform
      commitPatch()
    })

    bindRange(`osc-${index}-level`, (value) => { oscillator.level = value })
    bindRange(`osc-${index}-detune`, (value) => { oscillator.detune = value })
  })

  bindRange('filter-cutoff', (value) => { patch.filter.cutoff = value })
  bindRange('filter-resonance', (value) => { patch.filter.resonance = value })
  bindRange('drive', (value) => { patch.drive = value })
  bindRange('attack', (value) => { patch.envelope.attack = value })
  bindRange('decay', (value) => { patch.envelope.decay = value })
  bindRange('sustain', (value) => { patch.envelope.sustain = value })
  bindRange('release', (value) => { patch.envelope.release = value })
  bindRange('lfo-rate', (value) => { patch.lfo.rate = value })
  bindRange('lfo-depth', (value) => { patch.lfo.depth = value })
  bindRange('master', (value) => { patch.master = value })
}
