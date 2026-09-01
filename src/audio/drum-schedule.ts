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
  if (lane === 'openHat') scheduleOpenHat(context, destination, voice, time, velocity, track)
  if (lane === '808') schedule808(context, destination, voice, time, velocity, track)
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
  const decay = clamp(voice.decay, 0.06, 1.2)
  const body = (46 + voice.tone * 18) * ratio

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(body * 2.4, time)
  oscillator.frequency.exponentialRampToValueAtTime(body, time + Math.min(0.085, decay * 0.34))
  gain.gain.setValueAtTime(Math.max(0.0001, velocity * 0.86), time)
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
  const harmonic = tracked(context.createOscillator(), track)
  const bodyGain = context.createGain()
  const harmonicGain = context.createGain()
  const shaper = context.createWaveShaper()
  const filter = context.createBiquadFilter()
  const sum = context.createGain()
  const ratio = pitchRatio(voice.tune)
  const decay = clamp(voice.decay, 0.35, 2.8)
  const fundamental = 55 * ratio
  const bodyLevel = Math.max(0.0001, velocity * 0.72)

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(fundamental * 1.55, time)
  oscillator.frequency.exponentialRampToValueAtTime(fundamental, time + 0.055)
  bodyGain.gain.setValueAtTime(0.0001, time)
  bodyGain.gain.linearRampToValueAtTime(bodyLevel, time + 0.004)
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + decay)

  harmonic.type = 'triangle'
  harmonic.frequency.setValueAtTime(fundamental * 2, time)
  harmonicGain.gain.setValueAtTime(Math.max(0.0001, velocity * (0.08 + voice.tone * 0.16)), time)
  harmonicGain.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(0.18, decay * 0.2))

  shaper.curve = saturationCurve(0.08 + voice.tone * 0.36)
  shaper.oversample = '4x'
  filter.type = 'lowpass'
  filter.frequency.value = 140 + voice.tone * 900
  filter.Q.value = 0.7

  oscillator.connect(bodyGain).connect(sum)
  harmonic.connect(harmonicGain).connect(sum)
  sum.connect(shaper).connect(filter)
  connectPan(context, filter, destination, voice.pan)

  oscillator.start(time)
  harmonic.start(time)
  oscillator.stop(time + decay + 0.04)
  harmonic.stop(time + Math.min(0.22, decay * 0.24))
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
  noiseGain.gain.setValueAtTime(level(voice, velocity) * 0.58, time)
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + decay)
  noise.connect(filter).connect(noiseGain).connect(sum)

  body.type = 'triangle'
  body.frequency.value = 155 * ratio
  bodyGain.gain.setValueAtTime(level(voice, velocity) * 0.32, time)
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
    noiseBurst(context, destination, voice, time + offset, duration, cutoff, velocity * (0.68 - index * 0.09), track)
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
  const duration = clamp(voice.decay, 0.025, 0.22)
  const cutoff = (4300 + voice.tone * 7600) * pitchRatio(voice.tune)
  noiseBurst(context, destination, voice, time, duration, cutoff, velocity * 0.62, track)
}

function scheduleOpenHat(
  context: BaseAudioContext,
  destination: AudioNode,
  voice: DrumVoiceSettings,
  time: number,
  velocity: number,
  track?: Tracker,
): void {
  const duration = clamp(voice.decay, 0.16, 1.2)
  const cutoff = (3600 + voice.tone * 6900) * pitchRatio(voice.tune)
  noiseBurst(context, destination, voice, time, duration, cutoff, velocity * 0.58, track)
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
  return Math.max(0.0001, clamp(voice.level * velocity, 0, 1))
}

function pitchRatio(semitones: number): number {
  return 2 ** (semitones / 12)
}

function saturationCurve(amount: number): Float32Array<ArrayBuffer> {
  const size = 1024
  const curve: Float32Array<ArrayBuffer> = new Float32Array(
    new ArrayBuffer(size * Float32Array.BYTES_PER_ELEMENT),
  )
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
