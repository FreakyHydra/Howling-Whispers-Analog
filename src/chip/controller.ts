import type { PatternLength } from '../sequencer/types'
import type { MasterTransport } from '../transport/transport'
import { midiNoteName } from '../melodic/format'
import { ChipEngine, DEFAULT_CHIP_SETTINGS, type ChipSettings, type ChipStep } from './engine'

const STORAGE_KEY = 'hw-analog-chip-v1'

type SavedChip = { length: PatternLength; steps: ChipStep[]; settings: ChipSettings }

export function setupChipSynth(transport: MasterTransport): void {
  const engine = new ChipEngine()
  const restored = loadState()
  let length = restored.length
  let steps = restored.steps
  let settings = restored.settings
  let selected = 0

  transport.register({
    id: 'chip',
    length: () => length,
    schedule: (step, time, duration) => {
      const current = steps[step]
      if (!current) return
      const previous = previousMidi(steps, step, length)
      engine.play(settings, current, time, duration * current.gate, previous)
    },
    visual: (step) => paintPlayhead(step),
    stop: () => paintPlayhead(-1),
  }, false)

  const play = requiredButton('#chip-play')
  const lengthSelect = requiredSelect('#chip-length')
  const mode = requiredSelect('#chip-mode')
  const wave = requiredSelect('#chip-wave')
  const duty = requiredInput('#chip-duty')
  const level = requiredInput('#chip-level')
  const vibratoRate = requiredInput('#chip-vibrato-rate')
  const vibratoDepth = requiredInput('#chip-vibrato-depth')
  const glide = requiredInput('#chip-glide')
  const gate = requiredInput('#chip-gate')
  const slide = requiredButton('#chip-slide')
  const vibrato = requiredButton('#chip-vibrato')
  const hint = required<HTMLElement>('#chip-entry-hint')

  play.addEventListener('click', async () => {
    if (transport.isClientActive('chip') && transport.playing) transport.setClientActive('chip', false)
    else {
      await engine.arm()
      transport.setClientActive('chip', true)
      if (!transport.playing) await transport.play()
    }
  })

  requiredButton('#chip-starter').addEventListener('click', () => {
    steps = starter(length)
    selected = 0
    saveAndRefresh()
  })
  requiredButton('#chip-clear').addEventListener('click', () => {
    steps = Array.from({ length }, () => null)
    saveAndRefresh()
  })

  document.querySelectorAll<HTMLButtonElement>('[data-chip-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.chipStep)
      if (index >= length) return
      selected = index
      paintSelection()
      paintEditor()
      hint.textContent = `STEP ${String(selected + 1).padStart(2, '0')} selected. Use the chip keyboard below.`
    })
    button.addEventListener('dblclick', () => {
      const index = Number(button.dataset.chipStep)
      if (index >= length) return
      selected = index
      steps[selected] = steps[selected] ? null : defaultStep(72)
      saveAndRefresh()
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-chip-midi]').forEach((button) => {
    button.addEventListener('pointerdown', () => {
      const midi = Number(button.dataset.chipMidi)
      const current = steps[selected] ?? defaultStep(midi)
      steps[selected] = { ...current, midi }
      hint.textContent = `STEP ${String(selected + 1).padStart(2, '0')} = ${midiNoteName(midi)}`
      saveAndRefresh()
      void engine.arm().then(() => engine.play(settings, steps[selected], engine.currentTime + 0.01, 0.22))
    })
  })

  lengthSelect.addEventListener('change', () => {
    const next = normalizeLength(Number(lengthSelect.value))
    const previous = steps
    length = next
    steps = Array.from({ length }, (_, index) => previous[index] ? { ...previous[index]! } : null)
    if (selected >= length) selected = length - 1
    saveAndRefresh()
  })

  mode.addEventListener('change', () => updateSettings({ mode: mode.value as ChipSettings['mode'] }))
  wave.addEventListener('change', () => updateSettings({ wave: wave.value as ChipSettings['wave'] }))
  duty.addEventListener('input', () => updateSettings({ duty: Number(duty.value) / 100 }))
  level.addEventListener('input', () => updateSettings({ level: Number(level.value) / 100 }))
  vibratoRate.addEventListener('input', () => updateSettings({ vibratoRate: Number(vibratoRate.value) / 10 }))
  vibratoDepth.addEventListener('input', () => updateSettings({ vibratoDepth: Number(vibratoDepth.value) }))
  glide.addEventListener('input', () => updateSettings({ glide: Number(glide.value) / 1000 }))
  gate.addEventListener('input', () => {
    const current = steps[selected] ?? defaultStep(72)
    steps[selected] = { ...current, gate: Number(gate.value) / 100 }
    saveAndRefresh()
  })
  slide.addEventListener('click', () => toggleStepFlag('slide'))
  vibrato.addEventListener('click', () => toggleStepFlag('vibrato'))

  transport.subscribe(() => {
    const active = transport.isClientActive('chip') && transport.playing
    play.textContent = active ? 'STOP CHIP' : 'PLAY CHIP'
    play.classList.toggle('active', active)
  })

  function updateSettings(changes: Partial<ChipSettings>): void {
    settings = { ...settings, ...changes }
    saveAndRefresh()
  }

  function toggleStepFlag(flag: 'slide' | 'vibrato'): void {
    const current = steps[selected] ?? defaultStep(72)
    steps[selected] = { ...current, [flag]: !current[flag] }
    saveAndRefresh()
  }

  function saveAndRefresh(): void {
    saveState({ length, steps, settings })
    refresh()
  }

  function refresh(): void {
    lengthSelect.value = String(length)
    mode.value = settings.mode
    wave.value = settings.wave
    duty.value = String(Math.round(settings.duty * 100))
    level.value = String(Math.round(settings.level * 100))
    vibratoRate.value = String(Math.round(settings.vibratoRate * 10))
    vibratoDepth.value = String(settings.vibratoDepth)
    glide.value = String(Math.round(settings.glide * 1000))
    paintOutput('chip-duty', `${Math.round(settings.duty * 100)}%`)
    paintOutput('chip-level', `${Math.round(settings.level * 100)}%`)
    paintOutput('chip-vibrato-rate', `${settings.vibratoRate.toFixed(1)} Hz`)
    paintOutput('chip-vibrato-depth', `${Math.round(settings.vibratoDepth)} ct`)
    paintOutput('chip-glide', `${Math.round(settings.glide * 1000)} ms`)
    for (let index = 0; index < 64; index += 1) paintStep(index)
    paintSelection()
    paintEditor()
  }

  function paintStep(index: number): void {
    const button = document.querySelector<HTMLButtonElement>(`[data-chip-step="${index}"]`)
    if (!button) return
    button.hidden = index >= length
    const step = steps[index]
    button.classList.toggle('active', Boolean(step))
    button.classList.toggle('slide', Boolean(step?.slide))
    button.classList.toggle('vibrato', Boolean(step?.vibrato))
    const note = button.querySelector<HTMLElement>('strong')
    if (note) note.textContent = step ? midiNoteName(step.midi) : 'REST'
  }

  function paintSelection(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-chip-step]').forEach((button) => {
      button.classList.toggle('selected', Number(button.dataset.chipStep) === selected)
    })
  }

  function paintEditor(): void {
    const current = steps[selected] ?? defaultStep(72)
    required<HTMLElement>('#chip-selected').textContent = String(selected + 1).padStart(2, '0')
    gate.value = String(Math.round(current.gate * 100))
    paintOutput('chip-gate', `${Math.round(current.gate * 100)}%`)
    paintToggle(slide, current.slide)
    paintToggle(vibrato, current.vibrato)
  }

  refresh()
}

function starter(length: PatternLength): ChipStep[] {
  const result: ChipStep[] = Array.from({ length }, () => null)
  const pattern = [72, null, 72, 79, null, 77, 75, null, 72, null, 84, 79, null, 77, 75, 79]
  for (let offset = 0; offset < length; offset += 16) {
    pattern.forEach((midi, index) => {
      const target = offset + index
      if (target >= length || midi === null) return
      result[target] = { midi, gate: index % 3 === 0 ? 0.48 : 0.72, slide: index === 3 || index === 10, vibrato: index === 5 || index === 14 }
    })
  }
  return result
}

function defaultStep(midi: number): Exclude<ChipStep, null> {
  return { midi, gate: 0.68, slide: false, vibrato: false }
}

function previousMidi(steps: ChipStep[], index: number, length: number): number | undefined {
  for (let offset = 1; offset <= length; offset += 1) {
    const candidate = steps[(index - offset + length) % length]
    if (candidate) return candidate.midi
  }
  return undefined
}

function paintPlayhead(step: number): void {
  document.querySelectorAll('.chip-step.playhead').forEach((node) => node.classList.remove('playhead'))
  if (step >= 0) document.querySelector(`[data-chip-step="${step}"]`)?.classList.add('playhead')
}

function paintOutput(id: string, value: string): void {
  const output = document.querySelector<HTMLOutputElement>(`#${id}-value`)
  if (output) output.value = value
}

function paintToggle(button: HTMLButtonElement, active: boolean): void {
  button.classList.toggle('active', active)
  button.setAttribute('aria-pressed', String(active))
}

function normalizeLength(value: number): PatternLength {
  if (value <= 8) return 8
  if (value <= 16) return 16
  if (value <= 32) return 32
  return 64
}

function saveState(state: SavedChip): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* optional persistence */ }
}

function loadState(): SavedChip {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { length: 16, steps: starter(16), settings: { ...DEFAULT_CHIP_SETTINGS } }
    const parsed = JSON.parse(raw) as Partial<SavedChip>
    const length = normalizeLength(Number(parsed.length ?? 16))
    return {
      length,
      steps: Array.from({ length }, (_, index) => parsed.steps?.[index] ? { ...parsed.steps[index]! } : null),
      settings: { ...DEFAULT_CHIP_SETTINGS, ...(parsed.settings ?? {}) },
    }
  } catch {
    return { length: 16, steps: starter(16), settings: { ...DEFAULT_CHIP_SETTINGS } }
  }
}

function requiredButton(selector: string): HTMLButtonElement { return required<HTMLButtonElement>(selector) }
function requiredInput(selector: string): HTMLInputElement { return required<HTMLInputElement>(selector) }
function requiredSelect(selector: string): HTMLSelectElement { return required<HTMLSelectElement>(selector) }
function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing chip control ${selector}`)
  return element
}
