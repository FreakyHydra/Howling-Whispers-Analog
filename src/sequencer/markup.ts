import { DRUM_LANES, STEP_COUNT, type DrumLane } from './types'

const LABELS: Record<DrumLane, string> = {
  kick: 'KICK',
  snare: 'SNARE',
  clap: 'CLAP',
  hat: 'HAT',
  '808': '808',
}

export function renderBeatSequencerMarkup(): string {
  return `
    <section class="sequencer" aria-label="16 step drum sequencer">
      <div class="sequencer-head">
        <div>
          <p class="eyebrow">RHYTHM MACHINE</p>
          <div class="module-title sequencer-title">
            <span>16 STEP SEQUENCER</span>
            <small>BEATS, TRAPS, ACCIDENTS</small>
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

      <div class="sequence-grid">
        <div class="sequence-ruler">
          <span></span>
          ${Array.from({ length: STEP_COUNT }, (_, step) => `<small>${step + 1}</small>`).join('')}
        </div>
        ${DRUM_LANES.map((lane) => laneRow(lane)).join('')}
      </div>
    </section>
  `
}

function laneRow(lane: DrumLane): string {
  return `
    <div class="sequence-row">
      <strong>${LABELS[lane]}</strong>
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
