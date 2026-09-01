import { SYNTH_STEP_COUNT } from '../loops/types'

export function renderMelodicSequencerMarkup(): string {
  return `
    <section class="melodic" aria-label="16 step melodic synth sequencer">
      <div class="melodic-head">
        <div>
          <p class="eyebrow">MELODIC MACHINE</p>
          <div class="module-title melodic-title">
            <span>16 STEP SYNTH LOOP</span>
            <small>USES THE CURRENT ANALOG PATCH</small>
          </div>
        </div>
        <div class="sequencer-actions">
          <button id="mel-play" class="seq-action primary" type="button">PLAY SYNTH</button>
          <button id="mel-starter" class="seq-action" type="button">BASS STARTER</button>
          <button id="mel-clear" class="seq-action" type="button">CLEAR</button>
        </div>
      </div>

      <div class="melodic-steps">
        ${Array.from({ length: SYNTH_STEP_COUNT }, (_, index) => `
          <button class="mel-step ${index % 4 === 0 ? 'bar-start' : ''}" data-mel-step="${index}" type="button" aria-pressed="false">
            <small>${String(index + 1).padStart(2, '0')}</small>
            <strong>REST</strong>
          </button>
        `).join('')}
      </div>

      <div class="melodic-editor">
        <div>
          <p class="eyebrow">EDIT STEP</p>
          <h3>STEP <span id="mel-selected">01</span></h3>
          <button id="mel-toggle" class="seq-action" type="button">ACTIVATE / REST</button>
        </div>
        <div class="melodic-controls">
          ${range('mel-note', 'Note', 24, 96, 48, 1)}
          ${range('mel-velocity', 'Velocity', 0.05, 1, 0.8, 0.01)}
          ${range('mel-gate', 'Gate', 0.08, 1.8, 0.82, 0.01)}
        </div>
      </div>
    </section>
  `
}

function range(id: string, label: string, min: number, max: number, value: number, step: number): string {
  return `
    <label class="control compact melodic-control">
      <span class="control-top"><span>${label}</span><output id="${id}-value"></output></span>
      <input id="${id}" type="range" min="${min}" max="${max}" value="${value}" step="${step}" />
    </label>
  `
}
