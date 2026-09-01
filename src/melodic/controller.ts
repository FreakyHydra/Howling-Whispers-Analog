import type { SynthLoopState, SynthStep } from '../loops/types'
import type { AnalogPatch } from '../patch'
import type { MasterTransport } from '../transport/transport'
import { midiNoteName } from './format'
import { MelodicSequencer } from './sequencer'

export type MelodicSequencerController = {
  sequencer: MelodicSequencer
  refresh: () => void
  getState: () => SynthLoopState
  assignSelectedNote: (midi: number) => void
}

type Options = {
  patch: AnalogPatch
  transport: MasterTransport
}

export function setupMelodicSequencer({ patch, transport }: Options): MelodicSequencerController {
  const sequencer = new MelodicSequencer(transport, () => patch)
  let selected = 0
  let noteEntryArmed = false

  const play = requiredButton('#mel-play')
  const toggle = requiredButton('#mel-toggle')
  const note = requiredInput('#mel-note')
  const velocity = requiredInput('#mel-velocity')
  const gate = requiredInput('#mel-gate')
  const length = requiredSelect('#mel-length')
  const accent = requiredButton('#mel-accent')
  const slide = requiredButton('#mel-slide')
  const hint = required<HTMLElement>('#mel-entry-hint')

  document.querySelectorAll<HTMLButtonElement>('[data-mel-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.melStep)
      if (index >= sequencer.length) return
      selected = index
      noteEntryArmed = true
      paintEditor(sequencer.steps[selected], selected)
      paintSelection(selected)
      hint.textContent = `STEP ${String(selected + 1).padStart(2, '0')} selected. Press a synth key below to enter the note.`
    })
    button.addEventListener('dblclick', () => {
      const index = Number(button.dataset.melStep)
      if (index >= sequencer.length) return
      selected = index
      sequencer.toggle(selected)
      refresh()
    })
  })

  toggle.addEventListener('click', () => {
    sequencer.toggle(selected)
    refresh()
  })

  note.addEventListener('input', () => {
    sequencer.update(selected, { midi: Number(note.value) })
    noteEntryArmed = false
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
  length.addEventListener('change', () => {
    sequencer.setLength(Number(length.value))
    if (selected >= sequencer.length) selected = sequencer.length - 1
    noteEntryArmed = false
    refresh()
  })

  accent.addEventListener('click', () => {
    const current = sequencer.steps[selected]
    sequencer.update(selected, { accent: !current?.accent })
    refresh()
  })
  slide.addEventListener('click', () => {
    const current = sequencer.steps[selected]
    sequencer.update(selected, { slide: !current?.slide })
    refresh()
  })

  play.addEventListener('click', async () => {
    if (sequencer.playing) sequencer.stop()
    else await sequencer.start()
  })

  requiredButton('#mel-starter').addEventListener('click', () => {
    sequencer.loadBassStarter()
    noteEntryArmed = false
    refresh()
  })
  requiredButton('#mel-clear').addEventListener('click', () => {
    sequencer.clear()
    noteEntryArmed = false
    refresh()
  })

  sequencer.onStep = (stepIndex) => {
    document.querySelectorAll('.mel-step.playhead').forEach((node) => node.classList.remove('playhead'))
    if (stepIndex >= 0) document.querySelector(`[data-mel-step="${stepIndex}"]`)?.classList.add('playhead')
  }

  transport.subscribe(() => {
    play.textContent = sequencer.playing ? 'STOP SYNTH' : 'PLAY SYNTH'
    play.classList.toggle('active', sequencer.playing)
  })

  const assignSelectedNote = (midi: number): void => {
    if (!noteEntryArmed) return
    sequencer.assignNote(selected, midi)
    noteEntryArmed = false
    hint.textContent = `STEP ${String(selected + 1).padStart(2, '0')} = ${midiNoteName(midi)}. Select another step to enter another note.`
    refresh()
  }

  const refresh = (): void => {
    for (let index = 0; index < 64; index += 1) paintStep(index, sequencer.steps[index] ?? null)
    paintLength(sequencer.length)
    paintSelection(selected)
    paintEditor(sequencer.steps[selected], selected)
    length.value = String(sequencer.length)
  }

  sequencer.loadBassStarter()
  refresh()

  return {
    sequencer,
    refresh,
    assignSelectedNote,
    getState: () => sequencer.getState(patch, transport.bpm, transport.swing),
  }
}

function paintStep(index: number, step: SynthStep): void {
  const button = document.querySelector<HTMLButtonElement>(`[data-mel-step="${index}"]`)
  if (!button) return
  button.classList.toggle('active', Boolean(step))
  button.classList.toggle('accent', Boolean(step?.accent))
  button.classList.toggle('slide', Boolean(step?.slide))
  button.setAttribute('aria-pressed', String(Boolean(step)))
  const label = button.querySelector<HTMLElement>('strong')
  if (label) label.textContent = step ? midiNoteName(step.midi) : 'REST'
  const flags = button.querySelector<HTMLElement>('[data-mel-flags]')
  if (flags) flags.textContent = `${step?.accent ? 'A' : ''}${step?.slide ? 'S' : ''}`
}

function paintLength(length: number): void {
  document.querySelectorAll<HTMLElement>('[data-mel-step]').forEach((node) => {
    node.hidden = Number(node.dataset.melStep) >= length
  })
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
  paintToggle(requiredButton('#mel-accent'), Boolean(value.accent))
  paintToggle(requiredButton('#mel-slide'), Boolean(value.slide))
}

function paintToggle(button: HTMLButtonElement, active: boolean): void {
  button.classList.toggle('active', active)
  button.setAttribute('aria-pressed', String(active))
}

function requiredButton(selector: string): HTMLButtonElement { return required<HTMLButtonElement>(selector) }
function requiredInput(selector: string): HTMLInputElement { return required<HTMLInputElement>(selector) }
function requiredSelect(selector: string): HTMLSelectElement { return required<HTMLSelectElement>(selector) }
function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing melodic control ${selector}`)
  return element
}
