export type SafetyChain = {
  input: GainNode
  compressor: DynamicsCompressorNode
  limiter: DynamicsCompressorNode
  output: GainNode
}

export function createSafetyChain(
  context: BaseAudioContext,
  destination: AudioNode,
  inputGain = 1,
): SafetyChain {
  const input = context.createGain()
  const compressor = context.createDynamicsCompressor()
  const limiter = context.createDynamicsCompressor()
  const output = context.createGain()

  input.gain.value = inputGain

  compressor.threshold.value = -14
  compressor.knee.value = 16
  compressor.ratio.value = 3
  compressor.attack.value = 0.012
  compressor.release.value = 0.18

  limiter.threshold.value = -1.2
  limiter.knee.value = 0
  limiter.ratio.value = 20
  limiter.attack.value = 0.002
  limiter.release.value = 0.08

  output.gain.value = 0.94

  input.connect(compressor).connect(limiter).connect(output).connect(destination)

  return { input, compressor, limiter, output }
}

export function oscillatorMixHeadroom(levels: number[]): number {
  const sum = levels.reduce((total, level) => total + Math.max(0, level), 0)
  if (sum <= 0.82) return 1
  return Math.max(0.32, Math.min(1, 0.82 / sum))
}
