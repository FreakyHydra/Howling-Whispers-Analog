import { DRUM_LANES, STEP_COUNT, createDefaultDrumKit, type DrumLane } from './types'
import { formatVoiceValue, type VoiceNumericParam } from './voice-format'

const LABELS: Record<DrumLane, string> = {
  kick: 'KICK',
  snare: 'SNARE',
  clap: 'CLAP',
  hat: 'HAT',
  '808': '808',
}

export function renderBeatSequencerMarkup(): string {
  const kit = createDefaultDrumKit()
  return `
    <section class="sequencer" aria-label="16 step drum sequencer">
      <div class="sequencer-head">
        <div>
          <p class="eyebrow">RHYTHM MACHINE</p>
          <div class="module-title sequencer-title">
            <span>16 STEP SEQUENCER</span>
            <small>CLICK = STEP · SHIFT+CLICK = ACCENT</small>
          </div>
        </div>

        <div class="sequencer-actions">
          <button id="seq-play" class="seq-action primary" type="button">PLAY</button>
          <button id="seq-trap" class="seq-action" type="button">TRAP STARTER</button>
          <button id="seq-clear" class="seq-action" type="button">CLEAR</button>
        </div>
      </div>

      <div class="sequencer-controls">
        <label class="control compact">
          <span class="control-top"><span>Tempo</span><output id="seq-bpm-value">140 BPM</output></span>
          <input id="seq-bpm" type="range" min="60" max="220" value="140" step="1" />
        </label>
        <label class="control compact">
          <span class="control-top"><span>Swing</span><output id="seq-swing-value">12%</output></span>
          <input id="seq-swing" type="range" min="0" max="40" value="12" step="1" />
        </label>
      </div>

      <div class="loop-save-strip">
        <input id="loop-name" class="loop-name" type="text" maxlength="60" value="Untitled Loop" aria-label="Loop name" />
        <div class="loop-save-actions" aria-label="Save loop type">
          <button id="loop-save-drums" class="seq-action" type="button">SAVE DRUMS</button>
          <button id="loop-save-synth" class="seq-action" type="button">SAVE SYNTH</button>
          <button id="loop-save-combined" class="seq-action primary" type="button">SAVE COMBINED</button>
        </div>
        <span id="loop-save-status" class="loop-save-status">Current work also autosaves in this browser.</span>
      </div>

      <div class="sequence-grid">
        <div class="sequence-ruler">
          <span></span>
          ${Array.from({ length: STEP_COUNT }, (_, step) => `<small>${step + 1}</small>`).join('')}
        </div>
        ${DRUM_LANES.map((lane) => laneRow(lane)).join('')}
      </div>

      <div class="voice-editor">
        <div class="voice-editor-head">
          <div>
            <p class="eyebrow">EDIT INSTRUMENT</p>
            <h3 id="voice-name">KICK</h3>
          </div>
          <div class="voice-actions">
            <button id="voice-preview" class="seq-action" type="button">TRIGGER</button>
            <button id="voice-mute" class="seq-action toggle" type="button" aria-pressed="false">MUTE</button>
            <button id="voice-solo" class="seq-action toggle" type="button" aria-pressed="false">SOLO</button>
          </div>
        </div>

        <div class="voice-controls">
          ${voiceRange('level', 'Level', 0, 1, kit.kick.level, 0.01)}
          ${voiceRange('tune', 'Tune', -24, 24, kit.kick.tune, 1)}
          ${voiceRange('decay', 'Decay', 0.03, 2.4, kit.kick.decay, 0.01)}
          ${voiceRange('tone', 'Tone', 0, 1, kit.kick.tone, 0.01)}
          ${voiceRange('pan', 'Pan', -1, 1, kit.kick.pan, 0.01)}
        </div>
      </div>
    </section>
  `
}

function laneRow(lane: DrumLane): string {
  return `
    <div class="sequence-row">
      <button class="lane-select ${lane === 'kick' ? 'selected' : ''}" data-voice-select="${lane}" type="button">${LABELS[lane]}</button>
      ${Array.from({ length: STEP_COUNT }, (_, step) => `
        <button
          class="seq-step ${step % 4 === 0 ? 'bar-start' : ''}"
          data-seq-lane="${lane}"
          data-seq-step="${step}"
          type="button"
          aria-label="${LABELS[lane]} step ${step + 1}"
          aria-pressed="false"
        ></button>
      `).join('')}
    </div>
  `
}

function voiceRange(param: VoiceNumericParam, label: string, min: number, max: number, value: number, step: number): string {
  return `
    <label class="control compact voice-control">
      <span class="control-top"><span>${label}</span><output id="voice-${param}-value">${formatVoiceValue(param, value)}</output></span>
      <input id="voice-${param}" data-voice-param="${param}" type="range" min="${min}" max="${max}" value="${value}" step="${step}" />
    </label>
  `
}
