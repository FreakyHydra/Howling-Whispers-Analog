import { BeatSequencer } from './sequencer'
import { DRUM_LANES, type DrumLane } from './types'

export function setupBeatSequencer(): void {
  const sequencer = new BeatSequencer()
  const play = document.querySelector<HTMLButtonElement>('#seq-play')
  const clear = document.querySelector<HTMLButtonElement>('#seq-clear')
  const trap = document.querySelector<HTMLButtonElement>('#seq-trap')
  const bpm = document.querySelector<HTMLInputElement>('#seq-bpm')
  const bpmValue = document.querySelector<HTMLOutputElement>('#seq-bpm-value')
  const swing = document.querySelector<HTMLInputElement>('#seq-swing')
  const swingValue = document.querySelector<HTMLOutputElement>('#seq-swing-value')

  if (!play || !clear || !trap || !bpm || !bpmValue || !swing || !swingValue) return

  document.querySelectorAll<HTMLButtonElement>('[data-seq-lane][data-seq-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const lane = button.dataset.seqLane as DrumLane
      const step = Number(button.dataset.seqStep)
      const active = sequencer.toggle(lane, step)
      button.classList.toggle('active', active)
      button.setAttribute('aria-pressed', String(active))
    })
  })

  play.addEventListener('click', async () => {
    if (sequencer.playing) {
      sequencer.stop()
      play.textContent = 'PLAY'
      return
    }

    await sequencer.start()
    play.textContent = 'STOP'
  })

  clear.addEventListener('click', () => {
    sequencer.clear()
    paintPattern(sequencer)
  })

  trap.addEventListener('click', () => {
    sequencer.loadTrapStarter()
    paintPattern(sequencer)
  })

  bpm.addEventListener('input', () => {
    sequencer.bpm = Number(bpm.value)
    bpmValue.value = `${sequencer.bpm} BPM`
  })

  swing.addEventListener('input', () => {
    sequencer.swing = Number(swing.value) / 100
    swingValue.value = `${swing.value}%`
  })

  sequencer.onStep = (step) => {
    document.querySelectorAll('.seq-step.playhead').forEach((node) => node.classList.remove('playhead'))
    if (step < 0) return
    document.querySelectorAll(`[data-seq-step="${step}"]`).forEach((node) => node.classList.add('playhead'))
  }

  sequencer.loadTrapStarter()
  paintPattern(sequencer)

  window.addEventListener('beforeunload', () => sequencer.stop(), { once: true })
}

function paintPattern(sequencer: BeatSequencer): void {
  DRUM_LANES.forEach((lane) => {
    sequencer.pattern[lane].forEach((active, step) => {
      const button = document.querySelector<HTMLButtonElement>(
        `[data-seq-lane="${lane}"][data-seq-step="${step}"]`,
      )
      if (!button) return
      button.classList.toggle('active', active)
      button.setAttribute('aria-pressed', String(active))
    })
  })
}
