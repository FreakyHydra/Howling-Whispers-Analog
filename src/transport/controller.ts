import { positionForStep, type MasterTransport } from './transport'

type Options = {
  transport: MasterTransport
  panic: () => void
}

export function setupTransportControls({ transport, panic }: Options): void {
  const play = requiredButton('#master-play')
  const stop = requiredButton('#master-stop')
  const rewind = requiredButton('#master-rewind')
  const bpm = requiredInput('#master-bpm')
  const swing = requiredInput('#master-swing')
  const swingValue = requiredOutput('#master-swing-value')
  const sync = requiredButton('#master-sync')
  const panicButton = requiredButton('#master-panic')
  const bar = required<HTMLElement>('#transport-bar')
  const beat = required<HTMLElement>('#transport-beat')
  const step = required<HTMLElement>('#transport-step')
  const drums = required<HTMLElement>('#status-beat')
  const synth = required<HTMLElement>('#status-melodic')
  const chip = required<HTMLElement>('#status-chip')

  play.addEventListener('click', () => { void transport.play(true) })
  stop.addEventListener('click', () => transport.stop())
  rewind.addEventListener('click', () => transport.rewind())
  panicButton.addEventListener('click', () => {
    transport.stop()
    panic()
  })

  bpm.addEventListener('change', () => transport.setBpm(Number(bpm.value)))
  bpm.addEventListener('input', () => transport.setBpm(Number(bpm.value)))
  swing.addEventListener('input', () => transport.setSwing(Number(swing.value) / 100))
  sync.addEventListener('click', () => transport.setSync(!transport.sync))

  transport.subscribe((snapshot) => {
    bpm.value = String(snapshot.bpm)
    swing.value = String(Math.round(snapshot.swing * 100))
    swingValue.value = `${Math.round(snapshot.swing * 100)}%`
    sync.classList.toggle('active', snapshot.sync)
    sync.setAttribute('aria-pressed', String(snapshot.sync))
    sync.textContent = snapshot.sync ? 'SYNC ●' : 'SYNC ○'
    play.classList.toggle('active', snapshot.playing)

    const position = positionForStep(snapshot.absoluteStep)
    bar.textContent = String(position.bar).padStart(2, '0')
    beat.textContent = String(position.beat).padStart(2, '0')
    step.textContent = String(position.step).padStart(2, '0')

    paintModuleStatus(drums, 'DRUMS', transport.isClientActive('beat'))
    paintModuleStatus(synth, 'SYNTH', transport.isClientActive('melodic'))
    paintModuleStatus(chip, 'CHIP', transport.isClientActive('chip'))
  })
}

function paintModuleStatus(element: HTMLElement, label: string, active: boolean): void {
  element.textContent = `${label} ${active ? '●' : '○'}`
  element.classList.toggle('active', active)
}

function requiredButton(selector: string): HTMLButtonElement { return required<HTMLButtonElement>(selector) }
function requiredInput(selector: string): HTMLInputElement { return required<HTMLInputElement>(selector) }
function requiredOutput(selector: string): HTMLOutputElement { return required<HTMLOutputElement>(selector) }
function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing transport control ${selector}`)
  return element
}
