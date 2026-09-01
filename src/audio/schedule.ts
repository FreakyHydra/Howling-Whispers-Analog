import { oscillatorMixHeadroom } from './safety'
import type { SynthStep } from '../loops/types'
import type { AnalogPatch } from '../patch'

export { scheduleDrumHit } from './drum-schedule'

type Tracker = (source: AudioScheduledSourceNode) => void

export function scheduleSynthNote(
  context: BaseAudioContext,
  destination: AudioNode,
  patch: AnalogPatch,
  step: Exclude<SynthStep, null>,
  time: number,
  gateDuration: number,
  track?: Tracker,
): void {
  const mixer = context.createGain()
  const filter = context.createBiquadFilter()
  const drive = context.createWaveShaper()
  const amp = context.createGain()
  const gate = Math.max(0.02, gateDuration)
  const gateEnd = time + gate
  const release = Math.max(0.02, patch.envelope.release)
  const attack = Math.min(Math.max(0.005, patch.envelope.attack), gate * 0.45)
  const decay = Math.min(Math.max(0.005, patch.envelope.decay), Math.max(0.005, gate - attack))
  const sustain = clamp(patch.envelope.sustain, 0.0001, 1)
  const peak = Math.max(0.0001, step.velocity * patch.master * 0.72)
  const attackEnd = time + attack
  const decayEnd = Math.min(gateEnd, attackEnd + decay)

  mixer.gain.setValueAtTime(
    oscillatorMixHeadroom(patch.oscillators.map((settings) => settings.level)),
    time,
  )
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(patch.filter.cutoff, time)
  filter.Q.setValueAtTime(patch.filter.resonance, time)
  drive.curve = saturationCurve(patch.drive)
  drive.oversample = '4x'

  amp.gain.setValueAtTime(0.0001, time)
  amp.gain.linearRampToValueAtTime(peak, attackEnd)
  if (decayEnd > attackEnd) amp.gain.linearRampToValueAtTime(peak * sustain, decayEnd)
  if (gateEnd > decayEnd) amp.gain.setValueAtTime(peak * sustain, gateEnd)
  amp.gain.exponentialRampToValueAtTime(0.0001, gateEnd + release)

  mixer.connect(filter).connect(drive).connect(amp).connect(destination)

  const frequency = midiToFrequency(step.midi)
  patch.oscillators.forEach((settings) => {
    const oscillator = tracked(context.createOscillator(), track)
    const level = context.createGain()
    oscillator.type = settings.waveform
    oscillator.frequency.setValueAtTime(frequency, time)
    oscillator.detune.setValueAtTime(settings.detune, time)
    level.gain.setValueAtTime(settings.level, time)
    oscillator.connect(level).connect(mixer)
    oscillator.start(time)
    oscillator.stop(gateEnd + release + 0.04)
  })

  if (patch.lfo.depth > 0) {
    const lfo = tracked(context.createOscillator(), track)
    const depth = context.createGain()
    lfo.frequency.setValueAtTime(patch.lfo.rate, time)
    depth.gain.setValueAtTime(patch.lfo.depth, time)
    lfo.connect(depth).connect(filter.frequency)
    lfo.start(time)
    lfo.stop(gateEnd + release + 0.04)
  }
}

function tracked<T extends AudioScheduledSourceNode>(source: T, track?: Tracker): T {
  track?.(source)
  return source
}

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

function saturationCurve(amount: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(1024)
  const drive = 1 + clamp(amount, 0, 1) * 22
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i * 2) / (curve.length - 1) - 1
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive)
  }
  return curve
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
