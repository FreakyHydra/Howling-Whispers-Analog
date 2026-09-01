import type { MasterTransport } from '../transport/transport'
import { BeatSequencer } from './sequencer'
import { DRUM_LANES, type DrumLane } from './types'
import { formatVoiceValue, type VoiceNumericParam } from './voice-format'

const LABELS: Record<DrumLane, string> = {
  kick: 'KICK', snare: 'SNARE', clap: 'CLAP', hat: 'CLOSED HAT', openHat: 'OPEN HAT', '808': '808',
}

export type BeatSequencerController = {
  sequencer: BeatSequencer
  refresh: () => void
}

export function setupBeatSequencer(transport: MasterTransport): BeatSequencerController {
  const sequencer = new BeatSequencer(transport)
  let selectedLane: DrumLane = 'kick'

  const play = requiredButton('#seq-play')
  const clear = requiredButton('#seq-clear')
  const trap = requiredButton('#seq-trap')
  const length = requiredSelect('#seq-length')

  document.querySelectorAll<HTMLButtonElement>('[data-seq-lane][data-seq-step]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const lane = button.dataset.seqLane as DrumLane
      const step = Number(button.dataset.seqStep)
      const velocity = event.shiftKey ? sequencer.toggleAccent(lane, step) : sequencer.toggle(lane, step)
      paintStep(button, velocity)
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-voice-select]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedLane = button.dataset.voiceSelect as DrumLane
      paintVoiceEditor(sequencer, selectedLane)
    })
  })

  play.addEventListener('click', async () => {
    if (sequencer.playing) sequencer.stop()
    else await sequencer.start()
  })

  clear.addEventListener('click', () => {
    sequencer.clear()
    paintPattern(sequencer)
  })

  trap.addEventListener('click', () => {
    sequencer.loadTrapStarter()
    paintPattern(sequencer)
  })

  length.addEventListener('change', () => {
    sequencer.setLength(Number(length.value))
    refresh()
  })

  document.querySelectorAll<HTMLInputElement>('[data-voice-param]').forEach((input) => {
    input.addEventListener('input', () => {
      const param = input.dataset.voiceParam as VoiceNumericParam
      const value = Number(input.value)
      sequencer.updateVoice(selectedLane, { [param]: value })
      requiredOutput(`#voice-${param}-value`).value = formatVoiceValue(param, value)
    })
  })

  requiredButton('#voice-preview').addEventListener('click', () => { void sequencer.preview(selectedLane) })
  requiredButton('#voice-mute').addEventListener('click', () => {
    const voice = sequencer.getVoice(selectedLane)
    sequencer.updateVoice(selectedLane, { muted: !voice.muted })
    paintVoiceEditor(sequencer, selectedLane)
  })
  requiredButton('#voice-solo').addEventListener('click', () => {
    const voice = sequencer.getVoice(selectedLane)
    sequencer.updateVoice(selectedLane, { solo: !voice.solo })
    paintVoiceEditor(sequencer, selectedLane)
  })

  sequencer.onStep = (step) => {
    document.querySelectorAll('.seq-step.playhead').forEach((node) => node.classList.remove('playhead'))
    if (step < 0) return
    document.querySelectorAll(`[data-seq-step="${step}"]`).forEach((node) => node.classList.add('playhead'))
  }

  transport.subscribe(() => {
    play.textContent = sequencer.playing ? 'STOP DRUMS' : 'PLAY DRUMS'
    play.classList.toggle('active', sequencer.playing)
  })

  const refresh = (): void => {
    paintPattern(sequencer)
    paintVoiceEditor(sequencer, selectedLane)
    length.value = String(sequencer.length)
    paintLength(sequencer.length)
  }

  sequencer.loadTrapStarter()
  refresh()
  window.addEventListener('beforeunload', () => sequencer.panic(), { once: true })
  return { sequencer, refresh }
}

function paintPattern(sequencer: BeatSequencer): void {
  DRUM_LANES.forEach((lane) => {
    for (let step = 0; step < 64; step += 1) {
      const button = document.querySelector<HTMLButtonElement>(`[data-seq-lane="${lane}"][data-seq-step="${step}"]`)
      if (button) paintStep(button, sequencer.pattern[lane][step] ?? 0)
    }
  })
  paintLength(sequencer.length)
}

function paintLength(length: number): void {
  document.querySelectorAll<HTMLElement>('[data-seq-step]').forEach((node) => {
    node.hidden = Number(node.dataset.seqStep) >= length
  })
  document.querySelectorAll<HTMLElement>('[data-seq-ruler-step]').forEach((node) => {
    node.hidden = Number(node.dataset.seqRulerStep) >= length
  })
  document.querySelectorAll<HTMLElement>('.sequence-ruler, .sequence-row').forEach((row) => {
    row.style.setProperty('--seq-length', String(length))
  })
}

function paintStep(button: HTMLButtonElement, velocity: number): void {
  button.classList.toggle('active', velocity > 0)
  button.classList.toggle('accent', velocity >= 0.99)
  button.setAttribute('aria-pressed', String(velocity > 0))
}

function paintVoiceEditor(sequencer: BeatSequencer, lane: DrumLane): void {
  const voice = sequencer.getVoice(lane)
  const name = document.querySelector<HTMLElement>('#voice-name')
  if (name) name.textContent = LABELS[lane]

  document.querySelectorAll<HTMLButtonElement>('[data-voice-select]').forEach((button) => {
    button.classList.toggle('selected', button.dataset.voiceSelect === lane)
  })

  const numeric: VoiceNumericParam[] = ['level', 'tune', 'decay', 'tone', 'pan']
  numeric.forEach((param) => {
    const input = requiredInput(`#voice-${param}`)
    const value = voice[param]
    input.value = String(value)
    requiredOutput(`#voice-${param}-value`).value = formatVoiceValue(param, value)
  })

  paintToggle(requiredButton('#voice-mute'), voice.muted)
  paintToggle(requiredButton('#voice-solo'), voice.solo)
}

function paintToggle(button: HTMLButtonElement, active: boolean): void {
  button.classList.toggle('active', active)
  button.setAttribute('aria-pressed', String(active))
}

function requiredButton(selector: string): HTMLButtonElement { return required<HTMLButtonElement>(selector) }
function requiredInput(selector: string): HTMLInputElement { return required<HTMLInputElement>(selector) }
function requiredOutput(selector: string): HTMLOutputElement { return required<HTMLOutputElement>(selector) }
function requiredSelect(selector: string): HTMLSelectElement { return required<HTMLSelectElement>(selector) }
function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing sequencer control ${selector}`)
  return element
}
