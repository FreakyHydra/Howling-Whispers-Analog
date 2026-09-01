export function renderMelodicSequencerMarkup(): string {
  return `
    <section class="melodic rack-module" data-rack-module="melodic" draggable="true" aria-label="Melodic synth sequencer module">
      <div class="melodic-head rack-module-head">
        <div>
          <p class="eyebrow">MELODIC MACHINE</p>
          <div class="module-title melodic-title">
            <span>SYNTH SEQUENCER</span>
            <small>SELECT STEP · PLAY SYNTH KEY TO ENTER NOTE</small>
          </div>
        </div>
        <div class="sequencer-actions">
          <button id="mel-play" class="seq-action primary" type="button">PLAY SYNTH</button>
          <button id="mel-starter" class="seq-action" type="button">BASS STARTER</button>
          <button id="mel-clear" class="seq-action" type="button">CLEAR</button>
          ${rackActions()}
        </div>
      </div>

      <div class="rack-body">
        <div class="melodic-top-controls">
          <label class="select-control compact-select">
            <span>Pattern length</span>
            <select id="mel-length">
              <option value="8">8 STEPS</option>
              <option value="16" selected>16 STEPS</option>
              <option value="32">32 STEPS</option>
              <option value="64">64 STEPS</option>
            </select>
          </label>
          <p id="mel-entry-hint" class="mel-entry-hint">Select a step, then press a key on the synth keyboard below.</p>
        </div>

        <div class="melodic-steps">
          ${Array.from({ length: 64 }, (_, index) => `
            <button class="mel-step ${index % 4 === 0 ? 'bar-start' : ''}" data-mel-step="${index}" type="button" aria-pressed="false" ${index >= 16 ? 'hidden' : ''}>
              <small>${String(index + 1).padStart(2, '0')}</small>
              <strong>REST</strong>
              <em data-mel-flags></em>
            </button>
          `).join('')}
        </div>

        <div class="melodic-editor">
          <div>
            <p class="eyebrow">EDIT STEP</p>
            <h3>STEP <span id="mel-selected">01</span></h3>
            <div class="step-actions">
              <button id="mel-toggle" class="seq-action" type="button">ACTIVATE / REST</button>
              <button id="mel-accent" class="seq-action toggle" type="button" aria-pressed="false">ACCENT</button>
              <button id="mel-slide" class="seq-action toggle" type="button" aria-pressed="false">SLIDE</button>
            </div>
          </div>
          <div class="melodic-controls">
            ${range('mel-note', 'Note', 24, 96, 48, 1)}
            ${range('mel-velocity', 'Velocity', 0.05, 1, 0.8, 0.01)}
            ${range('mel-gate', 'Gate', 0.08, 1.8, 0.82, 0.01)}
          </div>
        </div>
      </div>
    </section>
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

function range(id: string, label: string, min: number, max: number, value: number, step: number): string {
  return `
    <label class="control compact melodic-control">
      <span class="control-top"><span>${label}</span><output id="${id}-value"></output></span>
      <input id="${id}" type="range" min="${min}" max="${max}" value="${value}" step="${step}" />
    </label>
  `
}
