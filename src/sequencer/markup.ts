import { DRUM_LANES, MAX_STEP_COUNT, createDefaultDrumKit, type DrumLane } from './types'
import { formatVoiceValue, type VoiceNumericParam } from './voice-format'

const LABELS: Record<DrumLane, string> = {
  kick: 'KICK',
  snare: 'SNARE',
  clap: 'CLAP',
  hat: 'CLOSED HAT',
  openHat: 'OPEN HAT',
  '808': '808',
}

export function renderBeatSequencerMarkup(): string {
  const kit = createDefaultDrumKit()
  return `
    <section class="sequencer rack-module" data-rack-module="rhythm" draggable="true" aria-label="Drum sequencer module">
      <div class="sequencer-head rack-module-head">
        <div>
          <p class="eyebrow">RHYTHM MACHINE</p>
          <div class="module-title sequencer-title">
            <span>DRUM SEQUENCER</span>
            <small>CLICK = STEP · SHIFT+CLICK = ACCENT</small>
          </div>
        </div>

        <div class="sequencer-actions">
          <button id="seq-play" class="seq-action primary" type="button">PLAY DRUMS</button>
          <button id="seq-trap" class="seq-action" type="button">TRAP STARTER</button>
          <button id="seq-clear" class="seq-action" type="button">CLEAR</button>
          ${rackActions()}
        </div>
      </div>

      <div class="rack-body">
        <div class="sequencer-controls">
          <label class="select-control compact-select">
            <span>Pattern length</span>
            <select id="seq-length">
              <option value="8">8 STEPS</option>
              <option value="16" selected>16 STEPS</option>
              <option value="32">32 STEPS</option>
              <option value="64">64 STEPS</option>
            </select>
          </label>
          <p class="sequencer-note">Tempo and swing now come from the global master transport.</p>
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
          <div class="sequence-ruler" style="--seq-length:16">
            <span></span>
            ${Array.from({ length: MAX_STEP_COUNT }, (_, step) => `<small data-seq-ruler-step="${step}" ${step >= 16 ? 'hidden' : ''}>${step + 1}</small>`).join('')}
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
            ${voiceRange('decay', 'Decay', 0.03, 2.8, kit.kick.decay, 0.01)}
            ${voiceRange('tone', 'Tone', 0, 1, kit.kick.tone, 0.01)}
            ${voiceRange('pan', 'Pan', -1, 1, kit.kick.pan, 0.01)}
          </div>
        </div>
      </div>
    </section>
  `
}

function laneRow(lane: DrumLane): string {
  return `
    <div class="sequence-row" style="--seq-length:16">
      <button class="lane-select ${lane === 'kick' ? 'selected' : ''}" data-voice-select="${lane}" type="button">${LABELS[lane]}</button>
      ${Array.from({ length: MAX_STEP_COUNT }, (_, step) => `
        <button
          class="seq-step ${step % 4 === 0 ? 'bar-start' : ''}"
          data-seq-lane="${lane}"
          data-seq-step="${step}"
          type="button"
          aria-label="${LABELS[lane]} step ${step + 1}"
          aria-pressed="false"
          ${step >= 16 ? 'hidden' : ''}
        ></button>
      `).join('')}
    </div>
  `
}

function rackActions(): string {
  return `
    <button class="seq-action rack-grip" data-module-action="drag" type="button" title="Drag module">⋮⋮</button>
    <button class="seq-action" data-module-action="up" type="button" aria-label="Move module up">↑</button>
    <button class="seq-action" data-module-action="down" type="button" aria-label="Move module down">↓</button>
    <button class="seq-action" data-module-action="collapse" type="button">COLLAPSE</button>
    <button class="seq-action" data-module-action="remove" type="button">REMOVE</button>
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
