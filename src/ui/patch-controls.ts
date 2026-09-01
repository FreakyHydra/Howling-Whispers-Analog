import { SynthEngine } from '../audio/synth-engine'
import type { AnalogPatch, OscillatorWaveform } from '../patch'
import { formatValue } from './format'

type BindPatchControlsOptions = {
  patch: AnalogPatch
  synth: SynthEngine
  onChange?: () => void
}

export type PatchControlsController = {
  refresh: () => void
}

export function bindPatchControls({ patch, synth, onChange }: BindPatchControlsOptions): PatchControlsController {
  const commitPatch = () => {
    synth.setPatch(patch)
    onChange?.()
  }

  const bindRange = (id: string, apply: (value: number) => void): void => {
    const input = requiredInput(`#${id}`)
    const output = requiredOutput(`#${id}-value`)
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

  const refresh = (): void => {
    patch.oscillators.forEach((oscillator, index) => {
      const wave = document.querySelector<HTMLSelectElement>(`#osc-${index}-wave`)
      if (wave) wave.value = oscillator.waveform
      setRange(`osc-${index}-level`, oscillator.level, '')
      setRange(`osc-${index}-detune`, oscillator.detune, 'ct')
    })

    setRange('filter-cutoff', patch.filter.cutoff, 'Hz')
    setRange('filter-resonance', patch.filter.resonance, '')
    setRange('drive', patch.drive, '')
    setRange('attack', patch.envelope.attack, 's')
    setRange('decay', patch.envelope.decay, 's')
    setRange('sustain', patch.envelope.sustain, '')
    setRange('release', patch.envelope.release, 's')
    setRange('lfo-rate', patch.lfo.rate, 'Hz')
    setRange('lfo-depth', patch.lfo.depth, 'Hz')
    setRange('master', patch.master, '')
    synth.setPatch(patch)
  }

  return { refresh }
}

function setRange(id: string, value: number, unit: string): void {
  const input = requiredInput(`#${id}`)
  input.value = String(value)
  requiredOutput(`#${id}-value`).value = formatValue(value, unit)
}

function requiredInput(selector: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(selector)
  if (!input) throw new Error(`Missing Analog input ${selector}`)
  return input
}

function requiredOutput(selector: string): HTMLOutputElement {
  const output = document.querySelector<HTMLOutputElement>(selector)
  if (!output) throw new Error(`Missing Analog output ${selector}`)
  return output
}
