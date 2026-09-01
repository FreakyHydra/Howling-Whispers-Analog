import { SynthEngine } from '../audio/synth-engine'

const computerKeys = new Map([
  ['a', 60], ['w', 61], ['s', 62], ['e', 63], ['d', 64], ['f', 65],
  ['t', 66], ['g', 67], ['y', 68], ['h', 69], ['u', 70], ['j', 71], ['k', 72],
])

export function setupPerformanceControls(synth: SynthEngine): void {
  const status = document.querySelector<HTMLSpanElement>('#audio-status')
  const lamp = document.querySelector<HTMLSpanElement>('.lamp')
  const panic = document.querySelector<HTMLButtonElement>('#panic')
  if (!status || !lamp || !panic) throw new Error('Analog performance controls are incomplete')

  let activeMidi: number | undefined

  const clearActiveKey = (): void => {
    document.querySelectorAll('.key.pressed').forEach((element) => element.classList.remove('pressed'))
    activeMidi = undefined
    status.textContent = 'ENGINE READY'
    lamp.classList.add('live')
  }

  const startNote = async (midi: number): Promise<void> => {
    if (activeMidi === midi) return
    if (activeMidi !== undefined) synth.noteOff(activeMidi)
    activeMidi = midi
    await synth.noteOn(midi)
    status.textContent = `VOICE ACTIVE · MIDI ${midi}`
    lamp.classList.add('live')
    document.querySelector(`[data-midi="${midi}"]`)?.classList.add('pressed')
  }

  const stopNote = (midi: number): void => {
    if (activeMidi !== midi) return
    synth.noteOff(midi)
    clearActiveKey()
  }

  panic.addEventListener('click', () => {
    synth.panic()
    clearActiveKey()
  })

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return
    const midi = computerKeys.get(event.key.toLowerCase())
    if (midi === undefined) return
    event.preventDefault()
    void startNote(midi)
  })

  window.addEventListener('keyup', (event) => {
    const midi = computerKeys.get(event.key.toLowerCase())
    if (midi === undefined) return
    stopNote(midi)
  })

  document.querySelectorAll<HTMLButtonElement>('[data-midi]').forEach((key) => {
    const midi = Number(key.dataset.midi)
    key.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      key.setPointerCapture(event.pointerId)
      void startNote(midi)
    })
    key.addEventListener('pointerup', () => stopNote(midi))
    key.addEventListener('pointercancel', () => stopNote(midi))
    key.addEventListener('lostpointercapture', () => stopNote(midi))
  })
}
