import { analogAudio } from './runtime'
import { oscillatorMixHeadroom } from './safety'
import { clonePatch, type AnalogPatch } from '../patch'

type ActiveNote = {
  midi: number
  oscillators: OscillatorNode[]
  oscillatorGains: GainNode[]
  noteGain: GainNode
}

const VOICE_PEAK = 0.82

export class SynthEngine {
  private patch: AnalogPatch
  private context?: AudioContext
  private mixer?: GainNode
  private filter?: BiquadFilterNode
  private drive?: WaveShaperNode
  private master?: GainNode
  private lfo?: OscillatorNode
  private lfoDepth?: GainNode
  private activeNote?: ActiveNote

  constructor(initialPatch: AnalogPatch) {
    this.patch = clonePatch(initialPatch)
  }

  async arm(): Promise<void> {
    this.ensureGraph()
    await analogAudio.arm()
  }

  setPatch(nextPatch: AnalogPatch): void {
    this.patch = clonePatch(nextPatch)
    this.applyPatch()
  }

  async noteOn(midi: number): Promise<void> {
    await this.arm()
    const context = this.context!
    const mixer = this.mixer!
    const now = context.currentTime

    if (this.activeNote) this.releaseActive(true)

    const frequency = midiToFrequency(midi)
    const noteGain = context.createGain()
    noteGain.gain.setValueAtTime(0.0001, now)
    noteGain.connect(mixer)

    const oscillators: OscillatorNode[] = []
    const oscillatorGains: GainNode[] = []

    this.patch.oscillators.forEach((settings) => {
      const oscillator = context.createOscillator()
      const level = context.createGain()

      oscillator.type = settings.waveform
      oscillator.frequency.setValueAtTime(frequency, now)
      oscillator.detune.setValueAtTime(settings.detune, now)
      level.gain.setValueAtTime(settings.level, now)

      oscillator.connect(level)
      level.connect(noteGain)
      oscillator.start(now)

      oscillators.push(oscillator)
      oscillatorGains.push(level)
    })

    const attack = Math.max(0.005, this.patch.envelope.attack)
    const decay = Math.max(0.005, this.patch.envelope.decay)
    const sustain = Math.max(0.0001, this.patch.envelope.sustain)

    noteGain.gain.linearRampToValueAtTime(VOICE_PEAK, now + attack)
    noteGain.gain.linearRampToValueAtTime(VOICE_PEAK * sustain, now + attack + decay)

    this.activeNote = { midi, oscillators, oscillatorGains, noteGain }
  }

  noteOff(midi: number): void {
    if (!this.activeNote || this.activeNote.midi !== midi) return
    this.releaseActive(false)
  }

  panic(): void {
    this.releaseActive(true)
  }

  private ensureGraph(): void {
    if (this.context) return

    const context = analogAudio.getContext()
    const mixer = context.createGain()
    const filter = context.createBiquadFilter()
    const drive = context.createWaveShaper()
    const master = context.createGain()
    const lfo = context.createOscillator()
    const lfoDepth = context.createGain()

    filter.type = 'lowpass'
    drive.oversample = '4x'

    mixer.connect(filter)
    filter.connect(drive)
    drive.connect(master)
    master.connect(analogAudio.getInput())

    lfo.connect(lfoDepth)
    lfoDepth.connect(filter.frequency)
    lfo.start()

    this.context = context
    this.mixer = mixer
    this.filter = filter
    this.drive = drive
    this.master = master
    this.lfo = lfo
    this.lfoDepth = lfoDepth

    this.applyPatch()
  }

  private applyPatch(): void {
    if (!this.context) return
    const now = this.context.currentTime
    const levels = this.patch.oscillators.map((settings) => settings.level)

    this.mixer?.gain.setTargetAtTime(oscillatorMixHeadroom(levels), now, 0.015)
    this.filter?.frequency.setTargetAtTime(this.patch.filter.cutoff, now, 0.015)
    this.filter?.Q.setTargetAtTime(this.patch.filter.resonance, now, 0.015)
    if (this.drive) this.drive.curve = makeDriveCurve(this.patch.drive)
    this.master?.gain.setTargetAtTime(this.patch.master, now, 0.015)
    this.lfo?.frequency.setTargetAtTime(this.patch.lfo.rate, now, 0.015)
    this.lfoDepth?.gain.setTargetAtTime(this.patch.lfo.depth, now, 0.015)

    if (this.activeNote) {
      this.patch.oscillators.forEach((settings, index) => {
        const oscillator = this.activeNote!.oscillators[index]
        const gain = this.activeNote!.oscillatorGains[index]
        if (!oscillator || !gain) return
        oscillator.type = settings.waveform
        oscillator.detune.setTargetAtTime(settings.detune, now, 0.01)
        gain.gain.setTargetAtTime(settings.level, now, 0.01)
      })
    }
  }

  private releaseActive(immediate: boolean): void {
    if (!this.context || !this.activeNote) return
    const note = this.activeNote
    const now = this.context.currentTime
    const release = immediate ? 0.015 : Math.max(0.02, this.patch.envelope.release)

    note.noteGain.gain.cancelScheduledValues(now)
    note.noteGain.gain.setValueAtTime(Math.max(0.0001, note.noteGain.gain.value), now)
    note.noteGain.gain.exponentialRampToValueAtTime(0.0001, now + release)

    note.oscillators.forEach((oscillator) => oscillator.stop(now + release + 0.03))
    window.setTimeout(() => note.noteGain.disconnect(), (release + 0.08) * 1000)
    this.activeNote = undefined
  }
}

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

function makeDriveCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 2048
  const curve: Float32Array<ArrayBuffer> = new Float32Array(
    new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT),
  )
  const k = 1 + Math.max(0, amount) * 55

  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / (samples - 1) - 1
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x))
  }

  return curve
}
