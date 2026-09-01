import { MasterEffects } from './master-effects'
import { createSafetyChain, type SafetyChain } from './safety'

export class AnalogAudioRuntime {
  private context?: AudioContext
  private masterInput?: GainNode
  private safety?: SafetyChain
  private effects?: MasterEffects

  async arm(): Promise<void> {
    this.ensureGraph()
    if (this.context?.state === 'suspended') await this.context.resume()
  }

  get currentTime(): number {
    return this.context?.currentTime ?? 0
  }

  getContext(): AudioContext {
    this.ensureGraph()
    return this.context!
  }

  getInput(): GainNode {
    this.ensureGraph()
    return this.masterInput!
  }

  getEffects(): MasterEffects {
    this.ensureGraph()
    return this.effects!
  }

  private ensureGraph(): void {
    if (this.context) return

    const context = new AudioContext({ latencyHint: 'interactive' })
    const masterInput = context.createGain()
    const safety = createSafetyChain(context, context.destination, 0.9)
    const effects = new MasterEffects(context, safety.input)

    masterInput.gain.value = 0.92
    masterInput.connect(effects.input)

    this.context = context
    this.masterInput = masterInput
    this.safety = safety
    this.effects = effects
  }
}

export const analogAudio = new AnalogAudioRuntime()
