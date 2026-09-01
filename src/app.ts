import { SynthEngine } from './audio/synth-engine'
import { setupDawWorkspace } from './daw/controller'
import { setupPerformanceControls } from './input/performance'
import { setupMelodicSequencer } from './melodic/controller'
import { DEFAULT_PATCH, clonePatch, replacePatch, type AnalogPatch } from './patch'
import { setupBeatSequencer } from './sequencer/controller'
import { renderAnalogUi } from './ui/markup'
import { bindPatchControls } from './ui/patch-controls'

export function bootAnalogApp(): void {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) throw new Error('Analog root element #app was not found')

  const patch: AnalogPatch = clonePatch(DEFAULT_PATCH)
  const synth = new SynthEngine(patch)
  let requestAutosave = (): void => {}

  app.innerHTML = renderAnalogUi(patch)

  const patchControls = bindPatchControls({
    patch,
    synth,
    onChange: () => requestAutosave(),
  })

  const beat = setupBeatSequencer()
  const melodic = setupMelodicSequencer({
    patch,
    getTransport: () => ({ bpm: beat.sequencer.bpm, swing: beat.sequencer.swing }),
  })

  setupPerformanceControls(synth, () => {
    beat.sequencer.panic()
    melodic.sequencer.panic()
  })

  void setupDawWorkspace({
    beat,
    melodic,
    patch,
    loadPatch: (nextPatch) => {
      replacePatch(patch, nextPatch)
      patchControls.refresh()
    },
  }).then((workspace) => {
    requestAutosave = workspace.requestAutosave
  }).catch((error: unknown) => {
    console.error('Analog local workspace failed to initialize', error)
    const status = document.querySelector<HTMLElement>('#loop-save-status')
    if (status) status.textContent = 'Local storage could not be initialized in this browser.'
  })
}
