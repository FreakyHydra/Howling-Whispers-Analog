import { SynthEngine } from './audio/synth-engine'
import { setupChipSynth } from './chip/controller'
import { setupDawWorkspace } from './daw/controller'
import { setupFxControls } from './fx/controller'
import { setupPerformanceControls } from './input/performance'
import { setupMelodicSequencer } from './melodic/controller'
import { DEFAULT_PATCH, clonePatch, replacePatch, type AnalogPatch } from './patch'
import { setupModuleRack } from './rack/controller'
import { setupBeatSequencer } from './sequencer/controller'
import { setupTransportControls } from './transport/controller'
import { MasterTransport } from './transport/transport'
import { renderAnalogUi } from './ui/markup'
import { bindPatchControls } from './ui/patch-controls'

export function bootAnalogApp(): void {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) throw new Error('Analog root element #app was not found')

  const patch: AnalogPatch = clonePatch(DEFAULT_PATCH)
  const synth = new SynthEngine(patch)
  const transport = new MasterTransport()
  let requestAutosave = (): void => {}

  app.innerHTML = renderAnalogUi(patch)

  const patchControls = bindPatchControls({
    patch,
    synth,
    onChange: () => requestAutosave(),
  })

  const beat = setupBeatSequencer(transport)
  const melodic = setupMelodicSequencer({ patch, transport })
  setupChipSynth(transport)
  setupFxControls()

  const panicEverything = (): void => {
    transport.stop()
    synth.panic()
    beat.sequencer.engine.panic()
    melodic.sequencer.engine.panic()
  }

  setupTransportControls({ transport, panic: panicEverything })
  setupModuleRack()
  setupPerformanceControls(synth, {
    onPanic: panicEverything,
    onNoteInput: (midi) => {
      const sequencerWorkspace = document.querySelector<HTMLElement>('[data-workspace="sequencers"]')
      if (sequencerWorkspace && !sequencerWorkspace.hidden) melodic.assignSelectedNote(midi)
    },
  })

  void setupDawWorkspace({
    beat,
    melodic,
    patch,
    loadPatch: (nextPatch) => {
      replacePatch(patch, nextPatch)
      patchControls.refresh()
      synth.setPatch(patch)
    },
  }).then((workspace) => {
    requestAutosave = workspace.requestAutosave
  }).catch((error: unknown) => {
    console.error('Analog local workspace failed to initialize', error)
    const status = document.querySelector<HTMLElement>('#loop-save-status')
    if (status) status.textContent = 'Local storage could not be initialized in this browser.'
  })
}
