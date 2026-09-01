import {
  DAW_COLUMN_COUNT,
  DAW_SLOT_COUNT,
  dawColumnForSlot,
  dawTrackForSlot,
} from '../loops/types'

export function renderDawMarkup(): string {
  return `
    <section id="workspace-daw" class="workspace" data-workspace="daw" hidden>
      <section class="daw-panel" aria-label="Howling Whispers DAW concept">
        <header class="daw-head">
          <div>
            <p class="eyebrow">HOWLING WHISPERS</p>
            <h2>DAW</h2>
            <p class="subtitle">3-track loop timeline · Concept 0.3</p>
          </div>
          <div class="daw-actions">
            <button id="daw-play" class="seq-action primary" type="button">PLAY ARRANGEMENT</button>
            <button id="daw-stop" class="seq-action" type="button">STOP</button>
            <button id="daw-export" class="seq-action" type="button">EXPORT WAV</button>
            <button id="daw-refresh" class="seq-action" type="button">REFRESH LIBRARY</button>
            <button id="daw-clear" class="seq-action" type="button">CLEAR ARRANGEMENT</button>
          </div>
        </header>

        <div class="daw-grid">
          <aside class="loop-library">
            <div class="module-title"><span>SAVED LOOPS</span><small>LOCAL LIBRARY</small></div>
            <p class="daw-help">Drum, synth, and combined loops live here. Select one, then click an arrangement slot.</p>
            <div id="daw-library" class="daw-library" aria-live="polite"></div>
          </aside>

          <section class="arranger">
            <div class="module-title"><span>ARRANGEMENT</span><small>3 TRACKS × 4 BARS</small></div>
            <p class="daw-help">Rows are tracks. Columns are time. Clips stacked in the same column play together. For example, 01 + 05 + 09 are layered at bar 1.</p>
            <div id="daw-slots" class="daw-slots">
              ${Array.from({ length: DAW_SLOT_COUNT }, (_, index) => slot(index)).join('')}
            </div>
            <p id="daw-status" class="daw-status" aria-live="polite">Select a loop from the library.</p>
          </section>
        </div>
      </section>
    </section>
  `
}

function slot(index: number): string {
  const track = dawTrackForSlot(index) + 1
  const column = dawColumnForSlot(index) + 1
  const number = String(index + 1).padStart(2, '0')
  const aria = `Track ${track}, bar ${column}, slot ${index + 1}`

  return `
    <div class="daw-slot" data-daw-slot-wrap="${index}">
      <button class="daw-slot-main" data-daw-slot="${index}" type="button" aria-label="${aria}">
        <small>${number} · T${track} · BAR ${column} <span data-slot-kind></span></small>
        <strong>EMPTY</strong>
      </button>
      <button class="daw-slot-remove" data-daw-remove="${index}" type="button" aria-label="Remove loop from ${aria}">×</button>
    </div>
  `
}
