export function renderTransportMarkup(): string {
  return `
    <section class="master-transport" aria-label="Master transport">
      <div class="transport-actions">
        <button id="master-play" class="transport-button primary" type="button">▶ PLAY</button>
        <button id="master-stop" class="transport-button" type="button">■ STOP</button>
        <button id="master-rewind" class="transport-button" type="button" title="Return to bar 1">↶</button>
      </div>

      <label class="transport-control">
        <span>BPM</span>
        <input id="master-bpm" type="number" min="40" max="220" value="140" inputmode="numeric" />
      </label>

      <label class="transport-control transport-swing">
        <span>SWING</span>
        <input id="master-swing" type="range" min="0" max="40" value="12" step="1" />
        <output id="master-swing-value">12%</output>
      </label>

      <button id="master-sync" class="transport-button sync active" type="button" aria-pressed="true">SYNC ●</button>

      <div class="transport-position" aria-live="polite">
        <span>BAR</span><strong id="transport-bar">01</strong>
        <span>BEAT</span><strong id="transport-beat">01</strong>
        <span>STEP</span><strong id="transport-step">01</strong>
      </div>

      <div class="transport-active" aria-label="Active synchronized modules">
        <span id="status-beat">DRUMS ●</span>
        <span id="status-melodic">SYNTH ●</span>
        <span id="status-chip">CHIP ○</span>
      </div>

      <button id="master-panic" class="transport-button panic-button" type="button">PANIC</button>
    </section>
  `
}
