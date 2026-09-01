import type { SynthStep } from '../loops/types'
import type { AnalogPatch } from '../patch'
import type { DrumLane, DrumVoiceSettings } from '../sequencer/types'

type Tracker = (source: AudioScheduledSourceNode) => void

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>()

export function scheduleDrumHit(
  context: BaseAudioContext,
  destination: AudioNode,
  lane: DrumLane,
  voice: DrumVoiceSettings,
  time: number,
  velocity: number,
  track?: Tracker,
): void {
  if (lane === 'kick') scheduleKick(context, destination, voice, time, velocity, track)
  if (lane === 'snare') scheduleSnare(context, destination, voice, time, velocity, track)
  if (lane === 'clap') scheduleClap(context, destination, voice, time, velocity, track)
  if (lane === 'hat') scheduleHat(context, destination, voice, time, velocity, track)
  if (lane === '808') schedule808(context, destination, voice, time, velocity, track)
}

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
  const nowEnd = time + Math.max(0.02, gateDuration)
  const release = Math.max(0.02, patch.envelope.release)
  const attack = Math.max(0.005, patch.envelope.attack)
  const decay = Math.max(0.005, patch.envelope.decay)
  const sustain = Math.max(0.0001, patch.envelope.sustain)
  const peak = Math.max(0.0001, step.velocity * patch.master)

  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(patch.filter.cutoff, time)
  filter.Q.setValueAtTime(patch.filter.resonance, time)
  drive.curve = saturationCurve(patch.drive)
  drive.oversample = '4x'

  amp.gain.setValueAtTime(0.0001, time)
  amp.gain.linearRampToValueAtTime(peak, time + attack)
  amp.gain.linearRampToValueAtTime(peak * sustain, time + attack + decay)
  amp.gain.setValueAtTime(peak * sustain, nowEnd)
  amp.gain.exponentialRampToValueAtTime(0.0001, nowEnd + release)

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
    oscillator.stop(nowEnd + release + 0.04)
  })

  if (patch.lfo.depth > 0) {
    const lfo = tracked(context.createOscillator(), track)
    const depth = context.createGain()
    lfo.frequency.setValueAtTime(patch.lfo.rate, time)
    depth.gain.setValueAtTime(patch.lfo.depth, time)
    lfo.connect(depth).connect(filter.frequency)
    lfo.start(time)
    lfo.stop(nowEnd + release + 0.04)
  }
}

function scheduleKick(
  context: BaseAudioContext,
  destination: AudioNode,
  voice: DrumVoiceSettings,
  time: number,
  velocity: number,
  track?: Tracker,
): void {
  const oscillator = tracked(context.createOscillator(), track)
  const gain = context.createGain()
  const ratio = pitchRatio(voice.tune)
  const decay = clamp(voice.decay, 0.05, 1.5)
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime((95 + voice.tone * 125) * ratio, time)
  oscillator.frequency.exponentialRampToValueAtTime((38 + voice.tone * 16) * ratio, time + Math.min(decay * 0.55, 0.22))
  gain.gain.setValueAtTime(level(voice, velocity), time)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + decay)
  connectPan(context, oscillator.connect(gain), destination, voice.pan)
  oscillator.start(time)
  oscillator.stop(time + decay + 0.03)
}

function schedule808(
  context: BaseAudioContext,
  destination: AudioNode,
  voice: DrumVoiceSettings,
  time: number,
  velocity: number,
  track?: Tracker,
): void {
  const oscillator = tracked(context.createOscillator(), track)
  const shaper = context.createWaveShaper()
  const gain = context.createGain()
  const ratio = pitchRatio(voice.tune)
  const decay = clamp(voice.decay, 0.12, 2.4)
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(65.41 * ratio, time)
  oscillator.frequency.exponentialRampToValueAtTime(49 * ratio, time + Math.min(0.22, decay * 0.35))
  shaper.curve = saturationCurve(voice.tone)
  shaper.oversample = '4x'
  gain.gain.setValueAtTime(level(voice, velocity), time)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + decay)
  oscillator.connect(shaper).connect(gain)
  connectPan(context, gain, destination, voice.pan)
  oscillator.start(time)
  oscillator.stop(time + decay + 0.04)
}

function scheduleSnare(
  context: BaseAudioContext,
  destination: AudioNode,
  voice: DrumVoiceSettings,
  time: number,
  velocity: number,
  track?: Tracker,
): void {
  const noise = tracked(context.createBufferSource(), track)
  const filter = context.createBiquadFilter()
  const noiseGain = context.createGain()
  const body = tracked(context.createOscillator(), track)
  const bodyGain = context.createGain()
  const sum = context.createGain()
  const decay = clamp(voice.decay, 0.05, 1.2)
  const ratio = pitchRatio(voice.tune)

  noise.buffer = noiseBuffer(context)
  filter.type = 'highpass'
  filter.frequency.value = (650 + voice.tone * 2400) * ratio
  noiseGain.gain.setValueAtTime(level(voice, velocity) * 0.62, time)
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + decay)
  noise.connect(filter).connect(noiseGain).connect(sum)

  body.type = 'triangle'
  body.frequency.value = 155 * ratio
  bodyGain.gain.setValueAtTime(level(voice, velocity) * 0.35, time)
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(decay, 0.2))
  body.connect(bodyGain).connect(sum)

  connectPan(context, sum, destination, voice.pan)
  noise.start(time)
  noise.stop(time + decay + 0.02)
  body.start(time)
  body.stop(time + Math.min(decay, 0.22) + 0.02)
}

function scheduleClap(
  context: BaseAudioContext,
  destination: AudioNode,
  voice: DrumVoiceSettings,
  time: number,
  velocity: number,
  track?: Tracker,
): void {
  const duration = clamp(voice.decay * 0.42, 0.035, 0.32)
  const cutoff = (850 + voice.tone * 3600) * pitchRatio(voice.tune)
  ;[0, 0.022, 0.045].forEach((offset, index) => {
    noiseBurst(context, destination, voice, time + offset, duration, cutoff, velocity * (0.72 - index * 0.09), track)
  })
}

function scheduleHat(
  context: BaseAudioContext,
  destination: AudioNode,
  voice: DrumVoiceSettings,
  time: number,
  velocity: number,
  track?: Tracker,
): void {
  const duration = clamp(voice.decay, 0.025, 0.6)
  const cutoff = (3600 + voice.tone * 7800) * pitchRatio(voice.tune)
  noiseBurst(context, destination, voice, time, duration, cutoff, velocity * 0.7, track)
}

function noiseBurst(
  context: BaseAudioContext,
  destination: AudioNode,
  voice: DrumVoiceSettings,
  time: number,
  duration: number,
  cutoff: number,
  velocity: number,
  track?: Tracker,
): void {
  const source = tracked(context.createBufferSource(), track)
  const filter = context.createBiquadFilter()
  const gain = context.createGain()
  source.buffer = noiseBuffer(context)
  filter.type = 'highpass'
  filter.frequency.value = clamp(cutoff, 120, context.sampleRate * 0.45)
  gain.gain.setValueAtTime(level(voice, velocity), time)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
  source.connect(filter).connect(gain)
  connectPan(context, gain, destination, voice.pan)
  source.start(time)
  source.stop(time + duration + 0.015)
}

function connectPan(context: BaseAudioContext, source: AudioNode, destination: AudioNode, panValue: number): void {
  const pan = context.createStereoPanner()
  pan.pan.value = clamp(panValue, -1, 1)
  source.connect(pan).connect(destination)
}

function noiseBuffer(context: BaseAudioContext): AudioBuffer {
  const cached = noiseBuffers.get(context)
  if (cached) return cached
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  noiseBuffers.set(context, buffer)
  return buffer
}

function tracked<T extends AudioScheduledSourceNode>(source: T, track?: Tracker): T {
  track?.(source)
  return source
}

function level(voice: DrumVoiceSettings, velocity: number): number {
  return Math.max(0.0001, clamp(voice.level * velocity, 0, 1.2))
}

function pitchRatio(semitones: number): number {
  return 2 ** (semitones / 12)
}

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

function saturationCurve(amount: number): Float32Array {
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
