import { analogAudio } from '../audio/runtime'
import type { MasterFxSettings } from '../audio/master-effects'

const STORAGE_KEY = 'hw-analog-master-fx-v1'

export function setupFxControls(): void {
  const defaults = analogAudio.getEffects().getSettings()
  const restored = load(defaults)
  analogAudio.getEffects().apply(restored)

  bind('fx-chorus-mix', (value) => ({ chorusMix: value / 100 }), restored.chorusMix * 100)
  bind('fx-chorus-rate', (value) => ({ chorusRate: value / 100 }), restored.chorusRate * 100)
  bind('fx-chorus-depth', (value) => ({ chorusDepth: value / 1000 }), restored.chorusDepth * 1000)
  bind('fx-phaser-mix', (value) => ({ phaserMix: value / 100 }), restored.phaserMix * 100)
  bind('fx-phaser-rate', (value) => ({ phaserRate: value / 100 }), restored.phaserRate * 100)
  bind('fx-phaser-depth', (value) => ({ phaserDepth: value }), restored.phaserDepth)
  bind('fx-crusher-mix', (value) => ({ crusherMix: value / 100 }), restored.crusherMix * 100)
  bind('fx-bit-depth', (value) => ({ bitDepth: value }), restored.bitDepth)

  function bind(
    id: string,
    map: (value: number) => Partial<MasterFxSettings>,
    initial: number,
  ): void {
    const input = required<HTMLInputElement>(`#${id}`)
    const output = required<HTMLOutputElement>(`#${id}-value`)
    input.value = String(initial)
    paintOutput(input, output)
    input.addEventListener('input', () => {
      const value = Number(input.value)
      const changes = map(value)
      analogAudio.getEffects().apply(changes)
      paintOutput(input, output)
      save(analogAudio.getEffects().getSettings())
      void analogAudio.arm()
    })
  }
}

function paintOutput(input: HTMLInputElement, output: HTMLOutputElement): void {
  const unit = input.dataset.fxUnit ?? ''
  const value = Number(input.value)
  if (unit === 'cHz') output.value = `${(value / 100).toFixed(2)} Hz`
  else if (unit === 'ms') output.value = `${value.toFixed(1)} ms`
  else if (unit === 'bit') output.value = `${Math.round(value)} bit`
  else output.value = `${Math.round(value)}${unit}`
}

function save(settings: MasterFxSettings): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) } catch { /* optional persistence */ }
}

function load(fallback: MasterFxSettings): MasterFxSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<MasterFxSettings>
    return { ...fallback, ...parsed }
  } catch {
    return fallback
  }
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing FX control ${selector}`)
  return element
}
