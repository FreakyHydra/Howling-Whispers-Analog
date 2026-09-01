export type MasterFxSettings = {
  chorusMix: number
  chorusRate: number
  chorusDepth: number
  phaserMix: number
  phaserRate: number
  phaserDepth: number
  bitDepth: number
  crusherMix: number
}

export const DEFAULT_MASTER_FX: MasterFxSettings = {
  chorusMix: 0,
  chorusRate: 0.45,
  chorusDepth: 0.003,
  phaserMix: 0,
  phaserRate: 0.3,
  phaserDepth: 700,
  bitDepth: 8,
  crusherMix: 0,
}

export class MasterEffects {
  readonly input: GainNode
  readonly output: GainNode

  private chorusDry: GainNode
  private chorusWet: GainNode
  private chorusDelay: DelayNode
  private chorusLfo: OscillatorNode
  private chorusDepth: GainNode

  private phaserDry: GainNode
  private phaserWet: GainNode
  private phaserLfo: OscillatorNode
  private phaserDepth: GainNode

  private crusherDry: GainNode
  private crusherWet: GainNode
  private crusher: WaveShaperNode

  private settings: MasterFxSettings = { ...DEFAULT_MASTER_FX }

  constructor(private readonly context: AudioContext, destination: AudioNode) {
    const input = context.createGain()
    const output = context.createGain()

    const chorusOut = context.createGain()
    const chorusDry = context.createGain()
    const chorusWet = context.createGain()
    const chorusDelay = context.createDelay(0.05)
    const chorusLfo = context.createOscillator()
    const chorusDepth = context.createGain()

    input.connect(chorusDry).connect(chorusOut)
    input.connect(chorusDelay).connect(chorusWet).connect(chorusOut)
    chorusLfo.connect(chorusDepth).connect(chorusDelay.delayTime)
    chorusLfo.start()

    const phaserOut = context.createGain()
    const phaserDry = context.createGain()
    const phaserWet = context.createGain()
    const phaserLfo = context.createOscillator()
    const phaserDepth = context.createGain()
    const allpasses = Array.from({ length: 4 }, () => context.createBiquadFilter())
    allpasses.forEach((filter, index) => {
      filter.type = 'allpass'
      filter.frequency.value = 450 + index * 230
      filter.Q.value = 0.7
      phaserLfo.connect(phaserDepth).connect(filter.frequency)
    })
    chorusOut.connect(phaserDry).connect(phaserOut)
    let phaserNode: AudioNode = chorusOut
    allpasses.forEach((filter) => {
      phaserNode.connect(filter)
      phaserNode = filter
    })
    phaserNode.connect(phaserWet).connect(phaserOut)
    phaserLfo.start()

    const crusherDry = context.createGain()
    const crusherWet = context.createGain()
    const crusher = context.createWaveShaper()
    phaserOut.connect(crusherDry).connect(output)
    phaserOut.connect(crusher).connect(crusherWet).connect(output)

    output.connect(destination)

    this.input = input
    this.output = output
    this.chorusDry = chorusDry
    this.chorusWet = chorusWet
    this.chorusDelay = chorusDelay
    this.chorusLfo = chorusLfo
    this.chorusDepth = chorusDepth
    this.phaserDry = phaserDry
    this.phaserWet = phaserWet
    this.phaserLfo = phaserLfo
    this.phaserDepth = phaserDepth
    this.crusherDry = crusherDry
    this.crusherWet = crusherWet
    this.crusher = crusher

    this.apply(this.settings)
  }

  getSettings(): MasterFxSettings {
    return { ...this.settings }
  }

  apply(next: Partial<MasterFxSettings>): void {
    this.settings = { ...this.settings, ...next }
    const now = this.context.currentTime
    const chorusMix = clamp(this.settings.chorusMix, 0, 1)
    const phaserMix = clamp(this.settings.phaserMix, 0, 1)
    const crusherMix = clamp(this.settings.crusherMix, 0, 1)

    this.chorusDry.gain.setTargetAtTime(1 - chorusMix * 0.55, now, 0.01)
    this.chorusWet.gain.setTargetAtTime(chorusMix, now, 0.01)
    this.chorusDelay.delayTime.setTargetAtTime(0.014, now, 0.01)
    this.chorusLfo.frequency.setTargetAtTime(clamp(this.settings.chorusRate, 0.05, 8), now, 0.01)
    this.chorusDepth.gain.setTargetAtTime(clamp(this.settings.chorusDepth, 0, 0.012), now, 0.01)

    this.phaserDry.gain.setTargetAtTime(1 - phaserMix * 0.45, now, 0.01)
    this.phaserWet.gain.setTargetAtTime(phaserMix, now, 0.01)
    this.phaserLfo.frequency.setTargetAtTime(clamp(this.settings.phaserRate, 0.03, 8), now, 0.01)
    this.phaserDepth.gain.setTargetAtTime(clamp(this.settings.phaserDepth, 0, 1800), now, 0.01)

    this.crusherDry.gain.setTargetAtTime(1 - crusherMix, now, 0.01)
    this.crusherWet.gain.setTargetAtTime(crusherMix, now, 0.01)
    this.crusher.curve = quantizeCurve(this.settings.bitDepth)
    this.crusher.oversample = 'none'
  }
}

function quantizeCurve(bits: number): Float32Array<ArrayBuffer> {
  const size = 4096
  const curve: Float32Array<ArrayBuffer> = new Float32Array(
    new ArrayBuffer(size * Float32Array.BYTES_PER_ELEMENT),
  )
  const levels = Math.max(4, 2 ** Math.round(clamp(bits, 2, 16)))
  for (let index = 0; index < size; index += 1) {
    const x = (index * 2) / (size - 1) - 1
    curve[index] = Math.round(x * levels) / levels
  }
  return curve
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
