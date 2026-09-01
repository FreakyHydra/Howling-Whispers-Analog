import type { DawProject, SavedLoop } from '../loops/types'
import { arrangementDuration, scheduleArrangement } from './audio'
import { audioBufferToWav, downloadWav } from './wav'

type Options = {
  getProject: () => DawProject
  getLoops: () => SavedLoop[]
  status: HTMLElement
}

export function setupArrangementPlayback({ getProject, getLoops, status }: Options): void {
  const play = requiredButton('#daw-play')
  const stop = requiredButton('#daw-stop')
  const exportButton = requiredButton('#daw-export')
  let context: AudioContext | undefined
  let stopTimer: number | undefined
  const sources = new Set<AudioScheduledSourceNode>()

  const stopPlayback = (): void => {
    if (stopTimer !== undefined) window.clearTimeout(stopTimer)
    stopTimer = undefined
    sources.forEach((source) => {
      try { source.stop() } catch { /* already ended */ }
    })
    sources.clear()
    if (context) void context.close()
    context = undefined
    play.disabled = false
    status.textContent = 'Arrangement stopped.'
  }

  play.addEventListener('click', async () => {
    stopPlayback()
    const project = getProject()
    const loops = getLoops()
    const duration = arrangementDuration(project, loops)

    if (duration <= 0) {
      status.textContent = 'Place at least one saved loop in the arrangement first.'
      return
    }

    context = new AudioContext({ latencyHint: 'interactive' })
    const master = context.createGain()
    master.gain.value = 0.78
    master.connect(context.destination)
    if (context.state === 'suspended') await context.resume()

    const start = context.currentTime + 0.06
    const result = scheduleArrangement(context, master, project, loops, start, (source) => sources.add(source))
    play.disabled = true
    status.textContent = `Playing ${result.usedSlots} arranged loop${result.usedSlots === 1 ? '' : 's'}.`

    stopTimer = window.setTimeout(() => {
      sources.clear()
      if (context) void context.close()
      context = undefined
      play.disabled = false
      status.textContent = 'Arrangement finished.'
    }, (result.duration + 2.8) * 1000)
  })

  stop.addEventListener('click', stopPlayback)

  exportButton.addEventListener('click', async () => {
    const project = getProject()
    const loops = getLoops()
    const duration = arrangementDuration(project, loops)
    if (duration <= 0) {
      status.textContent = 'Nothing to export yet.'
      return
    }

    exportButton.disabled = true
    status.textContent = 'Rendering arrangement to WAV...'

    try {
      const sampleRate = 44100
      const tail = 3
      const offline = new OfflineAudioContext(2, Math.ceil((duration + tail) * sampleRate), sampleRate)
      const master = offline.createGain()
      master.gain.value = 0.78
      master.connect(offline.destination)
      scheduleArrangement(offline, master, project, loops, 0.02)
      const rendered = await offline.startRendering()
      downloadWav(audioBufferToWav(rendered), `howling-whispers-arrangement-${Date.now()}.wav`)
      status.textContent = 'WAV rendered and downloaded.'
    } catch (error) {
      console.error('Arrangement export failed', error)
      status.textContent = 'WAV export failed in this browser.'
    } finally {
      exportButton.disabled = false
    }
  })

  window.addEventListener('beforeunload', stopPlayback, { once: true })
}

function requiredButton(selector: string): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(selector)
  if (!button) throw new Error(`Missing DAW playback control ${selector}`)
  return button
}
