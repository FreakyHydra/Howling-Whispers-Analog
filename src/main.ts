import './style.css'
import { SynthEngine } from './audio/synth-engine'
import { DEFAULT_PATCH, clonePatch, type AnalogPatch, type OscillatorWaveform } from './patch'

const patch: AnalogPatch = clonePatch(DEFAULT_PATCH)
const synth = new SynthEngine(patch)

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <main class="shell">
    <header class="masthead">
      <div>
        <p class="eyebrow">THE HOWLING WHISPERS</p>
        <h1>ANALOG</h1>
        <p class="subtitle">Virtual analog laboratory · Concept 0.1</p>
      </div>
      <div class="status-cluster">
        <span class="lamp" aria-hidden="true"></span>
        <span id="audio-status">ENGINE SLEEPING</span>
      </div>
    </header>

    <section class="synth-panel" aria-label="Howling Whispers Analog synthesizer">
      <div class="panel-grid oscillators">
        ${[0, 1, 2].map((index) => oscillatorSection(index)).join('')}
      </div>

      <div class="panel-grid lower-grid">
        <section class="module">
          <div class="module-title"><span>VCF</span><small>12 dB LOW PASS</small></div>
          ${range('filter-cutoff', 'Cutoff', 80, 12000, patch.filter.cutoff, 1, 'Hz')}
          ${range('filter-resonance', 'Resonance', 0.1, 18, patch.filter.resonance, 0.1, '')}
          ${range('drive', 'Drive', 0, 1, patch.drive, 0.01, '')}
        </section>

        <section class="module envelope-module">
          <div class="module-title"><span>ENV</span><small>AMPLITUDE</small></div>
          <div class="quad-controls">
            ${range('attack', 'Attack', 0.005, 2, patch.envelope.attack, 0.005, 's')}
            ${range('decay', 'Decay', 0.01, 2, patch.envelope.decay, 0.01, 's')}
            ${range('sustain', 'Sustain', 0.01, 1, patch.envelope.sustain, 0.01, '')}
            ${range('release', 'Release', 0.02, 4, patch.envelope.release, 0.01, 's')}
          </div>
        </section>

        <section class="module">
          <div class="module-title"><span>LFO</span><small>FILTER MOTION</small></div>
          ${range('lfo-rate', 'Rate', 0.05, 12, patch.lfo.rate, 0.05, 'Hz')}
          ${range('lfo-depth', 'Depth', 0, 1800, patch.lfo.depth, 1, 'Hz')}
          ${range('master', 'Master', 0, 0.85, patch.master, 0.01, '')}
        </section>
      </div>

      <section class="performance-strip">
        <div class="performance-copy">
          <p class="eyebrow">PLAY THE MACHINE</p>
          <p>Click the keys or use A W S E D F T G Y H U J K.</p>
        </div>
        <button id="panic" class="panic" type="button">PANIC</button>
      </section>

      <section class="keyboard" aria-label="One octave keyboard">
        ${keyboardMarkup()}
      </section>
    </section>

    <footer>
      <span>HW ANALOG · FIRST WORKING CONCEPT</span>
      <span>WEB AUDIO ENGINE</span>
    </footer>
  </main>
`

const status = document.querySelector<HTMLSpanElement>('#audio-status')!
const lamp = document.querySelector<HTMLSpanElement>('.lamp')!
let activeMidi: number | undefined

function commitPatch(): void {
  synth.setPatch(patch)
}

function bindRange(id: string, apply: (value: number) => void): void {
  const input = document.querySelector<HTMLInputElement>(`#${id}`)!
  const output = document.querySelector<HTMLOutputElement>(`#${id}-value`)!
  const unit = input.dataset.unit ?? ''

  input.addEventListener('input', () => {
    const value = Number(input.value)
    apply(value)
    output.value = formatValue(value, unit)
    commitPatch()
  })
}

patch.oscillators.forEach((oscillator, index) => {
  const wave = document.querySelector<HTMLSelectElement>(`#osc-${index}-wave`)!
  wave.addEventListener('change', () => {
    oscillator.waveform = wave.value as OscillatorWaveform
    commitPatch()
  })

  bindRange(`osc-${index}-level`, (value) => { oscillator.level = value })
  bindRange(`osc-${index}-detune`, (value) => { oscillator.detune = value })
})

bindRange('filter-cutoff', (value) => { patch.filter.cutoff = value })
bindRange('filter-resonance', (value) => { patch.filter.resonance = value })
bindRange('drive', (value) => { patch.drive = value })
bindRange('attack', (value) => { patch.envelope.attack = value })
bindRange('decay', (value) => { patch.envelope.decay = value })
bindRange('sustain', (value) => { patch.envelope.sustain = value })
bindRange('release', (value) => { patch.envelope.release = value })
bindRange('lfo-rate', (value) => { patch.lfo.rate = value })
bindRange('lfo-depth', (value) => { patch.lfo.depth = value })
bindRange('master', (value) => { patch.master = value })

document.querySelector<HTMLButtonElement>('#panic')!.addEventListener('click', () => {
  synth.panic()
  clearActiveKey()
})

const computerKeys = new Map([
  ['a', 60], ['w', 61], ['s', 62], ['e', 63], ['d', 64], ['f', 65],
  ['t', 66], ['g', 67], ['y', 68], ['h', 69], ['u', 70], ['j', 71], ['k', 72],
])

window.addEventListener('keydown', (event) => {
  if (event.repeat) return
  const midi = computerKeys.get(event.key.toLowerCase())
  if (midi === undefined) return
  event.preventDefault()
  void startNote(midi)
})

window.addEventListener('keyup', (event) => {
  const midi = computerKeys.get(event.key.toLowerCase())
  if (midi === undefined) return
  stopNote(midi)
})

document.querySelectorAll<HTMLButtonElement>('[data-midi]').forEach((key) => {
  const midi = Number(key.dataset.midi)
  key.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    key.setPointerCapture(event.pointerId)
    void startNote(midi)
  })
  key.addEventListener('pointerup', () => stopNote(midi))
  key.addEventListener('pointercancel', () => stopNote(midi))
  key.addEventListener('lostpointercapture', () => stopNote(midi))
})

async function startNote(midi: number): Promise<void> {
  if (activeMidi === midi) return
  if (activeMidi !== undefined) synth.noteOff(activeMidi)
  activeMidi = midi
  await synth.noteOn(midi)
  status.textContent = `VOICE ACTIVE · MIDI ${midi}`
  lamp.classList.add('live')
  document.querySelector(`[data-midi="${midi}"]`)?.classList.add('pressed')
}

function stopNote(midi: number): void {
  if (activeMidi !== midi) return
  synth.noteOff(midi)
  clearActiveKey()
}

function clearActiveKey(): void {
  document.querySelectorAll('.key.pressed').forEach((element) => element.classList.remove('pressed'))
  activeMidi = undefined
  status.textContent = 'ENGINE READY'
  lamp.classList.add('live')
}

function oscillatorSection(index: number): string {
  const oscillator = patch.oscillators[index]
  return `
    <section class="module oscillator-module">
      <div class="module-title"><span>VCO ${index + 1}</span><small>ANALOG VOICE</small></div>
      <label class="select-control">
        <span>Wave</span>
        <select id="osc-${index}-wave">
          ${['sawtooth', 'square', 'triangle'].map((wave) => `<option value="${wave}" ${wave === oscillator.waveform ? 'selected' : ''}>${waveLabel(wave)}</option>`).join('')}
        </select>
      </label>
      ${range(`osc-${index}-level`, 'Level', 0, 0.7, oscillator.level, 0.01, '')}
      ${range(`osc-${index}-detune`, 'Tune', -1200, 1200, oscillator.detune, 1, 'ct')}
    </section>
  `
}

function range(id: string, label: string, min: number, max: number, value: number, step: number, unit: string): string {
  return `
    <label class="control">
      <span class="control-top"><span>${label}</span><output id="${id}-value">${formatValue(value, unit)}</output></span>
      <input id="${id}" data-unit="${unit}" type="range" min="${min}" max="${max}" value="${value}" step="${step}" />
    </label>
  `
}

function formatValue(value: number, unit: string): string {
  if (unit === 'Hz' && value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)}kHz`
  if (unit === 'Hz') return `${value.toFixed(value < 10 ? 2 : 0)}Hz`
  if (unit === 's') return `${value.toFixed(value < 0.1 ? 3 : 2)}s`
  if (unit === 'ct') return `${Math.round(value)}ct`
  return value.toFixed(value < 2 ? 2 : 1)
}

function waveLabel(wave: string): string {
  if (wave === 'sawtooth') return 'SAW'
  if (wave === 'square') return 'SQUARE'
  return 'TRIANGLE'
}

function keyboardMarkup(): string {
  const notes = [
    [60, 'C', 'A', false], [61, 'C♯', 'W', true], [62, 'D', 'S', false], [63, 'D♯', 'E', true],
    [64, 'E', 'D', false], [65, 'F', 'F', false], [66, 'F♯', 'T', true], [67, 'G', 'G', false],
    [68, 'G♯', 'Y', true], [69, 'A', 'H', false], [70, 'A♯', 'U', true], [71, 'B', 'J', false], [72, 'C', 'K', false],
  ] as const

  return notes.map(([midi, note, shortcut, black]) => `
    <button class="key ${black ? 'black' : 'white'}" data-midi="${midi}" type="button">
      <span>${note}</span><small>${shortcut}</small>
    </button>
  `).join('')
}
