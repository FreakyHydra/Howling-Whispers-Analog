import type { AnalogPatch } from '../patch'
import { formatValue, waveLabel } from './format'

export function renderAnalogUi(patch: AnalogPatch): string {
  return `
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
          ${[0, 1, 2].map((index) => oscillatorSection(patch, index)).join('')}
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
}

function oscillatorSection(patch: AnalogPatch, index: number): string {
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
