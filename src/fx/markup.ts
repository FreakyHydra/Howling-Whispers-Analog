export function renderFxMarkup(): string {
  return `
    <section id="workspace-fx" class="workspace" data-workspace="fx" hidden>
      <section class="fx-workspace">
        <div class="fx-header">
          <div>
            <p class="eyebrow">MASTER EFFECTS</p>
            <h2>CHORUS · PHASER · BIT CRUSHER</h2>
          </div>
          <p>These effects sit on the shared Analog master bus, before the safety compressor and limiter.</p>
        </div>

        <div class="fx-grid">
          <section class="fx-module">
            <div class="module-title"><span>CHORUS</span><small>STEREO MODULATION</small></div>
            ${range('fx-chorus-mix', 'Mix', 0, 100, 0, 1, '%')}
            ${range('fx-chorus-rate', 'Rate', 5, 800, 45, 1, 'cHz')}
            ${range('fx-chorus-depth', 'Depth', 0, 12, 3, 0.1, 'ms')}
          </section>

          <section class="fx-module">
            <div class="module-title"><span>PHASER</span><small>4 STAGE</small></div>
            ${range('fx-phaser-mix', 'Mix', 0, 100, 0, 1, '%')}
            ${range('fx-phaser-rate', 'Rate', 3, 800, 30, 1, 'cHz')}
            ${range('fx-phaser-depth', 'Sweep', 0, 1800, 700, 10, 'Hz')}
          </section>

          <section class="fx-module">
            <div class="module-title"><span>BIT CRUSHER</span><small>DIGITAL GRIT</small></div>
            ${range('fx-crusher-mix', 'Mix', 0, 100, 0, 1, '%')}
            ${range('fx-bit-depth', 'Bit depth', 2, 16, 8, 1, 'bit')}
            <p class="fx-note">Chip modes create chip sounds at the instrument level. This module deliberately degrades any signal routed through the master bus.</p>
          </section>
        </div>
      </section>
    </section>
  `
}

function range(id: string, label: string, min: number, max: number, value: number, step: number, unit: string): string {
  return `
    <label class="control fx-control">
      <span class="control-top"><span>${label}</span><output id="${id}-value">${value}${unit}</output></span>
      <input id="${id}" type="range" min="${min}" max="${max}" value="${value}" step="${step}" data-fx-unit="${unit}" />
    </label>
  `
}
