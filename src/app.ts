import { SynthEngine } from './audio/synth-engine'
import { setupPerformanceControls } from './input/performance'
import { DEFAULT_PATCH, clonePatch, type AnalogPatch } from './patch'
import { setupBeatSequencer } from './sequencer/controller'
import { renderAnalogUi } from './ui/markup'
import { bindPatchControls } from './ui/patch-controls'

export function bootAnalogApp(): void {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) throw new Error('Analog root element #app was not found')

  const patch: AnalogPatch = clonePatch(DEFAULT_PATCH)
  const synth = new SynthEngine(patch)

  app.innerHTML = renderAnalogUi(patch)
  bindPatchControls({ patch, synth })
  const sequencer = setupBeatSequencer()
  setupPerformanceControls(synth, () => sequencer.panic())
}
