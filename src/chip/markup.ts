export function renderChipMarkup(): string {
  return `
    <section id="workspace-chip" class="workspace" data-workspace="chip" hidden>
      <section class="chip-workspace">
        <div class="chip-header">
          <div>
            <p class="eyebrow">CHIP MACHINE</p>
            <h2>8 / 16 / 32 BIT INSPIRED SYNTH</h2>
            <p>Pulse hooks, rapid slides, vibrato and syncopated monophonic lines, all locked to the master transport.</p>
          </div>
          <div class="sequencer-actions">
            <button id="chip-play" class="seq-action primary" type="button">PLAY CHIP</button>
            <button id="chip-starter" class="seq-action" type="button">CHIP STARTER</button>
            <button id="chip-clear" class="seq-action" type="button">CLEAR</button>
          </div>
        </div>

        <div class="chip-controls-grid">
          <label class="select-control">
            <span>Era / engine</span>
            <select id="chip-mode">
              <option value="8">8-BIT</option>
              <option value="16">16-BIT</option>
              <option value="32">32-BIT</option>
            </select>
          </label>
          <label class="select-control">
            <span>Wave</span>
            <select id="chip-wave">
              <option value="pulse">PULSE</option>
              <option value="square">SQUARE</option>
              <option value="triangle">TRIANGLE</option>
            </select>
          </label>
          <label class="select-control">
            <span>Pattern length</span>
            <select id="chip-length">
              <option value="8">8 STEPS</option>
              <option value="16">16 STEPS</option>
              <option value="32">32 STEPS</option>
              <option value="64">64 STEPS</option>
            </select>
          </label>
          ${range('chip-duty', 'Duty', 12, 88, 25, 1)}
          ${range('chip-level', 'Level', 5, 80, 46, 1)}
          ${range('chip-vibrato-rate', 'Vibrato rate', 10, 120, 72, 1)}
          ${range('chip-vibrato-depth', 'Vibrato depth', 0, 80, 18, 1)}
          ${range('chip-glide', 'Slide time', 0, 180, 55, 1)}
        </div>

        <p id="chip-entry-hint" class="chip-entry-hint">Select a step, then press the chip keyboard below.</p>

        <div class="chip-steps">
          ${Array.from({ length: 64 }, (_, index) => `
            <button class="chip-step ${index % 4 === 0 ? 'bar-start' : ''}" data-chip-step="${index}" type="button" ${index >= 16 ? 'hidden' : ''}>
              <small>${String(index + 1).padStart(2, '0')}</small>
              <strong>REST</strong>
            </button>
          `).join('')}
        </div>

        <div class="chip-editor">
          <div>
            <p class="eyebrow">EDIT CHIP STEP</p>
            <h3>STEP <span id="chip-selected">01</span></h3>
          </div>
          <div class="chip-editor-controls">
            ${range('chip-gate', 'Gate', 8, 180, 68, 1)}
            <button id="chip-slide" class="seq-action toggle" type="button" aria-pressed="false">SLIDE</button>
            <button id="chip-vibrato" class="seq-action toggle" type="button" aria-pressed="false">VIBRATO</button>
          </div>
        </div>

        <div class="chip-keyboard" aria-label="Chip note keyboard">
          ${chipKeyboard()}
        </div>
      </section>
    </section>
  `
}

function range(id: string, label: string, min: number, max: number, value: number, step: number): string {
  return `
    <label class="control chip-control">
      <span class="control-top"><span>${label}</span><output id="${id}-value"></output></span>
      <input id="${id}" type="range" min="${min}" max="${max}" value="${value}" step="${step}" />
    </label>
  `
}

function chipKeyboard(): string {
  const notes = [
    [72, 'C5'], [74, 'D5'], [76, 'E5'], [77, 'F5'], [79, 'G5'], [81, 'A5'], [83, 'B5'], [84, 'C6'],
  ] as const
  return notes.map(([midi, label]) => `<button type="button" data-chip-midi="${midi}">${label}</button>`).join('')
}
