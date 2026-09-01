import type { AnalogPatch } from '../patch'
import type { SynthLoopState, SynthStep } from '../loops/types'
import { midiNoteName } from './format'
import { MelodicSequencer } from './sequencer'

export type MelodicSequencerController = {
  sequencer: MelodicSequencer
  refresh: () => void
  getState: () => SynthLoopState
}

type Options = {
  patch: AnalogPatch
  getTransport: () => { bpm: number; swing: number }
}

export function setupMelodicSequencer({ patch, getTransport }: Options): MelodicSequencerController {
  const sequencer = new MelodicSequencer()
  let selected = 0

  const play = requiredButton('#mel-play')
  const toggle = requiredButton('#mel-toggle')
  const note = requiredInput('#mel-note')
  const velocity = requiredInput('#mel-velocity')
  const gate = requiredInput('#mel-gate')

  document.querySelectorAll<HTMLButtonElement>('[data-mel-step]').forEach((button) => {
    button.addEventListener('click', () => {
      selected = Number(button.dataset.melStep)
      paintEditor(sequencer.steps[selected], selected)
      paintSelection(selected)
    })
  })

  toggle.addEventListener('click', () => {
    sequencer.toggle(selected)
    refresh()
  })

  note.addEventListener('input', () => {
    sequencer.update(selected, { midi: Number(note.value) })
    refresh()
  })
  velocity.addEventListener('input', () => {
    sequencer.update(selected, { velocity: Number(velocity.value) })
    refresh()
  })
  gate.addEventListener('input', () => {
    sequencer.update(selected, { gate: Number(gate.value) })
    refresh()
  })

  play.addEventListener('click', async () => {
    if (sequencer.playing) {
      sequencer.stop()
      play.textContent = 'PLAY SYNTH'
      return
    }
    const transport = getTransport()
    await sequencer.start(patch, transport.bpm, transport.swing)
    play.textContent = 'STOP SYNTH'
  })

  requiredButton('#mel-starter').addEventListener('click', () => {
    sequencer.loadBassStarter()
    refresh()
  })
  requiredButton('#mel-clear').addEventListener('click', () => {
    sequencer.clear()
    refresh()
  })

  sequencer.onStep = (step) => {
    document.querySelectorAll('.mel-step.playhead').forEach((node) => node.classList.remove('playhead'))
    if (step >= 0) document.querySelector(`[data-mel-step="${step}"]`)?.classList.add('playhead')
    if (step < 0) play.textContent = 'PLAY SYNTH'
  }

  const refresh = (): void => {
    sequencer.steps.forEach((step, index) => paintStep(index, step))
    paintSelection(selected)
    paintEditor(sequencer.steps[selected], selected)
  }

  sequencer.loadBassStarter()
  refresh()

  return {
    sequencer,
    refresh,
    getState: () => {
      const transport = getTransport()
      return sequencer.getState(patch, transport.bpm, transport.swing)
    },
  }
}

function paintStep(index: number, step: SynthStep): void {
  const button = document.querySelector<HTMLButtonElement>(`[data-mel-step="${index}"]`)
  if (!button) return
  button.classList.toggle('active', Boolean(step))
  button.setAttribute('aria-pressed', String(Boolean(step)))
  const label = button.querySelector<HTMLElement>('strong')
  if (label) label.textContent = step ? midiNoteName(step.midi) : 'REST'
}

function paintSelection(index: number): void {
  document.querySelectorAll<HTMLButtonElement>('[data-mel-step]').forEach((button) => {
    button.classList.toggle('selected', Number(button.dataset.melStep) === index)
  })
}

function paintEditor(step: SynthStep, index: number): void {
  const value = step ?? { midi: 48, velocity: 0.8, gate: 0.82 }
  required<HTMLElement>('#mel-selected').textContent = String(index + 1).padStart(2, '0')
  requiredInput('#mel-note').value = String(value.midi)
  requiredInput('#mel-velocity').value = String(value.velocity)
  requiredInput('#mel-gate').value = String(value.gate)
  required<HTMLOutputElement>('#mel-note-value').value = midiNoteName(value.midi)
  required<HTMLOutputElement>('#mel-velocity-value').value = `${Math.round(value.velocity * 100)}%`
  required<HTMLOutputElement>('#mel-gate-value').value = `${Math.round(value.gate * 100)}%`
}

function requiredButton(selector: string): HTMLButtonElement {
  return required<HTMLButtonElement>(selector)
}

function requiredInput(selector: string): HTMLInputElement {
  return required<HTMLInputElement>(selector)
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing melodic control ${selector}`)
  return element
}
